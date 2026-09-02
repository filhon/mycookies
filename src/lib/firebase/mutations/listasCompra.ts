import {
  addDoc,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { colListasCompra, docListaCompras } from "../colecoes";
import { atualizarInsumo, dadosDoInsumo } from "./insumos";
import { rotuloDia } from "@/lib/domain/datas";
import {
  preservarComprados,
  statusDaLista,
  type LinhaDaLista,
} from "@/lib/domain/listaCompras";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  Centavos,
  DataISO,
  Insumo,
  ItemListaCompras,
  ListaCompras,
} from "@/lib/types";

/**
 * A lista de compras no banco: uma por vez, refeita quando ela pede.
 *
 * O documento é a memória do carrinho. A demanda em si sai de `listaCompras.ts`
 * e podia ser recalculada a cada abertura da tela — o que não podia ser
 * recalculado é o que ela já pegou da prateleira, e é por isso que a lista
 * existe como coleção em vez de ser uma consulta.
 */

function agora() {
  return Timestamp.now();
}

/**
 * A lista da vez: a mais recente que não foi arquivada.
 *
 * Uma só, e não uma por período: duas listas abertas ao mesmo tempo seriam duas
 * versões do mesmo carrinho, e ela teria que escolher entre elas no mercado.
 * Fechar a compra é arquivar, e a próxima nasce vazia.
 */
export function consultaListaAtual(contaId: string) {
  return query(
    colListasCompra(contaId),
    where("arquivado", "==", false),
    orderBy("criadoEm", "desc"),
    limit(1),
  );
}

/** "Compras de 02 de set. a 09 de set." — o período dito por extenso. */
export function nomeDaLista(
  periodoInicio: DataISO,
  periodoFim: DataISO,
): string {
  return `Compras de ${rotuloDia(periodoInicio)} a ${rotuloDia(periodoFim)}`;
}

export interface DadosListaCompras {
  periodoInicio: DataISO;
  periodoFim: DataISO;
  /** Os pedidos que originaram a lista — permite regerar e auditar. */
  pedidoIds: string[];
  linhas: LinhaDaLista[];
  /**
   * Os itens da lista anterior. Regerar casa por `insumoId` e preserva o que já
   * foi marcado: confirmar um pedido no meio da feira não pode apagar meia hora
   * de carrinho.
   */
  anteriores?: ItemListaCompras[];
}

/**
 * A linha do domínio vira a linha gravada.
 *
 * O documento guarda o que a lista precisa para se desenhar sozinha, e não o
 * insumo inteiro: preço de embalagem e tamanho de pacote continuam vindo de
 * `insumos`, que é onde eles mudam quando ela corrige o preço na gôndola.
 */
function itemDaLinha(linha: LinhaDaLista): Omit<ItemListaCompras, "comprado"> {
  return {
    insumoId: linha.insumoId,
    nome: linha.nome,
    categoria: linha.categoria,
    quantidadeNecessaria: linha.quantidadeNecessaria,
    unidadeBase: linha.unidadeBase,
    estoqueAtual: linha.estoqueAtual,
    quantidadeComprar: linha.quantidadeComprar,
    unidadeCompra: linha.unidadeCompra,
    quantidadePacotes: linha.quantidadePacotes,
    custoEstimado: linha.custoEstimado,
  };
}

function somarCusto(itens: { custoEstimado: Centavos }[]): Centavos {
  return itens.reduce((soma, item) => soma + item.custoEstimado, 0);
}

function corpoDaLista(dados: DadosListaCompras) {
  const itens: ItemListaCompras[] = preservarComprados(
    dados.linhas.map(itemDaLinha),
    dados.anteriores ?? [],
  );

  return {
    v: VERSAO_SCHEMA,
    nome: nomeDaLista(dados.periodoInicio, dados.periodoFim),
    periodoInicio: dados.periodoInicio,
    periodoFim: dados.periodoFim,
    pedidoIds: dados.pedidoIds,
    itens,
    // O custo da lista inteira, e não o que falta: o que falta é do rodapé da
    // tela e desce a cada item marcado, então guardá-lo seria guardar um número
    // que envelhece a cada toque.
    custoEstimado: somarCusto(itens),
    status: statusDaLista(itens),
  };
}

export async function criarListaCompras(
  contaId: string,
  dados: DadosListaCompras,
): Promise<string> {
  const momento = agora();

  const nova = {
    ...corpoDaLista(dados),
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(
    colListasCompra(contaId),
    nova as unknown as ListaCompras,
  );
  return referencia.id;
}

/**
 * Refaz a lista com os pedidos de hoje, no mesmo documento.
 *
 * No mesmo documento de propósito: uma lista nova a cada regeração encheria a
 * coleção de carrinhos abandonados, e `consultaListaAtual` passaria a depender
 * de qual delas é a mais recente para responder qual é a certa.
 */
export async function regerarListaCompras(
  contaId: string,
  listaId: string,
  dados: DadosListaCompras,
): Promise<void> {
  await updateDoc(docListaCompras(contaId, listaId), {
    ...corpoDaLista(dados),
    atualizadoEm: agora(),
  });
}

/**
 * Um item entra no carrinho, ou volta para a prateleira.
 *
 * O array inteiro é reescrito porque o Firestore não atualiza um elemento de
 * array por posição. São algumas dezenas de linhas em um documento pequeno, e a
 * escrita entra na fila offline como todas as outras — que é o que importa em
 * um mercado com sinal ruim.
 */
export async function marcarItemComprado(
  contaId: string,
  lista: Pick<ListaCompras, "id" | "itens">,
  insumoId: string,
  comprado: boolean,
): Promise<void> {
  const itens = lista.itens.map((item) =>
    item.insumoId === insumoId ? { ...item, comprado } : item,
  );

  await updateDoc(docListaCompras(contaId, lista.id), {
    v: VERSAO_SCHEMA,
    itens,
    status: statusDaLista(itens),
    atualizadoEm: agora(),
  });
}

/**
 * O preço corrigido na frente da gôndola.
 *
 * É o contexto 2 do `PRODUCT.md`, e o momento em que ela mais sabe o preço de
 * verdade. Grava em `insumos` pelo caminho de sempre — que já registra o
 * histórico de preço e marca as fichas afetadas como desatualizadas
 * (`DECISOES.md#d05`) — e refaz o custo estimado da linha na mesma hora.
 *
 * Só o preço muda: quantidade da embalagem, perda e estoque continuam sendo
 * assunto do cadastro de insumo. Por isso a quantidade a comprar não se mexe, e
 * o único número que precisa ser refeito é `pacotes × preço`.
 */
export async function corrigirPrecoNaLista(
  contaId: string,
  insumo: Insumo,
  precoCompra: Centavos,
  lista: Pick<ListaCompras, "id" | "itens"> | null,
): Promise<void> {
  const gravarInsumo = atualizarInsumo(contaId, insumo, {
    ...dadosDoInsumo(insumo),
    precoCompra,
  });

  if (!lista) {
    await gravarInsumo;
    return;
  }

  const itens = lista.itens.map((item) =>
    item.insumoId === insumo.id
      ? { ...item, custoEstimado: item.quantidadePacotes * precoCompra }
      : item,
  );

  // As duas escritas saem juntas, e não uma depois da outra. Sem rede, a
  // promessa de uma escrita do Firestore fica pendente até a reconexão:
  // encadear faria o custo da lista só se refazer quando o sinal voltasse,
  // justamente no mercado, que é onde este caminho existe para funcionar.
  await Promise.all([
    gravarInsumo,
    updateDoc(docListaCompras(contaId, lista.id), {
      v: VERSAO_SCHEMA,
      itens,
      custoEstimado: somarCusto(itens),
      atualizadoEm: agora(),
    }),
  ]);
}

/**
 * Fecha a compra. A lista some da tela e continua no banco, como todo o resto
 * do sistema: o que ela pagou no mercado em setembro é histórico.
 */
export async function arquivarListaCompras(
  contaId: string,
  listaId: string,
): Promise<void> {
  await updateDoc(docListaCompras(contaId, listaId), {
    arquivado: true,
    atualizadoEm: agora(),
  });
}
