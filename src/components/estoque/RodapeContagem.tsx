"use client";

import { Check, ClipboardList } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import type { ResumoDaContagem } from "@/lib/domain/estoque";

/**
 * O rodapé preso ao pé da tela, no mesmo padrão dos outros quatro.
 *
 * A pergunta que ele responde é "quantas eu já fiz?", e ela não pode depender de
 * rolar trinta e quatro linhas até o fim. O número que muda a cada toque fica
 * grande; a frase embaixo diz o que acontece com o que ficou em branco, que é a
 * parte que ninguém adivinha.
 */
export function RodapeContagem({
  resumo,
  aoSalvar,
}: {
  resumo: ResumoDaContagem;
  aoSalvar: () => void;
}) {
  const { contadas, zeradas, intocadas, total } = resumo;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 lg:px-5">
          <div className="min-w-0">
            <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
              A despensa de hoje
            </p>
            <p className="num mt-0.5 text-heading font-semibold text-ink">
              {contadas} de {total} {contadas === 1 ? "contado" : "contados"}
              {zeradas > 0 && (
                <>
                  <span className="mx-1.5 font-normal text-ink-subtle">·</span>
                  <span className="text-body font-medium text-ink-muted">
                    {zeradas} {zeradas === 1 ? "zerado" : "zerados"}
                  </span>
                </>
              )}
            </p>
          </div>

          <Botao
            variante="primaria"
            tamanho="lg"
            disabled={contadas === 0}
            onClick={aoSalvar}
          >
            Salvar a contagem
          </Botao>
        </div>

        <p className="flex items-start gap-2.5 border-t border-line bg-sunken px-4 py-2.5 text-label text-ink-muted lg:px-5">
          {contadas > 0 ? (
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-positive"
              strokeWidth={2}
            />
          ) : (
            <ClipboardList
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          )}
          <span className="max-w-[64ch]" aria-live="polite">
            {contadas === 0 ? (
              <>
                Digite o que você está vendo na despensa. Não precisa contar
                tudo: o que ficar em branco não é gravado.
              </>
            ) : intocadas > 0 ? (
              <>
                Salvar grava{" "}
                <strong className="num font-semibold text-ink">
                  {contadas}
                </strong>{" "}
                {contadas === 1 ? "linha" : "linhas"} com a data de hoje.{" "}
                {intocadas === 1
                  ? "A que ficou em branco continua"
                  : `As ${intocadas} em branco continuam`}{" "}
                com a data que já tinha.
              </>
            ) : (
              <>
                A despensa inteira contada hoje. Salvar grava as{" "}
                <strong className="num font-semibold text-ink">{total}</strong>{" "}
                linhas com a data de hoje.
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
