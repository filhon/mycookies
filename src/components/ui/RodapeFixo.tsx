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
 * `noPe` é para a tela que não tem navegação inferior no celular (os dois
 * editores, `DECISOES.md#d152`): o rodapé desce até o pé e ocupa a largura
 * toda, e o cartão perde o raio e as bordas de fora, com a área segura por
 * dentro — a superfície continua até embaixo do indicador do iPhone, em vez de
 * flutuar sobre uma tira de canvas. No desktop nada muda.
 *
 * `className` existe para a única variação que há hoje: a barra de salvar de
 * `/configuracao`, que é só de celular.
 */
export function RodapeFixo({
  children,
  className,
  noPe = false,
}: {
  children: ReactNode;
  className?: string;
  noPe?: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4",
        "apertado:bottom-0 lg:bottom-0 lg:left-60 lg:px-8",
        noPe && "bottom-0 px-0",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4",
          noPe &&
            "area-segura-inferior rounded-none border-x-0 border-b-0 lg:rounded-lg lg:border-x lg:border-b",
        )}
      >
        {children}
      </div>
    </div>
  );
}
