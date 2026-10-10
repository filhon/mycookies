import { describe, expect, it } from "vitest";
import {
  acompanhamentoDoPedido,
  caminhoDoAcompanhamento,
  chavePublicaDe,
} from "@/lib/domain/acompanhamento";
import { brCodePix } from "@/lib/domain/pix";
import type { FormaPagamento, Pedido, StatusPedido } from "@/lib/types";

// Spec 117, `DECISOES.md#d320`.

const PIX: FormaPagamento = {
  id: "pix",
  nome: "Pix",
  tipo: "PIX",
  taxaPercentual: 0,
  taxaFixa: 0,
  prazoRecebimentoDias: 0,
  ativo: true,
  instrucoes: "Chave: maynara@exemplo.com",
  pix: { chave: "maynara@exemplo.com", nome: "Maynara", cidade: "Recife" },
};

const CARTAO: FormaPagamento = {
  ...PIX,
  id: "cartao",
  nome: "Cartão de crédito",
  tipo: "CREDITO",
  taxaPercentual: 4.99,
  pix: undefined,
};

const NEGOCIO = {
  nome: "MyCookie's",
  quem: "Maynara",
  whatsapp: "5581999990000",
};
const HOJE = "2026-10-10";

/** Um pedido com tudo o que não pode sair: custo, lucro, taxa, anotação, telefone. */
function pedido(mudancas: Partial<Pedido> = {}): Pedido {
  return {
    id: "abc",
    v: 1,
    criadoEm: null as never,
    atualizadoEm: null as never,
    arquivado: false,
    codigo: "P-261010-K3F",
    clienteId: "cliente-1",
    clienteNome: "Ana Beatriz",
    clienteTelefone: "(81) 99999-0000",
    itens: [
      {
        fichaTecnicaId: "tradicional",
        nomeSnapshot: "Cookie tradicional",
        quantidade: 10,
        precoUnitario: 1000,
        custoUnitarioSnapshot: 400,
        subtotal: 10000,
        observacao: "sem castanha",
      },
      {
        fichaTecnicaId: "dupla",
        nomeSnapshot: "Dupla",
        quantidade: 1,
        precoUnitario: 1200,
        custoUnitarioSnapshot: 500,
        subtotal: 1200,
        escolhas: [
          {
            fichaTecnicaId: "nutella",
            nomeSnapshot: "Nutella",
            quantidade: 2,
            custoUnitarioSnapshot: 250,
          },
        ],
      },
    ],
    fichaIds: ["tradicional", "dupla", "nutella"],
    status: "CONFIRMADO",
    dataEntrega: null as never,
    dataEntregaISO: "2026-10-15",
    competencia: "2026-10",
    horaEntrega: "15:00",
    entrega: { tipo: "ENTREGA", taxa: 800, endereco: "Rua das Acácias, 120" },
    subtotal: 11200,
    desconto: 0,
    total: 12000,
    formaPagamentoId: "pix",
    custoTaxaPagamento: 0,
    custoTotalEstimado: 4500,
    lucroEstimado: 7500,
    pago: false,
    observacoes: "cliente chata, cobrar antes",
    chavePublica: "segredo",
    ...mudancas,
  };
}

const acompanhar = (mudancas: Partial<Pedido> = {}, formas = [PIX, CARTAO]) =>
  acompanhamentoDoPedido(pedido(mudancas), NEGOCIO, formas, HOJE);

describe("chavePublicaDe", () => {
  it("16 bytes viram 22 caracteres base64url", () => {
    const chave = chavePublicaDe(new Uint8Array(16).fill(255));
    expect(chave).toHaveLength(22);
    expect(chave).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(chave).toBe("_____________________w");
  });
});

describe("caminhoDoAcompanhamento", () => {
  it("o endereço, o pedido e a chave na rota", () => {
    expect(caminhoDoAcompanhamento("mycookies", "abc", "x_Y-z")).toBe(
      "/c/mycookies/pedido/abc/x_Y-z",
    );
  });
});

describe("acompanhamentoDoPedido", () => {
  it("as chaves: nada além da lista sai", () => {
    const visto = acompanhar({ sinal: { valor: 6000 } as Pedido["sinal"] });
    expect(Object.keys(visto).sort()).toEqual(
      [
        "codigo",
        "desconto",
        "dia",
        "entrega",
        "falta",
        "hora",
        "itens",
        "negocio",
        "pago",
        "passos",
        "pix",
        "sinal",
        "situacao",
        "subtotal",
        "taxaEntrega",
        "total",
      ].sort(),
    );
    expect(Object.keys(visto.negocio).sort()).toEqual([
      "nome",
      "quem",
      "whatsapp",
    ]);
    expect(Object.keys(visto.entrega).sort()).toEqual(["endereco", "tipo"]);
    for (const item of visto.itens) {
      expect(Object.keys(item).sort()).toEqual([
        "nome",
        "quantidade",
        "subtotal",
      ]);
    }
    const tudo = JSON.stringify(visto);
    for (const proibido of [
      "sem castanha",
      "cliente chata",
      "Ana",
      "99999-0000",
      "cliente-1",
      "segredo",
      "Cartão",
      "Chave:",
      "4500",
      "7500",
    ]) {
      expect(tudo).not.toContain(proibido);
    }
  });

  it("o orçamento: a frase, sem passo feito, taxa a combinar, validade", () => {
    const visto = acompanhar({
      status: "ORCAMENTO",
      entrega: { tipo: "ENTREGA", taxa: 0, endereco: "Rua A" },
      validoAteISO: "2026-10-12",
    });
    expect(visto.situacao).toBe("A Maynara vai confirmar");
    expect(visto.passos.some((p) => p.feito || p.atual)).toBe(false);
    expect(visto.taxaEntrega).toBeNull();
    expect(visto.validoAte).toBe("segunda-feira, 12 de outubro");
    expect(visto.pix).toBeUndefined();
  });

  it("a validade vencida não aparece", () => {
    expect(
      acompanhar({ status: "ORCAMENTO", validoAteISO: "2026-10-09" }).validoAte,
    ).toBeUndefined();
  });

  it.each<[StatusPedido, string, string, number]>([
    ["CONFIRMADO", "Confirmado", "Confirmado", 0],
    ["EM_PRODUCAO", "Sendo feito", "Sendo feito", 1],
    ["PRONTO", "Pronto para retirar", "Pronto, sai para entrega", 2],
    ["ENTREGUE", "Retirado", "Entregue", 3],
  ])("%s: retirada e entrega", (status, retirada, entrega, indice) => {
    const r = acompanhar({ status, entrega: { tipo: "RETIRADA", taxa: 0 } });
    expect(r.situacao).toBe(retirada);
    expect(r.passos.findIndex((p) => p.atual)).toBe(indice);
    expect(r.passos.filter((p) => p.feito)).toHaveLength(indice);
    expect(r.entrega).toEqual({ tipo: "RETIRADA" });
    expect(r.taxaEntrega).toBe(0);
    expect(acompanhar({ status }).situacao).toBe(entrega);
  });

  it("cancelado sai da trilha", () => {
    const visto = acompanhar({ status: "CANCELADO" });
    expect(visto.situacao).toBe(
      "Este pedido foi cancelado. Fale com a Maynara se tiver dúvida.",
    );
    expect(visto.passos).toEqual([]);
    expect(visto.pix).toBeUndefined();
  });

  it("o Pix do que falta, com o código do pedido", () => {
    expect(acompanhar().pix).toBe(
      brCodePix({ ...PIX.pix!, valor: 12000, identificador: "P-261010-K3F" }),
    );
  });

  it("com sinal: o sinal, o que falta e o Pix disso", () => {
    const visto = acompanhar({ sinal: { valor: 6000 } as Pedido["sinal"] });
    expect(visto.sinal).toBe(6000);
    expect(visto.falta).toBe(6000);
    expect(visto.pix).toBe(
      brCodePix({ ...PIX.pix!, valor: 6000, identificador: "P-261010-K3F" }),
    );
  });

  it("pago: nada a pagar, nem sinal, nem Pix", () => {
    const visto = acompanhar({
      pago: true,
      sinal: { valor: 6000 } as Pedido["sinal"],
    });
    expect(visto.falta).toBe(0);
    expect(visto.sinal).toBeUndefined();
    expect(visto.pix).toBeUndefined();
  });

  it("sem Pix: forma que não é Pix, Pix sem os dados, sem forma", () => {
    expect(acompanhar({ formaPagamentoId: "cartao" }).pix).toBeUndefined();
    expect(
      acompanhar({}, [
        { ...PIX, pix: { chave: "x", nome: "", cidade: "Recife" } },
      ]).pix,
    ).toBeUndefined();
    expect(acompanhar({ formaPagamentoId: undefined }).pix).toBeUndefined();
  });

  it("sem o primeiro nome, o nome da loja; sem WhatsApp, sem a chave", () => {
    const visto = acompanhamentoDoPedido(
      pedido({ status: "ORCAMENTO" }),
      { nome: "MyCookie's", quem: "" },
      [],
      HOJE,
    );
    expect(visto.situacao).toBe("A MyCookie's vai confirmar");
    expect(Object.keys(visto.negocio).sort()).toEqual(["nome", "quem"]);
  });
});
