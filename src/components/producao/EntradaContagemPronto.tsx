import Link from "next/link";
import { Cookie } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";

/**
 * O caminho para `/fichas/contagem`, em um lugar só: o irmão de
 * `AtalhoParaCompras`, no mesmo lugar do cabeçalho — `/pedidos` leva a "o que
 * comprar", `/fichas` leva a "o que está pronto". O pronto é atributo do
 * produto, como a capacidade, e por isso a entrada mora aqui e na tela da ficha.
 */
export function EntradaContagemPronto({ className }: { className?: string }) {
  return (
    <Link
      href="/fichas/contagem"
      aria-label="Contar o que está pronto"
      className={classesBotao({ tamanho: "sm", className })}
    >
      <Cookie aria-hidden className="size-4" strokeWidth={1.75} />O que está
      pronto
    </Link>
  );
}
