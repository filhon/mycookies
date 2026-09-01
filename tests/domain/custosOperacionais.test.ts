import { describe, expect, it } from "vitest";
import {
  custoDeMinutos,
  custoHoraProducao,
  custoIndiretoPorHora,
  liquidoRecebido,
  taxaCobrada,
  textoPrazo,
} from "@/lib/domain/custosOperacionais";

describe("custoIndiretoPorHora", () => {
  it("rateia a despesa fixa pelas horas produtivas", () => {
    // R$ 800,00 em 80 horas = R$ 10,00 por hora. É o caso da spec 002.
    expect(custoIndiretoPorHora(80000, 80)).toBe(1000);
  });

  it("devolve zero, e não Infinity, quando não há horas produtivas", () => {
    expect(custoIndiretoPorHora(80000, 0)).toBe(0);
    expect(custoIndiretoPorHora(80000, -10)).toBe(0);
    expect(custoIndiretoPorHora(80000, Number.NaN)).toBe(0);
  });

  it("arredonda para centavo inteiro", () => {
    // 100000 / 3 = 33333,33… centavos por hora.
    expect(custoIndiretoPorHora(100000, 3)).toBe(33333);
  });
});

describe("custoHoraProducao", () => {
  it("soma trabalho, energia, gás e o rateio da despesa fixa", () => {
    const total = custoHoraProducao({
      valorHoraTrabalho: 2500,
      horasProdutivasMes: 80,
      custoEnergiaHora: 100,
      custoGasHora: 200,
      despesasFixasMensais: 80000,
    });

    expect(total).toBe(3800);
  });

  it("sem horas produtivas, a despesa fixa fica de fora da hora", () => {
    const total = custoHoraProducao({
      valorHoraTrabalho: 2500,
      horasProdutivasMes: 0,
      custoEnergiaHora: 100,
      custoGasHora: 200,
      despesasFixasMensais: 80000,
    });

    expect(total).toBe(2800);
  });
});

describe("custoDeMinutos", () => {
  it("converte custo por hora em custo de fornada", () => {
    // 1,5 h de mão de obra a R$ 25,00: os 3750 centavos do caso de aceite.
    expect(custoDeMinutos(2500, 90)).toBe(3750);
  });

  it("não cobra nada por tempo nenhum", () => {
    expect(custoDeMinutos(2500, 0)).toBe(0);
  });
});

describe("taxaCobrada e liquidoRecebido", () => {
  const credito = { taxaPercentual: 4.99, taxaFixa: 0 };

  it("desconta a taxa percentual da venda", () => {
    expect(taxaCobrada(10000, credito)).toBe(499);
    expect(liquidoRecebido(10000, credito)).toBe(9501);
  });

  it("soma a taxa fixa ao percentual", () => {
    const comFixa = { taxaPercentual: 2, taxaFixa: 50 };
    expect(taxaCobrada(10000, comFixa)).toBe(250);
    expect(liquidoRecebido(10000, comFixa)).toBe(9750);
  });

  it("nunca cobra mais do que a venda inteira", () => {
    const absurda = { taxaPercentual: 90, taxaFixa: 5000 };
    expect(taxaCobrada(1000, absurda)).toBe(1000);
    expect(liquidoRecebido(1000, absurda)).toBe(0);
  });

  it("pagamento sem taxa entrega a venda inteira", () => {
    expect(liquidoRecebido(10000, { taxaPercentual: 0, taxaFixa: 0 })).toBe(
      10000,
    );
  });
});

describe("textoPrazo", () => {
  it("fala em dias, e diz 'na hora' quando não há espera", () => {
    expect(textoPrazo(0)).toBe("cai na hora");
    expect(textoPrazo(1)).toBe("cai em 1 dia");
    expect(textoPrazo(30)).toBe("cai em 30 dias");
  });
});
