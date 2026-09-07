import type { ReactNode } from "react";
import { BarraLateral } from "./BarraLateral";
import { NavegacaoInferior } from "./NavegacaoInferior";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="textura-papel min-h-dvh bg-canvas">
      <BarraLateral />

      <div className="lg:pl-60">
        {/* pb-24 no celular reserva a faixa da navegação inferior; com o
            teclado aberto ela não está lá, e a reserva vira vão morto. */}
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 apertado:pb-4 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>

      <NavegacaoInferior />
    </div>
  );
}
