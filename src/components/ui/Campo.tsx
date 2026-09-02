"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

const BASE_CONTROLE =
  "h-12 w-full rounded-md border bg-surface px-3 text-body text-ink " +
  "transition-colors duration-150 ease-quart placeholder:text-ink-subtle " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted";

interface EnvelopeProps {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}

/** Rótulo sempre visível acima do controle. Placeholder nunca substitui rótulo. */
function Envelope({
  id,
  rotulo,
  dica,
  erro,
  obrigatorio,
  children,
  className,
}: EnvelopeProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {rotulo}
        {obrigatorio && (
          <span className="ml-1 text-ink-subtle" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-label text-negative">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-label text-ink-muted">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export interface CampoProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  sufixo?: ReactNode;
  className?: string;
  /**
   * O `ref` chega ao `input`, e não ao envelope. É o que permite entregar o
   * campo a quem controla o formulário por referência, como o
   * `register` do react-hook-form no editor de ficha.
   */
  ref?: Ref<HTMLInputElement>;
}

export function Campo({
  rotulo,
  dica,
  erro,
  sufixo,
  className,
  required,
  ...props
}: CampoProps) {
  const id = useId();

  return (
    <Envelope
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      obrigatorio={required}
      className={className}
    >
      <div className="relative">
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            erro ? `${id}-erro` : dica ? `${id}-dica` : undefined
          }
          className={cn(
            BASE_CONTROLE,
            erro ? "border-negative" : "border-line-strong",
            sufixo && "pr-14",
          )}
          {...props}
        />
        {sufixo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-muted">
            {sufixo}
          </span>
        )}
      </div>
    </Envelope>
  );
}

export interface SeletorProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id"
> {
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  className?: string;
  /** Mesma razão do `ref` de `Campo`. */
  ref?: Ref<HTMLSelectElement>;
}

export function Seletor({
  rotulo,
  dica,
  erro,
  className,
  required,
  children,
  ...props
}: SeletorProps) {
  const id = useId();

  return (
    <Envelope
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      obrigatorio={required}
      className={className}
    >
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        className={cn(
          BASE_CONTROLE,
          "appearance-none bg-size-[1rem] bg-[right:0.75rem_center] bg-no-repeat pr-10",
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23807066%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")]',
          erro ? "border-negative" : "border-line-strong",
        )}
        {...props}
      >
        {children}
      </select>
    </Envelope>
  );
}

export { Envelope as EnvelopeCampo, BASE_CONTROLE };
