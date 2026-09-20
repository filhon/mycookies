import { describe, expect, it } from "vitest";
import {
  DIAS_DE_TESTE,
  esquemaCadastro,
  fimDoTeste,
  nomeDoNegocio,
} from "@/lib/domain/cadastro";

describe("fimDoTeste", () => {
  it("cai catorze dias depois do início", () => {
    const inicio = new Date("2026-09-19T10:00:00Z");
    const fim = fimDoTeste(inicio);
    expect(DIAS_DE_TESTE).toBe(14);
    expect(fim.toISOString()).toBe("2026-10-03T10:00:00.000Z");
  });
});

describe("esquemaCadastro", () => {
  it("aceita o mínimo: nome e a caixa marcada, sem negócio", () => {
    const corpo = esquemaCadastro.safeParse({
      nome: " Maynara ",
      termos: true,
    });
    expect(corpo.success).toBe(true);
    if (corpo.success) {
      expect(corpo.data.nome).toBe("Maynara");
      expect(corpo.data.negocio).toBeUndefined();
    }
  });

  it("recusa a caixa desmarcada", () => {
    expect(
      esquemaCadastro.safeParse({ nome: "Maynara", termos: false }).success,
    ).toBe(false);
  });

  it("recusa nome vazio, mesmo só de espaços", () => {
    expect(
      esquemaCadastro.safeParse({ nome: "   ", termos: true }).success,
    ).toBe(false);
  });
});

describe("nomeDoNegocio", () => {
  it("é o negócio quando ela disse um", () => {
    expect(
      nomeDoNegocio({ nome: "Maynara", negocio: "MyCookie's", termos: true }),
    ).toBe("MyCookie's");
  });

  it("cai no nome dela quando o negócio está em branco", () => {
    expect(nomeDoNegocio({ nome: "Maynara", termos: true })).toBe("Maynara");
    const semNegocio = esquemaCadastro.parse({
      nome: "Maynara",
      negocio: "  ",
      termos: true,
    });
    expect(nomeDoNegocio(semNegocio)).toBe("Maynara");
  });
});
