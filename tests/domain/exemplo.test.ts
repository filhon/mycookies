import { describe, expect, it } from "vitest";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import { ERRO_COMUM, EXEMPLO } from "@/lib/domain/exemplo";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";

// A página de venda mostra estes números (`DECISOES.md#d173`).
describe("o cookie da página de venda", () => {
  it("custa R$ 4,41 por unidade", () => {
    expect(EXEMPLO.custo.custoUnitario).toBe(441);
    expect(Math.round(EXEMPLO.custo.custoTotalLote / EXEMPLO.rende)).toBe(441);
  });

  it("pede R$ 8,50 com margem 40% + maquininha 5%", () => {
    const preco = calcularPrecoSugerido(441, EXEMPLO.parametros);
    expect(preco.ok && preco.precoArredondado).toBe(850);
  });

  it("deixa R$ 3,19 no preço praticado de R$ 8,00", () => {
    const taxas = somaTaxas(EXEMPLO.parametros);
    expect(
      verificarPreco(EXEMPLO.precoPraticado, 441, taxas).lucroUnitario,
    ).toBe(319);
  });

  // A página do preço (spec 037). Conferido à mão: 441 × 1,45 = 639,45 → 639;
  // a maquininha leva 5% de 639 = 31,95 → 32; sobram 639 − 441 − 32 = 166,
  // que são 25,98% do preço. Na conta certa, 441 ÷ 0,55 = 802, a maquininha
  // leva 40 e sobram 321, 40,02%.
  it("cobra R$ 6,39 no custo + 45%, e sobram 26% em vez de 40%", () => {
    const errado = calcularPrecoSugerido(441, ERRO_COMUM);
    expect(errado.ok && errado.precoArredondado).toBe(639);
    const taxas = somaTaxas(EXEMPLO.parametros);
    expect(verificarPreco(639, 441, taxas)).toMatchObject({
      lucroUnitario: 166,
      margemReal: 25.98,
    });
  });

  it("deixa 40% no preço certo antes de arredondar", () => {
    const certo = calcularPrecoSugerido(441, EXEMPLO.parametros);
    expect(certo.ok && certo.precoSugerido).toBe(802);
    const taxas = somaTaxas(EXEMPLO.parametros);
    expect(verificarPreco(802, 441, taxas)).toMatchObject({
      lucroUnitario: 321,
      margemReal: 40.02,
    });
  });

  it("abre em cinco parcelas, com o trabalho dela em destaque", () => {
    const segmentos = composicaoDoLote(EXEMPLO.custo);
    expect(segmentos).toHaveLength(5);
    expect(segmentos.filter((s) => s.destaque).map((s) => s.rotulo)).toEqual([
      "Seu trabalho",
    ]);
  });
});
