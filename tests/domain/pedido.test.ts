import { describe, expect, it } from "vitest";
import {
  agruparPorEntrega,
  codigoDoPedido,
  custoDoItem,
  derivarPedido,
  ehConcluido,
  ofereceOPrecoDeHoje,
  podeIrPara,
  resumoDosItens,
  subtotalDoItem,
  transicoesPermitidas,
  type ItemParaPedido,
} from "@/lib/domain/pedido";
import type { FormaPagamento, StatusPedido } from "@/lib/types";

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
});
