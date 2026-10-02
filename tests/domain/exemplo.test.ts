import { describe, expect, it } from "vitest";
import { composicaoDoLote } from "@/lib/domain/custoFicha";
import {
  boloDe,
  ERRO_COMUM,
  EXEMPLO,
  EXEMPLO_BOLO_DE_POTE,
  EXEMPLO_BRIGADEIRO,
  NO_APLICATIVO,
  POR_BOLO,
} from "@/lib/domain/exemplo";
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

// A página do bolo por quilo (spec 068, sessão B). A unidade é o quilo; o
// bolo é uma parte fixa (caixa, base, decorar: 1300 + 2000 + 200 = 3500)
// mais uma parte por quilo (2800 + 1500 + 300 + 100 = 4700).
describe("o bolo por quilo", () => {
  const { custo, parametros, precoPraticado } = boloDe(2);
  const taxas = somaTaxas(parametros);

  // 3500 + 4700 × 1 = 8200; × 2 = 12900, o quilo a 6450; × 3 = 17600, o
  // quilo a 5866,7 → 5867. Os preços: 8200 ÷ 0,55 = 14909,1 → 14909 → 14950;
  // 6450 ÷ 0,55 = 11727,3 → 11727 → 11750; 5867 ÷ 0,55 = 10667,3 → 10667
  // → 10700.
  it("o quilo do bolo pequeno custa mais: R$ 149,50, R$ 117,50 e R$ 107,00", () => {
    const tabela = [1, 2, 3].map((quilos) => {
      const bolo = boloDe(quilos);
      const preco = calcularPrecoSugerido(bolo.custo.custoUnitario, parametros);
      return [
        bolo.rende,
        bolo.custo.custoTotalLote,
        bolo.custo.custoUnitario,
        preco.ok && preco.precoArredondado,
      ];
    });
    expect(tabela).toEqual([
      [1, 8200, 8200, 14950],
      [2, 12900, 6450, 11750],
      [3, 17600, 5867, 10700],
    ]);
  });

  // Por quilo no de 2 kg: 2800 + 650 + 2500 + 300 + 200 = 6450, a soma do
  // que a `ContaAberta` e os passos mostram. Do bolo: 5600 de 12900 são 43%,
  // a caixa 10%, o trabalho 39%, o forno 5%, as fixas 3%.
  it("abre em cinco parcelas que somam o custo do quilo", () => {
    const segmentos = composicaoDoLote(custo);
    expect(segmentos.map((s) => Math.round(s.centavos / 2))).toEqual([
      2800, 650, 2500, 300, 200,
    ]);
    expect(
      segmentos.map((s) => [s.rotulo, Math.round(s.fracao * 100)]),
    ).toEqual([
      ["Materiais", 43],
      ["Embalagem", 10],
      ["Seu trabalho", 39],
      ["Energia e gás", 5],
      ["Fatia das despesas fixas", 3],
    ]);
  });

  // Antes do meio real: 5% de 11727 = 586,35 → 586; 11727 − 6450 − 586 =
  // 4691, 40% do preço.
  it("deixa 40% no preço certo antes de arredondar", () => {
    expect(verificarPreco(11727, 6450, taxas)).toMatchObject({
      custoTaxas: 586,
      lucroUnitario: 4691,
      margemReal: 40,
    });
  });

  // No quilo da padaria: 5% de 10000 = 500; 10000 − 6450 − 500 = 3050.
  it("deixa R$ 30,50 no quilo de R$ 100,00", () => {
    expect(verificarPreco(precoPraticado, 6450, taxas)).toMatchObject({
      custoTaxas: 500,
      lucroUnitario: 3050,
      margemReal: 30.5,
    });
  });

  // O quilo do bolo de 2 kg no de 1 kg: 5% de 11750 = 587,5 → 588;
  // 11750 − 8200 − 588 = 2962, 25,21%. No de 3 kg: 11750 − 5867 − 588 =
  // 5295, 45,06%.
  it("um preço de quilo pra qualquer tamanho deixa 25% no bolo de 1 kg e 45% no de 3", () => {
    expect(verificarPreco(11750, 8200, taxas)).toMatchObject({
      custoTaxas: 588,
      lucroUnitario: 2962,
      margemReal: 25.21,
    });
    expect(verificarPreco(11750, 5867, taxas)).toMatchObject({
      lucroUnitario: 5295,
      margemReal: 45.06,
    });
  });

  // A fatia de 100 g: 6450 ÷ 10 = 645.
  it("a fatia de 100 g custa R$ 6,45", () => {
    expect(Math.round(custo.custoUnitario / 10)).toBe(645);
  });
});

// A página do bolo de pote (spec 068, sessão C). O lote é de 10 potes; o
// balcão usa os parâmetros do cookie, o aplicativo troca a maquininha por
// 20% de comissão e pagamento online.
describe("o bolo de pote", () => {
  const { custo, parametros, precoPraticado } = EXEMPLO_BOLO_DE_POTE;
  const taxas = somaTaxas(parametros);
  const taxasDoApp = somaTaxas(NO_APLICATIVO);

  // 4200 + 1450 + 3000 + 250 + 200 = 9100, o pote a 910. Por pote: 420 +
  // 145 + 300 + 25 + 20. A embalagem, 1450 de 9100, são 16%: mais que o
  // forno e as fixas juntos (450).
  it("custa R$ 9,10 o pote, e a embalagem pesa 16%", () => {
    const segmentos = composicaoDoLote(custo);
    expect(segmentos.reduce((s, x) => s + x.centavos, 0)).toBe(9100);
    expect(custo.custoTotalLote).toBe(9100);
    expect(custo.custoUnitario).toBe(910);
    expect(segmentos.map((s) => Math.round(s.centavos / 10))).toEqual([
      420, 145, 300, 25, 20,
    ]);
    expect(
      segmentos.map((s) => [s.rotulo, Math.round(s.fracao * 100)]),
    ).toEqual([
      ["Materiais", 46],
      ["Embalagem", 16],
      ["Seu trabalho", 33],
      ["Energia e gás", 3],
      ["Fatia das despesas fixas", 2],
    ]);
  });

  // 910 ÷ 0,55 = 1654,5 → 1655; o meio real sobe a 1700. Antes de
  // arredondar: 5% de 1655 = 82,75 → 83; 1655 − 910 − 83 = 662, 40%. Na
  // etiqueta: 5% de 1700 = 85; 1700 − 910 − 85 = 705, 41,47%.
  it("pede R$ 17,00 no balcão, e sobram R$ 7,05", () => {
    expect(calcularPrecoSugerido(910, parametros)).toEqual({
      ok: true,
      precoSugerido: 1655,
      precoArredondado: 1700,
    });
    expect(verificarPreco(1655, 910, taxas)).toMatchObject({
      custoTaxas: 83,
      lucroUnitario: 662,
      margemReal: 40,
    });
    expect(verificarPreco(1700, 910, taxas)).toMatchObject({
      custoTaxas: 85,
      lucroUnitario: 705,
      margemReal: 41.47,
    });
  });

  // No preço da feira: 5% de 1500 = 75; 1500 − 910 − 75 = 515.
  it("deixa R$ 5,15 no pote de R$ 15,00", () => {
    expect(verificarPreco(precoPraticado, 910, taxas).lucroUnitario).toBe(515);
  });

  // 910 ÷ (1 − 0,40 − 0,20) = 910 ÷ 0,40 = 2275; o meio real sobe a 2300.
  // 20% de 2300 = 460; 2300 − 910 − 460 = 930, 40,43%.
  it("pede R$ 23,00 no aplicativo, e sobram R$ 9,30", () => {
    expect(taxasDoApp).toBe(20);
    expect(calcularPrecoSugerido(910, NO_APLICATIVO)).toEqual({
      ok: true,
      precoSugerido: 2275,
      precoArredondado: 2300,
    });
    expect(verificarPreco(2300, 910, taxasDoApp)).toMatchObject({
      custoTaxas: 460,
      lucroUnitario: 930,
      margemReal: 40.43,
    });
  });

  // O pote do balcão no aplicativo: 20% de 1700 = 340; 1700 − 910 − 340 =
  // 450, 26,47% em vez de 40%.
  it("o pote de R$ 17,00 no aplicativo deixa R$ 4,50, 26%", () => {
    expect(verificarPreco(1700, 910, taxasDoApp)).toMatchObject({
      custoTaxas: 340,
      lucroUnitario: 450,
      margemReal: 26.47,
    });
  });
});

// A página de doces (spec 068, sessão D): a tabela dos quatro exemplos.
describe("a tabela da página de doces", () => {
  const taxas = somaTaxas(EXEMPLO.parametros);
  const parte = (valor: number, total: number) =>
    Math.round((valor / total) * 100);

  // 7488 ÷ 10584 = 70,7% · 4000 ÷ 9700 = 41,2% · a parte fixa do bolo,
  // 1300 + 2000 + 200 = 3500, sobre 12900 = 27,1% · 1450 ÷ 9100 = 15,9%.
  it("o que pesa: 71%, 41%, 27% e 16%", () => {
    const fixoDoBolo =
      POR_BOLO.custoEmbalagem +
      POR_BOLO.custoMaoDeObra +
      POR_BOLO.custoIndireto;
    expect(fixoDoBolo).toBe(3500);
    expect([
      parte(EXEMPLO.custo.custoInsumos, EXEMPLO.custo.custoTotalLote),
      parte(
        EXEMPLO_BRIGADEIRO.custo.custoMaoDeObra,
        EXEMPLO_BRIGADEIRO.custo.custoTotalLote,
      ),
      parte(fixoDoBolo, boloDe(2).custo.custoTotalLote),
      parte(
        EXEMPLO_BOLO_DE_POTE.custo.custoEmbalagem,
        EXEMPLO_BOLO_DE_POTE.custo.custoTotalLote,
      ),
    ]).toEqual([71, 41, 27, 16]);
  });

  // 441 ÷ 0,55 → 850 · 9700 ÷ 0,55 → 17650 · 6450 ÷ 0,55 → 11750 ·
  // 910 ÷ 0,55 → 1700, todos no meio real.
  it("os preços: R$ 8,50, R$ 176,50, R$ 117,50 e R$ 17,00", () => {
    const etiqueta = (custo: number) => {
      const r = calcularPrecoSugerido(custo, EXEMPLO.parametros);
      return r.ok && r.precoArredondado;
    };
    expect([
      etiqueta(EXEMPLO.custo.custoUnitario),
      etiqueta(EXEMPLO_BRIGADEIRO.custo.custoUnitario),
      etiqueta(boloDe(2).custo.custoUnitario),
      etiqueta(EXEMPLO_BOLO_DE_POTE.custo.custoUnitario),
    ]).toEqual([850, 17650, 11750, 1700]);
  });

  // Cookie: 639 com custo 441 deixa 166, 25,98%. Brigadeiro: 10400 com
  // custo 9700 deixa 180, 1,73%. Bolo: 11750 com o quilo do de 1 kg, 8200,
  // deixa 11750 − 8200 − 588 = 2962, 25,21%. Pote: 1700 no aplicativo deixa
  // 1700 − 910 − 340 = 450, 26,47%. Na página, sem casas: 26, 2, 25 e 26.
  it("o que sobra no erro: 26%, 2%, 25% e 26%", () => {
    const cookie = calcularPrecoSugerido(441, ERRO_COMUM);
    expect(cookie.ok && cookie.precoArredondado).toBe(639);
    const semHora = calcularPrecoSugerido(5700, EXEMPLO.parametros);
    expect(semHora.ok && semHora.precoArredondado).toBe(10400);
    expect(boloDe(1).custo.custoUnitario).toBe(8200);
    expect([
      verificarPreco(639, 441, taxas).margemReal,
      verificarPreco(10400, 9700, taxas).margemReal,
      verificarPreco(11750, 8200, taxas).margemReal,
      verificarPreco(1700, 910, somaTaxas(NO_APLICATIVO)).margemReal,
    ]).toEqual([25.98, 1.73, 25.21, 26.47]);
  });
});
