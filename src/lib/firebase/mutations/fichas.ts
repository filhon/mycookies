import {
  addDoc,
  increment,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { colFichas, docFicha, docResumoGlobal } from "../colecoes";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import {
  custoLinhaComponente,
  custoLinhaItem,
  derivarFicha,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";
import type { ParametrosPreco } from "@/lib/domain/precificacao";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CategoriaInsumo,
  Centavos,
  CentavosFracionados,
  ComponenteKit,
  FichaTecnica,
  ItemFichaTecnica,
  TipoFicha,
  UnidadeBase,
} from "@/lib/types";

/** Uma linha de insumo como o editor a entrega, antes de virar custo. */
export interface ItemDaFicha {
  insumoId: string;
  nomeSnapshot: string;
  categoria: CategoriaInsumo;
  /** Já convertida para a unidade base do insumo. */
  quantidade: number;
  unidadeBase: UnidadeBase;
  custoUnidadeBaseCorrigido: CentavosFracionados;
}

/** Uma ficha simples que entra em um kit. */
export interface ComponenteDaFicha {
  fichaId: string;
  nomeSnapshot: string;
  quantidade: number;
  custoUnitarioSnapshot: Centavos;
}

export interface DadosFicha {
  nome: string;
  categoria: string;
  tipo: TipoFicha;
  rendimento: number;
  unidadeRendimento: FichaTecnica["unidadeRendimento"];
  tempoProducaoMinutos: number;
  itens: ItemDaFicha[];
  componentes: ComponenteDaFicha[];
  /** Vem de `configuracao/geral`, ou zerado se ela ainda não configurou. */
  operacional: RateioOperacional;
  precificacao: ParametrosPreco;
  /** Preço praticado. `null` aceita o que a conta sugeriu. */
  precoVenda: Centavos | null;
}

function agora() {
  return Timestamp.now();
}

/** Ids sem repetição: a mesma farinha pode aparecer em duas linhas da receita. */
function idsUnicos(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Tudo que a ficha grava além do que a usuária digitou.
 *
 * Os derivados saem de `derivarFicha`, a mesma função que o editor usa para
 * desenhar o painel de preço: o número que ela viu antes de tocar em salvar é
 * o número que vai para o banco.
 */
function corpoDaFicha(dados: DadosFicha) {
  const derivado = derivarFicha({
    itens: dados.itens,
    componentes: dados.componentes,
    tempoProducaoMinutos: dados.tempoProducaoMinutos,
    rendimento: dados.rendimento,
    operacional: dados.operacional,
    precificacao: dados.precificacao,
    precoVenda: dados.precoVenda,
  });

  const itens: ItemFichaTecnica[] = dados.itens.map((item) => ({
    insumoId: item.insumoId,
    nomeSnapshot: item.nomeSnapshot,
    categoria: item.categoria,
    quantidade: item.quantidade,
    unidadeBase: item.unidadeBase,
    custoLinha: custoLinhaItem(item),
  }));

  const componentes: ComponenteKit[] = dados.componentes.map((componente) => ({
    fichaId: componente.fichaId,
    nomeSnapshot: componente.nomeSnapshot,
    quantidade: componente.quantidade,
    custoUnitarioSnapshot: componente.custoUnitarioSnapshot,
    custoLinha: custoLinhaComponente(componente),
  }));

  return {
    v: VERSAO_SCHEMA,
    nome: dados.nome.trim(),
    nomeBusca: chaveDeBusca(dados.nome),
    categoria: dados.categoria.trim(),
    tipo: dados.tipo,
    rendimento: dados.rendimento,
    unidadeRendimento: dados.unidadeRendimento,

    itens,
    componentes,
    // Espelho consultável por `array-contains`: é o que acha as fichas
    // afetadas quando um insumo muda de preço (`DECISOES.md#d05`).
    insumoIds: idsUnicos(itens.map((item) => item.insumoId)),
    componenteIds: idsUnicos(
      componentes.map((componente) => componente.fichaId),
    ),

    invisiveis: {
      tempoProducaoMinutos: dados.tempoProducaoMinutos,
      custoMaoDeObra: derivado.custo.custoMaoDeObra,
      custoEnergiaGas: derivado.custo.custoEnergiaGas,
      custoIndireto: derivado.custo.custoIndireto,
    },

    custoInsumos: derivado.custo.custoInsumos,
    custoEmbalagem: derivado.custo.custoEmbalagem,
    custoComponentes: derivado.custo.custoComponentes,
    custoTotalLote: derivado.custo.custoTotalLote,
    custoUnitario: derivado.custo.custoUnitario,

    precificacao: {
      metodo: dados.precificacao.metodo,
      // Os dois métodos ficam gravados, e não só o escolhido: trocar de
      // markup para margem e voltar não pode apagar o número que ela ajustou.
      markup: dados.precificacao.markup,
      margemDesejada: dados.precificacao.margemDesejada,
      taxaCartaoConsiderada: dados.precificacao.taxaCartaoConsiderada,
      outrasTaxas: dados.precificacao.outrasTaxas,
      precoSugerido: derivado.precoSugerido ?? 0,
      precoVenda: derivado.precoVenda,
      lucroUnitario: derivado.verificacao.lucroUnitario,
      margemReal: derivado.verificacao.margemReal,
      markupReal: derivado.verificacao.markupReal,
    },

    custoCalculadoEm: agora(),
    // Acabou de ser calculada com o preço de insumo de agora.
    custoDesatualizado: false,
  };
}

export async function criarFicha(
  contaId: string,
  dados: DadosFicha,
): Promise<string> {
  const momento = agora();

  const nova: Omit<FichaTecnica, "id"> = {
    ...corpoDaFicha(dados),
    ativo: true,
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(colFichas(contaId), nova as FichaTecnica);

  // `increment` entra na fila offline, como no cadastro de insumo.
  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalFichas: increment(1), atualizadoEm: momento },
    { merge: true },
  );

  return referencia.id;
}

/**
 * Regrava a ficha inteira a partir dos insumos de agora.
 *
 * É também o que a ação "recalcular" faz: não existe um caminho separado de
 * recálculo porque salvar já refaz todo custo a partir do preço atual dos
 * insumos e limpa `custoDesatualizado`. Um segundo caminho seria um segundo
 * lugar para o custo divergir.
 */
export async function atualizarFicha(
  contaId: string,
  fichaId: string,
  dados: DadosFicha,
): Promise<void> {
  await updateDoc(docFicha(contaId, fichaId), {
    ...corpoDaFicha(dados),
    atualizadoEm: agora(),
  });
}

/**
 * Arquiva em vez de apagar: pedidos antigos referenciam este id, e um kit
 * pode ter esta ficha como componente.
 */
export async function arquivarFicha(
  contaId: string,
  fichaId: string,
): Promise<void> {
  const momento = agora();

  await updateDoc(docFicha(contaId, fichaId), {
    arquivado: true,
    ativo: false,
    atualizadoEm: momento,
  });

  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalFichas: increment(-1), atualizadoEm: momento },
    { merge: true },
  );
}
