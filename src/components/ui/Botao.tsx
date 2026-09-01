"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
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
