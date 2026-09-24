import type { CSSProperties } from "react";
import type { CorDaLoja } from "@/lib/domain/cardapio";

/**
 * A cor dela como os dois tokens que a página lê (`--loja`, `--on-loja`,
 * `DECISOES.md#d166`); sem cor, `undefined`, e valem os do Rende. A tinta
 * escura é a `--brand-800`, que não inverte no tema escuro.
 *
 * Fora do módulo do cliente porque a página, de servidor, também chama. E vai
 * em dois lugares: no `<main>` e dentro de cada `Painel`, que abre num portal
 * fora dele e não herdaria a cor.
 */
export function estiloDaLoja(
  cor: CorDaLoja | undefined,
): CSSProperties | undefined {
  if (!cor) return undefined;
  return {
    "--loja": cor.fundo,
    "--on-loja": cor.tinta === "clara" ? "var(--on-brand)" : "var(--brand-800)",
  } as CSSProperties;
}
