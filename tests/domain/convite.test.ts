import { describe, expect, it } from "vitest";
import {
  ALFABETO_DO_CONVITE,
  convitesLivres,
  estadoDoConvite,
  formatarCodigo,
  fraseDaVaga,
  mensagemDoConvite,
  gerarCodigo,
  lerCodigo,
  TAMANHO_DO_CODIGO,
} from "@/lib/domain/convite";

/** Devolve os bytes dados, em ordem, quantas vezes pedirem. */
function sequencia(...bytes: number[]) {
  let i = 0;
  return (destino: Uint8Array) => {
    for (let j = 0; j < destino.length; j++) {
      destino[j] = bytes[i++ % bytes.length]!;
    }
    return destino;
  };
}

describe("o alfabeto", () => {
  it("tem 31 símbolos, sem 0, O, 1, I e L", () => {
    expect(ALFABETO_DO_CONVITE).toHaveLength(31);
    expect(new Set(ALFABETO_DO_CONVITE).size).toBe(31);
    for (const fora of "0O1IL") expect(ALFABETO_DO_CONVITE).not.toContain(fora);
  });
});

describe("gerarCodigo", () => {
  it("sai com oito símbolos do alfabeto", () => {
    const codigo = gerarCodigo((b) => crypto.getRandomValues(b));
    expect(codigo).toHaveLength(TAMANHO_DO_CODIGO);
    expect(lerCodigo(codigo)).toBe(codigo);
  });

  it("mapeia o byte pelo resto de 31", () => {
    expect(gerarCodigo(sequencia(0, 1, 30, 31, 62, 2, 3, 4))).toBe("23Z22456");
  });

  it("descarta os bytes de 248 a 255, para não viciar o sorteio", () => {
    expect(gerarCodigo(sequencia(248, 255, 0))).toBe("22222222");
    expect(gerarCodigo(sequencia(247))).toBe("ZZZZZZZZ");
  });
});

describe("formatarCodigo e lerCodigo", () => {
  it("vão e voltam", () => {
    expect(formatarCodigo("K7Q3M9XA")).toBe("K7Q3-M9XA");
    expect(lerCodigo(formatarCodigo("K7Q3M9XA"))).toBe("K7Q3M9XA");
  });

  it("lerCodigo aceita minúscula, espaço e hífen", () => {
    expect(lerCodigo("k7q3m9xa")).toBe("K7Q3M9XA");
    expect(lerCodigo(" k7q3 m9xa ")).toBe("K7Q3M9XA");
    expect(lerCodigo("K7Q3-M9XA")).toBe("K7Q3M9XA");
    expect(lerCodigo("k7-q3 m9-xa")).toBe("K7Q3M9XA");
  });

  it.each([
    "",
    "K7Q3M9X",
    "K7Q3M9XAB",
    "K7Q3M9X0",
    "K7Q3M9XO",
    "K7Q3M9X1",
    "K7Q3M9XI",
    "K7Q3M9XL",
    "K7Q3_M9XA",
    "K7Q3M9XÁ",
  ])("lerCodigo(%j) é null", (texto) => {
    expect(lerCodigo(texto)).toBeNull();
  });
});

describe("convitesLivres", () => {
  const de = (...status: string[]) => status.map((s) => ({ status: s }));

  it("conta abertos e usados contra a cota, e o cancelado devolve a vaga", () => {
    expect(convitesLivres(5, [])).toBe(5);
    expect(convitesLivres(5, de("ABERTO", "USADO", "CANCELADO"))).toBe(3);
    expect(
      convitesLivres(5, de("USADO", "USADO", "USADO", "USADO", "USADO")),
    ).toBe(0);
  });

  it("nunca fica negativo quando a cota baixou depois de usada", () => {
    expect(convitesLivres(2, de("USADO", "USADO", "ABERTO"))).toBe(0);
  });
});

describe("mensagemDoConvite", () => {
  it("chama pelo nome quando ela escreveu", () => {
    expect(mensagemDoConvite("Ana")).toBe(
      "Oi, Ana! Tô usando o Rende pra calcular o preço dos meus doces e organizar os pedidos. Ele está em beta fechado, só entra quem é convidada, e eu guardei uma das minhas vagas pra você:",
    );
  });

  it("sem nome, ou só com espaço, diz só Oi", () => {
    expect(mensagemDoConvite()).toMatch(/^Oi! Tô usando/);
    expect(mensagemDoConvite("  ")).toMatch(/^Oi! Tô usando/);
  });
});

describe("estadoDoConvite", () => {
  const beta = { fase: "BETA" as const, vagas: 100, ocupadas: 40 };
  const ativa = { status: "ATIVA" };

  it("aberto, com conta viva e vaga: aberto", () => {
    expect(estadoDoConvite({ status: "ABERTO" }, ativa, beta)).toBe("aberto");
  });

  it("aberto, sem vaga: sem-vaga", () => {
    expect(
      estadoDoConvite({ status: "ABERTO" }, ativa, { ...beta, ocupadas: 100 }),
    ).toBe("sem-vaga");
  });

  it("usado, cancelado, inexistente e de conta encerrada são o mesmo estado", () => {
    expect(estadoDoConvite({ status: "USADO" }, ativa, beta)).toBe("nao-vale");
    expect(estadoDoConvite({ status: "CANCELADO" }, ativa, beta)).toBe(
      "nao-vale",
    );
    expect(estadoDoConvite(null, null, beta)).toBe("nao-vale");
    expect(
      estadoDoConvite({ status: "ABERTO" }, { status: "ENCERRADA" }, beta),
    ).toBe("nao-vale");
    expect(estadoDoConvite({ status: "ABERTO" }, null, beta)).toBe("nao-vale");
  });

  it("na fase PUBLICO, qualquer convite vira publico", () => {
    const publico = { ...beta, fase: "PUBLICO" as const };
    expect(estadoDoConvite(null, null, publico)).toBe("publico");
    expect(estadoDoConvite({ status: "ABERTO" }, ativa, publico)).toBe(
      "publico",
    );
  });
});

describe("fraseDaVaga", () => {
  it("nomeia a convidada, a fundadora pelo primeiro nome e o negócio", () => {
    expect(
      fraseDaVaga({
        paraQuem: "Ana",
        proprietaria: "Maynara Silva",
        negocio: "MyCookie's",
      }),
    ).toBe(
      "Ana, a Maynara, da MyCookie's, guardou uma vaga do Rende pra você.",
    );
  });

  it("sem para quem, começa pela fundadora", () => {
    expect(
      fraseDaVaga({ proprietaria: "Maynara", negocio: "MyCookie's" }),
    ).toBe("A Maynara, da MyCookie's, guardou uma vaga do Rende pra você.");
  });

  it("sem negócio próprio, não repete o nome dela", () => {
    expect(
      fraseDaVaga({ proprietaria: "Maynara Silva", negocio: "Maynara Silva" }),
    ).toBe("A Maynara guardou uma vaga do Rende pra você.");
  });
});
