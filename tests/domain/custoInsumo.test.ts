import { describe, expect, it } from "vitest";
import {
  calcularCustoInsumo,
  chaveDeBusca,
  comprasDoInsumo,
  custoDeUso,
  ordenarMateriais,
  variacaoDaUltimaCompra,
  type InsumoComHistorico,
} from "@/lib/domain/custoInsumo";
import { PREFIXO_BIBLIOTECA } from "@/lib/domain/biblioteca";

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
    unidadeBase: "g",
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
