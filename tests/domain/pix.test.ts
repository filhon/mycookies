import { describe, expect, it } from "vitest";
import { brCodePix, chavePix } from "@/lib/domain/pix";

/**
 * As expectativas com valor foram calculadas fora daqui, campo a campo e com o
 * CRC do `binascii.crc_hqx` do Python (CCITT, início 0xFFFF), que bate com o
 * exemplo do manual. Calcular com a própria função seria conferir ela com ela.
 */
describe("brCodePix", () => {
  it("reproduz o exemplo do manual do Banco Central, CRC incluído", () => {
    // Manual de Padrões para Iniciação do Pix, v2.10.0, conferido em 2026-10-03:
    // sem valor e sem identificador (`***`).
    expect(
      brCodePix({
        chave: "123e4567-e12b-12d1-a456-426655440000",
        nome: "Fulano de Tal",
        cidade: "BRASILIA",
        valor: 0,
        identificador: "",
      }),
    ).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("leva o valor e o código do pedido sem o hífen, e tira o acento do nome", () => {
    expect(
      brCodePix({
        chave: "+5581996796370",
        nome: "Maynara Honório",
        cidade: "Recife",
        valor: 6800,
        identificador: "P-260915-K3F",
      }),
    ).toBe(
      "00020126360014br.gov.bcb.pix0114+5581996796370520400005303986540568.005802BR5915Maynara Honorio6006Recife62140510P260915K3F6304996E",
    );
  });

  it("corta o nome em 25 e a cidade em 15, e escreve um centavo", () => {
    expect(
      brCodePix({
        chave: "fulano@exemplo.com",
        nome: "Maria Aparecida dos Santos Oliveira",
        cidade: "São José dos Campos",
        valor: 1,
        identificador: "P-261003-AB1",
      }),
    ).toBe(
      "00020126400014br.gov.bcb.pix0118fulano@exemplo.com52040000530398654040.015802BR5925Maria Aparecida dos Santo6015Sao Jose dos Ca62140510P261003AB163044AF1",
    );
  });

  it("escreve R$ 1.234,56 como 1234.56", () => {
    expect(
      brCodePix({
        chave: "12345678900",
        nome: "Ana",
        cidade: "Recife",
        valor: 123456,
        identificador: "",
      }),
    ).toBe(
      "00020126330014br.gov.bcb.pix01111234567890052040000530398654071234.565802BR5903Ana6006Recife62070503***6304380F",
    );
  });

  it("corta o identificador em 25, só com letras e números", () => {
    const codigo = brCodePix({
      chave: "a@b.co",
      nome: "Ana",
      cidade: "Recife",
      valor: 100,
      identificador: "P-1234567890-1234567890-1234567890",
    });
    expect(codigo).toContain("62290525P12345678901234567890123");
  });
});

describe("chavePix", () => {
  it.each([
    ["(81) 99679-6370", "+5581996796370"],
    ["81 99679-6370", "+5581996796370"],
    ["+55 81 99679-6370", "+5581996796370"],
    ["123.456.789-00", "12345678900"],
    ["12.345.678/0001-90", "12345678000190"],
    // Onze dígitos sem pontuação podem ser CPF ou celular: ficam como estão.
    ["81996796370", "81996796370"],
    [" Maria@Exemplo.com ", "maria@exemplo.com"],
    [
      "123E4567-E12B-12D1-A456-426655440000",
      "123e4567-e12b-12d1-a456-426655440000",
    ],
  ])("%s → %s", (digitada, chave) => {
    expect(chavePix(digitada)).toBe(chave);
  });
});
