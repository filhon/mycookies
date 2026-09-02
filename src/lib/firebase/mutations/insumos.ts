import {
  addDoc,
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
import { calcularCustoInsumo, chaveDeBusca } from "@/lib/domain/custoInsumo";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CategoriaInsumo,
  Centavos,
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
  estoqueMinimo?: number;
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
    ...(insumo.estoqueMinimo !== undefined && insumo.estoqueMinimo !== null
      ? { estoqueMinimo: insumo.estoqueMinimo }
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

function entradaHistorico(dados: DadosInsumo): HistoricoPreco {
  const custo = calcularCustoInsumo(dados);
  return {
    data: agora(),
    precoCompra: dados.precoCompra,
    quantidadeCompra: dados.quantidadeCompra,
    unidadeCompra: dados.unidadeCompra,
    custoUnidadeBase: custo.custoUnidadeBase,
    ...(dados.fornecedor ? { fornecedor: dados.fornecedor } : {}),
  };
}

export async function criarInsumo(
  contaId: string,
  dados: DadosInsumo,
): Promise<string> {
  const momento = agora();

  const novo: Omit<Insumo, "id"> = {
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
    ...(dados.estoqueMinimo !== undefined
      ? { estoqueMinimo: dados.estoqueMinimo }
      : {}),
    ultimaCompraEm: momento,
    historicoPrecos: [entradaHistorico(dados)],
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(colInsumos(contaId), novo as Insumo);

  // Contador do agregado global: `increment` entra na fila e funciona offline.
  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalInsumos: increment(1), atualizadoEm: momento },
    { merge: true },
  );

  return referencia.id;
}

export async function atualizarInsumo(
  contaId: string,
  anterior: Insumo,
  dados: DadosInsumo,
): Promise<void> {
  const precoMudou =
    anterior.precoCompra !== dados.precoCompra ||
    anterior.quantidadeCompra !== dados.quantidadeCompra ||
    anterior.unidadeCompra !== dados.unidadeCompra ||
    anterior.perdaPercentual !== dados.perdaPercentual;

  const momento = agora();

  await updateDoc(docInsumo(contaId, anterior.id), {
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
    estoqueMinimo: dados.estoqueMinimo ?? null,
    atualizadoEm: momento,
    ...(precoMudou
      ? {
          ultimaCompraEm: momento,
          historicoPrecos: arrayUnion(entradaHistorico(dados)),
        }
      : {}),
  });

  if (precoMudou) {
    await Promise.all([
      podarHistorico(contaId, anterior),
      marcarFichasDesatualizadas(contaId, anterior.id),
    ]);
  }
}

/**
 * `arrayUnion` não tem teto. Depois de gravar, corta o histórico nas últimas
 * doze compras: o documento precisa continuar barato de ler.
 */
async function podarHistorico(
  contaId: string,
  anterior: Insumo,
): Promise<void> {
  const total = (anterior.historicoPrecos?.length ?? 0) + 1;
  if (total <= LIMITE_HISTORICO) return;

  const atual = await getDoc(docInsumo(contaId, anterior.id));
  const historico = atual.data()?.historicoPrecos ?? [];
  if (historico.length <= LIMITE_HISTORICO) return;

  await updateDoc(docInsumo(contaId, anterior.id), {
    historicoPrecos: historico
      .slice()
      .sort((a, b) => b.data.toMillis() - a.data.toMillis())
      .slice(0, LIMITE_HISTORICO),
  });
}

/**
 * Preço de insumo mudou: toda ficha que o usa passa a exibir custo velho.
 * A consulta por `array-contains` acha exatamente as afetadas, e o selo de
 * "custo desatualizado" aparece antes que um preço errado vire orçamento.
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
  await lote.commit();

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
  await updateDoc(docInsumo(contaId, insumoId), {
    arquivado: true,
    atualizadoEm: momento,
  });
  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalInsumos: increment(-1), atualizadoEm: momento },
    { merge: true },
  );
}

export async function restaurarInsumo(
  contaId: string,
  insumoId: string,
): Promise<void> {
  const momento = agora();
  await updateDoc(docInsumo(contaId, insumoId), {
    arquivado: false,
    atualizadoEm: momento,
  });
  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalInsumos: increment(1), atualizadoEm: momento },
    { merge: true },
  );
}
