/**
 * O modo de preparo é texto, um passo por linha (`DECISOES.md#d342`): colado
 * do caderno ou do WhatsApp, sem lista de campos. Linha em branco não é passo,
 * e o `\r` do que veio do Windows sai junto com o espaço das pontas.
 */
export function passosDoPreparo(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}
