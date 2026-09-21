import type { ReactNode } from "react";
import { Logotipo } from "@/components/marca/Marca";

/**
 * A moldura das telas de acesso: painel de marca à esquerda no desktop,
 * logotipo em cima no celular. É o que o login, o cadastro e `/assinatura`
 * (spec 028) têm em comum.
 */
export function MolduraDeEntrada({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Painel de marca: tinta lisa, o logotipo em negativa e a tagline. Só
          no desktop, e sem enfeite: o ponto do logotipo é a única peça âmbar. */}
      <aside className="hidden w-[42%] shrink-0 bg-brand-800 lg:flex lg:flex-col lg:justify-between">
        <div className="px-10 pt-12">
          <Logotipo tamanho="lg" tom="negativa" />
        </div>

        <p className="max-w-[26ch] px-10 pb-14 font-display text-title font-semibold leading-snug text-on-brand">
          O preço certo de cada doce, antes de mandar o orçamento.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logotipo tamanho="md" />
          </div>

          <h1 className="font-display text-title font-semibold text-ink">
            {titulo}
          </h1>
          <p className="mt-1.5 text-body text-ink-muted">{descricao}</p>

          {children}
        </div>
      </main>
    </div>
  );
}
