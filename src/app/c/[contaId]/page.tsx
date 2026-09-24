import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AtSign, MessageCircle } from "lucide-react";
import { PedidoPeloCardapio } from "@/components/cardapio/PedidoPeloCardapio";
import { estiloDaLoja } from "@/components/cardapio/estiloDaLoja";
import { classesBotao } from "@/components/ui/estilosBotao";
import { mensagemDeContato, type Cardapio } from "@/lib/domain/cardapio";
import { diaVizinho, hojeEmBrasilia } from "@/lib/domain/datas";
import { linkDoWhatsApp } from "@/lib/domain/whatsapp";
import { lerCardapio } from "@/lib/server/cardapio";
import { cn } from "@/lib/utils/cn";

/**
 * O cardápio público (spec 031): a vitrine que a confeiteira manda no WhatsApp
 * e põe na bio, com o pedido (`PedidoPeloCardapio`, sessão B). Fora de `(app)` e de `(auth)`: sem shell e sem
 * guarda de login. Renderizada no servidor com o Admin SDK, e a regra do
 * Firestore continua sem nada público (`DECISOES.md#d158`).
 *
 * A página é dela, e não do Rende (sessão F, `#d166`): a capa, o logo e a cor
 * da loja na frente; o Rende é uma linha de rodapé que ela desliga.
 */

// Uma cliente ou mil no mesmo minuto são as mesmas `2 + N` leituras.
export const revalidate = 60;

// Vazio: nenhuma conta no build, toda conta na primeira visita, e a página
// guardada pelo `revalidate` (ISR).
export function generateStaticParams() {
  return [];
}

// `generateMetadata` e a página pedem o mesmo cardápio: uma leitura só.
const cardapioDa = cache(lerCardapio);

interface Props {
  params: Promise<{ contaId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cardapio = await cardapioDa((await params).contaId);
  // Fechado: nem o nome do Rende na aba, que a cliente dela não conhece.
  if (!cardapio) return { title: { absolute: "Cardápio" } };
  // O que o WhatsApp e o Instagram mostram na prévia do link. O `noindex` do
  // layout raiz continua: o link é para quem ela manda.
  return {
    title: { absolute: cardapio.negocio.nome },
    description: cardapio.negocio.frase ?? "Cardápio e pedidos",
  };
}

export default async function PaginaCardapio({ params }: Props) {
  const { contaId } = await params;
  const cardapio = await cardapioDa(contaId);
  if (!cardapio) notFound();
  const { negocio } = cardapio;

  return (
    <main
      style={estiloDaLoja(negocio.cor)}
      className="mx-auto w-full max-w-6xl pb-12 lg:px-10"
    >
      <Topo contaId={contaId} negocio={negocio} />

      {/* Amanhã em Brasília, no servidor: o relógio do celular da cliente não
          decide o mínimo. Guardado com a página por até 60 s. */}
      <PedidoPeloCardapio
        contaId={contaId}
        cardapio={cardapio}
        amanha={diaVizinho(hojeEmBrasilia(new Date()), 1)}
      />

      <footer className="mx-4 mt-12 flex flex-col items-center gap-1 border-t border-line pt-6 text-label text-ink-muted lg:mx-0 lg:flex-row lg:justify-between">
        <p>
          {negocio.nome}
          {negocio.instagram && ` · @${negocio.instagram}`}
        </p>
        {negocio.feitoComRende && <p>Cardápio feito no Rende</p>}
      </footer>
    </main>
  );
}

/**
 * A capa, o logo e o nome. Sem capa, a cor dela faz a faixa; sem nenhuma das
 * duas, o nome começa no papel, sem faixa inventada.
 */
function Topo({
  contaId,
  negocio,
}: {
  contaId: string;
  negocio: Cardapio["negocio"];
}) {
  const base = `/c/${encodeURIComponent(contaId)}/vitrine`;
  const temFaixa = negocio.capaVersao !== undefined || !!negocio.cor;
  const contatos = [negocio.whatsapp, negocio.instagram].filter(Boolean);

  return (
    <header>
      {negocio.capaVersao !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${base}/capa?v=${negocio.capaVersao}`}
          alt=""
          className="h-44 w-full bg-sunken object-cover lg:mt-6 lg:h-65 lg:rounded-lg"
        />
      ) : (
        negocio.cor && <div className="h-28 bg-loja lg:mt-6 lg:rounded-lg" />
      )}

      <div
        className={cn(
          "flex flex-col gap-4 px-4 lg:flex-row lg:items-end lg:justify-between lg:px-6",
          !temFaixa && "pt-10",
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
          {negocio.logoVersao !== undefined && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${base}/logo?v=${negocio.logoVersao}`}
              alt={`Logo de ${negocio.nome}`}
              width={112}
              height={112}
              className={cn(
                "size-19 shrink-0 rounded-full border-4 border-canvas bg-canvas object-cover lg:size-28",
                temFaixa && "-mt-9.5 lg:-mt-14",
              )}
            />
          )}
          <div
            className={cn(
              temFaixa && negocio.logoVersao === undefined && "pt-6",
            )}
          >
            <h1 className="text-balance font-display text-display font-semibold text-ink lg:text-[2.25rem]">
              {negocio.nome}
            </h1>
            {negocio.frase && (
              <p className="mt-1 max-w-[48ch] text-body text-ink-muted">
                {negocio.frase}
              </p>
            )}
          </div>
        </div>

        {/* Para quem só quer perguntar "tem pra hoje?": é o motivo mais comum
            de abrir o link da bio, e o pedido não é o único caminho. */}
        {contatos.length > 0 && (
          <div className="flex gap-2">
            {negocio.whatsapp && (
              <a
                href={linkDoWhatsApp(
                  negocio.whatsapp,
                  mensagemDeContato(negocio),
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar no WhatsApp"
                className={classesBotao({ tamanho: "sm" })}
              >
                <MessageCircle
                  aria-hidden
                  className="size-4"
                  strokeWidth={1.75}
                />
                WhatsApp
              </a>
            )}
            {negocio.instagram && (
              <a
                href={`https://instagram.com/${encodeURIComponent(negocio.instagram)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao({ tamanho: "sm" })}
              >
                <AtSign aria-hidden className="size-4" strokeWidth={1.75} />
                Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
