import {
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type FieldValue,
} from "firebase/firestore";
import { colPedidos, colTransacoes, docResumoMensal } from "../colecoes";
import {
  agregarMes,
  ticketMedioDe,
  type ParcelasDoAgregado,
  type PedidoAgregavel,
  type TransacaoAgregavel,
} from "@/lib/domain/caixa";
import { dataISODe } from "@/lib/domain/datas";
import { espelhoDaMeta, medirMeta } from "@/lib/domain/metas";
import { custoDoItem } from "@/lib/domain/pedido";
import { espelhoAposDelta, type ContextoMeta } from "./metas";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  Meta,
  Pedido,
  Transacao,
} from "@/lib/types";

/**
 * O único lugar que escreve `agregados/{'YYYY-MM'}`.
 *
 * O documento tem dois escritores — a transação e o pedido pago —, e é aqui que
 * eles se encontram. Ficar em um módulo próprio, e não dentro de
 * `transacoes.ts`, é o que impede o segundo escritor de reimplementar a escrita
 * um pouco diferente do primeiro (`DECISOES.md#d23` e `#d36`).
 */

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
 * Os pedidos pagos de um mês, pela competência do **pagamento**.
 *
 * É a consulta que "Recalcular o mês" precisa para refazer a metade do pedido.
 * Sem `competenciaPagamento` gravado, ela não existiria: seria preciso varrer as
 * transações do mês, colher os `pedidoId` e ler um documento por pedido.
 *
 * Pedido não pago não tem o campo, e documento sem o campo não entra no índice:
 * o filtro de "está pago" sai de graça.
 */
export function consultaPedidosPagosDoMes(
  contaId: string,
  competencia: CompetenciaMensal,
) {
  return query(
    colPedidos(contaId),
    where("arquivado", "==", false),
    where("competenciaPagamento", "==", competencia),
    orderBy("pagoEm", "desc"),
  );
}

/** Só o que o agregado consome de um lançamento. */
export function transacaoAgregavel(
  transacao: TransacaoAgregavel,
): TransacaoAgregavel {
  return {
    tipo: transacao.tipo,
    categoria: transacao.categoria,
    valor: transacao.valor,
    dataISO: transacao.dataISO,
    custoTaxa: transacao.custoTaxa ?? 0,
  };
}

/** O mínimo de um pedido que vira contribuição no agregado. */
export type PedidoNoCaixa = Pick<
  Pedido,
  "total" | "custoTotalEstimado" | "itens"
>;

/**
 * Só o que o agregado consome de um pedido pago.
 *
 * `pagoEmISO` vem de fora e não é deduzido do documento porque quem paga já
 * sabe o dia, e quem recalcula lê `pagoEm`: os dois caminhos precisam entregar
 * exatamente a mesma data, e derivá-la em dois lugares seria dois lugares para
 * o dia divergir.
 *
 * `subtotal` vem gravado na linha — é o que a cliente viu — e o custo é
 * recalculado do snapshot pela mesma função do editor, para que o lucro por
 * produto e o custo do mês não possam divergir do que o pedido mostrou.
 */
export function pedidoAgregavel(
  pedido: PedidoNoCaixa,
  pagoEmISO: DataISO,
): PedidoAgregavel {
  return {
    pagoEmISO,
    total: pedido.total,
    custoTotalEstimado: pedido.custoTotalEstimado,
    itens: pedido.itens.map((item) => ({
      fichaTecnicaId: item.fichaTecnicaId,
      nomeSnapshot: item.nomeSnapshot,
      quantidade: item.quantidade,
      subtotal: item.subtotal,
      custo: custoDoItem(item),
    })),
  };
}

/**
 * O dia do pagamento de um pedido já gravado.
 *
 * O documento só chega aqui pela consulta de pedidos pagos, que exige `pagoEm`.
 * A guarda existe para que um documento escrito pela metade não leve o mês
 * inteiro junto com um `NaN`.
 */
export function diaDoPagamento(pedido: Pedido): DataISO {
  return pedido.pagoEm
    ? dataISODe(pedido.pagoEm.toDate())
    : pedido.dataEntregaISO;
}

type MapaDeIncrementos = Record<string, Record<string, FieldValue | string>>;

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

  const porDia: MapaDeIncrementos = {};
  for (const [dia, linha] of Object.entries(parcelas.porDia)) {
    porDia[dia] = {
      entradas: increment(linha.entradas),
      saidas: increment(linha.saidas),
      pedidos: increment(linha.pedidos),
    };
  }

  // `nome` vai por valor e os três números por incremento. O produto revertido
  // sobra zerado no documento, porque `increment` não apaga chave: quem o tira
  // do ranking é `produtosOrdenados`, e quem o tira do documento é "Recalcular
  // o mês".
  const produtos: MapaDeIncrementos = {};
  for (const [fichaId, linha] of Object.entries(parcelas.produtos)) {
    produtos[fichaId] = {
      nome: linha.nome,
      quantidade: increment(linha.quantidade),
      receita: increment(linha.receita),
      lucro: increment(linha.lucro),
    };
  }

  return {
    v: VERSAO_SCHEMA,
    entradas: increment(parcelas.entradas),
    saidas: increment(parcelas.saidas),
    custoTaxasPagamento: increment(parcelas.custoTaxasPagamento),
    lucro: increment(parcelas.lucro),
    qtdPedidos: increment(parcelas.qtdPedidos),
    qtdItensVendidos: increment(parcelas.qtdItensVendidos),
    receitaPedidos: increment(parcelas.receitaPedidos),
    custoDoVendido: increment(parcelas.custoDoVendido),
    porCategoriaSaida,
    porDia,
    produtos,
    atualizadoEm: agora(),
  };
}

/**
 * Soma um delta no agregado do mês, e move junto o que não é incremento.
 *
 * `increment` entra na fila offline, que é a razão de ele existir aqui em vez
 * de uma transação: transação exige rede, e offline é o estado normal desta
 * usuária (`DECISOES.md#d09` e `#d10`).
 *
 * Duas coisas não podem ser incremento e por isso são escritas por valor: o
 * espelho da meta, porque `progresso` e `unidadesRestantes` não são lineares no
 * realizado, e `ticketMedio`, porque razão não se incrementa. As duas saem do
 * que a tela já sabe — e por isso o contexto vem de fora, sem custar uma
 * leitura no caminho de gravar.
 */
export async function aplicarNoAgregado(
  contaId: string,
  competencia: CompetenciaMensal,
  parcelas: ParcelasDoAgregado,
  contexto: ContextoMeta | null,
  /** Só o caminho do pedido move a razão; a transação não a toca. */
  ticketMedio: Centavos | null = null,
): Promise<void> {
  const meta = espelhoAposDelta(competencia, parcelas.entradas, contexto);

  await setDoc(
    docResumoMensal(contaId, competencia),
    {
      ...incrementosDoAgregado(parcelas),
      competencia,
      // Chave ausente em `merge` deixa o que está lá: mês sem meta não ganha um
      // espelho pela metade só porque houve uma venda, e um lançamento avulso
      // não reescreve um ticket médio que ele não mudou.
      ...(meta ? { meta } : {}),
      ...(ticketMedio === null ? {} : { ticketMedio }),
    },
    { merge: true },
  );
}

/**
 * A rede de segurança: reescreve o mês inteiro a partir dos documentos.
 *
 * Não é o caminho normal — é o que prova que os deltas estão certos, e o que
 * conserta o mês se algum se perder. Duas consultas, uma escrita, e **nenhuma
 * leitura do agregado antes**: ela só existia para preservar `porDia[].pedidos`,
 * que este módulo passou a calcular (`DECISOES.md#d23`, segunda consequência).
 *
 * `mergeFields` substitui exatamente os campos listados, e agora a lista é o
 * documento inteiro menos o que não é agregado.
 */
export async function recalcularMes(
  contaId: string,
  competencia: CompetenciaMensal,
  meta: Meta | null,
): Promise<ParcelasDoAgregado> {
  const [lancamentos, pedidos] = await Promise.all([
    getDocs(consultaTransacoesDoMes(contaId, competencia)),
    getDocs(consultaPedidosPagosDoMes(contaId, competencia)),
  ]);

  const parcelas = agregarMes(
    lancamentos.docs.map((documento) =>
      transacaoAgregavel(documento.data() as Transacao),
    ),
    pedidos.docs.map((documento) => {
      const pedido = documento.data();
      return pedidoAgregavel(pedido, diaDoPagamento(pedido));
    }),
  );

  const espelho = meta
    ? espelhoDaMeta(
        medirMeta(
          {
            competencia,
            faturamentoAlvo: meta.faturamentoAlvo,
            precoMedioUnitario: meta.ticketMedioReferencia,
          },
          parcelas.entradas,
        ),
      )
    : null;

  await setDoc(
    docResumoMensal(contaId, competencia),
    {
      v: VERSAO_SCHEMA,
      competencia,
      entradas: parcelas.entradas,
      saidas: parcelas.saidas,
      custoTaxasPagamento: parcelas.custoTaxasPagamento,
      lucro: parcelas.lucro,
      qtdPedidos: parcelas.qtdPedidos,
      qtdItensVendidos: parcelas.qtdItensVendidos,
      receitaPedidos: parcelas.receitaPedidos,
      custoDoVendido: parcelas.custoDoVendido,
      ticketMedio: ticketMedioDe(parcelas.receitaPedidos, parcelas.qtdPedidos),
      porCategoriaSaida: parcelas.porCategoriaSaida,
      porDia: parcelas.porDia,
      produtos: parcelas.produtos,
      ...(espelho ? { meta: espelho } : {}),
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
        "qtdPedidos",
        "qtdItensVendidos",
        "receitaPedidos",
        "custoDoVendido",
        "ticketMedio",
        "porCategoriaSaida",
        "porDia",
        "produtos",
        // Mês sem meta não lista o campo: `mergeFields` com uma chave ausente
        // do objeto apaga o campo no documento, e apagar espelho de meta que
        // esta chamada não conhece seria estragar o que veio consertar.
        ...(espelho ? ["meta"] : []),
        "atualizadoEm",
      ],
    },
  );

  return parcelas;
}
