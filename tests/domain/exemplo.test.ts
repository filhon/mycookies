import { describe, expect, it } from "vitest";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import { EXEMPLO } from "@/lib/domain/exemplo";
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

  it("abre em cinco parcelas, com o trabalho dela em destaque", () => {
    const segmentos = composicaoDoLote(EXEMPLO.custo);
    expect(segmentos).toHaveLength(5);
    expect(segmentos.filter((s) => s.destaque).map((s) => s.rotulo)).toEqual([
      "Seu trabalho",
    ]);
  });
});
