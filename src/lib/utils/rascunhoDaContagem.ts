import {
  lerRascunhoDaContagem,
  type RascunhoDaContagem,
  type UnidadeDoCampo,
} from "@/lib/domain/estoque";
import type { DataISO } from "@/lib/types";

/*
 * A contagem pela metade no `localStorage` (spec 127, `DECISOES.md#d332`), no
 * padrão do rascunho da porta (`#d189`): navegador que bloqueia armazenamento
 * lança no acesso, tudo em `try/catch`, e quem não pode guardar conta como antes.
 */

const chave = (contaId: string) => `rende:contagem:${contaId}`;

export function lerRascunho(
  contaId: string,
  hoje: DataISO,
): RascunhoDaContagem | null {
  try {
    return lerRascunhoDaContagem(localStorage.getItem(chave(contaId)), hoje);
  } catch {
    return null;
  }
}

/** Linha apagada até o vazio sai do rascunho; sem linha nenhuma, ele some. */
export function guardarRascunho(
  contaId: string,
  dia: DataISO,
  digitados: Record<string, string>,
  unidades: Record<string, UnidadeDoCampo>,
): void {
  const preenchidos = Object.fromEntries(
    Object.entries(digitados).filter(([, texto]) => texto.trim() !== ""),
  );
  if (Object.keys(preenchidos).length === 0) {
    apagarRascunho(contaId);
    return;
  }
  try {
    const rascunho: RascunhoDaContagem = {
      v: 1,
      dia,
      digitados: preenchidos,
      unidades,
      salvoEm: Date.now(),
    };
    localStorage.setItem(chave(contaId), JSON.stringify(rascunho));
  } catch {
    // Sem armazenamento, sem rascunho.
  }
}

export function apagarRascunho(contaId: string): void {
  try {
    localStorage.removeItem(chave(contaId));
  } catch {
    // Idem.
  }
}
