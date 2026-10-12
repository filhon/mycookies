import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  MapPin,
  MessageCircle,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { AprovarOrcamento } from "@/components/cardapio/AprovarOrcamento";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import type { Acompanhamento } from "@/lib/domain/acompanhamento";
import { formatarMoeda } from "@/lib/domain/money";
import { linkDoWhatsApp } from "@/lib/domain/whatsapp";
import { lerAcompanhamento } from "@/lib/server/cardapio";
import { cn } from "@/lib/utils/cn";

/**
 * O pedido que a cliente acompanha (spec 117, `DECISOES.md#d320`): o link só
 * deste pedido, aberto sem login. Lido no servidor com o Admin SDK, como o
 * cardápio (`#d158`); a regra continua sem nada público. Só sai o que
 * `acompanhamentoDoPedido` deixa passar. No orçamento, é a folha na tela
 * (spec 149, `#d357`), com "Aprovar orçamento" enquanto pode (`#d358`).
 *
 * Sem `revalidate`: o status muda, e cada pedido é aberto poucas vezes. Sem
 * atualização ao vivo: a cliente recarrega.
 */
export const dynamic = "force-dynamic";

const acompanhamentoDe = cache(lerAcompanhamento);

interface Props {
  /** `contaId` é o endereço do cardápio: o apelido ou o id (`#d319`). */
  params: Promise<{ contaId: string; pedidoId: string; chave: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contaId, pedidoId, chave } = await params;
  const visto = await acompanhamentoDe(contaId, pedidoId, chave);
  if (!visto) return { title: { absolute: "Pedido" } };
  // A prévia do link encaminhado: nada de nome, valor ou data. O `noindex` do
  // layout raiz continua.
  const title = `Seu pedido na ${visto.negocio.nome}`;
  const description = "Acompanhe a sua encomenda.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "website", locale: "pt_BR" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PaginaDoPedido({ params }: Props) {
  const { contaId, pedidoId, chave } = await params;
  const visto = await acompanhamentoDe(contaId, pedidoId, chave);
  if (!visto) notFound();

  const { negocio } = visto;
  const retirada = visto.entrega.tipo === "RETIRADA";

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10">
      {/* O topo da folha na tela (`#d357`): o logo dela e o nome, e embaixo o
          que é e para quem. Sem logo, só a linha. */}
      {negocio.logo && (
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={negocio.logo}
            alt=""
            className="size-14 shrink-0 rounded-full object-cover"
          />
          <p className="font-display text-subheading font-semibold text-ink">
            {negocio.nome}
          </p>
        </div>
      )}
      <p className="text-label text-ink-muted">
        {visto.para ? (
          <>
            Orçamento <span className="num">{visto.codigo}</span> · para{" "}
            {visto.para}
          </>
        ) : (
          <>
            {/* Com o logo, o nome já está logo acima. */}
            {negocio.logo ? "Pedido" : `${negocio.nome} · pedido`}{" "}
            <span className="num">{visto.codigo}</span>
          </>
        )}
      </p>
      <h1 className="mt-1 text-balance font-display text-title font-semibold text-ink">
        {visto.situacao}
      </h1>
      {visto.validoAte && (
        <p className="mt-2 text-body text-ink-muted">
          Este orçamento vale até {visto.validoAte}.
        </p>
      )}

      {visto.passos.length > 0 && <Trilha passos={visto.passos} />}

      <ul className="mt-8 space-y-2 text-body text-ink">
        <Linha icone={CalendarDays}>
          {visto.dia}
          {visto.hora && (
            <>
              , às <span className="num">{visto.hora}</span>
            </>
          )}
        </Linha>
        <Linha icone={retirada ? Store : Truck}>
          {retirada ? "Retirada" : "Entrega"}
        </Linha>
        {visto.entrega.endereco && (
          <Linha icone={MapPin}>
            <span className="wrap-break-word">{visto.entrega.endereco}</span>
          </Linha>
        )}
      </ul>

      <section aria-labelledby="o-que-vai" className="mt-8">
        <h2 id="o-que-vai" className="text-subheading text-ink">
          O que vai
        </h2>
        {/* As linhas como no cardápio: o texto e o valor à esquerda, a foto à
            direita e só foto (`#d357`). Sem foto, o texto ocupa a linha.
            ponytail: a foto vai dentro da página como `data:` URL, e não pela
            rota do cardápio (`#d162`), que exige o produto no cardápio aberto.
            Um orçamento de 3 linhas pesa uns 500 KB; se pesar, uma rota de foto
            com a chave do pedido, como a do cardápio. */}
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {visto.itens.map((item, i) => (
            <li key={i} className="flex items-start gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-body font-semibold text-ink">
                  <span className="num">{item.quantidade}</span> × {item.nome}
                </p>
                {item.descricao && (
                  <p className="mt-1 line-clamp-2 text-label text-ink-muted">
                    {item.descricao}
                  </p>
                )}
                <p className="mt-2">
                  <Dinheiro centavos={item.subtotal} />
                </p>
              </div>
              {item.fotoUrl && (
                <div className="size-26 shrink-0 overflow-hidden rounded-md bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.fotoUrl}
                    // O nome já está ao lado.
                    alt=""
                    decoding="async"
                    className="size-full object-cover"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1.5 text-body">
          <Total rotulo="Subtotal">
            <Dinheiro centavos={visto.subtotal} />
          </Total>
          {(visto.taxaEntrega === null || visto.taxaEntrega > 0) && (
            <Total rotulo="Entrega">
              {visto.taxaEntrega === null ? (
                <span className="text-ink-muted">a combinar</span>
              ) : (
                <Dinheiro centavos={visto.taxaEntrega} />
              )}
            </Total>
          )}
          {visto.desconto > 0 && (
            <Total rotulo="Desconto">
              <span className="num font-semibold">
                −{formatarMoeda(visto.desconto)}
              </span>
            </Total>
          )}
          <div className="flex items-baseline justify-between gap-3 pt-2">
            <dt className="text-subheading text-ink">Total</dt>
            <dd>
              <Dinheiro centavos={visto.total} tamanho="lg" />
            </dd>
          </div>
        </dl>
      </section>

      <Pagamento visto={visto} />

      {/* O combinado de sempre, com as linhas dela, como no pé da folha. */}
      {negocio.condicoes && (
        <section aria-labelledby="condicoes" className="mt-8">
          <h2 id="condicoes" className="text-subheading text-ink">
            Condições
          </h2>
          <p className="mt-2 max-w-[68ch] whitespace-pre-line text-label text-ink-muted">
            {negocio.condicoes}
          </p>
        </section>
      )}

      {/* Depois das condições: aprova quem já leu tudo (`#d358`). */}
      {visto.podeAprovar && (
        <AprovarOrcamento
          endereco={contaId}
          pedidoId={pedidoId}
          chave={chave}
          nomeInicial={visto.para ?? ""}
          quem={negocio.quem}
        />
      )}

      {negocio.whatsapp && (
        <a
          href={linkDoWhatsApp(
            negocio.whatsapp,
            `Oi! É sobre o pedido ${visto.codigo}.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBotao({
            tamanho: "lg",
            larguraTotal: true,
            className: "mt-10",
          })}
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          Falar com a {negocio.quem}
        </a>
      )}
    </main>
  );
}

/**
 * Os quatro passos depois do orçamento, em coluna: "Pronto, sai para
 * entrega" não cabe em fila a 360 px. Ícone e texto, nunca só a cor.
 */
function Trilha({ passos }: { passos: Acompanhamento["passos"] }) {
  return (
    <ol aria-label="Caminho do pedido" className="mt-6 space-y-2.5">
      {passos.map((passo) => {
        const Icone = passo.feito ? Check : passo.atual ? CircleDot : Circle;
        return (
          <li
            key={passo.rotulo}
            aria-current={passo.atual ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5 text-body",
              passo.atual ? "font-semibold text-ink" : "text-ink-muted",
            )}
          >
            <Icone
              aria-hidden
              className={cn(
                "size-5 shrink-0",
                passo.feito && "text-positive",
                passo.atual && "text-brand-ink",
              )}
              strokeWidth={passo.feito ? 2 : 1.75}
            />
            {passo.rotulo}
            <span className="sr-only">
              {passo.feito
                ? ", feito"
                : passo.atual
                  ? ", agora"
                  : ", ainda não"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Pagamento({ visto }: { visto: Acompanhamento }) {
  if (!visto.pago && visto.sinal === undefined && !visto.pix) return null;

  return (
    <section aria-labelledby="pagamento" className="mt-8">
      <h2 id="pagamento" className="text-subheading text-ink">
        Pagamento
      </h2>
      {visto.pago ? (
        <p className="mt-2 flex items-center gap-2 text-body text-ink">
          <Check
            aria-hidden
            className="size-5 shrink-0 text-positive"
            strokeWidth={2}
          />
          Pago
        </p>
      ) : (
        <dl className="mt-2 space-y-1.5 text-body">
          {visto.sinal !== undefined && (
            <Total rotulo="Sinal recebido">
              <Dinheiro centavos={visto.sinal} />
            </Total>
          )}
          <Total rotulo="Falta">
            <Dinheiro centavos={visto.falta} />
          </Total>
        </dl>
      )}
      {visto.pix && (
        <div className="mt-4 space-y-2">
          <BotaoCopiar
            variante="loja"
            rotulo={`Copiar o Pix de ${formatarMoeda(visto.falta)}`}
            texto={visto.pix}
          />
          <p className="text-label text-ink-muted">
            Cole no app do banco, em Pix copia e cola: o valor já vem
            preenchido.
          </p>
        </div>
      )}
    </section>
  );
}

function Linha({
  icone: Icone,
  children,
}: {
  icone: LucideIcon;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icone
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Total({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
