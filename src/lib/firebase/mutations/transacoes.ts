import {
  addDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type FieldValue,
} from "firebase/firestore";
import { colTransacoes, docResumoMensal } from "../colecoes";
import {
  agregarTransacoes,
  deltaDaTransacao,
  somarParcelas,
  taxaDaEntrada,
  type ParcelasDoAgregado,
  type TransacaoAgregavel,
} from "@/lib/domain/caixa";
import { competenciaDeISO, dataDeISO } from "@/lib/domain/datas";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CategoriaTransacao,
  Centavos,
  CompetenciaMensal,
  DataISO,
  FormaPagamento,
  ResumoDia,
  TipoTransacao,
  Transacao,
} from "@/lib/types";

/** O que o formulário entrega. `competencia` e a taxa são derivadas daqui. */
export interface DadosTransacao {
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  descricao: string;
  valor: Centavos;
  dataISO: DataISO;
  formaPagamentoId?: string;
  recorrente: boolean;
  observacoes?: string;
}

/** `Timestamp.now()`, nunca `serverTimestamp()` (`DECISOES.md#d06`). */
function agora() {
  return Timestamp.now();
}

/** A consulta do mês. Um lugar só conhece a forma dela — e o índice que ela pede. */
export function consultaTransacoesDoMes(
  contaId: string,
  competencia: CompetenciaMensal,
) {
  return query(
    colTransacoes(contaId),
    where("arquivado", "==", false),
    where("competencia", "==", competencia),
    orderBy("data", "desc"),
  );
}

/**
 * Os campos derivados do lançamento, calculados na escrita.
 *
 * `competencia` e `data` saem do dia que a usuária escolheu, no fuso do
 * aparelho, e a taxa da maquininha é congelada aqui: é o valor que o agregado
 * vai somar e, um dia, reverter.
 */
function corpoDaTransacao(dados: DadosTransacao, formas: FormaPagamento[]) {
  const formaPagamentoId =
    dados.tipo === "ENTRADA" ? dados.formaPagamentoId : undefined;

  return {
    v: VERSAO_SCHEMA,
    tipo: dados.tipo,
    categoria: dados.categoria,
    descricao: dados.descricao.trim(),
    valor: dados.valor,
    data: Timestamp.fromDate(dataDeISO(dados.dataISO)),
    dataISO: dados.dataISO,
    competencia: competenciaDeISO(dados.dataISO),
    custoTaxa: taxaDaEntrada(
      { tipo: dados.tipo, valor: dados.valor, formaPagamentoId },
      formas,
    ),
    recorrente: dados.recorrente,
    formaPagamentoId,
    observacoes: dados.observacoes?.trim() || undefined,
  };
}

/** Só o que o agregado consome. O resto do documento não interessa a ele. */
function agregavel(transacao: TransacaoAgregavel): TransacaoAgregavel {
  return {
    tipo: transacao.tipo,
    categoria: transacao.categoria,
    valor: transacao.valor,
    dataISO: transacao.dataISO,
    custoTaxa: transacao.custoTaxa ?? 0,
  };
}

type IncrementosDoDia = Record<string, Record<string, FieldValue>>;

/**
 * As parcelas viram incrementos aninhados, e não caminhos com ponto.
 *
 * `setDoc` com `merge` trata a chave literalmente — `'porDia.03'` viraria um
 * campo com ponto no nome, e não o dia 03 dentro de `porDia`. O mapa aninhado
 * é o que o `merge` funde de verdade, e é também o que cria o documento do mês
 * no primeiro lançamento sem precisar checar se ele existe.
 */
function incrementosDoAgregado(parcelas: ParcelasDoAgregado) {
  const porCategoriaSaida: Record<string, FieldValue> = {};
  for (const [categoria, valor] of Object.entries(parcelas.porCategoriaSaida)) {
    if (valor) porCategoriaSaida[categoria] = increment(valor);
  }

  const porDia: IncrementosDoDia = {};
  for (const [dia, linha] of Object.entries(parcelas.porDia)) {
    porDia[dia] = {
      entradas: increment(linha.entradas),
      saidas: increment(linha.saidas),
      // Estrutura a linha do dia sem mover o número: `pedidos` é do Módulo 3.
      pedidos: increment(0),
    };
  }

  return {
    v: VERSAO_SCHEMA,
    competencia: "",
    entradas: increment(parcelas.entradas),
    saidas: increment(parcelas.saidas),
    custoTaxasPagamento: increment(parcelas.custoTaxasPagamento),
    lucro: increment(parcelas.lucro),
    porCategoriaSaida,
    porDia,
    atualizadoEm: agora(),
  };
}

/**
 * Soma um delta no agregado do mês.
 *
 * `increment` entra na fila offline, que é a razão de ele existir aqui em vez
 * de uma transação: transação exige rede, e offline é o estado normal desta
 * usuária (`DECISOES.md#d09` e `#d10`).
 */
async function aplicarNoAgregado(
  contaId: string,
  competencia: CompetenciaMensal,
  parcelas: ParcelasDoAgregado,
): Promise<void> {
  await setDoc(
    docResumoMensal(contaId, competencia),
    { ...incrementosDoAgregado(parcelas), competencia },
    { merge: true },
  );
}

export async function criarTransacao(
  contaId: string,
  dados: DadosTransacao,
  formas: FormaPagamento[],
): Promise<string> {
  const momento = agora();
  const corpo = corpoDaTransacao(dados, formas);

  const nova: Omit<Transacao, "id"> = {
    ...corpo,
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(colTransacoes(contaId), nova as Transacao);
  await aplicarNoAgregado(
    contaId,
    corpo.competencia,
    deltaDaTransacao(agregavel(corpo), 1),
  );

  return referencia.id;
}

/**
 * Editar é reverter mais aplicar.
 *
 * É o ponto onde este módulo quebra se for feito às pressas: mudar o valor sem
 * desfazer o anterior deixa o agregado somando dois lançamentos onde há um. E
 * se a data mudou de mês, são dois documentos — a contribuição sai inteira da
 * competência antiga e entra inteira na nova, com a taxa junto.
 */
export async function atualizarTransacao(
  contaId: string,
  anterior: Transacao,
  dados: DadosTransacao,
  formas: FormaPagamento[],
): Promise<void> {
  const corpo = corpoDaTransacao(dados, formas);

  await updateDoc(doc(colTransacoes(contaId), anterior.id), {
    ...corpo,
    // Chave ausente em `updateDoc` deixa o valor velho no lugar: trocar de
    // entrada para saída precisa apagar a forma de pagamento, não escondê-la.
    formaPagamentoId: corpo.formaPagamentoId ?? deleteField(),
    observacoes: corpo.observacoes ?? deleteField(),
    atualizadoEm: agora(),
  });

  const reverso = deltaDaTransacao(agregavel(anterior), -1);
  const aplicado = deltaDaTransacao(agregavel(corpo), 1);

  if (anterior.competencia === corpo.competencia) {
    // Mesmo mês, uma escrita só: menos chance de aplicar metade da correção.
    await aplicarNoAgregado(
      contaId,
      corpo.competencia,
      somarParcelas(reverso, aplicado),
    );
    return;
  }

  await aplicarNoAgregado(contaId, anterior.competencia, reverso);
  await aplicarNoAgregado(contaId, corpo.competencia, aplicado);
}

/**
 * Arquiva em vez de apagar, como todo o resto do sistema: o lançamento pode
 * estar amarrado a um pedido, e o histórico do caixa precisa continuar
 * auditável. O agregado perde a contribuição; o documento fica.
 */
export async function arquivarTransacao(
  contaId: string,
  transacao: Transacao,
): Promise<void> {
  await updateDoc(doc(colTransacoes(contaId), transacao.id), {
    arquivado: true,
    atualizadoEm: agora(),
  });

  await aplicarNoAgregado(
    contaId,
    transacao.competencia,
    deltaDaTransacao(agregavel(transacao), -1),
  );
}

/**
 * A rede de segurança: reescreve o mês inteiro a partir das transações.
 *
 * Não é o caminho normal — é o que prova que os deltas estão certos, e o que
 * conserta o mês se algum se perder. Reescreve só a metade do agregado que
 * nasce de transação: `mergeFields` substitui exatamente os campos listados e
 * não encosta em `qtdPedidos`, `produtos`, `custoInsumos` nem `meta`, que são
 * do Módulo 3 e da sessão 4B.
 */
export async function recalcularMes(
  contaId: string,
  competencia: CompetenciaMensal,
): Promise<ParcelasDoAgregado> {
  const referencia = docResumoMensal(contaId, competencia);

  const [existente, encontradas] = await Promise.all([
    getDoc(referencia),
    getDocs(consultaTransacoesDoMes(contaId, competencia)),
  ]);

  const parcelas = agregarTransacoes(
    encontradas.docs.map((documento) => agregavel(documento.data())),
  );

  // `porDia` é substituído inteiro, e a contagem de pedidos de cada dia é do
  // Módulo 3: sem trazê-la de volta, recalcular o caixa apagaria uma metade do
  // documento que este módulo nem alimenta.
  const pedidosPorDia = existente.data()?.porDia ?? {};
  const porDia: Record<string, ResumoDia> = {};
  for (const [dia, linha] of Object.entries(parcelas.porDia)) {
    porDia[dia] = { ...linha, pedidos: pedidosPorDia[dia]?.pedidos ?? 0 };
  }
  for (const [dia, linha] of Object.entries(pedidosPorDia)) {
    if (!porDia[dia] && linha.pedidos > 0) {
      porDia[dia] = { entradas: 0, saidas: 0, pedidos: linha.pedidos };
    }
  }

  await setDoc(
    referencia,
    {
      v: VERSAO_SCHEMA,
      competencia,
      entradas: parcelas.entradas,
      saidas: parcelas.saidas,
      custoTaxasPagamento: parcelas.custoTaxasPagamento,
      lucro: parcelas.lucro,
      porCategoriaSaida: parcelas.porCategoriaSaida,
      porDia,
      atualizadoEm: agora(),
    },
    {
      mergeFields: [
        "v",
        "competencia",
        "entradas",
        "saidas",
        "custoTaxasPagamento",
        "lucro",
        "porCategoriaSaida",
        "porDia",
        "atualizadoEm",
      ],
    },
  );

  return { ...parcelas, porDia };
}
