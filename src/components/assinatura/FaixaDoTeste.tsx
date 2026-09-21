"use client";

import Link from "next/link";
import { ChevronRight, Hourglass, TriangleAlert } from "lucide-react";
import {
  DIAS_DE_ATENCAO,
  fraseDoTeste,
  situacaoDaConta,
} from "@/lib/domain/assinatura";
import { useAuth } from "@/providers/AuthProvider";

/**
 * "Seu teste grátis acaba em N dias · Assinar", na tela Hoje, durante o teste
 * inteiro (spec 028, `#d113`). Nenhuma outra situação mostra a linha: vencida
 * é uma tela cheia (`#d144`), e assinante e livre não têm o que avisar.
 */
export function FaixaDoTeste() {
  const { conta } = useAuth();

  const situacao = conta
    ? situacaoDaConta(
        {
          plano: conta.plano,
          trialAteMs: conta.trialAte?.toMillis(),
          assinaturaAteMs: conta.assinaturaAte?.toMillis(),
        },
        new Date().getTime(),
      )
    : null;

  if (situacao?.tipo !== "teste") return null;

  const emAtencao = situacao.diasRestantes <= DIAS_DE_ATENCAO;
  const Icone = emAtencao ? TriangleAlert : Hourglass;

  return (
    <Link
      href="/assinatura"
      className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      <Icone
        aria-hidden
        className={`size-5 shrink-0 ${emAtencao ? "text-attention" : "text-ink-muted"}`}
        strokeWidth={1.75}
      />
      <span
        className={`min-w-0 flex-1 text-label font-medium ${emAtencao ? "text-attention" : "text-ink"}`}
      >
        {fraseDoTeste(situacao.diasRestantes)} · Assinar
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
    </Link>
  );
}
