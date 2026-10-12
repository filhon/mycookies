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
 *
 * Uma chave por tela (`#d336`): a despensa e o pronto contam coisas diferentes,
 * e um rascunho não pode voltar na tela do outro.
 */

export const chaveDaDespensa = (contaId: string) => `rende:contagem:${contaId}`;
export const chaveDoPronto = (contaId: string) =>
  `rende:contagem-pronto:${contaId}`;

export function lerRascunho(
  chave: string,
  hoje: DataISO,
): RascunhoDaContagem | null {
  try {
    return lerRascunhoDaContagem(localStorage.getItem(chave), hoje);
  } catch {
    return null;
  }
}

/**
 * Linha apagada até o vazio sai do rascunho; sem linha nenhuma, ele some. O
 * pronto não tem unidade por linha, e guarda só `digitados`.
 */
export function guardarRascunho(
  chave: string,
  dia: DataISO,
  digitados: Record<string, string>,
  unidades?: Record<string, UnidadeDoCampo>,
): void {
  const preenchidos = Object.fromEntries(
    Object.entries(digitados).filter(([, texto]) => texto.trim() !== ""),
  );
  if (Object.keys(preenchidos).length === 0) {
    apagarRascunho(chave);
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
    localStorage.setItem(chave, JSON.stringify(rascunho));
  } catch {
    // Sem armazenamento, sem rascunho.
  }
}

export function apagarRascunho(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // Idem.
  }
}
