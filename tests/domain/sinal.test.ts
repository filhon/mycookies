import { describe, expect, it } from "vitest";
import {
  agregarMes,
  deltaDaTransacao,
  deltaDoPedido,
  PARCELAS_ZERADAS,
  somarParcelas,
  type PedidoAgregavel,
  type TransacaoAgregavel,
} from "@/lib/domain/caixa";
import {
  aReceber,
  derivarPedido,
  erroDoSinal,
  erroDoTotalComSinal,
  faltaPagar,
  quitacao,
  sinalSugerido,
  taxaDoPedido,
} from "@/lib/domain/pedido";
import type { FormaPagamento } from "@/lib/types";

// Spec 081, `DECISOES.md#d279`.

const CREDITO: FormaPagamento = {
  id: "credito",
  nome: "Cartão de crédito",
  tipo: "CREDITO",
  taxaPercentual: 4.99,
  taxaFixa: 50,
  prazoRecebimentoDias: 30,
  ativo: true,
};

// Sinal de R$ 50,00 no crédito: 249,5 → 250 de percentual, mais a fixa.
const SINAL = { valor: 5000, custoTaxa: 300 };

describe("o sinal no pedido", () => {
  it("nasce com metade do total, arredondada ao real", () => {
    expect(sinalSugerido(10000)).toBe(5000);
    expect(sinalSugerido(6990)).toBe(3500);
    expect(sinalSugerido(0)).toBe(0);
  });

  it("não aceita zero nem o pedido todo", () => {
    expect(erroDoSinal(0, 10000)).not.toBeNull();
    expect(erroDoSinal(10000, 10000)).not.toBeNull();
    expect(erroDoSinal(5000, 10000)).toBeNull();
  });

  it("o total não desce abaixo do sinal, e igual ainda salva", () => {
    expect(erroDoTotalComSinal(4000, SINAL)).toMatch(
      /^O sinal \(R\$\s50,00\) é maior que o pedido\. Desfaça o sinal ou ajuste os itens\.$/,
    );
    expect(erroDoTotalComSinal(5000, SINAL)).toBeNull();
    expect(erroDoTotalComSinal(100, undefined)).toBeNull();
  });

  it("a taxa fixa sai uma vez por pagamento", () => {
    expect(taxaDoPedido(10000, CREDITO)).toBe(549);
    expect(taxaDoPedido(10000, CREDITO, SINAL)).toBe(600);
    // Sem forma, o sinal já cobrado continua contando.
    expect(taxaDoPedido(10000, null, SINAL)).toBe(300);
  });

  it("derivarPedido leva a taxa dos dois pagamentos ao lucro", () => {
    const derivado = derivarPedido({
      itens: [
        { quantidade: 10, precoUnitario: 1000, custoUnitarioSnapshot: 400 },
      ],
      desconto: 0,
      taxaEntrega: 0,
      forma: CREDITO,
      sinal: SINAL,
    });
    expect(derivado.custoTaxaPagamento).toBe(600);
    expect(derivado.lucroEstimado).toBe(10000 - 4000 - 600);
  });

  it("a quitação recebe o resto, com a taxa do resto", () => {
    expect(
      quitacao({ total: 10000, custoTaxaPagamento: 600, sinal: SINAL }),
    ).toEqual({ valor: 5000, custoTaxa: 300 });
    expect(quitacao({ total: 10000, custoTaxaPagamento: 549 })).toEqual({
      valor: 10000,
      custoTaxa: 549,
    });
  });

  it("falta pagar desconta o sinal; quitado, nada", () => {
    expect(faltaPagar({ pago: false, total: 10000, sinal: SINAL })).toBe(5000);
    expect(faltaPagar({ pago: false, total: 10000 })).toBe(10000);
    expect(faltaPagar({ pago: true, total: 10000, sinal: SINAL })).toBe(0);
  });

  it("a receber conta só o que falta", () => {
    expect(
      aReceber([
        { status: "CONFIRMADO", pago: false, total: 10000, sinal: SINAL },
        { status: "ENTREGUE", pago: false, total: 8000, sinal: SINAL },
        { status: "ENTREGUE", pago: false, total: 2000 },
      ]),
    ).toEqual({
      total: 5000 + 3000 + 2000,
      quantidade: 3,
      entregues: 2,
      totalEntregue: 3000 + 2000,
    });
  });
});

describe("roteiro de dados: sinal em setembro, quitação em outubro", () => {
  const pedido = {
    total: 10000,
    custoTotalEstimado: 4000,
    custoTaxaPagamento: taxaDoPedido(10000, CREDITO, SINAL),
    sinal: SINAL,
  };

  const lancamentoDoSinal: TransacaoAgregavel = {
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor: SINAL.valor,
    custoTaxa: SINAL.custoTaxa,
    dataISO: "2026-09-28",
  };
  const lancamentoDaQuitacao: TransacaoAgregavel = {
    tipo: "ENTRADA",
    categoria: "VENDA",
    ...quitacao(pedido),
    dataISO: "2026-10-02",
  };
  const pedidoPago: PedidoAgregavel = {
    pagoEmISO: "2026-10-02",
    total: pedido.total,
    custoTotalEstimado: pedido.custoTotalEstimado,
    itens: [
      {
        fichaTecnicaId: "cookie",
        nomeSnapshot: "Cookie",
        quantidade: 10,
        subtotal: 10000,
        custo: 4000,
      },
    ],
  };

  // O que `registrarSinal` e `marcarPedidoPago` somam, delta a delta.
  const setembroPorDelta = somarParcelas(
    PARCELAS_ZERADAS,
    deltaDaTransacao(lancamentoDoSinal, 1),
  );
  const outubroPorDelta = somarParcelas(
    somarParcelas(PARCELAS_ZERADAS, deltaDaTransacao(lancamentoDaQuitacao, 1)),
    deltaDoPedido(pedidoPago, 1),
  );

  // O que "Recalcular o mês" lê: os lançamentos do mês e os pedidos quitados nele.
  const setembroRecalculado = agregarMes([lancamentoDoSinal], []);
  const outubroRecalculado = agregarMes([lancamentoDaQuitacao], [pedidoPago]);

  it("recalcular os dois meses dá o mesmo agregado dos deltas", () => {
    expect(setembroPorDelta).toEqual(setembroRecalculado);
    expect(outubroPorDelta).toEqual(outubroRecalculado);
  });

  it("o caixa de cada mês tem a metade, e o pedido conta uma vez, na quitação", () => {
    expect(setembroRecalculado.entradas).toBe(5000);
    expect(setembroRecalculado.custoTaxasPagamento).toBe(300);
    expect(setembroRecalculado.qtdPedidos).toBe(0);
    expect(setembroRecalculado.receitaPedidos).toBe(0);

    expect(outubroRecalculado.entradas).toBe(5000);
    expect(outubroRecalculado.custoTaxasPagamento).toBe(300);
    expect(outubroRecalculado.qtdPedidos).toBe(1);
    expect(outubroRecalculado.receitaPedidos).toBe(10000);
    expect(outubroRecalculado.custoDoVendido).toBe(4000);
  });

  it("desfazer o pagamento tira só a quitação; o sinal fica em setembro", () => {
    const outubroDesfeito = somarParcelas(
      outubroPorDelta,
      somarParcelas(
        deltaDaTransacao(lancamentoDaQuitacao, -1),
        deltaDoPedido(pedidoPago, -1),
      ),
    );
    expect(outubroDesfeito.entradas).toBe(0);
    expect(outubroDesfeito.qtdPedidos).toBe(0);
    expect(setembroPorDelta.entradas).toBe(5000);
  });
});
