import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { rotuloNovidade, type Novidade } from "./novidades";

/**
 * "O que mudou": cada linha é a novidade e a porta para ela (`DECISOES.md#d298`).
 * A lista já chega filtrada pelos 90 dias e pelo aparelho.
 */
export function OQueMudou({ novidades }: { novidades: readonly Novidade[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {novidades.map((novidade) => (
        <li key={novidade.titulo}>
          <Link
            href={novidade.href}
            className="flex items-start gap-3 px-4 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
          >
            <span className="min-w-0 flex-1">
              <time
                dateTime={novidade.dataISO}
                className="block text-micro text-ink-muted"
              >
                {rotuloNovidade(novidade.dataISO)}
              </time>
              <span className="mt-0.5 block text-body font-semibold text-ink">
                {novidade.titulo}
              </span>
              <span className="mt-1 block max-w-[56ch] text-label text-ink-muted">
                {novidade.frase}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
