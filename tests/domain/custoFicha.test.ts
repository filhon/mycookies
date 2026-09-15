import { describe, expect, it } from "vitest";
import {
  calcularCustoFicha,
  custoDasEscolhas,
  custoLinhaItem,
  ehEmbalagem,
  opcoesDaEscolha,
  podeSerComponente,
  temEscolhas,
  type EntradaCustoFicha,
  type FichaParaEscolha,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";

const RATEIO_ZERO: RateioOperacional = {
  valorHoraTrabalho: 0,
  custoEnergiaHora: 0,
  custoGasHora: 0,
  custoIndiretoPorHora: 0,
};

const OPERACIONAL = {
  valorHoraTrabalho: 2500,
  custoEnergiaHora: 100,
  custoGasHora: 200,
  custoIndiretoPorHora: 1000,
};

function ficha(parcial: Partial<EntradaCustoFicha> = {}): EntradaCustoFicha {
  return {
    itens: [],
    componentes: [],
    tempoProducaoMinutos: 0,
    rendimento: 1,
    operacional: OPERACIONAL,
    ...parcial,
  };
}

describe("ehEmbalagem", () => {
  it("separa o que embrulha do que vira massa", () => {
    expect(ehEmbalagem("EMBALAGEM")).toBe(true);
    expect(ehEmbalagem("ETIQUETA")).toBe(true);
    expect(ehEmbalagem("ARMAZENAMENTO")).toBe(true);

    expect(ehEmbalagem("INGREDIENTE")).toBe(false);
    // `OUTRO` é o que ela não soube classificar: chamar de embalagem seria
    // adivinhar, e o lado da receita é o palpite menos arriscado.
    expect(ehEmbalagem("OUTRO")).toBe(false);
  });
});

describe("custoLinhaItem", () => {
  it("arredonda a linha ao centavo", () => {
    // 1,25 centavo/g × 500 g = 625 centavos exatos.
    expect(
      custoLinhaItem({
        categoria: "INGREDIENTE",
        custoUnidadeBaseCorrigido: 1.25,
        quantidade: 500,
      }),
    ).toBe(625);

    // 1,3158 centavo/g × 30 g = 39,47 → 39.
    expect(
      custoLinhaItem({
        categoria: "INGREDIENTE",
        custoUnidadeBaseCorrigido: 1.3158,
        quantidade: 30,
      }),
    ).toBe(39);
  });
});

describe("calcularCustoFicha", () => {
  it("mantém insumo e embalagem em somas separadas", () => {
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "INGREDIENTE",
            custoUnidadeBaseCorrigido: 4,
            quantidade: 300,
          },
          {
            categoria: "EMBALAGEM",
            custoUnidadeBaseCorrigido: 30,
            quantidade: 20,
          },
          {
            categoria: "ETIQUETA",
            custoUnidadeBaseCorrigido: 12,
            quantidade: 20,
          },
        ],
      }),
    );

    expect(custo.custoInsumos).toBe(1200);
    expect(custo.custoEmbalagem).toBe(600 + 240);
    expect(custo.custoTotalLote).toBe(2040);
  });

  it("soma o custo dos componentes de um kit", () => {
    // Uma caixa com 6 cookies de R$ 4,41 e 4 brownies de R$ 6,20, mais a
    // própria caixa a R$ 3,00.
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "EMBALAGEM",
            custoUnidadeBaseCorrigido: 300,
            quantidade: 1,
          },
        ],
        componentes: [
          { custoUnitarioSnapshot: 441, quantidade: 6 },
          { custoUnitarioSnapshot: 620, quantidade: 4 },
        ],
      }),
    );

    expect(custo.custoComponentes).toBe(2646 + 2480);
    expect(custo.custoEmbalagem).toBe(300);
    expect(custo.custoInsumos).toBe(0);
    expect(custo.custoTotalLote).toBe(5426);
  });

  it("rateia o tempo em trabalho, energia e despesa fixa", () => {
    const custo = calcularCustoFicha(ficha({ tempoProducaoMinutos: 90 }));

    expect(custo.custoMaoDeObra).toBe(3750);
    expect(custo.custoEnergiaGas).toBe(450);
    expect(custo.custoIndireto).toBe(1500);
  });

  it("com rateio zero, só o insumo pesa", () => {
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "INGREDIENTE",
            custoUnidadeBaseCorrigido: 1.25,
            quantidade: 500,
          },
        ],
        tempoProducaoMinutos: 90,
        operacional: RATEIO_ZERO,
      }),
    );

    expect(custo.custoMaoDeObra).toBe(0);
    expect(custo.custoEnergiaGas).toBe(0);
    expect(custo.custoIndireto).toBe(0);
    expect(custo.custoTotalLote).toBe(625);
  });

  it("rendimento zero devolve custo unitário zero, não Infinity", () => {
    const custo = calcularCustoFicha(
      ficha({ tempoProducaoMinutos: 90, rendimento: 0 }),
    );

    expect(custo.custoTotalLote).toBe(5700);
    expect(custo.custoUnitario).toBe(0);
    expect(Number.isFinite(custo.custoUnitario)).toBe(true);
  });

  it("divide o lote pelo rendimento, arredondando ao centavo", () => {
    // 8825 ÷ 20 = 441,25 centavos por cookie.
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "INGREDIENTE",
            custoUnidadeBaseCorrigido: 1,
            quantidade: 2525,
          },
          {
            categoria: "EMBALAGEM",
            custoUnidadeBaseCorrigido: 30,
            quantidade: 20,
          },
        ],
        tempoProducaoMinutos: 90,
        rendimento: 20,
      }),
    );

    expect(custo.custoTotalLote).toBe(8825);
    expect(custo.custoUnitario).toBe(441);
  });
});

// ---------------------------------------------------------------------------
// Spec 014 · o combo à escolha: o custo de referência é o da opção mais cara.
// ---------------------------------------------------------------------------

const TRADICIONAL: FichaParaEscolha = {
  id: "trad",
  nome: "Cookie tradicional",
  tipo: "SIMPLES",
  categoria: "Cookie",
  arquivado: false,
  custoUnitario: 220,
};
const NUTELLA: FichaParaEscolha = {
  ...TRADICIONAL,
  id: "nutella",
  nome: "Cookie de nutella",
  custoUnitario: 310,
};
const BROWNIE: FichaParaEscolha = {
  ...TRADICIONAL,
  id: "brownie",
  nome: "Brownie",
  categoria: "Brownie",
  custoUnitario: 400,
};
const COMBO: FichaParaEscolha = {
  ...TRADICIONAL,
  id: "combo",
  nome: "Combo dupla",
  tipo: "KIT",
  custoUnitario: 670,
};
const FICHAS_DO_COMBO = [TRADICIONAL, NUTELLA, BROWNIE, COMBO];
const DOIS_COOKIES = [{ quantidade: 2, categoria: "Cookie" }];

describe("opcoesDaEscolha", () => {
  it("serve receita viva, simples e da categoria; o brownie não entra", () => {
    expect(
      opcoesDaEscolha({ categoria: "Cookie" }, FICHAS_DO_COMBO, "combo").map(
        (opcao) => opcao.id,
      ),
    ).toEqual(["trad", "nutella"]);
  });

  it("nunca o próprio kit, nem outro kit, nem arquivada", () => {
    const outroKit = { ...COMBO, id: "outro", categoria: "Cookie" };
    const arquivada = { ...NUTELLA, arquivado: true };
    expect(
      opcoesDaEscolha(
        { categoria: "Cookie" },
        [TRADICIONAL, arquivada, outroKit, { ...COMBO, categoria: "Cookie" }],
        "combo",
      ).map((opcao) => opcao.id),
    ).toEqual(["trad"]);
  });
});

describe("custoDasEscolhas", () => {
  it("fecha o caso de aceite: referência 620, faixa de 440 a 620", () => {
    expect(custoDasEscolhas(DOIS_COOKIES, FICHAS_DO_COMBO, "combo")).toEqual({
      referencia: 620,
      minimo: 440,
      maximo: 620,
      semOpcao: [],
    });
  });

  it("categoria sem receita viva zera a parcela e avisa, e nunca Infinity", () => {
    const custo = custoDasEscolhas(
      [...DOIS_COOKIES, { quantidade: 1, categoria: "Torta" }],
      FICHAS_DO_COMBO,
      "combo",
    );
    expect(custo.referencia).toBe(620);
    expect(custo.semOpcao).toEqual(["Torta"]);
    expect(Number.isFinite(custo.minimo)).toBe(true);
  });

  it("sem escolha nenhuma é zero, que é toda ficha de hoje", () => {
    expect(custoDasEscolhas([], FICHAS_DO_COMBO)).toEqual({
      referencia: 0,
      minimo: 0,
      maximo: 0,
      semOpcao: [],
    });
  });
});

describe("calcularCustoFicha com escolhas", () => {
  it("soma a referência ao lote: saquinho 50 + escolhas 620 = 670", () => {
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "EMBALAGEM",
            custoUnidadeBaseCorrigido: 50,
            quantidade: 1,
          },
        ],
        custoEscolhas: 620,
        operacional: RATEIO_ZERO,
      }),
    );
    expect(custo.custoEscolhas).toBe(620);
    expect(custo.custoTotalLote).toBe(670);
    expect(custo.custoUnitario).toBe(670);
  });

  it("kit sem escolha grava custoEscolhas zero e o resto igual ao de hoje", () => {
    const entrada = ficha({
      componentes: [{ custoUnitarioSnapshot: 441, quantidade: 6 }],
    });
    const semCampo = calcularCustoFicha(entrada);
    const comZero = calcularCustoFicha({ ...entrada, custoEscolhas: 0 });
    expect(semCampo.custoEscolhas).toBe(0);
    expect(comZero).toEqual(semCampo);
  });
});

describe("temEscolhas", () => {
  it("só o kit com pelo menos uma escolha", () => {
    expect(temEscolhas({ tipo: "KIT", escolhas: DOIS_COOKIES })).toBe(true);
    expect(temEscolhas({ tipo: "KIT", escolhas: [] })).toBe(false);
    expect(temEscolhas({ tipo: "KIT" })).toBe(false);
    expect(temEscolhas({ tipo: "SIMPLES", escolhas: DOIS_COOKIES })).toBe(
      false,
    );
  });
});

describe("podeSerComponente", () => {
  const cookie = { id: "cookie", tipo: "SIMPLES" as const, arquivado: false };

  it("aceita ficha simples ativa", () => {
    expect(podeSerComponente(cookie, "caixa")).toBe(true);
  });

  it("recusa kit dentro de kit", () => {
    expect(
      podeSerComponente({ id: "outra-caixa", tipo: "KIT", arquivado: false }),
    ).toBe(false);
  });

  it("recusa a própria ficha e o que está arquivado", () => {
    expect(podeSerComponente(cookie, "cookie")).toBe(false);
    expect(podeSerComponente({ ...cookie, arquivado: true })).toBe(false);
  });
});
