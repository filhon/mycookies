import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A moldura dos rodapés presos ao pé da tela.
 *
 * A conta `4.5rem + safe-area` é a altura da navegação inferior, e estava
 * copiada em cinco telas. Com o teclado aberto a navegação some, e sem um dono
 * único cada uma dessas barras ficaria flutuando sobre um vão de 72px — por
 * isso o `apertado:bottom-0` mora aqui, e não em cada tela.
 *
 * `className` existe para a única variação que há hoje: a barra de salvar de
 * `/configuracao`, que é só de celular.
 */
export function RodapeFixo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4",
        "apertado:bottom-0 lg:bottom-0 lg:left-60 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        {children}
      </div>
    </div>
  );
}
