import { describe, expect, it } from "vitest";
import {
  agruparPorEntrega,
  aReceber,
  codigoDoPedido,
  custoDoComboMontado,
  custoDoItem,
  derivarPedido,
  descricaoDoRepasse,
  ehConcluido,
  entregasAPagar,
  entregasEsquecidas,
  escolhasCompletas,
  ofereceOPrecoDeHoje,
  passouDoDia,
  podeIrPara,
  repassesFeitos,
  resumoDasEscolhas,
  resumoDoRepasse,
  resumoDosItens,
  ROTULO_STATUS_PEDIDO,
  STATUS_CONCLUIDOS,
  STATUS_NA_AGENDA,
  subtotalDoItem,
  transicoesPermitidas,
  type ItemParaPedido,
  type PedidoParaEntrega,
} from "@/lib/domain/pedido";
import type { EscolhaFeita, FormaPagamento, StatusPedido } from "@/lib/types";

const CREDITO: FormaPagamento = {
  id: "credito",
  nome: "Cartão de crédito",
  tipo: "CREDITO",
  taxaPercentual: 4.99,
  taxaFixa: 0,
  prazoRecebimentoDias: 30,
  ativo: true,
};

// As duas fichas da spec 002, com os números que ela deixou gravados.
const COOKIE = { precoUnitario: 690, custoUnitarioSnapshot: 441 };
const CAIXA_COM_6 = { precoUnitario: 4990, custoUnitarioSnapshot: 3200 };

function pedidoDaCliente(cookies: number, desconto = 780, taxaEntrega = 1000) {
  return derivarPedido({
    itens: [
      { ...COOKIE, quantidade: cookies },
      { ...CAIXA_COM_6, quantidade: 2 },
    ],
    desconto,
    taxaEntrega,
    forma: CREDITO,
  });
}

// ---------------------------------------------------------------------------
// O caso de aceite da spec 003, número por número.
// ---------------------------------------------------------------------------

describe("derivarPedido", () => {
  it("fecha o caso de aceite: 20 cookies, 2 caixas, R$ 7,80 de desconto e R$ 10,00 de entrega", () => {
    const derivado = pedidoDaCliente(20);

    expect(derivado.linhas).toEqual([
      { subtotal: 13800, custo: 8820 },
      { subtotal: 9980, custo: 6400 },
    ]);

    expect(derivado.subtotal).toBe(23780);
    expect(derivado.desconto).toBe(780);
    expect(derivado.taxaEntrega).toBe(1000);
    expect(derivado.total).toBe(24000);
    expect(derivado.custoTotalEstimado).toBe(15220);
    expect(derivado.custoTaxaPagamento).toBe(1198);
    expect(derivado.lucroEstimado).toBe(7582);
    expect(derivado.quantidadeItens).toBe(22);
    expect(derivado.descontoLimitado).toBe(false);
  });

  it("refaz os totais quando a cliente sobe para 24 cookies", () => {
    const derivado = pedidoDaCliente(24);

    expect(derivado.subtotal).toBe(26540);
    expect(derivado.total).toBe(26760);
    expect(derivado.custoTotalEstimado).toBe(16984);
    expect(derivado.custoTaxaPagamento).toBe(1335);
    expect(derivado.lucroEstimado).toBe(8441);
  });

  it("a taxa da maquininha incide sobre o total, entrega inclusa", () => {
    const semEntrega = pedidoDaCliente(20, 780, 0);

    expect(semEntrega.total).toBe(23000);
    // 4,99% de 23000, e não de 24000: a entrega mudou a base do cálculo.
    expect(semEntrega.custoTaxaPagamento).toBe(1148);
  });

  it("a entrega entra no total e não entra no custo", () => {
    const comEntrega = pedidoDaCliente(20, 780, 1000);
    const semEntrega = pedidoDaCliente(20, 780, 0);

    expect(comEntrega.custoTotalEstimado).toBe(semEntrega.custoTotalEstimado);
    expect(comEntrega.total - semEntrega.total).toBe(1000);
  });

  it("sem forma de pagamento escolhida não há taxa a descontar", () => {
    const derivado = derivarPedido({
      itens: [{ ...COOKIE, quantidade: 20 }],
      desconto: 0,
      taxaEntrega: 0,
    });

    expect(derivado.custoTaxaPagamento).toBe(0);
    expect(derivado.lucroEstimado).toBe(13800 - 8820);
  });

  it("desconto maior que o subtotal vira o subtotal, e nunca total negativo", () => {
    const derivado = pedidoDaCliente(20, 30000);

    expect(derivado.descontoPedido).toBe(30000);
    expect(derivado.desconto).toBe(23780);
    expect(derivado.descontoLimitado).toBe(true);
    // Sobra a taxa de entrega, que não é descontável.
    expect(derivado.total).toBe(1000);
    expect(derivado.total).toBeGreaterThanOrEqual(0);
  });

  it("desconto e entrega negativos não viram receita", () => {
    const derivado = derivarPedido({
      itens: [{ ...COOKIE, quantidade: 10 }],
      desconto: -500,
      taxaEntrega: -500,
      forma: CREDITO,
    });

    expect(derivado.desconto).toBe(0);
    expect(derivado.taxaEntrega).toBe(0);
    expect(derivado.total).toBe(6900);
  });

  it("linha sem quantidade digitada não soma nem subtrai", () => {
    const vazia: ItemParaPedido = { ...COOKIE, quantidade: 0 };
    const errada: ItemParaPedido = { ...COOKIE, quantidade: -3 };

    expect(subtotalDoItem(vazia)).toBe(0);
    expect(custoDoItem(vazia)).toBe(0);
    expect(subtotalDoItem(errada)).toBe(0);
    expect(custoDoItem(errada)).toBe(0);
  });

  it("pedido sem item nenhum soma zero em vez de quebrar", () => {
    const derivado = derivarPedido({ itens: [], desconto: 0, taxaEntrega: 0 });

    expect(derivado.subtotal).toBe(0);
    expect(derivado.total).toBe(0);
    expect(derivado.lucroEstimado).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Snapshot: o preço congela quando o item entra (`DECISOES.md#d08`).
// ---------------------------------------------------------------------------

describe("preço congelado", () => {
  it("mudar a quantidade multiplica o congelado, e não busca o preço de hoje", () => {
    const item: ItemParaPedido = { ...COOKIE, quantidade: 20 };
    const dobro: ItemParaPedido = { ...item, quantidade: 40 };

    // A ficha subiu para R$ 7,50 depois do pedido; a linha não se mexe.
    const precoDaFichaHoje = 750;
    expect(subtotalDoItem(dobro)).toBe(40 * 690);
    expect(subtotalDoItem(dobro)).not.toBe(40 * precoDaFichaHoje);
  });

  it("o selo do preço de hoje só existe enquanto o pedido é orçamento", () => {
    expect(ofereceOPrecoDeHoje("ORCAMENTO", 690, 750)).toBe(true);
    expect(ofereceOPrecoDeHoje("CONFIRMADO", 690, 750)).toBe(false);
    expect(ofereceOPrecoDeHoje("EM_PRODUCAO", 690, 750)).toBe(false);
    expect(ofereceOPrecoDeHoje("ENTREGUE", 690, 750)).toBe(false);
  });

  it("preço igual ao da ficha não pede nada, e ficha sumida não inventa preço", () => {
    expect(ofereceOPrecoDeHoje("ORCAMENTO", 690, 690)).toBe(false);
    expect(ofereceOPrecoDeHoje("ORCAMENTO", 690, undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status: avanço, um passo atrás, cancelamento e reabertura.
// ---------------------------------------------------------------------------

describe("transicoesPermitidas", () => {
  it("avança um passo de cada vez", () => {
    expect(podeIrPara("ORCAMENTO", "CONFIRMADO")).toBe(true);
    expect(podeIrPara("CONFIRMADO", "EM_PRODUCAO")).toBe(true);
    expect(podeIrPara("EM_PRODUCAO", "PRONTO")).toBe(true);
    expect(podeIrPara("PRONTO", "ENTREGUE")).toBe(true);
  });

  it("não pula etapa", () => {
    expect(podeIrPara("ORCAMENTO", "ENTREGUE")).toBe(false);
    expect(podeIrPara("CONFIRMADO", "PRONTO")).toBe(false);
  });

  it("voltar um passo é sempre permitido", () => {
    expect(podeIrPara("ENTREGUE", "PRONTO")).toBe(true);
    expect(podeIrPara("PRONTO", "EM_PRODUCAO")).toBe(true);
    expect(podeIrPara("EM_PRODUCAO", "CONFIRMADO")).toBe(true);
    expect(podeIrPara("CONFIRMADO", "ORCAMENTO")).toBe(true);
  });

  it("cancela de qualquer ponto do fluxo", () => {
    const noFluxo: StatusPedido[] = [
      "ORCAMENTO",
      "CONFIRMADO",
      "EM_PRODUCAO",
      "PRONTO",
      "ENTREGUE",
    ];
    for (const status of noFluxo) {
      expect(podeIrPara(status, "CANCELADO")).toBe(true);
    }
  });

  it("cancelado reabre como orçamento, e só", () => {
    expect(transicoesPermitidas("CANCELADO")).toEqual(["ORCAMENTO"]);
    expect(podeIrPara("CANCELADO", "CONFIRMADO")).toBe(false);
    expect(podeIrPara("CANCELADO", "CANCELADO")).toBe(false);
  });

  it("o orçamento não tem passo atrás, e o entregue não tem passo adiante", () => {
    expect(transicoesPermitidas("ORCAMENTO")).toEqual([
      "CONFIRMADO",
      "CANCELADO",
    ]);
    expect(transicoesPermitidas("ENTREGUE")).toEqual(["PRONTO", "CANCELADO"]);
  });

  it("entregue e cancelado saem da agenda", () => {
    expect(ehConcluido("ENTREGUE")).toBe(true);
    expect(ehConcluido("CANCELADO")).toBe(true);
    expect(ehConcluido("PRONTO")).toBe(false);
  });

  it("agenda e concluídos repartem os seis status, sem repetição", () => {
    const juntos = [...STATUS_NA_AGENDA, ...STATUS_CONCLUIDOS];
    // `ROTULO_STATUS_PEDIDO` é `Record<StatusPedido, …>`: um sétimo status
    // entra nele pelo compilador, e cai aqui se ficar fora das duas listas.
    const todos = Object.keys(ROTULO_STATUS_PEDIDO);

    expect(new Set(juntos).size).toBe(juntos.length);
    expect([...juntos].sort()).toEqual([...todos].sort());
    for (const status of STATUS_NA_AGENDA) {
      expect(ehConcluido(status)).toBe(false);
    }
    for (const status of STATUS_CONCLUIDOS) {
      expect(ehConcluido(status)).toBe(true);
    }
  });

  it("passou do dia: data anterior a hoje e pedido ainda aberto", () => {
    const hoje = "2026-09-26";
    expect(
      passouDoDia({ dataEntregaISO: "2026-09-25", status: "CONFIRMADO" }, hoje),
    ).toBe(true);
    // Virada de mês: a comparação é de texto ISO, e continua valendo.
    expect(
      passouDoDia({ dataEntregaISO: "2026-08-31", status: "ORCAMENTO" }, hoje),
    ).toBe(true);
    expect(passouDoDia({ dataEntregaISO: hoje, status: "PRONTO" }, hoje)).toBe(
      false,
    );
    expect(
      passouDoDia({ dataEntregaISO: "2026-09-25", status: "ENTREGUE" }, hoje),
    ).toBe(false);
    expect(
      passouDoDia({ dataEntregaISO: "2026-09-25", status: "CANCELADO" }, hoje),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Código, agenda e resumo de linha.
// ---------------------------------------------------------------------------

describe("codigoDoPedido", () => {
  it("escreve a data do aparelho no formato P-AAMMDD-XXX", () => {
    // 15 de setembro de 2026, montado por componentes locais.
    const data = new Date(2026, 8, 15, 14, 30);
    expect(codigoDoPedido(data, "k3f9-abc")).toBe("P-260915-K3F");
  });

  it("completa o sufixo quando a semente é curta demais", () => {
    expect(codigoDoPedido(new Date(2026, 0, 2), "a")).toBe("P-260102-AXX");
  });
});

describe("agruparPorEntrega", () => {
  it("reúne por dia, do mais próximo para o mais distante", () => {
    const grupos = agruparPorEntrega([
      { id: "c", dataEntregaISO: "2026-09-20" },
      { id: "a", dataEntregaISO: "2026-09-12" },
      { id: "b", dataEntregaISO: "2026-09-12" },
    ]);

    expect(grupos.map((grupo) => grupo.dataISO)).toEqual([
      "2026-09-12",
      "2026-09-20",
    ]);
    expect(grupos[0]?.pedidos.map((pedido) => pedido.id)).toEqual(["a", "b"]);
  });

  it("sem pedido nenhum não inventa grupo", () => {
    expect(agruparPorEntrega([])).toEqual([]);
  });
});

describe("resumoDosItens", () => {
  it("diz o que é o pedido em uma linha", () => {
    expect(
      resumoDosItens([
        { quantidade: 20, nomeSnapshot: "Cookie tradicional" },
        { quantidade: 2, nomeSnapshot: "Caixa com 6" },
      ]),
    ).toBe("20 × Cookie tradicional · 2 × Caixa com 6");
  });

  it("conta o que não coube", () => {
    expect(
      resumoDosItens([
        { quantidade: 20, nomeSnapshot: "Cookie tradicional" },
        { quantidade: 2, nomeSnapshot: "Caixa com 6" },
        { quantidade: 1, nomeSnapshot: "Brownie" },
      ]),
    ).toBe("20 × Cookie tradicional · 2 × Caixa com 6 · e mais 1 item");
  });

  it("pedido vazio não vira linha em branco", () => {
    expect(resumoDosItens([])).toBe("Sem itens");
  });

  it("diz a escolha do combo entre parênteses", () => {
    expect(
      resumoDosItens([
        { quantidade: 3, nomeSnapshot: "Combo dupla", escolhas: ESCOLHA_DUPLA },
      ]),
    ).toBe("3 × Combo dupla (1 Cookie tradicional + 1 Cookie de nutella)");
  });
});

// ---------------------------------------------------------------------------
// Spec 014 · o combo à escolha: preço fixo, custo congelado na escolha.
// ---------------------------------------------------------------------------

/** A ficha do combo do caso de aceite: saquinho 50 + escolhas 620. */
const COMBO_DUPLA = {
  custoUnitario: 670,
  custoEscolhas: 620,
  escolhas: [{ quantidade: 2, categoria: "Cookie" }],
};

const TRADICIONAL: EscolhaFeita = {
  fichaTecnicaId: "trad",
  nomeSnapshot: "Cookie tradicional",
  quantidade: 1,
  custoUnitarioSnapshot: 220,
};
const NUTELLA: EscolhaFeita = {
  fichaTecnicaId: "nutella",
  nomeSnapshot: "Cookie de nutella",
  quantidade: 1,
  custoUnitarioSnapshot: 310,
};
const ESCOLHA_DUPLA = [TRADICIONAL, NUTELLA];

const CATEGORIAS: Record<string, string> = {
  trad: "Cookie",
  nutella: "Cookie",
  brownie: "Brownie",
};
const categoriaDe = (fichaId: string) => CATEGORIAS[fichaId];

describe("custoDoComboMontado", () => {
  it("fecha o caso de aceite: 670 − 620 + 220 + 310 = 580", () => {
    expect(custoDoComboMontado(COMBO_DUPLA, ESCOLHA_DUPLA)).toBe(580);
  });

  it("dois do mesmo sabor multiplicam o congelado", () => {
    expect(
      custoDoComboMontado(COMBO_DUPLA, [{ ...NUTELLA, quantidade: 2 }]),
    ).toBe(50 + 620);
  });

  it("sem escolha ainda, é só a base do kit", () => {
    expect(custoDoComboMontado(COMBO_DUPLA, [])).toBe(50);
  });

  it("ficha antiga sem custoEscolhas é kit fixo: o custo é o dela", () => {
    expect(custoDoComboMontado({ custoUnitario: 3200 }, [])).toBe(3200);
  });

  it("a linha do pedido: 3 combos a R$ 12,00 rendem R$ 18,60 sem desconto", () => {
    const derivado = derivarPedido({
      itens: [
        {
          quantidade: 3,
          precoUnitario: 1200,
          custoUnitarioSnapshot: custoDoComboMontado(
            COMBO_DUPLA,
            ESCOLHA_DUPLA,
          ),
        },
      ],
      desconto: 0,
      taxaEntrega: 0,
    });
    expect(derivado.linhas).toEqual([{ subtotal: 3600, custo: 1740 }]);
    expect(derivado.lucroEstimado).toBe(1860);
    // O combo é um item, e não dois cookies (`#d102`).
    expect(derivado.quantidadeItens).toBe(3);
    // O contorno de hoje chega ao mesmo total com um desconto que não é desconto.
    expect(
      derivarPedido({
        itens: [
          { quantidade: 3, precoUnitario: 700, custoUnitarioSnapshot: 220 },
          { quantidade: 3, precoUnitario: 800, custoUnitarioSnapshot: 310 },
        ],
        desconto: 900,
        taxaEntrega: 0,
      }).total,
    ).toBe(3600);
  });
});

describe("escolhasCompletas", () => {
  it("1 tradicional + 1 nutella fecha o combo de 2 cookies", () => {
    expect(escolhasCompletas(COMBO_DUPLA, ESCOLHA_DUPLA, categoriaDe)).toEqual({
      completas: true,
      faltam: [],
    });
  });

  it("só 1 tradicional deixa faltar 1 de Cookie", () => {
    expect(escolhasCompletas(COMBO_DUPLA, [TRADICIONAL], categoriaDe)).toEqual({
      completas: false,
      faltam: [{ categoria: "Cookie", quantidade: 1 }],
    });
  });

  it("nem a mais: três cookies num combo de dois é sobra, e não fecha", () => {
    const resultado = escolhasCompletas(
      COMBO_DUPLA,
      [TRADICIONAL, { ...NUTELLA, quantidade: 2 }],
      categoriaDe,
    );
    expect(resultado.completas).toBe(false);
    expect(resultado.faltam).toEqual([{ categoria: "Cookie", quantidade: -1 }]);
  });

  it("um brownie não conta como cookie, e uma ficha sumida não conta como nada", () => {
    const brownie = { ...TRADICIONAL, fichaTecnicaId: "brownie" };
    const sumida = { ...NUTELLA, fichaTecnicaId: "nao-existe" };
    expect(
      escolhasCompletas(COMBO_DUPLA, [brownie, sumida], categoriaDe).faltam,
    ).toEqual([{ categoria: "Cookie", quantidade: 2 }]);
  });

  it("kit sem escolha está sempre completo", () => {
    expect(escolhasCompletas({}, [], categoriaDe).completas).toBe(true);
  });
});

describe("resumoDasEscolhas", () => {
  it("escreve a escolha em uma frase", () => {
    expect(resumoDasEscolhas(ESCOLHA_DUPLA)).toBe(
      "1 Cookie tradicional + 1 Cookie de nutella",
    );
    expect(resumoDasEscolhas([{ ...NUTELLA, quantidade: 2 }])).toBe(
      "2 Cookie de nutella",
    );
    expect(resumoDasEscolhas([])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Sessão 3B · o dinheiro combinado que ainda não entrou.
// ---------------------------------------------------------------------------

describe("aReceber", () => {
  const AGENDA: { status: StatusPedido; pago: boolean; total: number }[] = [
    { status: "ORCAMENTO", pago: false, total: 5000 },
    { status: "CONFIRMADO", pago: false, total: 24000 },
    { status: "EM_PRODUCAO", pago: false, total: 8000 },
    { status: "PRONTO", pago: true, total: 12000 },
    { status: "ENTREGUE", pago: false, total: 6900 },
    { status: "CANCELADO", pago: false, total: 30000 },
  ];

  it("soma o que foi combinado e ainda não foi pago", () => {
    // 24000 + 8000 + 6900. O orçamento e o cancelado ficam de fora, e o pago
    // já está no resultado do mês.
    expect(aReceber(AGENDA)).toEqual({
      total: 38900,
      quantidade: 3,
      entregues: 1,
    });
  });

  it("conta separado o entregue e não pago, que é o que some do painel", () => {
    expect(aReceber(AGENDA).entregues).toBe(1);
  });

  it("agenda sem nada a receber devolve zero, e não uma linha de R$ 0,00", () => {
    expect(aReceber([])).toEqual({ total: 0, quantidade: 0, entregues: 0 });
    expect(
      aReceber([{ status: "ENTREGUE", pago: true, total: 24000 }]),
    ).toEqual({ total: 0, quantidade: 0, entregues: 0 });
  });
});

// ---------------------------------------------------------------------------
// Spec 012 · o acerto das entregas, número por número.
// ---------------------------------------------------------------------------

function pedidoDeEntrega(
  codigo: string,
  dataEntregaISO: string,
  tipo: "RETIRADA" | "ENTREGA",
  taxa: number,
  status: StatusPedido,
  repasse?: { transacaoId: string; emISO: string },
): PedidoParaEntrega {
  return {
    id: codigo.toLowerCase(),
    codigo,
    clienteNome: `Cliente de ${codigo}`,
    dataEntregaISO,
    status,
    entrega: {
      tipo,
      taxa,
      ...(repasse
        ? {
            repassadoEmISO: repasse.emISO,
            repasseTransacaoId: repasse.transacaoId,
          }
        : {}),
    },
  };
}

// A semana de segunda 31/08 a sábado 05/09/2026, acertada na segunda 07/09.
const SEMANA: PedidoParaEntrega[] = [
  pedidoDeEntrega("P-260831-A1B", "2026-08-31", "ENTREGA", 1200, "ENTREGUE"),
  pedidoDeEntrega("P-260901-C7D", "2026-09-01", "ENTREGA", 1500, "ENTREGUE"),
  pedidoDeEntrega("P-260903-E2F", "2026-09-03", "RETIRADA", 0, "ENTREGUE"),
  pedidoDeEntrega("P-260904-G9H", "2026-09-04", "ENTREGA", 1200, "PRONTO"),
  pedidoDeEntrega("P-260905-J4K", "2026-09-05", "ENTREGA", 2000, "ENTREGUE"),
  pedidoDeEntrega("P-260828-M5N", "2026-08-28", "ENTREGA", 1500, "ENTREGUE", {
    transacaoId: "t-agosto",
    emISO: "2026-08-31",
  }),
];

describe("entregasAPagar", () => {
  it("fecha o caso de aceite: 3 entregas, da mais antiga para a mais nova", () => {
    const entregas = entregasAPagar(SEMANA);

    expect(entregas.map((entrega) => entrega.codigo)).toEqual([
      "P-260831-A1B",
      "P-260901-C7D",
      "P-260905-J4K",
    ]);
    expect(entregas.map((entrega) => entrega.valor)).toEqual([
      1200, 1500, 2000,
    ]);
  });

  it("deixa a retirada de fora: não há entregador para pagar", () => {
    const so = entregasAPagar([
      pedidoDeEntrega("P-1", "2026-09-03", "RETIRADA", 1200, "ENTREGUE"),
    ]);
    expect(so).toEqual([]);
  });

  it("deixa a taxa zero de fora: foi ela quem levou", () => {
    const so = entregasAPagar([
      pedidoDeEntrega("P-2", "2026-09-03", "ENTREGA", 0, "ENTREGUE"),
    ]);
    expect(so).toEqual([]);
  });

  it("deixa de fora o que ainda não foi entregue, e a data não substitui o status", () => {
    const abertos: StatusPedido[] = [
      "ORCAMENTO",
      "CONFIRMADO",
      "EM_PRODUCAO",
      "PRONTO",
      "CANCELADO",
    ];
    for (const status of abertos) {
      expect(
        entregasAPagar([
          pedidoDeEntrega("P-3", "2026-01-01", "ENTREGA", 1200, status),
        ]),
      ).toEqual([]);
    }
  });

  it("deixa de fora a que já foi repassada", () => {
    expect(
      entregasAPagar([
        pedidoDeEntrega("P-4", "2026-08-28", "ENTREGA", 1500, "ENTREGUE", {
          transacaoId: "t-agosto",
          emISO: "2026-08-31",
        }),
      ]),
    ).toEqual([]);
  });

  it("agenda vazia devolve lista vazia", () => {
    expect(entregasAPagar([])).toEqual([]);
  });
});

describe("resumoDoRepasse", () => {
  it("fecha o caso de aceite: R$ 47,00 em 3 entregas, de 31/08 a 05/09", () => {
    expect(resumoDoRepasse(entregasAPagar(SEMANA))).toEqual({
      total: 4700,
      quantidade: 3,
      de: "2026-08-31",
      ate: "2026-09-05",
    });
  });

  it("lista vazia não vira um acerto de R$ 0,00 com período", () => {
    expect(resumoDoRepasse([])).toEqual({
      total: 0,
      quantidade: 0,
      de: undefined,
      ate: undefined,
    });
  });

  it("desmarcar a linha do meio não muda quem são as pontas", () => {
    const [primeira, , ultima] = entregasAPagar(SEMANA);
    expect(resumoDoRepasse([primeira!, ultima!])).toMatchObject({
      total: 3200,
      de: "2026-08-31",
      ate: "2026-09-05",
    });
  });
});

describe("descricaoDoRepasse", () => {
  it("fecha o caso de aceite", () => {
    expect(descricaoDoRepasse(entregasAPagar(SEMANA))).toBe(
      "Entregas · 3 pedidos · 31 de ago. a 05 de set.",
    );
  });

  it("um acerto de um dia só diz o dia uma vez", () => {
    const so = entregasAPagar([
      pedidoDeEntrega("P-5", "2026-09-05", "ENTREGA", 2000, "ENTREGUE"),
    ]);
    expect(descricaoDoRepasse(so)).toBe("Entregas · 1 pedido · 05 de set.");
  });

  it("sem entrega nenhuma, não inventa período", () => {
    expect(descricaoDoRepasse([])).toBe("Entregas");
  });
});

describe("entregasEsquecidas", () => {
  it("conta a entrega vencida que ficou parada antes de ENTREGUE", () => {
    // O P-260904-G9H, que está em PRONTO com a data já passada.
    expect(entregasEsquecidas(SEMANA, "2026-09-07")).toBe(1);
  });

  it("data que ainda não chegou não é esquecimento", () => {
    expect(entregasEsquecidas(SEMANA, "2026-09-04")).toBe(0);
  });

  it("orçamento e cancelado ficam de fora, como em aReceber", () => {
    const agenda = [
      pedidoDeEntrega("P-6", "2026-09-01", "ENTREGA", 1200, "ORCAMENTO"),
      pedidoDeEntrega("P-7", "2026-09-01", "ENTREGA", 1200, "CANCELADO"),
      pedidoDeEntrega("P-8", "2026-09-01", "RETIRADA", 0, "PRONTO"),
    ];
    expect(entregasEsquecidas(agenda, "2026-09-07")).toBe(0);
  });
});

describe("repassesFeitos", () => {
  const AGOSTO = { transacaoId: "t-agosto", emISO: "2026-08-31" };
  const SETEMBRO = { transacaoId: "t-setembro", emISO: "2026-09-07" };

  const AGENDA: PedidoParaEntrega[] = [
    pedidoDeEntrega("P-a", "2026-08-24", "ENTREGA", 1500, "ENTREGUE", AGOSTO),
    pedidoDeEntrega("P-b", "2026-08-31", "ENTREGA", 1200, "ENTREGUE", SETEMBRO),
    pedidoDeEntrega("P-c", "2026-09-01", "ENTREGA", 1500, "ENTREGUE", SETEMBRO),
    pedidoDeEntrega("P-d", "2026-09-05", "ENTREGA", 2000, "ENTREGUE"),
  ];

  it("agrupa pelo lançamento que pagou, do mais recente para o mais antigo", () => {
    expect(repassesFeitos(AGENDA)).toEqual([
      {
        transacaoId: "t-setembro",
        pedidoIds: ["p-b", "p-c"],
        quantidade: 2,
        total: 2700,
        repassadoEmISO: "2026-09-07",
      },
      {
        transacaoId: "t-agosto",
        pedidoIds: ["p-a"],
        quantidade: 1,
        total: 1500,
        repassadoEmISO: "2026-08-31",
      },
    ]);
  });

  it("o que ainda não foi acertado não aparece", () => {
    expect(repassesFeitos([AGENDA[3]!])).toEqual([]);
  });
});
