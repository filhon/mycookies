import { describe, expect, it } from "vitest";
import {
  calcularCustoInsumo,
  chaveDeBusca,
  custoDeUso,
} from "@/lib/domain/custoInsumo";

describe("calcularCustoInsumo", () => {
  it("converte pacote de 1 kg em custo por grama", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 0,
    });

    expect(custo.unidadeBase).toBe("g");
    expect(custo.quantidadeBase).toBe(1000);
    expect(custo.custoUnidadeBase).toBe(1.25);
    expect(custo.custoUnidadeBaseCorrigido).toBe(1.25);
  });

  it("DIVIDE pelo aproveitamento, não multiplica pela perda", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 20,
    });

    // 1,25 / 0,8 = 1,5625. O erro clássico de planilha seria 1,25 × 1,2 = 1,50,
    // que subestima o custo e come a margem silenciosamente.
    expect(custo.custoUnidadeBaseCorrigido).toBeCloseTo(1.5625, 6);
    expect(custo.custoUnidadeBaseCorrigido).not.toBeCloseTo(1.5, 6);
  });

  it("mostra quanto a perda custa por embalagem", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 20,
    });

    expect(custo.rendimentoLiquido).toBe(800);
    expect(custo.custoDaPerda).toBe(250);
  });

  it("trata litro como mililitro", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 900,
      quantidadeCompra: 2,
      unidadeCompra: "l",
      perdaPercentual: 0,
    });

    expect(custo.unidadeBase).toBe("ml");
    expect(custo.quantidadeBase).toBe(2000);
    expect(custo.custoUnidadeBase).toBe(0.45);
  });

  it("trata contagem sem conversão", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 3000,
      quantidadeCompra: 100,
      unidadeCompra: "un",
      perdaPercentual: 0,
    });

    expect(custo.custoUnidadeBase).toBe(30);
  });

  it("não divide por zero quando a quantidade ainda está vazia", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 0,
      unidadeCompra: "kg",
      perdaPercentual: 0,
    });

    expect(custo.custoUnidadeBase).toBe(0);
    expect(custo.custoUnidadeBaseCorrigido).toBe(0);
  });

  it("limita a perda a 99% para não estourar o custo ao infinito", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1000,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 100,
    });

    expect(Number.isFinite(custo.custoUnidadeBaseCorrigido)).toBe(true);
  });
});

describe("custoDeUso", () => {
  it("arredonda a linha da receita para centavo inteiro", () => {
    expect(custoDeUso(1.5625, 250)).toBe(391);
  });
});

describe("chaveDeBusca", () => {
  it("remove acento e caixa para busca offline", () => {
    expect(chaveDeBusca("Açúcar  Cristal")).toBe("acucar cristal");
    expect(chaveDeBusca(" Chocolate ")).toBe("chocolate");
  });
});
