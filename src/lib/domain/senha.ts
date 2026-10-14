/**
 * As senhas que alguém tenta primeiro (`DECISOES.md#d370`). Fixa e curta de
 * propósito: pega quem escolhe a mais fácil, sem rede no envio.
 */
const SENHAS_COMUNS = new Set([
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
]);

/** A frase da recusa, a mesma no cadastro e na senha nova. */
export const RECUSA_SENHA_COMUM =
  "Essa senha é das primeiras que alguém tenta. Escolha outra.";

/**
 * Verdadeiro para a senha da lista, a de um caractere só repetido e a parte
 * local do e-mail, com ou sem `123` no fim. Em minúsculas, sem as pontas.
 */
export function senhaComum(senha: string, email: string): boolean {
  const s = senha.trim().toLowerCase();
  if (SENHAS_COMUNS.has(s)) return true;
  if (s.length > 0 && [...s].every((c) => c === s[0])) return true;
  const local = email.trim().toLowerCase().split("@")[0];
  return !!local && (s === local || s === `${local}123`);
}
