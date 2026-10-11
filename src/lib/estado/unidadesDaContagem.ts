import type { UnidadeDoCampo } from "@/lib/domain/estoque";

/**
 * Em que unidade ela deixou cada linha da contagem, por material e por aparelho
 * (`DECISOES.md#d329`). Navegador que bloqueia armazenamento lança no acesso:
 * tudo em `try/catch`, e quem não pode guardar só volta ao padrão.
 */
const CHAVE = "rende:contagem:unidades";

export function lerUnidadesDaContagem(): Record<string, UnidadeDoCampo> {
  try {
    const lido: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "{}");
    if (!lido || typeof lido !== "object") return {};
    return Object.fromEntries(
      Object.entries(lido).filter(
        (par): par is [string, UnidadeDoCampo] =>
          par[1] === "embalagem" || par[1] === "base",
      ),
    );
  } catch {
    return {};
  }
}

export function guardarUnidadeDaContagem(
  insumoId: string,
  unidade: UnidadeDoCampo,
): void {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ ...lerUnidadesDaContagem(), [insumoId]: unidade }),
    );
  } catch {
    // Sem armazenamento, sem lembrança.
  }
}
