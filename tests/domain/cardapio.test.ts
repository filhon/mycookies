import { describe, expect, it } from "vitest";
import {
  achadosDoPote,
  apelidoValido,
  avisoDeOrcamentoAprovado,
  avisoDePedidoNovo,
  sugerirApelido,
  corDaLoja,
  entraNoCardapio,
  esperadoNoPote,
  esquemaPedidoDoCardapio,
  precisaConferirOPote,
  mensagemDeAviso,
  mensagemDeContato,
  montarCardapio,
  economiaDoCombo,
  escolhasEmTexto,
  fotoDoCombo,
  limitadasComContagem,
  maisPedidosDoCardapio,
  MINIMO_PARA_DESTACAR,
  pagamentoEmTexto,
  passaDoQueResta,
  pedidoDoCardapio,
  precoVigente,
  primeiroDiaDoCardapio,
  problemaDaPromocao,
  restamNoPote,
  seloDaPromocao,
  tipoDaFoto,
  unidadesPorFicha,
  type PedidoDoCardapio,
  type ProdutoDoCardapio,
} from "@/lib/domain/cardapio";
import { hojeEmBrasilia, meiaNoiteEmBrasilia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type {
  ConfiguracaoGeral,
  Conta,
  FichaTecnica,
  Pedido,
} from "@/lib/types";

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

// Sessão C: a "Caixa com 6" (fixa, 3 + 3) e a "Dupla" (2 de Cookie, à escolha),
// com o "Cookie teste" inativo na categoria.
const CAIXA = ficha({
  id: "caixa",
  nome: "Caixa com 6",
  categoria: "Combo",
  tipo: "KIT",
  rendimento: 1,
  componentes: [
    {
      fichaId: "tradicional",
      nomeSnapshot: "Cookie Tradicional",
      quantidade: 3,
      custoUnitarioSnapshot: 341,
      custoLinha: 1023,
    },
    {
      fichaId: "redvelvet",
      nomeSnapshot: "Cookie Red Velvet",
      quantidade: 3,
      custoUnitarioSnapshot: 420,
      custoLinha: 1260,
    },
  ],
  precificacao: { ...TRADICIONAL.precificacao, precoVenda: 6000 },
});
const DUPLA = ficha({
  id: "dupla",
  nome: "Dupla",
  categoria: "Combo",
  tipo: "KIT",
  rendimento: 1,
  escolhas: [{ quantidade: 2, categoria: "Cookie" }],
  custoEscolhas: 840,
  custoUnitario: 940,
  precificacao: { ...TRADICIONAL.precificacao, precoVenda: 1900 },
});
const TESTE = ficha({ id: "teste", nome: "Cookie teste", ativo: false });
// Sessão E: o Red Velvet a R$ 11,00 até sexta, 25/09.
const PROMOCAO_RV = { fichaId: "redvelvet", preco: 1100, ateISO: "2026-09-25" };
const LISTA_C = ["tradicional", "redvelvet", "recheio", "caixa", "dupla"];
const OPCOES = [TRADICIONAL, RED_VELVET, TESTE];

function montarComCombos(
  fichas: FichaTecnica[] = [TRADICIONAL, RED_VELVET, CAIXA, DUPLA],
  fichaIds: string[] = LISTA_C,
) {
  return montar({
    configuracao: configuracao({ cardapio: { aberto: true, fichaIds } }),
    fichas,
    opcoes: OPCOES,
  });
}

function produtoDe(
  cardapio: ReturnType<typeof montar>,
  id: string,
): ProdutoDoCardapio | undefined {
  return cardapio?.secoes.flatMap((s) => s.produtos).find((p) => p.id === id);
}

function montar(
  parcial: {
    conta?: Conta;
    configuracao?: ConfiguracaoGeral | null;
    fichas?: FichaTecnica[];
    opcoes?: FichaTecnica[];
  } = {},
) {
  return montarCardapio({
    conta: parcial.conta ?? CONTA,
    configuracao:
      parcial.configuracao === undefined
        ? configuracao()
        : parcial.configuracao,
    fichas: parcial.fichas ?? [TRADICIONAL, RED_VELVET, RECHEIO],
    opcoes: parcial.opcoes ?? [],
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
  it("entra o combo à escolha (sessão C)", () => {
    expect(
      entraNoCardapio(
        ficha({
          id: "a",
          tipo: "KIT",
          escolhas: [{ quantidade: 2, categoria: "Cookie" }],
        }),
      ),
    ).toBe(true);
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

  it("o pacote (spec 032): essencial e assinante sem pacote dão null", () => {
    const assinante = (pacote?: "ESSENCIAL" | "COMPLETO") =>
      ({
        ...CONTA,
        plano: "ASSINATURA",
        assinaturaAte: ts(AGORA + 30 * DIA),
        ...(pacote && { pacote }),
      }) as unknown as Conta;
    expect(montar({ conta: assinante("ESSENCIAL") })).toBeNull();
    expect(montar({ conta: assinante() })).toBeNull();
    expect(montar({ conta: assinante("COMPLETO") })).not.toBeNull();
    // Livre (a CONTA, sem plano) e teste abrem tudo (#d168).
    expect(montar()).not.toBeNull();
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
      "avulso",
      "escolhas",
      "economiaMinima",
      "restam",
      "precoCheio",
      "promocaoAteISO",
    ];
    const cardapio = montarCardapio({
      conta: CONTA,
      configuracao: configuracao({
        cardapio: {
          aberto: true,
          fichaIds: LISTA_C,
          limitados: ["tradicional"],
          promocoes: [PROMOCAO_RV],
        },
      }),
      fichas: [TRADICIONAL, RED_VELVET, CAIXA, DUPLA],
      opcoes: OPCOES,
      restam: new Map([["tradicional", 8]]),
      vendidos: [
        new Map([
          ["tradicional", 20],
          ["dupla", 9],
        ]),
      ],
      agoraMs: AGORA,
    });
    for (const secao of cardapio!.secoes) {
      expect(Object.keys(secao).sort()).toEqual(["categoria", "produtos"]);
      for (const produto of secao.produtos) {
        for (const chave of Object.keys(produto)) {
          expect(permitidas).toContain(chave);
        }
        for (const escolha of produto.escolhas ?? []) {
          expect(Object.keys(escolha).sort()).toEqual([
            "categoria",
            "opcoes",
            "quantidade",
          ]);
          for (const opcao of escolha.opcoes) {
            for (const chave of Object.keys(opcao)) {
              expect(["id", "nome", "preco", "restam", "fotoVersao"]).toContain(
                chave,
              );
            }
          }
        }
      }
    }
    // A caixa e a dupla estão lá: o teste não passa por ausência.
    const produtos = cardapio!.secoes.flatMap((s) => s.produtos);
    expect(produtos.some((p) => p.avulso)).toBe(true);
    expect(produtos.some((p) => p.escolhas && p.economiaMinima)).toBe(true);
    expect(produtos.some((p) => p.restam === 8)).toBe(true);
    expect(
      produtos.some((p) =>
        p.escolhas?.some((e) => e.opcoes.some((o) => o.fotoVersao)),
      ),
    ).toBe(true);
    expect(produtos.some((p) => p.precoCheio && p.promocaoAteISO)).toBe(true);
    expect(Object.keys(cardapio!).sort()).toEqual([
      "maisPedidos",
      "negocio",
      "secoes",
    ]);
    // Só ids, e só de produto que está na página (`#d316`).
    expect(cardapio!.maisPedidos).toEqual(["tradicional", "dupla"]);
    for (const id of cardapio!.maisPedidos!) {
      expect(produtos.map((p) => p.id)).toContain(id);
    }
    for (const chave of Object.keys(cardapio!.negocio)) {
      expect([
        "nome",
        "quem",
        "frase",
        "whatsapp",
        "instagram",
        "feitoComRende",
        "pagamento",
        "recado",
        "aPartirDeISO",
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
    opcoes: [],
    fichaIds: ["tradicional", "redvelvet", "recheio"],
    hojeISO: HOJE,
  });
}

describe("pedidoDoCardapio", () => {
  it("grava a chave que recebe, e sem ela não grava (#d320)", () => {
    const com = pedidoDoCardapio({
      pedido: pedidoDaAna(),
      fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
      opcoes: [],
      fichaIds: ["tradicional", "redvelvet", "recheio"],
      hojeISO: HOJE,
      chavePublica: "chave",
    });
    const sem = gravar();
    if (!com.ok || !sem.ok) throw new Error("falhou");
    expect(com.corpo.chavePublica).toBe("chave");
    expect("chavePublica" in sem.corpo).toBe(false);
  });

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
      opcoes: [],
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

  it("agenda cheia (`#d318`): recusa o dia antes do primeiro, aceita ele", () => {
    const em = (dataEntregaISO: string, aPartirDeISO?: string) =>
      pedidoDoCardapio({
        pedido: pedidoDaAna({ dataEntregaISO }),
        fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
        opcoes: [],
        fichaIds: ["tradicional", "redvelvet", "recheio"],
        aPartirDeISO,
        hojeISO: HOJE,
      });
    expect(em("2026-09-29", "2026-09-30")).toEqual({
      ok: false,
      falha: "data",
    });
    expect(em("2026-09-30", "2026-09-30").ok).toBe(true);
    // Vencida: vale como ausente.
    expect(em("2026-09-24", "2026-09-20").ok).toBe(true);
  });
});

describe("pagamentoEmTexto", () => {
  it("os tipos misturados, na ordem Pix, cartão, dinheiro, transferência", () => {
    expect(
      pagamentoEmTexto(["DINHEIRO", "TRANSFERENCIA", "CREDITO", "PIX"]),
    ).toBe("Pix, cartão, dinheiro ou transferência");
    expect(pagamentoEmTexto(["DINHEIRO", "PIX"])).toBe("Pix ou dinheiro");
    expect(pagamentoEmTexto(["DINHEIRO"])).toBe("Dinheiro");
  });

  it("débito, crédito e parcelado dizem cartão uma vez só", () => {
    expect(
      pagamentoEmTexto(["DEBITO", "CREDITO", "CREDITO_PARCELADO", "DINHEIRO"]),
    ).toBe("Cartão ou dinheiro");
  });

  it("sem forma, sem linha", () => {
    expect(pagamentoEmTexto([])).toBeNull();
  });
});

describe("primeiroDiaDoCardapio", () => {
  it("sem agenda cheia, amanhã", () => {
    expect(primeiroDiaDoCardapio(HOJE)).toBe("2026-09-24");
  });

  it("antes ou igual a amanhã, amanhã; depois, o dia dela", () => {
    expect(primeiroDiaDoCardapio(HOJE, "2026-09-24")).toBe("2026-09-24");
    expect(primeiroDiaDoCardapio(HOJE, "2026-10-02")).toBe("2026-10-02");
  });

  it("o vencido é ignorado; o inválido também; nunca passa de hoje + 90", () => {
    expect(primeiroDiaDoCardapio(HOJE, "2026-09-10")).toBe("2026-09-24");
    expect(primeiroDiaDoCardapio(HOJE, "2026-09-31")).toBe("2026-09-24");
    expect(primeiroDiaDoCardapio(HOJE, "2027-06-01")).toBe("2026-12-22");
  });
});

describe("montarCardapio · antes de pedir (`#d318`)", () => {
  const FORMAS = [
    {
      id: "a",
      nome: "Crédito maquininha Stone",
      tipo: "CREDITO",
      taxaPercentual: 4.99,
      taxaFixa: 0,
      prazoRecebimentoDias: 30,
      ativo: true,
    },
    {
      id: "b",
      nome: "Pix da Maynara",
      tipo: "PIX",
      taxaPercentual: 0,
      taxaFixa: 0,
      prazoRecebimentoDias: 0,
      ativo: true,
      instrucoes: "Chave: maynara@exemplo.com",
      pix: { chave: "maynara@exemplo.com", nome: "Maynara", cidade: "Recife" },
    },
    {
      id: "c",
      nome: "Dinheiro",
      tipo: "DINHEIRO",
      taxaPercentual: 0,
      taxaFixa: 0,
      prazoRecebimentoDias: 0,
      ativo: false,
    },
  ] as ConfiguracaoGeral["formasPagamento"];

  function comCardapio(
    cardapio: Partial<NonNullable<ConfiguracaoGeral["cardapio"]>>,
  ) {
    return montar({
      configuracao: configuracao({
        formasPagamento: FORMAS,
        cardapio: {
          aberto: true,
          fichaIds: ["tradicional", "redvelvet"],
          ...cardapio,
        },
      }),
    });
  }

  it("só o tipo das formas ativas sai: nem nome, nem taxa, nem chave", () => {
    const cardapio = comCardapio({});
    expect(cardapio!.negocio.pagamento).toBe("Pix ou cartão");
    const tudo = JSON.stringify(cardapio);
    for (const vaza of [
      "Stone",
      "maynara@exemplo.com",
      "4.99",
      "Recife",
      "Pix da",
    ]) {
      expect(tudo).not.toContain(vaza);
    }
  });

  it("sem forma ativa, sem `pagamento`", () => {
    const cardapio = montar({
      configuracao: configuracao({
        formasPagamento: FORMAS.map((f) => ({ ...f, ativo: false })),
      }),
    });
    expect(cardapio!.negocio).not.toHaveProperty("pagamento");
  });

  it("o recado sai aparado; vazio não sai", () => {
    expect(
      comCardapio({ recado: "  Retirada no Espinheiro.  " })!.negocio.recado,
    ).toBe("Retirada no Espinheiro.");
    expect(comCardapio({ recado: "   " })!.negocio).not.toHaveProperty(
      "recado",
    );
  });

  it("a agenda cheia sai só enquanto empurra o primeiro dia", () => {
    // AGORA é 23/09/2026.
    expect(
      comCardapio({ aPartirDeISO: "2026-10-02" })!.negocio.aPartirDeISO,
    ).toBe("2026-10-02");
    expect(
      comCardapio({ aPartirDeISO: "2026-09-24" })!.negocio,
    ).not.toHaveProperty("aPartirDeISO");
    expect(
      comCardapio({ aPartirDeISO: "2026-09-20" })!.negocio,
    ).not.toHaveProperty("aPartirDeISO");
  });

  it("as chaves do negócio, com as três novas", () => {
    const cardapio = comCardapio({
      recado: "Entrega a combinar.",
      aPartirDeISO: "2026-10-02",
    });
    expect(Object.keys(cardapio!.negocio).sort()).toEqual([
      "aPartirDeISO",
      "feitoComRende",
      "frase",
      "instagram",
      "nome",
      "pagamento",
      "quem",
      "recado",
      "whatsapp",
    ]);
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

  it("com o link, termina com ele (#d320)", () => {
    expect(
      mensagemDeAviso({ ...aviso, link: "https://rende.app/c/x/pedido/a/b" }),
    ).toMatch(
      /Meu nome é Ana\. Acompanhar: https:\/\/rende\.app\/c\/x\/pedido\/a\/b$/,
    );
  });
});

describe("avisoDePedidoNovo (spec 119)", () => {
  const pedido = {
    id: "abc",
    clienteNome: " Ana Beatriz ",
    itens: [{ quantidade: 4 }, { quantidade: 2 }],
    total: 11200,
    dataEntregaISO: "2026-10-23",
  };

  it("o primeiro nome, os itens somados, o valor e o dia", () => {
    expect(avisoDePedidoNovo(pedido)).toEqual({
      titulo: "Pedido novo pelo cardápio",
      corpo: `Ana · 6 itens · ${formatarMoeda(11200)} · para sexta-feira, 23 de outubro`,
      url: "/pedidos/abc",
      tag: "pedido-abc",
    });
  });

  it("um item no singular; quantidade quebrada com vírgula", () => {
    expect(
      avisoDePedidoNovo({ ...pedido, itens: [{ quantidade: 1 }] }).corpo,
    ).toMatch(/^Ana · 1 item · /);
    expect(
      avisoDePedidoNovo({ ...pedido, itens: [{ quantidade: 1.5 }] }).corpo,
    ).toMatch(/^Ana · 1,5 itens · /);
  });
});

describe("avisoDeOrcamentoAprovado (spec 149)", () => {
  it("o primeiro nome da cliente e o código, com tag própria", () => {
    expect(
      avisoDeOrcamentoAprovado({
        id: "abc",
        clienteNome: " Juliana Oliveira ",
        codigo: "P-261009-6F5",
      }),
    ).toEqual({
      titulo: "Orçamento aprovado",
      corpo: "Juliana aprovou o orçamento P-261009-6F5",
      url: "/pedidos/abc",
      tag: "aprovado-abc",
    });
  });
});

// ---------------------------------------------------------------------------
// Sessão C: os combos (`#d163`). A caixa fixa e a Dupla à escolha, sobre o
// caso de aceite da B.
// ---------------------------------------------------------------------------

describe("montarCardapio com combos", () => {
  it("kit fixo: avulso é 3 × 10 + 3 × 13", () => {
    expect(produtoDe(montarComCombos(), "caixa")!.avulso).toBe(6900);
  });

  it("kit fixo sem o Red Velvet na lista: sem avulso", () => {
    const caixa = produtoDe(
      montarComCombos(undefined, ["tradicional", "caixa"]),
      "caixa",
    );
    expect(caixa).toBeDefined();
    expect(caixa).not.toHaveProperty("avulso");
  });

  it("kit fixo que custa mais que os de dentro: sem avulso", () => {
    const cara = {
      ...CAIXA,
      precificacao: { ...CAIXA.precificacao, precoVenda: 7000 },
    };
    expect(
      produtoDe(montarComCombos([TRADICIONAL, RED_VELVET, cara]), "caixa"),
    ).not.toHaveProperty("avulso");
  });

  it("dupla: as opções vivas, sem o inativo, e economia mínima de R$ 1,00", () => {
    const dupla = produtoDe(montarComCombos(), "dupla")!;
    expect(dupla.escolhas).toEqual([
      {
        categoria: "Cookie",
        quantidade: 2,
        opcoes: [
          {
            id: "redvelvet",
            nome: "Cookie Red Velvet",
            preco: 1300,
            fotoVersao: 1_700_000_000_000,
          },
          {
            id: "tradicional",
            nome: "Cookie Tradicional",
            preco: 1000,
            fotoVersao: 1_700_000_000_000,
          },
        ],
      },
    ]);
    expect(dupla.economiaMinima).toBe(100);
    expect(dupla).not.toHaveProperty("avulso");
  });

  it("economiaDoCombo: 1 + 1 é R$ 4,00; 2 Red Velvet é R$ 7,00", () => {
    const dupla = produtoDe(montarComCombos(), "dupla")!;
    expect(
      economiaDoCombo(dupla, [
        { fichaId: "tradicional", quantidade: 1 },
        { fichaId: "redvelvet", quantidade: 1 },
      ]),
    ).toBe(400);
    expect(
      economiaDoCombo(dupla, [{ fichaId: "redvelvet", quantidade: 2 }]),
    ).toBe(700);
  });

  it("escolhasEmTexto: uma escolha, a esgotada fora da conta, e várias", () => {
    const opcoes = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `o${i}`, nome: `O${i}` }));
    expect(
      escolhasEmTexto([
        { quantidade: 4, categoria: "Cookie", opcoes: opcoes(5) },
      ]),
    ).toBe("4 à sua escolha, entre 5 opções");
    expect(
      escolhasEmTexto([
        {
          quantidade: 4,
          categoria: "Cookie",
          opcoes: [...opcoes(4), { id: "x", nome: "X", restam: 0 }],
        },
      ]),
    ).toBe("4 à sua escolha, entre 4 opções");
    expect(
      escolhasEmTexto([
        { quantidade: 2, categoria: "Cookie", opcoes: opcoes(2) },
      ]),
    ).toBe("2 à sua escolha, entre 2 opções");
    expect(
      escolhasEmTexto([
        { quantidade: 2, categoria: "Cookie", opcoes: opcoes(3) },
        { quantidade: 1, categoria: "Brownie", opcoes: opcoes(2) },
      ]),
    ).toBe("2 de Cookie e 1 de Brownie, à sua escolha");
    expect(
      escolhasEmTexto([
        { quantidade: 2, categoria: "Cookie", opcoes: [] },
        { quantidade: 1, categoria: "Brownie", opcoes: [] },
        { quantidade: 1, categoria: "Pão de mel", opcoes: [] },
      ]),
    ).toBe("2 de Cookie, 1 de Brownie e 1 de Pão de mel, à sua escolha");
  });

  it("fotoDoCombo: a própria, a mais pedida, a primeira com foto, nenhuma", () => {
    const escolhas = [
      {
        categoria: "Cookie",
        quantidade: 4,
        opcoes: [
          { id: "semfoto", nome: "Sem foto" },
          { id: "tradicional", nome: "Tradicional", fotoVersao: 1 },
          { id: "redvelvet", nome: "Red Velvet", fotoVersao: 2 },
        ],
      },
    ];
    expect(
      fotoDoCombo({ id: "combo", fotoVersao: 9, escolhas }, ["redvelvet"]),
    ).toEqual({ id: "combo", versao: 9 });
    expect(
      fotoDoCombo({ id: "combo", escolhas }, ["brownie", "redvelvet"]),
    ).toEqual({ id: "redvelvet", versao: 2 });
    expect(fotoDoCombo({ id: "combo", escolhas }, [])).toEqual({
      id: "tradicional",
      versao: 1,
    });
    expect(
      fotoDoCombo({
        id: "combo",
        escolhas: [{ ...escolhas[0]!, opcoes: [escolhas[0]!.opcoes[0]!] }],
      }),
    ).toBeNull();
  });

  it("opção fora da lista entra no combo, sem preço e sem economia", () => {
    const dupla = produtoDe(
      montarComCombos(undefined, ["tradicional", "dupla"]),
      "dupla",
    )!;
    expect(dupla.escolhas![0]!.opcoes.map((o) => o.id)).toEqual([
      "redvelvet",
      "tradicional",
    ]);
    expect(dupla.escolhas![0]!.opcoes[0]).not.toHaveProperty("preco");
    // A rota da foto só serve as da lista (`#d315`): fora dela, sem foto.
    expect(dupla.escolhas![0]!.opcoes[0]).not.toHaveProperty("fotoVersao");
    expect(dupla.escolhas![0]!.opcoes[1]!.fotoVersao).toBe(1_700_000_000_000);
    expect(
      economiaDoCombo(dupla, [
        { fichaId: "tradicional", quantidade: 1 },
        { fichaId: "redvelvet", quantidade: 1 },
      ]),
    ).toBeNull();
    // A mais barata (2 Tradicional) ainda economiza.
    expect(dupla.economiaMinima).toBe(100);
  });

  it("combo sem opção viva numa escolha some da página", () => {
    const cardapio = montar({
      configuracao: configuracao({
        cardapio: { aberto: true, fichaIds: LISTA_C },
      }),
      fichas: [TRADICIONAL, DUPLA],
      opcoes: [TESTE],
    });
    expect(produtoDe(cardapio, "dupla")).toBeUndefined();
  });
});

function pedidoDeDuplas(
  itens: PedidoDoCardapio["itens"],
): ReturnType<typeof pedidoDoCardapio> {
  return pedidoDoCardapio({
    pedido: pedidoDaAna({ itens }),
    fichas: [TRADICIONAL, RED_VELVET, CAIXA, DUPLA],
    opcoes: OPCOES,
    fichaIds: LISTA_C,
    hojeISO: HOJE,
  });
}

const UM_E_UM = [
  { fichaId: "tradicional", quantidade: 1 },
  { fichaId: "redvelvet", quantidade: 1 },
];

describe("pedidoDoCardapio com combos", () => {
  it("2 Duplas de 1 + 1: uma linha, custo do combo montado", () => {
    const r = pedidoDeDuplas([
      { fichaId: "dupla", quantidade: 1, escolhas: UM_E_UM },
      { fichaId: "dupla", quantidade: 1, escolhas: [...UM_E_UM].reverse() },
    ]);
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.itens).toEqual([
      {
        fichaTecnicaId: "dupla",
        nomeSnapshot: "Dupla",
        quantidade: 2,
        precoUnitario: 1900,
        // 1,00 de base + 3,41 + 4,20.
        custoUnitarioSnapshot: 861,
        subtotal: 3800,
        escolhas: [
          {
            fichaTecnicaId: "tradicional",
            nomeSnapshot: "Cookie Tradicional",
            quantidade: 1,
            custoUnitarioSnapshot: 341,
          },
          {
            fichaTecnicaId: "redvelvet",
            nomeSnapshot: "Cookie Red Velvet",
            quantidade: 1,
            custoUnitarioSnapshot: 420,
          },
        ],
      },
    ]);
    expect(r.corpo.fichaIds).toEqual(["dupla", "tradicional", "redvelvet"]);
  });

  it("com o Cookie teste numa escolha é `mudou`", () => {
    expect(
      pedidoDeDuplas([
        {
          fichaId: "dupla",
          quantidade: 1,
          escolhas: [
            { fichaId: "tradicional", quantidade: 1 },
            { fichaId: "teste", quantidade: 1 },
          ],
        },
      ]),
    ).toEqual({ ok: false, falha: "mudou" });
  });

  it("com um sabor só é `fora-de-forma`", () => {
    expect(
      pedidoDeDuplas([
        {
          fichaId: "dupla",
          quantidade: 1,
          escolhas: [{ fichaId: "tradicional", quantidade: 1 }],
        },
      ]),
    ).toEqual({ ok: false, falha: "fora-de-forma" });
  });

  it("combo sem escolhas, ou kit fixo com elas, é `fora-de-forma`", () => {
    expect(pedidoDeDuplas([{ fichaId: "dupla", quantidade: 1 }])).toEqual({
      ok: false,
      falha: "fora-de-forma",
    });
    expect(
      pedidoDeDuplas([{ fichaId: "caixa", quantidade: 1, escolhas: UM_E_UM }]),
    ).toEqual({ ok: false, falha: "fora-de-forma" });
  });

  it("1 Dupla de 2 Tradicional e 1 de 1 + 1 são duas linhas", () => {
    const r = pedidoDeDuplas([
      {
        fichaId: "dupla",
        quantidade: 1,
        escolhas: [{ fichaId: "tradicional", quantidade: 2 }],
      },
      { fichaId: "dupla", quantidade: 1, escolhas: UM_E_UM },
    ]);
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.itens.map((i) => i.custoUnitarioSnapshot)).toEqual([
      782, 861,
    ]);
    expect(r.corpo.total).toBe(3800);
  });

  it("a caixa fixa grava como produto, sem escolhas", () => {
    const r = pedidoDeDuplas([{ fichaId: "caixa", quantidade: 1 }]);
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.itens[0]).not.toHaveProperty("escolhas");
    expect(r.corpo.itens[0]!.precoUnitario).toBe(6000);
  });
});

describe("mensagemDeAviso com combo", () => {
  it("o nome com as escolhas", () => {
    expect(
      mensagemDeAviso({
        negocio: "MyCookie's",
        codigo: "P-260923-K3F",
        nome: "Ana",
        itens: [
          {
            nome: "Dupla",
            quantidade: 2,
            escolhas: [
              { quantidade: 1, nomeSnapshot: "Cookie Tradicional" },
              { quantidade: 1, nomeSnapshot: "Cookie Red Velvet" },
            ],
          },
        ],
        total: 3800,
        dataEntregaISO: "2026-09-25",
        entrega: "RETIRADA",
      }),
    ).toBe(
      `Oi, MyCookie's! Acabei de fazer o pedido P-260923-K3F pelo cardápio: 2 Dupla (1 Cookie Tradicional + 1 Cookie Red Velvet). Total ${formatarMoeda(3800)}, para retirar na sexta-feira, 25 de setembro. Meu nome é Ana.`,
    );
  });
});

// ---------------------------------------------------------------------------
// Sessão D: quantidade limitada. O Tradicional limitado, 30 no pote contados
// em 22/09, uma fornada de 12 em 23/09 (projeção 42).
// ---------------------------------------------------------------------------

const TRADICIONAL_CONTADO = ficha({
  id: "tradicional",
  estoqueProntoAtual: 30,
  estoqueProntoContadoEmISO: "2026-09-22",
});
const FORNADA = {
  arquivado: false,
  dataISO: "2026-09-23",
  fichaId: "tradicional",
  unidadesProduzidas: 12,
};
const linha = (
  fichaTecnicaId: string,
  quantidade: number,
  escolhas?: string[],
) => ({
  fichaTecnicaId,
  nomeSnapshot: fichaTecnicaId,
  quantidade,
  precoUnitario: 0,
  custoUnitarioSnapshot: 0,
  subtotal: 0,
  ...(escolhas
    ? {
        escolhas: escolhas.map((id) => ({
          fichaTecnicaId: id,
          nomeSnapshot: id,
          quantidade: 1,
          custoUnitarioSnapshot: 0,
        })),
      }
    : {}),
});
const pedidoD = (
  status: Pedido["status"],
  dataEntregaISO: string,
  itens: ReturnType<typeof linha>[],
) => ({ status, arquivado: false, dataEntregaISO, itens });
const PEDIDOS_D = [
  pedidoD("CONFIRMADO", "2026-09-24", [linha("tradicional", 29)]),
  pedidoD("ORCAMENTO", "2026-09-25", [
    linha("dupla", 2, ["tradicional", "redvelvet"]),
  ]),
  pedidoD("ORCAMENTO", "2026-09-25", [linha("caixa", 1)]),
  pedidoD("CANCELADO", "2026-09-25", [linha("tradicional", 10)]),
  pedidoD("ENTREGUE", "2026-09-22", [linha("tradicional", 4)]),
];

function restamD(limitada: FichaTecnica = TRADICIONAL_CONTADO) {
  return restamNoPote({
    limitadas: [limitada],
    kits: [CAIXA],
    fornadas: [FORNADA],
    pedidos: PEDIDOS_D,
    hojeISO: HOJE,
  });
}

describe("quantidade limitada", () => {
  it("unidadesPorFicha: a linha, as escolhas e os componentes", () => {
    const leva = unidadesPorFicha(
      [linha("dupla", 2, ["tradicional", "redvelvet"]), linha("caixa", 1)],
      [CAIXA],
    );
    expect(leva.get("tradicional")).toBe(5);
    expect(leva.get("redvelvet")).toBe(5);
    expect(leva.get("dupla")).toBe(2);
  });

  it("restam 42 − 34 = 8: sem o cancelado e sem o entregue antes da contagem", () => {
    expect(restamD()).toEqual(new Map([["tradicional", 8]]));
  });

  it("pedido de 10 passa do que resta; de 8, não", () => {
    const restam = restamD();
    expect(passaDoQueResta([linha("tradicional", 10)], [CAIXA], restam)).toBe(
      "tradicional",
    );
    expect(passaDoQueResta([linha("tradicional", 8)], [CAIXA], restam)).toBe(
      null,
    );
    // As escolhas e os componentes do próprio pedido contam.
    expect(
      passaDoQueResta(
        [linha("caixa", 2), linha("dupla", 3, ["tradicional", "tradicional"])],
        [CAIXA],
        restam,
      ),
    ).toBe("tradicional");
  });

  it("depois do pedido de 8, a página diz esgotado", () => {
    const restam = restamNoPote({
      limitadas: [TRADICIONAL_CONTADO],
      kits: [CAIXA],
      fornadas: [FORNADA],
      pedidos: [
        ...PEDIDOS_D,
        pedidoD("ORCAMENTO", "2026-09-26", [linha("tradicional", 8)]),
      ],
      hojeISO: HOJE,
    });
    expect(restam.get("tradicional")).toBe(0);
  });

  it("contagem vencida: sem número, e o pedido de 100 passa", () => {
    const vencida = ficha({
      id: "tradicional",
      estoqueProntoAtual: 30,
      estoqueProntoContadoEmISO: "2026-08-01",
    });
    const cardapio = {
      aberto: true,
      fichaIds: ["tradicional"],
      limitados: ["tradicional"],
    };
    expect(limitadasComContagem([vencida], cardapio, HOJE)).toEqual([]);
    const restam = restamD(vencida);
    expect(restam.has("tradicional")).toBe(false);
    expect(passaDoQueResta([linha("tradicional", 100)], [], restam)).toBe(null);
  });

  it("limitadasComContagem: só a limitada da lista, com pote e contagem", () => {
    const cardapio = {
      aberto: true,
      fichaIds: ["tradicional", "redvelvet", "caixa"],
      limitados: ["tradicional", "caixa", "fora"],
    };
    expect(
      limitadasComContagem(
        [TRADICIONAL_CONTADO, RED_VELVET, CAIXA],
        cardapio,
        HOJE,
      ).map((f) => f.id),
    ).toEqual(["tradicional"]);
  });

  it("a página: Restam 8 no Tradicional e na opção da Dupla; Red Velvet sem número", () => {
    const cardapio = montarCardapio({
      conta: CONTA,
      configuracao: configuracao({
        cardapio: {
          aberto: true,
          fichaIds: LISTA_C,
          limitados: ["tradicional"],
        },
      }),
      fichas: [TRADICIONAL_CONTADO, RED_VELVET, CAIXA, DUPLA],
      opcoes: OPCOES,
      restam: restamD(),
      agoraMs: AGORA,
    });
    expect(produtoDe(cardapio, "tradicional")!.restam).toBe(8);
    expect(produtoDe(cardapio, "redvelvet")).not.toHaveProperty("restam");
    const opcoes = produtoDe(cardapio, "dupla")!.escolhas![0]!.opcoes;
    expect(opcoes.find((o) => o.id === "tradicional")!.restam).toBe(8);
    expect(opcoes.find((o) => o.id === "redvelvet")).not.toHaveProperty(
      "restam",
    );
  });
});

// Sessão E: hoje é 23/09/2026, e o Red Velvet está a R$ 11,00 até 25/09.
function montarComPromocao(agoraMs = AGORA) {
  return montarCardapio({
    conta: CONTA,
    configuracao: configuracao({
      cardapio: { aberto: true, fichaIds: LISTA_C, promocoes: [PROMOCAO_RV] },
    }),
    fichas: [TRADICIONAL, RED_VELVET, CAIXA, DUPLA],
    opcoes: OPCOES,
    agoraMs,
  });
}

function gravarComPromocao(hojeISO: string, dataEntregaISO: string) {
  return pedidoDoCardapio({
    pedido: pedidoDaAna({
      itens: [{ fichaId: "redvelvet", quantidade: 4 }],
      dataEntregaISO,
    }),
    fichas: [TRADICIONAL, RED_VELVET],
    opcoes: [],
    fichaIds: ["tradicional", "redvelvet"],
    promocoes: [PROMOCAO_RV],
    hojeISO,
  });
}

describe("a promoção", () => {
  it("a página: R$ 13,00 riscado, R$ 11,00 e −15% até sexta", () => {
    const rv = produtoDe(montarComPromocao(), "redvelvet")!;
    expect(rv.preco).toBe(1100);
    expect(rv.precoCheio).toBe(1300);
    expect(rv.promocaoAteISO).toBe("2026-09-25");
    // 2/13 = 15,4%, para baixo.
    expect(seloDaPromocao(rv, HOJE)).toBe(
      "−15% até sexta-feira, 25 de setembro",
    );
    expect(seloDaPromocao(rv, "2026-09-25")).toBe("−15% · termina hoje");
    expect(produtoDe(montarComPromocao(), "tradicional")).not.toHaveProperty(
      "precoCheio",
    );
  });

  it("o pedido de 4 Red Velvet grava o preço da promoção", () => {
    const r = gravarComPromocao(HOJE, "2026-09-25");
    if (!r.ok) throw new Error(r.falha);
    const [item] = r.corpo.itens;
    expect(item!.precoUnitario).toBe(1100);
    expect(item!.subtotal).toBe(4400);
    expect(r.corpo.custoTotalEstimado).toBe(1680);
    expect(r.corpo.lucroEstimado).toBe(2720);
  });

  it("a Caixa com 6, durante a promoção: avulso R$ 63,00", () => {
    const caixa = produtoDe(montarComPromocao(), "caixa")!;
    expect(caixa.avulso).toBe(6300);
    expect(caixa.avulso! - caixa.preco).toBe(300);
    // A opção da Dupla também sai pelo preço de hoje.
    const opcoes = produtoDe(montarComPromocao(), "dupla")!.escolhas![0]!
      .opcoes;
    expect(opcoes.find((o) => o.id === "redvelvet")!.preco).toBe(1100);
  });

  it("em 26/09 acaba sozinha, na página e no pedido", () => {
    const rv = produtoDe(
      montarComPromocao(Date.parse("2026-09-26T15:00:00Z")),
      "redvelvet",
    )!;
    expect(rv.preco).toBe(1300);
    expect(rv).not.toHaveProperty("precoCheio");
    expect(seloDaPromocao(rv, "2026-09-26")).toBeNull();
    const r = gravarComPromocao("2026-09-26", "2026-09-28");
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.itens[0]!.precoUnitario).toBe(1300);
  });

  it("o último dia é o de Brasília: 25/09 às 23h30 ainda vale", () => {
    const rv = produtoDe(
      montarComPromocao(Date.parse("2026-09-26T02:30:00Z")),
      "redvelvet",
    )!;
    expect(rv.preco).toBe(1100);
  });

  it("problemaDaPromocao: igual ao preço, sem preço e depois de 30 dias", () => {
    expect(problemaDaPromocao(PROMOCAO_RV, RED_VELVET, HOJE)).toBeNull();
    expect(
      problemaDaPromocao({ ...PROMOCAO_RV, preco: 1300 }, RED_VELVET, HOJE),
    ).toBe("maior-que-o-preco");
    expect(
      problemaDaPromocao({ ...PROMOCAO_RV, preco: 0 }, RED_VELVET, HOJE),
    ).toBe("sem-preco");
    expect(
      problemaDaPromocao(
        { ...PROMOCAO_RV, ateISO: "2026-10-23" },
        RED_VELVET,
        HOJE,
      ),
    ).toBeNull();
    expect(
      problemaDaPromocao(
        { ...PROMOCAO_RV, ateISO: "2026-10-24" },
        RED_VELVET,
        HOJE,
      ),
    ).toBe("data");
    expect(
      problemaDaPromocao(
        { ...PROMOCAO_RV, ateISO: "2026-09-22" },
        RED_VELVET,
        HOJE,
      ),
    ).toBe("data");
  });

  it("a ficha baixada para R$ 11,00: sem promoção, sem riscado", () => {
    const baixada = {
      ...RED_VELVET,
      precificacao: { ...RED_VELVET.precificacao, precoVenda: 1100 },
    };
    expect(precoVigente(baixada, [PROMOCAO_RV], HOJE)).toEqual({
      preco: 1100,
    });
  });
});

// Sessão F (`#d166`): a cara da loja.

describe("corDaLoja", () => {
  it("põe a tinta clara sobre cor escura e a escura sobre cor clara", () => {
    expect(corDaLoja("#6B3E26")).toEqual({ fundo: "#6b3e26", tinta: "clara" });
    expect(corDaLoja("#F4D35E")).toEqual({ fundo: "#f4d35e", tinta: "escura" });
  });

  it("recusa o que não é #rrggbb", () => {
    expect(corDaLoja(undefined)).toBeNull();
    expect(corDaLoja("")).toBeNull();
    expect(corDaLoja("#fff")).toBeNull();
    expect(corDaLoja("red")).toBeNull();
    expect(corDaLoja("#12345g")).toBeNull();
  });
});

describe("montarCardapio com a vitrine", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";

  it("sem vitrine, a página não tem cor, capa nem logo", () => {
    const { negocio } = montar()!;
    expect(negocio.cor).toBeUndefined();
    expect(negocio.capaVersao).toBeUndefined();
    expect(negocio.logoVersao).toBeUndefined();
  });

  it("leva a cor e a versão das imagens, e nunca a imagem", () => {
    const cardapio = montarCardapio({
      conta: CONTA,
      configuracao: configuracao(),
      fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
      opcoes: [],
      vitrine: {
        capa: png,
        logo: "data:text/html;base64,PGgxPg==",
        cor: "#9E2F4A",
        atualizadoEm: ts(AGORA) as never,
      },
      agoraMs: AGORA,
    })!;
    expect(cardapio.negocio.cor).toEqual({ fundo: "#9e2f4a", tinta: "clara" });
    expect(cardapio.negocio.capaVersao).toBe(AGORA);
    // O logo que não é imagem não sai pela rota, então não vira `<img>`.
    expect(cardapio.negocio.logoVersao).toBeUndefined();
    expect(JSON.stringify(cardapio)).not.toContain("base64");
  });
});

// Spec 113: os mais pedidos, pelo `ResumoMensal.produtos` de dois meses.
describe("maisPedidosDoCardapio", () => {
  const produto = (
    id: string,
    parcial: Partial<ProdutoDoCardapio> = {},
  ): ProdutoDoCardapio => ({
    id,
    nome: id,
    categoria: "Cookie",
    preco: 1000,
    unidade: "un",
    fotoVersao: 1,
    ...parcial,
  });
  const mes = (vendas: Record<string, number>) =>
    new Map(Object.entries(vendas));
  const PRODUTOS = ["a", "b", "c", "d"].map((id) => produto(id));

  it("soma os dois meses e corta em três, do mais para o menos vendido", () => {
    expect(
      maisPedidosDoCardapio(
        [mes({ a: 3, b: 10, c: 6 }), mes({ a: 9, d: 7 })],
        PRODUTOS,
      ),
    ).toEqual(["a", "b", "d"]);
  });

  it(`abaixo de ${MINIMO_PARA_DESTACAR} unidades não destaca`, () => {
    expect(
      maisPedidosDoCardapio(
        [mes({ a: 2, b: 5, c: 4 }), mes({ a: 3 })],
        PRODUTOS,
      ),
    ).toEqual(["a", "b"]);
  });

  it("com menos de dois, nada", () => {
    expect(maisPedidosDoCardapio([mes({ a: 50, b: 4 })], PRODUTOS)).toEqual([]);
    expect(maisPedidosDoCardapio([], PRODUTOS)).toEqual([]);
  });

  it("sem foto, esgotado ou fora da página fica fora", () => {
    expect(
      maisPedidosDoCardapio(
        [mes({ a: 40, b: 30, c: 20, fora: 99, d: 10, e: 5 })],
        [
          produto("a", { fotoVersao: undefined }),
          produto("b", { restam: 0 }),
          produto("c", { restam: 3 }),
          produto("d"),
          produto("e"),
        ],
      ),
    ).toEqual(["c", "d", "e"]);
  });

  it("montarCardapio: só ids saem, e sem destaque a chave some", () => {
    const vendidos = [
      mes({ tradicional: 12, redvelvet: 8, recheio: 90 }),
      mes({ redvelvet: 6 }),
    ];
    const cardapio = montarCardapio({
      conta: CONTA,
      configuracao: configuracao(),
      fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
      opcoes: [],
      vendidos,
      agoraMs: AGORA,
    })!;
    // O recheio (preço zero) não está na página.
    expect(cardapio.maisPedidos).toEqual(["redvelvet", "tradicional"]);
    expect(JSON.stringify(cardapio)).not.toMatch(/\b(12|14|90)\b/);
    expect(
      montarCardapio({
        conta: CONTA,
        configuracao: configuracao(),
        fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
        opcoes: [],
        vendidos: [mes({ tradicional: 12 })],
        agoraMs: AGORA,
      }),
    ).not.toHaveProperty("maisPedidos");
  });
});

describe("o endereço da loja (#d319)", () => {
  it("sugere do nome, sem acento nem apóstrofo", () => {
    expect(sugerirApelido("MyCookie's")).toBe("mycookies");
    expect(sugerirApelido("  Doces da Ná  ")).toBe("doces-da-na");
    expect(sugerirApelido("Ateliê — Pão & Mel!")).toBe("atelie-pao-mel");
    expect(sugerirApelido("a".repeat(40))).toHaveLength(30);
    expect(sugerirApelido("x".repeat(29) + " y")).toBe("x".repeat(29));
  });

  it("aceita só a forma e recusa o reservado", () => {
    for (const ok of [
      "mycookies",
      "doces-da-na",
      "abc",
      "a1-b2",
      "x".repeat(30),
    ]) {
      expect(apelidoValido(ok)).toBe(true);
    }
    for (const nao of [
      "ab",
      "x".repeat(31),
      "-doces",
      "doces-",
      "doces--na",
      "Doces",
      "doces_na",
      "pão",
      "doces na",
      "login",
      "api",
      "c",
      "rende",
      "pedidos",
    ]) {
      expect(apelidoValido(nao)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Spec 118, sessão B: a taxa de entrega no pedido do cardápio (`#d321`).
// ---------------------------------------------------------------------------

describe("a taxa de entrega no cardápio (spec 118)", () => {
  const REGRA = {
    origem: { cep: "50000000", lat: -8.05, lng: -34.9 },
    raioKm: 8,
    faixas: [{ ateKm: 8, taxa: 800 }],
  };
  const ENTREGA = {
    tipo: "ENTREGA" as const,
    endereco: "Rua das Flores, 10 · Graças · Recife · CEP 52020-000",
    cep: "52020000",
  };

  function comTaxa(
    taxaDaEntrega: Parameters<typeof pedidoDoCardapio>[0]["taxaDaEntrega"],
    entrega: PedidoDoCardapio["entrega"] = ENTREGA,
  ) {
    return pedidoDoCardapio({
      pedido: pedidoDaAna({ entrega }),
      fichas: [TRADICIONAL, RED_VELVET, RECHEIO],
      opcoes: [],
      fichaIds: ["tradicional", "redvelvet", "recheio"],
      hojeISO: HOJE,
      taxaDaEntrega,
    });
  }

  it("a página só sabe que há regra: nada da regra sai (#d322)", () => {
    const sem = montar();
    const com = montar({ configuracao: configuracao({ entrega: REGRA }) });
    expect(sem?.negocio).not.toHaveProperty("entregaPorCep");
    expect(com?.negocio.entregaPorCep).toBe(true);
    expect(JSON.stringify(com)).not.toMatch(/raioKm|faixas|origem|-34\.9/);
  });

  it("a taxa calculada é gravada e somada ao total", () => {
    const r = comTaxa({
      tipo: "taxa",
      taxa: 800,
      porque: { km: 4.2, ateKm: 8 },
    });
    if (!r.ok) throw new Error(r.falha);
    expect(r.corpo.entrega).toEqual({
      tipo: "ENTREGA",
      taxa: 800,
      endereco: ENTREGA.endereco,
    });
    expect(r.corpo.subtotal).toBe(11200);
    expect(r.corpo.total).toBe(12000);
  });

  it("`fora` é `fora-da-area`", () => {
    expect(comTaxa({ tipo: "fora", porque: { bairro: "Candeias" } })).toEqual({
      ok: false,
      falha: "fora-da-area",
    });
  });

  it("a combinar, ou sem a conta do handler, é taxa zero, como antes", () => {
    for (const taxa of [{ tipo: "a-combinar" as const }, undefined]) {
      const r = comTaxa(taxa);
      if (!r.ok) throw new Error(r.falha);
      expect(r.corpo.entrega.taxa).toBe(0);
      expect(r.corpo.total).toBe(11200);
    }
  });

  it("retirada ignora a taxa e o fora", () => {
    const retirada = { tipo: "RETIRADA" as const };
    const fora = comTaxa({ tipo: "fora", porque: { km: 20 } }, retirada);
    const taxa = comTaxa(
      { tipo: "taxa", taxa: 800, porque: { km: 2 } },
      retirada,
    );
    if (!fora.ok || !taxa.ok) throw new Error("falhou");
    expect(fora.corpo.entrega).toEqual({ tipo: "RETIRADA", taxa: 0 });
    expect(taxa.corpo.total).toBe(11200);
  });

  it("o esquema aceita o CEP de 8 dígitos e recusa o resto; taxa no corpo some", () => {
    const base = pedidoDaAna();
    const com = (entrega: unknown) =>
      esquemaPedidoDoCardapio.safeParse({ ...base, entrega });
    expect(com(ENTREGA).success).toBe(true);
    expect(com({ ...ENTREGA, cep: "52020-000" }).success).toBe(false);
    expect(com({ ...ENTREGA, cep: "5202000" }).success).toBe(false);
    const comTaxaNoCorpo = com({ ...ENTREGA, taxa: 1 });
    expect(
      comTaxaNoCorpo.success && comTaxaNoCorpo.data.entrega,
    ).not.toHaveProperty("taxa");
  });

  it('a mensagem diz "com a entrega" quando a taxa veio calculada', () => {
    expect(
      mensagemDeAviso({
        negocio: "MyCookie's",
        codigo: "P-260923-K3F",
        nome: "Ana",
        itens: [{ nome: "Cookie Tradicional", quantidade: 6 }],
        total: 12000,
        dataEntregaISO: "2026-09-25",
        entrega: "ENTREGA",
        entregaCalculada: true,
      }),
    ).toContain(`Total ${formatarMoeda(12000)} com a entrega, para receber`);
  });
});

// Spec 130 (`#d335`): o que o pote deveria ter. Contado 16 em 17/09, hoje 23/09.
const POTE = ficha({
  id: "tradicional",
  estoqueProntoAtual: 16,
  estoqueProntoContadoEmISO: "2026-09-17",
});
const esperado = (
  pedidos: ReturnType<typeof pedidoD>[],
  fornadas = [] as (typeof FORNADA)[],
) => esperadoNoPote(POTE, fornadas, pedidos, [CAIXA], HOJE);

describe("esperado no pote", () => {
  it("entregue antes da contagem não sai", () => {
    const e = esperado([
      pedidoD("ENTREGUE", "2026-09-16", [linha("tradicional", 4)]),
    ]);
    expect(e).toMatchObject({ saiu: 0, pedidos: 0, esperado: 16 });
  });

  it("orçamento e cancelado não saem", () => {
    const e = esperado([
      pedidoD("ORCAMENTO", "2026-09-20", [linha("tradicional", 4)]),
      pedidoD("CANCELADO", "2026-09-20", [linha("tradicional", 5)]),
    ]);
    expect(e).toMatchObject({ saiu: 0, esperado: 16 });
  });

  it("o de hoje ainda não entregue não sai; entregue, sai", () => {
    expect(
      esperado([pedidoD("CONFIRMADO", HOJE, [linha("tradicional", 4)])]).saiu,
    ).toBe(0);
    expect(
      esperado([pedidoD("ENTREGUE", HOJE, [linha("tradicional", 4)])]).saiu,
    ).toBe(4);
  });

  it("ontem não marcado como entregue sai", () => {
    const e = esperado([
      pedidoD("CONFIRMADO", "2026-09-22", [linha("tradicional", 4)]),
    ]);
    expect(e).toMatchObject({ saiu: 4, pedidos: 1, esperado: 12 });
  });

  it("combo e kit descontam a ficha de dentro, e a massa soma", () => {
    const e = esperado(
      [
        pedidoD("ENTREGUE", "2026-09-20", [
          linha("dupla", 2, ["tradicional", "redvelvet"]),
        ]),
        pedidoD("PRONTO", "2026-09-21", [linha("caixa", 1)]),
        pedidoD("ENTREGUE", "2026-09-21", [linha("redvelvet", 9)]),
      ],
      [{ ...FORNADA, dataISO: "2026-09-19" }],
    );
    // 16 + 12 − (2 + 3), em 2 pedidos: o do Red Velvet não leva Tradicional.
    expect(e).toMatchObject({ feitas: 12, saiu: 5, pedidos: 2, esperado: 23 });
  });

  it("nunca abaixo de zero", () => {
    const e = esperado([
      pedidoD("ENTREGUE", "2026-09-20", [linha("tradicional", 40)]),
    ]);
    expect(e.esperado).toBe(0);
  });

  it("sem contagem que valha, esperado é null", () => {
    const nunca = ficha({ id: "tradicional" });
    expect(esperadoNoPote(nunca, [], [], [], HOJE).esperado).toBeNull();
  });
});

describe("precisa conferir o pote", () => {
  const de = (
    parcial: Partial<FichaTecnica>,
    fornadas = [] as (typeof FORNADA)[],
    pedidos = [] as ReturnType<typeof pedidoD>[],
  ) =>
    precisaConferirOPote(
      esperadoNoPote(
        ficha({ id: "tradicional", ...parcial }),
        fornadas,
        pedidos,
        [],
        HOJE,
      ),
    );

  it("fresca sem movimento fica de fora; com fornada ou pedido, entra", () => {
    expect(de(POTE)).toBe(false);
    expect(de(POTE, [{ ...FORNADA, dataISO: "2026-09-20" }])).toBe(true);
    expect(
      de(
        POTE,
        [],
        [pedidoD("ENTREGUE", "2026-09-20", [linha("tradicional", 1)])],
      ),
    ).toBe(true);
  });

  it("envelhecendo e vencida entram", () => {
    expect(
      de({ estoqueProntoAtual: 7, estoqueProntoContadoEmISO: "2026-09-01" }),
    ).toBe(true);
    expect(
      de({ estoqueProntoAtual: 7, estoqueProntoContadoEmISO: "2026-08-01" }),
    ).toBe(true);
  });

  it("nunca contada só entra com fornada na janela", () => {
    expect(de({})).toBe(false);
    expect(de({}, [FORNADA])).toBe(true);
    expect(de({}, [{ ...FORNADA, fichaId: "redvelvet" }])).toBe(false);
  });
});

// Spec 132 (`#d337`): o que o pote encontrou. Hoje 23/09, uma quarta.
describe("achados do pote", () => {
  const RV = ficha({
    ...RED_VELVET,
    estoqueProntoAtual: 9,
    estoqueProntoContadoEmISO: "2026-09-20",
  });
  const achar = (
    valores: Record<string, number | null>,
    {
      linhas = [POTE, RV],
      pedidos = [] as ReturnType<typeof pedidoD>[],
      esperados = new Map<string, { esperado: number | null }>([
        ["tradicional", { esperado: 16 }],
        ["redvelvet", { esperado: 9 }],
      ]),
    } = {},
  ) => achadosDoPote(linhas, valores, esperados, pedidos, [CAIXA], HOJE);

  it("sumiu pede 1 unidade e 10% juntos", () => {
    // 15 de 16 é 1 unidade, mas 6%: balança.
    expect(achar({ tradicional: 15 }).sumiram).toEqual([]);
    // 0,5 de 4 é 12%, mas menos de uma unidade.
    expect(
      achar(
        { tradicional: 3.5 },
        { esperados: new Map([["tradicional", { esperado: 4 }]]) },
      ).sumiram,
    ).toEqual([]);
    const { sumiram } = achar({ tradicional: 14, redvelvet: 4 });
    // O maior em venda primeiro: 5 × R$ 13,00 antes de 2 × R$ 10,00.
    expect(
      sumiram.map((s) => [s.ficha.id, s.unidades, s.venda, s.custo]),
    ).toEqual([
      ["redvelvet", 5, 6500, 2100],
      ["tradicional", 2, 2000, 682],
    ]);
  });

  it("sem esperado (vencida, nunca) não sumiu nem tinha a mais", () => {
    const achados = achar(
      { tradicional: 2, redvelvet: 30 },
      { esperados: new Map([["tradicional", { esperado: null }]]) },
    );
    expect(achados.sumiram).toEqual([]);
    expect(achados.aMais).toBe(0);
  });

  it("a mais só conta, com os mesmos limiares", () => {
    expect(achar({ tradicional: 20, redvelvet: 10 }).aMais).toBe(2);
    expect(achar({ tradicional: 17 }).aMais).toBe(0);
  });

  it("zero é zerada e, com esperado, sumiu", () => {
    const achados = achar({ redvelvet: 0 });
    expect(achados.zeradas.map((f) => f.id)).toEqual(["redvelvet"]);
    expect(achados.sumiram[0]).toMatchObject({ unidades: 9, venda: 11700 });
  });

  it("orçamento, cancelado, vencido e entregue ficam fora dos abertos", () => {
    const achados = achar(
      { tradicional: 6 },
      {
        pedidos: [
          pedidoD("CONFIRMADO", "2026-09-24", [linha("tradicional", 4)]),
          pedidoD("EM_PRODUCAO", HOJE, [linha("tradicional", 2)]),
          pedidoD("PRONTO", "2026-09-24", [linha("tradicional", 1)]),
          pedidoD("ORCAMENTO", "2026-09-24", [linha("tradicional", 50)]),
          pedidoD("CANCELADO", "2026-09-24", [linha("tradicional", 50)]),
          pedidoD("ENTREGUE", "2026-09-24", [linha("tradicional", 50)]),
          pedidoD("CONFIRMADO", "2026-09-22", [linha("tradicional", 50)]),
          {
            ...pedidoD("CONFIRMADO", "2026-09-24", [linha("tradicional", 50)]),
            arquivado: true,
          },
        ],
      },
    );
    expect(achados.faltam).toEqual([
      { ficha: POTE, contado: 6, levam: 7, pedidos: 3, ateISO: "2026-09-24" },
    ]);
  });

  it("kit e combo descontam a ficha de dentro", () => {
    const { faltam } = achar(
      { tradicional: 6, redvelvet: 9 },
      {
        pedidos: [
          pedidoD("CONFIRMADO", "2026-09-24", [linha("caixa", 1)]),
          pedidoD("PRONTO", "2026-09-25", [
            linha("dupla", 2, ["tradicional", "redvelvet"]),
          ]),
          pedidoD("CONFIRMADO", "2026-09-24", [linha("tradicional", 3)]),
        ],
      },
    );
    // 3 da caixa + 2 da dupla + 3 = 8; o Red Velvet leva 5 e tem 9.
    expect(faltam).toEqual([
      { ficha: POTE, contado: 6, levam: 8, pedidos: 3, ateISO: "2026-09-25" },
    ]);
  });

  it("o valor soma só as contadas com preço, em centavos inteiros", () => {
    const SEM_PRECO = ficha({
      ...RECHEIO,
      estoqueProntoAtual: 10,
      estoqueProntoContadoEmISO: "2026-09-20",
    });
    const PORCAO = ficha({
      id: "torta",
      unidadeRendimento: "porcao",
      custoUnitario: 333,
      precificacao: { ...TRADICIONAL.precificacao, precoVenda: 999 },
    });
    const achados = achar(
      { tradicional: 16, recheio: 2, torta: 1.5, redvelvet: null },
      {
        linhas: [POTE, RV, SEM_PRECO, PORCAO],
        esperados: new Map([
          ["tradicional", { esperado: 16 }],
          ["recheio", { esperado: 10 }],
        ]),
      },
    );
    // 16 × 1000 + round(1,5 × 999); 16 × 341 + round(1,5 × 333).
    expect(achados.valorVenda).toBe(16000 + 1499);
    expect(achados.valorCusto).toBe(5456 + 500);
    // O sem preço sumiu, sem valor.
    expect(achados.sumiram).toEqual([
      expect.objectContaining({ unidades: 8, venda: null, custo: null }),
    ]);
  });
});
