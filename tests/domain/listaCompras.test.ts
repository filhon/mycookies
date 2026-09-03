import { describe, expect, it } from "vitest";
import { agruparPorCorredor } from "@/lib/domain/corredores";
import {
  entraNaLista,
  explodirDemanda,
  montarLista,
  orcamentosDeFora,
  precisaComprar,
  preservarComprados,
  quantidadeFisica,
  resumoDaLista,
  rotuloDeCompra,
  statusDaLista,
  type FichaParaExplodir,
  type InsumoParaLista,
  type ListaMontada,
  type PedidoParaExplodir,
} from "@/lib/domain/listaCompras";
import type { DataISO, StatusPedido } from "@/lib/types";

// ---------------------------------------------------------------------------
// O cenário do caso de aceite da spec 003, sessão 3C.
//
// Cookie tradicional rende 20 por lote e leva 500 g de farinha, 300 g de
// chocolate, 200 g de manteiga e 20 saquinhos. Caixa com 6 é um kit que consome
// 6 cookies e 1 caixa.
// ---------------------------------------------------------------------------

const COOKIE: FichaParaExplodir = {
  id: "cookie",
  nome: "Cookie tradicional",
  arquivado: false,
  rendimento: 20,
  itens: [
    { insumoId: "farinha", nomeSnapshot: "Farinha", quantidade: 500 },
    { insumoId: "chocolate", nomeSnapshot: "Chocolate", quantidade: 300 },
    { insumoId: "manteiga", nomeSnapshot: "Manteiga", quantidade: 200 },
    { insumoId: "saquinho", nomeSnapshot: "Saquinho", quantidade: 20 },
  ],
  componentes: [],
};

const CAIXA_COM_6: FichaParaExplodir = {
  id: "caixa6",
  nome: "Caixa com 6",
  arquivado: false,
  rendimento: 1,
  itens: [{ insumoId: "caixa", nomeSnapshot: "Caixa", quantidade: 1 }],
  componentes: [
    { fichaId: "cookie", nomeSnapshot: "Cookie tradicional", quantidade: 6 },
  ],
};

const FICHAS = [COOKIE, CAIXA_COM_6];

/** O pedido do caso de aceite da 3A: 20 cookies e 2 caixas com 6. */
const PEDIDO: PedidoParaExplodir = {
  id: "p1",
  itens: [
    {
      fichaTecnicaId: "cookie",
      nomeSnapshot: "Cookie tradicional",
      quantidade: 20,
    },
    { fichaTecnicaId: "caixa6", nomeSnapshot: "Caixa com 6", quantidade: 2 },
  ],
};

function insumo(
  parcial: Partial<InsumoParaLista> & { id: string },
): InsumoParaLista {
  return {
    nome: parcial.id,
    categoria: "INGREDIENTE",
    arquivado: false,
    unidadeBase: "g",
    quantidadeBase: 1000,
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 1000,
    perdaPercentual: 0,
    ...parcial,
  };
}

/**
 * O dia em que a lista é montada.
 *
 * Desde a 7B `montarLista` recebe a data, porque estoque sem data não é medida:
 * é a `estoqueContadoEmISO` de cada insumo que decide se o número entra na
 * conta. Toda fixture daqui conta a despensa **hoje**, que é o cenário A — e é
 * o que faz os R$ 120,00 da 3C continuarem sendo os mesmos R$ 120,00.
 */
const HOJE = "2026-09-03";

/** Os cinco insumos da 3C, com a despensa contada no dia que se pedir. */
function insumosContadosEm(contadoEmISO: DataISO | null): InsumoParaLista[] {
  const contagem = contadoEmISO ? { estoqueContadoEmISO: contadoEmISO } : {};

  return [
    insumo({
      id: "farinha",
      nome: "Farinha",
      // A diferença proposital em relação à spec 002: aqui a farinha tem 5%, e é
      // o que faz esta tabela exercitar a divisão pelo fator de correção.
      perdaPercentual: 5,
      precoCompra: 1250,
      estoqueAtual: 500,
      ...contagem,
    }),
    insumo({ id: "chocolate", nome: "Chocolate", precoCompra: 4000 }),
    insumo({
      id: "manteiga",
      nome: "Manteiga",
      quantidadeBase: 500,
      quantidadeCompra: 500,
      unidadeCompra: "g",
      precoCompra: 1750,
    }),
    insumo({
      id: "saquinho",
      nome: "Saquinho",
      categoria: "EMBALAGEM",
      unidadeBase: "un",
      quantidadeBase: 100,
      quantidadeCompra: 100,
      unidadeCompra: "un",
      precoCompra: 3000,
      estoqueAtual: 50,
      ...contagem,
    }),
    insumo({
      id: "caixa",
      nome: "Caixa",
      categoria: "EMBALAGEM",
      unidadeBase: "un",
      quantidadeBase: 25,
      quantidadeCompra: 25,
      unidadeCompra: "un",
      precoCompra: 5000,
    }),
  ];
}

const INSUMOS = insumosContadosEm(HOJE);

function demandaDe(insumoId: string, pedidos = [PEDIDO], fichas = FICHAS) {
  return explodirDemanda(pedidos, fichas).linhas.find(
    (linha) => linha.insumoId === insumoId,
  );
}

/** A lista do pedido do caso de aceite, com a contagem feita no dia que se der. */
function listaContadaEm(contadoEmISO: DataISO | null) {
  return montarLista(
    explodirDemanda([PEDIDO], FICHAS),
    insumosContadosEm(contadoEmISO),
    HOJE,
  );
}

function linhaDe(insumoId: string) {
  return montarLista(
    explodirDemanda([PEDIDO], FICHAS),
    INSUMOS,
    HOJE,
  ).linhas.find((linha) => linha.insumoId === insumoId);
}

// ---------------------------------------------------------------------------
// A explosão, e o kit que para no primeiro nível.
// ---------------------------------------------------------------------------

describe("explodirDemanda", () => {
  it("soma o cookie solto e o cookie de dentro do kit: 32 unidades", () => {
    // 20 soltos + 12 dentro das duas caixas = 32 cookies = 1,6 lote.
    // Por unidade: 25 g de farinha, 15 g de chocolate, 10 g de manteiga e
    // 1 saquinho.
    expect(demandaDe("farinha")?.quantidade).toBeCloseTo(800, 6);
    expect(demandaDe("chocolate")?.quantidade).toBeCloseTo(480, 6);
    expect(demandaDe("manteiga")?.quantidade).toBeCloseTo(320, 6);
    expect(demandaDe("saquinho")?.quantidade).toBeCloseTo(32, 6);
  });

  it("a embalagem do próprio kit entra pela quantidade pedida", () => {
    expect(demandaDe("caixa")?.quantidade).toBeCloseTo(2, 6);
  });

  it("a demanda é proporcional, e não arredondada para lotes inteiros", () => {
    // 32 cookies são 1,6 lote. Arredondar para 2 pediria 1000 g de farinha.
    expect(demandaDe("farinha")?.quantidade).not.toBe(1000);
  });

  it("guarda os ids dos pedidos que entraram, para poder regerar", () => {
    expect(explodirDemanda([PEDIDO], FICHAS).pedidoIds).toEqual(["p1"]);
  });

  it("para no primeiro nível: o kit dentro do kit não é seguido", () => {
    const kitDeKit: FichaParaExplodir = {
      id: "cesta",
      nome: "Cesta de Natal",
      arquivado: false,
      rendimento: 1,
      itens: [],
      componentes: [
        { fichaId: "caixa6", nomeSnapshot: "Caixa com 6", quantidade: 2 },
      ],
    };

    const demanda = explodirDemanda(
      [
        {
          id: "p2",
          itens: [
            {
              fichaTecnicaId: "cesta",
              nomeSnapshot: "Cesta de Natal",
              quantidade: 1,
            },
          ],
        },
      ],
      [...FICHAS, kitDeKit],
    );

    const porInsumo = new Map(
      demanda.linhas.map((linha) => [linha.insumoId, linha.quantidade]),
    );

    // As duas caixas entram, porque são itens do componente. Os cookies dentro
    // delas não: seriam o segundo nível, e `DECISOES.md#d11` o proíbe.
    expect(porInsumo.get("caixa")).toBeCloseTo(2, 6);
    expect(porInsumo.has("farinha")).toBe(false);
  });

  it("dois pedidos somam no mesmo insumo, em vez de sobrescrever", () => {
    const demanda = explodirDemanda([PEDIDO, { ...PEDIDO, id: "p2" }], FICHAS);
    const farinha = demanda.linhas.find(
      (linha) => linha.insumoId === "farinha",
    );

    expect(farinha?.quantidade).toBeCloseTo(1600, 6);
    expect(demanda.pedidoIds).toEqual(["p1", "p2"]);
  });
});

// ---------------------------------------------------------------------------
// As guardas: nada aqui pode devolver NaN.
// ---------------------------------------------------------------------------

describe("guardas da explosão", () => {
  it("ficha arquivada não explode, e diz o nome do que ficou de fora", () => {
    const demanda = explodirDemanda(
      [PEDIDO],
      [{ ...COOKIE, arquivado: true }, CAIXA_COM_6],
    );

    expect(demanda.pendencias).toContainEqual({
      nome: "Cookie tradicional",
      motivo: "SEM_FICHA",
    });
    // A caixa continua sendo contada: uma ficha sumida não leva a lista junto.
    expect(
      demanda.linhas.find((linha) => linha.insumoId === "caixa")?.quantidade,
    ).toBeCloseTo(2, 6);
    expect(demanda.linhas.some((linha) => linha.insumoId === "farinha")).toBe(
      false,
    );
  });

  it("ficha que sumiu do cadastro usa o nome congelado no pedido", () => {
    const demanda = explodirDemanda([PEDIDO], [CAIXA_COM_6]);

    // O cookie sumiu duas vezes — como item do pedido e como componente do kit
    // — e vira uma pendência só.
    expect(demanda.pendencias).toEqual([
      { nome: "Cookie tradicional", motivo: "SEM_FICHA" },
    ]);
  });

  it("rendimento zero devolve zero com explicação, e nunca NaN", () => {
    const demanda = explodirDemanda(
      [PEDIDO],
      [{ ...COOKIE, rendimento: 0 }, CAIXA_COM_6],
    );

    expect(demanda.pendencias).toContainEqual({
      nome: "Cookie tradicional",
      motivo: "SEM_RENDIMENTO",
    });
    for (const linha of demanda.linhas) {
      expect(Number.isFinite(linha.quantidade)).toBe(true);
    }
  });

  it("quantidade zerada ou negativa no pedido não vira demanda", () => {
    const demanda = explodirDemanda(
      [
        {
          id: "p3",
          itens: [
            {
              fichaTecnicaId: "cookie",
              nomeSnapshot: "Cookie tradicional",
              quantidade: -5,
            },
          ],
        },
      ],
      FICHAS,
    );

    expect(demanda.linhas).toEqual([]);
    expect(demanda.pendencias).toEqual([]);
  });

  it("insumo arquivado vira pendência na montagem, e não linha com NaN", () => {
    const lista = montarLista(
      explodirDemanda([PEDIDO], FICHAS),
      INSUMOS.map((item) =>
        item.id === "chocolate" ? { ...item, arquivado: true } : item,
      ),
      HOJE,
    );

    expect(lista.pendencias).toContainEqual({
      nome: "Chocolate",
      motivo: "SEM_INSUMO",
    });
    expect(lista.linhas.some((linha) => linha.insumoId === "chocolate")).toBe(
      false,
    );
    // 12000 menos os 4000 do chocolate que não dá para comprar.
    expect(lista.custoEstimado).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// O caso de aceite, número por número.
// ---------------------------------------------------------------------------

describe("montarLista", () => {
  it("a farinha exercita a perda: 800 g úteis viram 842,11 g físicos", () => {
    const farinha = linhaDe("farinha");

    expect(farinha?.quantidadeNecessaria).toBeCloseTo(800, 6);
    expect(farinha?.quantidadeFisica).toBeCloseTo(842.105263, 5);
    expect(farinha?.estoqueAtual).toBe(500);
    expect(farinha?.quantidadeComprar).toBeCloseTo(342.105263, 5);
    expect(farinha?.quantidadePacotes).toBe(1);
    expect(farinha?.custoEstimado).toBe(1250);
  });

  it("chocolate e manteiga fecham em um pacote cada", () => {
    expect(linhaDe("chocolate")?.quantidadeComprar).toBeCloseTo(480, 6);
    expect(linhaDe("chocolate")?.quantidadePacotes).toBe(1);
    expect(linhaDe("chocolate")?.custoEstimado).toBe(4000);

    expect(linhaDe("manteiga")?.quantidadeComprar).toBeCloseTo(320, 6);
    expect(linhaDe("manteiga")?.quantidadePacotes).toBe(1);
    expect(linhaDe("manteiga")?.custoEstimado).toBe(1750);
  });

  it("o saquinho prova a conta do estoque: precisa de 32, tem 50, não compra", () => {
    const saquinho = linhaDe("saquinho");

    expect(saquinho?.quantidadeNecessaria).toBeCloseTo(32, 6);
    expect(saquinho?.estoqueAtual).toBe(50);
    expect(saquinho?.quantidadeComprar).toBe(0);
    expect(saquinho?.quantidadePacotes).toBe(0);
    expect(saquinho?.custoEstimado).toBe(0);
  });

  it("o insumo que ela já tem continua na lista, em vez de sumir", () => {
    const lista = montarLista(explodirDemanda([PEDIDO], FICHAS), INSUMOS, HOJE);
    expect(lista.linhas.some((linha) => linha.insumoId === "saquinho")).toBe(
      true,
    );
  });

  it("a caixa prova a conta do pacote: precisa de 2 e leva 25", () => {
    const caixa = linhaDe("caixa");

    expect(caixa?.quantidadeComprar).toBeCloseTo(2, 6);
    expect(caixa?.quantidadePacotes).toBe(1);
    expect(caixa?.custoEstimado).toBe(5000);
  });

  it("o custo estimado da lista é R$ 120,00", () => {
    const lista = montarLista(explodirDemanda([PEDIDO], FICHAS), INSUMOS, HOJE);

    // 1250 + 4000 + 1750 + 0 + 5000
    expect(lista.custoEstimado).toBe(12000);
    expect(lista.pendencias).toEqual([]);
  });

  it("conta pacotes inteiros, e não a fração necessária", () => {
    // 342,11 g de farinha custariam 427 centavos rateados; o que ela paga no
    // caixa do mercado é o pacote de 1 kg.
    expect(linhaDe("farinha")?.custoEstimado).toBe(1250);
  });

  it("os itens saem na ordem em que se anda no mercado", () => {
    const lista = montarLista(explodirDemanda([PEDIDO], FICHAS), INSUMOS, HOJE);

    expect(lista.linhas.map((linha) => linha.nome)).toEqual([
      "Chocolate",
      "Farinha",
      "Manteiga",
      "Caixa",
      "Saquinho",
    ]);
  });
});

// ---------------------------------------------------------------------------
// A idade da contagem, e o que ela custa. O caso de aceite da 7B.
//
// Os mesmos cinco insumos e o mesmo pedido. O que muda é **a data da contagem**,
// e mais nada.
// ---------------------------------------------------------------------------

describe("a lista para de confiar em número velho", () => {
  /** Cenário A: contadas hoje. É o cenário da 3C, número por número. */
  const fresca = listaContadaEm(HOJE);
  /** Cenário B: contadas em 20/08, 14 dias atrás. */
  const envelhecendo = listaContadaEm("2026-08-20");
  /** Cenário C: contadas em 20/07, 45 dias atrás. */
  const vencida = listaContadaEm("2026-07-20");
  /** O mesmo cenário C por outro caminho: número gravado e nenhuma data. */
  const semData = listaContadaEm(null);

  function linha(lista: ListaMontada, insumoId: string) {
    return lista.linhas.find((atual) => atual.insumoId === insumoId);
  }

  it("contagem de hoje: os R$ 120,00 da 3C, intactos", () => {
    expect(fresca.custoEstimado).toBe(12000);
    expect(linha(fresca, "farinha")?.estoqueAtual).toBe(500);
    expect(linha(fresca, "saquinho")?.estoqueAtual).toBe(50);
  });

  it("contagem de 14 dias: os mesmos R$ 120,00, e nada some", () => {
    // Uma contagem de duas semanas ainda é a melhor informação que existe sobre
    // aquele armário. O que muda entre A e B são as palavras da tela.
    expect(envelhecendo.custoEstimado).toBe(12000);
    expect(linha(envelhecendo, "saquinho")?.quantidadePacotes).toBe(0);
  });

  it("contagem de 45 dias: R$ 150,00, porque a lista deixa de descontar", () => {
    expect(vencida.custoEstimado).toBe(15000);
    expect(linha(vencida, "farinha")?.estoqueAtual).toBe(0);
    expect(linha(vencida, "saquinho")?.estoqueAtual).toBe(0);
  });

  it("número gravado sem data nenhuma dá os mesmos R$ 150,00", () => {
    // É o estoque de todo insumo cadastrado antes desta spec. Não existe data
    // honesta a inventar para ele, e `atualizadoEm` é do documento e não da
    // contagem — então ele entra como "não sei".
    expect(semData.custoEstimado).toBe(15000);
    expect(linha(semData, "farinha")?.estoqueAtual).toBe(0);
  });

  it("o saquinho é o preço de vencer, e ele é R$ 30,00", () => {
    // A única linha em que a contagem decidia alguma coisa, e é exatamente a
    // diferença entre o cenário A e o C.
    expect(linha(fresca, "saquinho")?.quantidadePacotes).toBe(0);
    expect(linha(fresca, "saquinho")?.custoEstimado).toBe(0);

    expect(linha(vencida, "saquinho")?.quantidadeComprar).toBeCloseTo(32, 6);
    expect(linha(vencida, "saquinho")?.quantidadePacotes).toBe(1);
    expect(linha(vencida, "saquinho")?.custoEstimado).toBe(3000);

    expect(vencida.custoEstimado - fresca.custoEstimado).toBe(3000);
  });

  it("a farinha prova que vencer não custa sempre: R$ 12,50 nos três", () => {
    // 342,11 g e 842,11 g fecham no mesmo pacote de 1 kg. Deixar de descontar
    // uma contagem vencida não é multiplicar a compra — é parar de apostar.
    for (const lista of [fresca, envelhecendo, vencida, semData]) {
      expect(linha(lista, "farinha")?.custoEstimado).toBe(1250);
      expect(linha(lista, "farinha")?.quantidadePacotes).toBe(1);
    }

    expect(linha(fresca, "farinha")?.quantidadeComprar).toBeCloseTo(
      342.105263,
      5,
    );
    expect(linha(vencida, "farinha")?.quantidadeComprar).toBeCloseTo(
      842.105263,
      5,
    );
  });

  it('o bloco "Não precisa comprar" desaparece quando a contagem vence', () => {
    // Ele existe para o que o estoque cobre, e uma contagem vencida não cobre
    // nada. No cenário A ele tem o saquinho; no C, nenhuma linha.
    const cobertos = (lista: ListaMontada) =>
      lista.linhas.filter((atual) => !precisaComprar(atual));

    expect(cobertos(fresca).map((atual) => atual.nome)).toEqual(["Saquinho"]);
    expect(cobertos(envelhecendo).map((atual) => atual.nome)).toEqual([
      "Saquinho",
    ]);
    expect(cobertos(vencida)).toEqual([]);
  });

  it("a linha guarda o que foi descontado, e não o que está gravado", () => {
    // `estoqueAtual` da linha é o número que entrou na conta. O motivo mora no
    // insumo vivo: uma idade congelada num documento que ninguém reescreve
    // envelheceria errado.
    expect(linha(vencida, "farinha")?.estoqueAtual).toBe(0);
    expect(linha(vencida, "farinha")?.quantidadeFisica).toBeCloseTo(
      842.105263,
      5,
    );
  });

  it("a contagem do dia 30 ainda desconta, e a do dia 31 não", () => {
    // As bordas exatas de `IDADE_VENCE_DIAS`, vistas de dentro da lista.
    expect(listaContadaEm("2026-08-04").custoEstimado).toBe(12000);
    expect(listaContadaEm("2026-08-03").custoEstimado).toBe(15000);
  });
});

describe("a perda divide, e o estoque vem depois dela", () => {
  it("5% de perda dividem, e não multiplicam", () => {
    // Multiplicar por 1,05 daria 840, que compra de menos.
    expect(quantidadeFisica(800, 5)).toBeCloseTo(842.105263, 5);
    expect(quantidadeFisica(800, 5)).toBeGreaterThan(800 * 1.05);
  });

  it("sem perda, o físico é o útil", () => {
    expect(quantidadeFisica(480, 0)).toBe(480);
  });

  it("perda de 100% é limitada, para não dividir por zero", () => {
    expect(Number.isFinite(quantidadeFisica(100, 100))).toBe(true);
  });

  it("descontar o estoque antes da perda compraria de menos", () => {
    const farinha = linhaDe("farinha");

    // A ordem certa: (800 / 0,95) − 500 = 342,11.
    // A ordem errada: (800 − 500) / 0,95 = 315,79 — 26 g a menos no carrinho.
    expect(farinha?.quantidadeComprar).toBeCloseTo(342.105263, 5);
    expect(farinha?.quantidadeComprar).toBeGreaterThan((800 - 500) / 0.95);
  });

  it("estoque que cobre exatamente o físico não compra um pacote por sobra de arredondamento", () => {
    const lista = montarLista(
      {
        linhas: [{ insumoId: "x", nome: "Farinha", quantidade: 950 }],
        pendencias: [],
        pedidoIds: [],
      },
      [
        insumo({
          id: "x",
          nome: "Farinha",
          perdaPercentual: 5,
          estoqueAtual: 1000,
          estoqueContadoEmISO: HOJE,
        }),
      ],
      HOJE,
    );

    // 950 / 0,95 = 1000 exatos, e o estoque é 1000.
    expect(lista.linhas[0]?.quantidadeComprar).toBe(0);
    expect(lista.linhas[0]?.quantidadePacotes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A tela: corredores, rodapé, regerar e quem entra na lista.
// ---------------------------------------------------------------------------

describe("agruparPorCorredor", () => {
  it("ingrediente primeiro, depois embalagem e etiqueta", () => {
    const corredores = agruparPorCorredor([
      { categoria: "ETIQUETA" as const, nome: "Etiqueta redonda" },
      { categoria: "OUTRO" as const, nome: "Fita" },
      { categoria: "INGREDIENTE" as const, nome: "Farinha" },
      { categoria: "EMBALAGEM" as const, nome: "Saquinho" },
    ]);

    expect(corredores.map((corredor) => corredor.categoria)).toEqual([
      "INGREDIENTE",
      "EMBALAGEM",
      "ETIQUETA",
      "OUTRO",
    ]);
  });
});

describe("resumoDaLista", () => {
  const ITENS = [
    {
      insumoId: "farinha",
      quantidadePacotes: 1,
      custoEstimado: 1250,
      comprado: true,
    },
    {
      insumoId: "chocolate",
      quantidadePacotes: 1,
      custoEstimado: 4000,
      comprado: false,
    },
    {
      insumoId: "manteiga",
      quantidadePacotes: 1,
      custoEstimado: 1750,
      comprado: false,
    },
    {
      insumoId: "saquinho",
      quantidadePacotes: 0,
      custoEstimado: 0,
      comprado: false,
    },
    {
      insumoId: "caixa",
      quantidadePacotes: 1,
      custoEstimado: 5000,
      comprado: false,
    },
  ];

  it("o restante desce a cada item marcado", () => {
    expect(resumoDaLista(ITENS)).toEqual({
      total: 12000,
      restante: 10750,
      aComprar: 4,
      comprados: 1,
      jaTem: 1,
    });
  });

  it("o que ela já tem não conta como comprado nem como a comprar", () => {
    expect(statusDaLista(ITENS)).toBe("PARCIAL");
    expect(
      statusDaLista(ITENS.map((item) => ({ ...item, comprado: true }))),
    ).toBe("COMPRADA");
    expect(
      statusDaLista(ITENS.map((item) => ({ ...item, comprado: false }))),
    ).toBe("ABERTA");
  });
});

describe("preservarComprados", () => {
  it("regerar não apaga meia hora de carrinho", () => {
    const anteriores = [
      { insumoId: "farinha", comprado: true },
      { insumoId: "chocolate", comprado: false },
    ];

    const novos = preservarComprados(
      [
        { insumoId: "farinha" },
        { insumoId: "chocolate" },
        { insumoId: "manteiga" },
      ],
      anteriores,
    );

    expect(novos).toEqual([
      { insumoId: "farinha", comprado: true },
      { insumoId: "chocolate", comprado: false },
      // O que entrou com o pedido novo nasce por comprar.
      { insumoId: "manteiga", comprado: false },
    ]);
  });

  it("o que saiu da lista não volta", () => {
    const novos = preservarComprados(
      [{ insumoId: "farinha" }],
      [
        { insumoId: "farinha", comprado: true },
        { insumoId: "chocolate", comprado: true },
      ],
    );

    expect(novos).toHaveLength(1);
  });
});

describe("quais pedidos entram", () => {
  const AGENDA: { status: StatusPedido; dataEntregaISO: string }[] = [
    { status: "ORCAMENTO", dataEntregaISO: "2026-09-05" },
    { status: "CONFIRMADO", dataEntregaISO: "2026-09-05" },
    { status: "EM_PRODUCAO", dataEntregaISO: "2026-09-06" },
    { status: "PRONTO", dataEntregaISO: "2026-09-07" },
    { status: "ENTREGUE", dataEntregaISO: "2026-09-04" },
    { status: "CANCELADO", dataEntregaISO: "2026-09-05" },
    { status: "CONFIRMADO", dataEntregaISO: "2026-09-30" },
  ];

  it("só confirmado, em produção e pronto, dentro do período", () => {
    const dentro = AGENDA.filter((pedido) =>
      entraNaLista(pedido, "2026-09-02", "2026-09-09"),
    );

    expect(dentro).toEqual([
      { status: "CONFIRMADO", dataEntregaISO: "2026-09-05" },
      { status: "EM_PRODUCAO", dataEntregaISO: "2026-09-06" },
      { status: "PRONTO", dataEntregaISO: "2026-09-07" },
    ]);
  });

  it("o orçamento fica de fora, e a tela sabe quantos são", () => {
    expect(orcamentosDeFora(AGENDA, "2026-09-02", "2026-09-09")).toHaveLength(
      1,
    );
    expect(orcamentosDeFora(AGENDA, "2026-09-10", "2026-09-30")).toEqual([]);
  });
});

describe("rotuloDeCompra", () => {
  it("diz a verdade da gôndola", () => {
    expect(rotuloDeCompra(1, 1, "kg")).toBe("1 pacote de 1 kg");
    expect(rotuloDeCompra(2, 500, "g")).toBe("2 pacotes de 500 g");
    expect(rotuloDeCompra(1, 25, "un")).toBe("1 pacote de 25 un");
  });
});
