"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Check, MessageCircle, Minus, Plus, Tag } from "lucide-react";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { estiloDaLoja } from "./estiloDaLoja";
import {
  DIAS_A_FRENTE,
  economiaDoCombo,
  MENSAGEM_FALHA_PEDIDO_CARDAPIO,
  mensagemDeAviso,
  mensagemDeContato,
  type Cardapio,
  type CorDaLoja,
  type FalhaPedidoCardapio,
  type ProdutoDoCardapio,
  seloDaPromocao,
  unidadesPorFicha,
} from "@/lib/domain/cardapio";
import { dataDeISO, diaVizinho } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { nomeComEscolhas, subtotalDoItem } from "@/lib/domain/pedido";
import { linkDoWhatsApp, telefoneParaWhatsApp } from "@/lib/domain/whatsapp";
import { useDesktop } from "@/lib/hooks/useDispositivo";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * O pedido pela página do cardápio (spec 031, 3.B.3): a única parte da página
 * que roda no navegador da cliente. Recebe o `Cardapio` sem foto nenhuma
 * dentro (`#d162`) e a data de amanhã, calculada no servidor em Brasília.
 *
 * O carrinho mora em `useState` e mais nada: `localStorage` aqui seria um
 * carrinho que volta no celular de outra pessoa.
 *
 * O desenho é o da sessão F (`#d166`): no celular, a lista e a barra "Ver
 * pedido" que abre a folha; no desktop, o pedido fica ao lado da lista, sem
 * painel. O formulário é um só, e mora onde a tela manda.
 */

type Tipo = "RETIRADA" | "ENTREGA";

/** Os dias que viram botão em "Para quando?"; depois deles, "Outro dia". */
const DIAS_EM_BOTAO = 14;

const DIA_DA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

/** Uma linha do carrinho: o produto e, no combo à escolha, os sabores de UMA unidade. */
interface Linha {
  chave: string;
  produto: ProdutoDoCardapio;
  escolhas?: { fichaId: string; nome: string; quantidade: number }[];
  quantidade: number;
}

type LinhaSemQuantidade = Omit<Linha, "quantidade">;

/** Duas Duplas com os mesmos sabores são a mesma linha; com sabores diferentes, duas. */
function chaveDa(produtoId: string, escolhas?: Linha["escolhas"]): string {
  if (!escolhas) return produtoId;
  const sabores = escolhas
    .map((e) => `${e.fichaId}:${e.quantidade}`)
    .sort()
    .join(",");
  return `${produtoId}|${sabores}`;
}

/** A linha do carrinho na forma que `unidadesPorFicha` conta. */
function comoItem(linha: Linha) {
  return {
    fichaTecnicaId: linha.produto.id,
    quantidade: linha.quantidade,
    escolhas: linha.escolhas?.map((e) => ({
      fichaTecnicaId: e.fichaId,
      quantidade: e.quantidade,
    })),
  };
}

function nomeDa(linha: LinhaSemQuantidade): string {
  return nomeComEscolhas({
    nomeSnapshot: linha.produto.nome,
    escolhas: linha.escolhas?.map((e) => ({
      quantidade: e.quantidade,
      nomeSnapshot: e.nome,
    })),
  });
}

interface Enviado {
  codigo: string | null;
  total: Centavos;
  itens: {
    nome: string;
    quantidade: number;
    escolhas?: { quantidade: number; nomeSnapshot: string }[];
  }[];
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
  const desktop = useDesktop();

  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  const [aberto, setAberto] = useState(false);
  const [montando, setMontando] = useState<ProdutoDoCardapio | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState("");
  const [outroDia, setOutroDia] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("RETIRADA");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [site, setSite] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erroTelefone, setErroTelefone] = useState<string>();
  const [falha, setFalha] = useState<FalhaPedidoCardapio | null>(null);
  const [enviado, setEnviado] = useState<Enviado | null>(null);

  const idFormulario = useId();

  const quantidadeTotal = carrinho.reduce((s, l) => s + l.quantidade, 0);
  const total = carrinho.reduce(
    (s, l) =>
      s +
      subtotalDoItem({
        quantidade: l.quantidade,
        precoUnitario: l.produto.preco,
      }),
    0,
  );
  const itensEmTexto = `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`;

  const quantidadeDe = (chave: string) =>
    carrinho.find((l) => l.chave === chave)?.quantidade ?? 0;

  // O que resta dos limitados, menos o que o carrinho já leva (`#d164`). A
  // página só desabilita o "+"; quem trava é o servidor.
  const restamPorId = new Map<string, number>();
  for (const produto of cardapio.secoes.flatMap((s) => s.produtos)) {
    if (produto.restam !== undefined)
      restamPorId.set(produto.id, produto.restam);
    for (const opcao of (produto.escolhas ?? []).flatMap((e) => e.opcoes)) {
      if (opcao.restam !== undefined) restamPorId.set(opcao.id, opcao.restam);
    }
  }
  const levados = unidadesPorFicha(carrinho.map(comoItem), []);
  const livre = (fichaId: string) => {
    const restam = restamPorId.get(fichaId);
    return restam === undefined
      ? Infinity
      : restam - (levados.get(fichaId) ?? 0);
  };
  /** Mais uma unidade desta linha ainda cabe no que resta? */
  const cabeMaisUm = (linha: LinhaSemQuantidade) =>
    [...unidadesPorFicha([comoItem({ ...linha, quantidade: 1 })], [])].every(
      ([fichaId, leva]) => leva <= livre(fichaId),
    );

  function mudar(linha: LinhaSemQuantidade, passo: number) {
    const atual = quantidadeDe(linha.chave);
    const quantidade = Math.max(0, Math.min(500, atual + passo));
    const proximo =
      quantidade === 0
        ? carrinho.filter((l) => l.chave !== linha.chave)
        : atual === 0
          ? [...carrinho, { ...linha, quantidade }]
          : carrinho.map((l) =>
              l.chave === linha.chave ? { ...l, quantidade } : l,
            );
    setCarrinho(proximo);
    // Esvaziou dentro do painel: não há o que mandar.
    if (proximo.length === 0) setAberto(false);
  }

  function fechar() {
    setAberto(false);
    // Depois de enviar, fechar zera o carrinho. O nome e o WhatsApp ficam,
    // para um segundo pedido.
    if (enviado) {
      setCarrinho([]);
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
          itens: carrinho.map((l) => ({
            fichaId: l.produto.id,
            quantidade: l.quantidade,
            ...(l.escolhas
              ? {
                  escolhas: l.escolhas.map(({ fichaId, quantidade }) => ({
                    fichaId,
                    quantidade,
                  })),
                }
              : {}),
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
        // `acabou` é um `mudou`: a página renovada traz o que resta.
        if (codigo === "mudou" || codigo === "acabou") {
          setTimeout(() => location.reload(), 3000);
        }
        return;
      }

      const corpo = (await resposta.json()) as {
        codigo: string | null;
        total?: Centavos;
      };
      setEnviado({
        codigo: corpo.codigo,
        total: corpo.total ?? total,
        itens: carrinho.map((l) => ({
          nome: l.produto.nome,
          quantidade: l.quantidade,
          escolhas: l.escolhas?.map((e) => ({
            quantidade: e.quantidade,
            nomeSnapshot: e.nome,
          })),
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

  const dias = Array.from({ length: DIAS_EM_BOTAO }, (_, i) =>
    diaVizinho(amanha, i),
  );

  const corpo = enviado ? (
    <div className="space-y-4">
      {enviado.codigo && (
        <p className="flex flex-col gap-1">
          <span className="text-label text-ink-muted">Código do pedido</span>
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
        {/* O pedido gravou, mas a dona só fica sabendo quando abrir o app.
            O aviso é o toque que falta, e é aqui que ele se perde. */}
        {negocio.whatsapp
          ? `O pedido chegou. Falta um toque: mande a mensagem para a ${quem} no WhatsApp, que é por lá que ela confirma.`
          : `O pedido chegou. A ${quem} vai confirmar pelo WhatsApp.`}
      </p>
    </div>
  ) : (
    <form
      id={idFormulario}
      onSubmit={(evento) => void enviar(evento)}
      className="space-y-6"
    >
      <ul className="divide-y divide-line border-y border-line">
        {/* Trocar o sabor é tirar e montar de novo: um editor de
            escolha aqui seria um painel dentro de outro. */}
        {carrinho.map((linha) => (
          <li key={linha.chave} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="wrap-break-word text-body font-medium text-ink">
                {nomeDa(linha)}
              </p>
              <Dinheiro
                centavos={subtotalDoItem({
                  quantidade: linha.quantidade,
                  precoUnitario: linha.produto.preco,
                })}
                tamanho="sm"
              />
            </div>
            <Passo
              nome={linha.produto.nome}
              quantidade={linha.quantidade}
              podeMais={linha.quantidade < 500 && cabeMaisUm(linha)}
              aoMudar={(passo) => mudar(linha, passo)}
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

      <fieldset className="space-y-3">
        <legend className="text-label font-medium text-ink">
          Como você recebe?
        </legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1">
          {(
            [
              ["RETIRADA", "Retiro"],
              ["ENTREGA", "Entrega"],
            ] as const
          ).map(([valor, rotulo]) => (
            <Opcao
              key={valor}
              name="tipo"
              marcada={tipo === valor}
              aoMarcar={() => setTipo(valor)}
              className="h-11 rounded-md"
            >
              {tipo === valor && (
                <Check aria-hidden className="size-4" strokeWidth={2} />
              )}
              {rotulo}
            </Opcao>
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

      {/* Os próximos dias como botão, e o calendário só para quem precisa
          de um dia mais longe: a escolha comum custa um toque. */}
      <fieldset className="space-y-3">
        <legend className="text-label font-medium text-ink">
          Para quando?
        </legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {dias.map((dia, i) => (
            <Opcao
              key={dia}
              name="dia"
              required
              marcada={!outroDia && data === dia}
              aoMarcar={() => {
                setOutroDia(false);
                setData(dia);
              }}
              className="h-16 w-16 shrink-0 flex-col gap-0 rounded-md border"
            >
              <span className="text-micro">
                {i === 0 ? "amanhã" : semana(dia)}
              </span>
              <span className="num text-body font-semibold">
                {diaEMes(dia)}
              </span>
            </Opcao>
          ))}
          <Opcao
            name="dia"
            required
            marcada={outroDia}
            aoMarcar={() => {
              setOutroDia(true);
              setData("");
            }}
            className="h-16 shrink-0 rounded-md border px-4"
          >
            Outro dia
          </Opcao>
        </div>
        {outroDia && (
          <Campo
            rotulo="Qual dia?"
            required
            type="date"
            min={amanha}
            max={diaVizinho(amanha, DIAS_A_FRENTE - 1)}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        )}
        <p className="text-label text-ink-muted">
          A {quem} confirma se dá para esse dia.
        </p>
      </fieldset>

      <AreaTexto
        rotulo={`Recado pra ${quem}`}
        dica="Opcional. Uma alergia, o nome pro cartão, o que precisar."
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

      <p className="text-label text-ink-muted">
        Seus dados vão só para {negocio.nome}, para combinar este pedido.
      </p>
    </form>
  );

  const rodape = enviado ? (
    <div className="space-y-2 pb-4">
      {negocio.whatsapp && (
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
            variante: "loja",
            tamanho: "lg",
            larguraTotal: true,
          })}
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          Avisar a {quem} no WhatsApp
        </a>
      )}
      {/* No celular, fechar a folha já zera; ao lado da lista não há folha. */}
      {desktop && (
        <Botao variante="terciaria" larguraTotal onClick={fechar}>
          Fazer outro pedido
        </Botao>
      )}
    </div>
  ) : (
    <div className="pb-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-label text-ink-muted">
          Total
          {tipo === "ENTREGA" && <span className="block">sem a entrega</span>}
        </span>
        <Dinheiro centavos={total} tamanho="xl" />
      </div>
      <Botao
        type="submit"
        form={idFormulario}
        variante="loja"
        tamanho="lg"
        larguraTotal
        carregando={enviando}
      >
        {enviando ? "Enviando" : "Enviar pedido"}
      </Botao>
      {falha ? (
        <div role="alert" className="mt-3 space-y-3">
          <p className="text-label text-negative">
            {MENSAGEM_FALHA_PEDIDO_CARDAPIO[falha]}
          </p>
          {(falha === "cheio" || falha === "fechado") && linkContato && (
            <a
              href={linkContato}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBotao({ larguraTotal: true })}
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
      ) : (
        negocio.whatsapp && (
          <p className="mt-2 text-center text-label text-ink-muted">
            Depois você avisa a {quem} pelo WhatsApp, com o pedido já escrito.
          </p>
        )
      )}
    </div>
  );

  return (
    <>
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_23.25rem] lg:items-start lg:gap-10">
        <div
          className={cn("px-4 lg:px-0", quantidadeTotal > 0 && "pb-24 lg:pb-0")}
        >
          {/* Âncoras, e não filtro: a lista é uma só, e a cliente rola. Sem
              "ativa", porque uma pílula que não segue a rolagem mente. */}
          {cardapio.secoes.length > 1 && (
            <nav
              aria-label="Categorias"
              className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas px-4 py-2 lg:mx-0 lg:px-0"
            >
              <div className="flex gap-2 overflow-x-auto">
                {cardapio.secoes.map((secao, i) => (
                  <a
                    key={secao.categoria}
                    href={`#secao-${i}`}
                    className="toque inline-flex shrink-0 items-center rounded-full border border-line-strong bg-surface px-4 text-label font-medium text-ink transition-colors duration-150 ease-quart hover:bg-sunken"
                  >
                    {secao.categoria}
                  </a>
                ))}
              </div>
            </nav>
          )}

          <div className="mt-2 space-y-10">
            {cardapio.secoes.map((secao, i) => (
              <section
                key={secao.categoria}
                id={`secao-${i}`}
                aria-label={secao.categoria}
                className="scroll-mt-16 pt-4"
              >
                <h2 className="font-display text-heading font-semibold text-ink">
                  {secao.categoria}
                </h2>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {secao.produtos.map((produto) => (
                    <Produto
                      key={produto.id}
                      contaId={contaId}
                      produto={produto}
                      hoje={diaVizinho(amanha, -1)}
                      quantidade={
                        produto.escolhas
                          ? carrinho
                              .filter((l) => l.produto.id === produto.id)
                              .reduce((s, l) => s + l.quantidade, 0)
                          : quantidadeDe(produto.id)
                      }
                      podeMais={
                        produto.escolhas
                          ? true
                          : cabeMaisUm({ chave: produto.id, produto })
                      }
                      aoMudar={(passo) =>
                        produto.escolhas
                          ? setMontando(produto)
                          : mudar({ chave: produto.id, produto }, passo)
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* O pedido ao lado da lista, sem painel: no desktop cabe, e a
            cliente vê o total mudar a cada "Adicionar". */}
        <aside
          aria-label="Seu pedido"
          className="hidden rounded-lg border border-line bg-surface lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
        >
          {desktop && (
            <>
              <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="font-display text-heading font-semibold text-ink">
                  {enviado ? "Pedido enviado" : "Seu pedido"}
                </h2>
                {!enviado && quantidadeTotal > 0 && (
                  <span className="num text-label text-ink-muted">
                    {itensEmTexto}
                  </span>
                )}
              </div>
              {carrinho.length === 0 && !enviado ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-body font-semibold text-ink">
                    Nada no pedido ainda
                  </p>
                  <p className="mt-1 text-label text-ink-muted">
                    O que você adicionar aparece aqui, com o total.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 px-5 pt-4">
                  {corpo}
                  {rodape}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {quantidadeTotal > 0 && (
        <div className="area-segura-inferior fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas px-4 pt-3 lg:hidden">
          <div className="mx-auto w-full max-w-xl pb-3">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setAberto(true)}
              className={classesBotao({
                variante: "loja",
                tamanho: "lg",
                larguraTotal: true,
                className: "num justify-between rounded-lg",
              })}
            >
              <span>Ver pedido · {itensEmTexto}</span>
              <span className="font-semibold">{formatarMoeda(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* O painel monta fechado, e no desktop o formulário já está ao lado da
          lista: dois `<form>` com o mesmo id mandariam o pedido pelo errado. */}
      <Painel
        aberto={aberto && !desktop}
        aoFechar={fechar}
        titulo={enviado ? "Pedido enviado" : "Seu pedido"}
        rodape={!desktop && <NaCor cor={negocio.cor}>{rodape}</NaCor>}
      >
        {!desktop && <NaCor cor={negocio.cor}>{corpo}</NaCor>}
      </Painel>

      <MonteOCombo
        cor={negocio.cor}
        produto={montando}
        livre={livre}
        aoFechar={() => setMontando(null)}
        aoPor={(escolhas) => {
          const produto = montando!;
          mudar({ chave: chaveDa(produto.id, escolhas), produto, escolhas }, 1);
          setMontando(null);
        }}
      />
    </>
  );
}

/** "sex", sem o ponto da abreviação. */
function semana(iso: string): string {
  return DIA_DA_SEMANA.format(dataDeISO(iso)).replace(".", "");
}

/** "25/9". */
function diaEMes(iso: string): string {
  const data = dataDeISO(iso);
  return `${data.getDate()}/${data.getMonth() + 1}`;
}

/**
 * Um rádio com cara de botão. A marcada vai na cor da loja, e quem diz qual é
 * a marcada é o rádio de verdade por baixo, e não só a cor.
 */
function Opcao({
  name,
  marcada,
  aoMarcar,
  required,
  className,
  children,
}: {
  name: string;
  marcada: boolean;
  aoMarcar: () => void;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 text-body font-medium",
        "transition-colors duration-150 ease-quart",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)",
        marcada
          ? "border-loja bg-loja text-on-loja"
          : "border-line-strong bg-surface text-ink hover:bg-sunken",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        required={required}
        checked={marcada}
        onChange={aoMarcar}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** O `Painel` abre num portal, fora do `<main>` que carrega a cor da loja. */
function NaCor({
  cor,
  children,
}: {
  cor: CorDaLoja | undefined;
  children: ReactNode;
}) {
  return (
    <div style={estiloDaLoja(cor)} className="contents">
      {children}
    </div>
  );
}

/**
 * "Monte a sua Dupla" (spec 031, 4.C.3): uma seção por escolha, o "+" travado
 * quando a categoria enche (a regra de `escolhasCompletas`), o que falta em
 * texto e a economia da combinação escolhida, quando a página sabe a conta.
 */
function MonteOCombo({
  cor,
  produto,
  livre,
  aoFechar,
  aoPor,
}: {
  cor: CorDaLoja | undefined;
  produto: ProdutoDoCardapio | null;
  /** Quantas desta receita o carrinho ainda pode levar; `Infinity` sem limite. */
  livre: (fichaId: string) => number;
  aoFechar: () => void;
  aoPor: (escolhas: NonNullable<Linha["escolhas"]>) => void;
}) {
  const [sabores, setSabores] = useState<Record<string, number>>({});
  // Um combo novo começa do zero; o mesmo reaberto também.
  const [de, setDe] = useState<ProdutoDoCardapio | null>(null);
  if (produto !== de) {
    setDe(produto);
    setSabores({});
  }

  const escolhas = produto?.escolhas ?? [];
  const faltam = escolhas.map(
    (escolha) =>
      escolha.quantidade -
      escolha.opcoes.reduce((s, o) => s + (sabores[o.id] ?? 0), 0),
  );
  const completo = faltam.every((f) => f === 0);

  const montadas = escolhas.flatMap((escolha) =>
    escolha.opcoes
      .filter((o) => (sabores[o.id] ?? 0) > 0)
      .map((o) => ({
        fichaId: o.id,
        nome: o.nome,
        quantidade: sabores[o.id]!,
      })),
  );
  const economia =
    produto && completo ? economiaDoCombo(produto, montadas) : null;

  return (
    <Painel
      aberto={produto !== null}
      aoFechar={aoFechar}
      titulo={produto ? `Monte a sua ${produto.nome}` : ""}
      rodape={
        <div style={estiloDaLoja(cor)} className="pb-4">
          {economia !== null && economia > 0 && produto && (
            <p className="num mb-3 text-label text-ink-muted">
              Separados sairiam {formatarMoeda(produto.preco + economia)} · você
              economiza {formatarMoeda(economia)}
            </p>
          )}
          <Botao
            variante="loja"
            tamanho="lg"
            larguraTotal
            disabled={!completo}
            onClick={() => aoPor(montadas)}
          >
            Pôr no pedido
          </Botao>
        </div>
      }
    >
      <div className="space-y-8">
        {escolhas.map((escolha, i) => (
          <fieldset key={escolha.categoria}>
            <legend className="text-label font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Escolha {escolha.quantidade} · {escolha.categoria}
            </legend>
            <p
              aria-live="polite"
              className="mt-1 flex items-center gap-1.5 text-label text-ink-muted"
            >
              {faltam[i]! > 0 ? (
                `Falta escolher ${faltam[i]}`
              ) : (
                <>
                  <Check
                    aria-hidden
                    className="size-4 text-positive"
                    strokeWidth={2}
                  />
                  Escolhido
                </>
              )}
            </p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {escolha.opcoes.map((opcao) => {
                const escolhidas = sabores[opcao.id] ?? 0;
                return (
                  <li key={opcao.id} className="flex items-center gap-3 py-3">
                    <p
                      className={cn(
                        "min-w-0 flex-1 wrap-break-word text-body font-medium",
                        opcao.restam === 0 ? "text-ink-muted" : "text-ink",
                      )}
                    >
                      {opcao.nome}
                    </p>
                    {opcao.restam === 0 ? (
                      <span className="text-label font-medium text-ink-muted">
                        Esgotado
                      </span>
                    ) : (
                      <Passo
                        nome={opcao.nome}
                        quantidade={escolhidas}
                        podeMais={
                          faltam[i]! > 0 && escolhidas + 1 <= livre(opcao.id)
                        }
                        aoMudar={(passo) =>
                          setSabores({
                            ...sabores,
                            [opcao.id]: Math.max(0, escolhidas + passo),
                          })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </Painel>
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
 * Uma linha de lista, com a foto à direita e só foto: o "+" não flutua sobre
 * ela, porque sem foto ele flutuaria no nada (`#d166`). O preço e o controle
 * ocupam a linha de baixo inteira: a 360px, ao lado da foto, espremeriam.
 */
function Produto({
  contaId,
  produto,
  hoje,
  quantidade,
  podeMais,
  aoMudar,
}: {
  contaId: string;
  produto: ProdutoDoCardapio;
  /** O dia de Brasília, para "termina hoje". */
  hoje: string;
  quantidade: number;
  /** Falso quando o carrinho já leva tudo o que resta (`#d164`). */
  podeMais: boolean;
  aoMudar: (passo: number) => void;
}) {
  const esgotado = produto.restam === 0;
  const selo = seloDaPromocao(produto, hoje);
  return (
    <li className="py-4">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="wrap-break-word text-body font-semibold text-ink">
            {produto.nome}
          </h3>
          {produto.descricao && (
            <p className="mt-1 line-clamp-3 text-label text-ink-muted">
              {produto.descricao}
            </p>
          )}
          {/* A economia é contra o preço que a própria página cobra (`#d163`):
              texto, sem selo colorido. */}
          {produto.avulso !== undefined && (
            <p className="num mt-1 text-label text-ink-muted">
              Separados sairiam {formatarMoeda(produto.avulso)} · você economiza{" "}
              {formatarMoeda(produto.avulso - produto.preco)}
            </p>
          )}
          {produto.escolhas && (
            <p className="num mt-1 text-label text-ink-muted">
              Você escolhe os sabores
              {produto.economiaMinima !== undefined &&
                ` · economize pelo menos ${formatarMoeda(produto.economiaMinima)}`}
            </p>
          )}
        </div>
        {produto.fotoVersao !== undefined && (
          // Sem `next/image`: a foto já tem 320px (`#d162`).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/c/${encodeURIComponent(contaId)}/foto/${encodeURIComponent(produto.id)}?v=${produto.fotoVersao}`}
            alt={produto.nome}
            width={104}
            height={104}
            loading="lazy"
            decoding="async"
            className="size-26 shrink-0 rounded-md bg-sunken object-cover"
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            {/* O riscado é o preço de sempre da ficha, e nunca um "de"
                inventado (`#d165`). */}
            {produto.precoCheio !== undefined && (
              <s className="num text-label text-ink-muted">
                <span className="sr-only">antes </span>
                {formatarMoeda(produto.precoCheio)}
              </s>
            )}
            <Dinheiro centavos={produto.preco} />
            <span className="text-label text-ink-muted">
              · {produto.unidade}
            </span>
          </p>
          {selo && (
            <Selo
              icone={<Tag aria-hidden className="size-3.5" strokeWidth={2} />}
              className="num mt-1"
            >
              {selo}
            </Selo>
          )}
          {/* Contado do pote, e só do que ela marcou como limitado (`#d164`). */}
          {produto.restam !== undefined && !esgotado && (
            <p className="num text-label text-ink-muted">
              Restam {produto.restam}
            </p>
          )}
        </div>
        {/* O combo à escolha sempre abre "Monte a sua": cada unidade pode ter
            outros sabores, e a quantidade dele mora no pedido. */}
        {esgotado ? (
          <span className="text-label font-medium text-ink-muted">
            Esgotado
          </span>
        ) : quantidade === 0 || produto.escolhas ? (
          <div className="flex items-center gap-2">
            {quantidade > 0 && (
              <span className="num text-label text-ink-muted">
                {quantidade} no pedido
              </span>
            )}
            <Botao
              tamanho="sm"
              disabled={!podeMais}
              onClick={() => aoMudar(1)}
              aria-haspopup={produto.escolhas ? "dialog" : undefined}
              aria-label={`Adicionar ${produto.nome}`}
              iconeInicial={
                <Plus aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Adicionar
            </Botao>
          </div>
        ) : (
          // Na cor da loja: o que já está no pedido é o que tem cor na lista.
          <Passo
            nome={produto.nome}
            quantidade={quantidade}
            podeMais={quantidade < 500 && podeMais}
            aoMudar={aoMudar}
            naCor
          />
        )}
      </div>
    </li>
  );
}

/** `−  2  +`, com alvo de 44px em cada lado. */
function Passo({
  nome,
  quantidade,
  podeMais = quantidade < 500,
  aoMudar,
  naCor = false,
}: {
  nome: string;
  quantidade: number;
  podeMais?: boolean;
  aoMudar: (passo: number) => void;
  /** Cheio na cor da loja, e não contornado. */
  naCor?: boolean;
}) {
  const botao = cn(
    "toque flex items-center justify-center rounded-md transition-colors duration-150 ease-quart disabled:opacity-45",
    naCor
      ? "text-on-loja hover:bg-on-loja/10 active:bg-on-loja/20"
      : "text-ink hover:bg-sunken active:bg-line",
  );
  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-md",
        naCor ? "bg-loja text-on-loja" : "border border-line-strong text-ink",
      )}
    >
      <button
        type="button"
        onClick={() => aoMudar(-1)}
        disabled={quantidade === 0}
        aria-label={`Tirar um ${nome}`}
        className={botao}
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <span
        aria-live="polite"
        className="num min-w-8 text-center text-body font-semibold"
      >
        {quantidade}
      </span>
      <button
        type="button"
        onClick={() => aoMudar(1)}
        disabled={!podeMais}
        aria-label={`Mais um ${nome}`}
        className={botao}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
