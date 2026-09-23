import { describe, expect, it } from "vitest";
import {
  entraNoCardapio,
  mensagemDeContato,
  montarCardapio,
  tipoDaFoto,
} from "@/lib/domain/cardapio";
import type { ConfiguracaoGeral, Conta, FichaTecnica } from "@/lib/types";

// Spec 031, sessão A. O caso de aceite: `mycookies`, cardápio aberto com
// tradicional, red velvet e o recheio (preço zero), hoje 23/09/2026.

const AGORA = Date.parse("2026-09-23T18:00:00Z");
const DIA = 24 * 60 * 60 * 1000;

/** Só o que a função chama num `Timestamp`. */
const ts = (ms: number) => ({ toMillis: () => ms });

function ficha(parcial: Partial<FichaTecnica> & { id: string }): FichaTecnica {
  return {
    v: 1,
    criadoEm: ts(1),
    atualizadoEm: ts(1_700_000_000_000),
    arquivado: false,
    nome: "Cookie Tradicional",
    nomeBusca: "cookie tradicional",
    categoria: "Cookie",
    descricao: "Massa amanteigada com gotas de chocolate.",
    modoPreparo: "Bater a manteiga com o açúcar.",
    fotoUrl: "data:image/jpeg;base64,AAAA",
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
    ],
    componentes: [],
    insumoIds: ["farinha"],
    componenteIds: [],
    invisiveis: {
      tempoProducaoMinutos: 20,
      custoMaoDeObra: 400,
      custoEnergiaGas: 100,
      custoIndireto: 500,
    },
    custoInsumos: 625,
    custoEmbalagem: 0,
    custoComponentes: 0,
    custoTotalLote: 3410,
    custoUnitario: 341,
    precificacao: {
      metodo: "MARGEM",
      margemDesejada: 35,
      taxaCartaoConsiderada: 4.99,
      outrasTaxas: 0,
      precoSugerido: 990,
      precoVenda: 1000,
      lucroUnitario: 610,
      margemReal: 61,
      markupReal: 2.93,
    },
    custoCalculadoEm: ts(1),
    custoDesatualizado: false,
    ativo: true,
    ...parcial,
  } as unknown as FichaTecnica;
}

const TRADICIONAL = ficha({ id: "tradicional" });
const RED_VELVET = ficha({
  id: "redvelvet",
  nome: "Cookie Red Velvet",
  custoUnitario: 420,
  precificacao: { ...TRADICIONAL.precificacao, precoVenda: 1300 },
});
const RECHEIO = ficha({
  id: "recheio",
  nome: "Recheio de brigadeiro",
  categoria: "Recheio",
  custoUnitario: 110,
  precificacao: { ...TRADICIONAL.precificacao, precoVenda: 0 },
});

const CONTA = {
  id: "mycookies",
  nome: "MyCookie's",
  proprietaria: "Maynara Honório",
  criadaEm: ts(1),
  v: 1,
} as unknown as Conta;

function configuracao(
  parcial: Partial<ConfiguracaoGeral> = {},
): ConfiguracaoGeral {
  return {
    id: "geral",
    v: 1,
    nomeNegocio: "MyCookie's",
    categoriasProduto: ["Cookie", "Brownie", "Recheio"],
    formasPagamento: [],
    contato: { telefone: "(81) 98696-6176", instagram: "mycookies" },
    frase: "Feito com amor em cada mordida.",
    cardapio: {
      aberto: true,
      fichaIds: ["tradicional", "redvelvet", "recheio"],
    },
    ...parcial,
  } as unknown as ConfiguracaoGeral;
}

function montar(
  parcial: {
    conta?: Conta;
    configuracao?: ConfiguracaoGeral | null;
    fichas?: FichaTecnica[];
  } = {},
) {
  return montarCardapio({
    conta: parcial.conta ?? CONTA,
    configuracao:
      parcial.configuracao === undefined
        ? configuracao()
        : parcial.configuracao,
    fichas: parcial.fichas ?? [TRADICIONAL, RED_VELVET, RECHEIO],
    agoraMs: AGORA,
  });
}

describe("entraNoCardapio", () => {
  it("fica fora quando arquivada", () => {
    expect(entraNoCardapio(ficha({ id: "a", arquivado: true }))).toBe(false);
  });
  it("fica fora quando inativa", () => {
    expect(entraNoCardapio(ficha({ id: "a", ativo: false }))).toBe(false);
  });
  it("fica fora sem preço", () => {
    expect(entraNoCardapio(RECHEIO)).toBe(false);
  });
  it("fica fora vendida por peso", () => {
    expect(entraNoCardapio(ficha({ id: "a", unidadeRendimento: "g" }))).toBe(
      false,
    );
  });
  it("fica fora o combo à escolha", () => {
    expect(
      entraNoCardapio(
        ficha({
          id: "a",
          tipo: "KIT",
          escolhas: [{ quantidade: 2, categoria: "Cookie" }],
        }),
      ),
    ).toBe(false);
  });
  it("entra a simples em unidade", () => {
    expect(entraNoCardapio(TRADICIONAL)).toBe(true);
  });
  it("entra o kit sem escolhas em porção", () => {
    expect(
      entraNoCardapio(
        ficha({
          id: "a",
          tipo: "KIT",
          escolhas: [],
          unidadeRendimento: "porcao",
        }),
      ),
    ).toBe(true);
  });
});

describe("montarCardapio", () => {
  it("o caso de aceite: uma seção, dois produtos, o recheio fora", () => {
    const cardapio = montar();
    expect(cardapio).not.toBeNull();
    expect(cardapio!.secoes).toHaveLength(1);
    expect(cardapio!.secoes[0]!.categoria).toBe("Cookie");
    expect(cardapio!.secoes[0]!.produtos.map((p) => [p.nome, p.preco])).toEqual(
      [
        ["Cookie Red Velvet", 1300],
        ["Cookie Tradicional", 1000],
      ],
    );
    expect(cardapio!.negocio).toEqual({
      nome: "MyCookie's",
      quem: "Maynara",
      frase: "Feito com amor em cada mordida.",
      whatsapp: "5581986966176",
      instagram: "mycookies",
      feitoComRende: true,
    });
  });

  it("os cinco casos fechados dão null", () => {
    expect(montar({ configuracao: null })).toBeNull();
    expect(
      montar({
        configuracao: configuracao({
          cardapio: { aberto: false, fichaIds: ["tradicional"] },
        }),
      }),
    ).toBeNull();
    expect(
      montar({ conta: { ...CONTA, status: "ENCERRADA" } as Conta }),
    ).toBeNull();
    expect(
      montar({
        conta: {
          ...CONTA,
          plano: "TRIAL",
          trialAte: ts(AGORA - DIA),
        } as unknown as Conta,
      }),
    ).toBeNull();
    expect(montar({ fichas: [RECHEIO] })).toBeNull();
  });

  it("sem cardápio na configuração é fechado", () => {
    expect(
      montar({ configuracao: configuracao({ cardapio: undefined }) }),
    ).toBeNull();
  });

  it("conta em teste que ainda não venceu fica aberta", () => {
    expect(
      montar({
        conta: {
          ...CONTA,
          plano: "TRIAL",
          trialAte: ts(AGORA + DIA),
        } as unknown as Conta,
      }),
    ).not.toBeNull();
  });

  it("ordena as seções por categoriasProduto, a desconhecida no fim", () => {
    const brownie = ficha({ id: "b", nome: "Brownie", categoria: "Brownie" });
    const torta = ficha({ id: "t", nome: "Torta", categoria: "Torta" });
    const cardapio = montar({
      configuracao: configuracao({
        cardapio: { aberto: true, fichaIds: ["t", "b", "tradicional"] },
      }),
      fichas: [torta, brownie, TRADICIONAL],
    });
    expect(cardapio!.secoes.map((s) => s.categoria)).toEqual([
      "Cookie",
      "Brownie",
      "Torta",
    ]);
  });

  it("ficha arquivada da lista some sem erro", () => {
    const cardapio = montar({
      fichas: [{ ...TRADICIONAL, arquivado: true }, RED_VELVET],
    });
    expect(cardapio!.secoes[0]!.produtos.map((p) => p.id)).toEqual([
      "redvelvet",
    ]);
  });

  it("ficha fora da lista não aparece, mesmo que chegue", () => {
    const outra = ficha({ id: "outra", nome: "Outra" });
    const cardapio = montar({ fichas: [TRADICIONAL, outra] });
    expect(cardapio!.secoes[0]!.produtos.map((p) => p.id)).toEqual([
      "tradicional",
    ]);
  });

  it("sem foto, sem fotoVersao; com foto, o atualizadoEm", () => {
    const cardapio = montar({
      fichas: [{ ...TRADICIONAL, fotoUrl: undefined }, RED_VELVET],
    });
    const [red, trad] = cardapio!.secoes[0]!.produtos;
    expect(trad).not.toHaveProperty("fotoVersao");
    expect(red!.fotoVersao).toBe(1_700_000_000_000);
  });

  it("telefone que não disca fica sem whatsapp", () => {
    const cardapio = montar({
      configuracao: configuracao({ contato: { telefone: "123" } }),
    });
    expect(cardapio!.negocio).not.toHaveProperty("whatsapp");
    expect(cardapio!.negocio).not.toHaveProperty("instagram");
  });

  it("instagram sem o @ quando ela digitou com", () => {
    const cardapio = montar({
      configuracao: configuracao({ contato: { instagram: " @mycookies " } }),
    });
    expect(cardapio!.negocio.instagram).toBe("mycookies");
  });

  it("feitoComRende falso com ocultarFeitoCom", () => {
    const cardapio = montar({
      configuracao: configuracao({ ocultarFeitoCom: true }),
    });
    expect(cardapio!.negocio.feitoComRende).toBe(false);
  });

  it("porção sai com o rótulo pronto", () => {
    const cardapio = montar({
      fichas: [{ ...TRADICIONAL, unidadeRendimento: "porcao" }],
    });
    expect(cardapio!.secoes[0]!.produtos[0]!.unidade).toBe("porção");
  });

  // O teste que diz se o `#d158` vale: a ficha de teste tem custo, margem,
  // itens e modo de preparo, e nada disso pode sair.
  it("as chaves: nada além do que é público", () => {
    const permitidas = [
      "id",
      "nome",
      "descricao",
      "categoria",
      "preco",
      "unidade",
      "fotoVersao",
    ];
    const cardapio = montar();
    for (const secao of cardapio!.secoes) {
      expect(Object.keys(secao).sort()).toEqual(["categoria", "produtos"]);
      for (const produto of secao.produtos) {
        for (const chave of Object.keys(produto)) {
          expect(permitidas).toContain(chave);
        }
      }
    }
    expect(Object.keys(cardapio!).sort()).toEqual(["negocio", "secoes"]);
    for (const chave of Object.keys(cardapio!.negocio)) {
      expect([
        "nome",
        "quem",
        "frase",
        "whatsapp",
        "instagram",
        "feitoComRende",
      ]).toContain(chave);
    }
  });
});

describe("tipoDaFoto", () => {
  it("jpeg, png e webp saem; o resto não", () => {
    expect(tipoDaFoto("data:image/jpeg;base64,AA")).toBe("image/jpeg");
    expect(tipoDaFoto("data:image/png;base64,AA")).toBe("image/png");
    expect(tipoDaFoto("data:image/webp;base64,AA")).toBe("image/webp");
    expect(tipoDaFoto("data:image/svg+xml;base64,AA")).toBeNull();
    expect(tipoDaFoto("https://exemplo.com/a.jpg")).toBeNull();
    expect(tipoDaFoto(undefined)).toBeNull();
  });
});

describe("mensagemDeContato", () => {
  it("a frase inteira", () => {
    expect(mensagemDeContato(montar()!.negocio)).toBe(
      "Oi, MyCookie's! Vi o cardápio e queria fazer um pedido.",
    );
  });
});
