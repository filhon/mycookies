"use client";

import Link from "next/link";
import { classesBotao } from "@/components/ui/estilosBotao";
import { OFERTA_DA_PESQUISA, situacaoDaPesquisa } from "@/lib/domain/pesquisa";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/providers/AuthProvider";

/**
 * A oferta da pesquisa do fim do teste (spec 185), sempre com a mesma frase:
 * na faixa do teste, em `/assinatura` e em "Seus convites". Só para a dona com
 * a pesquisa aberta; nada mais. O botão é secundário: o primário de cada tela
 * continua o dela (`#d373`).
 */
export function OfertaDaPesquisa({
  rotulo = "Responder",
  className,
}: {
  rotulo?: string;
  className?: string;
}) {
  const { conta, papel } = useAuth();
  if (
    !conta ||
    papel !== "DONA" ||
    situacaoDaPesquisa(conta, new Date().getTime()) !== "aberta"
  ) {
    return null;
  }
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}
    >
      <p className="min-w-0 flex-1 basis-60 text-body text-ink">
        {OFERTA_DA_PESQUISA}
      </p>
      <Link
        href="/pesquisa"
        className={classesBotao({ variante: "secundaria" })}
      >
        {rotulo}
      </Link>
    </div>
  );
}
