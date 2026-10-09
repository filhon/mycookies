import { describe, expect, it } from "vitest";
import { formatarMoeda } from "@/lib/domain/money";
import { brCodePix } from "@/lib/domain/pix";
import {
  linkDoWhatsApp,
  mensagemDeCobranca,
  mensagemDeVolta,
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

  it("diz a hora depois do dia, quando foi combinada", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      entrega: { ...PEDIDO.entrega, hora: "14:30" },
    });

    expect(texto).toContain(
      "Entrega em terça-feira, 15 de setembro, às 14:30 — Rua das Acácias, 120",
    );
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

  const DADOS_PIX = {
    chave: "+5581996796370",
    nome: "Maynara Honório",
    cidade: "Recife",
  };

  it("com o Pix da forma, leva o copia e cola com o total no lugar das instruções", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      formaNome: "Pix",
      formaInstrucoes: PIX,
      formaPix: DADOS_PIX,
    });
    const codigo = brCodePix({
      ...DADOS_PIX,
      valor: 24000,
      identificador: "P-260915-K3F",
    });

    expect(texto).not.toContain("Chave Pix");
    expect(texto).toContain(
      `Pagamento: Pix\n\nPix copia e cola (já com o valor):\n${codigo}\n\nQualquer ajuste é só me chamar.`,
    );
    expect(codigo).toContain("5406240.00");
    expect(codigo).toContain("0510P260915K3F");
  });

  it("não leva o Pix quando já está pago", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      formaPix: DADOS_PIX,
      pago: true,
    });

    expect(texto).not.toContain("copia e cola");
    expect(texto).not.toContain("br.gov.bcb.pix");
  });

  it("com sinal, diz o que entrou e o que falta, e o Pix é do que falta", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      formaPix: DADOS_PIX,
      sinal: 12000,
    });

    expect(texto).toContain(
      `Pagamento: Cartão de crédito
Sinal recebido: ${dinheiro(12000)}. Falta: ${dinheiro(12000)}.`,
    );
    expect(texto).toContain("5406120.00");
    expect(
      mensagemDoPedido({ ...PEDIDO, sinal: 12000, pago: true }),
    ).not.toContain("Sinal recebido");
  });

  it("diz a nota do item entre parênteses, depois do nome", () => {
    const texto = mensagemDoPedido({
      ...PEDIDO,
      itens: [
        {
          quantidade: 1,
          nomeSnapshot: "Bolo de chocolate",
          precoUnitario: 9000,
          observacao: "Feliz 30 anos",
        },
      ],
    });

    expect(texto).toContain(
      `• 1 × Bolo de chocolate (Feliz 30 anos) — ${dinheiro(9000)}`,
    );
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

describe("mensagemDeCobranca", () => {
  it("lembra o dia da entrega e o valor, pelo primeiro nome", () => {
    expect(
      mensagemDeCobranca({
        clienteNome: "Ana Beatriz",
        dataEntregaISO: "2026-09-27",
        total: 1300,
      }),
    ).toBe(
      `Oi, Ana! Passando pra lembrar do pedido de 27/9, ${dinheiro(1300)}. Obrigada!`,
    );
  });

  it("com sinal, cobra o que falta", () => {
    expect(
      mensagemDeCobranca({
        clienteNome: "Ana",
        dataEntregaISO: "2026-09-27",
        total: 10000,
        sinal: { valor: 5000 },
      }),
    ).toBe(
      `Oi, Ana! Passando pra lembrar do pedido de 27/9: o sinal de ${dinheiro(5000)} já entrou, faltam ${dinheiro(5000)}. Obrigada!`,
    );
  });

  it("escreve o dia e o mês sem zero à esquerda", () => {
    expect(
      mensagemDeCobranca({
        clienteNome: "Ana",
        dataEntregaISO: "2026-10-05",
        total: 500,
      }),
    ).toContain("pedido de 5/10,");
  });

  it("sem nome, cumprimenta sem vírgula sobrando", () => {
    expect(
      mensagemDeCobranca({
        clienteNome: "  ",
        dataEntregaISO: "2026-09-27",
        total: 500,
      }),
    ).toMatch(/^Oi! Passando/);
  });
});

describe("mensagemDeVolta", () => {
  it("chama pelo primeiro nome, diz o negócio e não oferece desconto", () => {
    expect(
      mensagemDeVolta({ primeiroNome: "Keila", negocio: "MyCookie's" }),
    ).toBe(
      "Oi, Keila! Aqui é da MyCookie's. Faz um tempinho que você não pede, e eu queria saber se ficou tudo certo com o último. Essa semana tem fornada, quer que eu separe um pra você?",
    );
  });

  it("com o produto, diz qual foi o último", () => {
    expect(
      mensagemDeVolta({
        primeiroNome: "Keila",
        negocio: "MyCookie's",
        produto: "Cookie Red Velvet",
      }),
    ).toContain("com o último Cookie Red Velvet. Essa semana");
  });

  it("sem nome e sem negócio, nada sobrando", () => {
    expect(mensagemDeVolta({ primeiroNome: "", negocio: "" })).toMatch(
      /^Oi! Faz um tempinho/,
    );
  });
});
