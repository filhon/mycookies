import { describe, expect, it } from "vitest";
import {
  contatoJuntado,
  DIAS_SEM_PEDIR,
  diasSemPedir,
  juntarAgregados,
  possiveisDuplicadas,
  filtrarClientes,
  instagramParaLer,
  instagramParaLink,
  momentoDaCliente,
  ordenarClientes,
  ordenarPorGasto,
  resumoDaCliente,
  telefoneParaLer,
  temAlergia,
} from "@/lib/domain/clientes";
import { formatarMoeda } from "@/lib/domain/money";

function cliente(parcial: {
  nomeBusca: string;
  totalPedidos: number;
  totalGasto: number;
}) {
  return { ...parcial, ticketMedio: 0 };
}

describe("ordenarPorGasto", () => {
  it("ordena por totalGasto decrescente, empatando por totalPedidos e depois nome, com zero por último", () => {
    const entrada = [
      cliente({ nomeBusca: "bia", totalPedidos: 2, totalGasto: 12000 }),
      cliente({ nomeBusca: "carla", totalPedidos: 0, totalGasto: 0 }),
      cliente({ nomeBusca: "ana", totalPedidos: 3, totalGasto: 50000 }),
      cliente({ nomeBusca: "duda", totalPedidos: 0, totalGasto: 0 }),
      cliente({ nomeBusca: "eva", totalPedidos: 3, totalGasto: 12000 }),
      cliente({ nomeBusca: "fabia", totalPedidos: 2, totalGasto: 12000 }),
    ];
    const copia = entrada.map((item) => ({ ...item }));

    const resultado = ordenarPorGasto(entrada);

    expect(resultado.map((item) => item.nomeBusca)).toEqual([
      "ana", // 50000
      "eva", // 12000, 3 pedidos
      "bia", // 12000, 2 pedidos, "bia" < "fabia"
      "fabia", // 12000, 2 pedidos
      "carla", // 0, por nome
      "duda", // 0, por nome
    ]);
    // A entrada não é mutada.
    expect(entrada).toEqual(copia);
  });
});

describe("resumoDaCliente", () => {
  it("diz 'ainda sem pedido pago' quando totalPedidos é zero, mesmo com outros campos preenchidos", () => {
    expect(
      resumoDaCliente({ totalPedidos: 0, ticketMedio: 4000 }, "2026-08-12"),
    ).toBe("ainda sem pedido pago");
  });

  it("com um pedido, não repete a média", () => {
    expect(
      resumoDaCliente({ totalPedidos: 1, ticketMedio: 4000 }, "2026-08-12"),
    ).toBe("1 pedido pago · último em 12 de ago.");
  });

  it("com vários pedidos, mostra pedidos, média e último", () => {
    expect(
      resumoDaCliente({ totalPedidos: 3, ticketMedio: 4000 }, "2026-08-12"),
    ).toBe(
      `3 pedidos pagos · ${formatarMoeda(4000)} em média · último em 12 de ago.`,
    );
  });

  it("sem data, termina em 'em média'", () => {
    expect(resumoDaCliente({ totalPedidos: 2, ticketMedio: 4000 }, null)).toBe(
      `2 pedidos pagos · ${formatarMoeda(4000)} em média`,
    );
  });
});

describe("temAlergia", () => {
  it("acha a alergia sem acento e sem caixa", () => {
    expect(temAlergia("Alérgica a amendoim")).toBe(true);
    expect(temAlergia("ALERGIA a lactose")).toBe(true);
    expect(temAlergia("filho alergico")).toBe(true);
  });

  it("não acha onde não há", () => {
    expect(temAlergia("Gosta do laço vermelho")).toBe(false);
    expect(temAlergia("")).toBe(false);
    expect(temAlergia(undefined)).toBe(false);
  });
});

describe("instagramParaLink", () => {
  it("aceita o usuário com ou sem arroba, e o link colado", () => {
    const link = "https://instagram.com/ana.doces";
    expect(instagramParaLink("@ana.doces")).toBe(link);
    expect(instagramParaLink(" ana.doces ")).toBe(link);
    expect(instagramParaLink("https://www.instagram.com/ana.doces/")).toBe(
      link,
    );
    expect(instagramParaLink("instagram.com/ana.doces?igsh=abc")).toBe(link);
  });

  it("sem usuário possível, nada", () => {
    expect(instagramParaLink("")).toBeNull();
    expect(instagramParaLink(undefined)).toBeNull();
    expect(instagramParaLink("@")).toBeNull();
    expect(instagramParaLink("Ana Doces")).toBeNull();
  });
});

describe("ordenarClientes", () => {
  const em = (ms: number) => ({ toMillis: () => ms });
  const lista = [
    {
      ...cliente({ nomeBusca: "bia", totalPedidos: 2, totalGasto: 9000 }),
      ultimoPedidoEm: em(300),
    },
    {
      ...cliente({ nomeBusca: "ana", totalPedidos: 1, totalGasto: 2000 }),
      ultimoPedidoEm: em(100),
    },
    // Desfez o único pedido pago: a data ficou, mas não conta.
    {
      ...cliente({ nomeBusca: "cris", totalPedidos: 0, totalGasto: 0 }),
      ultimoPedidoEm: em(999),
    },
    // Pedido pago sem a data: parada desde sempre.
    cliente({ nomeBusca: "duda", totalPedidos: 1, totalGasto: 5000 }),
    {
      ...cliente({ nomeBusca: "eva", totalPedidos: 3, totalGasto: 1000 }),
      ultimoPedidoEm: em(200),
    },
  ];
  const nomes = (ordem: Parameters<typeof ordenarClientes>[1]) =>
    ordenarClientes(lista, ordem).map((item) => item.nomeBusca);

  it("mais gasto é a de sempre", () => {
    expect(nomes("GASTO")).toEqual(["bia", "duda", "ana", "eva", "cris"]);
  });

  it("pedido mais recente primeiro; sem pedido pago no fim", () => {
    expect(nomes("RECENTE")).toEqual(["bia", "eva", "ana", "duda", "cris"]);
  });

  it("mais tempo sem pedir primeiro, a sem data antes de todas; sem pedido pago no fim", () => {
    expect(nomes("PARADA")).toEqual(["duda", "ana", "eva", "bia", "cris"]);
  });

  it("por nome", () => {
    expect(nomes("NOME")).toEqual(["ana", "bia", "cris", "duda", "eva"]);
  });
});

describe("filtrarClientes", () => {
  const lista = [
    {
      nomeBusca: "lindacy",
      telefone: "81 98713-8356",
      instagram: "lindacy.doces",
    },
    {
      nomeBusca: "ketilyn",
      telefone: "+55 81 99373-6569",
      instagram: "@ketilyn",
    },
    { nomeBusca: "janessa", telefone: "81999137502", instagram: "@janessadd1" },
    { nomeBusca: "veronica", instagram: "Veronicaapolonia23" },
  ];
  const nomes = (busca: string) =>
    filtrarClientes(lista, busca).map((item) => item.nomeBusca);

  it("sem termo, todas", () => {
    expect(nomes("  ")).toHaveLength(4);
  });

  it("pelo nome, sem acento e sem caixa", () => {
    expect(nomes("Kétilyn")).toEqual(["ketilyn"]);
  });

  it("pelos dígitos do telefone, com 4 ou mais, como ela vê ou como foi gravado", () => {
    expect(nomes("98713")).toEqual(["lindacy"]);
    expect(nomes("(81) 99373-6569")).toEqual(["ketilyn"]);
    expect(nomes("9913 7502")).toEqual(["janessa"]);
  });

  it("com menos de 4 dígitos, o telefone não entra", () => {
    expect(nomes("813")).toEqual([]);
  });

  it("pelo Instagram, com ou sem arroba", () => {
    expect(nomes("@janessa")).toEqual(["janessa"]);
    expect(nomes("apolonia")).toEqual(["veronica"]);
    expect(nomes("@ketil")).toEqual(["ketilyn"]);
  });
});

describe("telefoneParaLer", () => {
  it("os formatos que existem na conta viram o mesmo desenho", () => {
    expect(telefoneParaLer("81999137502")).toBe("(81) 99913-7502");
    expect(telefoneParaLer("81 98713-8356")).toBe("(81) 98713-8356");
    expect(telefoneParaLer("+55 81 99373-6569")).toBe("(81) 99373-6569");
    expect(telefoneParaLer("819 9242-3262")).toBe("(81) 99242-3262");
  });

  it("fixo, zero de operadora e o 55 sem o +", () => {
    expect(telefoneParaLer("8132221234")).toBe("(81) 3222-1234");
    expect(telefoneParaLer("081 3222-1234")).toBe("(81) 3222-1234");
    expect(telefoneParaLer("5581999137502")).toBe("(81) 99913-7502");
  });

  it("o que não é número brasileiro com DDD aparece como foi digitado", () => {
    expect(telefoneParaLer(" 9999-1234 ")).toBe("9999-1234");
    expect(telefoneParaLer("liga no fixo")).toBe("liga no fixo");
    expect(telefoneParaLer(undefined)).toBe("");
  });
});

describe("instagramParaLer", () => {
  it("põe o arroba quando falta e tira o link", () => {
    expect(instagramParaLer("Veronicaapolonia23")).toBe("@Veronicaapolonia23");
    expect(instagramParaLer("@janessadd1")).toBe("@janessadd1");
    expect(instagramParaLer("https://www.instagram.com/ana.doces/")).toBe(
      "@ana.doces",
    );
  });

  it("o que não é usuário aparece como foi digitado", () => {
    expect(instagramParaLer("Ana Doces")).toBe("Ana Doces");
    expect(instagramParaLer(undefined)).toBe("");
  });
});

describe("possiveisDuplicadas", () => {
  const yasmin = {
    id: "a",
    nomeBusca: "yasmin rocha",
    telefone: "81987315065",
    arquivado: false,
  };
  const ids = (lista: (typeof yasmin)[]) =>
    possiveisDuplicadas(yasmin, lista).map((outra) => outra.id);

  it("o mesmo telefone em outro formato, ou o mesmo nome", () => {
    expect(
      ids([
        yasmin,
        {
          ...yasmin,
          id: "b",
          nomeBusca: "yasmin n 2",
          telefone: "(81) 98731-5065",
        },
        { ...yasmin, id: "c", telefone: undefined as unknown as string },
        { ...yasmin, id: "d", nomeBusca: "yasmin", telefone: "81999990000" },
      ]),
    ).toEqual(["b", "c"]);
  });

  it("nem ela mesma, nem a arquivada", () => {
    expect(ids([yasmin, { ...yasmin, id: "b", arquivado: true }])).toEqual([]);
  });

  it("sem telefone, só o nome compara", () => {
    const semTelefone = { ...yasmin, telefone: "" };
    expect(
      possiveisDuplicadas(semTelefone, [
        { ...yasmin, id: "b", nomeBusca: "outra", telefone: "" },
      ]),
    ).toEqual([]);
  });
});

describe("juntarAgregados", () => {
  const em = (ms: number) => ({ toMillis: () => ms });

  it("soma pedidos e gasto, refaz a média e fica com o último mais recente", () => {
    const ultimo = em(300);
    expect(
      juntarAgregados(
        {
          totalPedidos: 2,
          totalGasto: 7200,
          ticketMedio: 3600,
          ultimoPedidoEm: em(100),
        },
        {
          totalPedidos: 1,
          totalGasto: 2400,
          ticketMedio: 2400,
          ultimoPedidoEm: ultimo,
        },
      ),
    ).toEqual({
      totalPedidos: 3,
      totalGasto: 9600,
      ticketMedio: 3200,
      ultimoPedidoEm: ultimo,
    });
  });

  it("sem pedido pago nas duas, média zero e sem data", () => {
    expect(
      juntarAgregados(
        { totalPedidos: 0, totalGasto: 0, ticketMedio: 0 },
        { totalPedidos: 0, totalGasto: 0, ticketMedio: 0 },
      ),
    ).toEqual({ totalPedidos: 0, totalGasto: 0, ticketMedio: 0 });
  });
});

describe("contatoJuntado", () => {
  it("preenche só o vazio e não mexe no preenchido", () => {
    expect(
      contatoJuntado(
        { telefone: "81987315065", endereco: "  " },
        { telefone: "81999990000", instagram: "@yas", endereco: "Rua A, 10" },
      ),
    ).toEqual({ instagram: "@yas", endereco: "Rua A, 10" });
  });

  it("observações nas duas vão juntas, uma por linha; iguais não repetem", () => {
    expect(
      contatoJuntado(
        { observacoes: "Laço vermelho" },
        { observacoes: "Sem açúcar" },
      ),
    ).toEqual({ observacoes: "Laço vermelho\nSem açúcar" });
    expect(contatoJuntado({}, { observacoes: "Sem açúcar" })).toEqual({
      observacoes: "Sem açúcar",
    });
    expect(
      contatoJuntado({ observacoes: "Igual" }, { observacoes: "Igual" }),
    ).toEqual({});
  });
});

describe("momentoDaCliente", () => {
  const hoje = "2026-10-09";
  const ha29 = "2026-09-10";
  const ha30 = "2026-09-09";

  it("a fronteira é 30 dias", () => {
    expect(DIAS_SEM_PEDIR).toBe(30);
    expect(diasSemPedir(ha29, hoje)).toBe(29);
    expect(diasSemPedir(ha30, hoje)).toBe(30);
  });

  it("um pedido pago: nova antes de 30 dias, uma vez só a partir de 30", () => {
    expect(momentoDaCliente({ totalPedidos: 1 }, ha29, hoje)).toBe("novas");
    expect(momentoDaCliente({ totalPedidos: 1 }, ha30, hoje)).toBe("uma-vez");
  });

  it("dois ou mais: volta antes de 30 dias, sumiu a partir de 30", () => {
    expect(momentoDaCliente({ totalPedidos: 2 }, ha29, hoje)).toBe("voltam");
    expect(momentoDaCliente({ totalPedidos: 2 }, ha30, hoje)).toBe("sumiram");
    expect(momentoDaCliente({ totalPedidos: 7 }, ha30, hoje)).toBe("sumiram");
  });

  it("zero pedido pago é sem pedido, com ou sem data (o desfazer não a apaga)", () => {
    expect(momentoDaCliente({ totalPedidos: 0 }, null, hoje)).toBe(
      "sem-pedido",
    );
    expect(momentoDaCliente({ totalPedidos: 0 }, ha29, hoje)).toBe(
      "sem-pedido",
    );
  });

  it("pedido pago sem data conta como parada", () => {
    expect(diasSemPedir(null, hoje)).toBeNull();
    expect(momentoDaCliente({ totalPedidos: 1 }, null, hoje)).toBe("uma-vez");
    expect(momentoDaCliente({ totalPedidos: 3 }, null, hoje)).toBe("sumiram");
  });

  it("pagamento com data à frente não dá dia negativo", () => {
    expect(diasSemPedir("2026-10-12", hoje)).toBe(0);
    expect(momentoDaCliente({ totalPedidos: 1 }, "2026-10-12", hoje)).toBe(
      "novas",
    );
  });
});
