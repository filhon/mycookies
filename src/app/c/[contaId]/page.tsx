import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AtSign, MessageCircle } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import {
  mensagemDeContato,
  type Cardapio,
  type ProdutoDoCardapio,
} from "@/lib/domain/cardapio";
import { linkDoWhatsApp } from "@/lib/domain/whatsapp";
import { lerCardapio } from "@/lib/server/cardapio";

/**
 * O cardápio público (spec 031, sessão A): a vitrine que a confeiteira manda
 * no WhatsApp e põe na bio. Fora de `(app)` e de `(auth)`: sem shell e sem
 * guarda de login. Renderizada no servidor com o Admin SDK, e a regra do
 * Firestore continua sem nada público (`DECISOES.md#d158`).
 *
 * A voz é a dela falando com a cliente, e não a do Rende falando com ela.
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

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10 sm:pt-16">
      <Topo negocio={cardapio.negocio} />

      <div className="mt-10 space-y-10">
        {cardapio.secoes.map((secao) => (
          <section key={secao.categoria} aria-label={secao.categoria}>
            <h2 className="text-label font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {secao.categoria}
            </h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {secao.produtos.map((produto) => (
                <Produto key={produto.id} contaId={contaId} produto={produto} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {cardapio.negocio.feitoComRende && (
        <p className="mt-12 text-center text-micro text-ink-subtle">
          Feito com Rende
        </p>
      )}
    </main>
  );
}

function Topo({ negocio }: { negocio: Cardapio["negocio"] }) {
  const contatos = [negocio.whatsapp, negocio.instagram].filter(Boolean);

  return (
    <header>
      <h1 className="text-balance font-display text-display font-semibold text-ink">
        {negocio.nome}
      </h1>
      {negocio.frase && (
        <p className="mt-2 max-w-[48ch] text-body text-ink-muted">
          {negocio.frase}
        </p>
      )}

      {contatos.length > 0 && (
        <div
          className={
            contatos.length === 2 ? "mt-6 grid grid-cols-2 gap-2" : "mt-6 grid"
          }
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
              className={classesBotao({ variante: "primaria", tamanho: "lg" })}
            >
              <MessageCircle
                aria-hidden
                className="size-5"
                strokeWidth={1.75}
              />
              {/* A 360px, com os dois botões lado a lado, "Falar no WhatsApp"
                  não cabe; o `aria-label` diz a frase inteira. */}
              <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">Falar no WhatsApp</span>
            </a>
          )}
          {negocio.instagram && (
            <a
              href={`https://instagram.com/${encodeURIComponent(negocio.instagram)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBotao({
                variante: "secundaria",
                tamanho: "lg",
              })}
            >
              <AtSign aria-hidden className="size-5" strokeWidth={1.75} />
              Instagram
            </a>
          )}
        </div>
      )}
    </header>
  );
}

/**
 * Uma linha de lista, como a folha do orçamento, e não um cartão. Sem foto, o
 * quadrado some e o texto começa na margem. O preço fica na linha de baixo:
 * a 360px, ao lado do nome, ele espremeria o nome em duas palavras por linha,
 * e é ali que a sessão B põe a quantidade.
 */
function Produto({
  contaId,
  produto,
}: {
  contaId: string;
  produto: ProdutoDoCardapio;
}) {
  return (
    <li className="flex gap-4 py-4">
      {produto.fotoVersao !== undefined && (
        // Sem `next/image`: a foto já tem 320px, e a otimização a passaria
        // por um segundo serviço para nada (`#d162`).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/c/${encodeURIComponent(contaId)}/foto/${encodeURIComponent(produto.id)}?v=${produto.fotoVersao}`}
          alt={produto.nome}
          width={88}
          height={88}
          loading="lazy"
          decoding="async"
          className="size-22 shrink-0 rounded-md bg-sunken object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="wrap-break-word text-body font-semibold text-ink">
          {produto.nome}
        </h3>
        {produto.descricao && (
          <p className="mt-0.5 line-clamp-2 text-label text-ink-muted">
            {produto.descricao}
          </p>
        )}
        <p className="mt-auto flex items-baseline gap-1.5 pt-2">
          <Dinheiro centavos={produto.preco} />
          <span className="text-label text-ink-muted">· {produto.unidade}</span>
        </p>
      </div>
    </li>
  );
}
