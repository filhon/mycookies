import { describe, expect, it } from "vitest";
import { boasVindas, testeAcabando } from "@/lib/email/pecas";

describe("peças de e-mail", () => {
  it("escapa o nome dela no HTML e o deixa inteiro no texto", () => {
    const peca = boasVindas({
      nome: "<b>Ana</b> & Cia",
      email: "ana@exemplo.com",
      acabaEmISO: "2026-10-09",
    });

    expect(peca.html).toContain("Oi, &lt;b&gt;Ana&lt;/b&gt; &amp; Cia");
    expect(peca.html).not.toContain("<b>Ana</b>");
    expect(peca.texto).toContain("Oi, <b>Ana</b> & Cia.");
  });

  it("o teste acabando leva a pesquisa só para a fundadora com ela aberta", () => {
    const dados = {
      nome: "Carla",
      negocio: "Doces da Carla",
      acabaEmISO: "2026-10-09",
      faltam: 3,
      diasDeUso: 11,
      produtos: 0,
      noVermelho: 0,
      pedidos: 0,
      entrou: 0,
      precos: null,
    };
    const fundadora = testeAcabando({ ...dados, pesquisaAberta: true });
    expect(fundadora.html).toContain("/pesquisa");
    expect(fundadora.texto).toContain("Responder a pesquisa:");
    // O botão continua o de assinar.
    expect(fundadora.html).toContain("Escolher a assinatura");
    expect(testeAcabando(dados).html).not.toContain("/pesquisa");
  });
});
