import { describe, expect, it } from "vitest";
import {
  anoDoMei,
  atividadeDoCnae,
  formatarCnpj,
  LIMITE_MEI_ANUAL,
  LIMITE_MEI_POR_MES,
  limiteDoAno,
  meiDoCnpj,
  mudouDepoisDeGuardado,
  notasDoMes,
  prazoDoRelatorio,
  relatorioMei,
} from "@/lib/domain/mei";

const venda = (valor: number) =>
  ({ tipo: "ENTRADA", categoria: "VENDA", valor }) as const;

describe("relatorioMei", () => {
  const outubro = [
    venda(10_000),
    venda(3_800),
    { tipo: "ENTRADA", categoria: "OUTRO", valor: 50_000 } as const,
    { tipo: "SAIDA", categoria: "VENDA", valor: 999 } as const,
    { tipo: "SAIDA", categoria: "COMPRA_INSUMO", valor: 4_000 } as const,
  ];

  it("só VENDA de ENTRADA soma, tudo na linha IV por padrão", () => {
    const r = relatorioMei(outubro, { atividade: "INDUSTRIA", comNota: 0 });
    expect(r).toMatchObject({ I: 0, III: 0, IV: 13_800, V: 0, VI: 13_800 });
    expect(r.X).toBe(13_800);
    expect(r.outrasEntradas).toBe(50_000);
  });

  it("a nota emitida passa de IV para V, sem mudar o total", () => {
    const r = relatorioMei(outubro, { atividade: "INDUSTRIA", comNota: 5_000 });
    expect(r).toMatchObject({ IV: 8_800, V: 5_000, VI: 13_800, X: 13_800 });
  });

  it("a nota maior que o total é cortada no total", () => {
    const r = relatorioMei(outubro, {
      atividade: "INDUSTRIA",
      comNota: 99_999,
    });
    expect(r).toMatchObject({ IV: 0, V: 13_800, X: 13_800 });
  });

  it("comércio move as vendas para I e II", () => {
    const r = relatorioMei(outubro, { atividade: "COMERCIO", comNota: 5_000 });
    expect(r).toMatchObject({ I: 8_800, II: 5_000, III: 13_800, VI: 0 });
    expect(r.X).toBe(13_800);
  });
});

describe("limiteDoAno", () => {
  it("soma as entradas de janeiro até o mês e projeta o ritmo", () => {
    const l = limiteDoAno(
      [
        { id: "2025-12", entradas: 900_000 },
        { id: "2026-01", entradas: 200_000 },
        { id: "2026-02", entradas: 400_000 },
        { id: "2026-03", entradas: 100_000 },
        { id: "2026-04", entradas: 100_000 },
        { id: "global", entradas: 9_999_999 },
      ],
      "2026-03",
    );
    expect(l.entradas).toBe(700_000);
    expect(l.ritmo).toBe(2_800_000);
    expect(l.teto).toBe(LIMITE_MEI_ANUAL);
    expect(l.estado).toBe("dentro");
  });

  it("perto a partir de 80%, passou acima de 100%", () => {
    const em = (entradas: number) =>
      limiteDoAno([{ id: "2026-05", entradas }], "2026-12").estado;
    expect(em(LIMITE_MEI_ANUAL * 0.8 - 1)).toBe("dentro");
    expect(em(LIMITE_MEI_ANUAL * 0.8)).toBe("perto");
    expect(em(LIMITE_MEI_ANUAL)).toBe("perto");
    expect(em(LIMITE_MEI_ANUAL + 1)).toBe("passou");
  });

  it("sem agregado, sem ritmo", () => {
    expect(limiteDoAno([], "2026-10").ritmo).toBeNull();
  });

  it("com menos de três meses, sem ritmo", () => {
    const dois = [
      { id: "2026-01", entradas: 100_000 },
      { id: "2026-02", entradas: 100_000 },
    ];
    expect(limiteDoAno(dois, "2026-02").ritmo).toBeNull();
  });

  it("abertura no ano: teto proporcional, o mês da abertura inteiro", () => {
    const l = limiteDoAno([], "2026-10", "2026-03");
    expect(l.teto).toBe(LIMITE_MEI_POR_MES * 10);
    expect(l.teto).toBe(6_750_000);
    expect(l.proporcional).toBe(true);
  });

  it("os estados contam pelo teto proporcional, em centavos", () => {
    const em = (entradas: number) =>
      limiteDoAno([{ id: "2026-10", entradas }], "2026-12", "2026-03").estado;
    expect(em(5_400_000 - 1)).toBe("dentro");
    expect(em(5_400_000)).toBe("perto");
    expect(em(6_750_000)).toBe("perto");
    expect(em(6_750_000 + 1)).toBe("passou");
  });

  it("abertura em ano anterior, ou fora de forma: teto cheio", () => {
    expect(limiteDoAno([], "2026-10", "2021-03").teto).toBe(LIMITE_MEI_ANUAL);
    expect(limiteDoAno([], "2026-10", "2026-13").teto).toBe(LIMITE_MEI_ANUAL);
    expect(limiteDoAno([], "2026-10").proporcional).toBe(false);
  });

  it("desde: o primeiro mês com entrada, se depois de janeiro", () => {
    const agregados = [
      { id: "2026-09", entradas: 50_000 },
      { id: "2026-01", entradas: 0 },
      { id: "2026-08", entradas: 120_000 },
    ];
    expect(limiteDoAno(agregados, "2026-10").desde).toBe("2026-08");
    expect(
      limiteDoAno([{ id: "2026-01", entradas: 1 }], "2026-10").desde,
    ).toBeNull();
    expect(limiteDoAno([], "2026-10").desde).toBeNull();
  });

  it("desde: nada a dizer quando ela começou a lançar no mês da abertura", () => {
    const agosto = [{ id: "2026-08", entradas: 1 }];
    expect(limiteDoAno(agosto, "2026-10", "2026-08").desde).toBeNull();
    expect(limiteDoAno(agosto, "2026-10", "2026-03").desde).toBe("2026-08");
  });
});

describe("atividadeDoCnae", () => {
  it("indústria, comércio, ou nada", () => {
    expect(atividadeDoCnae("1091-1/02")).toBe("INDUSTRIA");
    expect(atividadeDoCnae("4721-1/02")).toBe("COMERCIO");
    expect(atividadeDoCnae("5620-1/04")).toBeNull();
    expect(atividadeDoCnae("")).toBeNull();
  });
});

describe("meiDoCnpj", () => {
  const resposta = {
    razao_social: "  MARIA SOUZA 12345678900 ",
    socios: [{ nome: "MARIA SOUZA" }],
    simples: { mei: "Sim", data_opcao_mei: "2021-03-15" },
    estabelecimento: {
      email: "maria@exemplo.com",
      telefone1: "999999999",
      logradouro: "RUA DAS FLORES",
      data_inicio_atividade: "2020-01-02",
      atividade_principal: { subclasse: "1091-1/02" },
    },
  };

  it("devolve só as três chaves", () => {
    const visto = meiDoCnpj(resposta);
    expect(Object.keys(visto).sort()).toEqual([
      "abertura",
      "atividade",
      "nomeEmpresarial",
    ]);
    expect(visto).toEqual({
      nomeEmpresarial: "MARIA SOUZA 12345678900",
      abertura: "2021-03",
      atividade: "INDUSTRIA",
    });
  });

  it("sem opção pelo MEI, o início da atividade; o que não vem, não vem", () => {
    expect(
      meiDoCnpj({
        simples: null,
        estabelecimento: { data_inicio_atividade: "2024-07-01" },
      }),
    ).toEqual({ abertura: "2024-07" });
    expect(meiDoCnpj(null)).toEqual({});
    expect(meiDoCnpj({ razao_social: 42 })).toEqual({});
  });
});

describe("formatarCnpj", () => {
  it("a máscara cheia e a parcial", () => {
    expect(formatarCnpj("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatarCnpj("12345")).toBe("12.345");
    expect(formatarCnpj("123456789")).toBe("12.345.678/9");
  });
});

describe("relatorioMei conta as vendas", () => {
  it("conta só as entradas VENDA", () => {
    const r = relatorioMei(
      [
        venda(100),
        venda(200),
        { tipo: "ENTRADA", categoria: "OUTRO", valor: 50 } as const,
        { tipo: "SAIDA", categoria: "VENDA", valor: 9 } as const,
      ],
      { atividade: "INDUSTRIA", comNota: 0 },
    );
    expect(r.vendasContadas).toBe(2);
  });
});

describe("prazoDoRelatorio", () => {
  it("o mês corrente está aberto e fica pronto no dia 1º", () => {
    expect(prazoDoRelatorio("2026-10", "2026-10-12")).toMatchObject({
      estado: "aberto",
      data: "2026-11-01",
    });
  });

  it("no dia 1º do mês seguinte, vence no 20 e faltam 19 dias", () => {
    expect(prazoDoRelatorio("2026-09", "2026-10-01")).toEqual({
      estado: "vence",
      data: "2026-10-20",
      faltam: 19,
      atencao: false,
    });
  });

  it("dia 12 faltam 8, sem atenção; dia 15 faltam 5, com atenção", () => {
    expect(prazoDoRelatorio("2026-09", "2026-10-12")).toMatchObject({
      faltam: 8,
      atencao: false,
    });
    expect(prazoDoRelatorio("2026-09", "2026-10-15")).toMatchObject({
      estado: "vence",
      faltam: 5,
      atencao: true,
    });
    expect(prazoDoRelatorio("2026-09", "2026-10-20")).toMatchObject({
      estado: "vence",
      faltam: 0,
    });
  });

  it("dia 21 passou do prazo", () => {
    expect(prazoDoRelatorio("2026-09", "2026-10-21")).toMatchObject({
      estado: "atrasado",
      data: "2026-10-20",
      atencao: false,
    });
  });

  it("guardado mostra o dia em que guardou", () => {
    expect(
      prazoDoRelatorio("2026-09", "2026-10-21", {
        em: "2026-10-14",
        mudou: false,
      }),
    ).toMatchObject({ estado: "guardado", data: "2026-10-14" });
  });

  it("guardado e mudado volta ao prazo", () => {
    expect(
      prazoDoRelatorio("2026-09", "2026-10-15", {
        em: "2026-10-14",
        mudou: true,
      }),
    ).toMatchObject({ estado: "vence", faltam: 5 });
  });

  it("dezembro vence em 20 de janeiro do ano seguinte", () => {
    expect(prazoDoRelatorio("2026-12", "2026-12-31").data).toBe("2027-01-01");
    expect(prazoDoRelatorio("2026-12", "2027-01-10")).toMatchObject({
      estado: "vence",
      data: "2027-01-20",
      faltam: 10,
    });
  });
});

describe("mudouDepoisDeGuardado", () => {
  const relatorio = relatorioMei([venda(220_150)], {
    atividade: "INDUSTRIA",
    comNota: 50_000,
  });
  const guardado = {
    total: 220_150,
    comNota: 50_000,
    atividade: "INDUSTRIA",
  } as const;

  it("igual ao papel, não mudou", () => {
    expect(mudouDepoisDeGuardado(guardado, relatorio, "INDUSTRIA")).toBe(false);
  });

  it("o total, a nota ou a atividade diferentes mudaram", () => {
    expect(
      mudouDepoisDeGuardado(
        { ...guardado, total: 225_150 },
        relatorio,
        "INDUSTRIA",
      ),
    ).toBe(true);
    expect(
      mudouDepoisDeGuardado(
        { ...guardado, comNota: 0 },
        relatorio,
        "INDUSTRIA",
      ),
    ).toBe(true);
    expect(mudouDepoisDeGuardado(guardado, relatorio, "COMERCIO")).toBe(true);
  });
});

describe("notasDoMes", () => {
  const saida = (
    categoria: string,
    dataISO: string,
    valor: number,
    extra: { notaChave?: string; arquivado?: boolean } = {},
  ) =>
    ({
      tipo: "SAIDA",
      categoria,
      dataISO,
      valor,
      descricao: categoria,
      arquivado: false,
      ...extra,
    }) as Parameters<typeof notasDoMes>[0][number];

  it("só compra de insumo, embalagem e equipamento entra", () => {
    const n = notasDoMes([
      saida("COMPRA_INSUMO", "2026-09-02", 100),
      saida("EMBALAGEM", "2026-09-03", 200),
      saida("EQUIPAMENTO", "2026-09-04", 300),
      saida("DESPESA_FIXA", "2026-09-05", 1),
      saida("IMPOSTO", "2026-09-05", 1),
      saida("ENTREGA", "2026-09-05", 1),
      saida("PRO_LABORE", "2026-09-05", 1),
      { ...saida("COMPRA_INSUMO", "2026-09-05", 1), tipo: "ENTRADA" },
    ]);
    expect(n.linhas.map((l) => l.valor)).toEqual([100, 200, 300]);
    expect(n.total).toBe(600);
  });

  it("tira o CNPJ da chave e conta com e sem nota", () => {
    const n = notasDoMes([
      saida("COMPRA_INSUMO", "2026-09-02", 100, {
        notaChave: "75315333000109-2026-09-02-17620",
      }),
      saida("COMPRA_INSUMO", "2026-09-09", 50),
    ]);
    expect(n.linhas[0]).toMatchObject({
      cnpj: "75315333000109",
      comNota: true,
    });
    expect(n.linhas[1]).toMatchObject({ comNota: false });
    expect(n.linhas[1]).not.toHaveProperty("cnpj");
    expect([n.comNota, n.semNota]).toEqual([1, 1]);
  });

  it("arquivado não chega, e a ordem é por data", () => {
    const n = notasDoMes([
      saida("COMPRA_INSUMO", "2026-09-21", 3),
      saida("COMPRA_INSUMO", "2026-09-02", 1),
      saida("COMPRA_INSUMO", "2026-09-09", 9, { arquivado: true }),
      saida("EMBALAGEM", "2026-09-09", 2),
    ]);
    expect(n.linhas.map((l) => l.valor)).toEqual([1, 2, 3]);
  });

  it("sem compra, lista vazia", () => {
    expect(notasDoMes([])).toEqual({
      linhas: [],
      total: 0,
      comNota: 0,
      semNota: 0,
    });
  });
});

describe("limiteDoAno com o que entrou antes do Rende", () => {
  const agosto = [
    { id: "2026-08", entradas: 191_200 },
    { id: "2026-09", entradas: 220_150 },
  ];
  const antes = { ate: "2026-07", valor: 930_000 };

  it("soma o antes e tira o desde", () => {
    const l = limiteDoAno(agosto, "2026-09", undefined, antes);
    expect(l.entradas).toBe(191_200 + 220_150 + 930_000);
    expect(l.desde).toBeNull();
    expect(l.antes).toEqual({ ...antes, de: "2026-01" });
  });

  it("conta os meses do antes no ritmo", () => {
    // Sete meses do antes e dois do Rende: nove.
    const l = limiteDoAno(agosto, "2026-09", undefined, antes);
    expect(l.ritmo).toBe(Math.round(((191_200 + 220_150 + 930_000) / 9) * 12));
  });

  it("antes de outro ano não entra", () => {
    const l = limiteDoAno(agosto, "2026-09", undefined, {
      ate: "2025-07",
      valor: 930_000,
    });
    expect(l.entradas).toBe(191_200 + 220_150);
    expect(l.desde).toBe("2026-08");
    expect(l.antes).toBeNull();
  });
});

describe("anoDoMei", () => {
  const vendas = { "2026-08": 191_200, "2026-09": 220_150, "2026-10": 241_000 };
  const guardadoSetembro = {
    em: "2026-10-14",
    total: 220_150,
    comNota: 0,
    atividade: "INDUSTRIA" as const,
  };

  it("pede o antes quando o primeiro mês com venda é depois de janeiro", () => {
    const a = anoDoMei(
      "2026",
      vendas,
      { atividade: "INDUSTRIA" },
      "2026-11-05",
    );
    expect(a.antes).toEqual({ de: "2026-01", ate: "2026-07", valor: null });
    expect(a.meses.map((m) => m.competencia)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(a.total).toBe(191_200 + 220_150 + 241_000);
    expect(a.vazio).toBe(false);
  });

  it("soma o antes informado, comércio e indústria juntos e serviço zero", () => {
    for (const atividade of ["INDUSTRIA", "COMERCIO"] as const) {
      const a = anoDoMei(
        "2026",
        vendas,
        { atividade, antes: { "2026": { ate: "2026-07", valor: 930_000 } } },
        "2027-02-10",
      );
      expect(a.antes).toEqual({
        de: "2026-01",
        ate: "2026-07",
        valor: 930_000,
      });
      expect(a.comercioEIndustria).toBe(930_000 + 191_200 + 220_150 + 241_000);
      expect(a.servicos).toBe(0);
      expect(a.total).toBe(a.comercioEIndustria);
    }
  });

  it("os meses que o antes cobre saem da soma: nada conta duas vezes", () => {
    const a = anoDoMei(
      "2026",
      vendas,
      {
        atividade: "INDUSTRIA",
        antes: { "2026": { ate: "2026-08", valor: 1_000 } },
      },
      "2027-02-10",
    );
    expect(a.total).toBe(1_000 + 220_150 + 241_000);
    expect(a.meses[0]?.competencia).toBe("2026-09");
  });

  it("ano corrente não terminou; o passado sim, com prazo em 31 de maio", () => {
    expect(
      anoDoMei("2026", vendas, { atividade: "INDUSTRIA" }, "2026-12-31")
        .terminado,
    ).toBe(false);
    const passado = anoDoMei(
      "2026",
      vendas,
      { atividade: "INDUSTRIA" },
      "2027-01-01",
    );
    expect(passado.terminado).toBe(true);
    expect(passado.prazo).toBe("2027-05-31");
  });

  it("o estado de cada mês, com o guardado e o mudado", () => {
    const a = anoDoMei(
      "2026",
      vendas,
      { atividade: "INDUSTRIA", guardados: { "2026-09": guardadoSetembro } },
      "2026-11-05",
    );
    const estado = (c: string) =>
      a.meses.find((m) => m.competencia === c)?.prazo.estado;
    expect(estado("2026-09")).toBe("guardado");
    expect(estado("2026-10")).toBe("vence");
    expect(estado("2026-11")).toBe("aberto");

    const mudado = anoDoMei(
      "2026",
      { ...vendas, "2026-09": 225_150 },
      { atividade: "INDUSTRIA", guardados: { "2026-09": guardadoSetembro } },
      "2026-11-05",
    ).meses.find((m) => m.competencia === "2026-09");
    expect(mudado?.mudou).toBe(true);
    expect(mudado?.prazo.estado).toBe("atrasado");
  });

  it("venda desde janeiro, ou desde a abertura, não pede o antes", () => {
    expect(
      anoDoMei(
        "2026",
        { "2026-01": 100 },
        { atividade: "INDUSTRIA" },
        "2026-11-05",
      ).antes,
    ).toBeNull();
    const aberto = anoDoMei(
      "2026",
      { "2026-03": 100 },
      { atividade: "INDUSTRIA", abertura: "2026-03" },
      "2026-11-05",
    );
    expect(aberto.antes).toBeNull();
    expect(aberto.meses).toHaveLength(12);
  });

  it("abertura no ano: o antes começa nela", () => {
    const a = anoDoMei(
      "2026",
      vendas,
      { atividade: "INDUSTRIA", abertura: "2026-03" },
      "2026-11-05",
    );
    expect(a.antes).toEqual({ de: "2026-03", ate: "2026-07", valor: null });
  });

  it("ano sem dado é vazio", () => {
    const a = anoDoMei("2025", {}, { atividade: "INDUSTRIA" }, "2026-11-05");
    expect(a.vazio).toBe(true);
    expect(a.antes).toBeNull();
    expect(a.total).toBe(0);
  });
});
