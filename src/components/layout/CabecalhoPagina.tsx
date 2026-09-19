import type { Route } from "next";
import type { ReactNode } from "react";
import { LinkVoltar } from "@/components/ui/LinkVoltar";
import { cn } from "@/lib/utils/cn";

/**
 * Duas faixas no mesmo `<header>` grudento (`DECISOES.md#d128`).
 *
 * A de contexto é a tinta da marca, sangrando até a borda da área de conteúdo:
 * é o que separa "tela do Rende" de "página com uma barra ao lado". Sem filete
 * embaixo, a tinta é a borda. A de ferramentas (busca, pílulas, aviso) fica no
 * papel, e só existe quando há `children`.
 *
 * As ações vêm de fora e não sabem que estão sobre a tinta: `sobre-marca` é um
 * escopo de tokens (`globals.css`), e o botão secundário, o terciário, o link
 * de voltar e o ícone invertem sozinhos. O primário âmbar e o selo de
 * sincronização têm contraste próprio e não mudam.
 *
 * Com o teclado aberto (`apertado:`) o voltar some e o respiro encolhe: o botão
 * físico de voltar do Android existe e fecha o teclado antes de sair, e numa
 * lista com a busca focada cada pixel a menos de cabeçalho é lista a mais.
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  voltar,
  acao,
  children,
  className,
}: {
  titulo: string;
  /** Nó, e não texto: o código do pedido vai em `num`. */
  descricao?: ReactNode;
  /** O caminho de volta das telas fora do menu: para onde, e o nome de lá. */
  voltar?: { href: Route; rotulo: string };
  acao?: ReactNode;
  /** Filtros, busca ou resumo que acompanham o título. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("sticky top-0 z-30", className)}>
      <div className="sangria sobre-marca bg-brand-700 pb-3 pt-4 apertado:py-2 lg:pb-5 lg:pt-8">
        {voltar && (
          <LinkVoltar href={voltar.href} className="apertado:hidden">
            {voltar.rotulo}
          </LinkVoltar>
        )}

        <div
          className={cn(
            "flex items-start justify-between gap-4",
            voltar && "mt-1 apertado:mt-0",
          )}
        >
          <div className="min-w-0">
            <h1 className="truncate font-display text-title font-semibold text-on-brand lg:text-display">
              {titulo}
            </h1>
            {descricao && (
              <p className="mt-1 max-w-[52ch] text-label text-on-brand-muted lg:text-body">
                {descricao}
              </p>
            )}
          </div>
          {acao && <div className="shrink-0">{acao}</div>}
        </div>
      </div>

      {children && (
        <div className="sangria border-b border-line bg-canvas py-3 lg:py-4">
          {children}
        </div>
      )}
    </header>
  );
}
