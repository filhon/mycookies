import {
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { obterDb } from "../client";
import { colFichas, colInsumos, docInsumo, docResumoGlobal } from "../colecoes";
import { despachar } from "./despachar";
import {
  baseAceita,
  basesDasReceitas,
  calcularCustoInsumo,
  chaveDeBusca,
  historicoComDescarte,
  historicoCorrigido,
  historicoPodado,
  vigenteDoHistorico,
} from "@/lib/domain/custoInsumo";
import { unidadeBaseDe } from "@/lib/domain/unidades";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CategoriaInsumo,
  Centavos,
  DataISO,
  HistoricoPreco,
  Insumo,
  Percentual,
  UnidadeCompra,
} from "@/lib/types";

export interface DadosInsumo {
  nome: string;
  categoria: CategoriaInsumo;
  marca?: string;
  fornecedor?: string;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  perdaPercentual: Percentual;
  estoqueAtual?: number;
  /**
   * A data da contagem, carregada adiante por quem não contou.
   *
   * Só a tela de contagem escreve isto, e ela não passa por aqui
   * (`mutations/estoque.ts` toca dois campos e mais nada). Quem chega até este
   * corpo por outro caminho precisa trazer a data que já estava no documento:
   * corrigir o preço da farinha na gôndola não pode redatar a despensa.
   */
  estoqueContadoEmISO?: DataISO;
}

/**
 * O insumo já gravado, de volta na forma que `atualizarInsumo` recebe.
 *
 * Existe para quem quer mudar um campo só e não tem o formulário na mão — a
 * correção de preço no mercado, que grava o insumo a partir da lista de compras.
 * Sem isto, aquele caminho reescreveria a forma do documento por conta própria.
 */
export function dadosDoInsumo(insumo: Insumo): DadosInsumo {
  return {
    nome: insumo.nome,
    categoria: insumo.categoria,
    ...(insumo.marca ? { marca: insumo.marca } : {}),
    ...(insumo.fornecedor ? { fornecedor: insumo.fornecedor } : {}),
    precoCompra: insumo.precoCompra,
    quantidadeCompra: insumo.quantidadeCompra,
    unidadeCompra: insumo.unidadeCompra,
    perdaPercentual: insumo.perdaPercentual,
    ...(insumo.estoqueAtual !== undefined && insumo.estoqueAtual !== null
      ? { estoqueAtual: insumo.estoqueAtual }
      : {}),
    ...(insumo.estoqueContadoEmISO
      ? { estoqueContadoEmISO: insumo.estoqueContadoEmISO }
      : {}),
  };
}

/** Quantas compras anteriores ficam guardadas dentro do próprio documento. */
const LIMITE_HISTORICO = 12;

/**
 * `Timestamp.now()` e não `serverTimestamp()`.
 *
 * O relógio do servidor seria mais confiável, mas `serverTimestamp()` grava
 * `null` no cache local até a sincronização acontecer, e a lista quebraria ao
 * ordenar por data justamente no cenário mais comum desta usuária: offline.
 * Com uma única escritora, o relógio do aparelho basta.
 */
function agora() {
  return Timestamp.now();
}

function camposDerivados(dados: DadosInsumo) {
  const custo = calcularCustoInsumo({
    precoCompra: dados.precoCompra,
    quantidadeCompra: dados.quantidadeCompra,
    unidadeCompra: dados.unidadeCompra,
    perdaPercentual: dados.perdaPercentual,
  });

  return {
    unidadeBase: custo.unidadeBase,
    quantidadeBase: custo.quantidadeBase,
    custoUnidadeBase: custo.custoUnidadeBase,
    custoUnidadeBaseCorrigido: custo.custoUnidadeBaseCorrigido,
  };
}

/**
 * De onde a compra veio (spec 189): a nota com o nome impresso, o formulário ou
 * a lista de compras. A da biblioteca não leva, e se reconhece por `criadoEm`.
 */
export type Procedencia = Pick<HistoricoPreco, "origem" | "estabelecimento">;

/** Registrar uma compra nova, ou corrigir a última dela (`DECISOES.md#d419`). */
export type ModoDaEscrita = "COMPRA" | "CORRECAO";

function correcaoDe(dados: DadosInsumo) {
  return {
    precoCompra: dados.precoCompra,
    quantidadeCompra: dados.quantidadeCompra,
    unidadeCompra: dados.unidadeCompra,
    custoUnidadeBase: calcularCustoInsumo(dados).custoUnidadeBase,
  };
}

function entradaHistorico(
  dados: DadosInsumo,
  momento: Timestamp,
  procedencia: Procedencia,
): HistoricoPreco {
  return {
    data: momento,
    ...correcaoDe(dados),
    ...(dados.fornecedor ? { fornecedor: dados.fornecedor } : {}),
    ...(procedencia.origem ? { origem: procedencia.origem } : {}),
    ...(procedencia.estabelecimento?.trim()
      ? { estabelecimento: procedencia.estabelecimento.trim() }
      : {}),
  };
}

/**
 * O documento de um insumo novo, montado em um lugar só.
 *
 * Existe porque a importação de nota grava em lote, e um lote que reescrevesse
 * a forma do documento por conta própria seria um segundo lugar decidindo o que
 * é um insumo — o mesmo motivo de `dadosDoInsumo`, e o mesmo padrão de
 * `derivarFicha` (`DECISOES.md#d19`): uma função, dois chamadores.
 */
export function corpoDeInsumoNovo(
  dados: DadosInsumo,
  momento: Timestamp,
  procedencia: Procedencia = {},
): Omit<Insumo, "id"> {
  return {
    v: VERSAO_SCHEMA,
    nome: dados.nome.trim(),
    nomeBusca: chaveDeBusca(dados.nome),
    categoria: dados.categoria,
    ...(dados.marca ? { marca: dados.marca.trim() } : {}),
    ...(dados.fornecedor ? { fornecedor: dados.fornecedor.trim() } : {}),
    precoCompra: dados.precoCompra,
    quantidadeCompra: dados.quantidadeCompra,
    unidadeCompra: dados.unidadeCompra,
    perdaPercentual: dados.perdaPercentual,
    ...camposDerivados(dados),
    ...(dados.estoqueAtual !== undefined
      ? { estoqueAtual: dados.estoqueAtual }
      : {}),
    ...(dados.estoqueContadoEmISO
      ? { estoqueContadoEmISO: dados.estoqueContadoEmISO }
      : {}),
    ultimaCompraEm: momento,
    historicoPrecos: [entradaHistorico(dados, momento, procedencia)],
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };
}

/**
 * O histórico de uma escrita em que a compra mudou: uma entrada a mais, ou a
 * última compra dela reescrita. A correção grava o array inteiro a partir do
 * documento em mãos (uma escritora, `#d104`) e não mexe em `ultimaCompraEm`:
 * corrigir não rejuvenesce o preço. Sem compra dela para corrigir (só a da
 * biblioteca), vira compra.
 */
function historicoDaEscrita(
  anterior: Insumo,
  dados: DadosInsumo,
  momento: Timestamp,
  procedencia: Procedencia,
  modo: ModoDaEscrita,
) {
  const corrigido =
    modo === "CORRECAO"
      ? historicoCorrigido(anterior, correcaoDe(dados))
      : null;
  return corrigido
    ? { historicoPrecos: corrigido }
    : {
        ultimaCompraEm: momento,
        historicoPrecos: arrayUnion(
          entradaHistorico(dados, momento, procedencia),
        ),
      };
}

/**
 * Os campos de uma atualização, com a entrada de histórico quando a compra
 * mudou. Mesmo motivo e mesmo par de chamadores de `corpoDeInsumoNovo`.
 *
 * Quem decide **o que** a nota tem direito de mudar não é esta função: é
 * `atualizacaoDaLinha`, no domínio. Aqui só se monta o documento a partir do
 * `DadosInsumo` que chegou pronto.
 */
export function corpoDeAtualizacao(
  anterior: Insumo,
  dados: DadosInsumo,
  momento: Timestamp,
  procedencia: Procedencia,
  modo: ModoDaEscrita = "COMPRA",
) {
  return {
    v: VERSAO_SCHEMA,
    nome: dados.nome.trim(),
    nomeBusca: chaveDeBusca(dados.nome),
    categoria: dados.categoria,
    marca: dados.marca?.trim() ?? null,
    fornecedor: dados.fornecedor?.trim() ?? null,
    precoCompra: dados.precoCompra,
    quantidadeCompra: dados.quantidadeCompra,
    unidadeCompra: dados.unidadeCompra,
    perdaPercentual: dados.perdaPercentual,
    ...camposDerivados(dados),
    estoqueAtual: dados.estoqueAtual ?? null,
    estoqueContadoEmISO: dados.estoqueContadoEmISO ?? null,
    atualizadoEm: momento,
    ...(compraMudou(anterior, dados)
      ? historicoDaEscrita(anterior, dados, momento, procedencia, modo)
      : {}),
  };
}

/**
 * O que faz uma escrita mexer no histórico: preço ou embalagem. A perda não:
 * o quilo do histórico é sem perda (`#d222`), e perda mudar não é comprar.
 */
export function compraMudou(anterior: Insumo, dados: DadosInsumo): boolean {
  return (
    anterior.precoCompra !== dados.precoCompra ||
    anterior.quantidadeCompra !== dados.quantidadeCompra ||
    anterior.unidadeCompra !== dados.unidadeCompra
  );
}

/** O que envelhece as fichas: a compra, ou a perda, que muda o custo corrigido. */
export function custoMudou(anterior: Insumo, dados: DadosInsumo): boolean {
  return (
    compraMudou(anterior, dados) ||
    anterior.perdaPercentual !== dados.perdaPercentual
  );
}

export async function criarInsumo(
  contaId: string,
  dados: DadosInsumo,
): Promise<string> {
  const momento = agora();

  // Id gerado no aparelho: nada aqui espera o servidor (`DECISOES.md#d104`).
  const referencia = doc(colInsumos(contaId));
  despachar(
    setDoc(
      referencia,
      corpoDeInsumoNovo(dados, momento, { origem: "MANUAL" }) as Insumo,
    ),
  );

  // Contador do agregado global: `increment` entra na fila e funciona offline.
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalInsumos: increment(1), atualizadoEm: momento },
      { merge: true },
    ),
  );

  return referencia.id;
}

/**
 * A base de um material usado em receita não muda por aqui (spec 188).
 *
 * As receitas guardam "200" em gramas; o açúcar que a nota passou a contar em
 * unidades multiplicava 200 pelo preço da unidade. Mudar a unidade de conta é
 * converter as receitas junto, e esse caminho é outro (191). As telas já só
 * oferecem a base aceita: isto é para quem chega por um caminho que elas não
 * previram. Só consulta quando a base muda, e sem rede o `getDocs` lê o cache.
 */
export async function guardarBase(
  contaId: string,
  anterior: Insumo,
  dados: DadosInsumo,
): Promise<void> {
  const base = unidadeBaseDe(dados.unidadeCompra);
  if (base === anterior.unidadeBase) return;

  const fichas = await getDocs(
    query(
      colFichas(contaId),
      where("insumoIds", "array-contains", anterior.id),
    ),
  );
  const vivas = fichas.docs
    .map((ficha) => ficha.data())
    .filter((ficha) => !ficha.arquivado);
  if (!baseAceita(base, basesDasReceitas(vivas, anterior.id))) {
    throw new Error(
      `${anterior.nome} é medido noutra unidade pelos produtos: a unidade de conta não muda por aqui.`,
    );
  }
}

export async function atualizarInsumo(
  contaId: string,
  anterior: Insumo,
  dados: DadosInsumo,
  modo: ModoDaEscrita = "COMPRA",
  procedencia: Procedencia = { origem: "MANUAL" },
): Promise<void> {
  await guardarBase(contaId, anterior, dados);
  const momento = agora();

  despachar(
    updateDoc(
      docInsumo(contaId, anterior.id),
      corpoDeAtualizacao(anterior, dados, momento, procedencia, modo),
    ),
  );

  // No mesmo tique, sem esperar o `updateDoc`: sem rede a promessa dele não
  // resolve, e o selo de "custo desatualizado" nunca chegava a ser gravado —
  // o preço velho virava orçamento sem aviso (`DECISOES.md#d104`).
  // A correção não cresce o array, e a poda então não acha o que cortar.
  if (compraMudou(anterior, dados)) {
    despachar(podarHistorico(contaId, anterior));
  }
  if (custoMudou(anterior, dados)) {
    despachar(marcarFichasDesatualizadas(contaId, anterior.id));
  }
}

/**
 * Descarta uma compra dela, pelo dia (`DECISOES.md#d420`): fica no array,
 * riscada. Sendo a que vale, o material volta à compra válida anterior.
 */
export async function descartarCompra(
  contaId: string,
  anterior: Insumo,
  dataMs: number,
): Promise<void> {
  await trocarDescarte(contaId, anterior, dataMs, agora());
}

/** Desfaz o descarte, e refaz a mesma conta de qual compra vale. */
export async function restaurarCompra(
  contaId: string,
  anterior: Insumo,
  dataMs: number,
): Promise<void> {
  await trocarDescarte(contaId, anterior, dataMs, null);
}

async function trocarDescarte(
  contaId: string,
  anterior: Insumo,
  dataMs: number,
  em: Timestamp | null,
): Promise<void> {
  const historicoPrecos = historicoComDescarte(
    anterior.historicoPrecos ?? [],
    dataMs,
    em,
  );
  const antes = vigenteDoHistorico(anterior.historicoPrecos ?? []);
  const depois = vigenteDoHistorico(historicoPrecos);
  // A tela não oferece descartar a única que vale; isto é para quem chegar
  // por outro caminho.
  if (!depois) throw new Error("Sem outra compra para o material voltar.");

  const mudouAVigente = antes?.data.toMillis() !== depois.data.toMillis();
  const dados: DadosInsumo = {
    ...dadosDoInsumo(anterior),
    precoCompra: depois.precoCompra,
    quantidadeCompra: depois.quantidadeCompra,
    unidadeCompra: depois.unidadeCompra,
  };
  if (mudouAVigente) await guardarBase(contaId, anterior, dados);

  const momento = agora();
  despachar(
    updateDoc(docInsumo(contaId, anterior.id), {
      v: VERSAO_SCHEMA,
      historicoPrecos,
      atualizadoEm: momento,
      ...(mudouAVigente
        ? {
            precoCompra: dados.precoCompra,
            quantidadeCompra: dados.quantidadeCompra,
            unidadeCompra: dados.unidadeCompra,
            ...camposDerivados(dados),
            // A idade do preço é a da compra que voltou a valer (088).
            ultimaCompraEm: depois.data,
          }
        : {}),
    }),
  );

  if (mudouAVigente && custoMudou(anterior, dados)) {
    despachar(marcarFichasDesatualizadas(contaId, anterior.id));
  }
}

/**
 * `arrayUnion` não tem teto. Depois de gravar, corta o histórico nas últimas
 * doze entradas, as descartadas saindo primeiro: o documento precisa
 * continuar barato de ler.
 */
export async function podarHistorico(
  contaId: string,
  anterior: Insumo,
): Promise<void> {
  const total = (anterior.historicoPrecos?.length ?? 0) + 1;
  if (total <= LIMITE_HISTORICO) return;

  const atual = await getDoc(docInsumo(contaId, anterior.id));
  const historico = atual.data()?.historicoPrecos ?? [];
  if (historico.length <= LIMITE_HISTORICO) return;

  despachar(
    updateDoc(docInsumo(contaId, anterior.id), {
      historicoPrecos: historicoPodado(historico, LIMITE_HISTORICO),
    }),
  );
}

/**
 * Preço de insumo mudou: toda ficha que o usa passa a exibir custo velho.
 * A consulta por `array-contains` acha exatamente as afetadas, e o selo de
 * "custo desatualizado" aparece antes que um preço errado vire orçamento.
 *
 * Sem rede, `getDocs` serve do cache: acha as fichas que este aparelho já
 * abriu, e é o que basta (`DECISOES.md#d104`). Devolve quantas marcou.
 */
export async function marcarFichasDesatualizadas(
  contaId: string,
  insumoId: string,
): Promise<number> {
  const afetadas = await getDocs(
    query(colFichas(contaId), where("insumoIds", "array-contains", insumoId)),
  );
  if (afetadas.empty) return 0;

  const lote = writeBatch(obterDb());
  afetadas.forEach((ficha) => {
    lote.update(doc(colFichas(contaId), ficha.id), {
      custoDesatualizado: true,
    });
  });
  despachar(lote.commit());

  return afetadas.size;
}

/**
 * Arquiva em vez de apagar: fichas e pedidos antigos referenciam este id, e o
 * histórico de custo precisa continuar auditável.
 */
export async function arquivarInsumo(
  contaId: string,
  insumoId: string,
): Promise<void> {
  const momento = agora();
  despachar(
    updateDoc(docInsumo(contaId, insumoId), {
      arquivado: true,
      atualizadoEm: momento,
    }),
  );
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalInsumos: increment(-1), atualizadoEm: momento },
      { merge: true },
    ),
  );
}

export async function restaurarInsumo(
  contaId: string,
  insumoId: string,
): Promise<void> {
  const momento = agora();
  despachar(
    updateDoc(docInsumo(contaId, insumoId), {
      arquivado: false,
      atualizadoEm: momento,
    }),
  );
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalInsumos: increment(1), atualizadoEm: momento },
      { merge: true },
    ),
  );
}
