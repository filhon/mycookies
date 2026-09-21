"use client";

import type { Route } from "next";
import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Painel } from "./Painel";
import { cn } from "@/lib/utils/cn";

/** `T` é o mesmo genérico do `href` do `Link`: é o que aceita `/fichas/nova`. */
export type OpcaoMais<T extends string> = {
  rotulo: string;
  icone: LucideIcon;
  /** Desabilitada com o motivo embaixo do rótulo: "Ler uma nota" sem rede. */
  desabilitada?: boolean;
  dica?: string;
} & (
  { href: Route<T>; onClick?: never } | { onClick: () => void; href?: never }
);

// A linha da bandeja: 52px de alvo, como a ação primária do celular. O `-mx-3`
// da lista devolve à linha a largura do painel, para o hover e a divisória
// irem de borda a borda.
const CLASSES_LINHA =
  "toque flex min-h-13 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-body font-medium text-ink transition-colors duration-150 ease-quart";

// `hover:bg-sunken` sobre a tinta é `brand-600` pelo escopo `sobre-marca`: o
// mesmo hover do "×" do painel e do voltar, e não um valor próprio.
const CLASSES_MAIS =
  "toque flex items-center justify-center rounded-md text-accent-500 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken";

/**
 * A ação primária das listas no celular (`DECISOES.md#d151`): o "+" no
 * cabeçalho, que abre a bandeja com o nome de cada ação. O que a regra antiga
 * ("nunca círculo com +") protegia — um "+" sozinho obriga a adivinhar o que
 * nasce dele — a bandeja responde: o nome aparece um toque depois, antes de
 * qualquer coisa acontecer.
 *
 * Só o traço, sem círculo: é o âmbar sobre a tinta do cabeçalho, o único ponto
 * de acento na faixa, e o alvo de 44px continua (`toque`). Com uma opção só
 * não há o que escolher: o "+" age no toque, e o `aria-label` é o nome dela.
 *
 * A bandeja é o `Painel`, que no celular já é a folha inferior com foco preso,
 * `Escape` e `inert`. Só no celular: no desktop cada ação mora no cabeçalho.
 */
export function BotaoMais<T extends string>({
  rotulo,
  opcoes,
}: {
  /** O `aria-label` do botão e o título da bandeja: "Adicionar", "Mais ações". */
  rotulo: string;
  opcoes: OpcaoMais<T>[];
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = () => setAberta(false);
  const icone = <Plus aria-hidden className="size-6" strokeWidth={2.25} />;

  const unica = opcoes.length === 1 ? opcoes[0] : undefined;
  if (unica?.href !== undefined) {
    return (
      <Link
        href={unica.href}
        aria-label={unica.rotulo}
        className={cn(CLASSES_MAIS, "lg:hidden")}
      >
        {icone}
      </Link>
    );
  }
  if (unica) {
    return (
      <button
        type="button"
        aria-label={unica.rotulo}
        onClick={unica.onClick}
        className={cn(CLASSES_MAIS, "lg:hidden")}
      >
        {icone}
      </button>
    );
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={rotulo}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
        className={CLASSES_MAIS}
      >
        {icone}
      </button>

      <Painel aberto={aberta} aoFechar={fechar} titulo={rotulo}>
        <ul className="-mx-3 -my-3 divide-y divide-line">
          {opcoes.map((opcao) => {
            const Icone = opcao.icone;
            const conteudo = (
              <>
                <Icone
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  <span className="block">{opcao.rotulo}</span>
                  {opcao.desabilitada && opcao.dica && (
                    <span className="mt-0.5 block text-label font-normal text-ink-muted">
                      {opcao.dica}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              <li key={opcao.rotulo}>
                {opcao.desabilitada ? (
                  <span
                    aria-disabled
                    className={cn(
                      CLASSES_LINHA,
                      "cursor-not-allowed opacity-45",
                    )}
                  >
                    {conteudo}
                  </span>
                ) : opcao.href !== undefined ? (
                  <Link
                    href={opcao.href}
                    onClick={fechar}
                    className={cn(CLASSES_LINHA, "hover:bg-sunken")}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      fechar();
                      opcao.onClick?.();
                    }}
                    className={cn(CLASSES_LINHA, "hover:bg-sunken")}
                  >
                    {conteudo}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Painel>
    </div>
  );
}
