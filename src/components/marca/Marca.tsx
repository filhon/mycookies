import { cn } from "@/lib/utils/cn";

/**
 * A marca Rende em tela (`docs/marca/rende/MARCA.md` § 2.1 e § 2.4).
 *
 * A regra que importa a quem mexer aqui: **o ponto âmbar é a assinatura**, é
 * único na tela e **nunca vira ícone de interface** — para isso existe o Lucide.
 * Onde o ponto marca dado (o painel de preço, o estado vazio) é a sessão C da
 * spec 033 que decide, e ela lista os únicos lugares em que ele pode aparecer.
 */

/**
 * O símbolo: a régua creme fechada pelo ponto âmbar, sobre tinta. É o SVG de
 * `logo/rende-simbolo.svg` com as cores nos tokens, para que a régua e o ponto
 * sigam o tema. Tamanho mínimo 48px (`size-12`); nenhum uso abaixo disso.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className={cn("size-12 shrink-0", className)}
    >
      <rect width="96" height="96" rx="21" fill="var(--brand-700)" />
      <rect
        x="13.2"
        y="42.48"
        width="38.4"
        height="11.04"
        rx="5.52"
        fill="var(--on-brand)"
      />
      <circle cx="70.8" cy="48" r="12" fill="var(--accent-500)" />
    </svg>
  );
}

/**
 * O logotipo: "rende" em Archivo 700, caixa baixa, fechado pelo ponto. É HTML,
 * e não o SVG do pacote: a Archivo já está na página, e um `<span>` herda
 * `currentColor` — a negativa sai de graça.
 *
 * A geometria é a de `logo/rende-principal.svg` (círculo de raio 11 num corpo
 * de 76, centro em 232 com o texto acabando em ~197): diâmetro `0.29em`, base
 * `0.04em` abaixo da linha de base, e um vão de `0.31em` depois do "e", medido
 * no navegador contra o SVG. O ponto não encosta: é um ponto final, e não a
 * cauda da letra. `md` (28px) é o menor tamanho que passa dos 88px de largura
 * que o manual exige; abaixo disso, só o símbolo.
 */
export function Logotipo({
  tamanho = "md",
  tom = "tinta",
  className,
}: {
  tamanho?: "md" | "lg";
  /** `negativa` é creme sobre tinta; `tinta` inverte com o tema. */
  tom?: "tinta" | "negativa";
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="Rende"
      className={cn(
        "inline-block whitespace-nowrap font-display font-bold lowercase leading-none tracking-[-0.03em]",
        tamanho === "lg" ? "text-[2.5rem]" : "text-[1.75rem]",
        tom === "negativa" ? "text-on-brand" : "text-brand-ink",
        className,
      )}
    >
      rende
      <span
        aria-hidden="true"
        className="ml-[0.31em] inline-block size-[0.29em] rounded-full bg-accent-500 align-[-0.04em]"
      />
    </span>
  );
}
