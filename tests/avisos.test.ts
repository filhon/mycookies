import { describe, expect, it } from "vitest";
import {
  avisosDoDia,
  diaEmQueBateu,
  diasAteOFimDoTeste,
  type ResumoParaAvisar,
} from "@/lib/domain/avisos";

const dias = (...entradas: number[]) =>
  Object.fromEntries(
    entradas.map((valor, i) => [
      String(i + 1).padStart(2, "0"),
      { entradas: valor },
    ]),
  );

describe("diaEmQueBateu", () => {
  it("alcança no meio do mês", () => {
    expect(diaEmQueBateu(dias(100, 0, 250, 300), 350)).toBe(3);
  });
  it("alcança no primeiro dia", () => {
    expect(diaEmQueBateu(dias(500, 100), 400)).toBe(1);
  });
  it("não alcança", () => {
    expect(diaEmQueBateu(dias(100, 100), 400)).toBeNull();
  });
  it("alvo zero não é meta", () => {
    expect(diaEmQueBateu(dias(0, 100), 0)).toBeNull();
  });
  it("soma na ordem dos dias, não na das chaves", () => {
    expect(
      diaEmQueBateu({ "10": { entradas: 300 }, "02": { entradas: 100 } }, 350),
    ).toBe(10);
  });
});

describe("diasAteOFimDoTeste", () => {
  it("conta pelo dia de São Paulo: 23h de lá é 02h UTC do dia seguinte", () => {
    const trialAte = new Date("2026-10-09T02:00:00Z"); // 08/10, 23h em SP
    expect(diasAteOFimDoTeste(trialAte, "2026-10-05")).toBe(3);
  });
});

const trial = (acaba: string) => ({
  plano: "TRIAL" as const,
  status: "ATIVA" as const,
  trialAte: new Date(`${acaba}T15:00:00-03:00`),
});

describe("avisosDoDia", () => {
  it("teste a 3 dias sai, a 2 não", () => {
    expect(
      avisosDoDia({ conta: trial("2026-10-09"), hoje: "2026-10-06" }),
    ).toEqual(["teste-acabando"]);
    expect(
      avisosDoDia({ conta: trial("2026-10-09"), hoje: "2026-10-07" }),
    ).toEqual([]);
  });

  it("assinante não recebe teste acabando", () => {
    const conta = { ...trial("2026-10-09"), plano: "ASSINATURA" as const };
    expect(avisosDoDia({ conta, hoje: "2026-10-06" })).toEqual([]);
  });

  // Batida no dia 1: "ontem" para o dia 2.
  const metaBatidaOntem: ResumoParaAvisar = {
    entradas: 500,
    qtdPedidos: 3,
    porDia: dias(500),
    meta: { faturamentoAlvo: 450 },
  };
  const mesComCaixa: ResumoParaAvisar = {
    entradas: 900,
    qtdPedidos: 0,
    porDia: {},
  };

  it("conta liberada à mão recebe meta e mês", () => {
    expect(
      avisosDoDia({
        conta: {},
        hoje: "2026-10-02",
        resumoDeOntem: metaBatidaOntem,
        resumoDoMesAnterior: mesComCaixa,
      }),
    ).toEqual(["meta-batida", "mes-fechado"]);
  });

  it("a meta batida sai no dia seguinte, e só nele", () => {
    const entrada = { conta: {}, resumoDeOntem: metaBatidaOntem };
    expect(avisosDoDia({ ...entrada, hoje: "2026-10-02" })).toEqual([
      "meta-batida",
    ]);
    expect(avisosDoDia({ ...entrada, hoje: "2026-10-03" })).toEqual([]);
  });

  it("avisosPorEmail false corta meta e mês e deixa o teste", () => {
    expect(
      avisosDoDia({
        conta: { ...trial("2026-10-05"), avisosPorEmail: false },
        hoje: "2026-10-02",
        resumoDeOntem: metaBatidaOntem,
        resumoDoMesAnterior: mesComCaixa,
      }),
    ).toEqual(["teste-acabando"]);
  });

  it("encerrada não recebe nada", () => {
    expect(
      avisosDoDia({
        conta: { ...trial("2026-10-05"), status: "ENCERRADA" },
        hoje: "2026-10-02",
        resumoDeOntem: metaBatidaOntem,
        resumoDoMesAnterior: mesComCaixa,
      }),
    ).toEqual([]);
  });

  it("dia 2 com mês vazio não manda resumo", () => {
    expect(
      avisosDoDia({
        conta: {},
        hoje: "2026-10-02",
        resumoDoMesAnterior: { entradas: 0, qtdPedidos: 0, porDia: {} },
      }),
    ).toEqual([]);
  });
});
