import { TEMPO_LIMITE_CNPJ_MS } from "@/lib/domain/notaFiscal";

/**
 * A consulta pública de CNPJ, de `/api/nota` e de `/api/mei/cnpj`
 * (`DECISOES.md#d52`, `#d359`).
 *
 * Timeout, 429 ou 404 não são erro: viram `null`, e quem chama segue com o
 * que tinha. Devolve a resposta crua; **cada rota a reduz aos campos dela**
 * antes de responder, porque ela traz endereço, telefone, e-mail e a lista de
 * sócios, nomes de pessoas reais que não têm o que fazer no navegador.
 */
export async function perguntarCnpj(cnpj: string): Promise<unknown> {
  try {
    const resposta = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE_CNPJ_MS),
    });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  }
}
