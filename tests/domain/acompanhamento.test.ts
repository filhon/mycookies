import { describe, expect, it } from "vitest";
import {
  acaoDaVez,
  acompanhamentoDoPedido,
  caminhoDoAcompanhamento,
  chavePublicaDe,
  podeAprovar,
  quandoDoPedido,
  type FichaAcompanhada,
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

/** As fichas vivas: a foto e a descrição de cada linha (`#d357`). */
const FICHAS: FichaAcompanhada[] = [
  {
    id: "tradicional",
    arquivado: false,
    fotoUrl: "data:image/jpeg;base64,TRAD",
    descricao: " Massa amanteigada ",
  },
  { id: "dupla", arquivado: false },
  { id: "nutella", arquivado: false, fotoUrl: "data:image/jpeg;base64,NUT" },
];

const acompanhar = (mudancas: Partial<Pedido> = {}, formas = [PIX, CARTAO]) =>
  acompanhamentoDoPedido(
    pedido(mudancas),
    {
      ...NEGOCIO,
      logo: "data:image/png;base64,LOGO",
      condicoes: "  Sinal de 50%.\nCancelamento até 3 dias antes.  ",
    },
    formas,
    HOJE,
    FICHAS,
  );

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
        "naAgenda",
        "negocio",
        "pago",
        "passos",
        "pix",
        "podeAprovar",
        "quando",
        "sinal",
        "situacao",
        "subtotal",
        "taxaEntrega",
        "total",
      ].sort(),
    );
    expect(Object.keys(visto.negocio).sort()).toEqual([
      "condicoes",
      "logo",
      "nome",
      "quem",
      "whatsapp",
    ]);
    expect(Object.keys(visto.entrega).sort()).toEqual(["endereco", "tipo"]);
    expect(Object.keys(visto.itens[0]!).sort()).toEqual([
      "descricao",
      "fotoUrl",
      "nome",
      "quantidade",
      "subtotal",
    ]);
    expect(Object.keys(visto.itens[1]!).sort()).toEqual([
      "fotoUrl",
      "nome",
      "quantidade",
      "subtotal",
    ]);
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

  it("onde se retira: só no pedido de retirada (spec 172)", () => {
    const negocio = {
      ...NEGOCIO,
      retirada: { endereco: " Rua das Flores, 120 ", horario: "  " },
    };
    const naRetirada = acompanhamentoDoPedido(
      pedido({ entrega: { tipo: "RETIRADA", taxa: 0 } }),
      negocio,
      [],
      HOJE,
    );
    expect(naRetirada.retirada).toEqual({ endereco: "Rua das Flores, 120" });
    expect(
      acompanhamentoDoPedido(
        pedido({ entrega: { tipo: "RETIRADA", taxa: 0 } }),
        { ...NEGOCIO, retirada: { endereco: "Rua X", horario: "Sáb, 14h" } },
        [],
        HOJE,
      ).retirada,
    ).toEqual({ endereco: "Rua X", horario: "Sáb, 14h" });
    const naEntrega = acompanhamentoDoPedido(pedido(), negocio, [], HOJE);
    expect(Object.keys(naEntrega)).not.toContain("retirada");
    expect(JSON.stringify(naEntrega)).not.toContain("Flores");
  });

  it("vai para a agenda só com o dia por vir (spec 172)", () => {
    expect(acompanhar().naAgenda).toBe(true);
    expect(acompanhar({ dataEntregaISO: HOJE }).naAgenda).toBe(true);
    expect(acompanhar({ dataEntregaISO: "2026-10-09" }).naAgenda).toBe(false);
    for (const status of ["ORCAMENTO", "CANCELADO", "ENTREGUE"] as const) {
      expect(acompanhar({ status }).naAgenda).toBe(false);
    }
  });

  it("a linha e o negócio como na folha (`#d357`)", () => {
    const visto = acompanhar();
    expect(visto.itens[0]).toMatchObject({
      descricao: "Massa amanteigada",
      fotoUrl: "data:image/jpeg;base64,TRAD",
    });
    // O combo sem foto própria leva a da primeira escolha com foto.
    expect(visto.itens[1]!.fotoUrl).toBe("data:image/jpeg;base64,NUT");
    expect(visto.negocio.condicoes).toBe(
      "Sinal de 50%.\nCancelamento até 3 dias antes.",
    );
    expect(visto.negocio.logo).toBe("data:image/png;base64,LOGO");
  });

  it("ficha arquivada ou ausente: a linha sem foto e sem descrição", () => {
    const visto = acompanhamentoDoPedido(
      pedido(),
      NEGOCIO,
      [],
      HOJE,
      FICHAS.map((ficha) => ({ ...ficha, arquivado: true })),
    );
    for (const item of visto.itens) {
      expect(Object.keys(item).sort()).toEqual([
        "nome",
        "quantidade",
        "subtotal",
      ]);
    }
  });

  it("o orçamento: para quem, e o telefone continua fora", () => {
    const visto = acompanhar({ status: "ORCAMENTO" });
    expect(visto.para).toBe("Ana Beatriz");
    const tudo = JSON.stringify(visto);
    for (const proibido of ["99999-0000", "cliente-1", "segredo"]) {
      expect(tudo).not.toContain(proibido);
    }
  });

  it("o orçamento: a frase, sem trilha, taxa a combinar, validade", () => {
    const visto = acompanhar({
      status: "ORCAMENTO",
      entrega: { tipo: "ENTREGA", taxa: 0, endereco: "Rua A" },
      validoAteISO: "2026-10-12",
    });
    expect(visto.situacao).toBe("A Maynara vai confirmar");
    expect(visto.passos).toEqual([]);
    expect(visto.quando).toBe("Entrega quinta-feira, às 15h");
    expect(visto.taxaEntrega).toBeNull();
    expect(visto.validoAte).toBe("segunda-feira, 12 de outubro");
    expect(visto.pix).toBeUndefined();
  });

  it("vencido: a frase do preço novo, sem validade", () => {
    const visto = acompanhar({
      status: "ORCAMENTO",
      validoAteISO: "2026-10-09",
    });
    expect(visto.validoAte).toBeUndefined();
    expect(visto.situacao).toBe(
      "Este orçamento venceu em 9 de outubro de 2026. Fale com a Maynara para um preço novo.",
    );
  });

  it("vencido não tem o botão", () => {
    expect(
      acompanhar({ status: "ORCAMENTO", validoAteISO: "2026-10-09" })
        .podeAprovar,
    ).toBe(false);
    expect(acompanhar({ status: "ORCAMENTO" }).podeAprovar).toBe(true);
    expect(acompanhar().podeAprovar).toBe(false);
  });

  it("aprovado: quem e quando, sem botão e sem validade (`#d358`)", () => {
    const visto = acompanhar({
      status: "ORCAMENTO",
      // Vencido depois de aprovado: a aprovação vale mais.
      validoAteISO: "2026-10-09",
      aprovacao: {
        nome: "Ana Souza",
        // 23h de Brasília do dia 8 já é dia 9 em UTC.
        em: { toMillis: () => Date.parse("2026-10-08T23:30:00-03:00") },
      } as Pedido["aprovacao"],
    });
    expect(visto.situacao).toBe(
      "Aprovado por Ana Souza em 8 de outubro. A Maynara vai confirmar a data.",
    );
    expect(visto.podeAprovar).toBe(false);
    expect(visto.validoAte).toBeUndefined();
  });

  it("aprovado e confirmado: a trilha de sempre", () => {
    const visto = acompanhar({
      aprovacao: {
        nome: "Ana Souza",
        em: { toMillis: () => 0 },
      } as Pedido["aprovacao"],
    });
    expect(visto.situacao).toBe("Confirmado");
  });

  it("vence hoje ainda vale", () => {
    const visto = acompanhar({ status: "ORCAMENTO", validoAteISO: HOJE });
    expect(visto.situacao).toBe("A Maynara vai confirmar");
    expect(visto.validoAte).toBe("sábado, 10 de outubro");
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
    expect(visto.quando).toBeUndefined();
  });

  it("entregue não diz quando; pronto de anteontem diz, por extenso", () => {
    expect(acompanhar({ status: "ENTREGUE" }).quando).toBeUndefined();
    expect(
      acompanhar({
        status: "PRONTO",
        dataEntregaISO: "2026-10-08",
        entrega: { tipo: "RETIRADA", taxa: 0 },
      }).quando,
    ).toBe("Retirada em quinta-feira, 8 de outubro, às 15h");
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

describe("quandoDoPedido (spec 171)", () => {
  it.each<[string, string | undefined, string]>([
    ["2026-10-10", "15:00", "Retirada hoje, às 15h"],
    ["2026-10-11", "09:30", "Retirada amanhã, às 9h30"],
    ["2026-10-16", "15:00", "Retirada sexta-feira, às 15h"],
    ["2026-10-17", undefined, "Retirada em 17 de outubro"],
    ["2026-11-03", "15:00", "Retirada em 3 de novembro, às 15h"],
    ["2027-01-05", undefined, "Retirada em 5 de janeiro de 2027"],
    ["2026-10-09", undefined, "Retirada em sexta-feira, 9 de outubro"],
  ])("%s %s", (dia, hora, esperado) => {
    expect(quandoDoPedido("RETIRADA", dia, hora, HOJE)).toBe(esperado);
  });

  it("a palavra da entrega", () => {
    expect(quandoDoPedido("ENTREGA", "2026-10-11", "10:00", HOJE)).toBe(
      "Entrega amanhã, às 10h",
    );
  });
});

describe("acaoDaVez (spec 171)", () => {
  it("aprovar, pagar ou falar", () => {
    expect(acaoDaVez({ podeAprovar: true })).toBe("aprovar");
    expect(acaoDaVez({ podeAprovar: false, pix: "000201" })).toBe("pagar");
    expect(acaoDaVez({ podeAprovar: false })).toBe("falar");
  });
});

describe("podeAprovar (spec 149, `#d358`)", () => {
  const orcamento = { status: "ORCAMENTO" as StatusPedido };

  it("os quatro nãos", () => {
    expect(podeAprovar({ status: "CONFIRMADO" }, HOJE)).toBe(false);
    expect(podeAprovar({ status: "CANCELADO" }, HOJE)).toBe(false);
    expect(
      podeAprovar({ ...orcamento, validoAteISO: "2026-10-09" }, HOJE),
    ).toBe(false);
    expect(
      podeAprovar({ ...orcamento, aprovacao: { nome: "Ana" } }, HOJE),
    ).toBe(false);
  });

  it("o sim: dentro da validade, vence hoje ou sem validade", () => {
    expect(
      podeAprovar({ ...orcamento, validoAteISO: "2026-10-17" }, HOJE),
    ).toBe(true);
    expect(podeAprovar({ ...orcamento, validoAteISO: HOJE }, HOJE)).toBe(true);
    expect(podeAprovar(orcamento, HOJE)).toBe(true);
  });
});
