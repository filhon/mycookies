import { describe, expect, it } from "vitest";
import {
  apelidoDoEmail,
  esquemaConvite,
  papelDaClaim,
  rotaSoDaDona,
} from "@/lib/domain/ajudante";

describe("rotaSoDaDona", () => {
  it("fecha as rotas da dona e as filhas delas", () => {
    expect(rotaSoDaDona("/financeiro")).toBe(true);
    expect(rotaSoDaDona("/financeiro/qualquer")).toBe(true);
    expect(rotaSoDaDona("/clientes")).toBe(true);
    expect(rotaSoDaDona("/comecar")).toBe(true);
  });

  it("deixa o trabalho aberto", () => {
    expect(rotaSoDaDona("/fichas")).toBe(false);
    expect(rotaSoDaDona("/")).toBe(false);
  });

  it("prefixo não é rota", () => {
    expect(rotaSoDaDona("/comecarX")).toBe(false);
  });
});

describe("esquemaConvite", () => {
  it("normaliza espaço e maiúscula", () => {
    const corpo = esquemaConvite.safeParse({
      contaId: "mycookies",
      email: "  Ana.Silva@Exemplo.com ",
    });
    expect(corpo.success).toBe(true);
    if (corpo.success) expect(corpo.data.email).toBe("ana.silva@exemplo.com");
  });

  it("recusa e-mail sem arroba", () => {
    expect(
      esquemaConvite.safeParse({
        contaId: "mycookies",
        email: "ana.exemplo.com",
      }).success,
    ).toBe(false);
  });
});

describe("apelidoDoEmail", () => {
  it("é a parte antes da arroba", () => {
    expect(apelidoDoEmail("maynara@exemplo.com")).toBe("maynara");
  });

  it("encurta o e-mail longo", () => {
    const apelido = apelidoDoEmail(
      "ana.carolina.de.souza.confeitaria@exemplo.com",
    );
    expect(apelido.length).toBe(20);
    expect(apelido.endsWith("…")).toBe(true);
  });

  it("sem arroba, é o texto inteiro", () => {
    expect(apelidoDoEmail("ana")).toBe("ana");
  });
});

describe("papelDaClaim", () => {
  it("dona continua dona; o resto é ajudante", () => {
    expect(papelDaClaim("DONA")).toBe("DONA");
    expect(papelDaClaim("AJUDANTE")).toBe("AJUDANTE");
    expect(papelDaClaim("ADMIN")).toBe("AJUDANTE");
    expect(papelDaClaim(true)).toBe("AJUDANTE");
  });
});
