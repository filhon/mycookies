import { describe, expect, it } from "vitest";
import { boasVindas } from "@/lib/email/pecas";

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
});
