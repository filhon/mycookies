import {
  addDoc,
  deleteField,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { colTransacoes } from "../colecoes";
import { aplicarNoAgregado, transacaoAgregavel } from "./agregado";
import {
  deltaDaTransacao,
  somarParcelas,
  taxaDaEntrada,
} from "@/lib/domain/caixa";
import { competenciaDeISO, dataDeISO } from "@/lib/domain/datas";
import { type ContextoMeta } from "./metas";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CategoriaTransacao,
  Centavos,
  DataISO,
  FormaPagamento,
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
  /** Origem, quando o lançamento nasceu de um pedido pago. */
  pedidoId?: string;
  /**
   * Taxa já congelada por quem chama.
   *
   * O pedido pago traz a sua, para que o lançamento e o pedido nasçam
   * exatamente do mesmo número mesmo que a forma de pagamento tenha sido
   * desativada entre o combinado e o pagamento (`DECISOES.md#d24`). Sem isto,
   * `taxaCobrada` devolveria zero para uma forma que sumiu, e o pedido
   * continuaria dizendo outra coisa.
   */
  custoTaxa?: Centavos;
}

/** `Timestamp.now()`, nunca `serverTimestamp()` (`DECISOES.md#d06`). */
function agora() {
  return Timestamp.now();
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
    custoTaxa:
      dados.custoTaxa ??
      taxaDaEntrada(
        { tipo: dados.tipo, valor: dados.valor, formaPagamentoId },
        formas,
      ),
    recorrente: dados.recorrente,
    formaPagamentoId,
    observacoes: dados.observacoes?.trim() || undefined,
    pedidoId: dados.pedidoId,
  };
}

/**
 * Grava o documento do lançamento, e **não toca no agregado**.
 *
 * Existe para o pedido pago: lá a contribuição do lançamento e a do pedido
 * precisam entrar no agregado somadas, em uma escrita só. Se cada uma fosse
 * aplicada por conta própria, o espelho da meta seria reescrito duas vezes — e
 * a segunda o reescreveria com o total de antes da primeira (`#d29`).
 */
export async function gravarTransacao(
  contaId: string,
  dados: DadosTransacao,
  formas: FormaPagamento[],
): Promise<{ id: string; corpo: ReturnType<typeof corpoDaTransacao> }> {
  const momento = agora();
  const corpo = corpoDaTransacao(dados, formas);

  const nova: Omit<Transacao, "id"> = {
    ...corpo,
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(colTransacoes(contaId), nova as Transacao);
  return { id: referencia.id, corpo };
}

/**
 * Corrige o valor de um lançamento sem tocar no agregado, pelo mesmo motivo de
 * `gravarTransacao`. É o que acontece quando um pedido já pago muda de total:
 * se a transação não mudasse junto, o caixa ficaria com um número que o pedido
 * não reconhece.
 */
export async function corrigirValorDaTransacao(
  contaId: string,
  transacaoId: string,
  dados: { valor: Centavos; custoTaxa: Centavos; descricao: string },
): Promise<void> {
  await updateDoc(doc(colTransacoes(contaId), transacaoId), {
    valor: dados.valor,
    custoTaxa: dados.custoTaxa,
    descricao: dados.descricao.trim(),
    atualizadoEm: agora(),
  });
}

/** Arquiva o documento do lançamento sem tocar no agregado. */
export async function arquivarDocumentoDaTransacao(
  contaId: string,
  transacaoId: string,
): Promise<void> {
  await updateDoc(doc(colTransacoes(contaId), transacaoId), {
    arquivado: true,
    atualizadoEm: agora(),
  });
}

export async function criarTransacao(
  contaId: string,
  dados: DadosTransacao,
  formas: FormaPagamento[],
  contextoMeta: ContextoMeta | null,
): Promise<string> {
  const { id, corpo } = await gravarTransacao(contaId, dados, formas);

  await aplicarNoAgregado(
    contaId,
    corpo.competencia,
    deltaDaTransacao(transacaoAgregavel(corpo), 1),
    contextoMeta,
  );

  return id;
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
  contextoMeta: ContextoMeta | null,
): Promise<void> {
  const corpo = corpoDaTransacao(dados, formas);

  await updateDoc(doc(colTransacoes(contaId), anterior.id), {
    ...corpo,
    // Chave ausente em `updateDoc` deixa o valor velho no lugar: trocar de
    // entrada para saída precisa apagar a forma de pagamento, não escondê-la.
    formaPagamentoId: corpo.formaPagamentoId ?? deleteField(),
    observacoes: corpo.observacoes ?? deleteField(),
    pedidoId: corpo.pedidoId ?? deleteField(),
    atualizadoEm: agora(),
  });

  const reverso = deltaDaTransacao(transacaoAgregavel(anterior), -1);
  const aplicado = deltaDaTransacao(transacaoAgregavel(corpo), 1);

  if (anterior.competencia === corpo.competencia) {
    // Mesmo mês, uma escrita só: menos chance de aplicar metade da correção.
    await aplicarNoAgregado(
      contaId,
      corpo.competencia,
      somarParcelas(reverso, aplicado),
      contextoMeta,
    );
    return;
  }

  await aplicarNoAgregado(contaId, anterior.competencia, reverso, contextoMeta);
  await aplicarNoAgregado(contaId, corpo.competencia, aplicado, contextoMeta);
}

/**
 * Arquiva em vez de apagar, como todo o resto do sistema: o lançamento pode
 * estar amarrado a um pedido, e o histórico do caixa precisa continuar
 * auditável. O agregado perde a contribuição; o documento fica.
 */
export async function arquivarTransacao(
  contaId: string,
  transacao: Transacao,
  contextoMeta: ContextoMeta | null,
): Promise<void> {
  await arquivarDocumentoDaTransacao(contaId, transacao.id);

  await aplicarNoAgregado(
    contaId,
    transacao.competencia,
    deltaDaTransacao(transacaoAgregavel(transacao), -1),
    contextoMeta,
  );
}
