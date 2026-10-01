import { describe, expect, it } from "vitest";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import { ERRO_COMUM, EXEMPLO, EXEMPLO_BRIGADEIRO } from "@/lib/domain/exemplo";
import { percentualDe } from "@/lib/domain/money";
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

// A página do brigadeiro (spec 068, sessão A). O lote é o cento.
describe("o cento de brigadeiro", () => {
  const { custo, parametros, precoPraticado } = EXEMPLO_BRIGADEIRO;
  const taxas = somaTaxas(parametros);

  // 4200 + 600 + 4000 + 400 + 500 = 9700. O trabalho, 41%, pesa quase o
  // mesmo que as quatro receitas, 43%, e é a única parcela além delas acima
  // de 10%. A spec dizia "a maior parcela"; com estes números não é.
  it("custa R$ 97,00, e o trabalho pesa quase o mesmo que a receita", () => {
    const soma =
      custo.custoInsumos +
      custo.custoEmbalagem +
      custo.custoMaoDeObra +
      custo.custoEnergiaGas +
      custo.custoIndireto;
    expect(soma).toBe(9700);
    expect(custo.custoTotalLote).toBe(9700);
    expect(custo.custoUnitario).toBe(9700);
    const segmentos = composicaoDoLote(custo);
    expect(
      segmentos.map((s) => [s.rotulo, Math.round(s.fracao * 100)]),
    ).toEqual([
      ["Materiais", 43],
      ["Embalagem", 6],
      ["Seu trabalho", 41],
      ["Energia e gás", 4],
      ["Fatia das despesas fixas", 5],
    ]);
  });

  // 9700 ÷ 0,55 = 17636,4 → 17636; o meio real sobe a 17650.
  it("pede R$ 176,50 o cento", () => {
    const preco = calcularPrecoSugerido(9700, parametros);
    expect(preco).toEqual({
      ok: true,
      precoSugerido: 17636,
      precoArredondado: 17650,
    });
  });

  // A conferência antes do meio real: 5% de 17636 = 881,8 → 882;
  // 17636 − 9700 − 882 = 7054, 40% do preço.
  it("deixa 40% no preço certo antes de arredondar", () => {
    expect(verificarPreco(17636, 9700, taxas)).toMatchObject({
      custoTaxas: 882,
      lucroUnitario: 7054,
      margemReal: 40,
    });
  });

  // No preço da vizinha: 5% de 15000 = 750; 15000 − 9700 − 750 = 4550,
  // 30,33% do preço em vez de 40%.
  it("deixa R$ 45,50 no cento de R$ 150,00", () => {
    expect(verificarPreco(precoPraticado, 9700, taxas)).toMatchObject({
      custoTaxas: 750,
      lucroUnitario: 4550,
      margemReal: 30.33,
    });
  });

  // Sem as duas horas o cento custaria 5700: 5700 ÷ 0,55 = 10363,6 → 10364,
  // e o meio real sobe a 10400. Nesse preço, a maquininha leva 520 e sobram
  // 10400 − 5700 − 520 = 4180, que parecem os 40%; com o custo de verdade,
  // 10400 − 9700 − 520 = 180, 1,73% do preço.
  it("sem a hora de enrolar, cobra R$ 104,00 e sobra R$ 1,80", () => {
    const semHora = custo.custoUnitario - custo.custoMaoDeObra;
    expect(semHora).toBe(5700);
    const errado = calcularPrecoSugerido(semHora, parametros);
    expect(errado.ok && errado.precoArredondado).toBe(10400);
    expect(verificarPreco(10400, semHora, taxas).lucroUnitario).toBe(4180);
    expect(verificarPreco(10400, 9700, taxas)).toMatchObject({
      custoTaxas: 520,
      lucroUnitario: 180,
      margemReal: 1.73,
    });
  });

  // No preço certo: 5% de 17650 = 882,5 → 883; 17650 − 9700 − 883 = 7067.
  // Com 10% de desconto, 17650 − 1765 = 15885; a maquininha leva 794 e
  // sobram 15885 − 9700 − 794 = 5391.
  it("no desconto de 10%, o que sobra cai de R$ 70,67 para R$ 53,91", () => {
    expect(verificarPreco(17650, 9700, taxas).lucroUnitario).toBe(7067);
    const comDesconto = 17650 - percentualDe(17650, 10);
    expect(comDesconto).toBe(15885);
    expect(verificarPreco(comDesconto, 9700, taxas).lucroUnitario).toBe(5391);
  });

  // Um brigadeiro: 9700 ÷ 100 = 97; 97 ÷ 0,55 = 176,4 → 176; o meio real
  // sobe a 200. O cento por cem dá 176,5 → 177. 200 ÷ 176,5 = 1,133: 13%.
  it("o avulso sai a R$ 2,00, 13% acima do cento dividido por cem", () => {
    const umBrigadeiro = Math.round(custo.custoUnitario / 100);
    expect(umBrigadeiro).toBe(97);
    const avulso = calcularPrecoSugerido(umBrigadeiro, parametros);
    expect(avulso).toEqual({
      ok: true,
      precoSugerido: 176,
      precoArredondado: 200,
    });
    expect(Math.round(17650 / 100)).toBe(177);
    expect(Math.round((200 / (17650 / 100) - 1) * 100)).toBe(13);
    // Antes do meio real, o cento por cem também dá 176; o arredondamento
    // sobe 17650 − 17636 = 14 no cento e 200 − 176 = 24 no avulso.
    expect(Math.round(17636 / 100)).toBe(176);
    expect([17650 - 17636, 200 - 176]).toEqual([14, 24]);
  });
});
