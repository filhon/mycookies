import { describe, expect, it } from "vitest";
import {
  agregarMes,
  agregarPedidos,
  agregarTransacoes,
  deltaDaTransacao,
  deltaDoPedido,
  PARCELAS_ZERADAS,
  parcelasDoResumo,
  produtosOrdenados,
  saidasOrdenadas,
  somarParcelas,
  taxaDaEntrada,
  ticketMedioDe,
  type ParcelasDoAgregado,
  type PedidoAgregavel,
  type TransacaoAgregavel,
} from "@/lib/domain/caixa";
import { competenciaDeISO } from "@/lib/domain/datas";
import type { FormaPagamento } from "@/lib/types";

function forma(
  id: string,
  taxaPercentual: number,
  taxaFixa = 0,
): FormaPagamento {
  return {
    id,
    nome: id,
    tipo: "PIX",
    taxaPercentual,
    taxaFixa,
    prazoRecebimentoDias: 0,
    ativo: true,
  };
}

const FORMAS: FormaPagamento[] = [
  forma("credito", 4.99),
  forma("debito", 1.99),
  forma("pix", 0),
];

/** Monta o lançamento já com a taxa congelada, como a mutação faz na escrita. */
function lancamento(
  parcial: Omit<TransacaoAgregavel, "custoTaxa"> & {
    formaPagamentoId?: string;
  },
): TransacaoAgregavel {
  return {
    tipo: parcial.tipo,
    categoria: parcial.categoria,
    valor: parcial.valor,
    dataISO: parcial.dataISO,
    custoTaxa: taxaDaEntrada(parcial, FORMAS),
  };
}

// ---------------------------------------------------------------------------
// O caso de aceite da spec 004, número por número.
// ---------------------------------------------------------------------------

const VENDA_CREDITO = lancamento({
  tipo: "ENTRADA",
  categoria: "VENDA",
  valor: 12000,
  dataISO: "2026-09-03",
  formaPagamentoId: "credito",
});

const VENDA_PIX = lancamento({
  tipo: "ENTRADA",
  categoria: "VENDA",
  valor: 8000,
  dataISO: "2026-09-03",
  formaPagamentoId: "pix",
});

const COMPRA_ATACADO = lancamento({
  tipo: "SAIDA",
  categoria: "COMPRA_INSUMO",
  valor: 9000,
  dataISO: "2026-09-05",
});

const INTERNET = lancamento({
  tipo: "SAIDA",
  categoria: "DESPESA_FIXA",
  valor: 3000,
  dataISO: "2026-09-10",
});

const VENDA_DEBITO = lancamento({
  tipo: "ENTRADA",
  categoria: "VENDA",
  valor: 4500,
  dataISO: "2026-09-12",
  formaPagamentoId: "debito",
});

const SETEMBRO: TransacaoAgregavel[] = [
  VENDA_CREDITO,
  VENDA_PIX,
  COMPRA_ATACADO,
  INTERNET,
  VENDA_DEBITO,
];

/** Aplica uma sequência de lançamentos delta a delta, como a mutação faz. */
function porDeltas(
  transacoes: TransacaoAgregavel[],
  base: ParcelasDoAgregado = PARCELAS_ZERADAS,
): ParcelasDoAgregado {
  return transacoes.reduce(
    (acumulado, transacao) =>
      somarParcelas(acumulado, deltaDaTransacao(transacao, 1)),
    base,
  );
}

describe("taxaDaEntrada", () => {
  it("cobra a taxa da forma escolhida", () => {
    // round(12000 × 4,99%) = 599 · round(4500 × 1,99%) = 90.
    expect(VENDA_CREDITO.custoTaxa).toBe(599);
    expect(VENDA_DEBITO.custoTaxa).toBe(90);
  });

  it("não cobra nada onde não há taxa", () => {
    expect(VENDA_PIX.custoTaxa).toBe(0);
  });

  it("ignora a saída, mesmo que aponte para uma forma de pagamento", () => {
    // Saída não passa pela maquininha: contá-la aqui seria somar a taxa de uma
    // venda que não aconteceu.
    expect(
      taxaDaEntrada(
        { tipo: "SAIDA", valor: 9000, formaPagamentoId: "credito" },
        FORMAS,
      ),
    ).toBe(0);
  });

  it("devolve zero quando a entrada não tem forma, ou a forma sumiu", () => {
    expect(taxaDaEntrada({ tipo: "ENTRADA", valor: 12000 }, FORMAS)).toBe(0);
    expect(
      taxaDaEntrada(
        { tipo: "ENTRADA", valor: 12000, formaPagamentoId: "apagada" },
        FORMAS,
      ),
    ).toBe(0);
  });
});

describe("agregarTransacoes · caso de aceite de 2026-09", () => {
  const mes = agregarTransacoes(SETEMBRO);

  it("soma entradas, saídas e o que a maquininha comeu", () => {
    expect(mes.entradas).toBe(24500);
    expect(mes.saidas).toBe(12000);
    expect(mes.custoTaxasPagamento).toBe(689);
  });

  it("desconta a taxa do lucro, e não só as saídas", () => {
    expect(mes.lucro).toBe(11811);
  });

  it("junta o movimento do mesmo dia", () => {
    expect(mes.porDia["03"]).toEqual({
      entradas: 20000,
      saidas: 0,
      pedidos: 0,
    });
    expect(mes.porDia["05"]).toEqual({ entradas: 0, saidas: 9000, pedidos: 0 });
    expect(mes.porDia["12"]).toEqual({
      entradas: 4500,
      saidas: 0,
      pedidos: 0,
    });
  });

  it("quebra as saídas por categoria", () => {
    expect(mes.porCategoriaSaida).toEqual({
      COMPRA_INSUMO: 9000,
      DESPESA_FIXA: 3000,
    });
  });

  it("não inventa dia sem movimento", () => {
    expect(Object.keys(mes.porDia).sort()).toEqual(["03", "05", "10", "12"]);
  });

  it("deixa em zero tudo que é alimentado por pedido", () => {
    // Enquanto o Módulo 3 não existe, `pedidos` é ausência e não resultado.
    for (const dia of Object.values(mes.porDia)) {
      expect(dia.pedidos).toBe(0);
    }
  });
});

describe("delta e reconstrução concordam", () => {
  it("aplicar os deltas em sequência dá o mesmo que somar do zero", () => {
    expect(porDeltas(SETEMBRO)).toEqual(agregarTransacoes(SETEMBRO));
  });

  it("concorda em qualquer ordem de lançamento", () => {
    const invertida = [...SETEMBRO].reverse();
    expect(porDeltas(invertida)).toEqual(agregarTransacoes(SETEMBRO));
  });

  it("aplicar e reverter o mesmo lançamento não deixa rastro", () => {
    const aplicado = somarParcelas(
      PARCELAS_ZERADAS,
      deltaDaTransacao(VENDA_CREDITO, 1),
    );
    const revertido = somarParcelas(
      aplicado,
      deltaDaTransacao(VENDA_CREDITO, -1),
    );

    expect(revertido).toEqual(PARCELAS_ZERADAS);
  });
});

describe("editar é reverter mais aplicar", () => {
  // A venda 1 estava errada e vira R$ 150,00, mesmo dia e mesma forma.
  const CORRIGIDA = lancamento({
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor: 15000,
    dataISO: "2026-09-03",
    formaPagamentoId: "credito",
  });

  const depois = somarParcelas(
    somarParcelas(
      agregarTransacoes(SETEMBRO),
      deltaDaTransacao(VENDA_CREDITO, -1),
    ),
    deltaDaTransacao(CORRIGIDA, 1),
  );

  it("recalcula a taxa junto com o valor", () => {
    // round(15000 × 4,99%) = 749.
    expect(CORRIGIDA.custoTaxa).toBe(749);
    expect(depois.custoTaxasPagamento).toBe(839);
  });

  it("corrige entradas e lucro", () => {
    expect(depois.entradas).toBe(27500);
    expect(depois.lucro).toBe(14661);
  });

  it("chega no mesmo lugar que reconstruir o mês", () => {
    const reconstruido = agregarTransacoes([
      CORRIGIDA,
      VENDA_PIX,
      COMPRA_ATACADO,
      INTERNET,
      VENDA_DEBITO,
    ]);

    expect(depois).toEqual(reconstruido);
  });

  it("move a saída de categoria sem deixar a antiga para trás", () => {
    const reclassificada = lancamento({
      tipo: "SAIDA",
      categoria: "EMBALAGEM",
      valor: 9000,
      dataISO: "2026-09-05",
    });

    const resultado = somarParcelas(
      somarParcelas(
        agregarTransacoes(SETEMBRO),
        deltaDaTransacao(COMPRA_ATACADO, -1),
      ),
      deltaDaTransacao(reclassificada, 1),
    );

    expect(resultado.porCategoriaSaida).toEqual({
      EMBALAGEM: 9000,
      DESPESA_FIXA: 3000,
    });
    expect(resultado.saidas).toBe(12000);
  });

  it("move a saída de dia sem deixar o dia antigo com movimento", () => {
    const outroDia = lancamento({
      tipo: "SAIDA",
      categoria: "COMPRA_INSUMO",
      valor: 9000,
      dataISO: "2026-09-07",
    });

    const resultado = somarParcelas(
      somarParcelas(
        agregarTransacoes(SETEMBRO),
        deltaDaTransacao(COMPRA_ATACADO, -1),
      ),
      deltaDaTransacao(outroDia, 1),
    );

    expect(resultado.porDia["05"]).toBeUndefined();
    expect(resultado.porDia["07"]).toEqual({
      entradas: 0,
      saidas: 9000,
      pedidos: 0,
    });
  });
});

describe("arquivar reverte a contribuição", () => {
  const depois = somarParcelas(
    somarParcelas(
      agregarTransacoes(SETEMBRO),
      deltaDaTransacao(VENDA_CREDITO, -1),
    ),
    deltaDaTransacao(
      lancamento({
        tipo: "ENTRADA",
        categoria: "VENDA",
        valor: 15000,
        dataISO: "2026-09-03",
        formaPagamentoId: "credito",
      }),
      1,
    ),
  );

  // A internet é arquivada depois da correção da venda 1.
  const arquivado = somarParcelas(depois, deltaDaTransacao(INTERNET, -1));

  it("tira a saída do total e da categoria", () => {
    expect(arquivado.saidas).toBe(9000);
    expect(arquivado.porCategoriaSaida.DESPESA_FIXA ?? 0).toBe(0);
  });

  it("refaz o lucro sem o lançamento arquivado", () => {
    expect(arquivado.lucro).toBe(17661);
  });

  it("some com o dia que ficou sem movimento nenhum", () => {
    expect(arquivado.porDia["10"]).toBeUndefined();
  });
});

describe("trocar de mês move a contribuição inteira", () => {
  // A venda 5 muda de 12/09 para 02/10: sai de 2026-09 e entra em 2026-10.
  const MUDADA = lancamento({
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor: 4500,
    dataISO: "2026-10-02",
    formaPagamentoId: "debito",
  });

  const setembro = somarParcelas(
    agregarTransacoes(SETEMBRO),
    deltaDaTransacao(VENDA_DEBITO, -1),
  );
  const outubro = somarParcelas(PARCELAS_ZERADAS, deltaDaTransacao(MUDADA, 1));

  it("são dois documentos, e a competência diz quais", () => {
    expect(competenciaDeISO(VENDA_DEBITO.dataISO)).toBe("2026-09");
    expect(competenciaDeISO(MUDADA.dataISO)).toBe("2026-10");
  });

  it("setembro perde o valor e a taxa junto", () => {
    expect(setembro.entradas).toBe(20000);
    expect(setembro.custoTaxasPagamento).toBe(599);
    expect(setembro.porDia["12"]).toBeUndefined();
  });

  it("outubro recebe o valor e a taxa junto", () => {
    expect(outubro.entradas).toBe(4500);
    expect(outubro.custoTaxasPagamento).toBe(90);
    expect(outubro.lucro).toBe(4410);
    expect(outubro.porDia["02"]).toEqual({
      entradas: 4500,
      saidas: 0,
      pedidos: 0,
    });
  });

  it("cada mês continua igual à sua própria reconstrução", () => {
    expect(setembro).toEqual(
      agregarTransacoes([VENDA_CREDITO, VENDA_PIX, COMPRA_ATACADO, INTERNET]),
    );
    expect(outubro).toEqual(agregarTransacoes([MUDADA]));
  });
});

describe("mês vazio", () => {
  it("não é o mesmo que mês zerado", () => {
    // `parcelasDoResumo` devolve zeros para a tela desenhar, mas quem chama
    // sabe que o documento não existe e mostra o convite, não um painel de
    // R$ 0,00 com cara de resultado.
    expect(parcelasDoResumo(null)).toEqual(PARCELAS_ZERADAS);
    expect(agregarTransacoes([])).toEqual(PARCELAS_ZERADAS);
  });

  it("completa um documento que veio pela metade", () => {
    expect(parcelasDoResumo({ entradas: 500 })).toEqual({
      ...PARCELAS_ZERADAS,
      entradas: 500,
    });
  });
});

describe("saidasOrdenadas", () => {
  it("põe o maior gasto primeiro e descarta o que zerou", () => {
    expect(
      saidasOrdenadas({
        DESPESA_FIXA: 3000,
        COMPRA_INSUMO: 9000,
        EMBALAGEM: 0,
      }),
    ).toEqual([
      { categoria: "COMPRA_INSUMO", valor: 9000 },
      { categoria: "DESPESA_FIXA", valor: 3000 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Sessão 3B · a segunda metade do agregado: o pedido pago.
//
// Nada abaixo desta linha altera o que está acima. O bloco da 4A é a rede que
// prova que a metade da transação não se mexeu quando a do pedido nasceu.
// ---------------------------------------------------------------------------

const COOKIE = {
  fichaTecnicaId: "cookie",
  nomeSnapshot: "Cookie tradicional",
  quantidade: 20,
  subtotal: 13800,
  custo: 8820,
};

const CAIXA_COM_6 = {
  fichaTecnicaId: "caixa6",
  nomeSnapshot: "Caixa com 6",
  quantidade: 2,
  subtotal: 9980,
  custo: 6400,
};

/** O pedido do caso de aceite da 3A, pago no dia 15/09 no crédito. */
const PEDIDO_DA_ANA: PedidoAgregavel = {
  pagoEmISO: "2026-09-15",
  total: 24000,
  custoTotalEstimado: 15220,
  itens: [COOKIE, CAIXA_COM_6],
};

/** O lançamento que o pagamento cria, com a taxa congelada do pedido. */
const VENDA_DO_PEDIDO: TransacaoAgregavel = {
  tipo: "ENTRADA",
  categoria: "VENDA",
  valor: 24000,
  dataISO: "2026-09-15",
  custoTaxa: 1198,
};

/** Marcar como pago é aplicar os dois deltas somados, em uma escrita só. */
function pagar(
  base: ParcelasDoAgregado,
  pedido: PedidoAgregavel,
  venda: TransacaoAgregavel,
  sinal: 1 | -1 = 1,
): ParcelasDoAgregado {
  return somarParcelas(
    base,
    somarParcelas(deltaDaTransacao(venda, sinal), deltaDoPedido(pedido, sinal)),
  );
}

describe("deltaDoPedido · caso de aceite de 2026-09", () => {
  const antes = agregarTransacoes(SETEMBRO);
  const depois = pagar(antes, PEDIDO_DA_ANA, VENDA_DO_PEDIDO);

  it("parte do mês que a spec 004 deixou", () => {
    expect(antes.entradas).toBe(24500);
    expect(antes.saidas).toBe(12000);
    expect(antes.custoTaxasPagamento).toBe(689);
    expect(antes.lucro).toBe(11811);
  });

  it("soma o dinheiro pela transação, com a taxa junto", () => {
    expect(depois.entradas).toBe(48500);
    expect(depois.custoTaxasPagamento).toBe(1887);
    expect(depois.lucro).toBe(34613);
  });

  it("soma o pedido, os itens e o custo do que foi vendido", () => {
    expect(depois.qtdPedidos).toBe(1);
    expect(depois.qtdItensVendidos).toBe(22);
    expect(depois.receitaPedidos).toBe(24000);
    expect(depois.custoDoVendido).toBe(15220);
  });

  it("conta o pedido no dia do pagamento, junto do dinheiro dele", () => {
    expect(depois.porDia["15"]).toEqual({
      entradas: 24000,
      saidas: 0,
      pedidos: 1,
    });
  });

  it("monta o ranking de produtos sem ratear desconto, entrega nem maquininha", () => {
    expect(depois.produtos).toEqual({
      cookie: {
        nome: "Cookie tradicional",
        quantidade: 20,
        receita: 13800,
        lucro: 4980,
      },
      caixa6: {
        nome: "Caixa com 6",
        quantidade: 2,
        receita: 9980,
        lucro: 3580,
      },
    });
  });

  it("põe o que mais faturou primeiro", () => {
    expect(
      produtosOrdenados(depois.produtos).map((linha) => linha.fichaId),
    ).toEqual(["cookie", "caixa6"]);
  });

  it("refaz o ticket médio na leitura, e não o incrementa", () => {
    expect(ticketMedioDe(depois.receitaPedidos, depois.qtdPedidos)).toBe(24000);
    // Mês sem pedido pago não tem ticket médio: zero é ausência, e é o que
    // impede a divisão por zero de virar Infinity no painel.
    expect(ticketMedioDe(0, 0)).toBe(0);
  });

  it("não mexe no que é da transação", () => {
    const so = deltaDoPedido(PEDIDO_DA_ANA, 1);
    expect(so.entradas).toBe(0);
    expect(so.saidas).toBe(0);
    expect(so.lucro).toBe(0);
    expect(so.custoTaxasPagamento).toBe(0);
    expect(so.porCategoriaSaida).toEqual({});
  });
});

describe("delta do pedido e reconstrução concordam", () => {
  const SEGUNDO_PEDIDO: PedidoAgregavel = {
    pagoEmISO: "2026-09-20",
    total: 6900,
    custoTotalEstimado: 4410,
    itens: [{ ...COOKIE, quantidade: 10, subtotal: 6900, custo: 4410 }],
  };

  const VENDA_DO_SEGUNDO: TransacaoAgregavel = {
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor: 6900,
    dataISO: "2026-09-20",
    custoTaxa: 0,
  };

  it("aplicar os deltas em sequência dá o mesmo que somar do zero", () => {
    const porDeltas = [PEDIDO_DA_ANA, SEGUNDO_PEDIDO].reduce(
      (acumulado, pedido) => somarParcelas(acumulado, deltaDoPedido(pedido, 1)),
      PARCELAS_ZERADAS,
    );

    expect(porDeltas).toEqual(agregarPedidos([PEDIDO_DA_ANA, SEGUNDO_PEDIDO]));
  });

  it("junta duas vendas da mesma ficha em uma linha do ranking", () => {
    const dois = agregarPedidos([PEDIDO_DA_ANA, SEGUNDO_PEDIDO]);

    expect(dois.produtos.cookie).toEqual({
      nome: "Cookie tradicional",
      quantidade: 30,
      receita: 20700,
      // 4980 do primeiro pedido, 2490 do segundo.
      lucro: 7470,
    });
    expect(dois.qtdPedidos).toBe(2);
    expect(dois.qtdItensVendidos).toBe(32);
  });

  it("o mês inteiro por deltas bate com o mês inteiro pelas duas metades", () => {
    const porDelta = pagar(
      pagar(agregarTransacoes(SETEMBRO), PEDIDO_DA_ANA, VENDA_DO_PEDIDO),
      SEGUNDO_PEDIDO,
      VENDA_DO_SEGUNDO,
    );

    const reconstruido = agregarMes(
      [...SETEMBRO, VENDA_DO_PEDIDO, VENDA_DO_SEGUNDO],
      [PEDIDO_DA_ANA, SEGUNDO_PEDIDO],
    );

    expect(porDelta).toEqual(reconstruido);
  });

  it("mês sem pedido nenhum é exatamente o mês da 4A", () => {
    // A prova de que a metade nova não mexeu na velha: reconstruir o mês com
    // uma lista vazia de pedidos devolve o que a 4A devolvia.
    expect(agregarMes(SETEMBRO, [])).toEqual(agregarTransacoes(SETEMBRO));
    expect(agregarPedidos([])).toEqual(PARCELAS_ZERADAS);
  });
});

describe("desfazer o pagamento devolve cada número", () => {
  const antes = agregarTransacoes(SETEMBRO);
  const pago = pagar(antes, PEDIDO_DA_ANA, VENDA_DO_PEDIDO);
  const desfeito = pagar(pago, PEDIDO_DA_ANA, VENDA_DO_PEDIDO, -1);

  it("volta ao mês de antes, campo por campo", () => {
    expect(desfeito).toEqual(antes);
  });

  it("some com o produto revertido em vez de deixá-lo zerado", () => {
    expect(desfeito.produtos).toEqual({});
  });

  it("some com o dia que só existia por causa do pagamento", () => {
    expect(pago.porDia["15"]).toBeDefined();
    expect(desfeito.porDia["15"]).toBeUndefined();
  });

  it("devolve o ticket médio para zero", () => {
    expect(ticketMedioDe(desfeito.receitaPedidos, desfeito.qtdPedidos)).toBe(0);
  });
});

describe("editar um pedido pago é reverter mais aplicar", () => {
  // A cliente subiu para 24 cookies: total 26760, custo 16984, taxa 1335.
  const MAIOR: PedidoAgregavel = {
    pagoEmISO: "2026-09-15",
    total: 26760,
    custoTotalEstimado: 16984,
    itens: [
      { ...COOKIE, quantidade: 24, subtotal: 16560, custo: 10584 },
      CAIXA_COM_6,
    ],
  };

  const VENDA_MAIOR: TransacaoAgregavel = {
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor: 26760,
    dataISO: "2026-09-15",
    custoTaxa: 1335,
  };

  const depois = pagar(
    pagar(
      pagar(agregarTransacoes(SETEMBRO), PEDIDO_DA_ANA, VENDA_DO_PEDIDO),
      PEDIDO_DA_ANA,
      VENDA_DO_PEDIDO,
      -1,
    ),
    MAIOR,
    VENDA_MAIOR,
  );

  it("corrige o dinheiro e a taxa junto", () => {
    // 24500 + 26760 · 689 + 1335 · 51260 − 12000 − 2024.
    expect(depois.entradas).toBe(51260);
    expect(depois.custoTaxasPagamento).toBe(2024);
    expect(depois.lucro).toBe(37236);
  });

  it("corrige a receita, o custo e a contagem de itens", () => {
    expect(depois.qtdPedidos).toBe(1);
    expect(depois.qtdItensVendidos).toBe(26);
    expect(depois.receitaPedidos).toBe(26760);
    expect(depois.custoDoVendido).toBe(16984);
  });

  it("corrige o ranking sem deixar a quantidade antiga para trás", () => {
    expect(depois.produtos.cookie).toEqual({
      nome: "Cookie tradicional",
      quantidade: 24,
      receita: 16560,
      lucro: 5976,
    });
  });

  it("chega no mesmo lugar que reconstruir o mês", () => {
    expect(depois).toEqual(agregarMes([...SETEMBRO, VENDA_MAIOR], [MAIOR]));
  });
});

describe("o agregado usa a data do pagamento, e não a da entrega", () => {
  it("um pedido entregue em setembro e pago em outubro conta em outubro", () => {
    const emOutubro: PedidoAgregavel = {
      ...PEDIDO_DA_ANA,
      pagoEmISO: "2026-10-02",
    };

    // O agregado é um documento por competência, e os dois deltas caem no de
    // outubro: o de setembro nem chega a ser aberto.
    expect(competenciaDeISO(emOutubro.pagoEmISO)).toBe("2026-10");

    const outubro = pagar(PARCELAS_ZERADAS, emOutubro, {
      ...VENDA_DO_PEDIDO,
      dataISO: "2026-10-02",
    });

    expect(outubro.porDia["02"]).toEqual({
      entradas: 24000,
      saidas: 0,
      pedidos: 1,
    });
    expect(outubro.porDia["30"]).toBeUndefined();
    expect(outubro.qtdPedidos).toBe(1);
  });
});

describe("parcelasDoResumo lê a metade nova", () => {
  it("completa um agregado escrito antes da 3B existir", () => {
    expect(parcelasDoResumo({ entradas: 24500, saidas: 12000 })).toEqual({
      ...PARCELAS_ZERADAS,
      entradas: 24500,
      saidas: 12000,
    });
  });
});

describe("produtosOrdenados", () => {
  it("descarta a linha que sobrou zerada no documento", () => {
    // `increment` não apaga chave: o produto revertido fica no banco como três
    // zeros até "Recalcular o mês" passar.
    expect(
      produtosOrdenados({
        cookie: {
          nome: "Cookie tradicional",
          quantidade: 0,
          receita: 0,
          lucro: 0,
        },
        caixa6: {
          nome: "Caixa com 6",
          quantidade: 2,
          receita: 9980,
          lucro: 3580,
        },
      }),
    ).toEqual([
      {
        fichaId: "caixa6",
        produto: {
          nome: "Caixa com 6",
          quantidade: 2,
          receita: 9980,
          lucro: 3580,
        },
      },
    ]);
  });
});
