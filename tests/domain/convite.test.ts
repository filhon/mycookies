import { describe, expect, it } from "vitest";
import {
  ALFABETO_DO_CONVITE,
  formatarCodigo,
  gerarCodigo,
  lerCodigo,
  TAMANHO_DO_CODIGO,
} from "@/lib/domain/convite";

/** Devolve os bytes dados, em ordem, quantas vezes pedirem. */
function sequencia(...bytes: number[]) {
  let i = 0;
  return (destino: Uint8Array) => {
    for (let j = 0; j < destino.length; j++) {
      destino[j] = bytes[i++ % bytes.length]!;
    }
    return destino;
  };
}

describe("o alfabeto", () => {
  it("tem 31 símbolos, sem 0, O, 1, I e L", () => {
    expect(ALFABETO_DO_CONVITE).toHaveLength(31);
    expect(new Set(ALFABETO_DO_CONVITE).size).toBe(31);
    for (const fora of "0O1IL") expect(ALFABETO_DO_CONVITE).not.toContain(fora);
  });
});

describe("gerarCodigo", () => {
  it("sai com oito símbolos do alfabeto", () => {
    const codigo = gerarCodigo((b) => crypto.getRandomValues(b));
    expect(codigo).toHaveLength(TAMANHO_DO_CODIGO);
    expect(lerCodigo(codigo)).toBe(codigo);
  });

  it("mapeia o byte pelo resto de 31", () => {
    expect(gerarCodigo(sequencia(0, 1, 30, 31, 62, 2, 3, 4))).toBe("23Z22456");
  });

  it("descarta os bytes de 248 a 255, para não viciar o sorteio", () => {
    expect(gerarCodigo(sequencia(248, 255, 0))).toBe("22222222");
    expect(gerarCodigo(sequencia(247))).toBe("ZZZZZZZZ");
  });
});

describe("formatarCodigo e lerCodigo", () => {
  it("vão e voltam", () => {
    expect(formatarCodigo("K7Q3M9XA")).toBe("K7Q3-M9XA");
    expect(lerCodigo(formatarCodigo("K7Q3M9XA"))).toBe("K7Q3M9XA");
  });

  it("lerCodigo aceita minúscula, espaço e hífen", () => {
    expect(lerCodigo("k7q3m9xa")).toBe("K7Q3M9XA");
    expect(lerCodigo(" k7q3 m9xa ")).toBe("K7Q3M9XA");
    expect(lerCodigo("K7Q3-M9XA")).toBe("K7Q3M9XA");
    expect(lerCodigo("k7-q3 m9-xa")).toBe("K7Q3M9XA");
  });

  it.each([
    "",
    "K7Q3M9X",
    "K7Q3M9XAB",
    "K7Q3M9X0",
    "K7Q3M9XO",
    "K7Q3M9X1",
    "K7Q3M9XI",
    "K7Q3M9XL",
    "K7Q3_M9XA",
    "K7Q3M9XÁ",
  ])("lerCodigo(%j) é null", (texto) => {
    expect(lerCodigo(texto)).toBeNull();
  });
});
