"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Compass,
  Hourglass,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Logotipo } from "@/components/marca/Marca";
import {
  fraseDoTeste,
  paraSituar,
  situacaoDaConta,
} from "@/lib/domain/assinatura";
import {
  AVISO_SAIR_PENDENTE,
  useAuth,
  usePapel,
} from "@/providers/AuthProvider";
import {
  DESTINOS_DA_BARRA,
  destinoAtivo,
  destinosDo,
  numeroDaEspera,
  rotuloDoDestino,
  useEsperaDoCardapio,
  type Destino,
} from "./navegacao";
import { useHaNovidade } from "@/lib/hooks/useNovidade";
import { cn } from "@/lib/utils/cn";

/**
 * O cromo assume a tinta da marca por inteiro. É aqui que a marca fala alto,
 * para que a área de dados possa ficar calma. Item ativo com fundo cheio, e
 * nunca uma faixa lateral (`DECISOES.md#d125`). O nome do negócio no topo, os
 * sete destinos no meio e o prazo do teste no pé (`#d236`).
 */
export function BarraLateral() {
  const caminho = usePathname();
  const { usuario, conta, sair } = useAuth();
  const papel = usePapel();
  const esperaDoCardapio = useEsperaDoCardapio();
  const novidade = useHaNovidade();
  const [saindo, setSaindo] = useState(false);
  const [pendente, setPendente] = useState(false);

  // Só a dona assina, e a urgência dos três últimos dias é da Hoje (`#d219`):
  // aqui o prazo só informa.
  // `new Date().getTime()`: o compilador do React recusa `Date.now()` no corpo.
  const situacao =
    conta && papel === "DONA"
      ? situacaoDaConta(paraSituar(conta), new Date().getTime())
      : null;

  async function aoSair() {
    setPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setPendente(true);
      setSaindo(false);
    }
  }

  function itemDoDestino(destino: Destino) {
    const espera = destino.href === "/pedidos" ? esperaDoCardapio : 0;
    const rotulo = espera > 0 ? rotuloDoDestino(destino, espera) : undefined;

    return (
      <li key={destino.href}>
        <ItemDaBarra
          href={destino.href}
          icone={destino.icone}
          ativo={destinoAtivo(caminho, destino.href)}
          rotulo={rotulo}
        >
          {destino.rotulo}
          {/* `on-brand` com tinta `brand-800`: lê igual sobre o item
              inativo e sobre o ativo (`#d235`). */}
          {espera > 0 && (
            <span
              aria-hidden
              className="ml-auto flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-on-brand px-1.5 text-micro font-semibold leading-none tabular-nums text-brand-800"
            >
              {numeroDaEspera(espera)}
            </span>
          )}
        </ItemDaBarra>
      </li>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-brand-800 text-on-brand lg:flex print:hidden">
      {/* O logotipo sozinho na linha dele: 32px é abaixo do mínimo do símbolo,
          e a marca não tem descritor. O nome embaixo diz de quem é a conta,
          que é a primeira coisa que a ajudante confere (`#d236`). */}
      <div className="px-5 pb-5 pt-6">
        <Logotipo tamanho="md" tom="negativa" />
        {conta?.nome && (
          <p
            title={conta.nome}
            className="mt-3 truncate text-label font-semibold text-on-brand"
          >
            {conta.nome}
          </p>
        )}
      </div>

      {/* Se a tela for baixa demais para os sete, rola a `<nav>`, e não o pé. */}
      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-y-auto px-3"
      >
        <ul className="space-y-0.5">{destinosDo(papel).map(itemDoDestino)}</ul>
        {/* O teto de cinco é da navegação inferior; aqui cabe o segundo grupo,
            sem título e sem filete, só o respiro (`#d236`). */}
        <ul className="mt-4 space-y-0.5">
          {destinosDo(papel, DESTINOS_DA_BARRA).map(itemDoDestino)}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-brand-500 px-3 py-3">
        {situacao?.tipo === "teste" && (
          <div className="flex gap-3 px-3 pb-1 text-label">
            <Hourglass
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-on-brand-muted"
              strokeWidth={1.75}
            />
            <div className="min-w-0">
              <p className="text-on-brand-muted">
                {fraseDoTeste(situacao.diasRestantes)}
              </p>
              <Link
                href="/assinatura"
                className="toque -mx-2 inline-flex items-center rounded-md px-2 font-semibold text-on-brand transition-colors duration-150 ease-quart hover:bg-brand-600"
              >
                Assinar
              </Link>
            </div>
          </div>
        )}

        {/* Acima da configuração, no mesmo bloco do pé: o guia é consultado
            raramente e não gasta um destino. No celular a entrada é o pé de
            `/configuracao`. O guia é o caminho dos primeiros passos, que é da
            dona (spec 030). */}
        {papel === "DONA" && (
          <ItemDaBarra
            href="/comecar"
            icone={Compass}
            ativo={destinoAtivo(caminho, "/comecar")}
            pe
          >
            Como funciona
            {/* A palavra, sem contagem e sem bolinha (`#d298`). */}
            {novidade && (
              <span className="ml-auto text-micro font-semibold text-on-brand-muted">
                Novidade
              </span>
            )}
          </ItemDaBarra>
        )}

        <ItemDaBarra
          href="/configuracao"
          icone={Settings}
          ativo={destinoAtivo(caminho, "/configuracao")}
          pe
        >
          Configuração
        </ItemDaBarra>

        <button
          type="button"
          onClick={() => void aoSair()}
          disabled={saindo}
          aria-busy={saindo}
          className={cn(classesDoItem(false, true), "disabled:opacity-60")}
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

/** Destinos em `body`, com o ativo em 600; o pé em `label`, sempre 500. */
function classesDoItem(ativo: boolean, pe: boolean): string {
  return cn(
    "toque flex w-full items-center gap-3 rounded-md px-3 py-2.5",
    "transition-colors duration-150 ease-quart",
    pe
      ? "text-label font-medium"
      : cn("text-body", ativo ? "font-semibold" : "font-medium"),
    ativo
      ? "bg-brand-700 text-on-brand"
      : "text-on-brand-muted hover:bg-brand-600 hover:text-on-brand",
  );
}

function ItemDaBarra({
  href,
  icone: Icone,
  ativo,
  rotulo,
  pe = false,
  children,
}: {
  href: Route;
  icone: LucideIcon;
  ativo: boolean;
  /** Rótulo acessível quando o texto visível não diz tudo (a espera). */
  rotulo?: string;
  pe?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={rotulo}
      title={rotulo}
      aria-current={ativo ? "page" : undefined}
      className={classesDoItem(ativo, pe)}
    >
      <Icone aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      {children}
    </Link>
  );
}
