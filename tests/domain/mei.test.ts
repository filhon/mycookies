import { describe, expect, it } from "vitest";
import { LIMITE_MEI_ANUAL, limiteDoAno, relatorioMei } from "@/lib/domain/mei";

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
        { id: "global", entradas: 9_999_999 },
      ],
      "2026-02",
    );
    expect(l.entradas).toBe(600_000);
    expect(l.ritmo).toBe(3_600_000);
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
});
