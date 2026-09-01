"use client";

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Detecta o cliente sem gravar estado dentro de um efeito. */
const SEM_INSCRICAO = () => () => {};

export interface PainelProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
}

/**
 * Uma superfície flutuante, dois arranjos: folha inferior no celular, painel
 * lateral no desktop. Mesmo componente, mesma API, mesma hierarquia de
 * conteúdo. Modal centralizado fica reservado a confirmação destrutiva.
 *
 * Fica sempre montado e é a propriedade `aberto` que dirige a transição, em vez
 * de um par de estados com temporizador. `inert` tira o conteúdo fechado da
 * ordem de foco e do leitor de tela sem precisar desmontá-lo.
 */
export function Painel({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
}: PainelProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const noCliente = useSyncExternalStore(
    SEM_INSCRICAO,
    () => true,
    () => false,
  );

  // Trava a rolagem do fundo enquanto está aberto.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // Leva o foco para dentro ao abrir e devolve a quem o tinha ao fechar.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = painelRef.current?.querySelector<HTMLElement>(FOCAVEIS);
    (alvo ?? painelRef.current)?.focus();
    return () => anterior?.focus?.();
  }, [aberto]);

  const aoTeclar = useCallback(
    (evento: KeyboardEvent<HTMLDivElement>) => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        aoFechar();
        return;
      }

      if (evento.key !== "Tab" || !painelRef.current) return;

      const focaveis = Array.from(
        painelRef.current.querySelectorAll<HTMLElement>(FOCAVEIS),
      ).filter((elemento) => elemento.offsetParent !== null);
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0]!;
      const ultimo = focaveis[focaveis.length - 1]!;

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    },
    [aoFechar],
  );

  if (!noCliente) return null;

  return createPortal(
    <div
      inert={!aberto}
      className={cn(
        "fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end",
        aberto ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={aoFechar}
        className={cn(
          "absolute inset-0 bg-wine-900/35 transition-opacity duration-260 ease-quart",
          aberto ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onKeyDown={aoTeclar}
        className={cn(
          "relative flex w-full flex-col bg-surface shadow-overlay outline-none",
          "max-h-[92dvh] rounded-t-xl",
          "lg:h-full lg:max-h-none lg:w-md lg:rounded-none lg:rounded-l-xl",
          "transition-transform duration-260 ease-quart motion-reduce:transition-opacity",
          aberto
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-y-0 lg:translate-x-full",
        )}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 pb-4 pt-3 lg:pt-5">
          <div className="min-w-0 flex-1">
            <div
              aria-hidden
              className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong lg:hidden"
            />
            <h2 className="font-display text-title font-semibold text-ink">
              {titulo}
            </h2>
            {descricao && (
              <p className="mt-1 text-label text-ink-muted">{descricao}</p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="toque -mr-2 mt-1 flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>

        {rodape && (
          <footer className="area-segura-inferior shrink-0 border-t border-line bg-surface px-5 py-4">
            {rodape}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
