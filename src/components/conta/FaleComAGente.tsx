"use client";

import { ArrowUpRight, MessageCircle } from "lucide-react";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { useAuth } from "@/providers/AuthProvider";

/**
 * "Fale com a gente" de dentro do app (spec 084): o mesmo canal do pé das
 * telas de acesso (`DECISOES.md#d195`), com o texto já dizendo o negócio.
 * Aba nova, como lá. Sem WhatsApp, o e-mail, e a legenda diz qual.
 */
export function FaleComAGente() {
  const { conta } = useAuth();
  const texto = encodeURIComponent(
    conta?.nome
      ? `Oi, aqui é da ${conta.nome}. Preciso de ajuda com o Rende.`
      : "Oi, preciso de ajuda com o Rende.",
  );
  const link = RESPONSAVEL.whatsapp
    ? `https://wa.me/${RESPONSAVEL.whatsapp}?text=${texto}`
    : `mailto:${RESPONSAVEL.email}?subject=${texto}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener"
      className="flex w-full items-center gap-3 border-t border-line px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
    >
      <MessageCircle
        aria-hidden
        className="size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">
          Fale com a gente
        </span>
        <span className="mt-0.5 block text-label text-ink-muted">
          {RESPONSAVEL.whatsapp
            ? "Uma pessoa responde pelo WhatsApp."
            : "Uma pessoa responde por e-mail."}
        </span>
      </span>
      <ArrowUpRight
        aria-hidden
        className="size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
    </a>
  );
}
