import { describe, expect, it } from "vitest";
import {
  assuntoDaMudanca,
  fatiarReferencias,
  mudancaParaAvisar,
  VERSAO_DO_ACEITE,
  VERSOES_PRIVACIDADE,
  VERSOES_TERMOS,
  versaoAtual,
  type Versao,
} from "@/lib/domain/textoLegal";

const VERSOES: Versao[] = [
  { em: "2026-09-24", mudou: "Primeira versão.", relevante: false },
  { em: "2026-09-25", mudou: "Pequena: um detalhe.", relevante: false },
  { em: "2026-10-01", mudou: "Grande: um fornecedor.", relevante: true },
  { em: "2026-10-05", mudou: "Pequena de novo: outro.", relevante: false },
  { em: "2026-10-10", mudou: "Maior: outro fornecedor.", relevante: true },
];

describe("versões", () => {
  it("a atual é a última, e o aceite cobre o par pela mais nova", () => {
    expect(versaoAtual(VERSOES)).toBe("2026-10-10");
    expect(VERSAO_DO_ACEITE >= versaoAtual(VERSOES_TERMOS)).toBe(true);
    expect(VERSAO_DO_ACEITE >= versaoAtual(VERSOES_PRIVACIDADE)).toBe(true);
  });

  it("sem mudança depois do aceite, nada a avisar", () => {
    expect(mudancaParaAvisar(VERSOES, "2026-10-10")).toBeUndefined();
  });

  it("só mudança irrelevante, nada a avisar", () => {
    expect(
      mudancaParaAvisar(VERSOES.slice(0, 2), "2026-09-24"),
    ).toBeUndefined();
  });

  it("uma relevante depois do aceite, ela", () => {
    expect(mudancaParaAvisar(VERSOES.slice(0, 4), "2026-09-24")?.em).toBe(
      "2026-10-01",
    );
  });

  it("duas relevantes, a última", () => {
    expect(mudancaParaAvisar(VERSOES, "2026-09-24")?.em).toBe("2026-10-10");
  });

  it("o assunto é o que vem antes dos dois-pontos, em minúscula", () => {
    expect(assuntoDaMudanca(VERSOES_PRIVACIDADE.at(-1)!)).toBe(
      "a taxa de entrega pelo CEP",
    );
  });
});

const TRECHOS = [
  { trecho: "dona@exemplo.com", href: "mailto:dona@exemplo.com" },
  {
    trecho: "consumidor.gov.br",
    href: "https://consumidor.gov.br",
    novaAba: true,
  },
  { trecho: "gov.br/anpd", href: "https://www.gov.br/anpd", novaAba: true },
  { trecho: "política de privacidade", href: "/privacidade" },
];

describe("fatiarReferencias", () => {
  it("devolve o texto inteiro quando não há referência", () => {
    expect(fatiarReferencias("Nada aqui.", TRECHOS)).toEqual([
      { tipo: "texto", texto: "Nada aqui." },
    ]);
    expect(fatiarReferencias("")).toEqual([]);
  });

  it("liga a seção ao endereço dela, com dois dígitos", () => {
    expect(
      fatiarReferencias(
        "Escreva para o e-mail da seção 1, ou leia a seção 12.",
      ),
    ).toEqual([
      { tipo: "texto", texto: "Escreva para o e-mail da " },
      { tipo: "link", texto: "seção 1", href: "#secao-1", novaAba: false },
      { tipo: "texto", texto: ", ou leia a " },
      { tipo: "link", texto: "seção 12", href: "#secao-12", novaAba: false },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("liga os literais, e só os de fora abrem aba nova", () => {
    const pedacos = fatiarReferencias(
      "O contato é dona@exemplo.com. Reclame no consumidor.gov.br. Veja a política de privacidade.",
      TRECHOS,
    );
    expect(pedacos.filter((p) => p.tipo === "link")).toEqual([
      {
        tipo: "link",
        texto: "dona@exemplo.com",
        href: "mailto:dona@exemplo.com",
        novaAba: false,
      },
      {
        tipo: "link",
        texto: "consumidor.gov.br",
        href: "https://consumidor.gov.br",
        novaAba: true,
      },
      {
        tipo: "link",
        texto: "política de privacidade",
        href: "/privacidade",
        novaAba: false,
      },
    ]);
  });

  it("não perde nem repete letra: os pedaços refazem o texto", () => {
    const texto =
      "Na ANPD, em gov.br/anpd. A seção 7 trata disso; o e-mail dona@exemplo.com responde.";
    expect(
      fatiarReferencias(texto, TRECHOS)
        .map((p) => p.texto)
        .join(""),
    ).toBe(texto);
  });

  it("não confunde ponto do trecho com qualquer letra", () => {
    expect(fatiarReferencias("consumidorxgovxbr", TRECHOS)).toEqual([
      { tipo: "texto", texto: "consumidorxgovxbr" },
    ]);
  });
});
