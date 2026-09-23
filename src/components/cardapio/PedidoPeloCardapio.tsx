"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, MessageCircle, Minus, Plus } from "lucide-react";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Painel } from "@/components/ui/Painel";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  DIAS_A_FRENTE,
  MENSAGEM_FALHA_PEDIDO_CARDAPIO,
  mensagemDeAviso,
  mensagemDeContato,
  type Cardapio,
  type FalhaPedidoCardapio,
  type ProdutoDoCardapio,
} from "@/lib/domain/cardapio";
import { diaVizinho } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { subtotalDoItem } from "@/lib/domain/pedido";
import { linkDoWhatsApp, telefoneParaWhatsApp } from "@/lib/domain/whatsapp";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * O pedido pela página do cardápio (spec 031, 3.B.3): a única parte da página
 * que roda no navegador da cliente. Recebe o `Cardapio` sem foto nenhuma
 * dentro (`#d162`) e a data de amanhã, calculada no servidor em Brasília.
 *
 * O carrinho mora em `useState` e mais nada: `localStorage` aqui seria um
 * carrinho que volta no celular de outra pessoa.
 */

type Tipo = "RETIRADA" | "ENTREGA";

interface Enviado {
  codigo: string | null;
  total: Centavos;
  itens: { nome: string; quantidade: number }[];
  dataEntregaISO: string;
  entrega: Tipo;
}

export function PedidoPeloCardapio({
  contaId,
  cardapio,
  amanha,
}: {
  contaId: string;
  cardapio: Cardapio;
  amanha: string;
}) {
  const { negocio } = cardapio;
  const quem = negocio.quem || negocio.nome;
  const produtos = cardapio.secoes.flatMap((secao) => secao.produtos);

  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [aberto, setAberto] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<Tipo>("RETIRADA");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [site, setSite] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erroTelefone, setErroTelefone] = useState<string>();
  const [falha, setFalha] = useState<FalhaPedidoCardapio | null>(null);
  const [enviado, setEnviado] = useState<Enviado | null>(null);

  const idFormulario = useId();

  const escolhidos = produtos
    .filter((produto) => (carrinho[produto.id] ?? 0) > 0)
    .map((produto) => ({ produto, quantidade: carrinho[produto.id]! }));
  const quantidadeTotal = escolhidos.reduce((s, e) => s + e.quantidade, 0);
  const total = escolhidos.reduce(
    (s, e) =>
      s +
      subtotalDoItem({
        quantidade: e.quantidade,
        precoUnitario: e.produto.preco,
      }),
    0,
  );

  function mudar(id: string, passo: number) {
    const quantidade = Math.max(0, Math.min(500, (carrinho[id] ?? 0) + passo));
    const proximo = { ...carrinho, [id]: quantidade };
    if (quantidade === 0) delete proximo[id];
    setCarrinho(proximo);
    // Esvaziou dentro do painel: não há o que mandar.
    if (Object.keys(proximo).length === 0) setAberto(false);
  }

  function fechar() {
    setAberto(false);
    // Depois de enviar, fechar zera o carrinho. O nome e o WhatsApp ficam,
    // para um segundo pedido.
    if (enviado) {
      setCarrinho({});
      setEnviado(null);
      setFalha(null);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    if (!telefoneParaWhatsApp(telefone)) {
      setErroTelefone("Confira o número, com o DDD.");
      return;
    }
    setErroTelefone(undefined);
    setFalha(null);
    setEnviando(true);

    try {
      const resposta = await fetch("/api/cardapio/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaId,
          nome,
          telefone,
          itens: escolhidos.map((e) => ({
            fichaId: e.produto.id,
            quantidade: e.quantidade,
          })),
          dataEntregaISO: data,
          entrega:
            tipo === "ENTREGA" ? { tipo, endereco } : { tipo: "RETIRADA" },
          ...(observacoes.trim() ? { observacoes } : {}),
          ...(site ? { site } : {}),
        }),
      });

      if (!resposta.ok) {
        const codigo = await falhaDa(resposta);
        setFalha(codigo);
        if (codigo === "mudou") setTimeout(() => location.reload(), 3000);
        return;
      }

      const corpo = (await resposta.json()) as {
        codigo: string | null;
        total?: Centavos;
      };
      setEnviado({
        codigo: corpo.codigo,
        total: corpo.total ?? total,
        itens: escolhidos.map((e) => ({
          nome: e.produto.nome,
          quantidade: e.quantidade,
        })),
        dataEntregaISO: data,
        entrega: tipo,
      });
    } catch {
      // `TypeError` do `fetch`: sem rede.
      setFalha("sem-rede");
    } finally {
      setEnviando(false);
    }
  }

  const linkContato =
    negocio.whatsapp &&
    linkDoWhatsApp(negocio.whatsapp, mensagemDeContato(negocio));

  return (
    <>
      <div className={cn("mt-10 space-y-10", quantidadeTotal > 0 && "pb-24")}>
        {cardapio.secoes.map((secao) => (
          <section key={secao.categoria} aria-label={secao.categoria}>
            <h2 className="text-label font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {secao.categoria}
            </h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {secao.produtos.map((produto) => (
                <Produto
                  key={produto.id}
                  contaId={contaId}
                  produto={produto}
                  quantidade={carrinho[produto.id] ?? 0}
                  aoMudar={(passo) => mudar(produto.id, passo)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {quantidadeTotal > 0 && (
        <div className="area-segura-inferior fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 shadow-overlay">
          <div className="mx-auto w-full max-w-xl pb-3">
            <Botao
              variante="primaria"
              tamanho="lg"
              larguraTotal
              aria-haspopup="dialog"
              onClick={() => setAberto(true)}
              className="num"
            >
              Ver pedido · {quantidadeTotal}{" "}
              {quantidadeTotal === 1 ? "item" : "itens"} ·{" "}
              {formatarMoeda(total)}
            </Botao>
          </div>
        </div>
      )}

      <Painel
        aberto={aberto}
        aoFechar={fechar}
        titulo={enviado ? "Pedido enviado" : "Seu pedido"}
        rodape={
          enviado ? (
            negocio.whatsapp ? (
              <a
                href={linkDoWhatsApp(
                  negocio.whatsapp,
                  mensagemDeAviso({
                    negocio: negocio.nome,
                    codigo: enviado.codigo ?? "",
                    nome,
                    itens: enviado.itens,
                    total: enviado.total,
                    dataEntregaISO: enviado.dataEntregaISO,
                    entrega: enviado.entrega,
                  }),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao({
                  variante: "primaria",
                  tamanho: "lg",
                  larguraTotal: true,
                  className: "mb-4",
                })}
              >
                <MessageCircle
                  aria-hidden
                  className="size-5"
                  strokeWidth={1.75}
                />
                Avisar a {quem} no WhatsApp
              </a>
            ) : undefined
          ) : (
            <div className="pb-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-label text-ink-muted">
                  Total
                  {tipo === "ENTREGA" && (
                    <span className="block">sem a entrega</span>
                  )}
                </span>
                <Dinheiro centavos={total} tamanho="xl" />
              </div>
              <Botao
                type="submit"
                form={idFormulario}
                variante="primaria"
                tamanho="lg"
                larguraTotal
                carregando={enviando}
              >
                {enviando ? "Enviando" : "Enviar pedido"}
              </Botao>
              {falha && (
                <div role="alert" className="mt-3 space-y-3">
                  <p className="text-label text-negative">
                    {MENSAGEM_FALHA_PEDIDO_CARDAPIO[falha]}
                  </p>
                  {(falha === "cheio" || falha === "fechado") &&
                    linkContato && (
                      <a
                        href={linkContato}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={classesBotao({
                          variante: "secundaria",
                          larguraTotal: true,
                        })}
                      >
                        <MessageCircle
                          aria-hidden
                          className="size-5"
                          strokeWidth={1.75}
                        />
                        Falar no WhatsApp
                      </a>
                    )}
                </div>
              )}
            </div>
          )
        }
      >
        {enviado ? (
          <div className="space-y-4">
            {enviado.codigo && (
              <p className="flex flex-col gap-1">
                <span className="text-label text-ink-muted">
                  Código do pedido
                </span>
                <span className="num text-heading font-semibold text-ink">
                  {enviado.codigo}
                </span>
              </p>
            )}
            <p className="flex items-start gap-2 text-body text-ink">
              <Check
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-positive"
                strokeWidth={2}
              />
              A {quem} vai confirmar pelo WhatsApp.
            </p>
          </div>
        ) : (
          <form
            id={idFormulario}
            onSubmit={(evento) => void enviar(evento)}
            className="space-y-6"
          >
            <ul className="divide-y divide-line border-y border-line">
              {escolhidos.map(({ produto, quantidade }) => (
                <li key={produto.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word text-body font-medium text-ink">
                      {produto.nome}
                    </p>
                    <Dinheiro
                      centavos={subtotalDoItem({
                        quantidade,
                        precoUnitario: produto.preco,
                      })}
                      tamanho="sm"
                    />
                  </div>
                  <Passo
                    nome={produto.nome}
                    quantidade={quantidade}
                    aoMudar={(passo) => mudar(produto.id, passo)}
                  />
                </li>
              ))}
            </ul>

            <Campo
              rotulo="Seu nome"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <Campo
              rotulo="Seu WhatsApp"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(81) 98888-7777"
              erro={erroTelefone}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <Campo
              rotulo="Para quando?"
              required
              type="date"
              min={amanha}
              max={diaVizinho(amanha, DIAS_A_FRENTE - 1)}
              dica={`A ${quem} confirma se dá para esse dia.`}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />

            <fieldset className="space-y-3">
              <legend className="text-label font-medium text-ink">
                Como você recebe?
              </legend>
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                {(
                  [
                    ["RETIRADA", "Retiro"],
                    ["ENTREGA", "Entrega"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label
                    key={valor}
                    className={cn(
                      "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-body font-medium",
                      "transition-colors duration-150 ease-quart",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)",
                      tipo === valor
                        ? "border-brand-700 bg-brand-700 text-on-brand"
                        : "border-line-strong text-ink hover:bg-sunken",
                    )}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={valor}
                      checked={tipo === valor}
                      onChange={() => setTipo(valor)}
                      className="sr-only"
                    />
                    {tipo === valor && (
                      <Check aria-hidden className="size-4" strokeWidth={2} />
                    )}
                    {rotulo}
                  </label>
                ))}
              </div>
              {tipo === "ENTREGA" && (
                <Campo
                  rotulo="Endereço"
                  required
                  minLength={5}
                  maxLength={200}
                  autoComplete="street-address"
                  dica={`A taxa de entrega a ${quem} combina com você.`}
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              )}
            </fieldset>

            <AreaTexto
              rotulo="Quer dizer mais alguma coisa?"
              maxLength={500}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            {/* O pote de mel (`#d161`): fora da tela e da ordem de foco, com
                um nome que nenhum preenchedor automático conhece. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[-9999px] size-px overflow-hidden"
            >
              <label>
                Site
                <input
                  name="site"
                  tabIndex={-1}
                  autoComplete="off"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                />
              </label>
            </div>

            <p className="text-micro text-ink-muted">
              Seus dados vão só para {negocio.nome}, para combinar este pedido.
            </p>
          </form>
        )}
      </Painel>
    </>
  );
}

/** O corpo diz o código; sem corpo, o status decide. */
async function falhaDa(resposta: Response): Promise<FalhaPedidoCardapio> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_PEDIDO_CARDAPIO) {
      return corpo.erro as FalhaPedidoCardapio;
    }
  } catch {
    // Resposta sem corpo JSON.
  }
  return resposta.status === 400 ? "fora-de-forma" : "sem-resposta";
}

/**
 * Uma linha de lista, como a folha do orçamento. Sem foto, o quadrado some e
 * o texto começa na margem. O preço e a quantidade dividem a linha de baixo:
 * a 360px, ao lado do nome, espremeriam o nome.
 */
function Produto({
  contaId,
  produto,
  quantidade,
  aoMudar,
}: {
  contaId: string;
  produto: ProdutoDoCardapio;
  quantidade: number;
  aoMudar: (passo: number) => void;
}) {
  return (
    <li className="flex gap-4 py-4">
      {produto.fotoVersao !== undefined && (
        // Sem `next/image`: a foto já tem 320px (`#d162`).
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
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <p className="flex items-baseline gap-1.5">
            <Dinheiro centavos={produto.preco} />
            <span className="text-label text-ink-muted">
              · {produto.unidade}
            </span>
          </p>
          {quantidade === 0 ? (
            <Botao
              tamanho="sm"
              onClick={() => aoMudar(1)}
              aria-label={`Adicionar ${produto.nome}`}
              iconeInicial={
                <Plus aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Adicionar
            </Botao>
          ) : (
            <Passo
              nome={produto.nome}
              quantidade={quantidade}
              aoMudar={aoMudar}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** `−  2  +`, com alvo de 44px em cada lado. */
function Passo({
  nome,
  quantidade,
  aoMudar,
}: {
  nome: string;
  quantidade: number;
  aoMudar: (passo: number) => void;
}) {
  const botao =
    "toque flex items-center justify-center rounded-md text-ink transition-colors duration-150 ease-quart hover:bg-sunken active:bg-line disabled:opacity-45";
  return (
    <div className="flex shrink-0 items-center rounded-md border border-line-strong">
      <button
        type="button"
        onClick={() => aoMudar(-1)}
        aria-label={`Tirar um ${nome}`}
        className={botao}
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <span
        aria-live="polite"
        className="num min-w-8 text-center text-body font-semibold text-ink"
      >
        {quantidade}
      </span>
      <button
        type="button"
        onClick={() => aoMudar(1)}
        disabled={quantidade >= 500}
        aria-label={`Mais um ${nome}`}
        className={botao}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
