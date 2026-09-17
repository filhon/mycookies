import type { ReactNode } from "react";

/** Número dentro de uma frase. O dado tem peso; a frase não. */
export function Realce({ children }: { children: ReactNode }) {
  return <strong className="num font-semibold text-ink">{children}</strong>;
}
