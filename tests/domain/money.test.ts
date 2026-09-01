import { describe, expect, it } from "vitest";
import {
  arredondarPreco,
  digitosParaCentavos,
  formatarValor,
  parseParaCentavos,
  percentualDe,
  ratear,
} from "@/lib/domain/money";

describe("parseParaCentavos", () => {
  it("lê o formato brasileiro", () => {
    expect(parseParaCentavos("12,50")).toBe(1250);
    expect(parseParaCentavos("R$ 12,50")).toBe(1250);
    expect(parseParaCentavos("1.234,56")).toBe(123456);
  });

  it("aceita ponto decimal de teclado numérico", () => {
    expect(parseParaCentavos("12.50")).toBe(1250);
  });

  it("trata número sem separador como valor inteiro em reais", () => {
    expect(parseParaCentavos("12")).toBe(1200);
  });

  it("não explode com entrada suja", () => {
    expect(parseParaCentavos("")).toBe(0);
    expect(parseParaCentavos("abc")).toBe(0);
  });

  it("preserva o sinal negativo", () => {
    expect(parseParaCentavos("-12,50")).toBe(-1250);
  });
});

describe("digitosParaCentavos", () => {
  it("empurra cada dígito uma casa à esquerda", () => {
    expect(digitosParaCentavos("1")).toBe(1);
    expect(digitosParaCentavos("12")).toBe(12);
    expect(digitosParaCentavos("1250")).toBe(1250);
  });

  it("ignora o que já está formatado na tela", () => {
    expect(digitosParaCentavos("12,50")).toBe(1250);
    expect(digitosParaCentavos("R$ 1.234,56")).toBe(123456);
  });
});

describe("arredondarPreco", () => {
  it("sobe para o próximo X,90", () => {
    expect(arredondarPreco(1234, "CENTAVO_90")).toBe(1290);
    expect(arredondarPreco(1290, "CENTAVO_90")).toBe(1290);
    expect(arredondarPreco(1291, "CENTAVO_90")).toBe(1390);
  });

  it("sobe para o real inteiro", () => {
    expect(arredondarPreco(1201, "REAL_INTEIRO")).toBe(1300);
    expect(arredondarPreco(1300, "REAL_INTEIRO")).toBe(1300);
  });

  it("sobe para o meio real", () => {
    expect(arredondarPreco(1201, "MEIO_REAL")).toBe(1250);
    expect(arredondarPreco(1251, "MEIO_REAL")).toBe(1300);
  });

  it("nunca arredonda para baixo, o que comeria a margem", () => {
    for (const valor of [1, 99, 100, 101, 1234, 9999]) {
      expect(arredondarPreco(valor, "CENTAVO_90")).toBeGreaterThanOrEqual(
        valor,
      );
      expect(arredondarPreco(valor, "REAL_INTEIRO")).toBeGreaterThanOrEqual(
        valor,
      );
      expect(arredondarPreco(valor, "MEIO_REAL")).toBeGreaterThanOrEqual(valor);
    }
  });
});

describe("ratear", () => {
  it("distribui sem perder nem inventar centavo", () => {
    const partes = ratear(1000, 3);
    expect(partes).toEqual([334, 333, 333]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe("formatarValor", () => {
  it("usa vírgula decimal e duas casas", () => {
    expect(formatarValor(1250)).toBe("12,50");
    expect(formatarValor(0)).toBe("0,00");
  });
});

describe("percentualDe", () => {
  it("calcula taxa de cartão sobre o total", () => {
    expect(percentualDe(10000, 4.99)).toBe(499);
  });
});
