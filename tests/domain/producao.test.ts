import { describe, expect, it } from "vitest";
import {
  explodirDemanda,
  insumosPorLote,
  montarLista,
  type FichaParaExplodir,
  type InsumoParaLista,
} from "@/lib/domain/listaCompras";
import {
  capacidadeDaFicha,
  consumoDesdeAContagem,
  consumoPorLote,
  disponivelParaProducao,
  faltaPara,
  fornadaGravavel,
  fornadasDesdeAContagem,
  produzidoParaPedidos,
  projecaoDoInsumo,
  prometidoParaPedidos,
  type FichaParaProduzir,
  type FornadaRegistrada,
  type InsumoParaCapacidade,
} from "@/lib/domain/producao";

// ---------------------------------------------------------------------------
// O mesmo cenário da 3C: cookie rende 20 e leva 500 g de farinha (5% de
// perda), 300 g de chocolate, 200 g de manteiga e 20 saquinhos. A caixa com 6
// é um kit que leva 6 cookies e 1 caixa.
// ---------------------------------------------------------------------------

const COOKIE: FichaParaProduzir = {
  id: "cookie",
  nome: "Cookie tradicional",
  arquivado: false,
  rendimento: 20,
  unidadeRendimento: "un",
  itens: [
    { insumoId: "farinha", nomeSnapshot: "Farinha", quantidade: 500 },
    { insumoId: "chocolate", nomeSnapshot: "Chocolate", quantidade: 300 },
    { insumoId: "manteiga", nomeSnapshot: "Manteiga", quantidade: 200 },
    { insumoId: "saquinho", nomeSnapshot: "Saquinho", quantidade: 20 },
  ],
  componentes: [],
};

const CAIXA_COM_6: FichaParaProduzir = {
  id: "caixa6",
  nome: "Caixa com 6",
  arquivado: false,
  rendimento: 1,
  unidadeRendimento: "un",
  itens: [{ insumoId: "caixa", nomeSnapshot: "Caixa", quantidade: 1 }],
  componentes: [
    { fichaId: "cookie", nomeSnapshot: "Cookie tradicional", quantidade: 6 },
  ],
};

const FICHAS = [COOKIE, CAIXA_COM_6];

const PERDAS = [
  { id: "farinha", perdaPercentual: 5 },
  { id: "chocolate", perdaPercentual: 0 },
  { id: "manteiga", perdaPercentual: 0 },
  { id: "saquinho", perdaPercentual: 0 },
  { id: "caixa", perdaPercentual: 0 },
];

const HOJE = "2026-09-10";

function fornada(
  parcial: Partial<FornadaRegistrada> & { dataISO: string },
): FornadaRegistrada {
  return {
    arquivado: false,
    consumo: [
      { insumoId: "farinha", nomeSnapshot: "Farinha", quantidade: 526.32 },
      { insumoId: "chocolate", nomeSnapshot: "Chocolate", quantidade: 300 },
    ],
    ...parcial,
  };
}

function consumoDe(
  consumo: { insumoId: string; quantidade: number }[],
  id: string,
) {
  return consumo.find((linha) => linha.insumoId === id)?.quantidade;
}

// ---------------------------------------------------------------------------
// O que um lote tira da despensa
// ---------------------------------------------------------------------------

describe("consumoPorLote", () => {
  it("é a receita passada pela perda: 500 g úteis de farinha são 526,32 g físicos", () => {
    const consumo = consumoPorLote(COOKIE, FICHAS, PERDAS);

    expect(consumoDe(consumo, "farinha")).toBeCloseTo(526.315789, 5);
    expect(consumoDe(consumo, "chocolate")).toBe(300);
    expect(consumoDe(consumo, "saquinho")).toBe(20);
  });

  it("o kit de um nível: a caixa mais 6/20 de um lote de cookie", () => {
    const consumo = consumoPorLote(CAIXA_COM_6, FICHAS, PERDAS);

    expect(consumoDe(consumo, "caixa")).toBe(1);
    // 6 cookies de um lote de 20: 150 g úteis de farinha, 157,89 g físicos.
    expect(consumoDe(consumo, "farinha")).toBeCloseTo(157.894737, 5);
    expect(consumoDe(consumo, "chocolate")).toBeCloseTo(90, 6);
  });

  it("o componente de um componente não é seguido", () => {
    const cesta: FichaParaProduzir = {
      id: "cesta",
      nome: "Cesta",
      arquivado: false,
      rendimento: 1,
      unidadeRendimento: "un",
      itens: [],
      componentes: [
        { fichaId: "caixa6", nomeSnapshot: "Caixa com 6", quantidade: 2 },
      ],
    };

    const consumo = consumoPorLote(cesta, [...FICHAS, cesta], PERDAS);
    expect(consumoDe(consumo, "caixa")).toBe(2);
    expect(consumoDe(consumo, "farinha")).toBeUndefined();
  });

  it("insumo sem cadastro entra sem perda, e não como NaN", () => {
    const consumo = consumoPorLote(COOKIE, FICHAS, []);
    expect(consumoDe(consumo, "farinha")).toBe(500);
  });

  it("a lista de compras e a fornada usam a mesma regra do kit", () => {
    // `explodirDemanda` de UMA caixa é `insumosPorLote` da caixa, útil.
    const porId = new Map<string, FichaParaExplodir>(
      FICHAS.map((ficha) => [ficha.id, ficha]),
    );
    const explodido = explodirDemanda(
      [
        {
          id: "p",
          itens: [
            { fichaTecnicaId: "caixa6", nomeSnapshot: "Caixa", quantidade: 1 },
          ],
        },
      ],
      FICHAS,
    );

    for (const [insumoId, linha] of insumosPorLote(CAIXA_COM_6, porId)) {
      expect(
        explodido.linhas.find((atual) => atual.insumoId === insumoId)
          ?.quantidade,
      ).toBeCloseTo(linha.quantidade, 6);
    }
  });
});

describe("fornadaGravavel", () => {
  const umLote = consumoPorLote(COOKIE, FICHAS, PERDAS);

  it("as unidades viram lotes pela receita, e o consumo segue os lotes", () => {
    // Massa para 40 cookies numa receita de 20: dois lotes.
    const gravavel = fornadaGravavel(COOKIE, 40, umLote);

    expect(gravavel.lotes).toBe(2);
    expect(gravavel.unidadesProduzidas).toBe(40);
    expect(consumoDe(gravavel.consumo, "farinha")).toBeCloseTo(1052.631579, 5);
    expect(consumoDe(gravavel.consumo, "saquinho")).toBe(40);
  });

  it("massa para menos do que a receita rende é lote fracionário", () => {
    // A despensa não dá para 20: ela faz 15, e isso é 0,75 lote.
    const gravavel = fornadaGravavel(COOKIE, 15, umLote);

    expect(gravavel.lotes).toBe(0.75);
    expect(gravavel.unidadesProduzidas).toBe(15);
    expect(consumoDe(gravavel.consumo, "chocolate")).toBe(225);
  });

  it("em unidade arredonda para baixo antes de contar os lotes", () => {
    const gravavel = fornadaGravavel(COOKIE, 12.5, umLote);
    expect(gravavel.unidadesProduzidas).toBe(12);
    expect(gravavel.lotes).toBe(0.6);
  });

  it("em grama a fração é real", () => {
    const bolo: FichaParaProduzir = {
      ...COOKIE,
      rendimento: 1500,
      unidadeRendimento: "g",
    };
    const gravavel = fornadaGravavel(bolo, 750, umLote);
    expect(gravavel.unidadesProduzidas).toBe(750);
    expect(gravavel.lotes).toBe(0.5);
  });

  it("rendimento zero não divide por zero", () => {
    const gravavel = fornadaGravavel({ ...COOKIE, rendimento: 0 }, 10, umLote);
    expect(gravavel.lotes).toBe(0);
    expect(consumoDe(gravavel.consumo, "farinha")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A projeção, e o dia da contagem que é opaco
// ---------------------------------------------------------------------------

describe("consumoDesdeAContagem", () => {
  const FORNADAS = [
    fornada({ dataISO: "2026-09-05" }),
    fornada({ dataISO: "2026-09-08" }),
  ];

  it("a fornada do dia seguinte à contagem desconta; a do mesmo dia, não", () => {
    const contadaDia4 = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-04" },
    ]);
    expect(contadaDia4.get("farinha")).toBeCloseTo(1052.64, 6);

    // Contou no dia 5: a fornada do dia 5 já está dentro do número que ela
    // digitou. Só a do dia 8 desconta.
    const contadaDia5 = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-05" },
    ]);
    expect(contadaDia5.get("farinha")).toBeCloseTo(526.32, 6);

    // Contou no dia 8: nada desconta, e o insumo nem entra no mapa.
    const contadaDia8 = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-08" },
    ]);
    expect(contadaDia8.has("farinha")).toBe(false);
  });

  it("a data é por insumo: a mesma fornada conta para um e não para o outro", () => {
    const consumo = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-01" },
      { id: "chocolate", estoqueContadoEmISO: "2026-09-07" },
    ]);

    expect(consumo.get("farinha")).toBeCloseTo(1052.64, 6);
    expect(consumo.get("chocolate")).toBe(300);
  });

  it("insumo sem data de contagem não entra: não há medição de que descontar", () => {
    const consumo = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha" },
      { id: "chocolate", estoqueContadoEmISO: null },
    ]);
    expect(consumo.size).toBe(0);
  });

  it("fornada arquivada sai da projeção", () => {
    const consumo = consumoDesdeAContagem(
      [fornada({ dataISO: "2026-09-08", arquivado: true })],
      [{ id: "farinha", estoqueContadoEmISO: "2026-09-01" }],
    );
    expect(consumo.size).toBe(0);
  });

  it("contar de novo zera o efeito de tudo o que veio antes", () => {
    const antes = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-01" },
    ]);
    const depois = consumoDesdeAContagem(FORNADAS, [
      { id: "farinha", estoqueContadoEmISO: "2026-09-09" },
    ]);

    expect(antes.get("farinha")).toBeGreaterThan(0);
    expect(depois.has("farinha")).toBe(false);
  });

  it("o consumo é o congelado na fornada, e não a ficha de hoje", () => {
    // A ficha foi arquivada (ou mudou) depois da fornada. A projeção não lê a
    // ficha: o que saiu da despensa em setembro não muda em outubro.
    const consumo = consumoDesdeAContagem(
      [
        {
          arquivado: false,
          dataISO: "2026-09-08",
          consumo: [
            { insumoId: "farinha", nomeSnapshot: "Farinha", quantidade: 999 },
          ],
        },
      ],
      [{ id: "farinha", estoqueContadoEmISO: "2026-09-01" }],
    );
    expect(consumo.get("farinha")).toBe(999);
  });
});

describe("disponivelParaProducao e projecaoDoInsumo", () => {
  it("o que a contagem disse, menos o que o forno levou, nunca negativo", () => {
    const insumo = { estoqueAtual: 1200, estoqueContadoEmISO: "2026-09-05" };
    expect(disponivelParaProducao(insumo, 526, HOJE)).toBe(674);
    expect(disponivelParaProducao(insumo, 2000, HOJE)).toBe(0);
  });

  it("contagem vencida vale zero, com ou sem fornada", () => {
    const insumo = { estoqueAtual: 1200, estoqueContadoEmISO: "2026-07-01" };
    expect(disponivelParaProducao(insumo, 0, HOJE)).toBe(0);
  });

  it("a linha da despensa: 1,2 kg contados, 2 fornadas, projetamos 147,36 g", () => {
    const projecao = projecaoDoInsumo(
      [fornada({ dataISO: "2026-09-06" }), fornada({ dataISO: "2026-09-08" })],
      { id: "farinha", estoqueAtual: 1200, estoqueContadoEmISO: "2026-09-05" },
      HOJE,
    );

    expect(projecao.fornadas).toBe(2);
    expect(projecao.consumo).toBeCloseTo(1052.64, 6);
    expect(projecao.disponivel).toBeCloseTo(147.36, 6);
  });

  it("a fornada que não levou este insumo não conta como fornada dele", () => {
    const projecao = projecaoDoInsumo(
      [fornada({ dataISO: "2026-09-08" })],
      { id: "caixa", estoqueAtual: 25, estoqueContadoEmISO: "2026-09-05" },
      HOJE,
    );
    expect(projecao.fornadas).toBe(0);
    expect(projecao.disponivel).toBe(25);
  });

  it("fornadasDesdeAContagem devolve as fornadas, e não só o número", () => {
    const desde = fornadasDesdeAContagem(
      [fornada({ dataISO: "2026-09-04" }), fornada({ dataISO: "2026-09-08" })],
      { id: "farinha", estoqueContadoEmISO: "2026-09-05" },
    );
    expect(desde.map((atual) => atual.dataISO)).toEqual(["2026-09-08"]);
  });
});

// ---------------------------------------------------------------------------
// O abate do pedido, e a lista de compras com o forno dentro
// ---------------------------------------------------------------------------

describe("produzidoParaPedidos", () => {
  it("soma o consumo das fornadas dos pedidos da lista, e ignora o resto", () => {
    const produzido = produzidoParaPedidos(
      [
        fornada({ dataISO: "2026-09-08", pedidoId: "p1" }),
        fornada({ dataISO: "2026-09-08", pedidoId: "p2" }),
        fornada({ dataISO: "2026-09-08" }),
        fornada({ dataISO: "2026-09-08", pedidoId: "p1", arquivado: true }),
      ],
      ["p1"],
    );

    expect(produzido.get("farinha")).toBeCloseTo(526.32, 6);
    expect(produzido.get("chocolate")).toBe(300);
  });
});

describe("montarLista com o forno dentro", () => {
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

  /** Um pedido de 20 cookies: um lote inteiro, 300 g de chocolate. */
  const PEDIDO = {
    id: "p1",
    itens: [
      { fichaTecnicaId: "cookie", nomeSnapshot: "Cookie", quantidade: 20 },
    ],
  };
  const DEMANDA = explodirDemanda([PEDIDO], FICHAS);

  /** Chocolate contado com 1 kg no dia 5, e mais nada contado. */
  const INSUMOS = [
    insumo({ id: "farinha", perdaPercentual: 5 }),
    insumo({
      id: "chocolate",
      estoqueAtual: 1000,
      estoqueContadoEmISO: "2026-09-05",
    }),
    insumo({ id: "manteiga" }),
    insumo({ id: "saquinho", unidadeBase: "un", quantidadeBase: 100 }),
  ];

  const linha = (lista: ReturnType<typeof montarLista>, id: string) =>
    lista.linhas.find((atual) => atual.insumoId === id);

  it("sem o quarto parâmetro a lista é exatamente a de antes", () => {
    const lista = montarLista(DEMANDA, INSUMOS, HOJE);
    const chocolate = linha(lista, "chocolate");

    expect(chocolate?.estoqueAtual).toBe(1000);
    expect(chocolate?.consumoDeFornadas).toBe(0);
    expect(chocolate?.quantidadeJaProduzida).toBe(0);
    expect(chocolate?.quantidadePacotes).toBe(0);
  });

  it("uma fornada SEM pedido: a despensa desce e a lista continua comprando", () => {
    // Ela assou um lote para a vitrine no dia 8, depois da contagem do dia 5.
    // O chocolate projetado cai de 1000 para 700, e os 300 g do pedido ainda
    // cabem — mas com 400 g de folga, e não 700.
    const fornadas = [fornada({ dataISO: "2026-09-08" })];
    const lista = montarLista(DEMANDA, INSUMOS, HOJE, {
      consumo: consumoDesdeAContagem(fornadas, INSUMOS),
      produzido: produzidoParaPedidos(fornadas, DEMANDA.pedidoIds),
    });
    const chocolate = linha(lista, "chocolate");

    expect(chocolate?.consumoDeFornadas).toBe(300);
    expect(chocolate?.quantidadeJaProduzida).toBe(0);
    expect(chocolate?.quantidadeComprar).toBe(0);

    // Uma segunda fornada de vitrine, e agora falta: 1000 − 600 = 400 < 300? Não.
    // Uma terceira: 1000 − 900 = 100 disponíveis contra 300 pedidos → compra.
    const tres = [
      fornada({ dataISO: "2026-09-06" }),
      fornada({ dataISO: "2026-09-07" }),
      fornada({ dataISO: "2026-09-08" }),
    ];
    const apertada = montarLista(DEMANDA, INSUMOS, HOJE, {
      consumo: consumoDesdeAContagem(tres, INSUMOS),
      produzido: produzidoParaPedidos(tres, DEMANDA.pedidoIds),
    });
    expect(linha(apertada, "chocolate")?.quantidadeComprar).toBeCloseTo(200, 6);
    expect(linha(apertada, "chocolate")?.quantidadePacotes).toBe(1);
  });

  it("uma fornada PARA o pedido: a lista deixa de comprar para ele", () => {
    // A mesma fornada, agora amarrada ao p1. Ela tira 300 g da despensa **e**
    // abate os 300 g que o pedido pedia: as duas contas se anulam, e a farinha
    // — sem contagem — deixa de ser comprada porque já foi assada.
    const fornadas = [fornada({ dataISO: "2026-09-08", pedidoId: "p1" })];
    const lista = montarLista(DEMANDA, INSUMOS, HOJE, {
      consumo: consumoDesdeAContagem(fornadas, INSUMOS),
      produzido: produzidoParaPedidos(fornadas, DEMANDA.pedidoIds),
    });

    const chocolate = linha(lista, "chocolate");
    expect(chocolate?.quantidadeJaProduzida).toBe(300);
    expect(chocolate?.consumoDeFornadas).toBe(300);
    expect(chocolate?.quantidadeComprar).toBe(0);

    const farinha = linha(lista, "farinha");
    expect(farinha?.quantidadeJaProduzida).toBeCloseTo(526.32, 6);
    expect(farinha?.quantidadeComprar).toBe(0);
    expect(farinha?.quantidadePacotes).toBe(0);

    // A manteiga não estava na fornada registrada: continua sendo comprada.
    expect(linha(lista, "manteiga")?.quantidadePacotes).toBe(1);
  });

  it("produção parcial: meio pedido assado abate metade da demanda", () => {
    const meia = [
      {
        arquivado: false,
        dataISO: "2026-09-08",
        pedidoId: "p1",
        consumo: [
          { insumoId: "chocolate", nomeSnapshot: "Chocolate", quantidade: 150 },
        ],
      },
    ];
    const lista = montarLista(
      DEMANDA,
      INSUMOS.map((atual) =>
        atual.id === "chocolate" ? { ...atual, estoqueAtual: 100 } : atual,
      ),
      HOJE,
      {
        consumo: consumoDesdeAContagem(meia, INSUMOS),
        produzido: produzidoParaPedidos(meia, DEMANDA.pedidoIds),
      },
    );

    // Pedia 300, já assou 150, tinha 100 e o forno levou 100: compra 150.
    const chocolate = linha(lista, "chocolate");
    expect(chocolate?.quantidadeJaProduzida).toBe(150);
    expect(chocolate?.estoqueAtual).toBe(100);
    expect(chocolate?.consumoDeFornadas).toBe(150);
    expect(chocolate?.quantidadeComprar).toBeCloseTo(150, 6);
  });

  it("o abate é do lado físico: a farinha com perda abate 526,32 g, e não 500", () => {
    const fornadas = [fornada({ dataISO: "2026-09-08", pedidoId: "p1" })];
    const lista = montarLista(DEMANDA, INSUMOS, HOJE, {
      consumo: consumoDesdeAContagem(fornadas, INSUMOS),
      produzido: produzidoParaPedidos(fornadas, DEMANDA.pedidoIds),
    });

    const farinha = linha(lista, "farinha");
    expect(farinha?.quantidadeFisica).toBeCloseTo(526.315789, 5);
    expect(farinha?.quantidadeJaProduzida).toBeCloseTo(526.32, 6);
  });
});

// ---------------------------------------------------------------------------
// Quantas fornadas dá
// ---------------------------------------------------------------------------

describe("capacidadeDaFicha", () => {
  function contado(
    parcial: Partial<InsumoParaCapacidade> & { id: string },
  ): InsumoParaCapacidade {
    return {
      nome: parcial.id,
      arquivado: false,
      unidadeBase: "g",
      perdaPercentual: 0,
      estoqueContadoEmISO: "2026-09-08",
      ...parcial,
    };
  }

  /** Tudo contado e fresco: farinha 2 kg, chocolate 1 kg, manteiga 1 kg, 100 saquinhos. */
  const DESPENSA = [
    contado({ id: "farinha", perdaPercentual: 5, estoqueAtual: 2000 }),
    contado({ id: "chocolate", estoqueAtual: 1000 }),
    contado({ id: "manteiga", estoqueAtual: 1000 }),
    contado({ id: "saquinho", unidadeBase: "un", estoqueAtual: 100 }),
    contado({ id: "caixa", unidadeBase: "un", estoqueAtual: 10 }),
  ];
  const SEM_CONSUMO = new Map<string, number>();

  it("todo insumo contado: MEDIDA, o número e o gargalo nomeado", () => {
    // Farinha: 2000 ÷ 526,32 = 3,8 · chocolate: 1000 ÷ 300 = 3,33 · manteiga 5 ·
    // saquinho 5. Trava no chocolate, com 3 fornadas inteiras.
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      DESPENSA,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("MEDIDA");
    expect(capacidade?.fornadas).toBe(3);
    // 3,33 lotes × 20 = 66 cookies, e não 60: a massa se faz do tamanho que quiser.
    expect(capacidade?.unidades).toBe(66);
    expect(capacidade?.gargalo?.nome).toBe("chocolate");
    expect(capacidade?.gargalo?.tem).toBe(1000);
    expect(capacidade?.gargalo?.precisaPorLote).toBe(300);
    expect(capacidade?.semContagem).toEqual([]);
    expect(capacidade?.descontaPedidos).toBe(false);
  });

  it("o gargalo sem contagem: DESCONHECIDA e null, e não zero", () => {
    const nadaContado = DESPENSA.map((insumo) => ({
      ...insumo,
      estoqueAtual: undefined,
      estoqueContadoEmISO: undefined,
    }));
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      nadaContado,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("DESCONHECIDA");
    expect(capacidade?.fornadas).toBeNull();
    expect(capacidade?.unidades).toBeNull();
    expect(capacidade?.gargalo).toBeNull();
    expect(capacidade?.semContagem).toEqual([
      "Chocolate",
      "Farinha",
      "Manteiga",
      "Saquinho",
    ]);
  });

  it("contagem vencida vale sem contagem, e não o número velho", () => {
    const vencida = DESPENSA.map((insumo) =>
      insumo.id === "chocolate"
        ? { ...insumo, estoqueContadoEmISO: "2026-07-01" }
        : insumo,
    );
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      vencida,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("PISO");
    expect(capacidade?.semContagem).toEqual(["Chocolate"]);
    // Sem o chocolate, o gargalo passa a ser a farinha: 3 fornadas ainda.
    expect(capacidade?.gargalo?.nome).toBe("farinha");
    expect(capacidade?.fornadas).toBe(3);
  });

  it("insumo sem contagem que não é o gargalo: PISO com o número dos contados", () => {
    const semManteiga = DESPENSA.filter((insumo) => insumo.id !== "manteiga");
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      semManteiga,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("PISO");
    expect(capacidade?.fornadas).toBe(3);
    expect(capacidade?.gargalo?.nome).toBe("chocolate");
    expect(capacidade?.semContagem).toEqual(["Manteiga"]);
  });

  it("registrar uma fornada derruba a capacidade na hora, sem contagem nova", () => {
    // Uma massa de um lote no dia 9, depois da contagem do dia 8: o chocolate
    // projetado cai para 700 g, e a capacidade de 3 para 2.
    const fornadas = [fornada({ dataISO: "2026-09-09" })];
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      DESPENSA,
      consumoDesdeAContagem(fornadas, DESPENSA),
      HOJE,
    );

    expect(capacidade?.fornadas).toBe(2);
    expect(capacidade?.gargalo?.tem).toBe(700);
  });

  it("o kit respeita o nível único e conta a embalagem própria", () => {
    // Uma caixa leva 6/20 de lote de cookie mais uma caixa: 10 caixas travam
    // na embalagem antes do chocolate (1000 ÷ 90 = 11).
    const capacidade = capacidadeDaFicha(
      CAIXA_COM_6,
      FICHAS,
      DESPENSA,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("MEDIDA");
    expect(capacidade?.fornadas).toBe(10);
    expect(capacidade?.gargalo?.nome).toBe("caixa");
  });

  it("a capacidade desconta o que já está prometido a outros pedidos", () => {
    // Um pedido de 40 cookies já fechado leva 600 g de chocolate: sobram 400 g,
    // que dão 1 fornada e 26 cookies, e a ficha diz que descontou pedidos.
    const prometido = prometidoParaPedidos(
      [
        {
          id: "p1",
          itens: [
            {
              fichaTecnicaId: "cookie",
              nomeSnapshot: "Cookie",
              quantidade: 40,
            },
          ],
        },
      ],
      FICHAS,
      DESPENSA,
      [],
    );
    expect(prometido.get("chocolate")).toBe(600);
    expect(prometido.get("farinha")).toBeCloseTo(1052.63, 2);

    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      DESPENSA,
      SEM_CONSUMO,
      HOJE,
      prometido,
    );
    expect(capacidade?.fornadas).toBe(1);
    expect(capacidade?.unidades).toBe(26);
    expect(capacidade?.descontaPedidos).toBe(true);
  });

  it("o prometido abate o que já virou massa para o pedido", () => {
    // Do pedido de 40, metade já virou massa: o prometido é só a outra metade.
    const prometido = prometidoParaPedidos(
      [
        {
          id: "p1",
          itens: [
            {
              fichaTecnicaId: "cookie",
              nomeSnapshot: "Cookie",
              quantidade: 40,
            },
          ],
        },
      ],
      FICHAS,
      DESPENSA,
      [fornada({ dataISO: "2026-09-09", pedidoId: "p1" })],
    );
    expect(prometido.get("chocolate")).toBe(300);
  });

  it("o que falta para um pedido, insumo por insumo", () => {
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      DESPENSA,
      SEM_CONSUMO,
      HOJE,
    );
    if (!capacidade) throw new Error("sem capacidade");

    expect(faltaPara(capacidade, 60)).toEqual([]);

    // 100 cookies são 5 lotes: 1500 g de chocolate contra 1000, e 2631,58 g de
    // farinha contra 2000. Manteiga e saquinho dão exatamente.
    const falta = faltaPara(capacidade, 100);
    expect(falta.map((linha) => linha.nome)).toEqual(["chocolate", "farinha"]);
    expect(falta[0]?.falta).toBe(500);
    expect(falta[1]?.falta).toBeCloseTo(631.58, 2);
  });

  it("ficha sem itens, rendimento zero e ficha arquivada não têm capacidade", () => {
    const vazia = { ...COOKIE, itens: [] };
    expect(
      capacidadeDaFicha(vazia, FICHAS, DESPENSA, SEM_CONSUMO, HOJE),
    ).toBeNull();
    expect(
      capacidadeDaFicha(
        { ...COOKIE, rendimento: 0 },
        FICHAS,
        DESPENSA,
        SEM_CONSUMO,
        HOJE,
      ),
    ).toBeNull();
    expect(
      capacidadeDaFicha(
        { ...COOKIE, arquivado: true },
        FICHAS,
        DESPENSA,
        SEM_CONSUMO,
        HOJE,
      ),
    ).toBeNull();
  });

  it("despensa zerada num insumo contado é zero, e não desconhecida", () => {
    const semChocolate = DESPENSA.map((insumo) =>
      insumo.id === "chocolate" ? { ...insumo, estoqueAtual: 0 } : insumo,
    );
    const capacidade = capacidadeDaFicha(
      COOKIE,
      FICHAS,
      semChocolate,
      SEM_CONSUMO,
      HOJE,
    );

    expect(capacidade?.leitura).toBe("MEDIDA");
    expect(capacidade?.fornadas).toBe(0);
    expect(capacidade?.unidades).toBe(0);
    expect(capacidade?.gargalo?.nome).toBe("chocolate");
  });
});
