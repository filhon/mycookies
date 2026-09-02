import { describe, expect, it } from "vitest";
import { derivarFicha } from "@/lib/domain/custoFicha";
import { formatarPercentual, formatarValor } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
  type ParametrosPreco,
} from "@/lib/domain/precificacao";

/**
 * O caso de aceite da spec 002, com os números que estão escritos lá.
 *
 * Lote de 20 cookies, insumos a 1,25, 4,00 e 3,50 centavos por grama, saquinho
 * a 30 centavos. Hora a R$ 25,00, energia mais gás R$ 3,00 por hora, R$ 800,00
 * de despesa fixa em 80 horas produtivas, 90 minutos de produção.
 */
const CASO_DE_ACEITE = {
  itens: [
    {
      categoria: "INGREDIENTE" as const,
      custoUnidadeBaseCorrigido: 1.25,
      quantidade: 500,
    },
    {
      categoria: "INGREDIENTE" as const,
      custoUnidadeBaseCorrigido: 4,
      quantidade: 300,
    },
    {
      categoria: "INGREDIENTE" as const,
      custoUnidadeBaseCorrigido: 3.5,
      quantidade: 200,
    },
    {
      categoria: "EMBALAGEM" as const,
      custoUnidadeBaseCorrigido: 30,
      quantidade: 20,
    },
  ],
  componentes: [],
  tempoProducaoMinutos: 90,
  rendimento: 20,
  operacional: {
    valorHoraTrabalho: 2500,
    custoEnergiaHora: 100,
    custoGasHora: 200,
    // R$ 800,00 rateados em 80 horas produtivas.
    custoIndiretoPorHora: 1000,
  },
  precificacao: {
    metodo: "MARGEM" as const,
    markup: 2.5,
    margemDesejada: 30,
    taxaCartaoConsiderada: 4.99,
    outrasTaxas: 0,
    arredondamento: "CENTAVO_90" as const,
  },
  precoVenda: null,
};

describe("caso de aceite da spec 002", () => {
  const derivado = derivarFicha(CASO_DE_ACEITE);

  it("soma o lote parcela por parcela", () => {
    const { custo } = derivado;

    expect(custo.custoInsumos).toBe(625 + 1200 + 700);
    expect(custo.custoEmbalagem).toBe(600);
    expect(custo.custoMaoDeObra).toBe(3750);
    expect(custo.custoEnergiaGas).toBe(450);
    expect(custo.custoIndireto).toBe(1500);
    expect(custo.custoTotalLote).toBe(8825);
    expect(custo.custoUnitario).toBe(441);
  });

  it("chega ao preço, ao arredondamento e ao que sobra", () => {
    expect(derivado.precoSugerido).toBe(678);
    expect(derivado.precoVenda).toBe(690);
    expect(derivado.verificacao.custoTaxas).toBe(34);
    expect(derivado.verificacao.lucroUnitario).toBe(215);
    expect(derivado.verificacao.margemReal).toBe(31.16);
    expect(derivado.verificacao.markupReal).toBe(1.56);
  });

  it("é isso que a tela mostra", () => {
    // A margem real é gravada com duas casas e exibida com uma: 31,2%, o
    // número que está na tabela da spec.
    expect(formatarPercentual(derivado.verificacao.margemReal)).toBe("31,2%");
    expect(formatarValor(derivado.verificacao.lucroUnitario)).toBe("2,15");
  });

  it("o preço praticado da usuária substitui o sugerido", () => {
    // Ela decidiu vender a R$ 7,50, acima do que a conta pediu.
    const comPrecoDela = derivarFicha({ ...CASO_DE_ACEITE, precoVenda: 750 });

    expect(comPrecoDela.precoSugerido).toBe(678);
    expect(comPrecoDela.precoVenda).toBe(750);
    // 750 − 441 − round(750 × 4,99%) = 750 − 441 − 37.
    expect(comPrecoDela.verificacao.lucroUnitario).toBe(272);
  });
});

describe("calcularPrecoSugerido", () => {
  const base: ParametrosPreco = {
    metodo: "MARGEM",
    markup: 2.5,
    margemDesejada: 30,
    taxaCartaoConsiderada: 4.99,
    outrasTaxas: 0,
    arredondamento: "NENHUM",
  };

  it("embute margem e taxas no divisor, não no multiplicador", () => {
    const resultado = calcularPrecoSugerido(441, base);

    // 441 ÷ (1 − 0,3499). Multiplicar por 1,3499 daria 595, e a margem
    // entregue seria menor que a pedida.
    expect(resultado).toEqual({
      ok: true,
      precoSugerido: 678,
      precoArredondado: 678,
    });
  });

  it("multiplica o custo no método de markup", () => {
    const resultado = calcularPrecoSugerido(441, {
      ...base,
      metodo: "MARKUP",
      markup: 2.5,
    });

    expect(resultado).toEqual({
      ok: true,
      precoSugerido: 1103,
      precoArredondado: 1103,
    });
  });

  it("arredonda o sugerido para a vitrine sem perder o sugerido", () => {
    const resultado = calcularPrecoSugerido(441, {
      ...base,
      arredondamento: "CENTAVO_90",
    });

    expect(resultado).toEqual({
      ok: true,
      precoSugerido: 678,
      precoArredondado: 690,
    });
  });

  it("recusa margem mais taxas a partir de 100%, em vez de devolver Infinity", () => {
    const noLimite = calcularPrecoSugerido(441, {
      ...base,
      margemDesejada: 95,
      taxaCartaoConsiderada: 5,
    });
    const acima = calcularPrecoSugerido(441, {
      ...base,
      margemDesejada: 90,
      taxaCartaoConsiderada: 20,
    });

    expect(noLimite).toEqual({ ok: false, motivo: "MARGEM_IMPOSSIVEL" });
    expect(acima).toEqual({ ok: false, motivo: "MARGEM_IMPOSSIVEL" });
  });

  it("recusa markup que não multiplica nada", () => {
    expect(
      calcularPrecoSugerido(441, { ...base, metodo: "MARKUP", markup: 0 }),
    ).toEqual({ ok: false, motivo: "MARKUP_INVALIDO" });
  });

  it("custo zerado não quebra: o preço é zero, e não NaN", () => {
    const resultado = calcularPrecoSugerido(0, base);

    expect(resultado).toEqual({
      ok: true,
      precoSugerido: 0,
      precoArredondado: 0,
    });
  });
});

describe("somaTaxas", () => {
  it("junta a taxa do cartão com o que mais incide sobre o preço", () => {
    expect(
      somaTaxas({ taxaCartaoConsiderada: 4.99, outrasTaxas: 6 }),
    ).toBeCloseTo(10.99, 10);
  });
});

describe("verificarPreco", () => {
  it("mede o preço praticado, não o pretendido", () => {
    const verificacao = verificarPreco(690, 441, 4.99);

    expect(verificacao.custoTaxas).toBe(34);
    expect(verificacao.lucroUnitario).toBe(215);
    expect(verificacao.margemReal).toBe(31.16);
    expect(verificacao.markupReal).toBe(1.56);
  });

  it("mostra o prejuízo quando o preço não cobre custo e taxas", () => {
    const verificacao = verificarPreco(400, 441, 4.99);

    expect(verificacao.lucroUnitario).toBe(-61);
    expect(verificacao.margemReal).toBeLessThan(0);
  });

  it("sem preço e sem custo, devolve zero em vez de NaN ou Infinity", () => {
    expect(verificarPreco(0, 441, 4.99)).toEqual({
      custoTaxas: 0,
      lucroUnitario: -441,
      margemReal: 0,
      markupReal: 0,
    });

    // Custo zero é o estado de uma ficha recém-aberta, ainda sem itens.
    expect(verificarPreco(690, 0, 4.99).markupReal).toBe(0);
  });
});
