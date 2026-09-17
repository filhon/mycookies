import type { Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CLASSES =
  "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-30 flex h-13 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-wine-700 pl-4 pr-5 text-body font-semibold text-on-wine shadow-raised transition-colors duration-150 ease-quart hover:bg-wine-600 active:bg-wine-800 apertado:hidden lg:hidden";

/**
 * A ação primária ao alcance do polegar, acima da navegação inferior.
 *
 * Uma pílula com o nome da ação, e não um círculo com o sinal de mais: o
 * círculo é o botão do Android de 2019, e um "+" sozinho obriga a adivinhar o
 * que nasce dele. Centrada, porque é a ação da tela e não do polegar direito, e
 * porque no canto ela cobria a coluna do dinheiro da última linha. Sombra
 * baixa, de papel: o vinho sobre o creme já a destaca sozinho.
 *
 * Só no celular: no desktop a mesma ação mora no cabeçalho. Some com o teclado
 * aberto pelo mesmo motivo da navegação (`DECISOES.md#d74`). Uma por tela.
 */
export function BotaoFlutuante<T extends string>({
  rotulo,
  href,
  onClick,
  className,
}: {
  /** O nome da ação, visível: "Novo pedido", "Lançar". */
  rotulo: string;
  /** Genérico como o `href` do `Link`: é o que aceita `/fichas/nova`. */
  href?: Route<T>;
  onClick?: () => void;
  className?: string;
}) {
  const conteudo = (
    <>
      <Plus aria-hidden className="size-5" strokeWidth={2.25} />
      {rotulo}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(CLASSES, className)}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(CLASSES, className)}>
      {conteudo}
    </button>
  );
}
