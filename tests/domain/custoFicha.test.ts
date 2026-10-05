import { describe, expect, it } from "vitest";
import {
  calcularCustoFicha,
  composicaoDoLote,
  custoDasEscolhas,
  custoDeHoje,
  custoGravado,
  custoLinhaItem,
  custosDeHoje,
  derivarFicha,
  refazerCustoPelaConfiguracao,
  efeitoDosPrecosNovos,
  ehEmbalagem,
  kitDividido,
  levaDoKit,
  opcoesDaEscolha,
  ordenarFichas,
  sobraMudouDeVerdade,
  podeSerComponente,
  rotuloDaQuantidade,
  temEscolhas,
  usoDoMaterial,
  type EntradaCustoFicha,
  type EntradaFicha,
  type FichaParaRefazer,
  type FichaParaEscolha,
  type MaterialDeHoje,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";
import type { FichaTecnica } from "@/lib/types";

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

// ---------------------------------------------------------------------------
// Spec 024 · fichas no vermelho: o gravado mais o que mudou, linha a linha.
// Caso de aceite: farinha 500 g a 1,25 c/g (625), chocolate 200 g a 4,00 c/g
// (800), invisíveis 1000, rendimento 10 → lote 2425, unitário 243; markup
// 2,5, taxas 0, sugerido 608, praticado 690, sobra gravada 447 (`#d135`).
// ---------------------------------------------------------------------------

function fichaHoje(parcial: Partial<FichaTecnica> = {}): FichaTecnica {
  return {
    id: "cookie",
    v: 1,
    criadoEm: null,
    atualizadoEm: null,
    arquivado: false,
    nome: "Cookie recheado",
    nomeBusca: "cookie recheado",
    categoria: "Cookie",
    tipo: "SIMPLES",
    rendimento: 10,
    unidadeRendimento: "un",
    itens: [
      {
        insumoId: "farinha",
        nomeSnapshot: "Farinha",
        categoria: "INGREDIENTE",
        quantidade: 500,
        unidadeBase: "g",
        custoLinha: 625,
      },
      {
        insumoId: "chocolate",
        nomeSnapshot: "Chocolate",
        categoria: "INGREDIENTE",
        quantidade: 200,
        unidadeBase: "g",
        custoLinha: 800,
      },
    ],
    componentes: [],
    insumoIds: ["farinha", "chocolate"],
    componenteIds: [],
    invisiveis: {
      tempoProducaoMinutos: 20,
      custoMaoDeObra: 400,
      custoEnergiaGas: 100,
      custoIndireto: 500,
    },
    custoInsumos: 1425,
    custoEmbalagem: 0,
    custoComponentes: 0,
    custoTotalLote: 2425,
    custoUnitario: 243,
    precificacao: {
      metodo: "MARKUP",
      markup: 2.5,
      taxaCartaoConsiderada: 0,
      outrasTaxas: 0,
      precoSugerido: 608,
      precoVenda: 690,
      lucroUnitario: 447,
      margemReal: 64.78,
      markupReal: 2.84,
    },
    custoCalculadoEm: null,
    custoDesatualizado: false,
    ativo: true,
    ...parcial,
  } as unknown as FichaTecnica;
}

const FARINHA: MaterialDeHoje = {
  id: "farinha",
  nome: "Farinha",
  custoUnidadeBaseCorrigido: 1.25,
};

function mapaMateriais(
  chocolate = 4,
  extras: MaterialDeHoje[] = [],
): Map<string, MaterialDeHoje> {
  return new Map(
    [
      FARINHA,
      {
        id: "chocolate",
        nome: "Chocolate",
        custoUnidadeBaseCorrigido: chocolate,
      },
      ...extras,
    ].map((material) => [material.id, material]),
  );
}

describe("custoDeHoje", () => {
  const COOKIE = fichaHoje();

  it("sem mudança, devolve o gravado centavo por centavo (`#d135`)", () => {
    expect(custoDeHoje(COOKIE, mapaMateriais())).toEqual({
      custoUnitario: 243,
      sobra: 447,
      culpado: null,
      caiu: false,
    });
  });

  it("chocolate a 6,50 c/g: unitário 293, sobra 397, culpado Chocolate, caiu", () => {
    expect(custoDeHoje(COOKIE, mapaMateriais(6.5))).toEqual({
      custoUnitario: 293,
      sobra: 397,
      culpado: { nome: "Chocolate", subiu: 500 },
      caiu: true,
    });
  });

  it("chocolate a 3,00 c/g: sobra sobe, sem culpado e sem cartão", () => {
    expect(custoDeHoje(COOKIE, mapaMateriais(3))).toEqual({
      custoUnitario: 223,
      sobra: 467,
      culpado: null,
      caiu: false,
    });
  });

  it("material arquivado fica fora do mapa: tudo igual ao gravado", () => {
    const semChocolate = new Map([["farinha", FARINHA]]);
    expect(custoDeHoje(COOKIE, semChocolate)).toEqual({
      custoUnitario: 243,
      sobra: 447,
      culpado: null,
      caiu: false,
    });
  });

  it("já no vermelho não é notícia; cruzar o zero é (`#d136`)", () => {
    const jaNoVermelho = fichaHoje({
      precificacao: {
        ...COOKIE.precificacao,
        precoVenda: 200,
        lucroUnitario: -43,
      },
    });
    expect(custoDeHoje(jaNoVermelho, mapaMateriais(6.5)).caiu).toBe(false);

    const cruzouOZero = fichaHoje({
      precificacao: {
        ...COOKIE.precificacao,
        precoVenda: 250,
        lucroUnitario: 7,
      },
    });
    const hoje = custoDeHoje(cruzouOZero, mapaMateriais(6.5));
    expect(hoje.sobra).toBe(-43);
    expect(hoje.caiu).toBe(true);
  });

  it("abaixo do sugerido de propósito não é notícia; só cruza pelo zero", () => {
    const deProposito = fichaHoje({
      precificacao: {
        ...COOKIE.precificacao,
        precoVenda: 600,
        lucroUnitario: 357,
      },
    });
    expect(custoDeHoje(deProposito, mapaMateriais(6.5)).caiu).toBe(false);

    const hoje20 = custoDeHoje(deProposito, mapaMateriais(20));
    expect(hoje20.custoUnitario).toBe(563);
    expect(hoje20.sobra).toBe(37);
    expect(hoje20.caiu).toBe(false);
  });

  it("rendimento zero: custo unitário zero, sem NaN", () => {
    const semRendimento = fichaHoje({ rendimento: 0 });
    const hoje = custoDeHoje(semRendimento, mapaMateriais(6.5));
    expect(hoje.custoUnitario).toBe(0);
    expect(Number.isFinite(hoje.custoUnitario)).toBe(true);
  });

  it("MARGEM_IMPOSSIVEL: nunca 'abaixo', mas a sobra ainda muda", () => {
    const margemImpossivel = fichaHoje({
      precificacao: {
        metodo: "MARGEM",
        margemDesejada: 100,
        taxaCartaoConsiderada: 0,
        outrasTaxas: 0,
        precoSugerido: 0,
        precoVenda: 250,
        lucroUnitario: 7,
        margemReal: 2.8,
        markupReal: 1.03,
      },
    });
    const hoje = custoDeHoje(margemImpossivel, mapaMateriais(6.5));
    expect(hoje.sobra).toBe(-43);
    expect(hoje.caiu).toBe(true);
  });
});

describe("custosDeHoje", () => {
  it("kit: componente sobe com a receita, culpado é a receita (um nível, `#d11`)", () => {
    const cookie = fichaHoje();
    const kit = fichaHoje({
      id: "caixa-6",
      nome: "Caixa de 6",
      tipo: "KIT",
      rendimento: 1,
      itens: [
        {
          insumoId: "caixa",
          nomeSnapshot: "Caixa",
          categoria: "EMBALAGEM",
          quantidade: 1,
          unidadeBase: "un",
          custoLinha: 200,
        },
      ],
      componentes: [
        {
          fichaId: "cookie",
          nomeSnapshot: "Cookie",
          quantidade: 6,
          custoUnitarioSnapshot: 243,
          custoLinha: 1458,
        },
      ],
      insumoIds: ["caixa"],
      componenteIds: ["cookie"],
      invisiveis: {
        tempoProducaoMinutos: 0,
        custoMaoDeObra: 0,
        custoEnergiaGas: 0,
        custoIndireto: 0,
      },
      custoInsumos: 0,
      custoEmbalagem: 200,
      custoComponentes: 1458,
      custoTotalLote: 1658,
      custoUnitario: 1658,
      precificacao: {
        metodo: "MARKUP",
        markup: 1.5,
        taxaCartaoConsiderada: 0,
        outrasTaxas: 0,
        precoSugerido: 2487,
        precoVenda: 2487,
        lucroUnitario: 829,
        margemReal: 33.33,
        markupReal: 1.5,
      },
    });

    const materiais: MaterialDeHoje[] = [
      FARINHA,
      { id: "chocolate", nome: "Chocolate", custoUnidadeBaseCorrigido: 6.5 },
      { id: "caixa", nome: "Caixa", custoUnidadeBaseCorrigido: 200 },
    ];
    const resultado = custosDeHoje([cookie, kit], materiais);

    expect(resultado.get("cookie")?.custoUnitario).toBe(293);
    expect(resultado.get("caixa-6")?.custoUnitario).toBe(1958);
    expect(resultado.get("caixa-6")?.culpado).toEqual({
      nome: "Cookie",
      subiu: 300,
    });
  });

  it("combo com escolha: a opção mais cara de hoje entra no custo (`#d101`)", () => {
    const cookie = fichaHoje({ categoria: "Cookie" });
    const combo = fichaHoje({
      id: "combo",
      nome: "Combo dupla",
      categoria: "Combo",
      tipo: "KIT",
      rendimento: 1,
      itens: [
        {
          insumoId: "saquinho",
          nomeSnapshot: "Saquinho",
          categoria: "EMBALAGEM",
          quantidade: 1,
          unidadeBase: "un",
          custoLinha: 50,
        },
      ],
      componentes: [],
      escolhas: [{ quantidade: 2, categoria: "Cookie" }],
      insumoIds: ["saquinho"],
      componenteIds: [],
      invisiveis: {
        tempoProducaoMinutos: 0,
        custoMaoDeObra: 0,
        custoEnergiaGas: 0,
        custoIndireto: 0,
      },
      custoInsumos: 0,
      custoEmbalagem: 50,
      custoComponentes: 0,
      custoEscolhas: 486,
      custoTotalLote: 536,
      custoUnitario: 536,
      precificacao: {
        metodo: "MARKUP",
        markup: 1.5,
        taxaCartaoConsiderada: 0,
        outrasTaxas: 0,
        precoSugerido: 804,
        precoVenda: 804,
        lucroUnitario: 268,
        margemReal: 33.33,
        markupReal: 1.5,
      },
    });

    const materiais: MaterialDeHoje[] = [
      FARINHA,
      { id: "chocolate", nome: "Chocolate", custoUnidadeBaseCorrigido: 6.5 },
    ];
    const resultado = custosDeHoje([cookie, combo], materiais);

    // Cookie a 293: 2 × 293 = 586, contra 486 gravado → +100.
    expect(resultado.get("combo")?.custoUnitario).toBe(636);
  });

  it("categoria sem receita viva: parcela zera, sem Infinity nem NaN", () => {
    const cookie = fichaHoje({ categoria: "Cookie" });
    const comboSemTorta = fichaHoje({
      id: "combo-torta",
      categoria: "Combo",
      tipo: "KIT",
      rendimento: 1,
      itens: [
        {
          insumoId: "saquinho",
          nomeSnapshot: "Saquinho",
          categoria: "EMBALAGEM",
          quantidade: 1,
          unidadeBase: "un",
          custoLinha: 50,
        },
      ],
      componentes: [],
      escolhas: [{ quantidade: 1, categoria: "Torta" }],
      insumoIds: ["saquinho"],
      componenteIds: [],
      invisiveis: {
        tempoProducaoMinutos: 0,
        custoMaoDeObra: 0,
        custoEnergiaGas: 0,
        custoIndireto: 0,
      },
      custoInsumos: 0,
      custoEmbalagem: 50,
      custoComponentes: 0,
      custoEscolhas: 300,
      custoTotalLote: 350,
      custoUnitario: 350,
      precificacao: {
        metodo: "MARKUP",
        markup: 1.5,
        taxaCartaoConsiderada: 0,
        outrasTaxas: 0,
        precoSugerido: 525,
        precoVenda: 525,
        lucroUnitario: 175,
        margemReal: 33.33,
        markupReal: 1.5,
      },
    });

    const resultado = custosDeHoje(
      [cookie, comboSemTorta],
      [
        FARINHA,
        { id: "chocolate", nome: "Chocolate", custoUnidadeBaseCorrigido: 6.5 },
      ],
    );
    const hoje = resultado.get("combo-torta");

    // Sem receita de Torta viva, a parcela some (0 contra 300 gravado): não
    // vira `Infinity` nem `NaN`, e a sobra apenas sobe.
    expect(hoje?.custoUnitario).toBe(50);
    expect(Number.isFinite(hoje?.custoUnitario)).toBe(true);
  });
});

describe("usoDoMaterial", () => {
  const COOKIE = fichaHoje();
  const BRIGADEIRO = fichaHoje({
    id: "brigadeiro",
    nome: "Brigadeiro",
    rendimento: 20,
    itens: [
      {
        insumoId: "chocolate",
        nomeSnapshot: "Chocolate",
        categoria: "INGREDIENTE",
        quantidade: 100,
        unidadeBase: "g",
        custoLinha: 400,
      },
    ],
    insumoIds: ["chocolate"],
    custoUnitario: 100,
  });
  const SO_FARINHA = fichaHoje({ id: "pao", insumoIds: ["farinha"] });

  it("as fichas que usam o material, com o preço de hoje, a maior parte primeiro", () => {
    const chocolate = { id: "chocolate", custoUnidadeBaseCorrigido: 6.5 };
    const custos = custosDeHoje(
      [COOKIE, BRIGADEIRO],
      [FARINHA, { ...chocolate, nome: "Chocolate" }],
    );
    const uso = usoDoMaterial(
      [COOKIE, SO_FARINHA, BRIGADEIRO],
      chocolate,
      custos,
    );

    // Cookie: 200 g × 6,50 = 1300 no lote de 10 → 130 de 293 hoje.
    // Brigadeiro: 100 g × 6,50 = 650 no lote de 20 → 32,5; o lote gravado de
    // 2425 sobe 250 hoje, 2675 / 20 = 134.
    expect(uso.map((u) => u.fichaId)).toEqual(["cookie", "brigadeiro"]);
    expect(uso[0]?.custoPorUnidade).toBe(130);
    expect(uso[0]?.parte).toBeCloseTo(130 / 293);
    expect(uso[1]?.custoPorUnidade).toBe(32.5);
    expect(uso[1]?.parte).toBeCloseTo(32.5 / 134);
  });

  it("nenhuma ficha: lista vazia", () => {
    expect(
      usoDoMaterial(
        [SO_FARINHA],
        { id: "chocolate", custoUnidadeBaseCorrigido: 4 },
        new Map(),
      ),
    ).toEqual([]);
  });
});

describe("efeitoDosPrecosNovos", () => {
  const COOKIE = fichaHoje();
  // Lote gravado 2425 com chocolate a 4; 100 g de chocolate no lote de 20.
  const BRIGADEIRO = fichaHoje({
    id: "brigadeiro",
    nome: "Brigadeiro",
    rendimento: 20,
    itens: [
      {
        insumoId: "chocolate",
        nomeSnapshot: "Chocolate",
        categoria: "INGREDIENTE",
        quantidade: 100,
        unidadeBase: "g",
        custoLinha: 400,
      },
    ],
    insumoIds: ["chocolate"],
  });
  const PAO = fichaHoje({
    id: "pao",
    nome: "Pão",
    itens: [
      {
        insumoId: "farinha",
        nomeSnapshot: "Farinha",
        categoria: "INGREDIENTE",
        quantidade: 500,
        unidadeBase: "g",
        custoLinha: 625,
      },
    ],
    insumoIds: ["farinha"],
  });
  const chocolate = (custo: number): MaterialDeHoje => ({
    id: "chocolate",
    nome: "Chocolate",
    custoUnidadeBaseCorrigido: custo,
  });

  it("preço sobe: só quem usa, a maior queda primeiro", () => {
    const efeito = efeitoDosPrecosNovos(
      [BRIGADEIRO, PAO, COOKIE],
      [FARINHA, chocolate(4)],
      [chocolate(6.5)],
    );

    // Cookie: 243 → 293, sobra 447 → 397. Brigadeiro: 2425/20 = 121 → 2675/20
    // = 134, sobra 569 → 556. O pão não usa chocolate e não aparece.
    expect(efeito).toEqual([
      expect.objectContaining({ fichaId: "cookie", antes: 447, depois: 397 }),
      expect.objectContaining({
        fichaId: "brigadeiro",
        antes: 569,
        depois: 556,
      }),
    ]);
  });

  it("preço cai: a maior alta primeiro", () => {
    const efeito = efeitoDosPrecosNovos(
      [BRIGADEIRO, COOKIE],
      [FARINHA, chocolate(4)],
      [chocolate(2)],
    );

    // Cookie: 2025/10 = 203, sobra 487. Brigadeiro: 2225/20 = 111, sobra 579.
    expect(efeito.map((e) => [e.fichaId, e.antes, e.depois])).toEqual([
      ["cookie", 447, 487],
      ["brigadeiro", 569, 579],
    ]);
  });

  it("cruza o zero nos dois sentidos", () => {
    const apertado = fichaHoje({
      precificacao: { ...COOKIE.precificacao, precoVenda: 260 },
    });

    // 260 − 243 = 17; com chocolate a 6,50, 260 − 293 = −33.
    const [entra] = efeitoDosPrecosNovos(
      [apertado],
      [FARINHA, chocolate(4)],
      [chocolate(6.5)],
    );
    expect([entra?.antes, entra?.depois]).toEqual([17, -33]);

    const [sai] = efeitoDosPrecosNovos(
      [apertado],
      [FARINHA, chocolate(6.5)],
      [chocolate(4)],
    );
    expect([sai?.antes, sai?.depois]).toEqual([-33, 17]);
  });

  it("kit que só usa o material pela receita de dentro entra", () => {
    const kit = fichaHoje({
      id: "caixa-6",
      nome: "Caixa de 6",
      tipo: "KIT",
      rendimento: 1,
      itens: [],
      componentes: [
        {
          fichaId: "cookie",
          nomeSnapshot: "Cookie",
          quantidade: 6,
          custoUnitarioSnapshot: 243,
          custoLinha: 1458,
        },
      ],
      insumoIds: [],
      componenteIds: ["cookie"],
      custoTotalLote: 1458,
      custoUnitario: 1458,
      precificacao: { ...COOKIE.precificacao, precoVenda: 2000 },
    });

    const efeito = efeitoDosPrecosNovos(
      [COOKIE, kit],
      [FARINHA, chocolate(4)],
      [chocolate(6.5)],
    );

    // 6 × (293 − 243) = 300 a mais na caixa: sobra 542 → 242.
    expect(efeito.map((e) => [e.fichaId, e.antes, e.depois])).toEqual([
      ["caixa-6", 542, 242],
      ["cookie", 447, 397],
    ]);
  });

  it("vários preços de uma vez, em sentidos opostos na mesma ficha", () => {
    const farinha = (custo: number): MaterialDeHoje => ({
      ...FARINHA,
      custoUnidadeBaseCorrigido: custo,
    });

    // Cookie: farinha +500, chocolate −200, lote 2725, 273, sobra 447 → 417.
    // Pão: farinha +500, 293, sobra 397. Brigadeiro: chocolate −100, 2325/20 =
    // 116, sobra 574. A maior diferença primeiro, subindo ou caindo.
    expect(
      efeitoDosPrecosNovos(
        [BRIGADEIRO, PAO, COOKIE],
        [FARINHA, chocolate(4)],
        [farinha(2.25), chocolate(3)],
      ).map((e) => [e.fichaId, e.antes, e.depois]),
    ).toEqual([
      ["pao", 447, 397],
      ["cookie", 447, 417],
      ["brigadeiro", 569, 574],
    ]);

    // +500 na farinha e −500 no chocolate: o cookie não muda e sai da lista.
    expect(
      efeitoDosPrecosNovos(
        [COOKIE],
        [FARINHA, chocolate(4)],
        [farinha(2.25), chocolate(1.5)],
      ),
    ).toEqual([]);
  });

  it("material sem uso, ou o mesmo preço: nada", () => {
    const manteiga = {
      id: "manteiga",
      nome: "Manteiga",
      custoUnidadeBaseCorrigido: 5,
    };
    expect(
      efeitoDosPrecosNovos(
        [COOKIE],
        [FARINHA, chocolate(4), manteiga],
        [{ ...manteiga, custoUnidadeBaseCorrigido: 9 }],
      ),
    ).toEqual([]);
    expect(
      efeitoDosPrecosNovos([COOKIE], [FARINHA, chocolate(4)], [chocolate(4)]),
    ).toEqual([]);
  });
});

describe("rotuloDaQuantidade", () => {
  it("concorda a unidade com o número", () => {
    expect(rotuloDaQuantidade(1, "un")).toBe("1 unidade");
    expect(rotuloDaQuantidade(2, "un")).toBe("2 unidades");
    expect(rotuloDaQuantidade(1, "porcao")).toBe("1 porção");
    expect(rotuloDaQuantidade(300, "g")).toBe("300 gramas");
    expect(rotuloDaQuantidade(1.5, "porcao")).toBe("1,5 porções");
    expect(rotuloDaQuantidade(0, "un")).toBe("0 unidades");
  });
});

describe("levaDoKit e kitDividido", () => {
  const componente = {
    fichaId: "c",
    nomeSnapshot: "Cookie",
    quantidade: 2,
    custoUnitarioSnapshot: 500,
    custoLinha: 1000,
  };

  it("soma os produtos de dentro e as escolhas", () => {
    expect(
      levaDoKit({
        componentes: [componente, { ...componente, quantidade: 1 }],
        escolhas: [{ categoria: "Cookie", quantidade: 4 }],
      }),
    ).toBe(7);
    expect(levaDoKit({ componentes: [] })).toBe(0);
  });

  it("aponta só o kit que não rende um", () => {
    expect(kitDividido({ tipo: "KIT", rendimento: 4 })).toBe(true);
    expect(kitDividido({ tipo: "KIT", rendimento: 1 })).toBe(false);
    expect(kitDividido({ tipo: "SIMPLES", rendimento: 4 })).toBe(false);
  });
});

describe("sobraMudouDeVerdade", () => {
  it("cala os centavos e mostra a partir de R$ 0,10", () => {
    expect(sobraMudouDeVerdade(3512, 3509, 300)).toBe(false);
    expect(sobraMudouDeVerdade(200, 190, 300)).toBe(true);
    expect(sobraMudouDeVerdade(200, 191, 300)).toBe(false);
  });

  it("no preço alto, o limiar é 2% do preço", () => {
    // 2% de R$ 48,00 = R$ 0,96.
    expect(sobraMudouDeVerdade(1000, 905, 4800)).toBe(false);
    expect(sobraMudouDeVerdade(1000, 904, 4800)).toBe(true);
  });

  it("cruzar o zero sempre aparece, por um centavo que seja", () => {
    expect(sobraMudouDeVerdade(1, -1, 4800)).toBe(true);
    expect(sobraMudouDeVerdade(-2, 0, 4800)).toBe(true);
    expect(sobraMudouDeVerdade(500, 500, 4800)).toBe(false);
  });
});

describe("ordenarFichas", () => {
  const ficha = (id: string, lucroUnitario: number, margemReal: number) => ({
    id,
    nomeBusca: id,
    precificacao: { lucroUnitario, margemReal } as FichaTecnica["precificacao"],
  });
  const fichas = [
    ficha("combo", 3500, 40),
    ficha("brownie", 300, 55),
    ficha("mini", 170, 52),
    ficha("alfajor", 170, 30),
  ];
  const venda = (lucro: number, quantidade = 1) => ({
    nome: "",
    quantidade,
    receita: 100,
    lucro,
  });
  const ids = (lista: { id: string }[]) => lista.map((f) => f.id);

  it("pelo nome, sem mexer na lista de entrada", () => {
    expect(ids(ordenarFichas(fichas, "NOME", {}))).toEqual([
      "alfajor",
      "brownie",
      "combo",
      "mini",
    ]);
    expect(ids(fichas)[0]).toBe("combo");
  });

  it("deixou mais no mês: sem venda no fim, por nome, e prejuízo antes dela", () => {
    const mes = {
      mini: venda(27880, 41),
      combo: venda(-500),
      brownie: { nome: "", quantidade: 0, receita: 0, lucro: 0 },
    };
    expect(ids(ordenarFichas(fichas, "DEIXOU", mes))).toEqual([
      "mini",
      "combo",
      "alfajor",
      "brownie",
    ]);
  });

  it("sobra por unidade e margem, maior primeiro, empate por nome", () => {
    expect(ids(ordenarFichas(fichas, "SOBRA", {}))).toEqual([
      "combo",
      "brownie",
      "alfajor",
      "mini",
    ]);
    expect(ids(ordenarFichas(fichas, "MARGEM", {}))).toEqual([
      "brownie",
      "mini",
      "combo",
      "alfajor",
    ]);
  });
});

describe("refazerCustoPelaConfiguracao", () => {
  const entrada = (
    valorHoraTrabalho: number,
    metodo: "MARGEM" | "MARKUP",
  ): EntradaFicha => ({
    itens: [
      // Linhas com fração de centavo: a soma gravada é que tem de entrar igual.
      {
        categoria: "INGREDIENTE",
        custoUnidadeBaseCorrigido: 1.3158,
        quantidade: 30,
      },
      {
        categoria: "INGREDIENTE",
        custoUnidadeBaseCorrigido: 2.7,
        quantidade: 125,
      },
      {
        categoria: "EMBALAGEM",
        custoUnidadeBaseCorrigido: 45.5,
        quantidade: 12,
      },
    ],
    componentes: [],
    tempoProducaoMinutos: 95,
    rendimento: 12,
    operacional: { ...OPERACIONAL, valorHoraTrabalho },
    precificacao: {
      metodo,
      markup: 2.5,
      margemDesejada: 30,
      taxaCartaoConsiderada: 3.5,
      outrasTaxas: 4,
      arredondamento: "MEIO_REAL",
    },
    precoVenda: 900,
  });

  /** O que `corpoDaFicha` grava, só os campos que a conta lê. */
  function gravada(e: EntradaFicha): FichaParaRefazer {
    const d = derivarFicha(e);
    return {
      custoInsumos: d.custo.custoInsumos,
      custoEmbalagem: d.custo.custoEmbalagem,
      custoComponentes: d.custo.custoComponentes,
      custoEscolhas: d.custo.custoEscolhas,
      rendimento: e.rendimento,
      invisiveis: {
        tempoProducaoMinutos: e.tempoProducaoMinutos,
        custoMaoDeObra: d.custo.custoMaoDeObra,
        custoEnergiaGas: d.custo.custoEnergiaGas,
        custoIndireto: d.custo.custoIndireto,
      },
      precificacao: {
        metodo: e.precificacao.metodo,
        markup: e.precificacao.markup,
        margemDesejada: e.precificacao.margemDesejada,
        taxaCartaoConsiderada: e.precificacao.taxaCartaoConsiderada,
        outrasTaxas: e.precificacao.outrasTaxas,
        precoSugerido: d.precoSugerido ?? 0,
        precoVenda: d.precoVenda,
        lucroUnitario: d.verificacao.lucroUnitario,
        margemReal: d.verificacao.margemReal,
        markupReal: d.verificacao.markupReal,
      },
    };
  }

  it.each(["MARGEM", "MARKUP"] as const)(
    "salva a R$ 25 e refeita a R$ 30 dá o que o editor gravaria a R$ 30 (%s)",
    (metodo) => {
      const refeita = refazerCustoPelaConfiguracao(
        gravada(entrada(2500, metodo)),
        { ...OPERACIONAL, valorHoraTrabalho: 3000 },
      );
      const doEditor = gravada(entrada(3000, metodo));

      expect(refeita.invisiveis).toEqual(doEditor.invisiveis);
      expect(refeita.custoUnitario).toBe(
        derivarFicha(entrada(3000, metodo)).custo.custoUnitario,
      );
      expect(refeita.custoTotalLote).toBe(
        derivarFicha(entrada(3000, metodo)).custo.custoTotalLote,
      );
      expect(refeita.precificacao).toEqual(doEditor.precificacao);
      // O preço é dela: a sobra cai, o preço fica.
      expect(refeita.precificacao.precoVenda).toBe(900);
      expect(refeita.precificacao.lucroUnitario).toBeLessThan(
        gravada(entrada(2500, metodo)).precificacao.lucroUnitario,
      );
    },
  );
});
