import { describe, expect, it } from "vitest";
import {
  arredondarNaBase,
  converterUnidadeDeConta,
  custoDeReferencia,
  daBase,
  fatorDaConversao,
  perguntaDaConversao,
  formatarQuantidade,
  paraBase,
  quantidadeParaOMercado,
  unidadeBaseDe,
} from "@/lib/domain/unidades";

describe("conversão de unidades", () => {
  it("normaliza para a unidade base", () => {
    expect(paraBase(1, "kg")).toBe(1000);
    expect(paraBase(2.5, "l")).toBe(2500);
    expect(paraBase(12, "un")).toBe(12);
  });

  it("volta para a unidade de compra", () => {
    expect(daBase(1500, "kg")).toBe(1.5);
    expect(daBase(250, "g")).toBe(250);
  });

  it("associa cada unidade de compra à sua grandeza", () => {
    expect(unidadeBaseDe("kg")).toBe("g");
    expect(unidadeBaseDe("ml")).toBe("ml");
    expect(unidadeBaseDe("un")).toBe("un");
  });
});

describe("formatarQuantidade", () => {
  it("sobe de escala quando o número fica grande", () => {
    expect(formatarQuantidade(1500, "g")).toBe("1,5 kg");
    expect(formatarQuantidade(2000, "ml")).toBe("2 l");
  });

  it("mantém a unidade base em valores pequenos", () => {
    expect(formatarQuantidade(250, "g")).toBe("250 g");
  });

  it("não usa casa decimal em contagem", () => {
    expect(formatarQuantidade(12, "un")).toBe("12 un");
  });
});

describe("quantidadeParaOMercado", () => {
  it("arredonda para cima, no passo de cada faixa", () => {
    expect(quantidadeParaOMercado(10.59, "ml")).toBe("11 ml");
    expect(quantidadeParaOMercado(99.2, "g")).toBe("100 g");
    expect(quantidadeParaOMercado(376.67, "g")).toBe("380 g");
    expect(quantidadeParaOMercado(1388, "g")).toBe("1,4 kg");
    expect(quantidadeParaOMercado(1696, "ml")).toBe("1,7 l");
    expect(quantidadeParaOMercado(3.2, "un")).toBe("4 un");
  });

  it("deixa o número redondo como está", () => {
    expect(quantidadeParaOMercado(300.0000001, "g")).toBe("300 g");
    expect(quantidadeParaOMercado(1400, "g")).toBe("1,4 kg");
    expect(quantidadeParaOMercado(2, "un")).toBe("2 un");
  });

  it("sobe de escala quando a dezena passa de 999", () => {
    expect(quantidadeParaOMercado(995, "g")).toBe("1 kg");
  });
});

describe("custoDeReferencia", () => {
  it("leva o grama ao quilo e o mililitro ao litro, em centavos inteiros", () => {
    // Creme de leite: R$ 2,99 por 200 g.
    expect(custoDeReferencia(299 / 200, "g")).toEqual({
      centavos: 1495,
      rotulo: "o quilo",
    });
    expect(custoDeReferencia(0.8, "ml")).toEqual({
      centavos: 800,
      rotulo: "o litro",
    });
  });

  it("deixa a unidade como está", () => {
    expect(custoDeReferencia(8.75, "un")).toEqual({
      centavos: 8.75,
      rotulo: "a unidade",
    });
  });
});

describe("a unidade de conta que se troca (spec 191)", () => {
  const ovo = {
    id: "ovo",
    unidadeBase: "un" as const,
    quantidadeBase: 12,
    estoqueAtual: 24,
  };
  const cookie = {
    itens: [
      { insumoId: "ovo", quantidade: 2, unidadeBase: "un" as const },
      { insumoId: "farinha", quantidade: 200, unidadeBase: "g" as const },
    ],
  };

  it("pergunta pelo peso de uma unidade, nos dois sentidos", () => {
    expect(perguntaDaConversao("un", "g", "Ovo")).toEqual({
      texto: "Uma unidade de Ovo pesa quantos gramas?",
      unidade: "g",
    });
    expect(perguntaDaConversao("ml", "g", "Essência").texto).toBe(
      "1 ml de Essência pesa quantos gramas?",
    );
    expect(perguntaDaConversao("g", "un", "Ovo")).toEqual({
      texto: "Uma unidade de Ovo pesa quantos gramas?",
      unidade: "g",
    });
    expect(fatorDaConversao("g", 50)).toBe(50);
    expect(fatorDaConversao("un", 50)).toBe(0.02);
  });

  it("converte as receitas, a despensa e a embalagem, e só o material", () => {
    const convertido = converterUnidadeDeConta(50, ovo, "g", [cookie, cookie]);
    expect(convertido.itens[0]).toEqual([
      { insumoId: "ovo", quantidade: 100, unidadeBase: "g" },
      { insumoId: "farinha", quantidade: 200, unidadeBase: "g" },
    ]);
    expect(convertido.itens).toHaveLength(2);
    expect(convertido.estoqueAtual).toBe(1200);
    expect(convertido.embalagem).toEqual({
      quantidadeCompra: 600,
      unidadeCompra: "g",
    });
  });

  it("o custo da linha não muda pela troca", () => {
    const antes = (1800 / ovo.quantidadeBase) * 2;
    const { itens, embalagem } = converterUnidadeDeConta(50, ovo, "g", [
      cookie,
    ]);
    const depois = itens[0]?.[0]?.quantidade ?? 0;
    expect((1800 / embalagem.quantidadeCompra) * depois).toBe(antes);
  });

  it("deixa como está o item que já está na base nova, e a despensa ausente", () => {
    const quebrado = {
      itens: [{ insumoId: "ovo", quantidade: 150, unidadeBase: "g" as const }],
    };
    const convertido = converterUnidadeDeConta(
      50,
      { ...ovo, estoqueAtual: undefined },
      "g",
      [quebrado],
    );
    expect(convertido.itens[0]?.[0]?.quantidade).toBe(150);
    expect("estoqueAtual" in convertido).toBe(false);
  });

  it("arredonda duas casas em g e ml, e para cima em un", () => {
    expect(arredondarNaBase(33.3333, "g")).toBe(33.33);
    expect(arredondarNaBase(1.5, "un")).toBe(2);
    expect(arredondarNaBase(100.0000001, "un")).toBe(100);
    const { itens } = converterUnidadeDeConta(
      fatorDaConversao("un", 50),
      { id: "ovo", unidadeBase: "g", quantidadeBase: 600 },
      "un",
      [{ itens: [{ insumoId: "ovo", quantidade: 75, unidadeBase: "g" }] }],
    );
    expect(itens[0]?.[0]).toEqual({
      insumoId: "ovo",
      quantidade: 2,
      unidadeBase: "un",
    });
  });
});
