/**
 * A nota que chega pelo "Compartilhar" do Android (spec 092, `#d294`).
 *
 * O service worker guarda, `TelaNota` tira. Só `caches`, `File` e `Response`:
 * o módulo roda nos dois escopos, o da página e o do worker.
 */
export const CACHE_NOTA_COMPARTILHADA = "nota-compartilhada";
export const ENTRADA_NOTA_COMPARTILHADA = "/insumos/nota/compartilhada";

/**
 * O arquivo guardado, ou `null`. Não apaga: quem chama apaga com
 * `esquecerNotaCompartilhada` depois de ficar com ele, para o `StrictMode`, que
 * monta duas vezes, não perder a nota na primeira desmontagem.
 */
export async function notaCompartilhada(): Promise<File | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NOTA_COMPARTILHADA);
    const resposta = await cache.match(ENTRADA_NOTA_COMPARTILHADA);
    if (!resposta) return null;
    const tipo = resposta.headers.get("content-type") ?? "";
    const nome = decodeURIComponent(resposta.headers.get("x-nome") ?? "nota");
    return new File([await resposta.blob()], nome, { type: tipo });
  } catch {
    return null;
  }
}

export async function esquecerNotaCompartilhada(): Promise<void> {
  try {
    await caches.delete(CACHE_NOTA_COMPARTILHADA);
  } catch {
    // Fica no cache, e a próxima substitui.
  }
}
