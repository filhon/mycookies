import { describe, expect, it } from "vitest";
import { filtrarPerguntas, PERGUNTAS } from "@/components/comecar/perguntas";

// O roteiro da 095: cada palavra acha uma pergunta só, que por isso vem aberta.
describe("filtrarPerguntas", () => {
  it.each([
    ["pix", "pix"],
    ["sinal", "sinal"],
    ["zerado", "caixa-zerado"],
    ["mei", "mei"],
    ["relatorio", "mei"],
  ])("“%s” acha só %s", (termo, id) => {
    expect(filtrarPerguntas(termo).map((p) => p.id)).toEqual([id]);
  });

  it("sem termo, todas", () => {
    expect(filtrarPerguntas("  ")).toBe(PERGUNTAS);
  });
});
