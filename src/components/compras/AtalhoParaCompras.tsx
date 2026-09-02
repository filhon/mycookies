import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";

/**
 * O caminho para `/compras`, em um lugar só.
 *
 * A tela não entra na navegação inferior porque cinco destinos é o teto
 * (`src/components/layout/navegacao.ts`), então ela é alcançada pelo cabeçalho
 * de `/pedidos` e pelo cartão da tela Hoje. Mora em módulo próprio para que a
 * lista de pedidos não carregue a tela de compras inteira junto.
 */
export function AtalhoParaCompras({ className }: { className?: string }) {
  return (
    <Link
      href="/compras"
      className={classesBotao({ tamanho: "sm", className })}
    >
      <ShoppingCart aria-hidden className="size-4" strokeWidth={1.75} />O que
      comprar
    </Link>
  );
}
