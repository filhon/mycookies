import { describe, expect, it } from "vitest";
import {
  DIAS_ATE_A_PURGA,
  nomeDoArquivoDeExportacao,
  paraExportavel,
} from "@/lib/domain/meusDados";

describe("paraExportavel", () => {
  it("vira ISO 8601 num objeto com toDate falso, dentro de array dentro de objeto", () => {
    const timestampFalso = { toDate: () => new Date("2026-09-21T10:00:00Z") };
    const entrada = { colecao: [{ criadoEm: timestampFalso }] };
    expect(paraExportavel(entrada)).toEqual({
      colecao: [{ criadoEm: "2026-09-21T10:00:00.000Z" }],
    });
  });

  it("deixa null, número e string intocados", () => {
    expect(paraExportavel(null)).toBeNull();
    expect(paraExportavel(42)).toBe(42);
    expect(paraExportavel("texto")).toBe("texto");
  });

  it("deixa um data: URL atravessar inteiro", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    expect(paraExportavel(dataUrl)).toBe(dataUrl);
  });
});

describe("nomeDoArquivoDeExportacao", () => {
  it("MyCookie's + 2026-09-21", () => {
    expect(nomeDoArquivoDeExportacao("MyCookie's", "2026-09-21")).toBe(
      "rende-mycookies-2026-09-21.json",
    );
  });

  it("acento e espaço viram hífen", () => {
    expect(nomeDoArquivoDeExportacao("Doceria da Nara", "2026-09-21")).toBe(
      "rende-doceria-da-nara-2026-09-21.json",
    );
    expect(nomeDoArquivoDeExportacao("Confeitaria Ápice", "2026-09-21")).toBe(
      "rende-confeitaria-apice-2026-09-21.json",
    );
  });

  it("nome vazio cai na reserva sem o negócio", () => {
    expect(nomeDoArquivoDeExportacao("", "2026-09-21")).toBe(
      "rende-2026-09-21.json",
    );
    expect(nomeDoArquivoDeExportacao("   ", "2026-09-21")).toBe(
      "rende-2026-09-21.json",
    );
  });
});

describe("DIAS_ATE_A_PURGA", () => {
  it("é trinta", () => {
    expect(DIAS_ATE_A_PURGA).toBe(30);
  });
});
