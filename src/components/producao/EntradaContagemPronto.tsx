import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { classesBotao, type TamanhoBotao } from "@/components/ui/estilosBotao";

/**
 * O caminho para `/fichas/contagem`, em um lugar só: o irmão de
 * `AtalhoParaCompras`, no mesmo lugar do cabeçalho — `/pedidos` leva a "o que
 * comprar", `/fichas` leva a "o que está pronto". O pronto é atributo do
 * produto, como a capacidade, e por isso a entrada mora aqui e na tela da ficha.
 *
 * No cabeçalho tem a altura do primário ao lado; na ficha, `sm`, na linha de
 * "Fiz a massa".
 */
export function EntradaContagemPronto({
  tamanho = "md",
  className,
}: {
  tamanho?: TamanhoBotao;
  className?: string;
}) {
  return (
    <Link
      href="/fichas/contagem"
      aria-label="Contar o que está pronto"
      className={classesBotao({ tamanho, className })}
    >
      <PackageOpen aria-hidden className="size-5" strokeWidth={1.75} />O que
      está pronto
    </Link>
  );
}
