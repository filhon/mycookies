import { describe, expect, it } from "vitest";
import {
  custoDeMinutos,
  custoHoraProducao,
  custoIndiretoPorHora,
  DESPESA_SEM_LISTA,
  despesasParaEditar,
  despesasQueFaltam,
  energiaPorHoraDaConta,
  gasPorHoraDoBotijao,
  horaPelaRetirada,
  liquidoRecebido,
  taxaCobrada,
  textoPrazo,
  totalDasDespesas,
} from "@/lib/domain/custosOperacionais";
import { esquemaConfiguracao } from "@/lib/domain/schemas";

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

describe("Fazer a conta (#d286)", () => {
  it("divide a retirada do mês pelas horas que ela produz", () => {
    // O caso da spec: R$ 4.000,00 em 160 h dá R$ 25,00 por hora.
    expect(horaPelaRetirada(400000, 160)).toBe(2500);
  });

  it("divide o botijão pelas horas de forno que ele dura", () => {
    // R$ 120,00 em 4 semanas de 10 h dá R$ 3,00 por hora de forno.
    expect(gasPorHoraDoBotijao(12000, 4, 10)).toBe(300);
  });

  it("divide a luz da confeitaria pelas horas do mês, em centavo inteiro", () => {
    // R$ 200,00 / 160 h = 125 centavos; R$ 100,00 / 3 h = 3333,33…
    expect(energiaPorHoraDaConta(20000, 160)).toBe(125);
    expect(energiaPorHoraDaConta(10000, 3)).toBe(3333);
  });

  it("sem divisor não há resultado, e não zero nem Infinity", () => {
    expect(horaPelaRetirada(400000, 0)).toBeNull();
    expect(energiaPorHoraDaConta(20000, Number.NaN)).toBeNull();
    expect(gasPorHoraDoBotijao(12000, 0, 10)).toBeNull();
    expect(gasPorHoraDoBotijao(12000, 4, 0)).toBeNull();
    expect(gasPorHoraDoBotijao(12000, -1, 10)).toBeNull();
  });
});

describe("as despesas fixas item a item (spec 086)", () => {
  it("com a lista, o total é a soma dela, e não o gravado", () => {
    expect(
      totalDasDespesas({
        despesasFixasMensais: 99999,
        despesasFixasItens: [
          { nome: "Aluguel", valor: 50000 },
          { nome: "Internet", valor: 9990 },
        ],
      }),
    ).toBe(59990);
    expect(
      totalDasDespesas({ despesasFixasMensais: 99999, despesasFixasItens: [] }),
    ).toBe(0);
  });

  it("sem a lista, a conta antiga fica com o total de sempre", () => {
    expect(totalDasDespesas({ despesasFixasMensais: 30000 })).toBe(30000);
    const linhas = despesasParaEditar({ despesasFixasMensais: 30000 });
    expect(linhas).toEqual([{ nome: DESPESA_SEM_LISTA, valor: 30000 }]);
    // Salvar sem mexer grava a linha, e o total não muda.
    expect(
      totalDasDespesas({
        despesasFixasMensais: 30000,
        despesasFixasItens: linhas,
      }),
    ).toBe(30000);
    expect(despesasParaEditar({ despesasFixasMensais: 0 })).toEqual([]);
  });

  it("as pílulas são as comuns que ainda não estão na lista", () => {
    expect(
      despesasQueFaltam([
        { nome: " aluguel ", valor: 0 },
        { nome: "Rende", valor: 2900 },
      ]),
    ).toEqual(["Internet", "Celular", "Contador", "DAS do MEI"]);
  });

  it("o esquema recusa nome vazio, valor negativo e mais de 20 linhas", () => {
    const base = {
      valorHoraTrabalho: 0,
      horasProdutivasMes: 80,
      custoEnergiaHora: 0,
      custoGasHora: 0,
      despesasFixasMensais: 0,
      metodoPadrao: "MARGEM",
      markupPadrao: 2,
      margemPadrao: 30,
      outrasTaxasPadrao: 0,
      arredondamento: "NENHUM",
    } as const;
    const com = (despesasFixasItens: { nome: string; valor: number }[]) =>
      esquemaConfiguracao.safeParse({ ...base, despesasFixasItens }).success;

    expect(com([{ nome: "Aluguel", valor: 50000 }])).toBe(true);
    expect(com([{ nome: " ", valor: 100 }])).toBe(false);
    expect(com([{ nome: "x".repeat(41), valor: 100 }])).toBe(false);
    expect(com([{ nome: "Aluguel", valor: -1 }])).toBe(false);
    expect(
      com(Array.from({ length: 21 }, (_, i) => ({ nome: `D${i}`, valor: 1 }))),
    ).toBe(false);
  });
});
