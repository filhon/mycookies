import { describe, expect, it } from "vitest";
import {
  contagemDoInsumo,
  entradasDaLista,
  entradasDaNota,
  estoqueParaLista,
  frescorDaContagem,
  IDADE_FRESCA_DIAS,
  IDADE_VENCE_DIAS,
  linhasParaContar,
  numeroContado,
  resumoDaContagem,
  rotuloDeIdade,
  sugestaoDaContagem,
  type InsumoParaContar,
} from "@/lib/domain/estoque";

/**
 * O caso de aceite da spec 007, sessão 7A: os cinco insumos da 3C, hoje
 * 03/09/2026. A farinha tem 500 g anotados e nenhuma data, o saquinho tem 50 un
 * e nenhuma data, os outros três não têm estoque nenhum.
 */
const HOJE = "2026-09-03";

function insumo(
  parcial: Partial<InsumoParaContar> & { id: string },
): InsumoParaContar {
  return {
    nome: parcial.id,
    categoria: "INGREDIENTE",
    unidadeBase: "g",
    arquivado: false,
    ...parcial,
  };
}

const INSUMOS: InsumoParaContar[] = [
  insumo({ id: "farinha", nome: "Farinha", estoqueAtual: 500 }),
  insumo({ id: "chocolate", nome: "Chocolate" }),
  insumo({ id: "manteiga", nome: "Manteiga" }),
  insumo({
    id: "caixa",
    nome: "Caixa",
    categoria: "EMBALAGEM",
    unidadeBase: "un",
  }),
  insumo({
    id: "saquinho",
    nome: "Saquinho",
    categoria: "EMBALAGEM",
    unidadeBase: "un",
    estoqueAtual: 50,
  }),
];

const SEM_ENTRADAS = new Map<string, number>();

/** Um insumo contado há N dias, com o que ela viu. */
function contadoHa(dias: number, quantidade: number) {
  const data = new Date(2026, 8, 3);
  data.setDate(data.getDate() - dias);
  const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(data.getDate()).padStart(2, "0")}`;

  return { estoqueAtual: quantidade, estoqueContadoEmISO: iso };
}

describe("frescorDaContagem", () => {
  it("vale FRESCA até o sétimo dia, inclusive", () => {
    expect(frescorDaContagem("2026-09-03", HOJE)).toBe("FRESCA");
    expect(frescorDaContagem("2026-08-27", HOJE)).toBe("FRESCA");
    expect(IDADE_FRESCA_DIAS).toBe(7);
  });

  it("vira ENVELHECENDO no oitavo dia e continua até o trigésimo", () => {
    expect(frescorDaContagem("2026-08-26", HOJE)).toBe("ENVELHECENDO");
    expect(frescorDaContagem("2026-08-04", HOJE)).toBe("ENVELHECENDO");
    expect(IDADE_VENCE_DIAS).toBe(30);
  });

  it("vence no trigésimo primeiro dia", () => {
    expect(frescorDaContagem("2026-08-03", HOJE)).toBe("VENCIDA");
    expect(frescorDaContagem("2026-07-20", HOJE)).toBe("VENCIDA");
  });

  it("sem data é NUNCA, e data no futuro é dedo errado que vale FRESCA", () => {
    expect(frescorDaContagem(undefined, HOJE)).toBe("NUNCA");
    expect(frescorDaContagem(null, HOJE)).toBe("NUNCA");
    expect(frescorDaContagem("", HOJE)).toBe("NUNCA");
    expect(frescorDaContagem("2027-01-10", HOJE)).toBe("FRESCA");
  });
});

describe("contagemDoInsumo", () => {
  it("devolve o número contado quando a contagem é fresca", () => {
    const contagem = contagemDoInsumo(contadoHa(3, 620), HOJE);

    expect(contagem.frescor).toBe("FRESCA");
    expect(contagem.quantidade).toBe(620);
    expect(contagem.idadeEmDias).toBe(3);
    expect(contagem.anotado).toBe(620);
  });

  it("zero contado é uma contagem, e não ausência", () => {
    const contagem = contagemDoInsumo(contadoHa(0, 0), HOJE);

    expect(contagem.frescor).toBe("FRESCA");
    expect(contagem.quantidade).toBe(0);
    expect(contagem.anotado).toBe(0);
    expect(estoqueParaLista(contadoHa(0, 0), HOJE)).toBe(0);
  });

  it("na contagem vencida a quantidade é null, e o anotado continua à vista", () => {
    const contagem = contagemDoInsumo(contadoHa(45, 500), HOJE);

    expect(contagem.frescor).toBe("VENCIDA");
    // Não é zero: é "não sei". O número gravado continua sendo dito na tela.
    expect(contagem.quantidade).toBeNull();
    expect(contagem.anotado).toBe(500);
    expect(contagem.idadeEmDias).toBe(45);
  });

  it("número sem data é NUNCA, com o anotado preservado", () => {
    const contagem = contagemDoInsumo({ estoqueAtual: 500 }, HOJE);

    expect(contagem.frescor).toBe("NUNCA");
    expect(contagem.quantidade).toBeNull();
    expect(contagem.idadeEmDias).toBeNull();
    expect(contagem.anotado).toBe(500);
  });

  it("data sem número não é contagem", () => {
    // O formulário de insumo pode apagar o estoque e carregar a data adiante.
    const contagem = contagemDoInsumo(
      { estoqueAtual: null, estoqueContadoEmISO: HOJE },
      HOJE,
    );

    expect(contagem.frescor).toBe("NUNCA");
    expect(contagem.anotado).toBeNull();
  });

  it("estoque negativo é dedo errado, e vale ausência", () => {
    expect(contagemDoInsumo(contadoHa(1, -5), HOJE).anotado).toBeNull();
    expect(estoqueParaLista(contadoHa(1, -5), HOJE)).toBe(0);
  });
});

describe("estoqueParaLista", () => {
  it("desconta a contagem fresca e a que está envelhecendo", () => {
    expect(estoqueParaLista(contadoHa(0, 500), HOJE)).toBe(500);
    expect(estoqueParaLista(contadoHa(7, 500), HOJE)).toBe(500);
    expect(estoqueParaLista(contadoHa(14, 500), HOJE)).toBe(500);
    expect(estoqueParaLista(contadoHa(30, 500), HOJE)).toBe(500);
  });

  it("não desconta contagem vencida nem ausência de contagem", () => {
    expect(estoqueParaLista(contadoHa(31, 500), HOJE)).toBe(0);
    expect(estoqueParaLista(contadoHa(45, 500), HOJE)).toBe(0);
    expect(estoqueParaLista({ estoqueAtual: 500 }, HOJE)).toBe(0);
    expect(estoqueParaLista({}, HOJE)).toBe(0);
  });
});

describe("rotuloDeIdade", () => {
  it("diz a idade na língua dela", () => {
    expect(rotuloDeIdade(contagemDoInsumo(contadoHa(0, 500), HOJE))).toBe(
      "contada hoje",
    );
    expect(rotuloDeIdade(contagemDoInsumo(contadoHa(1, 500), HOJE))).toBe(
      "contada há 1 dia",
    );
    expect(rotuloDeIdade(contagemDoInsumo(contadoHa(12, 500), HOJE))).toBe(
      "contada há 12 dias",
    );
    expect(rotuloDeIdade(contagemDoInsumo(contadoHa(45, 500), HOJE))).toBe(
      "contada há mais de um mês",
    );
    expect(rotuloDeIdade(contagemDoInsumo({ estoqueAtual: 500 }, HOJE))).toBe(
      "nunca contada",
    );
  });
});

describe("sugestaoDaContagem", () => {
  it("sem entrada não há semente: o campo nasce vazio", () => {
    const fresca = contagemDoInsumo(contadoHa(4, 620), HOJE);

    expect(sugestaoDaContagem(fresca, 0)).toBeNull();
    expect(sugestaoDaContagem(contagemDoInsumo({}, HOJE), 0)).toBeNull();
  });

  it("sem contagem recente, a sugestão é só o que entrou", () => {
    // "Não sei mais 1 kg" não são 1,5 kg.
    expect(sugestaoDaContagem(contagemDoInsumo({}, HOJE), 1000)).toBe(1000);
    expect(
      sugestaoDaContagem(contagemDoInsumo({ estoqueAtual: 500 }, HOJE), 1000),
    ).toBe(1000);
    expect(
      sugestaoDaContagem(contagemDoInsumo(contadoHa(45, 500), HOJE), 1000),
    ).toBe(1000);
  });

  it("contagem de hoje não recebe soma", () => {
    // Ler a nota e depois fechar a lista da mesma compra encontraria a contagem
    // feita há minutos e somaria os mesmos pacotes de novo.
    const hoje = contagemDoInsumo(contadoHa(0, 1620), HOJE);

    expect(sugestaoDaContagem(hoje, 1000)).toBe(1620);
  });

  it("soma a entrada à contagem fresca de outro dia e à que envelhece", () => {
    expect(
      sugestaoDaContagem(contagemDoInsumo(contadoHa(4, 620), HOJE), 1000),
    ).toBe(1620);
    expect(
      sugestaoDaContagem(contagemDoInsumo(contadoHa(14, 480), HOJE), 1000),
    ).toBe(1480);
  });

  it("zero contado soma, e não é tratado como ausência", () => {
    // A contagem é `0` e é fresca: 0 + 1010 = 1010, o mesmo número que sairia
    // de "nunca contado", por um caminho diferente e com outra frase.
    const zerada = contagemDoInsumo(contadoHa(4, 0), HOJE);

    expect(zerada.quantidade).toBe(0);
    expect(sugestaoDaContagem(zerada, 1010)).toBe(1010);
  });
});

describe("entradasDaNota", () => {
  it("multiplica embalagem por quantidade e converte para unidade base", () => {
    const entradas = entradasDaNota([
      {
        insumoId: "farinha",
        embalagens: 1,
        quantidadeCompra: 1,
        unidadeCompra: "kg",
      },
      // Duas embalagens de 500 g são 1000 g de entrada, e não 500.
      {
        insumoId: "manteiga",
        embalagens: 2,
        quantidadeCompra: 500,
        unidadeCompra: "g",
      },
      {
        insumoId: "caixa",
        embalagens: 1,
        quantidadeCompra: 25,
        unidadeCompra: "un",
      },
    ]);

    expect(entradas.get("farinha")).toBe(1000);
    expect(entradas.get("manteiga")).toBe(1000);
    expect(entradas.get("caixa")).toBe(25);
  });

  it("duas linhas do mesmo insumo são uma entrada só", () => {
    const entradas = entradasDaNota([
      {
        insumoId: "chocolate",
        embalagens: 1,
        quantidadeCompra: 1.01,
        unidadeCompra: "kg",
      },
      {
        insumoId: "chocolate",
        embalagens: 1,
        quantidadeCompra: 500,
        unidadeCompra: "g",
      },
    ]);

    expect(entradas.get("chocolate")).toBeCloseTo(1510, 6);
    expect(entradas.size).toBe(1);
  });

  it("ignora a linha sem insumo pareado", () => {
    const entradas = entradasDaNota([
      { insumoId: "", embalagens: 1, quantidadeCompra: 1, unidadeCompra: "kg" },
    ]);

    expect(entradas.size).toBe(0);
  });
});

describe("entradasDaLista", () => {
  const insumos = [
    { id: "farinha", quantidadeBase: 1000 },
    { id: "saquinho", quantidadeBase: 100 },
  ];

  it("conta só o que foi marcado como comprado, em unidade base", () => {
    const entradas = entradasDaLista(
      [
        { insumoId: "farinha", quantidadePacotes: 2, comprado: true },
        { insumoId: "saquinho", quantidadePacotes: 1, comprado: false },
      ],
      insumos,
    );

    expect(entradas.get("farinha")).toBe(2000);
    expect(entradas.has("saquinho")).toBe(false);
  });

  it("ignora o insumo que sumiu do cadastro", () => {
    const entradas = entradasDaLista(
      [{ insumoId: "sumido", quantidadePacotes: 1, comprado: true }],
      insumos,
    );

    expect(entradas.size).toBe(0);
  });
});

describe("numeroContado", () => {
  it("separa 'não contei' de 'contei, e não tem'", () => {
    expect(numeroContado("")).toBeNull();
    expect(numeroContado("   ")).toBeNull();
    expect(numeroContado("0")).toBe(0);
    expect(numeroContado("620")).toBe(620);
    expect(numeroContado("1,5")).toBe(1.5);
    expect(numeroContado("1.5")).toBe(1.5);
  });

  it("texto que não vira número é ausência, e não zero", () => {
    // Gravar zero porque ela digitou uma letra seria inventar uma contagem.
    expect(numeroContado("abc")).toBeNull();
    expect(numeroContado("-3")).toBeNull();
  });
});

describe("linhasParaContar", () => {
  const linhas = linhasParaContar(INSUMOS, SEM_ENTRADAS, HOJE);

  it("lista todo insumo na ordem do corredor", () => {
    expect(linhas.map((linha) => linha.nome)).toEqual([
      "Chocolate",
      "Farinha",
      "Manteiga",
      "Caixa",
      "Saquinho",
    ]);
  });

  it("deixa fora o insumo arquivado", () => {
    const comArquivado = linhasParaContar(
      [...INSUMOS, insumo({ id: "velho", nome: "Velho", arquivado: true })],
      SEM_ENTRADAS,
      HOJE,
    );

    expect(comArquivado).toHaveLength(5);
  });

  it("diz a referência certa nos três casos", () => {
    const porNome = new Map(linhas.map((linha) => [linha.nome, linha]));

    // Nunca contado: nem número, nem data.
    expect(porNome.get("Chocolate")?.contagem.frescor).toBe("NUNCA");
    expect(porNome.get("Chocolate")?.contagem.anotado).toBeNull();

    // Número sem data: os 500 g aparecem ao lado, e o campo continua vazio.
    expect(porNome.get("Farinha")?.contagem.frescor).toBe("NUNCA");
    expect(porNome.get("Farinha")?.contagem.anotado).toBe(500);
    expect(porNome.get("Saquinho")?.contagem.anotado).toBe(50);
  });

  it("nasce sem sugestão nenhuma quando não houve compra", () => {
    expect(linhas.every((linha) => linha.sugestao === null)).toBe(true);
    expect(linhas.every((linha) => linha.entrada === 0)).toBe(true);
  });

  it("semeia a linha com o que a compra trouxe", () => {
    const semeadas = linhasParaContar(
      [
        insumo({ ...contadoHa(4, 620), id: "farinha", nome: "Farinha" }),
        insumo({ id: "chocolate", nome: "Chocolate" }),
      ],
      new Map([
        ["farinha", 1000],
        ["chocolate", 1010],
      ]),
      HOJE,
    );

    const porNome = new Map(semeadas.map((linha) => [linha.nome, linha]));
    expect(porNome.get("Farinha")?.sugestao).toBe(1620);
    expect(porNome.get("Chocolate")?.sugestao).toBe(1010);
  });
});

describe("resumoDaContagem", () => {
  it("conta o caso de aceite: 4 de 5 contados · 1 zerado", () => {
    // Ela digita farinha 620, chocolate 0, manteiga 480, saquinho 50. Não toca
    // na caixa.
    const linhas = linhasParaContar(INSUMOS, SEM_ENTRADAS, HOJE);
    const resumo = resumoDaContagem(linhas, {
      farinha: 620,
      chocolate: 0,
      manteiga: 480,
      saquinho: 50,
      caixa: null,
    });

    expect(resumo.contadas).toBe(4);
    expect(resumo.zeradas).toBe(1);
    expect(resumo.intocadas).toBe(1);
    expect(resumo.total).toBe(5);
  });

  it("linha em branco não conta, e linha ausente do mapa também não", () => {
    const linhas = linhasParaContar(INSUMOS, SEM_ENTRADAS, HOJE);

    expect(resumoDaContagem(linhas, {}).contadas).toBe(0);
    expect(resumoDaContagem(linhas, {}).intocadas).toBe(5);
  });
});
