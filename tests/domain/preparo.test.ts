import { describe, expect, it } from "vitest";
import { passosDoPreparo } from "@/lib/domain/preparo";

describe("passosDoPreparo", () => {
  it("uma linha é um passo, e a linha em branco some", () => {
    expect(
      passosDoPreparo(
        "Bata a manteiga com os açúcares até clarear.\n\n  Junte o ovo.  \n\t\nAsse a 180 °C por 12 minutos.\n",
      ),
    ).toEqual([
      "Bata a manteiga com os açúcares até clarear.",
      "Junte o ovo.",
      "Asse a 180 °C por 12 minutos.",
    ]);
  });

  it("o texto colado do Windows não deixa \\r no passo", () => {
    expect(passosDoPreparo("Bata.\r\nAsse.\r\n")).toEqual(["Bata.", "Asse."]);
  });

  it("vazio, só espaço ou ausente não tem passo", () => {
    expect(passosDoPreparo("")).toEqual([]);
    expect(passosDoPreparo(" \n \n")).toEqual([]);
    expect(passosDoPreparo(undefined)).toEqual([]);
  });
});
