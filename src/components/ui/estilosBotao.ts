import { cn } from "@/lib/utils/cn";

export type VarianteBotao =
  "primaria" | "secundaria" | "terciaria" | "perigo" | "loja";
export type TamanhoBotao = "sm" | "md" | "lg";

const VARIANTES: Record<VarianteBotao, string> = {
  // O ponto: âmbar com tinta escura. É o único botão âmbar da tela.
  primaria:
    "bg-accent-500 text-on-accent hover:bg-accent-600 active:bg-accent-600 disabled:bg-accent-500",
  secundaria:
    "border border-line-strong bg-transparent text-ink hover:bg-sunken active:bg-line",
  terciaria:
    "bg-transparent text-brand-ink hover:bg-brand-100 active:bg-brand-100",
  // Nunca a marca: ela não pode significar destruição.
  perigo:
    "border border-negative/40 bg-transparent text-negative hover:bg-negative-soft active:bg-negative-soft",
  // O primário do cardápio público: a cor dela, e não o âmbar do Rende (`#d166`).
  loja: "bg-loja text-on-loja hover:brightness-95 active:brightness-90",
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: "h-11 px-3 text-label gap-1.5",
  md: "h-12 px-4 text-body gap-2",
  lg: "h-13 px-5 text-body gap-2",
};

/**
 * Classes do botão sem o elemento `button`. Existe para que um `Link` do Next
 * pareça um botão sem que o botão precise de um `asChild`: um link continua
 * sendo um link, com navegação e menu de contexto.
 *
 * Mora fora de Botao.tsx porque aquele módulo é `'use client'`, e componentes
 * de servidor não podem chamar funções exportadas de um módulo cliente.
 */
export function classesBotao({
  variante = "secundaria",
  tamanho = "md",
  larguraTotal = false,
  className,
}: {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  larguraTotal?: boolean;
  className?: string;
} = {}) {
  return cn(
    "toque inline-flex select-none items-center justify-center rounded-md font-medium",
    "transition-colors duration-150 ease-quart",
    "disabled:cursor-not-allowed disabled:opacity-45",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    larguraTotal && "w-full",
    className,
  );
}
