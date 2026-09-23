import { describe, expect, it } from "vitest";
import {
  entraNoCardapio,
  esquemaPedidoDoCardapio,
  mensagemDeAviso,
  mensagemDeContato,
  montarCardapio,
  pedidoDoCardapio,
  tipoDaFoto,
  type PedidoDoCardapio,
} from "@/lib/domain/cardapio";
import { hojeEmBrasilia, meiaNoiteEmBrasilia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
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

// ---------------------------------------------------------------------------
// Sessão B: o pedido. Ana manda 4 Tradicional, 4 Red Velvet e mais 2
// Tradicional numa segunda linha, retirada em 25/09; hoje é 23/09.
// ---------------------------------------------------------------------------

const HOJE = "2026-09-23";

function pedidoDaAna(
  parcial: Partial<PedidoDoCardapio> = {},
): PedidoDoCardapio {
  return esquemaPedidoDoCardapio.parse({
    contaId: "mycookies",
    nome: "Ana Beatriz",
    telefone: "(81) 98888-7777",
    itens: [
      { fichaId: "tradicional", quantidade: 4 },
      { fichaId: "redvelvet", quantidade: 4 },
      { fichaId: "tradicional", quantidade: 2 },
    ],
    dataEntregaISO: "2026-09-25",
    entrega: { tipo: "RETIRADA" },
    ...parcial,
  });
}

function gravar(
  pedido: PedidoDoCardapio = pedidoDaAna(),
  fichas: FichaTecnica[] = [TRADICIONAL, RED_VELVET, RECHEIO],
) {
  return pedidoDoCardapio({
    pedido,
    fichas,
    fichaIds: ["tradicional", "redvelvet", "recheio"],
    hojeISO: HOJE,
  });
}

describe("pedidoDoCardapio", () => {
  it("o caso de aceite, número por número", () => {
    const r = gravar();
    if (!r.ok) throw new Error(r.falha);
    const { corpo } = r;

    expect(corpo.itens).toEqual([
      {
        fichaTecnicaId: "tradicional",
        nomeSnapshot: "Cookie Tradicional",
        quantidade: 6,
        precoUnitario: 1000,
        custoUnitarioSnapshot: 341,
        subtotal: 6000,
      },
      {
        fichaTecnicaId: "redvelvet",
        nomeSnapshot: "Cookie Red Velvet",
        quantidade: 4,
        precoUnitario: 1300,
        custoUnitarioSnapshot: 420,
        subtotal: 5200,
      },
    ]);
    expect(corpo.subtotal).toBe(11200);
    expect(corpo.total).toBe(11200);
    expect(corpo.custoTotalEstimado).toBe(3726);
    expect(corpo.lucroEstimado).toBe(7474);
    expect(corpo.clienteNome).toBe("Ana Beatriz");
    expect(corpo.clienteTelefone).toBe("(81) 98888-7777");
    expect(corpo.status).toBe("ORCAMENTO");
    expect(corpo.origem).toBe("CARDAPIO");
    expect(corpo.competencia).toBe("2026-09");
    expect(corpo.dataEntregaISO).toBe("2026-09-25");
    expect(corpo.entrega).toEqual({ tipo: "RETIRADA", taxa: 0 });
    expect(corpo.fichaIds).toEqual(["tradicional", "redvelvet"]);
    expect(corpo.codigo).toMatch(/^P-260923-[A-Z0-9]{3}$/);
    expect(corpo.pago).toBe(false);
    expect(corpo.arquivado).toBe(false);
  });

  it("zera taxa, desconto e maquininha, e não liga a cliente", () => {
    const r = gravar(
      pedidoDaAna({
        entrega: { tipo: "ENTREGA", endereco: "Rua das Flores, 10" },
      }),
    );
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.entrega).toEqual({
      tipo: "ENTREGA",
      taxa: 0,
      endereco: "Rua das Flores, 10",
    });
    expect(r.corpo.desconto).toBe(0);
    expect(r.corpo.custoTaxaPagamento).toBe(0);
    expect(r.corpo).not.toHaveProperty("clienteId");
    expect(r.corpo).not.toHaveProperty("formaPagamentoId");
  });

  it("ignora preço vindo do corpo: o gravado é o da ficha", () => {
    const pedido = esquemaPedidoDoCardapio.parse({
      ...pedidoDaAna(),
      itens: [{ fichaId: "tradicional", quantidade: 1, precoUnitario: 1 }],
    });
    const r = gravar(pedido);
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.itens[0]!.precoUnitario).toBe(1000);
    expect(r.corpo.total).toBe(1000);
  });

  it("item fora da lista é `mudou`", () => {
    const r = pedidoDoCardapio({
      pedido: pedidoDaAna(),
      fichas: [TRADICIONAL, RED_VELVET],
      fichaIds: ["tradicional"],
      hojeISO: HOJE,
    });
    expect(r).toEqual({ ok: false, falha: "mudou" });
  });

  it("ficha arquivada desde a página é `mudou`", () => {
    const r = gravar(pedidoDaAna(), [
      TRADICIONAL,
      { ...RED_VELVET, arquivado: true },
    ]);
    expect(r).toEqual({ ok: false, falha: "mudou" });
  });

  it("produto sem preço é `mudou`", () => {
    const r = gravar(
      pedidoDaAna({ itens: [{ fichaId: "recheio", quantidade: 1 }] }),
    );
    expect(r).toEqual({ ok: false, falha: "mudou" });
  });

  it("a mesma ficha somando mais de 500 é `fora-de-forma`", () => {
    const r = gravar(
      pedidoDaAna({
        itens: [
          { fichaId: "tradicional", quantidade: 300 },
          { fichaId: "tradicional", quantidade: 201 },
        ],
      }),
    );
    expect(r).toEqual({ ok: false, falha: "fora-de-forma" });
  });

  it("hoje é `data`; amanhã passa; hoje + 90 passa; hoje + 91 é `data`", () => {
    const em = (dataEntregaISO: string) =>
      gravar(pedidoDaAna({ dataEntregaISO })).ok;
    expect(em("2026-09-24")).toBe(true);
    expect(em("2026-12-22")).toBe(true);
    expect(em("2026-12-23")).toBe(false);
    expect(gravar(pedidoDaAna({ dataEntregaISO: HOJE }))).toEqual({
      ok: false,
      falha: "data",
    });
  });

  it("dia que não existe é `data`", () => {
    expect(gravar(pedidoDaAna({ dataEntregaISO: "2026-09-31" }))).toEqual({
      ok: false,
      falha: "data",
    });
  });
});

describe("esquemaPedidoDoCardapio", () => {
  const base = {
    contaId: "mycookies",
    nome: "Ana",
    telefone: "(81) 98888-7777",
    itens: [{ fichaId: "tradicional", quantidade: 1 }],
    dataEntregaISO: "2026-09-25",
    entrega: { tipo: "RETIRADA" },
  };

  it("aceita o pedido mínimo", () => {
    expect(esquemaPedidoDoCardapio.safeParse(base).success).toBe(true);
  });
  it("recusa telefone que não disca", () => {
    expect(
      esquemaPedidoDoCardapio.safeParse({ ...base, telefone: "9888-777" })
        .success,
    ).toBe(false);
  });
  it("recusa entrega sem endereço", () => {
    expect(
      esquemaPedidoDoCardapio.safeParse({
        ...base,
        entrega: { tipo: "ENTREGA" },
      }).success,
    ).toBe(false);
  });
  it("recusa 31 linhas", () => {
    expect(
      esquemaPedidoDoCardapio.safeParse({
        ...base,
        itens: Array.from({ length: 31 }, () => base.itens[0]),
      }).success,
    ).toBe(false);
  });
  it("recusa quantidade quebrada", () => {
    expect(
      esquemaPedidoDoCardapio.safeParse({
        ...base,
        itens: [{ fichaId: "tradicional", quantidade: 1.5 }],
      }).success,
    ).toBe(false);
  });
});

describe("hojeEmBrasilia e meiaNoiteEmBrasilia", () => {
  it("01h30 UTC do dia 24 ainda é dia 23 em Brasília", () => {
    expect(hojeEmBrasilia(new Date("2026-09-24T01:30:00Z"))).toBe("2026-09-23");
  });
  it("a meia-noite de Brasília é 03h UTC", () => {
    expect(meiaNoiteEmBrasilia("2026-09-25").toISOString()).toBe(
      "2026-09-25T03:00:00.000Z",
    );
  });
});

describe("mensagemDeAviso", () => {
  const aviso = {
    negocio: "MyCookie's",
    codigo: "P-260923-K3F",
    nome: "Ana Beatriz",
    itens: [
      { nome: "Cookie Tradicional", quantidade: 6 },
      { nome: "Cookie Red Velvet", quantidade: 4 },
    ],
    total: 11200,
    dataEntregaISO: "2026-09-25",
    entrega: "RETIRADA" as const,
  };

  it("retirada, a frase inteira", () => {
    expect(mensagemDeAviso(aviso)).toBe(
      `Oi, MyCookie's! Acabei de fazer o pedido P-260923-K3F pelo cardápio: 6 Cookie Tradicional, 4 Cookie Red Velvet. Total ${formatarMoeda(11200)}, para retirar na sexta-feira, 25 de setembro. Meu nome é Ana.`,
    );
  });

  it("entrega no sábado, a frase inteira", () => {
    expect(
      mensagemDeAviso({
        ...aviso,
        entrega: "ENTREGA",
        dataEntregaISO: "2026-09-26",
      }),
    ).toBe(
      `Oi, MyCookie's! Acabei de fazer o pedido P-260923-K3F pelo cardápio: 6 Cookie Tradicional, 4 Cookie Red Velvet. Total ${formatarMoeda(11200)} sem a entrega, para receber no sábado, 26 de setembro. Meu nome é Ana.`,
    );
  });
});
