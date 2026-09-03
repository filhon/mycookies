"use client";

import { Check } from "lucide-react";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { numeroContado, rotuloDeIdade } from "@/lib/domain/estoque";
import type { LinhaDeContagem } from "@/lib/domain/estoque";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { cn } from "@/lib/utils/cn";

/**
 * Uma linha da contagem: o nome, o campo, e a frase que explica o número velho.
 *
 * **O campo nasce vazio**, e é a coisa mais importante desta tela. Semeá-lo com
 * o valor anterior seria mais confortável de digitar e destruiria a única coisa
 * que esta tela constrói: a diferença entre um número conferido e um número
 * herdado. Vazio é "não contei esta"; `0` é "contei, e não tem".
 *
 * A referência fica embaixo do nome, e não embaixo do campo: em 360px o campo
 * tem 112px, e "500 g · contada há 12 dias" quebraria em três linhas ali.
 */
export function LinhaContagem({
  linha,
  texto,
  aoMudar,
}: {
  linha: LinhaDeContagem;
  texto: string;
  aoMudar: (texto: string) => void;
}) {
  const digitado = texto.trim().length > 0;
  const valor = numeroContado(texto);
  const ilegivel = digitado && valor === null;
  const contado = valor !== null;

  return (
    <li className={cn("px-4 py-3 lg:px-5", contado && "bg-sunken")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`contagem-${linha.insumoId}`}
            className="block truncate text-body font-medium text-ink"
          >
            {linha.nome}
          </label>

          <p
            id={`contagem-${linha.insumoId}-referencia`}
            className={cn(
              "num mt-0.5 flex items-center gap-1.5 text-label",
              ilegivel
                ? "text-negative"
                : contado
                  ? "text-ink"
                  : "text-ink-muted",
            )}
          >
            {contado && !ilegivel && (
              <Check
                aria-hidden
                className="size-3.5 shrink-0 text-positive"
                strokeWidth={2.5}
              />
            )}
            <span className="truncate">
              {ilegivel
                ? "não deu para ler este número"
                : contado
                  ? consequencia(valor, linha)
                  : referencia(linha)}
            </span>
          </p>
        </div>

        <div className="relative w-28 shrink-0">
          <input
            id={`contagem-${linha.insumoId}`}
            // Teclado numérico com vírgula, e não `type="number"`: a seta de
            // incremento não serve para contar despensa, e o teclado do celular
            // precisa oferecer a vírgula decimal.
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            placeholder="—"
            value={texto}
            aria-describedby={`contagem-${linha.insumoId}-referencia`}
            aria-invalid={ilegivel ? true : undefined}
            onChange={(evento) => aoMudar(evento.target.value)}
            className={cn(
              BASE_CONTROLE,
              "num pr-10 text-right font-semibold",
              ilegivel ? "border-negative" : "border-line-strong",
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-muted"
          >
            {linha.unidadeBase}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * O que está gravado hoje, com a idade — é a frase que explica por que a lista
 * de compras está comprando o que ela acha que já tem.
 */
function referencia(linha: LinhaDeContagem): string {
  const { contagem, unidadeBase } = linha;
  if (contagem.anotado === null) return "nunca contada";

  const quanto = formatarQuantidade(contagem.anotado, unidadeBase);
  if (contagem.frescor === "NUNCA") return `${quanto} anotados, sem contagem`;
  return `${quanto} · ${rotuloDeIdade(contagem)}`;
}

/** O número que ela acabou de digitar, com a consequência dele. */
function consequencia(valor: number, linha: LinhaDeContagem): string {
  if (valor === 0) return "zero: conferido, e não tem";
  return `${formatarQuantidade(valor, linha.unidadeBase)}, contados hoje`;
}
