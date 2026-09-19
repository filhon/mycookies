import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import type { Centavos } from "@/lib/types";

/**
 * A faixa rebaixada entre o cabeçalho e a agenda: "A receber" e "Entregas a
 * pagar" têm o mesmo desenho porque têm o mesmo peso, e a agenda continua sendo
 * o que ela veio ver. Não é cartão nem KPI.
 *
 * Três linhas fixas, e não um `flex-wrap`: com `max-w` no parágrafo, o
 * `w-full` deixava de forçar a quebra no desktop, e a frase subia para o lado
 * do valor enquanto no celular descia. O nome e o valor dividem a primeira
 * linha; a frase fica embaixo; a ação, quando há, encosta à direita no
 * desktop e desce no celular.
 */
export function FaixaResumo({
  id,
  icone: Icone,
  titulo,
  valor,
  acao,
  children,
}: {
  id: string;
  icone: LucideIcon;
  titulo: string;
  valor?: Centavos;
  acao?: ReactNode;
  /** A frase que diz o que o valor é. */
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-2 rounded-lg border border-line bg-sunken px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id={id}
            className="flex items-center gap-2 text-label font-medium text-ink-muted"
          >
            <Icone aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            <span>{titulo}</span>
          </h2>
          {valor !== undefined && <Dinheiro centavos={valor} />}
        </div>

        <p className="mt-1 max-w-[64ch] text-label text-ink-muted">
          {children}
        </p>
      </div>

      {acao && <div className="mt-3 shrink-0 sm:mt-0">{acao}</div>}
    </section>
  );
}
