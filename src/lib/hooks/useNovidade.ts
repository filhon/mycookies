"use client";

import { useSyncExternalStore } from "react";
import { haNovidade, NOVIDADES } from "@/components/comecar/novidades";
import { dataISODe } from "@/lib/domain/datas";

/** A data da mais nova que ela já viu neste aparelho (`DECISOES.md#d298`). */
const CHAVE = "rende:novidades-vistas";

const ouvintes = new Set<() => void>();

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Sem armazenamento, nada aparece: o aviso é o que se perde, e não a página. */
function lido(): boolean {
  try {
    return haNovidade(dataISODe(new Date()), localStorage.getItem(CHAVE));
  } catch {
    return false;
  }
}

/** "Novidade" ao lado de "Como funciona", até ela abrir a página. */
export function useHaNovidade(): boolean {
  return useSyncExternalStore(assinar, lido, () => false);
}

/** Abrir `/comecar` dá por vista a mais nova, e o aviso some no menu na hora. */
export function marcarNovidadesVistas() {
  const maisNova = NOVIDADES[0]?.dataISO;
  if (!maisNova) return;
  try {
    localStorage.setItem(CHAVE, maisNova);
  } catch {
    return;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}
