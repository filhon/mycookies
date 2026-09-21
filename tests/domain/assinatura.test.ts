import { describe, expect, it } from "vitest";
import {
  acessoAteDaAssinatura,
  diasRestantes,
  economiaAnual,
  FOLGA_COBRANCA_DIAS,
  FOLGA_RENOVACAO_DIAS,
  fraseDoTeste,
  situacaoDaConta,
} from "@/lib/domain/assinatura";

const DIA_MS = 24 * 60 * 60 * 1000;

describe("situacaoDaConta", () => {
  it("sem plano é livre (liberada à mão)", () => {
    expect(situacaoDaConta({}, Date.now())).toEqual({ tipo: "livre" });
  });

  it("em teste, com dias restantes", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const trialAteMs = agora + 5 * DIA_MS;
    expect(situacaoDaConta({ plano: "TRIAL", trialAteMs }, agora)).toEqual({
      tipo: "teste",
      diasRestantes: 5,
      acabaEmMs: trialAteMs,
    });
  });

  it("teste vencido", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const trialAteMs = agora - 1;
    expect(situacaoDaConta({ plano: "TRIAL", trialAteMs }, agora)).toEqual({
      tipo: "vencida",
      foi: "teste",
    });
  });

  it("assinante", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const assinaturaAteMs = agora + 30 * DIA_MS;
    expect(
      situacaoDaConta({ plano: "ASSINATURA", assinaturaAteMs }, agora),
    ).toEqual({ tipo: "assinante", renovaEmMs: assinaturaAteMs });
  });

  it("assinatura vencida", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const assinaturaAteMs = agora - 1;
    expect(
      situacaoDaConta({ plano: "ASSINATURA", assinaturaAteMs }, agora),
    ).toEqual({ tipo: "vencida", foi: "assinatura" });
  });

  it("a borda agora === ate ainda não é vencida: a regra usa '>', a tela também", () => {
    const ate = Date.parse("2026-09-20T10:00:00Z");
    expect(situacaoDaConta({ plano: "TRIAL", trialAteMs: ate }, ate).tipo).toBe(
      "teste",
    );
    expect(
      situacaoDaConta({ plano: "ASSINATURA", assinaturaAteMs: ate }, ate).tipo,
    ).toBe("assinante");

    // Um milissegundo depois, sim: o mesmo operador que a regra usa.
    expect(
      situacaoDaConta({ plano: "TRIAL", trialAteMs: ate }, ate + 1),
    ).toEqual({ tipo: "vencida", foi: "teste" });
  });
});

describe("diasRestantes", () => {
  it("às 23h59 do último dia ainda mostra 1, não 0", () => {
    const ate = Date.parse("2026-09-21T00:00:00Z");
    const agora = ate - 60_000; // um minuto antes da meia-noite
    expect(diasRestantes(ate, agora)).toBe(1);
  });

  it("um minuto depois do fim já é 0", () => {
    const ate = Date.parse("2026-09-21T00:00:00Z");
    const agora = ate + 60_000;
    expect(diasRestantes(ate, agora)).toBe(0);
  });
});

describe("fraseDoTeste", () => {
  it("0 dias: acaba hoje", () => {
    expect(fraseDoTeste(0)).toBe("Seu teste grátis acaba hoje");
  });

  it("1 dia: acaba amanhã", () => {
    expect(fraseDoTeste(1)).toBe("Seu teste grátis acaba amanhã");
  });

  it("9 dias: acaba em 9 dias", () => {
    expect(fraseDoTeste(9)).toBe("Seu teste grátis acaba em 9 dias");
  });
});

describe("acessoAteDaAssinatura", () => {
  const periodoInicioMs = Date.parse("2026-09-01T00:00:00Z");
  const periodoFimMs = Date.parse("2026-10-01T00:00:00Z");
  const agoraMs = Date.parse("2026-09-15T00:00:00Z");

  it("active: fim do período + folga de renovação", () => {
    expect(
      acessoAteDaAssinatura({
        status: "active",
        periodoInicioMs,
        periodoFimMs,
        agoraMs,
      }),
    ).toBe(periodoFimMs + FOLGA_RENOVACAO_DIAS * DIA_MS);
  });

  it("trialing: mesma regra do active", () => {
    expect(
      acessoAteDaAssinatura({
        status: "trialing",
        periodoInicioMs,
        periodoFimMs,
        agoraMs,
      }),
    ).toBe(periodoFimMs + FOLGA_RENOVACAO_DIAS * DIA_MS);
  });

  it("past_due: início do período + folga de cobrança", () => {
    expect(
      acessoAteDaAssinatura({
        status: "past_due",
        periodoInicioMs,
        periodoFimMs,
        agoraMs,
      }),
    ).toBe(periodoInicioMs + FOLGA_COBRANCA_DIAS * DIA_MS);
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])(
    "%s: agora",
    (status) => {
      expect(
        acessoAteDaAssinatura({
          status,
          periodoInicioMs,
          periodoFimMs,
          agoraMs,
        }),
      ).toBe(agoraMs);
    },
  );

  it("nunca fica menor que trialAteMs: um incomplete não encurta o teste", () => {
    const trialAteMs = agoraMs + 10 * DIA_MS;
    expect(
      acessoAteDaAssinatura({
        status: "incomplete",
        periodoInicioMs,
        periodoFimMs,
        trialAteMs,
        agoraMs,
      }),
    ).toBe(trialAteMs);
  });
});

describe("economiaAnual", () => {
  it("anual custando dez mensais economiza dois meses", () => {
    const mensal = 3900;
    const anual = mensal * 10;
    expect(economiaAnual(mensal, anual)).toBe(mensal * 2);
  });

  it("anual igual a doze mensais não economiza nada", () => {
    const mensal = 3900;
    expect(economiaAnual(mensal, mensal * 12)).toBe(0);
  });
});
