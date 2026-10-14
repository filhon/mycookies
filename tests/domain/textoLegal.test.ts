import { describe, expect, it } from "vitest";
import { fatiarReferencias } from "@/lib/domain/textoLegal";

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
