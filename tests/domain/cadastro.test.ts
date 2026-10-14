import { describe, expect, it } from "vitest";
import {
  DIAS_DE_TESTE,
  esquemaCadastro,
  fimDoTeste,
  nomeDoNegocio,
  sugerirEmail,
} from "@/lib/domain/cadastro";

describe("sugerirEmail", () => {
  it.each([
    ["maynara@gmial.com", "maynara@gmail.com"],
    ["maynara@gmail.con", "maynara@gmail.com"],
    ["maynara@gmail.co", "maynara@gmail.com"],
    ["maynara@gamil.com", "maynara@gmail.com"],
    ["maynara@hotmial.com", "maynara@hotmail.com"],
    ["maynara@outlok.com", "maynara@outlook.com"],
    ["maynara@yahoo.com.b", "maynara@yahoo.com.br"],
  ])("%s → %s", (digitado, sugerido) => {
    expect(sugerirEmail(digitado)).toBe(sugerido);
  });

  it.each([
    "maynara@hotmail.com.br", // a 3 de hotmail.com, e fora da lista
    "maynara@uol.com", // a 3 de uol.com.br
    "ana@docesdaana.com.br",
    "MAYNARA@GMAIL.COM",
    "a@b",
    "maynara",
    "@gmial.com",
    "maynara@",
  ])("%s não tem sugestão", (digitado) => {
    expect(sugerirEmail(digitado)).toBeNull();
  });

  it("devolve a parte local como ela digitou, sem os espaços", () => {
    expect(sugerirEmail("  Maynara.Doces@GMIAL.com ")).toBe(
      "Maynara.Doces@gmail.com",
    );
  });
});

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

  it("aceita origem calculadora e cardapio e recusa outra", () => {
    const corpo = { nome: "Maynara", termos: true };
    expect(
      esquemaCadastro.safeParse({ ...corpo, origem: "calculadora" }).success,
    ).toBe(true);
    expect(
      esquemaCadastro.safeParse({ ...corpo, origem: "cardapio" }).success,
    ).toBe(true);
    expect(
      esquemaCadastro.safeParse({ ...corpo, origem: "instagram" }).success,
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
