import { describe, expect, it } from "vitest";
import {
  CATALOGO_DO_COMECO,
  passosDoComeco,
  progressoDoComeco,
  proximoPasso,
  type EstadoPasso,
  type FatosDoComeco,
  type IdPasso,
} from "@/lib/domain/onboarding";

/** Conta zerada: nenhuma das cinco perguntas devolveu documento. */
const ZERADA: FatosDoComeco = {
  temConfiguracao: false,
  temInsumo: false,
  temFicha: false,
  temPedido: false,
  temLancamento: false,
};

function fatos(parcial: Partial<FatosDoComeco>): FatosDoComeco {
  return { ...ZERADA, ...parcial };
}

/** O desenho do caminho em uma linha, que é como a tela o mostra. */
function estados(entrada: FatosDoComeco): EstadoPasso[] {
  return passosDoComeco(entrada).map((passo) => passo.estado);
}

function ids(entrada: FatosDoComeco): IdPasso[] {
  return passosDoComeco(entrada).map((passo) => passo.id);
}

describe("a ordem dos cinco", () => {
  it("é fixa e não depende dos fatos", () => {
    const esperada: IdPasso[] = [
      "FICHAS",
      "INSUMOS",
      "CONFIGURACAO",
      "PEDIDOS",
      "CAIXA",
    ];

    expect(ids(ZERADA)).toEqual(esperada);
    expect(ids(fatos({ temLancamento: true }))).toEqual(esperada);
    expect(
      ids(
        fatos({
          temConfiguracao: true,
          temInsumo: true,
          temFicha: true,
          temPedido: true,
          temLancamento: true,
        }),
      ),
    ).toEqual(esperada);
  });

  it("numera de 1 a 5 na mesma ordem", () => {
    expect(passosDoComeco(ZERADA).map((passo) => passo.numero)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("dá a cada passo um porquê e o que esperar, sem instrução de clique", () => {
    for (const passo of CATALOGO_DO_COMECO) {
      expect(passo.porque.length).toBeGreaterThan(0);
      expect(passo.oQueEsperar.length).toBeGreaterThan(0);
      expect(passo.rotuloAcao.length).toBeGreaterThan(0);
      expect(passo.href.startsWith("/")).toBe(true);
    }
  });

  it("nenhum dos cinco textos cita um número: nem R$, nem dígito", () => {
    for (const passo of CATALOGO_DO_COMECO) {
      expect(passo.porque).not.toMatch(/R\$|\d/);
      expect(passo.oQueEsperar).not.toMatch(/R\$|\d/);
    }
  });
});

/**
 * O caso de aceite da spec 019, estado por estado. Cada linha é uma escrita da
 * usuária: tocar na biblioteca, salvar a configuração, confirmar o pedido de
 * 20 cookies, marcar como pago — mais o caminho de quem ignora a biblioteca e
 * cadastra à mão.
 */
describe("o caso de aceite, passo a passo", () => {
  it("entrar pela primeira vez: 0 de 5, e o de agora é ver quanto custa um cookie", () => {
    const passos = passosDoComeco(ZERADA);

    expect(estados(ZERADA)).toEqual([
      "AGORA",
      "DEPOIS",
      "DEPOIS",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos)).toEqual({
      feitos: 0,
      total: 5,
      concluido: false,
    });
    expect(proximoPasso(passos)?.id).toBe("FICHAS");
    expect(proximoPasso(passos)?.href).toBe("/fichas");
  });

  it('tocar em "Começar com o que toda cozinha tem": 2 de 5, e o de agora é ajustar o que é seu', () => {
    const entrada = fatos({ temFicha: true, temInsumo: true });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "AGORA",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(2);
    expect(proximoPasso(passos)?.id).toBe("CONFIGURACAO");
    expect(proximoPasso(passos)?.href).toBe("/configuracao");
  });

  it("salvar a configuração: 3 de 5, e o de agora são os pedidos", () => {
    const entrada = fatos({
      temFicha: true,
      temInsumo: true,
      temConfiguracao: true,
    });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "FEITO",
      "AGORA",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(3);
    expect(proximoPasso(passos)?.href).toBe("/pedidos");
  });

  it("confirmar o pedido: 4 de 5, e o de agora é marcar como paga", () => {
    const entrada = fatos({
      temFicha: true,
      temInsumo: true,
      temConfiguracao: true,
      temPedido: true,
    });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "FEITO",
      "FEITO",
      "AGORA",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(4);
    expect(proximoPasso(passos)?.id).toBe("CAIXA");
    // O quinto passo leva de volta a `/pedidos`: registrar e receber são dois
    // dias diferentes, e é entre os dois que mora a metade que ela não
    // descobriria sozinha.
    expect(proximoPasso(passos)?.href).toBe("/pedidos");
  });

  it("marcar como pago: 5 de 5, concluído e sem próximo", () => {
    const entrada = fatos({
      temFicha: true,
      temInsumo: true,
      temConfiguracao: true,
      temPedido: true,
      temLancamento: true,
    });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "FEITO",
      "FEITO",
      "FEITO",
    ]);
    expect(progressoDoComeco(passos)).toEqual({
      feitos: 5,
      total: 5,
      concluido: true,
    });
    expect(proximoPasso(passos)).toBeNull();
  });

  it("ou, sem a biblioteca: 1 insumo cadastrado à mão mantém o passo 1 como o de agora", () => {
    const entrada = fatos({ temInsumo: true });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "AGORA",
      "FEITO",
      "DEPOIS",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(1);
    expect(proximoPasso(passos)?.id).toBe("FICHAS");
    expect(proximoPasso(passos)?.href).toBe("/fichas");
  });

  it("... e a primeira ficha montada à mão: 2 de 5, e o de agora é ajustar o que é seu", () => {
    const entrada = fatos({ temInsumo: true, temFicha: true });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "AGORA",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(2);
    expect(proximoPasso(passos)?.id).toBe("CONFIGURACAO");
    expect(proximoPasso(passos)?.href).toBe("/configuracao");
  });
});

describe("o estado depois de apertar a biblioteca", () => {
  it("uma ficha e um insumo ao mesmo tempo: 2 de 5, e o de agora é a configuração", () => {
    const entrada = fatos({ temFicha: true, temInsumo: true });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "FEITO",
      "FEITO",
      "AGORA",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos)).toEqual({
      feitos: 2,
      total: 5,
      concluido: false,
    });
    expect(proximoPasso(passos)?.id).toBe("CONFIGURACAO");
  });

  it("cada um dos cinco leva para a tela certa", () => {
    const hrefs = Object.fromEntries(
      CATALOGO_DO_COMECO.map((passo) => [passo.id, passo.href]),
    );

    expect(hrefs).toEqual({
      FICHAS: "/fichas",
      INSUMOS: "/insumos",
      CONFIGURACAO: "/configuracao",
      PEDIDOS: "/pedidos",
      CAIXA: "/pedidos",
    });
  });
});

describe("fora de ordem", () => {
  it("salvar a configuração antes de ter ficha marca o 3 e mantém o 1 como o de agora", () => {
    const entrada = fatos({ temConfiguracao: true });
    const passos = passosDoComeco(entrada);

    expect(estados(entrada)).toEqual([
      "AGORA",
      "DEPOIS",
      "FEITO",
      "DEPOIS",
      "DEPOIS",
    ]);
    expect(progressoDoComeco(passos).feitos).toBe(1);
    expect(proximoPasso(passos)?.id).toBe("FICHAS");
  });

  it("o último passo feito sozinho não fecha nada antes dele", () => {
    const entrada = fatos({ temLancamento: true });

    expect(estados(entrada)).toEqual([
      "AGORA",
      "DEPOIS",
      "DEPOIS",
      "DEPOIS",
      "FEITO",
    ]);
    expect(progressoDoComeco(passosDoComeco(entrada)).concluido).toBe(false);
  });
});

/**
 * As 32 combinações possíveis dos cinco fatos. É a única forma de afirmar "no
 * máximo um AGORA" sem escolher os casos que confirmam a afirmação.
 */
describe("as trinta e duas combinações", () => {
  const TODAS: FatosDoComeco[] = Array.from({ length: 32 }, (_, mascara) =>
    fatos({
      temConfiguracao: (mascara & 1) !== 0,
      temInsumo: (mascara & 2) !== 0,
      temFicha: (mascara & 4) !== 0,
      temPedido: (mascara & 8) !== 0,
      temLancamento: (mascara & 16) !== 0,
    }),
  );

  it("nunca têm dois AGORA", () => {
    for (const entrada of TODAS) {
      const agoras = estados(entrada).filter((estado) => estado === "AGORA");
      expect(agoras.length).toBeLessThanOrEqual(1);
    }
  });

  it("só ficam sem AGORA quando os cinco estão feitos", () => {
    for (const entrada of TODAS) {
      const passos = passosDoComeco(entrada);
      const semAgora = proximoPasso(passos) === null;
      expect(semAgora).toBe(progressoDoComeco(passos).concluido);
    }
  });

  it("marcam FEITO exatamente onde o fato está, e contam o mesmo tanto", () => {
    for (const entrada of TODAS) {
      const esperados = [
        entrada.temFicha,
        entrada.temInsumo,
        entrada.temConfiguracao,
        entrada.temPedido,
        entrada.temLancamento,
      ];
      const passos = passosDoComeco(entrada);

      expect(passos.map((passo) => passo.estado === "FEITO")).toEqual(
        esperados,
      );
      expect(progressoDoComeco(passos).feitos).toBe(
        esperados.filter(Boolean).length,
      );
    }
  });

  it("põem DEPOIS em todo passo não feito que vem depois do AGORA", () => {
    for (const entrada of TODAS) {
      const passos = passosDoComeco(entrada);
      const indiceAgora = passos.findIndex((passo) => passo.estado === "AGORA");
      if (indiceAgora === -1) continue;

      // Antes do agora, só feitos.
      for (const passo of passos.slice(0, indiceAgora)) {
        expect(passo.estado).toBe("FEITO");
      }
      // Depois dele, nada de agora.
      for (const passo of passos.slice(indiceAgora + 1)) {
        expect(passo.estado === "FEITO" || passo.estado === "DEPOIS").toBe(
          true,
        );
      }
    }
  });
});
