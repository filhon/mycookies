"use client";

import { ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
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
  /** Fixo à esquerda, como o `R$` do campo monetário: o `@` do Instagram. */
  prefixo?: ReactNode;
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
  prefixo,
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
        {prefixo && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-label font-medium text-ink-muted">
            {prefixo}
          </span>
        )}
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            erro ? `${id}-erro` : dica ? `${id}-dica` : undefined
          }
          className={cn(
            BASE_CONTROLE,
            erro ? "border-negative" : "border-line-strong",
            prefixo && "pl-8",
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

/**
 * A senha com o olho (`DECISOES.md#d193`): dedo com farinha e teclado de
 * celular, e só o Edge mostra o que se digita. O `sufixo` de `Campo` não serve,
 * porque é `pointer-events-none`. O rótulo do botão não muda: quem diz se a
 * senha está à mostra é o `aria-pressed`.
 */
export function CampoSenha({
  rotulo,
  dica,
  erro,
  className,
  required,
  ...props
}: Omit<CampoProps, "type" | "prefixo" | "sufixo">) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);
  const Icone = visivel ? EyeOff : Eye;

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
          type={visivel ? "text" : "password"}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            erro ? `${id}-erro` : dica ? `${id}-dica` : undefined
          }
          className={cn(
            BASE_CONTROLE,
            "pr-12",
            erro ? "border-negative" : "border-line-strong",
          )}
          {...props}
        />
        {/* `preventDefault` no toque: o foco fica no campo, e o teclado do
            celular não fecha. */}
        <button
          type="button"
          aria-label="Mostrar senha"
          aria-pressed={visivel}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => setVisivel((v) => !v)}
          className="absolute inset-y-0 right-0.5 my-auto flex size-11 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          <Icone aria-hidden strokeWidth={1.75} className="size-5" />
        </button>
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
      {/* A seta é um ícone de verdade, e não um SVG embutido no CSS: dentro de
          uma URL de dados não se lê variável, e a cor ficaria presa a um valor
          solto que não acompanha o tema. */}
      <div className="relative">
        <select
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            erro ? `${id}-erro` : dica ? `${id}-dica` : undefined
          }
          className={cn(
            BASE_CONTROLE,
            "appearance-none pr-10",
            erro ? "border-negative" : "border-line-strong",
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-5 text-ink-muted"
        />
      </div>
    </Envelope>
  );
}

export interface AreaTextoProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> {
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
  className?: string;
  /** Mesma razão do `ref` de `Campo`. */
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * O campo de mais de uma linha: observações do pedido, dados do Pix, a
 * descrição do produto. Era um `<textarea>` copiado em cinco telas, nenhum com
 * estado de erro nem de desabilitado — o mesmo controle de `Campo`, sem a
 * altura fixa.
 */
export function AreaTexto({
  rotulo,
  dica,
  erro,
  className,
  required,
  rows = 3,
  ...props
}: AreaTextoProps) {
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
      <textarea
        id={id}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        className={cn(
          BASE_CONTROLE,
          "h-auto py-2.5",
          erro ? "border-negative" : "border-line-strong",
        )}
        {...props}
      />
    </Envelope>
  );
}

export { BASE_CONTROLE };

/**
 * Depois de o Salvar recusar: leva o foco ao primeiro campo com erro. No quadro
 * seguinte, porque a dobra "Mais detalhes" abre no mesmo render que pinta o
 * erro (020), e `focus()` em elemento oculto falha em silêncio.
 */
export function focarPrimeiroErro() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
