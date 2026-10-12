import { describe, expect, it } from "vitest";
import {
  escalarItens,
  passosDoPreparo,
  preparoNaBancada,
} from "@/lib/domain/preparo";

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

  it("ovo vai de meio em meio, sem o 'un' (#d347)", () => {
    expect(escalarItens([ovos(2)], 2)[0]?.rotulo).toBe("4");
    expect(escalarItens([ovos(2)], 0.5)[0]?.rotulo).toBe("1");
    expect(escalarItens([ovos(3)], 0.5)[0]?.rotulo).toBe("1 ½");
    expect(escalarItens([ovos(1)], 0.5)[0]?.rotulo).toBe("½");
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

describe("preparoNaBancada (#d349)", () => {
  // Recheio de 1.000 g: 320 g de Nutella, 500 g de creme, 180 g de leite em pó.
  const recheio = {
    rendimento: 1000,
    itens: [
      { insumoId: "nutella", quantidade: 320, unidadeBase: "g" as const },
      { insumoId: "creme", quantidade: 500, unidadeBase: "g" as const },
      { insumoId: "leite", quantidade: 180, unidadeBase: "g" as const },
    ],
  };
  const gramas = (r: ReturnType<typeof preparoNaBancada>) =>
    r.ingredientes.map((item) => item.quantidade);

  it("sem pote, os de dentro saem em 320 g de 1.000 g", () => {
    const sem = preparoNaBancada(recheio, 320, undefined);
    expect(sem).toMatchObject({ pote: null, resto: 320 });
    expect(gramas(sem)).toEqual([102, 160, 58]);
  });

  it("duas fornadas dobram os de dentro", () => {
    expect(gramas(preparoNaBancada(recheio, 640, undefined))).toEqual([
      205, 320, 115,
    ]);
  });

  it("pote contado em zero é fiz junto", () => {
    expect(preparoNaBancada(recheio, 320, 0)).toMatchObject({
      pote: null,
      resto: 320,
    });
  });

  it("pote que dá: nada sai, e a lista é a dos 320 g para o fiz junto", () => {
    const da = preparoNaBancada(recheio, 320, 1000);
    expect(da).toMatchObject({ pote: 1000, resto: 0 });
    expect(gramas(da)).toEqual([102, 160, 58]);
  });

  it("pote que não dá: a lista é a do resto", () => {
    const naoDa = preparoNaBancada(recheio, 320, 200);
    expect(naoDa).toMatchObject({ pote: 200, resto: 120 });
    expect(gramas(naoDa)).toEqual([38, 60, 22]);
  });
});
