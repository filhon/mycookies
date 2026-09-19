import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O `tailwind-merge` só conhece a escala de texto padrão (`text-sm`, `text-lg`…).
 * Sem esta lista ele lê `text-label` como cor, acha que `text-label text-ink`
 * é um conflito e descarta o primeiro: o rótulo perdia o tamanho, e o botão
 * secundário perdia a tinta. Os nomes são os de `@theme inline` em
 * `globals.css`; um tamanho novo entra nos dois lugares.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "title",
        "heading",
        "subheading",
        "body",
        "label",
        "micro",
      ],
    },
  },
});

export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
