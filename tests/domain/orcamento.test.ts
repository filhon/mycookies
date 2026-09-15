import { describe, expect, it } from "vitest";
import {
  DIAS_DE_VALIDADE,
  frasesDoCombinado,
  montarOrcamento,
  situacaoDaValidade,
  validadeSugerida,
  type ConfiguracaoParaOrcar,
  type FichaParaOrcar,
  type PedidoParaOrcar,
} from "@/lib/domain/orcamento";
import type { FormaPagamento } from "@/lib/types";

const HOJE = "2026-09-15";

function forma(id: string, nome: string, instrucoes?: string): FormaPagamento {
  return {
    id,
    nome,
    tipo: "PIX",
    taxaPercentual: 0,
    taxaFixa: 0,
    prazoRecebimentoDias: 0,
    ativo: true,
    ...(instrucoes ? { instrucoes } : {}),
  };
}

function ficha(
  id: string,
  unidadeRendimento: FichaParaOrcar["unidadeRendimento"] = "un",
): FichaParaOrcar {
  return { id, unidadeRendimento };
}

// O pedido da Tal Eventos Ltda., número por número.
const PEDIDO: PedidoParaOrcar = {
  codigo: "P-260915-K3F",
  clienteNome: "Tal Eventos Ltda.",
  itens: [
    {
      fichaTecnicaId: "tradicional",
      nomeSnapshot: "Cookie Tradicional",
      quantidade: 50,
      precoUnitario: 1000,
      custoUnitarioSnapshot: 400,
      subtotal: 50000,
    },
    {
      fichaTecnicaId: "red-velvet",
      nomeSnapshot: "Cookie Red Velvet",
      quantidade: 30,
      precoUnitario: 1300,
      custoUnitarioSnapshot: 500,
      subtotal: 39000,
    },
    {
      fichaTecnicaId: "pistachio",
      nomeSnapshot: "Cookie Pistachio",
      quantidade: 20,
      precoUnitario: 1500,
      custoUnitarioSnapshot: 600,
      subtotal: 30000,
    },
  ],
  subtotal: 119000,
  desconto: 9000,
  total: 114000,
  dataEntregaISO: "2026-09-30",
  entrega: { tipo: "ENTREGA", taxa: 4000, endereco: "Av. Boa Viagem, 1200" },
  formaPagamentoId: "pix",
  validoAteISO: "2026-09-22",
};

const FICHAS = [ficha("tradicional"), ficha("red-velvet"), ficha("pistachio")];

const CONTA = { nome: "MyCookie's", proprietaria: "Maynara" };

const CONFIGURACAO: ConfiguracaoParaOrcar = {
  nomeNegocio: "MyCookie's",
  formasPagamento: [forma("pix", "Pix", "Chave: 81 98696-6176 (Maynara)")],
};

function montar(
  pedido: PedidoParaOrcar = PEDIDO,
  extras: Partial<Parameters<typeof montarOrcamento>[0]> = {},
) {
  return montarOrcamento({
    pedido,
    fichas: FICHAS,
    conta: CONTA,
    configuracao: CONFIGURACAO,
    hojeISO: HOJE,
    ...extras,
  });
}

// ---------------------------------------------------------------------------
// O caso de aceite
// ---------------------------------------------------------------------------

describe("montarOrcamento", () => {
  it("monta o pedido da Tal Eventos número por número", () => {
    const orcamento = montar();

    expect(orcamento.codigo).toBe("P-260915-K3F");
    expect(orcamento.empresa).toBe("Tal Eventos Ltda.");
    expect(orcamento.emitidoEmISO).toBe(HOJE);
    expect(orcamento.validoAteISO).toBe("2026-09-22");
    expect(orcamento.negocio).toEqual({
      nome: "MyCookie's",
      proprietaria: "Maynara",
    });

    expect(orcamento.linhas).toEqual([
      {
        nome: "Cookie Tradicional",
        quantidade: 50,
        unidade: "un",
        precoUnitario: 1000,
        subtotal: 50000,
      },
      {
        nome: "Cookie Red Velvet",
        quantidade: 30,
        unidade: "un",
        precoUnitario: 1300,
        subtotal: 39000,
      },
      {
        nome: "Cookie Pistachio",
        quantidade: 20,
        unidade: "un",
        precoUnitario: 1500,
        subtotal: 30000,
      },
    ]);
    expect(orcamento.temFoto).toBe(false);

    expect(orcamento.subtotal).toBe(119000);
    expect(orcamento.desconto).toBe(9000);
    expect(orcamento.taxaEntrega).toBe(4000);
    expect(orcamento.total).toBe(114000);

    expect(orcamento.entrega).toEqual({
      tipo: "ENTREGA",
      dataISO: "2026-09-30",
      endereco: "Av. Boa Viagem, 1200",
    });
    expect(orcamento.formaNome).toBe("Pix");
    expect(orcamento.formaInstrucoes).toBe("Chave: 81 98696-6176 (Maynara)");
  });

  it("escreve o combinado do caso de aceite, palavra por palavra", () => {
    expect(frasesDoCombinado(montar())).toEqual([
      "Pagamento por Pix. Chave: 81 98696-6176 (Maynara).",
      "Entrega na quarta-feira, 30 de setembro, na Av. Boa Viagem, 1200.",
      "Este orçamento vale até 22 de setembro de 2026.",
    ]);
  });

  it("zera desconto e entrega quando não há, e cala a validade quando não há prazo", () => {
    const orcamento = montar({
      ...PEDIDO,
      desconto: 0,
      total: 119000,
      entrega: { tipo: "ENTREGA", taxa: 0 },
      validoAteISO: undefined,
    });

    expect(orcamento.desconto).toBe(0);
    expect(orcamento.taxaEntrega).toBe(0);
    expect(orcamento.validoAteISO).toBeUndefined();
    expect(frasesDoCombinado(orcamento)).toEqual([
      "Pagamento por Pix. Chave: 81 98696-6176 (Maynara).",
      "Entrega na quarta-feira, 30 de setembro.",
    ]);
  });

  it("na retirada diz o dia e não o endereço, mesmo com o campo preenchido", () => {
    const orcamento = montar({
      ...PEDIDO,
      entrega: { tipo: "RETIRADA", taxa: 0, endereco: "Av. Boa Viagem, 1200" },
    });

    expect(orcamento.entrega.endereco).toBe("Av. Boa Viagem, 1200");
    expect(frasesDoCombinado(orcamento)[1]).toBe(
      "Retirada na quarta-feira, 30 de setembro.",
    );
  });

  it("fala do sábado no masculino", () => {
    const orcamento = montar({ ...PEDIDO, dataEntregaISO: "2026-09-19" });
    expect(frasesDoCombinado(orcamento)[1]).toBe(
      "Entrega no sábado, 19 de setembro, na Av. Boa Viagem, 1200.",
    );
  });

  it("some com a frase do pagamento sem forma, e para no nome sem instruções", () => {
    const semForma = montar({ ...PEDIDO, formaPagamentoId: undefined });
    expect(semForma.formaNome).toBeUndefined();
    expect(frasesDoCombinado(semForma)).toHaveLength(2);
    expect(frasesDoCombinado(semForma)[0]).toMatch(/^Entrega/);

    const semInstrucoes = montar(PEDIDO, {
      configuracao: { ...CONFIGURACAO, formasPagamento: [forma("pix", "Pix")] },
    });
    expect(frasesDoCombinado(semInstrucoes)[0]).toBe("Pagamento por Pix.");
  });

  it("não dobra o ponto quando as instruções já terminam com um", () => {
    const orcamento = montar(PEDIDO, {
      configuracao: {
        ...CONFIGURACAO,
        formasPagamento: [forma("pix", "Pix", "Chave: 81 98696-6176.")],
      },
    });
    expect(frasesDoCombinado(orcamento)[0]).toBe(
      "Pagamento por Pix. Chave: 81 98696-6176.",
    );
  });

  it("escreve o combo com as escolhas entre parênteses, como o WhatsApp", () => {
    const orcamento = montar({
      ...PEDIDO,
      itens: [
        {
          fichaTecnicaId: "combo",
          nomeSnapshot: "Combo dupla",
          quantidade: 3,
          precoUnitario: 2000,
          custoUnitarioSnapshot: 900,
          subtotal: 6000,
          escolhas: [
            {
              fichaTecnicaId: "tradicional",
              nomeSnapshot: "Tradicional",
              quantidade: 1,
              custoUnitarioSnapshot: 400,
            },
            {
              fichaTecnicaId: "red-velvet",
              nomeSnapshot: "Red Velvet",
              quantidade: 1,
              custoUnitarioSnapshot: 500,
            },
          ],
        },
      ],
    });

    // O mesmo texto do WhatsApp, pela mesma função: duas seriam duas ordens
    // esperando para divergir.
    expect(orcamento.linhas[0]?.nome).toBe(
      "Combo dupla (1 Tradicional + 1 Red Velvet)",
    );
    expect(orcamento.linhas[0]?.subtotal).toBe(6000);
  });

  it("ficha arquivada sai com o nome congelado, sem foto, sem descrição e em 'un'", () => {
    const orcamento = montar(PEDIDO, { fichas: [] });

    expect(orcamento.linhas[0]).toEqual({
      nome: "Cookie Tradicional",
      quantidade: 50,
      unidade: "un",
      precoUnitario: 1000,
      subtotal: 50000,
    });
    expect(orcamento.temFoto).toBe(false);
  });

  it("ficha que rende em peso põe a unidade dela, e a quantidade sai com vírgula", () => {
    const orcamento = montar(
      {
        ...PEDIDO,
        itens: [
          {
            ...PEDIDO.itens[0]!,
            fichaTecnicaId: "brigadeiro",
            quantidade: 1.5,
          },
        ],
      },
      { fichas: [ficha("brigadeiro", "g")] },
    );

    expect(orcamento.linhas[0]?.unidade).toBe("g");
    expect(orcamento.linhas[0]?.quantidade).toBe(1.5);
    expect(orcamento.linhas[0]?.subtotal).toBe(1500);
  });

  it("sem configuração, o nome vem da conta e a forma some, e nada lança", () => {
    const orcamento = montar(PEDIDO, { configuracao: null });

    expect(orcamento.negocio.nome).toBe("MyCookie's");
    expect(orcamento.formaNome).toBeUndefined();
    expect(orcamento.formaInstrucoes).toBeUndefined();
    expect(frasesDoCombinado(orcamento)).toHaveLength(2);
  });

  it("o nome do negócio vem da configuração quando ela existe, e da conta quando está em branco", () => {
    expect(
      montar(PEDIDO, {
        configuracao: { ...CONFIGURACAO, nomeNegocio: "Cookies da May" },
      }).negocio.nome,
    ).toBe("Cookies da May");
    expect(
      montar(PEDIDO, { configuracao: { ...CONFIGURACAO, nomeNegocio: "  " } })
        .negocio.nome,
    ).toBe("MyCookie's");
  });

  it("lê a foto e a descrição da ficha viva, e o Instagram sem o arroba (17B)", () => {
    const orcamento = montar(PEDIDO, {
      fichas: [
        {
          ...ficha("tradicional"),
          fotoUrl: "data:image/jpeg;base64,AAAA",
          descricao: "Massa amanteigada com gotas de chocolate.",
        },
        ficha("red-velvet"),
        ficha("pistachio"),
      ],
      configuracao: {
        ...CONFIGURACAO,
        contato: {
          telefone: "81 98696-6176",
          instagram: "@MyCookiesArtesanais",
        },
        assinaturaDataUrl: "data:image/png;base64,BBBB",
      },
    });

    expect(orcamento.linhas[0]?.fotoUrl).toBe("data:image/jpeg;base64,AAAA");
    expect(orcamento.linhas[0]?.descricao).toBe(
      "Massa amanteigada com gotas de chocolate.",
    );
    expect(orcamento.linhas[1]?.fotoUrl).toBeUndefined();
    expect(orcamento.temFoto).toBe(true);
    expect(orcamento.negocio.telefone).toBe("81 98696-6176");
    expect(orcamento.negocio.instagram).toBe("MyCookiesArtesanais");
    expect(orcamento.negocio.assinaturaDataUrl).toBe(
      "data:image/png;base64,BBBB",
    );
  });
});

// ---------------------------------------------------------------------------
// A validade
// ---------------------------------------------------------------------------

describe("validadeSugerida", () => {
  it("é hoje mais sete dias", () => {
    expect(DIAS_DE_VALIDADE).toBe(7);
    expect(validadeSugerida("2026-09-15")).toBe("2026-09-22");
  });

  it("vira o mês sozinha", () => {
    expect(validadeSugerida("2026-09-28")).toBe("2026-10-05");
  });
});

describe("situacaoDaValidade", () => {
  it("distingue sem prazo, válido, vence hoje e vencido", () => {
    expect(situacaoDaValidade(undefined, HOJE)).toBe("sem-prazo");
    expect(situacaoDaValidade("2026-09-16", HOJE)).toBe("valido");
    expect(situacaoDaValidade("2026-09-15", HOJE)).toBe("vence-hoje");
    expect(situacaoDaValidade("2026-09-14", HOJE)).toBe("vencido");
  });

  it("compara pelo calendário, e não pelo texto do mês", () => {
    expect(situacaoDaValidade("2026-10-01", "2026-09-30")).toBe("valido");
    expect(situacaoDaValidade("2025-12-31", "2026-01-01")).toBe("vencido");
  });
});
