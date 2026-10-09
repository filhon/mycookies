import { describe, expect, it } from "vitest";
import {
  DIAS_SEM_PEDIR,
  diasSemPedir,
  instagramParaLink,
  momentoDaCliente,
  ordenarPorGasto,
  resumoDaCliente,
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
