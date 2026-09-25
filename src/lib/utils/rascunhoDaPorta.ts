import { useSyncExternalStore } from "react";
import {
  CHAVE_DO_RASCUNHO,
  lerRascunho,
  type EntradaDaPorta,
  type RascunhoDaPorta,
} from "@/lib/domain/calculadora";

/*
 * O rascunho da calculadora no `localStorage` (spec 040-B, `DECISOES.md#d189`).
 * Navegador que bloqueia armazenamento lança no acesso: tudo em `try/catch`, e
 * quem não pode guardar só perde o atalho.
 */

let lido: { texto: string | null; rascunho: RascunhoDaPorta | null } = {
  texto: null,
  rascunho: null,
};

/** Mesmo texto, mesmo objeto: `useSyncExternalStore` pede um retrato estável. */
function rascunhoDoAparelho(): RascunhoDaPorta | null {
  let texto: string | null = null;
  try {
    texto = localStorage.getItem(CHAVE_DO_RASCUNHO);
  } catch {
    // Sem armazenamento, sem rascunho.
  }
  if (texto !== lido.texto) {
    lido = { texto, rascunho: lerRascunho(texto, Date.now()) };
  }
  return lido.rascunho;
}

const semAssinatura = () => () => {};

/** O rascunho válido deste aparelho; `null` no servidor e em qualquer dúvida. */
export function useRascunhoDaPorta(): RascunhoDaPorta | null {
  return useSyncExternalStore(semAssinatura, rascunhoDoAparelho, () => null);
}

export function guardarRascunho(entrada: EntradaDaPorta): void {
  try {
    const rascunho: RascunhoDaPorta = { ...entrada, v: 1, salvoEm: Date.now() };
    localStorage.setItem(CHAVE_DO_RASCUNHO, JSON.stringify(rascunho));
  } catch {
    // Sem armazenamento, sem atalho.
  }
}

export function apagarRascunho(): void {
  try {
    localStorage.removeItem(CHAVE_DO_RASCUNHO);
  } catch {
    // Idem.
  }
}
