import { describe, expect, it } from "vitest";
import {
  calcularCustoFicha,
  custoLinhaItem,
  ehEmbalagem,
  podeSerComponente,
  SEM_RATEIO,
  type EntradaCustoFicha,
} from "@/lib/domain/custoFicha";

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

  it("sem configuração salva, o rateio é zero e só o insumo pesa", () => {
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
        operacional: SEM_RATEIO,
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
