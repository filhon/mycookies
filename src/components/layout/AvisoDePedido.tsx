"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { renovarAviso } from "@/lib/firebase/avisos";
import { useAuth } from "@/providers/AuthProvider";

interface PedidoNovo {
  corpo: string;
  url: string;
  tag: string;
}

const DURACAO_MS = 8000;

/**
 * O pedido novo com o app aberto (spec 119, `#d323`): o `sw.ts` acha a janela
 * visível e manda a mensagem no lugar da notificação do sistema. A faixa fica
 * 8 segundos; o número em "Pedidos" sobe sozinho, pela assinatura de sempre.
 *
 * Mora no layout de `(app)`, e é daqui que o token do aparelho se renova a
 * cada abertura.
 */
export function AvisoDePedido() {
  const { usuario, contaId } = useAuth();
  const [pedido, setPedido] = useState<PedidoNovo | null>(null);

  useEffect(() => {
    if (usuario && contaId) void renovarAviso(contaId, usuario.uid);
  }, [usuario, contaId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const ouvir = (evento: MessageEvent) => {
      const dado = evento.data as ({ tipo?: string } & PedidoNovo) | null;
      if (dado?.tipo === "pedido-novo") setPedido(dado);
    };
    navigator.serviceWorker.addEventListener("message", ouvir);
    return () => navigator.serviceWorker.removeEventListener("message", ouvir);
  }, []);

  useEffect(() => {
    if (!pedido) return;
    const relogio = setTimeout(() => setPedido(null), DURACAO_MS);
    return () => clearTimeout(relogio);
  }, [pedido]);

  // O corpo é "Ana · 6 itens · R$ 112,00 · para …"; a faixa leva nome e valor.
  const partes = pedido?.corpo.split(" · ") ?? [];
  const resumo = [partes[0], partes[2]].filter(Boolean).join(" · ");

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center px-4"
    >
      {pedido && (
        <div
          key={pedido.tag}
          className="pointer-events-auto flex w-full max-w-lg items-center gap-2 rounded-lg border border-info/30 bg-info-soft py-1 pr-1 pl-3 text-label text-ink shadow-overlay transition-opacity duration-200 ease-quart starting:opacity-0"
        >
          <BellRing
            aria-hidden
            className="size-4 shrink-0 text-info"
            strokeWidth={1.75}
          />
          <span className="min-w-0 flex-1 py-2">
            <span className="font-semibold">Pedido novo pelo cardápio:</span>{" "}
            {resumo}
          </span>
          <Link
            href={pedido.url as Route}
            onClick={() => setPedido(null)}
            className="flex h-11 shrink-0 items-center rounded-md px-3 font-semibold text-brand-ink hover:bg-brand-100"
          >
            Ver
          </Link>
          <button
            type="button"
            onClick={() => setPedido(null)}
            aria-label="Fechar"
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-sunken"
          >
            <X aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
