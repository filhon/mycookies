import { describe, expect, it } from "vitest";
import { escalarItens, passosDoPreparo } from "@/lib/domain/preparo";

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

describe("escalarItens", () => {
  const farinha = { quantidade: 560, unidadeBase: "g" as const };
  const ovos = (quantidade: number) => ({
    quantidade,
    unidadeBase: "un" as const,
  });

  it("multiplica e fica em gramas: 1.120 g não vira 1,12 kg", () => {
    expect(escalarItens([farinha], 2)[0]).toMatchObject({
      quantidade: 1120,
      rotulo: "1.120 g",
    });
    expect(escalarItens([farinha], 0.5)[0]?.rotulo).toBe("280 g");
    expect(escalarItens([farinha], 1)[0]?.rotulo).toBe("560 g");
  });

  it("ovo vai de meio em meio", () => {
    expect(escalarItens([ovos(2)], 2)[0]?.rotulo).toBe("4 un");
    expect(escalarItens([ovos(2)], 0.5)[0]?.rotulo).toBe("1 un");
    expect(escalarItens([ovos(3)], 0.5)[0]?.rotulo).toBe("1 ½ un");
    expect(escalarItens([ovos(1)], 0.5)[0]?.rotulo).toBe("½ un");
  });

  it("grama e ml inteiros; abaixo de 10, uma casa; nunca zero", () => {
    const item = (quantidade: number) => ({
      quantidade,
      unidadeBase: "ml" as const,
    });
    expect(escalarItens([item(125)], 0.5)[0]?.rotulo).toBe("63 ml");
    expect(escalarItens([item(3)], 0.5)[0]?.rotulo).toBe("1,5 ml");
    expect(escalarItens([item(2.5)], 1)[0]?.rotulo).toBe("2,5 ml");
    expect(escalarItens([item(0.1)], 0.5)[0]?.quantidade).toBe(0.1);
    expect(escalarItens([ovos(0.2)], 1)[0]?.quantidade).toBe(0.5);
  });

  it("mantém o resto do item", () => {
    const [linha] = escalarItens(
      [{ ...farinha, insumoId: "f", nomeSnapshot: "Farinha" }],
      3,
    );
    expect(linha).toMatchObject({ insumoId: "f", quantidade: 1680 });
  });
});
