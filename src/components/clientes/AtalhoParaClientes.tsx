import Link from "next/link";
import { Users } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";
import { cn } from "@/lib/utils/cn";

/**
 * O caminho para `/clientes`, em um lugar só.
 *
 * A tela não entra na navegação inferior porque cinco destinos é o teto
 * (`src/components/layout/navegacao.ts`), então ela é alcançada pelo cabeçalho
 * de `/pedidos` e por `/comecar`.
 *
 * No cabeçalho de `/pedidos` a 360px, os dois atalhos mais o título não cabem
 * numa linha só: o de compras é toda semana, então é este que encolhe para
 * só o ícone (`DECISOES.md#d137`). O rótulo continua no DOM, `sr-only`, para
 * o leitor de tela.
 */
export function AtalhoParaClientes({ className }: { className?: string }) {
  return (
    <Link
      href="/clientes"
      className={classesBotao({ className: cn("px-2.5 lg:px-4", className) })}
    >
      <Users aria-hidden className="size-5" strokeWidth={1.75} />
      <span className="sr-only lg:not-sr-only">Clientes</span>
    </Link>
  );
}
