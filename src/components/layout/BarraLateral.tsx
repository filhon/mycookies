"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Compass, LogOut, Settings } from "lucide-react";
import { Cookie } from "@/components/marca/Marca";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";
import { DESTINOS, destinoAtivo } from "./navegacao";
import { cn } from "@/lib/utils/cn";

/**
 * O cromo assume a tinta da marca por inteiro. É aqui que a marca fala alto,
 * para que a área de dados possa ficar calma. Item ativo com fundo cheio, e
 * nunca uma faixa lateral (`DECISOES.md#d125`).
 */
export function BarraLateral() {
  const caminho = usePathname();
  const { usuario, sair } = useAuth();
  const [saindo, setSaindo] = useState(false);
  const [pendente, setPendente] = useState(false);

  async function aoSair() {
    setPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setPendente(true);
      setSaindo(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-brand-800 text-on-brand lg:flex print:hidden">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <Cookie className="size-8 shrink-0" />
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-subheading font-semibold leading-tight">
            MyCookie&rsquo;s
          </span>
          <span className="text-[0.5625rem] font-medium uppercase tracking-[0.28em] text-on-brand-muted">
            Biscoitos artesanais
          </span>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3">
        <ul className="space-y-0.5">
          {DESTINOS.map((destino) => {
            const ativo = destinoAtivo(caminho, destino.href);
            const Icone = destino.icone;

            return (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "toque flex items-center gap-3 rounded-md px-3 py-2.5 text-body",
                    "transition-colors duration-150 ease-quart",
                    ativo
                      ? "bg-brand-700 font-semibold text-on-brand"
                      : "font-medium text-on-brand-muted hover:bg-brand-600 hover:text-on-brand",
                  )}
                >
                  <Icone
                    aria-hidden
                    className="size-5 shrink-0"
                    strokeWidth={1.75}
                  />
                  {destino.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-white/10 px-3 py-3">
        {/* Acima da configuração, no mesmo bloco do pé: o guia é consultado
            raramente e não gasta o sexto destino de uma navegação que tem
            cinco. No celular a entrada é o pé de `/configuracao`. */}
        <Link
          href="/comecar"
          className={cn(
            "toque flex items-center gap-3 rounded-md px-3 py-2.5 text-label font-medium",
            "transition-colors duration-150 ease-quart",
            destinoAtivo(caminho, "/comecar")
              ? "bg-brand-700 text-on-brand"
              : "text-on-brand-muted hover:bg-brand-600 hover:text-on-brand",
          )}
        >
          <Compass aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          Como funciona
        </Link>

        <Link
          href="/configuracao"
          className={cn(
            "toque flex items-center gap-3 rounded-md px-3 py-2.5 text-label font-medium",
            "transition-colors duration-150 ease-quart",
            destinoAtivo(caminho, "/configuracao")
              ? "bg-brand-700 text-on-brand"
              : "text-on-brand-muted hover:bg-brand-600 hover:text-on-brand",
          )}
        >
          <Settings
            aria-hidden
            className="size-5 shrink-0"
            strokeWidth={1.75}
          />
          Configuração
        </Link>

        <button
          type="button"
          onClick={() => void aoSair()}
          disabled={saindo}
          aria-busy={saindo}
          className="toque flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-label font-medium text-on-brand-muted transition-colors duration-150 ease-quart hover:bg-brand-600 hover:text-on-brand disabled:opacity-60"
        >
          <LogOut aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          Sair
        </button>

        {pendente ? (
          <p
            aria-live="polite"
            className="px-3 pt-2 text-micro text-on-brand-muted"
          >
            {AVISO_SAIR_PENDENTE}
          </p>
        ) : (
          usuario?.email && (
            <p className="truncate px-3 pt-2 text-micro text-on-brand-muted/70">
              {usuario.email}
            </p>
          )
        )}
      </div>
    </aside>
  );
}
