import { describe, expect, it } from "vitest";
import {
  AUTORIZACAO_DO_DEPOIMENTO,
  esquemaRespostas,
  resumoDasPesquisas,
  situacaoDaPesquisa,
} from "@/lib/domain/pesquisa";

const DIA = 86_400_000;
/** 20/10, 15h de Brasília. */
const FIM = Date.UTC(2026, 9, 20, 18);
/** 17/10, meia-noite de Brasília. */
const ABRE = Date.UTC(2026, 9, 17, 3);
const quando = (ms: number) => ({ toMillis: () => ms });

const fundadora = {
  beta: { fundadora: 7 },
  trialAte: quando(FIM),
  status: "ATIVA",
};

describe("situacaoDaPesquisa", () => {
  it("abre à meia-noite de Brasília do dia 3 dias antes do fim, nem um instante antes", () => {
    expect(situacaoDaPesquisa(fundadora, ABRE - 1)).toBe("fora");
    expect(situacaoDaPesquisa(fundadora, ABRE)).toBe("aberta");
    // O e-mail das 9h desse dia já leva à pesquisa aberta.
    expect(situacaoDaPesquisa(fundadora, ABRE + 9 * 3_600_000)).toBe("aberta");
  });

  it("não fecha: meses depois do fim continua aberta", () => {
    expect(situacaoDaPesquisa(fundadora, FIM + 90 * DIA)).toBe("aberta");
  });

  it("fica fora sem ser fundadora, sem teste, encerrada ou já respondida", () => {
    const depois = FIM + DIA;
    expect(situacaoDaPesquisa({ ...fundadora, beta: undefined }, depois)).toBe(
      "fora",
    );
    expect(
      situacaoDaPesquisa({ ...fundadora, trialAte: undefined }, depois),
    ).toBe("fora");
    expect(
      situacaoDaPesquisa({ ...fundadora, status: "ENCERRADA" }, depois),
    ).toBe("fora");
    expect(
      situacaoDaPesquisa(
        { ...fundadora, pesquisaRespondidaEm: quando(FIM) },
        depois,
      ),
    ).toBe("fora");
  });
});

const obrigatorias = {
  semORende: "muito",
  nota: 9,
  oQueMudou: "Parei de cobrar R$ 6 no cookie que me custa R$ 4,41.",
  continua: "sim",
};

describe("esquemaRespostas", () => {
  it("aceita só as obrigatórias", () => {
    const lido = esquemaRespostas.parse(obrigatorias);
    expect(lido.maisUsou).toEqual([]);
    expect(lido.autorizacaoVersao).toBeUndefined();
  });

  it("recusa sem cada uma das obrigatórias", () => {
    for (const falta of Object.keys(obrigatorias)) {
      const corpo: Record<string, unknown> = { ...obrigatorias };
      delete corpo[falta];
      expect(esquemaRespostas.safeParse(corpo).success).toBe(false);
    }
  });

  it("recusa o que mudou com menos de 20 caracteres, contados sem as pontas", () => {
    expect(
      esquemaRespostas.safeParse({
        ...obrigatorias,
        oQueMudou: "   Mudou bastante.        ",
      }).success,
    ).toBe(false);
    expect(
      esquemaRespostas.safeParse({
        ...obrigatorias,
        oQueMudou: "a".repeat(20),
      }).success,
    ).toBe(true);
  });

  it("recusa nota fora de 0 a 10 e nota quebrada", () => {
    for (const nota of [-1, 11, 7.5]) {
      expect(
        esquemaRespostas.safeParse({ ...obrigatorias, nota }).success,
      ).toBe(false);
    }
  });

  it("depoimento sem a caixa marcada não leva autorização", () => {
    const lido = esquemaRespostas.parse({
      ...obrigatorias,
      depoimento: "Faz a conta que eu não fazia.",
      cidade: "Olinda",
    });
    expect(lido.depoimento).toBe("Faz a conta que eu não fazia.");
    expect(lido.cidade).toBe("Olinda");
    expect(lido.autorizacaoVersao).toBeUndefined();
  });

  it("com a caixa marcada grava a versão do texto; sem frase, nada", () => {
    expect(
      esquemaRespostas.parse({
        ...obrigatorias,
        depoimento: "Faz a conta que eu não fazia.",
        autorizaDepoimento: true,
      }).autorizacaoVersao,
    ).toBe(AUTORIZACAO_DO_DEPOIMENTO.versao);
    const semFrase = esquemaRespostas.parse({
      ...obrigatorias,
      depoimento: "  ",
      cidade: "Olinda",
      autorizaDepoimento: true,
    });
    expect(semFrase.autorizacaoVersao).toBeUndefined();
    expect(semFrase.cidade).toBeUndefined();
  });

  it("tira o motivo de quem continua e o WhatsApp de quem não topou", () => {
    const lido = esquemaRespostas.parse({
      ...obrigatorias,
      motivo: "preco",
      conversa: "nao",
      whatsapp: "81999990000",
    });
    expect(lido.motivo).toBeUndefined();
    expect(lido.whatsapp).toBeUndefined();
    expect(
      esquemaRespostas.parse({
        ...obrigatorias,
        continua: "nao-sei",
        motivo: "outro",
        motivoOutro: "Meu marido usa planilha",
      }),
    ).toMatchObject({
      motivo: "outro",
      motivoOutro: "Meu marido usa planilha",
    });
  });
});

describe("resumoDasPesquisas", () => {
  it("o NPS, o muito decepcionada e as contagens de um conjunto fixo", () => {
    const resumo = resumoDasPesquisas([
      { semORende: "muito", nota: 10, continua: "sim" },
      { semORende: "muito", nota: 9, continua: "sim" },
      { semORende: "um-pouco", nota: 8, continua: "nao-sei", motivo: "preco" },
      { semORende: "um-pouco", nota: 6, continua: "nao", motivo: "preco" },
      {
        semORende: "nao-faria-falta",
        nota: 2,
        continua: "nao",
        motivo: "sem-tempo",
      },
    ]);
    expect(resumo).toEqual({
      total: 5,
      muitoDecepcionada: 40,
      nps: 0, // 40% promotoras − 40% detratoras
      continua: { sim: 2, "nao-sei": 1, nao: 2 },
      motivos: { preco: 2, "sem-tempo": 1 },
    });
  });

  it("sem resposta, tudo zero", () => {
    expect(resumoDasPesquisas([])).toMatchObject({
      total: 0,
      muitoDecepcionada: 0,
      nps: 0,
    });
  });
});
