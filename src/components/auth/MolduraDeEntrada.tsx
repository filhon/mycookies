import type { ReactNode } from "react";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { Logotipo } from "@/components/marca/Marca";
import { classesBotao } from "@/components/ui/estilosBotao";

/** O texto pronto não leva o e-mail dela: quem abre o link decide o que contar. */
const TEXTO_AJUDA = encodeURIComponent(
  "Oi, não estou conseguindo entrar no Rende.",
);

/** WhatsApp quando há número; sem ele, o e-mail (`DECISOES.md#d195`). */
const LINK_AJUDA = RESPONSAVEL.whatsapp
  ? `https://wa.me/${RESPONSAVEL.whatsapp}?text=${TEXTO_AJUDA}`
  : `mailto:${RESPONSAVEL.email}?subject=${TEXTO_AJUDA}`;

const CLASSE_LINK = classesBotao({ variante: "terciaria", tamanho: "sm" });

/**
 * A moldura das telas de acesso: painel de marca à esquerda no desktop,
 * logotipo em cima no celular. É o que o login, o cadastro e `/assinatura`
 * (spec 028) têm em comum.
 */
export function MolduraDeEntrada({
  titulo,
  descricao,
  painel,
  children,
}: {
  titulo: string;
  descricao: ReactNode;
  /** Entre o logotipo e a frase, só no desktop (`DECISOES.md#d194`). */
  painel?: ReactNode;
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

        {/* Notebook pequeno não pode empurrar a frase para fora. */}
        {painel && (
          <div className="px-10 [@media(max-height:719px)]:hidden">
            {painel}
          </div>
        )}

        <p className="max-w-[26ch] px-10 pb-14 font-display text-title font-semibold leading-snug text-on-brand">
          O preço certo de cada doce, antes de mandar o orçamento.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="my-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logotipo tamanho="md" />
          </div>

          <h1 className="font-display text-title font-semibold text-ink">
            {titulo}
          </h1>
          <p className="mt-1.5 text-body text-ink-muted">{descricao}</p>

          {children}
        </div>

        {/* Para uma dona de negócio sem equipe técnica, o link de ajuda é o
            suporte (`DECISOES.md#d195`). Aba nova: o cadastro não perde o
            formulário. */}
        {/* Dois grupos: no celular a linha quebra entre eles, e não deixa um
            ponto sozinho no fim. */}
        <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-1 text-label text-ink-muted">
          <span className="flex items-center gap-x-1">
            Não consegue entrar?
            <a
              href={LINK_AJUDA}
              target="_blank"
              rel="noopener"
              className={CLASSE_LINK}
            >
              Fale com a gente
            </a>
          </span>
          <span aria-hidden className="max-sm:hidden">
            ·
          </span>
          <span className="flex items-center gap-x-1">
            <a
              href="/termos"
              target="_blank"
              rel="noopener"
              className={CLASSE_LINK}
            >
              Termos
            </a>
            <span aria-hidden>·</span>
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className={CLASSE_LINK}
            >
              Privacidade
            </a>
          </span>
        </footer>
      </main>
    </div>
  );
}
