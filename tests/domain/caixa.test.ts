import { describe, expect, it } from "vitest";
import {
  agregarTransacoes,
  deltaDaTransacao,
  PARCELAS_ZERADAS,
  parcelasDoResumo,
  saidasOrdenadas,
  somarParcelas,
  taxaDaEntrada,
  type ParcelasDoAgregado,
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
