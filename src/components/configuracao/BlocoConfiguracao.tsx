import type { LucideIcon } from "lucide-react";
import { CornerDownRight, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type TomConsequencia = "neutro" | "atencao";

const TONS: Record<TomConsequencia, string> = {
  neutro: "border-line bg-sunken text-ink-muted",
  atencao: "border-attention/30 bg-attention-soft text-ink",
};

/**
 * Um bloco da configuração: os campos em cima, a consequência deles embaixo.
 *
 * A faixa de baixo é o que separa esta tela de um formulário de cadastro. Ela
 * não instrui ("informe suas despesas fixas"), ela conta o efeito em dinheiro
 * ("suas despesas fixas custam R$ 10,00 por hora produzida"), que é a única
 * forma de a Maynara saber se o número que digitou faz sentido.
 */
export function BlocoConfiguracao({
  icone: Icone,
  titulo,
  descricao,
  children,
  consequencia,
  tom = "neutro",
  recuado = true,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  consequencia?: ReactNode;
  tom?: TomConsequencia;
  /** Falso quando o conteúdo é uma lista que precisa sangrar até a borda. */
  recuado?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="px-4 py-5 lg:px-5">
        <div className="flex items-start gap-3">
          <Icone
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <h2 className="text-subheading font-semibold text-ink">{titulo}</h2>
            {descricao && (
              <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
                {descricao}
              </p>
            )}
          </div>
        </div>

        <div className={cn("mt-4 space-y-4", recuado && "lg:ml-8")}>
          {children}
        </div>
      </div>

      {/* A faixa não é região viva: o número muda a cada tecla, e um
          `aria-live` aqui leria a frase inteira a cada dígito digitado. */}
      {consequencia && (
        <div
          className={cn(
            "flex items-start gap-2.5 border-t px-4 py-3 text-label lg:px-5",
            TONS[tom],
          )}
        >
          {/* Ícone junto da cor: o tom de atenção nunca carrega sentido sozinho. */}
          {tom === "atencao" ? (
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-attention"
              strokeWidth={1.75}
            />
          ) : (
            <CornerDownRight
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          )}
          <p className="max-w-[60ch]">{consequencia}</p>
        </div>
      )}
    </section>
  );
}

/** Número dentro da frase de consequência. O dado tem peso; a frase não. */
export function Realce({ children }: { children: ReactNode }) {
  return <strong className="num font-semibold text-ink">{children}</strong>;
}
