import { describe, expect, it } from "vitest";
import { errosDeLinha, esquemaFicha } from "@/lib/domain/schemas";

/** Um kit válido por escolha: nenhum componente fixo, dois cookies à escolha. */
const COMBO = {
  nome: "Combo dupla",
  categoria: "Combo",
  tipo: "KIT" as const,
  rendimento: 1,
  unidadeRendimento: "un" as const,
  fornadasMinimas: 0,
  tempoProducaoMinutos: 0,
  itens: [{ insumoId: "kraft", quantidade: 1 }],
  componentes: [],
  escolhas: [{ quantidade: 2, categoria: "Cookie" }],
  metodo: "MARGEM" as const,
  markup: 3,
  margemDesejada: 40,
  taxaCartaoConsiderada: 4.99,
  outrasTaxas: 0,
  precoVenda: 1200,
};

describe("esquemaFicha · escolhas (spec 014)", () => {
  it("um kit só de escolhas, sem ficha fixa, é um kit", () => {
    expect(esquemaFicha.safeParse(COMBO).success).toBe(true);
  });

  it("um kit sem ficha fixa e sem escolha é uma caixa vazia", () => {
    const resultado = esquemaFicha.safeParse({ ...COMBO, escolhas: [] });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["componentes"]);
  });

  it("ficha SIMPLES recusa escolhas", () => {
    const resultado = esquemaFicha.safeParse({
      ...COMBO,
      tipo: "SIMPLES",
      componentes: [],
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map((issue) => issue.path[0])).toContain(
      "escolhas",
    );
  });

  it("a mesma categoria não entra duas vezes", () => {
    const resultado = esquemaFicha.safeParse({
      ...COMBO,
      escolhas: [
        { quantidade: 1, categoria: "Cookie" },
        { quantidade: 1, categoria: "Cookie" },
      ],
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["escolhas"]);
  });

  it("quantidade zerada ou fracionada cai na linha certa", () => {
    const resultado = esquemaFicha.safeParse({
      ...COMBO,
      escolhas: [
        { quantidade: 1, categoria: "Cookie" },
        { quantidade: 0.5, categoria: "Brownie" },
      ],
    });
    expect(resultado.success).toBe(false);
    expect(errosDeLinha(resultado.error!, "escolhas")).toEqual({
      1: "A cliente escolhe unidades inteiras: 1, 2, 3.",
    });
  });
});
