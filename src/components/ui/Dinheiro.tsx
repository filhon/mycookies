import { formatarValor } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Tamanho = "sm" | "md" | "lg" | "xl";

const TAMANHOS: Record<Tamanho, { valor: string; simbolo: string }> = {
  sm: { valor: "text-label", simbolo: "text-[0.6875rem]" },
  md: { valor: "text-body", simbolo: "text-micro" },
  lg: { valor: "text-heading", simbolo: "text-label" },
  xl: { valor: "font-display text-display", simbolo: "text-subheading" },
};

export function Dinheiro({
  centavos,
  tamanho = "md",
  /** Colore por sinal e prefixa + / −. Só onde o sinal é a informação. */
  comSinal = false,
  className,
}: {
  centavos: Centavos;
  tamanho?: Tamanho;
  comSinal?: boolean;
  className?: string;
}) {
  const escala = TAMANHOS[tamanho];
  const negativo = centavos < 0;

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 whitespace-nowrap",
        comSinal && (negativo ? "text-negative" : "text-positive"),
        className,
      )}
    >
      <span className={cn("font-medium text-ink-muted", escala.simbolo)}>
        R$
      </span>
      <span className={cn("num font-semibold", escala.valor)}>
        {comSinal && (negativo ? "−" : "+")}
        {formatarValor(Math.abs(centavos))}
      </span>
    </span>
  );
}
