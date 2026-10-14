"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import {
  classesBotao,
  type TamanhoBotao,
  type VarianteBotao,
} from "./estilosBotao";

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  iconeInicial?: ReactNode;
  larguraTotal?: boolean;
  /** React 19: chega como prop e segue no `...props` até o `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

export function Botao({
  variante = "secundaria",
  tamanho = "md",
  carregando = false,
  iconeInicial,
  larguraTotal = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classesBotao({ variante, tamanho, larguraTotal, className })}
      {...props}
    >
      {carregando ? (
        <Loader2 aria-hidden className="size-[1.15em] animate-spin" />
      ) : (
        iconeInicial
      )}
      {children}
    </button>
  );
}
