import { describe, expect, it } from "vitest";
import { senhaComum } from "@/lib/domain/senha";

const EMAIL = "maynara@gmail.com";

describe("senhaComum", () => {
  it.each([
    "123456",
    "1234567",
    "12345678",
    "123456789",
    "1234567890",
    "654321",
    "123123",
    "112233",
    "102030",
    "111111",
    "000000",
    "121212",
    "abc123",
    "abcdef",
    "qwerty",
    "senha",
    "senha1",
    "senha12",
    "senha123",
    "mudar123",
    "123mudar",
    "brasil",
    "rende123",
  ])("recusa %s", (senha) => {
    expect(senhaComum(senha, EMAIL)).toBe(true);
  });

  it("compara em minúsculas e sem as pontas", () => {
    expect(senhaComum("AAAAAA", EMAIL)).toBe(true);
    expect(senhaComum("  123456 ", EMAIL)).toBe(true);
    expect(senhaComum("Brasil", EMAIL)).toBe(true);
  });

  it("recusa a parte local do e-mail, com ou sem 123", () => {
    expect(senhaComum("maynara", EMAIL)).toBe(true);
    expect(senhaComum("maynara123", EMAIL)).toBe(true);
    expect(senhaComum("maynara", "outra@gmail.com")).toBe(false);
  });

  it("deixa passar a senha que não é óbvia", () => {
    expect(senhaComum("cookie2026", EMAIL)).toBe(false);
  });
});
