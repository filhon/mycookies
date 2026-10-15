import { describe, expect, it } from "vitest";
import {
  caiuNaIsca,
  esquemaListaDeEspera,
  idDaEspera,
  normalizarEmail,
  posicaoNaFila,
} from "@/lib/domain/listaDeEspera";

describe("normalizarEmail", () => {
  it("tira espaço e põe em minúsculas", () => {
    expect(normalizarEmail("  Maynara@Gmail.COM ")).toBe("maynara@gmail.com");
    expect(normalizarEmail("may nara@gmail.com")).toBe("maynara@gmail.com");
  });
});

describe("idDaEspera", () => {
  it("é o SHA-256 do e-mail normalizado, 32 caracteres em hex", async () => {
    // `echo -n maynara@gmail.com | sha256sum`, os 32 primeiros.
    expect(await idDaEspera("maynara@gmail.com")).toBe(
      "a6a64dc68fa752b8c5f7cae6eae4bade",
    );
  });

  it("o mesmo e-mail escrito de outro jeito dá o mesmo id", async () => {
    expect(await idDaEspera(" MAYNARA@gmail.com")).toBe(
      await idDaEspera("maynara@gmail.com"),
    );
  });
});

describe("esquemaListaDeEspera", () => {
  const base = {
    nome: "Carla",
    email: "Carla@Exemplo.com",
    origem: "cadastro",
  };

  it("normaliza o e-mail e aceita o corpo mínimo", () => {
    const lido = esquemaListaDeEspera.parse(base);
    expect(lido.email).toBe("carla@exemplo.com");
    expect(lido.instagram).toBeUndefined();
  });

  it("tira o @ e o espaço do Instagram, e vazio vira ausente", () => {
    expect(
      esquemaListaDeEspera.parse({ ...base, instagram: " @docesdacarla" })
        .instagram,
    ).toBe("docesdacarla");
    expect(
      esquemaListaDeEspera.parse({ ...base, instagram: "  " }).instagram,
    ).toBeUndefined();
  });

  it("recusa e-mail sem forma, nome vazio ou longo, origem desconhecida e Instagram longo", () => {
    for (const corpo of [
      { ...base, email: "carla" },
      { ...base, nome: "  " },
      { ...base, nome: "a".repeat(81) },
      { ...base, origem: "google" },
      { ...base, instagram: "a".repeat(41) },
    ]) {
      expect(esquemaListaDeEspera.safeParse(corpo).success).toBe(false);
    }
  });
});

describe("caiuNaIsca", () => {
  it("só o campo site preenchido é isca", () => {
    expect(caiuNaIsca({ site: "http://spam" })).toBe(true);
    expect(caiuNaIsca({ site: "" })).toBe(false);
    expect(caiuNaIsca({ site: "  " })).toBe(false);
    expect(caiuNaIsca({})).toBe(false);
    expect(caiuNaIsca(null)).toBe(false);
  });
});

describe("posicaoNaFila", () => {
  it("escreve o ordinal com o milhar", () => {
    expect(posicaoNaFila(37)).toBe("37ª");
    expect(posicaoNaFila(1200)).toBe("1.200ª");
  });
});
