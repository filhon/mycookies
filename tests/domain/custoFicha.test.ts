import { describe, expect, it } from "vitest";
import {
  calcularCustoFicha,
  composicaoDoLote,
  custoDasEscolhas,
  custoGravado,
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

// ---------------------------------------------------------------------------
// Spec 033-C · a faixa de composição é dado (`#d126`).
// ---------------------------------------------------------------------------

describe("composicaoDoLote", () => {
  it("fecha o caso de aceite: cinco parcelas sobre 8820, o trabalho em destaque", () => {
    // O cookie clássico de MARCA.md § 1.1: R$ 4,41 a unidade, 20 por lote.
    const segmentos = composicaoDoLote({
      custoInsumos: 6240,
      custoEmbalagem: 900,
      custoComponentes: 0,
      custoEscolhas: 0,
      custoMaoDeObra: 1120,
      custoEnergiaGas: 360,
      custoIndireto: 200,
      custoTotalLote: 8820,
      custoUnitario: 441,
    });

    expect(segmentos.map((s) => s.rotulo)).toEqual([
      "Materiais",
      "Embalagem",
      "Seu trabalho",
      "Energia e gás",
      "Fatia das despesas fixas",
    ]);
    expect(segmentos.map((s) => s.centavos)).toEqual([
      6240, 900, 1120, 360, 200,
    ]);
    expect(segmentos.map((s) => Number(s.fracao.toFixed(4)))).toEqual([
      0.7075, 0.102, 0.127, 0.0408, 0.0227,
    ]);
    expect(segmentos.reduce((soma, s) => soma + s.fracao, 0)).toBeCloseTo(
      1,
      10,
    );
    expect(segmentos.filter((s) => s.destaque).map((s) => s.rotulo)).toEqual([
      "Seu trabalho",
    ]);
  });

  it("custo zero: faixa nenhuma", () => {
    expect(
      composicaoDoLote(calcularCustoFicha(ficha({ operacional: RATEIO_ZERO }))),
    ).toEqual([]);
  });

  it("kit com componentes e escolhas: sete parcelas, na ordem das linhas", () => {
    const custo = calcularCustoFicha(
      ficha({
        itens: [
          {
            categoria: "INGREDIENTE",
            custoUnidadeBaseCorrigido: 1,
            quantidade: 100,
          },
          {
            categoria: "EMBALAGEM",
            custoUnidadeBaseCorrigido: 50,
            quantidade: 1,
          },
        ],
        componentes: [{ custoUnitarioSnapshot: 441, quantidade: 2 }],
        custoEscolhas: 620,
        tempoProducaoMinutos: 60,
      }),
    );
    const segmentos = composicaoDoLote(custo);

    expect(segmentos.map((s) => s.rotulo)).toEqual([
      "Materiais",
      "Embalagem",
      "Produtos de dentro",
      "O que a cliente escolhe (pela opção mais cara)",
      "Seu trabalho",
      "Energia e gás",
      "Fatia das despesas fixas",
    ]);
    expect(segmentos.map((s) => s.centavos)).toEqual([
      100, 50, 882, 620, 2500, 300, 1000,
    ]);
    expect(segmentos.reduce((soma, s) => soma + s.centavos, 0)).toBe(
      custo.custoTotalLote,
    );
  });
});

// ---------------------------------------------------------------------------
// Spec 034 · o painel de produto lê o custo gravado, e a faixa sai dele.
// ---------------------------------------------------------------------------

describe("custoGravado", () => {
  it("lê o gravado da ficha, com as invisíveis e `custoEscolhas` ausente valendo zero", () => {
    // O cookie clássico como está no documento: sem `custoEscolhas` (anterior
    // à 014), e as três parcelas do tempo dentro de `invisiveis`.
    const custo = custoGravado({
      custoInsumos: 6240,
      custoEmbalagem: 900,
      custoComponentes: 0,
      custoTotalLote: 8820,
      custoUnitario: 441,
      invisiveis: {
        tempoProducaoMinutos: 27,
        custoMaoDeObra: 1120,
        custoEnergiaGas: 360,
        custoIndireto: 200,
      },
    });

    expect(custo).toEqual({
      custoInsumos: 6240,
      custoEmbalagem: 900,
      custoComponentes: 0,
      custoEscolhas: 0,
      custoMaoDeObra: 1120,
      custoEnergiaGas: 360,
      custoIndireto: 200,
      custoTotalLote: 8820,
      custoUnitario: 441,
    });
    // O mesmo mapeado alimenta a faixa: as cinco parcelas do caso de aceite.
    expect(composicaoDoLote(custo).map((s) => s.centavos)).toEqual([
      6240, 900, 1120, 360, 200,
    ]);
  });
});
