import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TomSelo =
  "neutro" | "marca" | "positivo" | "atencao" | "negativo" | "info";

type Tom = TomSelo;

const TONS: Record<Tom, string> = {
  neutro: "bg-sunken text-ink-muted",
  marca: "bg-brand-100 text-brand-ink",
  positivo: "bg-positive-soft text-positive",
  atencao: "bg-attention-soft text-attention",
  negativo: "bg-negative-soft text-negative",
  info: "bg-info-soft text-info",
};

/**
 * O ícone não é enfeite: é o que sustenta o significado quando a cor não pode
 * ser o único portador. O âmbar da marca e o ocre de atenção dividem matiz.
 */
export function Selo({
  tom = "neutro",
  icone,
  children,
  className,
}: {
  tom?: Tom;
  icone?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-micro font-medium",
        TONS[tom],
        className,
      )}
    >
      {icone}
      {children}
    </span>
  );
}

/**
 * O selo sem fundo: o segundo e o terceiro fato de uma linha, que acompanham o
 * status sem disputar com ele. Numa linha de pedido em 360px, três pílulas
 * preenchidas viram duas linhas de cor; uma pílula e dois marcadores viram uma
 * linha que se lê. O ícone continua carregando o sentido, e pode levar a cor.
 */
export function Marcador({
  icone,
  children,
  className,
}: {
  icone?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-micro font-medium text-ink-muted",
        className,
      )}
    >
      {icone}
      {children}
    </span>
  );
}
