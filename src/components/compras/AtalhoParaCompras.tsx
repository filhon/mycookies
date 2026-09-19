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
 *
 * Mesmo tamanho do primário ao lado: dois botões de alturas diferentes na
 * mesma linha parecem desalinhados, e não hierarquizados.
 */
export function AtalhoParaCompras({ className }: { className?: string }) {
  return (
    <Link href="/compras" className={classesBotao({ className })}>
      <ShoppingCart aria-hidden className="size-5" strokeWidth={1.75} />O que
      comprar
    </Link>
  );
}
