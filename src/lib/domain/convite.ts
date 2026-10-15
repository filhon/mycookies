/**
 * O convite de fundadora (spec 181): o código que vira uma conta no beta.
 *
 * Puro: o sorteio recebe a fonte de aleatoriedade (`crypto.getRandomValues` no
 * servidor, uma sequência fixa no teste). O código mora no id do documento
 * `contas/{dona}/convites/{codigo}` e no link `/convite/{codigo}`.
 */

/** 31 símbolos, sem 0/O e 1/I/L: o código é ditado e copiado de print. */
export const ALFABETO_DO_CONVITE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TAMANHO_DO_CODIGO = 8;
/** A cota de cada fundadora, `Conta.beta.convites` ao nascer. */
export const CONVITES_POR_FUNDADORA = 5;

/** O maior múltiplo de 31 que cabe num byte: acima dele, o byte é jogado fora. */
const TETO_SEM_VIES = 256 - (256 % ALFABETO_DO_CONVITE.length);

/**
 * Oito símbolos sorteados, ~39 bits. Bytes de 248 a 255 são descartados para
 * que nenhum símbolo saia mais que os outros.
 */
export function gerarCodigo(
  aleatorio: (bytes: Uint8Array) => Uint8Array,
): string {
  let codigo = "";
  while (codigo.length < TAMANHO_DO_CODIGO) {
    for (const byte of aleatorio(new Uint8Array(TAMANHO_DO_CODIGO))) {
      if (byte >= TETO_SEM_VIES) continue;
      codigo += ALFABETO_DO_CONVITE[byte % ALFABETO_DO_CONVITE.length];
      if (codigo.length === TAMANHO_DO_CODIGO) break;
    }
  }
  return codigo;
}

/** "K7Q3M9XA" → "K7Q3-M9XA", como a tela e o e-mail mostram. */
export function formatarCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

/**
 * O que ela digitou ou o que veio no link → o código, ou `null`. Aceita
 * minúsculas, espaço e hífen; qualquer outro símbolo, ou outro tamanho, é
 * `null`.
 */
export function lerCodigo(texto: string): string | null {
  const codigo = texto.toUpperCase().replace(/[\s-]/g, "");
  if (codigo.length !== TAMANHO_DO_CODIGO) return null;
  for (const simbolo of codigo) {
    if (!ALFABETO_DO_CONVITE.includes(simbolo)) return null;
  }
  return codigo;
}
