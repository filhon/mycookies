import { describe, expect, it } from "vitest";
import {
  agregarMes,
  agregarPedidos,
  agregarTransacoes,
  conferirAgregado,
  contasQueRepetemPendentes,
  deltaDaTransacao,
  deltaDoPedido,
  entradasAteODia,
  eSeCobrasseMais,
  leituraDoCardapio,
  mesDaLeitura,
  mesesDaFaixa,
  PARCELAS_ZERADAS,
  parcelasDoResumo,
  pedidosQueEntramNoMes,
  previsaoDoMes,
  produtosOrdenados,
  rendimentoDoMes,
  saidasOrdenadas,
  somarParcelas,
  taxaDaEntrada,
  ticketMedioDe,
  type ParcelasDoAgregado,
  type PedidoAgregavel,
  type TransacaoAgregavel,
} from "@/lib/domain/caixa";
import { competenciaDeISO } from "@/lib/domain/datas";
import { aReceber } from "@/lib/domain/pedido";
import type { FichaTecnica, FormaPagamento, ResumoProduto } from "@/lib/types";

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

describe("o combo à escolha no agregado (spec 014, #d102)", () => {
  /**
   * 3 × Combo dupla a R$ 12,00, custo montado R$ 5,80 (`custoDoComboMontado`).
   * As escolhas viajam na linha e o agregado não as lê: um combo é um item
   * com preço e custo, como sempre foi.
   */
  // A linha como o pedido a grava, com `escolhas` dentro. `ItemAgregavel` não
  // conhece o campo, e é essa a prova: o agregado não mudou uma linha.
  const LINHA_DO_COMBO = {
    fichaTecnicaId: "combo-dupla",
    nomeSnapshot: "Combo dupla",
    quantidade: 3,
    subtotal: 3600,
    custo: 1740,
    escolhas: [
      {
        fichaTecnicaId: "trad",
        nomeSnapshot: "Cookie tradicional",
        quantidade: 1,
        custoUnitarioSnapshot: 220,
      },
      {
        fichaTecnicaId: "nutella",
        nomeSnapshot: "Cookie de nutella",
        quantidade: 1,
        custoUnitarioSnapshot: 310,
      },
    ],
  };
  const COMBO: PedidoAgregavel = {
    pagoEmISO: "2026-09-22",
    total: 3600,
    custoTotalEstimado: 1740,
    itens: [LINHA_DO_COMBO],
  };

  it("o combo é o produto vendido, e os sabores não ganham linha", () => {
    const mes = agregarPedidos([COMBO]);

    expect(mes.produtos).toEqual({
      "combo-dupla": {
        nome: "Combo dupla",
        quantidade: 3,
        receita: 3600,
        lucro: 1860,
      },
    });
    expect(mes.qtdItensVendidos).toBe(3);
    expect(mes.receitaPedidos).toBe(3600);
    expect(mes.custoDoVendido).toBe(1740);
  });

  it("delta e reconstrução concordam com o combo dentro", () => {
    expect(deltaDoPedido(COMBO, 1)).toEqual(agregarPedidos([COMBO]));
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

// ---------------------------------------------------------------------------
// `conferirAgregado`: o que a lista prova sobre o agregado do mesmo mês.
// ---------------------------------------------------------------------------

describe("conferirAgregado", () => {
  it("confere quando a lista e o agregado dizem o mesmo", () => {
    const lista = [
      { tipo: "ENTRADA" as const, valor: 14000 },
      { tipo: "SAIDA" as const, valor: 9000 },
    ];

    expect(conferirAgregado(lista, { entradas: 14000, saidas: 9000 })).toEqual({
      confere: true,
      entradas: 14000,
      saidas: 9000,
    });
  });

  it("mês vazio confere com agregado zerado", () => {
    expect(conferirAgregado([], { entradas: 0, saidas: 0 })).toEqual({
      confere: true,
      entradas: 0,
      saidas: 0,
    });
  });

  it("não confere quando só as saídas divergem", () => {
    const lista = [
      { tipo: "ENTRADA" as const, valor: 14000 },
      { tipo: "SAIDA" as const, valor: 9000 },
    ];

    expect(conferirAgregado(lista, { entradas: 14000, saidas: 0 })).toEqual({
      confere: false,
      entradas: 14000,
      saidas: 9000,
    });
  });

  it("o caso que dá nome à spec: cinco lançamentos contra um agregado que só recebeu um", () => {
    // O mês da captura: cinco lançamentos no banco, e só a parcela do primeiro
    // chegou ao agregado — as outras quatro morreram na continuação de `async`
    // que a aba levou junto (`DECISOES.md#d80`).
    const lista = [
      { tipo: "ENTRADA" as const, valor: 28000 },
      { tipo: "ENTRADA" as const, valor: 100000 },
      { tipo: "ENTRADA" as const, valor: 20000 },
      { tipo: "SAIDA" as const, valor: 9000 },
      { tipo: "SAIDA" as const, valor: 4500 },
    ];

    const conferencia = conferirAgregado(lista, {
      entradas: 28000,
      saidas: 0,
    });

    expect(conferencia).toEqual({
      confere: false,
      entradas: 148000,
      saidas: 13500,
    });
  });

  it("concorda com `agregarTransacoes` sobre os mesmos lançamentos", () => {
    // A lista da tela e o oráculo da reconstrução não podem discordar: é o que
    // torna o aviso confiável o bastante para mandar recalcular.
    const lancamentos = [
      lancamento({
        tipo: "ENTRADA",
        categoria: "VENDA",
        valor: 14000,
        dataISO: "2026-09-07",
        formaPagamentoId: "credito",
      }),
      lancamento({
        tipo: "SAIDA",
        categoria: "COMPRA_INSUMO",
        valor: 9000,
        dataISO: "2026-09-05",
      }),
    ];

    const reconstruido = agregarTransacoes(lancamentos);

    expect(conferirAgregado(lancamentos, reconstruido).confere).toBe(true);
  });
});

describe("entradasAteODia", () => {
  const dia = (entradas: number) => ({ entradas });

  it("no dia 1 conta só o dia 1", () => {
    expect(entradasAteODia({ "01": dia(500), "02": dia(700) }, 1)).toBe(500);
  });

  it("dia 31 contra um mês de 30 compara com o mês inteiro", () => {
    const setembro = { "01": dia(100), "15": dia(200), "30": dia(300) };
    expect(entradasAteODia(setembro, 31)).toBe(600);
  });

  it("mês curto contra longo: fevereiro até o dia 30 é fevereiro inteiro", () => {
    expect(entradasAteODia({ "28": dia(900) }, 30)).toBe(900);
    expect(entradasAteODia({ "28": dia(900), "29": dia(1) }, 28)).toBe(900);
  });

  it("mês anterior ausente é zero", () => {
    expect(entradasAteODia(parcelasDoResumo(null).porDia, 25)).toBe(0);
  });

  it("buraco em porDia é dia sem movimento", () => {
    expect(entradasAteODia({ "03": dia(250), "20": dia(750) }, 10)).toBe(250);
  });
});

describe("leituraDoCardapio", () => {
  function ficha(
    id: string,
    margemReal: number,
    lucroUnitario: number,
    extra: Partial<FichaTecnica["precificacao"]> = {},
    arquivado = false,
  ) {
    return {
      id,
      nome: id,
      arquivado,
      precificacao: {
        margemReal,
        lucroUnitario,
        precoVenda: 350,
        precoSugerido: 0,
        taxaCartaoConsiderada: 0,
        outrasTaxas: 0,
        ...extra,
      } as FichaTecnica["precificacao"],
    };
  }
  const venda = (quantidade: number, lucro: number): ResumoProduto => ({
    nome: "",
    quantidade,
    receita: quantidade * 100,
    lucro,
  });

  const fichas = [
    ficha("Red Velvet", 45, 656),
    ficha("Mini", 20, 192),
    ficha("Pistache", 55, 626),
    ficha("Brigadeiro", 30, 200),
  ];
  const mes = {
    "Red Velvet": venda(86, 56420),
    Mini: venda(212, 40704),
    Pistache: venda(4, 2504),
    Brigadeiro: venda(20, 4000),
  };

  it("acha as três frases pelas medianas", () => {
    const leitura = leituraDoCardapio(mes, fichas);
    expect(leitura?.sustenta).toMatchObject({
      fichaId: "Red Velvet",
      lucro: 56420,
      quantidade: 86,
    });
    expect(leitura?.vendeMuito).toMatchObject({
      fichaId: "Mini",
      sobra: 192,
      aMais: 40,
      noMes: 8480,
    });
    expect(leitura?.deixaMuito).toMatchObject({
      fichaId: "Pistache",
      sobra: 626,
      quantidade: 4,
    });
  });

  it("o mesmo produto não aparece em duas frases", () => {
    const leitura = leituraDoCardapio(
      { ...mes, Mini: venda(212, 99999) },
      fichas,
    );
    expect(leitura?.sustenta?.fichaId).toBe("Mini");
    expect(leitura?.vendeMuito).toBeNull();
    expect(leitura?.deixaMuito?.fichaId).toBe("Pistache");
  });

  it("abaixo de 4 produtos ou 30 unidades, nada", () => {
    const tres = { ...mes, Brigadeiro: venda(0, 0) };
    expect(leituraDoCardapio(tres, fichas)).toBeNull();
    const poucas = {
      a: venda(10, 1),
      b: venda(10, 1),
      c: venda(5, 1),
      d: venda(4, 1),
    };
    const quatro = ["a", "b", "c", "d"].map((id) => ficha(id, 30, 100));
    expect(leituraDoCardapio(poucas, quatro)).toBeNull();
    expect(
      leituraDoCardapio({ ...poucas, d: venda(5, 1) }, quatro),
    ).not.toBeNull();
  });

  it("arquivado e linha zerada ficam fora das medianas e do mínimo", () => {
    const comArquivado = fichas.map((f) =>
      f.id === "Brigadeiro" ? { ...f, arquivado: true } : f,
    );
    expect(leituraDoCardapio(mes, comArquivado)).toBeNull();
    expect(
      leituraDoCardapio({ ...mes, Brigadeiro: venda(0, 0) }, fichas),
    ).toBeNull();
  });

  it("o e se: até o sugerido, ou o degrau de 10% para cima a R$ 0,10, sem a taxa", () => {
    expect(
      eSeCobrasseMais(
        ficha("x", 0, 0, { precoSugerido: 420 }).precificacao,
        10,
      ),
    ).toEqual({ aMais: 70, noMes: 700 });
    expect(
      eSeCobrasseMais(
        ficha("x", 0, 0, {
          precoVenda: 355,
          taxaCartaoConsiderada: 4,
          outrasTaxas: 1,
        }).precificacao,
        212,
      ),
    ).toEqual({ aMais: 40, noMes: 8056 });
  });

  it("o mês troca no dia 10", () => {
    expect(mesDaLeitura(new Date(2026, 8, 9))).toBe("2026-08");
    expect(mesDaLeitura(new Date(2026, 8, 10))).toBe("2026-09");
    expect(mesDaLeitura(new Date(2026, 0, 3))).toBe("2025-12");
  });
});

describe("rendimentoDoMes (#d261)", () => {
  // O mês dos prints de 2026-10-02: R$ 138,00 em 5 pedidos, R$ 67,56 de custo.
  const outubro: ParcelasDoAgregado = {
    ...PARCELAS_ZERADAS,
    entradas: 13800,
    lucro: 13800,
    qtdPedidos: 5,
    qtdItensVendidos: 6,
    receitaPedidos: 13800,
    custoDoVendido: 6756,
  };

  function comSaida(
    base: ParcelasDoAgregado,
    categoria: TransacaoAgregavel["categoria"],
    valor: number,
  ): ParcelasDoAgregado {
    return somarParcelas(
      base,
      deltaDaTransacao(
        {
          tipo: "SAIDA",
          categoria,
          valor,
          dataISO: "2026-10-02",
          custoTaxa: 0,
        },
        1,
      ),
    );
  }

  it("mês só de pedido: vendeu menos o custo de fazer", () => {
    const r = rendimentoDoMes(outubro);
    expect(r.rendeu).toBe(7044);
    expect(r.deBalcao).toBe(0);
    expect(Math.round(r.percentual!)).toBe(51);
  });

  it("pedido e balcão: o balcão fica fora, mas a maquininha inteira desconta", () => {
    const r = rendimentoDoMes({
      ...outubro,
      entradas: 17800,
      custoTaxasPagamento: 300,
    });
    expect(r.deBalcao).toBe(4000);
    expect(r.maquininha).toBe(300);
    expect(r.rendeu).toBe(13800 - 6756 - 300);
  });

  it("mês sem pedido pago não tem resposta", () => {
    const r = rendimentoDoMes({ ...PARCELAS_ZERADAS, entradas: 5000 });
    expect(r.rendeu).toBeNull();
    expect(r.percentual).toBeNull();
    expect(r.deBalcao).toBe(5000);
  });

  it.each([
    "ENTREGA",
    "MARKETING",
    "IMPOSTO",
    "TAXA_PAGAMENTO",
    "OUTRO",
  ] as const)("a saída de %s desconta", (categoria) => {
    const r = rendimentoDoMes(comSaida(outubro, categoria, 1000));
    expect(r.outrasSaidas).toBe(1000);
    expect(r.rendeu).toBe(7044 - 1000);
  });

  it.each([
    "COMPRA_INSUMO",
    "EMBALAGEM",
    "DESPESA_FIXA",
    "PRO_LABORE",
    "EQUIPAMENTO",
  ] as const)(
    "a saída de %s não desconta: já está na ficha ou não é custo",
    (categoria) => {
      const r = rendimentoDoMes(comSaida(outubro, categoria, 1000));
      expect(r.outrasSaidas).toBe(0);
      expect(r.rendeu).toBe(7044);
    },
  );

  it("rendeu negativo quando o custo passa da venda", () => {
    const r = rendimentoDoMes({ ...outubro, custoDoVendido: 15000 });
    expect(r.rendeu).toBe(-1200);
    expect(r.percentual!).toBeLessThan(0);
  });

  it("deBalcao nunca é negativo, nem com o pedido estornado no mês seguinte", () => {
    // O pagamento foi desfeito em novembro: a entrada saiu, o pedido ainda conta.
    const r = rendimentoDoMes({ ...outubro, entradas: 8000 });
    expect(r.deBalcao).toBe(0);
  });
});

describe("pedidosQueEntramNoMes", () => {
  it("marcados no mês e entregues não pagos de qualquer data; outro mês fica fora", () => {
    const pedidos = [
      { id: "a", status: "CONFIRMADO", dataEntregaISO: "2026-10-20" },
      { id: "b", status: "CONFIRMADO", dataEntregaISO: "2026-11-03" },
      { id: "c", status: "ENTREGUE", dataEntregaISO: "2026-09-12" },
      { id: "d", status: "PRONTO", dataEntregaISO: "2026-09-30" },
    ];
    expect(pedidosQueEntramNoMes(pedidos, "2026-10").map((p) => p.id)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("previsaoDoMes", () => {
  it("o caixa mais o que deve entrar menos as contas que repetem", () => {
    expect(
      previsaoDoMes({
        noCaixa: 13800,
        aReceber: aReceber([
          { status: "CONFIRMADO", pago: false, total: 30000 },
          { status: "ENTREGUE", pago: false, total: 11200 },
          { status: "ORCAMENTO", pago: false, total: 99900 },
        ]),
        contasQueRepetem: [{ valor: 70000 }, { valor: 25000 }],
      }),
    ).toEqual({ deveEntrar: 41200, deveSair: 95000, fechaEm: -40000 });
  });
});

describe("contasQueRepetemPendentes", () => {
  const aluguel = {
    tipo: "SAIDA" as const,
    categoria: "DESPESA_FIXA" as const,
    descricao: "Aluguel da Cozinha",
    dataISO: "2026-09-05",
    recorrente: true,
  };

  it("sem par neste mês, aparece no mesmo dia", () => {
    expect(contasQueRepetemPendentes([aluguel], [])).toEqual([
      { conta: aluguel, dataISO: "2026-10-05" },
    ]);
  });

  it("par pela descrição com acento, caixa e espaços diferentes", () => {
    const lancado = {
      ...aluguel,
      descricao: "  aluguel  da cozínha",
      dataISO: "2026-10-04",
    };
    expect(contasQueRepetemPendentes([aluguel], [lancado])).toEqual([]);
  });

  it("par com valor diferente", () => {
    const gas = { ...aluguel, descricao: "Gás", valor: 13000 };
    const gasDeOutubro = { ...gas, valor: 14500, dataISO: "2026-10-10" };
    expect(contasQueRepetemPendentes([gas], [gasDeOutubro])).toEqual([]);
  });

  it("categoria diferente não é par", () => {
    const outra = {
      ...aluguel,
      categoria: "OUTRO" as const,
      dataISO: "2026-10-05",
    };
    expect(contasQueRepetemPendentes([aluguel], [outra])).toHaveLength(1);
  });

  it("o que não repetia no anterior não entra", () => {
    expect(
      contasQueRepetemPendentes([{ ...aluguel, recorrente: false }], []),
    ).toEqual([]);
  });

  it("dia 31 cai no último dia do mês de 30", () => {
    const internet = {
      ...aluguel,
      descricao: "Internet",
      dataISO: "2026-10-31",
    };
    expect(contasQueRepetemPendentes([internet], [])[0]?.dataISO).toBe(
      "2026-11-30",
    );
  });

  it("a mesma conta duas vezes no anterior é uma pendência só", () => {
    expect(
      contasQueRepetemPendentes(
        [aluguel, { ...aluguel, dataISO: "2026-09-06" }],
        [],
      ),
    ).toHaveLength(1);
  });
});

describe("mesesDaFaixa (#d265)", () => {
  // Um mês com pedido: entrou 1000, vendeu 1000 em pedido, custou 400.
  const mes = (id: string, entradas = 1000, comPedido = true) => ({
    id,
    entradas,
    qtdPedidos: comPedido ? 1 : 0,
    receitaPedidos: comPedido ? entradas : 0,
    custoDoVendido: comPedido ? 400 : 0,
  });

  it("vira o ano: doze meses de novembro a outubro, em ordem", () => {
    const { meses, ano } = mesesDaFaixa(
      [mes("2025-11"), mes("2025-12"), mes("2026-01"), mes("2026-10")],
      "2026-10",
    );
    expect(meses.map((m) => m.competencia)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    // O ano é 2026 até outubro: novembro e dezembro de 2025 ficam fora.
    expect(ano.entradas).toBe(2000);
    expect(ano.rendeu).toBe(1200);
  });

  it("mês faltando no meio é zero sem agregado, e o rendeu diz que faltou mês", () => {
    const { meses, ano } = mesesDaFaixa(
      [mes("2026-08", 1000), mes("2026-10", 3000), mes("2026-09", 500, false)],
      "2026-10",
    );
    const julho = meses.find((m) => m.competencia === "2026-07")!;
    expect(julho).toEqual({
      competencia: "2026-07",
      temAgregado: false,
      entradas: 0,
      rendeu: null,
    });
    expect(meses.find((m) => m.competencia === "2026-09")!.rendeu).toBeNull();
    expect(ano).toEqual({
      entradas: 4500,
      rendeu: 600 + 2600,
      faltouMes: true,
    });
  });

  it("ate em janeiro: o ano tem um mês só", () => {
    const { ano } = mesesDaFaixa(
      [mes("2025-12", 9000), mes("2026-01", 1000)],
      "2026-01",
    );
    expect(ano).toEqual({ entradas: 1000, rendeu: 600, faltouMes: false });
  });

  it("o agregado global na entrada é ignorado", () => {
    const { meses, ano } = mesesDaFaixa(
      [mes("2026-01"), { id: "global", entradas: 999999 }],
      "2026-01",
    );
    expect(meses.filter((m) => m.temAgregado)).toHaveLength(1);
    expect(ano.entradas).toBe(1000);
  });
});
