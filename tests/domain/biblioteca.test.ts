import { describe, expect, it } from "vitest";
import {
  ehDaBiblioteca,
  FICHAS_DA_BIBLIOTECA,
  INSUMOS_DA_BIBLIOTECA,
  insumosComPrecoMedio,
  montarBiblioteca,
  PREFIXO_BIBLIOTECA,
  temPrecoMedio,
} from "@/lib/domain/biblioteca";
import { CATEGORIAS_INSUMO } from "@/lib/domain/custoInsumo";
import { derivarFicha, type RateioOperacional } from "@/lib/domain/custoFicha";
import type { ParametrosPreco } from "@/lib/domain/precificacao";
import type { HistoricoPreco, Insumo } from "@/lib/types";

/** Espelha `CONFIGURACAO_SUGERIDA`: hora R$ 25, energia R$ 1, gás R$ 2, sem despesa fixa. */
const OPERACIONAL: RateioOperacional = {
  valorHoraTrabalho: 2500,
  custoEnergiaHora: 100,
  custoGasHora: 200,
  custoIndiretoPorHora: 0,
};

/** Margem 35%, crédito 4,99%, terminando em 90 centavos. */
const PRECIFICACAO: ParametrosPreco = {
  metodo: "MARGEM",
  markup: 2.5,
  margemDesejada: 35,
  taxaCartaoConsiderada: 4.99,
  outrasTaxas: 0,
  arredondamento: "CENTAVO_90",
};

function historico(quantidade: number): HistoricoPreco[] {
  return Array.from({ length: quantidade }, () => ({}) as HistoricoPreco);
}

describe("INSUMOS_DA_BIBLIOTECA", () => {
  it("não repete id nem nome, e cada um respeita a forma", () => {
    const ids = INSUMOS_DA_BIBLIOTECA.map((insumo) => insumo.id);
    const nomes = INSUMOS_DA_BIBLIOTECA.map((insumo) => insumo.nome);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(nomes).size).toBe(nomes.length);

    const categoriasValidas = new Set(
      CATEGORIAS_INSUMO.map((categoria) => categoria.valor),
    );
    for (const insumo of INSUMOS_DA_BIBLIOTECA) {
      expect(insumo.id).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isInteger(insumo.precoCompra)).toBe(true);
      expect(insumo.precoCompra).toBeGreaterThan(0);
      expect(insumo.quantidadeCompra).toBeGreaterThan(0);
      expect(insumo.perdaPercentual).toBeGreaterThanOrEqual(0);
      expect(insumo.perdaPercentual).toBeLessThanOrEqual(99);
      expect(categoriasValidas.has(insumo.categoria)).toBe(true);
    }
  });
});

describe("FICHAS_DA_BIBLIOTECA", () => {
  it("não repete id nem nome entre as duas, e cada uma respeita a forma", () => {
    const ids = FICHAS_DA_BIBLIOTECA.map((ficha) => ficha.id);
    const nomes = FICHAS_DA_BIBLIOTECA.map((ficha) => ficha.nome);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(nomes).size).toBe(nomes.length);
    for (const ficha of FICHAS_DA_BIBLIOTECA) {
      expect(ficha.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("todo item aponta para um insumo da própria biblioteca, com quantidade positiva", () => {
    const idsInsumo = new Set(INSUMOS_DA_BIBLIOTECA.map((insumo) => insumo.id));
    for (const ficha of FICHAS_DA_BIBLIOTECA) {
      for (const item of ficha.itens) {
        expect(idsInsumo.has(item.insumoId)).toBe(true);
        expect(item.quantidade).toBeGreaterThan(0);
      }
    }
  });
});

describe("PREFIXO_BIBLIOTECA e ehDaBiblioteca", () => {
  it("todo documento de montarBiblioteca nasce com o prefixo", () => {
    const { insumos, fichas } = montarBiblioteca({
      operacional: OPERACIONAL,
      precificacao: PRECIFICACAO,
    });

    for (const insumo of insumos) {
      expect(insumo.id.startsWith(PREFIXO_BIBLIOTECA)).toBe(true);
      expect(ehDaBiblioteca(insumo.id)).toBe(true);
    }
    for (const ficha of fichas) {
      expect(ficha.id.startsWith(PREFIXO_BIBLIOTECA)).toBe(true);
      expect(ehDaBiblioteca(ficha.id)).toBe(true);
      for (const item of ficha.itens) {
        expect(item.insumoId.startsWith(PREFIXO_BIBLIOTECA)).toBe(true);
      }
    }
  });

  it("não confunde um id gerado no aparelho", () => {
    expect(ehDaBiblioteca("k3f9d8s7")).toBe(false);
  });
});

describe("montarBiblioteca — o caso de aceite, número por número", () => {
  const { fichas } = montarBiblioteca({
    operacional: OPERACIONAL,
    precificacao: PRECIFICACAO,
  });
  const classico = fichas.find(
    (ficha) => ficha.id === PREFIXO_BIBLIOTECA + "cookie-classico",
  )!;
  const recheado = fichas.find(
    (ficha) => ficha.id === PREFIXO_BIBLIOTECA + "cookie-recheado",
  )!;

  it("cookie clássico: R$ 3,30 de custo, R$ 5,90 na etiqueta", () => {
    const derivado = derivarFicha({
      itens: classico.itens,
      componentes: classico.componentes,
      custoEscolhas: classico.custoEscolhas,
      tempoProducaoMinutos: classico.tempoProducaoMinutos,
      rendimento: classico.rendimento,
      operacional: classico.operacional,
      precificacao: classico.precificacao,
      precoVenda: classico.precoVenda,
    });

    expect(derivado.custo.custoInsumos).toBe(3090);
    expect(derivado.custo.custoEmbalagem).toBe(700);
    expect(derivado.custo.custoMaoDeObra).toBe(2500);
    expect(derivado.custo.custoEnergiaGas).toBe(300);
    expect(derivado.custo.custoIndireto).toBe(0);
    expect(derivado.custo.custoTotalLote).toBe(6590);
    expect(derivado.custo.custoUnitario).toBe(330);
    expect(derivado.precoSugerido).toBe(550);
    expect(derivado.precoArredondado).toBe(590);
  });

  it("cookie recheado: R$ 7,19 de custo, R$ 12,90 na etiqueta", () => {
    const derivado = derivarFicha({
      itens: recheado.itens,
      componentes: recheado.componentes,
      custoEscolhas: recheado.custoEscolhas,
      tempoProducaoMinutos: recheado.tempoProducaoMinutos,
      rendimento: recheado.rendimento,
      operacional: recheado.operacional,
      precificacao: recheado.precificacao,
      precoVenda: recheado.precoVenda,
    });

    expect(derivado.custo.custoInsumos).toBe(4007);
    expect(derivado.custo.custoEmbalagem).toBe(420);
    expect(derivado.custo.custoMaoDeObra).toBe(3750);
    expect(derivado.custo.custoEnergiaGas).toBe(450);
    expect(derivado.custo.custoIndireto).toBe(0);
    expect(derivado.custo.custoTotalLote).toBe(8627);
    expect(derivado.custo.custoUnitario).toBe(719);
    expect(derivado.precoSugerido).toBe(1198);
    expect(derivado.precoArredondado).toBe(1290);
  });
});

describe("temPrecoMedio", () => {
  it("é da biblioteca com uma compra só no histórico", () => {
    expect(
      temPrecoMedio({
        id: PREFIXO_BIBLIOTECA + "farinha-de-trigo",
        historicoPrecos: historico(1),
      }),
    ).toBe(true);
  });

  it("deixa de ser preço médio na segunda compra", () => {
    expect(
      temPrecoMedio({
        id: PREFIXO_BIBLIOTECA + "farinha-de-trigo",
        historicoPrecos: historico(2),
      }),
    ).toBe(false);
  });

  it("insumo fora da biblioteca nunca é preço médio, qualquer que seja o histórico", () => {
    expect(temPrecoMedio({ id: "abc123", historicoPrecos: historico(1) })).toBe(
      false,
    );
    expect(temPrecoMedio({ id: "abc123", historicoPrecos: historico(0) })).toBe(
      false,
    );
  });
});

describe("insumosComPrecoMedio", () => {
  it("segue a ordem dos itens da ficha e não repete nome", () => {
    const insumos = [
      {
        id: PREFIXO_BIBLIOTECA + "farinha-de-trigo",
        nome: "Farinha de trigo",
        historicoPrecos: historico(1),
      },
      {
        id: PREFIXO_BIBLIOTECA + "manteiga-sem-sal",
        nome: "Manteiga sem sal",
        historicoPrecos: historico(1),
      },
      {
        id: PREFIXO_BIBLIOTECA + "ovos",
        nome: "Ovos",
        historicoPrecos: historico(3),
      },
    ] as unknown as Insumo[];

    const itens = [
      { insumoId: PREFIXO_BIBLIOTECA + "manteiga-sem-sal" },
      { insumoId: PREFIXO_BIBLIOTECA + "farinha-de-trigo" },
      { insumoId: PREFIXO_BIBLIOTECA + "manteiga-sem-sal" },
      { insumoId: PREFIXO_BIBLIOTECA + "ovos" },
    ];

    expect(insumosComPrecoMedio(itens, insumos)).toEqual([
      "Manteiga sem sal",
      "Farinha de trigo",
    ]);
  });
});
