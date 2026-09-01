import { describe, expect, it } from "vitest";
import {
  daBase,
  formatarQuantidade,
  paraBase,
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
