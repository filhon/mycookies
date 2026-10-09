import { describe, expect, it } from "vitest";
import {
  acessoAteDaAssinatura,
  cobrancaPrevistaMs,
  fraseDaCobranca,
  fraseDaEconomia,
  fraseDoPlano,
  legendaDaAssinatura,
  mensalDoPlano,
  O_QUE_O_RECURSO_FAZ,
  oQueOCompletoTraz,
  diasRestantes,
  economiaAnual,
  FOLGA_COBRANCA_DIAS,
  FOLGA_RENOVACAO_DIAS,
  fraseDoTeste,
  pacoteDaMetadata,
  permite,
  situacaoDaConta,
  sobraQuePagaOPlano,
  type Situacao,
  unidadesQuePagam,
  valorComDesconto,
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

  it("assinante sem pacote é essencial (o único antes da 032)", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const assinaturaAteMs = agora + 30 * DIA_MS;
    expect(
      situacaoDaConta({ plano: "ASSINATURA", assinaturaAteMs }, agora),
    ).toEqual({
      tipo: "assinante",
      renovaEmMs: assinaturaAteMs,
      pacote: "ESSENCIAL",
    });
  });

  it("assinante devolve o pacote gravado", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const assinaturaAteMs = agora + 30 * DIA_MS;
    expect(
      situacaoDaConta(
        { plano: "ASSINATURA", assinaturaAteMs, pacote: "COMPLETO" },
        agora,
      ),
    ).toEqual({
      tipo: "assinante",
      renovaEmMs: assinaturaAteMs,
      pacote: "COMPLETO",
    });
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

describe("permite (spec 032)", () => {
  const livre: Situacao = { tipo: "livre" };
  const teste: Situacao = { tipo: "teste", diasRestantes: 5, acabaEmMs: 1 };
  const vencida: Situacao = { tipo: "vencida", foi: "teste" };
  const essencial: Situacao = {
    tipo: "assinante",
    renovaEmMs: 1,
    pacote: "ESSENCIAL",
  };
  const completo: Situacao = {
    tipo: "assinante",
    renovaEmMs: 1,
    pacote: "COMPLETO",
  };

  it.each<[string, Situacao, boolean]>([
    ["livre", livre, true],
    ["teste", teste, true],
    ["vencida", vencida, false],
    ["assinante do essencial", essencial, false],
    ["assinante do completo", completo, true],
  ])("%s", (_, situacao, esperado) => {
    expect(permite(situacao, "cardapio")).toBe(esperado);
    expect(permite(situacao, "ajudante")).toBe(esperado);
  });

  it("assinante sem pacote gravado não tem cardápio nem ajudante", () => {
    const agora = Date.parse("2026-09-20T10:00:00Z");
    const situacao = situacaoDaConta(
      { plano: "ASSINATURA", assinaturaAteMs: agora + DIA_MS },
      agora,
    );
    expect(permite(situacao, "cardapio")).toBe(false);
    expect(permite(situacao, "ajudante")).toBe(false);
  });
});

describe("pacoteDaMetadata", () => {
  it("só COMPLETO, maiúsculo, é completo; o resto é essencial (#d169)", () => {
    expect(pacoteDaMetadata("COMPLETO")).toBe("COMPLETO");
    expect(pacoteDaMetadata(undefined)).toBe("ESSENCIAL");
    expect(pacoteDaMetadata("")).toBe("ESSENCIAL");
    expect(pacoteDaMetadata("completo")).toBe("ESSENCIAL");
    expect(pacoteDaMetadata("PREMIUM")).toBe("ESSENCIAL");
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

describe("unidadesQuePagam (spec 039)", () => {
  it("arredonda para cima: R$ 39 a R$ 8,50 são 5 cookies", () => {
    expect(unidadesQuePagam(3900, 850)).toBe(5);
  });

  it("o valor exato de uma unidade é uma", () => {
    expect(unidadesQuePagam(850, 850)).toBe(1);
  });

  it("preço zero não paga nada: a linha não aparece", () => {
    expect(unidadesQuePagam(3900, 0)).toBe(0);
  });
});

describe("sobraQuePagaOPlano (spec 048)", () => {
  const cookie = {
    nome: "Cookie Oreo",
    quantidade: 40,
    receita: 36000,
    lucro: 16000,
  };

  it("R$ 49 com R$ 4,00 de sobra por unidade são 13", () => {
    expect(sobraQuePagaOPlano({ a: cookie }, 4900)).toEqual({
      nome: "Cookie Oreo",
      unidades: 13,
    });
  });

  it("sem produtos não há linha", () => {
    expect(sobraQuePagaOPlano({}, 4900)).toBeNull();
  });

  it("o mais vendido ganha, e no empate a maior receita", () => {
    const brigadeiro = {
      nome: "Brigadeiro",
      quantidade: 40,
      receita: 9000,
      lucro: 5000,
    };
    const bolo = { nome: "Bolo", quantidade: 2, receita: 20000, lucro: 10000 };
    expect(
      sobraQuePagaOPlano({ b: brigadeiro, a: cookie, c: bolo }, 4900)?.nome,
    ).toBe("Cookie Oreo");
  });

  it("lucro negativo ou zero do mais vendido não paga nada", () => {
    expect(
      sobraQuePagaOPlano({ a: { ...cookie, lucro: -800 } }, 4900),
    ).toBeNull();
    expect(sobraQuePagaOPlano({ a: { ...cookie, lucro: 0 } }, 4900)).toBeNull();
  });

  it("quantidade zero não conta como vendido", () => {
    expect(
      sobraQuePagaOPlano({ a: { ...cookie, quantidade: 0 } }, 4900),
    ).toBeNull();
  });
});

describe("o resumo da assinatura (spec 084)", () => {
  // `formatarMoeda` usa o espaço inseparável do Intl entre "R$" e o número.
  const semNbsp = (texto: string) => texto.replace(/ /g, " ");
  // 12 de novembro, meio-dia em Brasília.
  const dozeNov = Date.parse("2026-11-12T15:00:00Z");

  it("diz o plano, o valor e o período", () => {
    expect(
      semNbsp(fraseDoPlano("ESSENCIAL", { valor: 3990, periodo: "mensal" })),
    ).toBe("Plano Essencial · R$ 39,90 por mês");
    expect(
      semNbsp(fraseDoPlano("COMPLETO", { valor: 59900, periodo: "anual" })),
    ).toBe("Plano Completo · R$ 599,00 por ano");
  });

  it("diz quando renova e com que cartão, ou quando termina", () => {
    expect(
      fraseDaCobranca({ ateMs: dozeNov, final: "4242", cancela: false }),
    ).toBe("Renova em 12 de novembro, no cartão final 4242.");
    expect(
      fraseDaCobranca({ ateMs: dozeNov, final: null, cancela: false }),
    ).toBe("Renova em 12 de novembro.");
    expect(
      fraseDaCobranca({ ateMs: dozeNov, final: "4242", cancela: true }),
    ).toBe("Termina em 12 de novembro. Até lá, tudo continua aberto.");
  });

  it("o dia é o de Brasília, e não o do relógio da máquina", () => {
    // 01h UTC do dia 13 ainda é dia 12 em Brasília.
    const tarde = Date.parse("2026-11-13T01:00:00Z");
    expect(fraseDaCobranca({ ateMs: tarde, final: null, cancela: false })).toBe(
      "Renova em 12 de novembro.",
    );
  });

  it("a legenda tira a folga de `assinaturaAte` e abrevia o mês", () => {
    const assinaturaAteMs = dozeNov + FOLGA_RENOVACAO_DIAS * DIA_MS;
    expect(cobrancaPrevistaMs(assinaturaAteMs)).toBe(dozeNov);
    expect(legendaDaAssinatura("ESSENCIAL", assinaturaAteMs)).toBe(
      "Essencial · renova em 12 nov",
    );
  });

  it("o completo é dito só para quem não o tem", () => {
    expect(oQueOCompletoTraz("ESSENCIAL")).toEqual([
      O_QUE_O_RECURSO_FAZ.cardapio,
      O_QUE_O_RECURSO_FAZ.ajudante,
    ]);
    expect(oQueOCompletoTraz("COMPLETO")).toEqual([]);
  });

  it("a economia do anual some quando não compensa", () => {
    expect(semNbsp(fraseDaEconomia({ mensal: 3990, anual: 39900 })!)).toBe(
      "No anual você paga R$ 79,80 a menos por ano",
    );
    expect(fraseDaEconomia({ mensal: 3990, anual: 47880 })).toBeNull();
  });
});

describe("mensalDoPlano (spec 086)", () => {
  it("o anual entra nas despesas dividido por 12", () => {
    expect(mensalDoPlano({ valor: 2900, periodo: "mensal" })).toBe(2900);
    expect(mensalDoPlano({ valor: 29000, periodo: "anual" })).toBe(2417);
  });
});

describe("valorComDesconto (spec 111)", () => {
  const percentual = (p: number) => ({ percent_off: p, amount_off: null });
  const fixo = (centavos: number) => ({
    percent_off: null,
    amount_off: centavos,
  });

  it("sem cupom, o preço da tabela", () => {
    expect(valorComDesconto(4990, [])).toBe(4990);
  });

  it("aplica o percentual, arredondado ao centavo", () => {
    expect(valorComDesconto(4990, [percentual(50)])).toBe(2495);
    expect(valorComDesconto(2900, [percentual(15)])).toBe(2465);
    expect(valorComDesconto(4990, [percentual(100)])).toBe(0);
  });

  it("tira o valor fixo, e nunca fica negativo", () => {
    expect(valorComDesconto(4990, [fixo(1000)])).toBe(3990);
    expect(valorComDesconto(4990, [fixo(9999)])).toBe(0);
  });

  it("a cortesia lê como cortesia, e não entra nas despesas", () => {
    const resumo = {
      valor: valorComDesconto(4990, [percentual(100)]),
      periodo: "mensal" as const,
    };
    expect(fraseDoPlano("COMPLETO", resumo)).toBe("Plano Completo · cortesia");
    expect(mensalDoPlano(resumo)).toBe(0);
  });
});
