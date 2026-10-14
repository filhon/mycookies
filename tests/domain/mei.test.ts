import { describe, expect, it } from "vitest";
import {
  atividadeDoCnae,
  formatarCnpj,
  LIMITE_MEI_ANUAL,
  LIMITE_MEI_POR_MES,
  limiteDoAno,
  meiDoCnpj,
  mudouDepoisDeGuardado,
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
