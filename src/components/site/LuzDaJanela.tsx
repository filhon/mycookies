"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A luz da janela sobre a bancada, atrás do cartão da conta (spec 067,
 * `DECISOES.md#d255`): uma mancha de sol com a sombra do caixilho, em laço
 * lento. O desenho e o movimento moram na `.luz-da-janela` de `globals.css`;
 * aqui só a pausa fora da tela. Com a aba oculta o navegador já para.
 */
export function LuzDaJanela({ children }: { children: ReactNode }) {
  const luz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = luz.current;
    if (!el) return;
    const observador = new IntersectionObserver((entradas) => {
      const visivel = entradas.at(-1)?.isIntersecting;
      el.style.animationPlayState = visivel ? "" : "paused";
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div className="relative isolate">
      <div
        ref={luz}
        aria-hidden
        className="luz-da-janela pointer-events-none absolute -z-10"
      />
      {children}
    </div>
  );
}
