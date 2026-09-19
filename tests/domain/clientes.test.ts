import { describe, expect, it } from "vitest";
import { ordenarPorGasto, resumoDaCliente } from "@/lib/domain/clientes";
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
