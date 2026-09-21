/**
 * O que `/api/conta/exportar`, `/api/conta/encerrar`, o componente `MeusDados`
 * e o script de purga compartilham (spec 029).
 *
 * Puro: nenhuma importação de Firebase ou React. `paraExportavel` reconhece
 * `Timestamp` por duck-typing — o do Admin SDK e o do cliente têm o mesmo
 * `toDate()`, e o domínio não precisa importar nenhum dos dois.
 */

/** Dias, depois de `encerradaEm`, dentro dos quais a purga roda. É o que `/privacidade` promete. */
export const DIAS_ATE_A_PURGA = 30;

export const FORMATO_EXPORTACAO = "rende-exportacao/1";

function temToDate(valor: unknown): valor is { toDate: () => Date } {
  return (
    typeof valor === "object" &&
    valor !== null &&
    typeof (valor as { toDate?: unknown }).toDate === "function"
  );
}

/**
 * Prepara um valor do Firestore para `JSON.stringify`: `Timestamp` (qualquer
 * objeto com `toDate()`) vira ISO 8601; arrays e objetos são percorridos;
 * o resto passa como está.
 */
export function paraExportavel(valor: unknown): unknown {
  if (temToDate(valor)) return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(paraExportavel);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [
        chave,
        paraExportavel(item),
      ]),
    );
  }
  return valor;
}

/** "MyCookie's" + "2026-09-21" → `rende-mycookies-2026-09-21.json`. */
export function nomeDoArquivoDeExportacao(
  nomeDoNegocio: string,
  dataISO: string,
): string {
  const slug = nomeDoNegocio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `rende-${slug}-${dataISO}.json` : `rende-${dataISO}.json`;
}

export type FalhaMeusDados =
  | "sem-acesso"
  | "fora-de-forma"
  | "sem-configuracao" // servidor sem credencial, ou sem Stripe com assinatura no documento
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_MEUS_DADOS: Record<FalhaMeusDados, string> = {
  "sem-acesso":
    "Não deu para confirmar quem você é. Saia, entre de novo e tente outra vez.",
  "fora-de-forma": "Não foi possível abrir isso. Tente de novo.",
  "sem-configuracao":
    "Isso ainda não está configurado neste servidor. Avise quem cuida do Rende.",
  "sem-resposta":
    "O servidor demorou demais para responder. Tente de novo em instantes.",
  "sem-rede": "Isso precisa de internet. Conecte e tente de novo.",
};
