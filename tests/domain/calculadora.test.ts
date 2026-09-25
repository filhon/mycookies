import { describe, expect, it } from "vitest";
import { montarBiblioteca, PREFIXO_BIBLIOTECA } from "@/lib/domain/biblioteca";
import {
  contaDaPorta,
  entradaPadrao,
  RECEITAS_DA_PORTA,
  trocarReceita,
} from "@/lib/domain/calculadora";
import {
  precificacaoSugerida,
  rateioSugerido,
} from "@/lib/domain/configuracaoSugerida";
import { derivarFicha } from "@/lib/domain/custoFicha";

// A página e o app batem (spec 040, 3.5): o mesmo cookie, pelas mesmas funções,
// dá o mesmo custo e o mesmo preço. É o teste que impede a página de prometer
// um número que o app não mostra.
describe("contaDaPorta com a receita padrão", () => {
  const biblioteca = montarBiblioteca({
    operacional: rateioSugerido(),
    precificacao: precificacaoSugerida(),
  });

  for (const { valor: receita } of RECEITAS_DA_PORTA) {
    it(`${receita}: custo e preço iguais aos da ficha que a biblioteca instala`, () => {
      const ficha = biblioteca.fichas.find(
        (f) => f.id === PREFIXO_BIBLIOTECA + receita,
      );
      if (!ficha) throw new Error(receita);
      const doApp = derivarFicha(ficha);

      const daPagina = contaDaPorta(entradaPadrao(receita)).derivados;

      expect(daPagina.custo.custoUnitario).toBe(doApp.custo.custoUnitario);
      expect(daPagina.precoArredondado).toBe(doApp.precoArredondado);
      expect(daPagina.custo.custoUnitario).toBeGreaterThan(0);
    });
  }
});

describe("contaDaPorta com os números dela", () => {
  it("manteiga mais cara sobe o custo por unidade", () => {
    const padrao = entradaPadrao("cookie-classico");
    const antes = contaDaPorta(padrao).derivados.custo.custoUnitario;
    const depois = contaDaPorta({
      ...padrao,
      precos: { "manteiga-sem-sal": 2400 },
    }).derivados.custo.custoUnitario;
    expect(depois).toBeGreaterThan(antes);
  });

  it("preço de pacote zerado vale o médio", () => {
    const padrao = entradaPadrao("cookie-classico");
    expect(
      contaDaPorta({ ...padrao, precos: { "manteiga-sem-sal": 0 } }).derivados
        .custo.custoUnitario,
    ).toBe(contaDaPorta(padrao).derivados.custo.custoUnitario);
  });

  it("lista cada material da receita uma vez, com a embalagem", () => {
    const { materiais } = contaDaPorta(entradaPadrao("cookie-classico"));
    const manteiga = materiais.find((m) => m.id === "manteiga-sem-sal");
    expect(manteiga).toMatchObject({ embalagem: "200 g", preco: 1200 });
    expect(new Set(materiais.map((m) => m.id)).size).toBe(materiais.length);
  });

  it("preço de hoje abaixo do custo: perde dinheiro em cada um", () => {
    const padrao = entradaPadrao("cookie-recheado");
    const custo = contaDaPorta(padrao).derivados.custo.custoUnitario;
    const conta = contaDaPorta({ ...padrao, precoHoje: custo - 10 });
    expect(conta.hoje?.lucroUnitario).toBeLessThan(0);
  });

  it("sem preço de hoje, sem conferência e sem o mês", () => {
    const conta = contaDaPorta(entradaPadrao("cookie-classico"));
    expect(conta.hoje).toBeNull();
    expect(conta.aMaisNoMes).toBe(0);
    expect(conta.sugerido?.lucroUnitario).toBeGreaterThan(0);
  });
});

describe("aMaisNoMes", () => {
  const padrao = entradaPadrao("cookie-classico");
  const sugerido = contaDaPorta(padrao).derivados.precoArredondado ?? 0;

  it("é a diferença de sobra por unidade vezes as vendas", () => {
    const conta = contaDaPorta({
      ...padrao,
      precoHoje: sugerido - 150,
      vendasMes: 80,
    });
    if (!conta.hoje || !conta.sugerido) throw new Error("sem conta");
    expect(conta.aMaisNoMes).toBe(
      (conta.sugerido.lucroUnitario - conta.hoje.lucroUnitario) * 80,
    );
    expect(conta.aMaisNoMes).toBeGreaterThan(0);
  });

  it("é zero no preço sugerido ou acima", () => {
    expect(contaDaPorta({ ...padrao, precoHoje: sugerido }).aMaisNoMes).toBe(0);
    expect(
      contaDaPorta({ ...padrao, precoHoje: sugerido + 500 }).aMaisNoMes,
    ).toBe(0);
  });
});

describe("entrada fora do domínio", () => {
  it("rendimento zero não devolve Infinity nem NaN", () => {
    const conta = contaDaPorta({
      ...entradaPadrao("cookie-classico"),
      rendimento: 0,
      precoHoje: 600,
    });
    expect(conta.derivados.custo.custoUnitario).toBe(0);
    expect(Number.isFinite(conta.derivados.custo.custoTotalLote)).toBe(true);
    expect(conta.hoje).toBeNull();
    expect(conta.sugerido).toBeNull();
    expect(conta.aMaisNoMes).toBe(0);
  });

  it("campo vazio que virou NaN conta como zero", () => {
    const conta = contaDaPorta({
      ...entradaPadrao("cookie-classico"),
      rendimento: Number.NaN,
      tempoProducaoMinutos: Number.NaN,
      vendasMes: Number.NaN,
    });
    expect(conta.derivados.custo.custoUnitario).toBe(0);
    expect(Number.isNaN(conta.derivados.custo.custoTotalLote)).toBe(false);
  });
});

describe("trocarReceita", () => {
  it("volta rendimento, tempo e preços; mantém hora, preço de hoje e vendas", () => {
    const mexida = {
      ...entradaPadrao("cookie-classico"),
      rendimento: 30,
      valorHoraTrabalho: 3000,
      precos: { "manteiga-sem-sal": 1400 },
      precoHoje: 600,
      vendasMes: 250,
    };
    expect(trocarReceita(mexida, "cookie-recheado")).toEqual({
      ...entradaPadrao("cookie-recheado"),
      valorHoraTrabalho: 3000,
      precoHoje: 600,
      vendasMes: 250,
    });
  });
});
