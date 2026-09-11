import { describe, expect, it } from "vitest";
import { formatarMoeda } from "@/lib/domain/money";
import {
  linkDoWhatsApp,
  mensagemDoPedido,
  telefoneParaWhatsApp,
  type ResumoParaCliente,
} from "@/lib/domain/whatsapp";

/**
 * `formatarMoeda` devolve 'R$ 138,00' com espaço fino não-quebrável entre o
 * símbolo e o número, porque é o que o `Intl` em pt-BR produz. A expectativa é
 * montada com ela, e nunca digitada aqui: um literal com espaço comum falha e o
 * diff mostra duas strings visualmente idênticas.
 */
const dinheiro = formatarMoeda;

// O mesmo pedido da spec 003, número por número.
const PEDIDO: ResumoParaCliente = {
  negocio: "MyCookie's",
  codigo: "P-260915-K3F",
  clienteNome: "Ana",
  itens: [
    { quantidade: 20, nomeSnapshot: "Cookie tradicional", precoUnitario: 690 },
    { quantidade: 2, nomeSnapshot: "Caixa com 6", precoUnitario: 4990 },
  ],
  subtotal: 23780,
  desconto: 780,
  taxaEntrega: 1000,
  total: 24000,
  entrega: {
    tipo: "ENTREGA",
    dataISO: "2026-09-15",
    endereco: "Rua das Acácias, 120",
  },
  formaNome: "Cartão de crédito",
  pago: false,
};

// ---------------------------------------------------------------------------
// O caso de aceite: a string inteira, e não pedaços dela.
// ---------------------------------------------------------------------------

describe("mensagemDoPedido", () => {
  it("escreve o resumo do caso de aceite, palavra por palavra", () => {
    expect(mensagemDoPedido(PEDIDO)).toBe(
      [
        "*MyCookie's* · pedido P-260915-K3F",
        "",
        "Oi, Ana! Fechamos assim:",
        "",
        `• 20 × Cookie tradicional — ${dinheiro(13800)}`,
        `• 2 × Caixa com 6 — ${dinheiro(9980)}`,
        "",
        `Subtotal: ${dinheiro(23780)}`,
        `Desconto: −${dinheiro(780)}`,
        `Entrega: ${dinheiro(1000)}`,
        `*Total: ${dinheiro(24000)}*`,
        "",
        "Entrega em terça-feira, 15 de setembro — Rua das Acácias, 120",
        "Pagamento: Cartão de crédito",
        "",
        "Qualquer ajuste é só me chamar.",
      ].join("\n"),
    );
  });

  it("some com desconto e entrega quando são zero, e mantém o subtotal", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      desconto: 0,
      taxaEntrega: 0,
      total: 23780,
    });

    expect(texto).not.toContain("Desconto:");
    expect(texto).not.toContain("Entrega:");
    expect(texto).toContain(`Subtotal: ${dinheiro(23780)}`);
    expect(texto).toContain(`*Total: ${dinheiro(23780)}*`);
  });

  it("troca o verbo na retirada e não diz o endereço, mesmo havendo um", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      entrega: {
        tipo: "RETIRADA",
        dataISO: "2026-09-15",
        endereco: "Rua das Acácias, 120",
      },
    });

    expect(texto).toContain("Retirada em terça-feira, 15 de setembro");
    expect(texto).not.toContain("Acácias");
    expect(texto).not.toContain("Entrega em");
  });

  it("não diz o endereço quando a entrega não tem um", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      entrega: { tipo: "ENTREGA", dataISO: "2026-09-15" },
    });

    expect(texto).toContain("Entrega em terça-feira, 15 de setembro\n");
    expect(texto).not.toContain("—\n");
  });

  it("some com a linha de pagamento quando não há forma escolhida", () => {
    const semForma = { ...PEDIDO, formaNome: undefined };
    const texto = mensagemDoPedido(semForma);

    expect(texto).not.toContain("Pagamento:");
    // E nada mais muda: é a mensagem inteira menos uma linha.
    expect(texto).toBe(
      mensagemDoPedido(PEDIDO).replace("\nPagamento: Cartão de crédito", ""),
    );
  });

  it("acrescenta a linha do pago e mantém a da forma", () => {
    const texto = mensagemDoPedido({ ...PEDIDO, pago: true });

    expect(texto).toContain(
      "Pagamento: Cartão de crédito\nJá está pago. Obrigada!",
    );
    expect(texto).toBe(
      mensagemDoPedido(PEDIDO).replace(
        "Pagamento: Cartão de crédito",
        "Pagamento: Cartão de crédito\nJá está pago. Obrigada!",
      ),
    );
  });

  const PIX =
    "Beneficiário: Maria da Silva\nBanco Tal\nChave Pix: (11) 90000-0000";

  it("põe os dados para pagar em bloco próprio, entre o combinado e a despedida", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      formaNome: "Pix",
      formaInstrucoes: PIX,
    });

    expect(texto).toContain(
      `Pagamento: Pix\n\n${PIX}\n\nQualquer ajuste é só me chamar.`,
    );
  });

  it("esconde os dados para pagar quando já está pago", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      formaNome: "Pix",
      formaInstrucoes: PIX,
      pago: true,
    });

    expect(texto).not.toContain("Chave Pix");
    expect(texto).toContain("Já está pago. Obrigada!");
  });

  it("sem dados para pagar, a mensagem é a mesma de sempre", () => {
    expect(mensagemDoPedido({ ...PEDIDO, formaInstrucoes: "  " })).toBe(
      mensagemDoPedido(PEDIDO),
    );
  });

  it("diz a escolha do combo entre parênteses, e o subtotal é o do combo", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      itens: [
        {
          quantidade: 3,
          nomeSnapshot: "Combo dupla",
          precoUnitario: 1200,
          escolhas: [
            { quantidade: 1, nomeSnapshot: "Cookie tradicional" },
            { quantidade: 1, nomeSnapshot: "Cookie de nutella" },
          ],
        },
      ],
    });

    expect(texto).toContain(
      `• 3 × Combo dupla (1 Cookie tradicional + 1 Cookie de nutella) — ${dinheiro(3600)}`,
    );
  });

  it("escreve quantidade fracionada com vírgula", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      itens: [
        { quantidade: 1.5, nomeSnapshot: "Bolo de pote", precoUnitario: 2000 },
      ],
    });

    expect(texto).toContain(`• 1,5 × Bolo de pote — ${dinheiro(3000)}`);
  });

  it("cumprimenta pelo primeiro nome", () => {
    expect(
      mensagemDoPedido({ ...PEDIDO, clienteNome: "Ana Beatriz" }),
    ).toContain("Oi, Ana! Fechamos assim:");
  });

  it("cumprimenta sem nome quando não há nome", () => {
    expect(mensagemDoPedido({ ...PEDIDO, clienteNome: "  " })).toContain(
      "Oi! Fechamos assim:",
    );
  });

  it("tem dois negritos, e só dois", () => {
    expect(mensagemDoPedido(PEDIDO).match(/\*/g)).toHaveLength(4);
  });

  it("sem nome de negócio, a primeira linha é só o pedido", () => {
    const texto = mensagemDoPedido({ ...PEDIDO, negocio: "" });

    expect(texto.startsWith("Pedido P-260915-K3F\n")).toBe(true);
    expect(texto.match(/\*/g)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// A normalização do telefone: uma regra, um caso.
// ---------------------------------------------------------------------------

describe("telefoneParaWhatsApp", () => {
  it.each([
    ["(11) 90000-0000", "5511900000000", "celular com DDD"],
    ["11 3000-0000", "551130000000", "fixo com DDD"],
    ["011 90000-0000", "5511900000000", "zero de operadora sai"],
    ["+55 (11) 90000-0000", "5511900000000", "já veio com DDI"],
    ["90000-0000", null, "sem DDD não dá para discar"],
    ["", null, "não há número"],
  ])("%s → %s (%s)", (entrada, esperado, regra) => {
    expect(telefoneParaWhatsApp(entrada), regra).toBe(esperado);
  });

  it("não confunde o DDD 55 com o DDI 55", () => {
    expect(telefoneParaWhatsApp("(55) 3000-0000")).toBe("555530000000");
  });

  it("devolve null quando o campo nem existe", () => {
    expect(telefoneParaWhatsApp()).toBeNull();
  });
});

describe("linkDoWhatsApp", () => {
  it("põe o telefone no caminho e o texto na consulta", () => {
    expect(linkDoWhatsApp("5511900000000", "Oi, Ana!")).toBe(
      "https://wa.me/5511900000000?text=Oi%2C%20Ana!",
    );
  });

  it("sem telefone, deixa o WhatsApp perguntar para quem", () => {
    expect(linkDoWhatsApp(null, "Oi!")).toBe("https://wa.me/?text=Oi!");
    expect(linkDoWhatsApp(undefined, "Oi!")).toBe("https://wa.me/?text=Oi!");
  });

  it("faz a quebra de linha viajar como %0A", () => {
    expect(linkDoWhatsApp(null, "uma\noutra")).toContain("uma%0Aoutra");
  });
});
