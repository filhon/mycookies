import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache, type ReactNode } from "react";
import { AtSign, MessageCircle } from "lucide-react";
import { MandarOCardapio } from "@/components/cardapio/MandarOCardapio";
import { PedidoPeloCardapio } from "@/components/cardapio/PedidoPeloCardapio";
import { estiloDaLoja } from "@/components/cardapio/estiloDaLoja";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  mensagemDeContato,
  primeiroDiaDoCardapio,
  type Cardapio,
} from "@/lib/domain/cardapio";
import {
  diaVizinho,
  hojeEmBrasilia,
  rotuloDiaPorExtenso,
} from "@/lib/domain/datas";
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
  /** O segmento chama `contaId` desde a 031, mas é o endereço: o apelido ou o id (`#d319`). */
  params: Promise<{ contaId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contaId: endereco } = await params;
  const lido = await cardapioDa(endereco);
  // Fechado: nem o nome do Rende na aba, que a cliente dela não conhece.
  if (!lido) return { title: { absolute: "Cardápio" } };
  const { contaId, cardapio } = lido;
  const { negocio } = cardapio;
  const description = negocio.frase ?? "Cardápio e pedidos";
  // A prévia do link no WhatsApp e no Instagram (spec 114, `#d317`): a capa
  // grande; sem capa, o logo pequeno; sem nenhum, só o texto. O `metadataBase`
  // do layout raiz faz a URL absoluta. O `noindex` do layout continua: a
  // prévia é para quem recebe o link, não para a busca. Nada do Rende aqui.
  const base = `/c/${encodeURIComponent(contaId)}/vitrine`;
  const imagem =
    negocio.capaVersao !== undefined
      ? `${base}/capa?v=${negocio.capaVersao}`
      : negocio.logoVersao !== undefined
        ? `${base}/logo?v=${negocio.logoVersao}`
        : undefined;
  return {
    title: { absolute: negocio.nome },
    description,
    openGraph: {
      title: negocio.nome,
      description,
      type: "website",
      locale: "pt_BR",
      siteName: negocio.nome,
      ...(imagem && { images: [imagem] }),
    },
    twitter: {
      card:
        negocio.capaVersao !== undefined ? "summary_large_image" : "summary",
      title: negocio.nome,
      description,
      ...(imagem && { images: [imagem] }),
    },
  };
}

export default async function PaginaCardapio({ params }: Props) {
  const { contaId: endereco } = await params;
  const lido = await cardapioDa(endereco);
  if (!lido) notFound();
  // O endereço velho (o id, ou um apelido arquivado) leva ao atual, em 308: o
  // QR impresso e a bio antiga não quebram (spec 116, `#d319`).
  if (lido.apelido && lido.apelido !== endereco) {
    permanentRedirect(`/c/${lido.apelido}`);
  }
  const { contaId, cardapio } = lido;
  const { negocio } = cardapio;
  // Amanhã em Brasília, no servidor: o relógio do celular da cliente não
  // decide o mínimo. Guardado com a página por até 60 s. O primeiro dia é a
  // mesma conta do handler (`#d318`).
  const hoje = hojeEmBrasilia(new Date());
  const primeiro = primeiroDiaDoCardapio(hoje, negocio.aPartirDeISO);

  return (
    <main
      style={estiloDaLoja(negocio.cor)}
      className="mx-auto w-full max-w-6xl pb-12 lg:px-10"
    >
      <Topo
        contaId={contaId}
        negocio={negocio}
        aPartirDe={
          primeiro === diaVizinho(hoje, 1)
            ? "amanhã"
            : rotuloDiaPorExtenso(primeiro)
        }
      />

      <PedidoPeloCardapio
        contaId={contaId}
        cardapio={cardapio}
        amanha={diaVizinho(hoje, 1)}
        primeiro={primeiro}
        pe={<Pe contaId={contaId} negocio={negocio} />}
      />
    </main>
  );
}

/**
 * O fecho da loja (spec 120, `#d324`): a mesma pergunta do topo para quem rolou
 * até o fim. Mora na coluna da lista, sem filete: a última lista fecha com o
 * dela. Links, e não botões: o primário da página é o "Adicionar".
 */
function Pe({
  contaId,
  negocio,
}: {
  contaId: string;
  negocio: Cardapio["negocio"];
}) {
  const link =
    "inline-flex min-h-11 items-center gap-2 text-label text-ink underline-offset-2 hover:underline focus-visible:underline";
  return (
    <footer className="mt-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {negocio.logoVersao !== undefined && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/c/${encodeURIComponent(contaId)}/vitrine/logo?v=${negocio.logoVersao}`}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="size-10 shrink-0 rounded-full bg-canvas object-cover"
            />
          )}
          <p className="wrap-break-word text-subheading font-semibold text-ink">
            {negocio.nome}
          </p>
        </div>
        {(negocio.whatsapp || negocio.instagram) && (
          <div className="mt-2 flex flex-wrap gap-x-6">
            {negocio.whatsapp && (
              <a
                href={linkDoWhatsApp(
                  negocio.whatsapp,
                  mensagemDeContato(negocio),
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar no WhatsApp"
                className={link}
              >
                <MessageCircle
                  aria-hidden
                  className="size-4 shrink-0 text-ink-muted"
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
                className={link}
              >
                <AtSign
                  aria-hidden
                  className="size-4 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
                <span translate="no">@{negocio.instagram}</span>
              </a>
            )}
          </div>
        )}
      </div>
      {/* O único link do Rende na página, medido até a conta criada
          (`#d317`). Em aba nova: o cardápio dela fica aberto. */}
      {negocio.feitoComRende && (
        <a
          href="/conheca?de=cardapio"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center self-start text-label text-ink-muted underline-offset-2 hover:underline focus-visible:underline lg:self-auto"
        >
          Cardápio feito no Rende
        </a>
      )}
    </footer>
  );
}

/**
 * A capa, o logo e o nome. Sem capa, a cor dela faz a faixa; sem nenhuma das
 * duas, o nome começa no papel, sem faixa inventada.
 */
function Topo({
  contaId,
  negocio,
  aPartirDe,
}: {
  contaId: string;
  negocio: Cardapio["negocio"];
  /** "amanhã", ou o dia por extenso com a agenda cheia. */
  aPartirDe: string;
}) {
  const base = `/c/${encodeURIComponent(contaId)}/vitrine`;
  const temFaixa = negocio.capaVersao !== undefined || !!negocio.cor;
  const comLogo = negocio.logoVersao !== undefined;

  return (
    <header>
      {negocio.capaVersao !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${base}/capa?v=${negocio.capaVersao}`}
          alt=""
          // Acima da dobra; a altura fixa da classe já guarda o lugar.
          fetchPriority="high"
          className="h-44 w-full bg-sunken object-cover lg:mt-6 lg:h-65 lg:rounded-lg"
        />
      ) : (
        negocio.cor && <div className="h-28 bg-loja lg:mt-6 lg:rounded-lg" />
      )}

      {/* Pelo topo, e não pelo pé (spec 120, `#d324`): alinhado pelo pé do
          logo, o texto alto subia até encostar na capa. */}
      <div
        className={cn(
          "flex flex-col gap-4 px-4 lg:flex-row lg:items-start lg:justify-between lg:px-6",
          !temFaixa && "pt-10",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
          {comLogo && (
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
              "min-w-0",
              // Com logo, o texto começa 20 px abaixo da capa, e não pelo pé
              // do logo; sem logo, o respiro de sempre.
              temFaixa && (comLogo ? "lg:pt-5" : "pt-6"),
            )}
          >
            <h1 className="wrap-break-word text-balance font-display text-display font-semibold text-ink lg:text-[2.25rem]">
              {negocio.nome}
            </h1>
            {negocio.frase && (
              <p className="mt-1 max-w-[48ch] text-body text-ink-muted">
                {negocio.frase}
              </p>
            )}
            {/* Antes de pedir (spec 115, `#d318`): o que a cliente perguntaria
                no WhatsApp, antes do formulário. Cada fato só com dado, e o
                rótulo no lugar do ícone (spec 120, `#d324`). */}
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              <Fato rotulo="Pedidos">A partir de {aPartirDe}</Fato>
              {negocio.pagamento && (
                <Fato rotulo="Pagamento">{negocio.pagamento}</Fato>
              )}
            </dl>
            {negocio.recado && (
              <p className="mt-4 max-w-[48ch] whitespace-pre-line wrap-break-word text-body text-ink">
                {negocio.recado}
              </p>
            )}
          </div>
        </div>

        {/* Para quem só quer perguntar "tem pra hoje?": é o motivo mais comum
            de abrir o link da bio, e o pedido não é o único caminho. E para
            quem gostou mandar à amiga (spec 114). */}
        <div
          className={cn(
            "flex flex-wrap gap-2",
            temFaixa && (comLogo ? "lg:pt-5" : "lg:pt-6"),
          )}
        >
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
          <MandarOCardapio nome={negocio.nome} />
        </div>
      </div>
    </header>
  );
}

/** Um fato da faixa "antes de pedir": o rótulo na voz da legenda, e o dado. */
function Fato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-micro font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {rotulo}
      </dt>
      <dd className="text-label font-medium text-ink">{children}</dd>
    </div>
  );
}
