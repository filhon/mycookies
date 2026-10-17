import { describe, expect, it } from "vitest";
import {
  baseAceita,
  basesDasReceitas,
  basesQueNaoBatem,
  calcularCustoInsumo,
  chaveDeBusca,
  comprasDoInsumo,
  custoDeUso,
  historicoComDescarte,
  historicoCorrigido,
  historicoPodado,
  ordenarMateriais,
  ultimaCompraDela,
  variacaoDaUltimaCompra,
  vigenteDoHistorico,
  type InsumoComHistorico,
} from "@/lib/domain/custoInsumo";
import { PREFIXO_BIBLIOTECA, temPrecoMedio } from "@/lib/domain/biblioteca";

describe("calcularCustoInsumo", () => {
  it("converte pacote de 1 kg em custo por grama", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 0,
    });

    expect(custo.unidadeBase).toBe("g");
    expect(custo.quantidadeBase).toBe(1000);
    expect(custo.custoUnidadeBase).toBe(1.25);
    expect(custo.custoUnidadeBaseCorrigido).toBe(1.25);
  });

  it("DIVIDE pelo aproveitamento, não multiplica pela perda", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 20,
    });

    // 1,25 / 0,8 = 1,5625. O erro clássico de planilha seria 1,25 × 1,2 = 1,50,
    // que subestima o custo e come a margem silenciosamente.
    expect(custo.custoUnidadeBaseCorrigido).toBeCloseTo(1.5625, 6);
    expect(custo.custoUnidadeBaseCorrigido).not.toBeCloseTo(1.5, 6);
  });

  it("mostra quanto a perda custa por embalagem", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 20,
    });

    expect(custo.rendimentoLiquido).toBe(800);
    expect(custo.custoDaPerda).toBe(250);
  });

  it("trata litro como mililitro", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 900,
      quantidadeCompra: 2,
      unidadeCompra: "l",
      perdaPercentual: 0,
    });

    expect(custo.unidadeBase).toBe("ml");
    expect(custo.quantidadeBase).toBe(2000);
    expect(custo.custoUnidadeBase).toBe(0.45);
  });

  it("trata contagem sem conversão", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 3000,
      quantidadeCompra: 100,
      unidadeCompra: "un",
      perdaPercentual: 0,
    });

    expect(custo.custoUnidadeBase).toBe(30);
  });

  it("não divide por zero quando a quantidade ainda está vazia", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1250,
      quantidadeCompra: 0,
      unidadeCompra: "kg",
      perdaPercentual: 0,
    });

    expect(custo.custoUnidadeBase).toBe(0);
    expect(custo.custoUnidadeBaseCorrigido).toBe(0);
  });

  it("limita a perda a 99% para não estourar o custo ao infinito", () => {
    const custo = calcularCustoInsumo({
      precoCompra: 1000,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
      perdaPercentual: 100,
    });

    expect(Number.isFinite(custo.custoUnidadeBaseCorrigido)).toBe(true);
  });
});

describe("custoDeUso", () => {
  it("arredonda a linha da receita para centavo inteiro", () => {
    expect(custoDeUso(1.5625, 250)).toBe(391);
  });
});

describe("chaveDeBusca", () => {
  it("remove acento e caixa para busca offline", () => {
    expect(chaveDeBusca("Açúcar  Cristal")).toBe("acucar cristal");
    expect(chaveDeBusca(" Chocolate ")).toBe("chocolate");
  });
});

// ---------------------------------------------------------------------------
// Spec 050 · o preço de cada compra (`#d222`).
// ---------------------------------------------------------------------------

const DIA = 24 * 60 * 60 * 1000;
const em = (dia: number) => ({ toMillis: () => dia * DIA });

/** Compras de 1 kg de creme de pistache, em reais, na ordem em que foram feitas. */
function creme(reais: number[], id = "creme"): InsumoComHistorico {
  return {
    id,
    criadoEm: em(1),
    historicoPrecos: reais.map((valor, i) => ({
      data: em(i + 1),
      precoCompra: valor * 100,
      quantidadeCompra: 1,
      unidadeCompra: "kg" as const,
      custoUnidadeBase: (valor * 100) / 1000,
      ...(i === reais.length - 1 ? { fornecedor: "Atacadão" } : {}),
    })),
  };
}

describe("comprasDoInsumo", () => {
  it("do mais novo ao mais velho, com o quilo e a variação para a anterior", () => {
    const { compras, quantas, primeiraMs, variacaoTotal } = comprasDoInsumo(
      creme([92, 99.9, 109.5]),
    );
    expect(compras.map((c) => c.referencia)).toEqual([10950, 9990, 9200]);
    expect(compras.map((c) => c.variacao)).toEqual([10, 9, null]);
    expect(compras[0]?.fornecedor).toBe("Atacadão");
    expect(compras[1]?.fornecedor).toBeUndefined();
    expect(quantas).toBe(3);
    expect(primeiraMs).toBe(DIA);
    expect(variacaoTotal).toBe(19);
  });

  it("o histórico gravado fora de ordem sai ordenado", () => {
    const material = creme([92, 99.9]);
    material.historicoPrecos.reverse();
    expect(comprasDoInsumo(material).compras[0]?.referencia).toBe(9990);
  });

  it("a entrada da biblioteca fica fora de toda variação", () => {
    const { compras, quantas, primeiraMs, variacaoTotal } = comprasDoInsumo(
      creme([70, 99.9, 109.5], PREFIXO_BIBLIOTECA + "creme"),
    );
    expect(compras.map((c) => c.daBiblioteca)).toEqual([false, false, true]);
    expect(compras.map((c) => c.variacao)).toEqual([10, null, null]);
    expect(quantas).toBe(2);
    expect(primeiraMs).toBe(2 * DIA);
    expect(variacaoTotal).toBe(10);
  });

  it("podada a da biblioteca, a mais velha é compra dela", () => {
    const material = creme([99.9, 109.5], PREFIXO_BIBLIOTECA + "creme");
    material.criadoEm = em(0);
    expect(comprasDoInsumo(material).compras.some((c) => c.daBiblioteca)).toBe(
      false,
    );
  });

  it("o mesmo preço é zero, não menos zero", () => {
    expect(comprasDoInsumo(creme([50, 50])).variacaoTotal).toBe(0);
    expect(
      Object.is(comprasDoInsumo(creme([50, 49.99])).variacaoTotal, 0),
    ).toBe(true);
  });
});

describe("variacaoDaUltimaCompra", () => {
  it("é a da última compra dela contra a anterior dela", () => {
    expect(variacaoDaUltimaCompra(creme([100, 94]))).toBe(-6);
  });

  it("nula com menos de duas compras dela", () => {
    expect(variacaoDaUltimaCompra(creme([100]))).toBeNull();
    expect(
      variacaoDaUltimaCompra(creme([70, 100], PREFIXO_BIBLIOTECA + "creme")),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Spec 052 · a ordem da lista (`#d226`).
// ---------------------------------------------------------------------------

describe("ordenarMateriais", () => {
  /** Um material com compras nos dias dados; `biblioteca` nasce com a média. */
  function material(nome: string, dias: number[], biblioteca = false) {
    const base = creme(
      dias.map(() => 10),
      (biblioteca ? PREFIXO_BIBLIOTECA : "") + nome,
    );
    base.historicoPrecos.forEach((compra, i) => (compra.data = em(dias[i]!)));
    base.criadoEm = em(dias[0] ?? 0);
    return { ...base, nomeBusca: nome };
  }

  const acucar = material("acucar", [2, 9]);
  const creme_ = material("creme", [5]);
  const farinha = material("farinha", [3, 4]);
  const leite = material("leite", [8], true);
  const lista = [leite, farinha, creme_, acucar];
  const nomes = (l: { nomeBusca: string }[]) => l.map((m) => m.nomeBusca);

  it("pelo nome", () => {
    expect(nomes(ordenarMateriais(lista, "NOME", new Map()))).toEqual([
      "acucar",
      "creme",
      "farinha",
      "leite",
    ]);
  });

  it("preço mudou por último: a compra dela mais nova primeiro; a da biblioteca não conta", () => {
    expect(nomes(ordenarMateriais(lista, "PRECO_MUDOU", new Map()))).toEqual([
      "acucar",
      "creme",
      "farinha",
      "leite",
    ]);
  });

  it("pesa mais: a soma das partes, e sem uso vai para o fim, por nome", () => {
    const peso = new Map([
      [farinha.id, 0.3 + 0.2],
      [creme_.id, 0.4],
    ]);
    expect(nomes(ordenarMateriais(lista, "PESO", peso))).toEqual([
      "farinha",
      "creme",
      "acucar",
      "leite",
    ]);
  });

  it("não mexe na lista recebida", () => {
    ordenarMateriais(lista, "NOME", new Map());
    expect(nomes(lista)).toEqual(["leite", "farinha", "creme", "acucar"]);
  });
});

describe("a base do material e a das receitas (spec 188)", () => {
  const item = (insumoId: string, unidadeBase: "g" | "ml" | "un") => ({
    insumoId,
    unidadeBase,
  });
  const fichas = [
    { itens: [item("acucar", "g"), item("ovo", "un")] },
    { itens: [item("acucar", "g"), item("leite", "ml")] },
  ];

  it("basesDasReceitas lê as linhas das fichas, e é vazio sem uso", () => {
    expect(basesDasReceitas(fichas, "acucar")).toEqual(new Set(["g"]));
    expect(basesDasReceitas(fichas, "canela")).toEqual(new Set());
  });

  it("sem receita, qualquer base serve; com receita, só a delas", () => {
    expect(baseAceita("un", new Set())).toBe(true);
    expect(baseAceita("un", new Set(["g"]))).toBe(false);
    expect(baseAceita("g", new Set(["g"]))).toBe(true);
  });

  it("o açúcar quebrado em `un` aceita voltar para gramas", () => {
    const bases = basesDasReceitas(fichas, "acucar");
    expect(baseAceita("un", bases)).toBe(false);
    expect(baseAceita("g", bases)).toBe(true);
  });

  it("basesQueNaoBatem nomeia o que já está quebrado, com a base das receitas", () => {
    const insumos = [
      { id: "acucar", unidadeBase: "un" as const },
      { id: "ovo", unidadeBase: "un" as const },
      { id: "leite", unidadeBase: "ml" as const },
      { id: "canela", unidadeBase: "un" as const },
    ];
    expect(basesQueNaoBatem(insumos, fichas)).toEqual(
      new Map([["acucar", "g"]]),
    );
  });
});

// ---------------------------------------------------------------------------
// Spec 189 · a compra que se corrige (`#d419`, `#d420`).
// ---------------------------------------------------------------------------

describe("a compra que se corrige (spec 189)", () => {
  /** O creme com a compra do dia `dia` descartada. */
  function comDescarte(reais: number[], dia: number, id = "creme") {
    const material = creme(reais, id);
    material.historicoPrecos = historicoComDescarte(
      material.historicoPrecos,
      dia * DIA,
      em(20),
    );
    return material;
  }

  it("a descartada fica na lista, sem variação, e a seguinte compara com a anterior que conta", () => {
    const { compras, quantas, variacaoTotal } = comprasDoInsumo(
      comDescarte([100, 1000, 110], 2),
    );
    expect(compras.map((c) => c.descartadaMs)).toEqual([null, 20 * DIA, null]);
    expect(compras.map((c) => c.variacao)).toEqual([10, null, null]);
    expect(quantas).toBe(2);
    expect(variacaoTotal).toBe(10);
  });

  it("a última que conta pula a descartada", () => {
    const material = comDescarte([100, 110], 2);
    expect(ultimaCompraDela(material)?.dataMs).toBe(DIA);
    expect(vigenteDoHistorico(material.historicoPrecos)?.precoCompra).toBe(
      10000,
    );
  });

  it("desfazer limpa a marca", () => {
    const material = comDescarte([100, 110], 2);
    const deVolta = historicoComDescarte(
      material.historicoPrecos,
      2 * DIA,
      null,
    );
    expect(deVolta.some((e) => "descartadaEm" in e)).toBe(false);
    expect(vigenteDoHistorico(deVolta)?.precoCompra).toBe(11000);
  });

  it("descartável: dela, valendo, e com outra para o material voltar", () => {
    expect(
      comprasDoInsumo(creme([100, 110])).compras.map((c) => c.descartavel),
    ).toEqual([true, true]);
    expect(
      comprasDoInsumo(creme([100])).compras.map((c) => c.descartavel),
    ).toEqual([false]);
    expect(
      comprasDoInsumo(comDescarte([100, 110], 2)).compras.map(
        (c) => c.descartavel,
      ),
    ).toEqual([false, false]);
    // A da biblioteca é para onde voltar, e não se descarta.
    expect(
      comprasDoInsumo(
        creme([70, 100], PREFIXO_BIBLIOTECA + "creme"),
      ).compras.map((c) => c.descartavel),
    ).toEqual([true, false]);
  });

  it("cada entrada na base dela, e nada de variação entre bases", () => {
    const acucar = creme([5, 5]);
    acucar.historicoPrecos[1] = {
      data: em(2),
      precoCompra: 359,
      quantidadeCompra: 1,
      unidadeCompra: "un",
      custoUnidadeBase: 359,
    };
    const { compras, variacaoTotal } = comprasDoInsumo(acucar);
    expect(compras.map((c) => c.unidadeBase)).toEqual(["un", "g"]);
    expect(compras.map((c) => c.rotulo)).toEqual(["a unidade", "o quilo"]);
    expect(compras.map((c) => c.referencia)).toEqual([359, 500]);
    expect(compras[0]?.variacao).toBeNull();
    expect(variacaoTotal).toBeNull();
  });

  const correcao = {
    precoCompra: 499,
    quantidadeCompra: 1,
    unidadeCompra: "kg" as const,
    custoUnidadeBase: 0.499,
  };

  it("corrigir reescreve a última compra dela, com a data dela, sem acrescentar", () => {
    const material = creme([4.99, 49.9]);
    const corrigido = historicoCorrigido(material, correcao)!;
    expect(corrigido).toHaveLength(2);
    expect(corrigido[1]).toMatchObject({ ...correcao, fornecedor: "Atacadão" });
    expect(corrigido[1]?.data.toMillis()).toBe(2 * DIA);
    expect(corrigido[0]).toBe(material.historicoPrecos[0]);
  });

  it("corrigir pula a descartada e acerta a que conta", () => {
    const corrigido = historicoCorrigido(comDescarte([10, 20], 2), correcao)!;
    expect(corrigido[0]).toMatchObject(correcao);
    expect(corrigido[1]?.precoCompra).toBe(2000);
  });

  it("só o preço médio da biblioteca: nada a corrigir", () => {
    expect(
      historicoCorrigido(creme([70], PREFIXO_BIBLIOTECA + "creme"), correcao),
    ).toBeNull();
  });

  it("a poda tira as descartadas primeiro, depois as mais velhas", () => {
    const material = comDescarte([1, 2, 3, 4], 3);
    const dias = (h: typeof material.historicoPrecos) =>
      h.map((e) => e.data.toMillis() / DIA);
    expect(dias(historicoPodado(material.historicoPrecos, 3))).toEqual([
      1, 2, 4,
    ]);
    expect(dias(historicoPodado(material.historicoPrecos, 2))).toEqual([2, 4]);
    expect(historicoPodado(material.historicoPrecos, 12)).toBe(
      material.historicoPrecos,
    );
  });

  it("temPrecoMedio não conta a descartada", () => {
    const id = PREFIXO_BIBLIOTECA + "creme";
    const material = comDescarte([70, 100], 2, id);
    expect(temPrecoMedio(material as never)).toBe(true);
    expect(temPrecoMedio(creme([70, 100], id) as never)).toBe(false);
  });
});
