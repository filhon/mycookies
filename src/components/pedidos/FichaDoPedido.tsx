"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  BanknoteArrowUp,
  Check,
  MapPin,
  MessageCircle,
  NotebookPen,
  Phone,
  Store,
  Truck,
  TriangleAlert,
  Undo2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Painel } from "@/components/ui/Painel";
import { Pilulas } from "@/components/ui/Pilulas";
import { Marcador } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { SeloStatus } from "./SeloStatus";
import {
  competenciaDeISO,
  dataISODe,
  rotuloAgenda,
  rotuloDia,
  rotuloDiaPorExtenso,
} from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { brCodePix } from "@/lib/domain/pix";
import {
  ACAO_STATUS_PEDIDO,
  derivarPedido,
  proximoPasso,
  quantidadeEmTexto,
  resumoDasEscolhas,
} from "@/lib/domain/pedido";
import {
  linkDoWhatsApp,
  mensagemDeCobranca,
  mensagemDoPedido,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import {
  docCliente,
  docConfiguracao,
  docPedido,
} from "@/lib/firebase/colecoes";
import {
  atualizarPedido,
  desfazerPagamento,
  marcarPedidoPago,
  mudarStatusPedido,
} from "@/lib/firebase/mutations/pedidos";
import { useDocumento } from "@/lib/hooks/useColecao";
import { useContextoPagamento } from "@/lib/hooks/useContextoPagamento";
import type {
  Cliente,
  ConfiguracaoGeral,
  DataISO,
  FormaPagamento,
  Pedido,
  StatusPedido,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId, usePapel } from "@/providers/AuthProvider";

/**
 * O pedido para ler, numa folha no celular e no painel lateral no desktop
 * (`DECISOES.md#d249`): o que é, quanto sobra, onde entrega, como falar com
 * ela e em que pé está o dinheiro. O rodapé tem o próximo passo e "Editar
 * pedido"; voltar um passo, cancelar e arquivar ficam no editor.
 *
 * Na mesa do desktop (`acoplada`, `#d253`) a mesma ficha mora numa coluna ao
 * lado da tabela, o arranjo de Materiais (`#d225`): sem fundo escuro, com a
 * lista clicável ao lado, e o `Escape` fechando por aqui.
 *
 * O pedido é lido pelo id, como o editor lê: o da lista é só o primeiro
 * quadro. Um pedido de "Me devem" pago aqui sai daquela consulta e pode não
 * estar entre os trinta do que saiu, e a ficha precisa continuar vendo o
 * documento para o "Desfazer" ter o que desfazer.
 */
export function FichaDoPedido({
  aberto,
  aoFechar,
  pedido: daLista,
  hoje,
  acoplada = false,
}: {
  aberto: boolean;
  aoFechar: () => void;
  pedido: Pedido;
  hoje: DataISO;
  /** Na coluna ao lado da tabela, e não no `Painel`. Só no desktop. */
  acoplada?: boolean;
}) {
  const contaId = useContaId();
  // Receber é da dona (spec 030, `#d157`): o editor não mostra o bloco de
  // pagamento para a ajudante, e a ficha também não.
  const dona = usePapel() === "DONA";

  const referenciaPedido = useMemo(
    () => docPedido(contaId, daLista.id),
    [contaId, daLista.id],
  );
  const pedido = useDocumento<Pedido>(referenciaPedido).dado ?? daLista;

  const referenciaConfiguracao = useMemo(
    () => docConfiguracao(contaId),
    [contaId],
  );
  const configuracao = useDocumento<ConfiguracaoGeral>(
    referenciaConfiguracao,
  ).dado;
  const formas = configuracao?.formasPagamento ?? [];

  // A cliente vinculada pelo id do pedido, como o editor faz. Arquivada não
  // conta: o editor só acha a cliente entre as não arquivadas.
  const referenciaCliente = useMemo(
    () =>
      dona && pedido.clienteId ? docCliente(contaId, pedido.clienteId) : null,
    [dona, contaId, pedido.clienteId],
  );
  const vinculada = useDocumento<Cliente>(referenciaCliente).dado;
  const cliente =
    vinculada && !vinculada.arquivado
      ? {
          id: vinculada.id,
          totalPedidos: vinculada.totalPedidos,
          totalGasto: vinculada.totalGasto,
        }
      : null;

  // "Recebi" grava com o dia de hoje; desfazer, no mês em que foi pago.
  const pagamento = useContextoPagamento(
    contaId,
    dona ? (pedido.competenciaPagamento ?? competenciaDeISO(hoje)) : null,
  );

  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  /** A forma escolhida nas pílulas, quando o pedido não tem nenhuma. */
  const [formaEscolhida, setFormaEscolhida] = useState<string | null>(null);
  /** O pedido que foi pago por esta ficha: o "Desfazer" vive enquanto ela fica aberta. */
  const [pagoAqui, setPagoAqui] = useState<string | null>(null);

  function fechar() {
    setFalha(null);
    setFormaEscolhida(null);
    setPagoAqui(null);
    aoFechar();
  }

  // O "adiante" da fila, e não o passo atrás nem o cancelar (`#d249`).
  const passo = proximoPasso(pedido);
  const proximo = passo === "RECEBER" ? undefined : passo;
  const cobrar = passo === "RECEBER";
  const receber = cobrar && dona;

  const forma = formas.find((item) => item.id === pedido.formaPagamentoId);
  const formasAtivas = formas.filter((item) => item.ativo);
  // Sem forma no pedido, ela escolhe antes de confirmar. A troca de uma forma
  // que já está no pedido é do editor: muda a taxa e a sobra (spec 063, §2).
  const escolherForma =
    receber && !pedido.formaPagamentoId && formasAtivas.length > 0;
  const formaParaPagar = escolherForma
    ? formas.find((item) => item.id === formaEscolhida)
    : forma;

  async function andar(para: StatusPedido) {
    setFalha(null);
    setOcupado(true);
    try {
      await mudarStatusPedido(contaId, pedido, para);
    } catch {
      setFalha("Não foi possível mudar o pedido de estado agora.");
    } finally {
      setOcupado(false);
    }
  }

  async function recebi() {
    setFalha(null);
    setOcupado(true);
    try {
      let paraPagar = pedido;
      if (escolherForma && formaParaPagar) {
        // A forma entra no pedido pelo mesmo caminho do "Salvar" do editor,
        // que refaz a taxa da maquininha e a sobra; e o pagamento lança com
        // os números novos, que a assinatura ainda não trouxe.
        await atualizarPedido(
          contaId,
          pedido,
          dadosComForma(pedido, formaParaPagar.id, formas),
        );
        paraPagar = { ...pedido, ...derivadosCom(pedido, formaParaPagar) };
      }
      await marcarPedidoPago(
        contaId,
        paraPagar,
        hoje,
        formas,
        pagamento.contexto,
        cliente,
      );
      setPagoAqui(pedido.id);
    } catch {
      setFalha(
        "Não foi possível marcar como pago agora. Tente de novo em instantes.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function desfazer() {
    setFalha(null);
    setOcupado(true);
    try {
      await desfazerPagamento(contaId, pedido, pagamento.contexto, cliente);
      setPagoAqui(null);
    } catch {
      setFalha(
        "Não foi possível desfazer o pagamento agora. Tente de novo em instantes.",
      );
    } finally {
      setOcupado(false);
    }
  }

  const numero = telefoneParaWhatsApp(pedido.clienteTelefone);
  const mensagem = cobrar
    ? mensagemDeCobranca(pedido)
    : mensagemDoPedido({
        negocio: configuracao?.nomeNegocio ?? "",
        codigo: pedido.codigo,
        clienteNome: pedido.clienteNome,
        itens: pedido.itens,
        subtotal: pedido.subtotal,
        desconto: pedido.desconto,
        taxaEntrega: pedido.entrega.taxa,
        total: pedido.total,
        entrega: {
          tipo: pedido.entrega.tipo,
          dataISO: pedido.dataEntregaISO,
          hora: pedido.horaEntrega,
          endereco: pedido.entrega.endereco ?? undefined,
        },
        formaNome: forma?.nome,
        formaInstrucoes: forma?.instrucoes,
        formaPix: forma?.pix,
        pago: pedido.pago,
      });

  const endereco = pedido.entrega.endereco?.trim();
  const noPrejuizo = pedido.lucroEstimado < 0;
  const taxaDaEscolhida =
    escolherForma && formaParaPagar
      ? derivadosCom(pedido, formaParaPagar).custoTaxaPagamento
      : 0;

  const primario = receber ? (
    <Botao
      variante="primaria"
      tamanho="lg"
      className="flex-1"
      carregando={ocupado}
      disabled={pagamento.carregando || (escolherForma && !formaParaPagar)}
      onClick={() => void recebi()}
      iconeInicial={
        <BanknoteArrowUp aria-hidden className="size-5" strokeWidth={1.75} />
      }
    >
      Recebi
    </Botao>
  ) : proximo ? (
    <Botao
      variante="primaria"
      tamanho="lg"
      className="flex-1"
      carregando={ocupado}
      onClick={() => void andar(proximo)}
    >
      {ACAO_STATUS_PEDIDO[proximo]}
    </Botao>
  ) : null;

  const rodape = (
    <div className="flex gap-2">
      {primario}
      <Link
        href={`/pedidos/${pedido.id}`}
        className={classesBotao({
          tamanho: "lg",
          className: primario ? "shrink-0" : "flex-1",
        })}
      >
        Editar pedido
      </Link>
    </div>
  );

  const conteudo = (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <SeloStatus status={pedido.status} />
        {pedido.origem === "CARDAPIO" && (
          <Marcador
            icone={
              <Store aria-hidden className="size-3.5" strokeWidth={1.75} />
            }
          >
            Pelo cardápio
          </Marcador>
        )}
        <span className="num text-micro text-ink-muted">{pedido.codigo}</span>
      </p>

      <section aria-label="O que ela pediu">
        <ul className="divide-y divide-line">
          {pedido.itens.map((item, indice) => (
            <li
              key={`${item.fichaTecnicaId}-${indice}`}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-body text-ink">
                  <span className="num font-semibold">
                    {quantidadeEmTexto(item.quantidade)} ×
                  </span>{" "}
                  {item.nomeSnapshot}
                </p>
                {/* A composição inteira: é o que ela separa na bancada. */}
                {item.escolhas?.length ? (
                  <p className="num mt-0.5 text-label text-ink-muted">
                    {resumoDasEscolhas(item.escolhas)}
                  </p>
                ) : null}
                {item.observacao && (
                  <p className="mt-0.5 text-label text-ink-muted">
                    {item.observacao}
                  </p>
                )}
              </div>
              <Dinheiro centavos={item.subtotal} className="shrink-0" />
            </li>
          ))}
        </ul>

        {/* O par obrigatório: o total e o que sobra dele. */}
        <div className="mt-1 flex items-start justify-between gap-3 border-t border-line pt-3">
          <p className="num text-label text-ink-muted">
            Total
            {pedido.desconto > 0 &&
              ` · com ${formatarMoeda(pedido.desconto)} de desconto`}
          </p>
          <div className="text-right">
            <Dinheiro centavos={pedido.total} tamanho="lg" />
            <p
              className={cn(
                "num mt-0.5 flex items-center justify-end gap-1 text-label",
                noPrejuizo ? "text-negative" : "text-ink-muted",
              )}
            >
              {noPrejuizo && (
                <TriangleAlert
                  aria-hidden
                  className="size-3.5"
                  strokeWidth={2}
                />
              )}
              {noPrejuizo
                ? `perde ${formatarMoeda(Math.abs(pedido.lucroEstimado))}`
                : `sobram ${formatarMoeda(pedido.lucroEstimado)} pra você`}
            </p>
          </div>
        </div>
      </section>

      <div className="divide-y divide-line border-y border-line">
        <Fato icone={pedido.entrega.tipo === "ENTREGA" ? Truck : Store}>
          {pedido.entrega.tipo === "ENTREGA" ? (
            <>
              <p className="num text-body text-ink">
                Entrega
                {pedido.entrega.taxa > 0 &&
                  ` · ${formatarMoeda(pedido.entrega.taxa)}`}
              </p>
              {endereco && (
                <p className="text-label text-ink-muted">{endereco}</p>
              )}
            </>
          ) : (
            <p className="text-body text-ink">Retirada</p>
          )}
          {endereco && pedido.entrega.tipo === "ENTREGA" && (
            <Acoes>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao({ tamanho: "sm" })}
              >
                <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
                Abrir no mapa
              </a>
            </Acoes>
          )}
        </Fato>

        {pedido.clienteTelefone?.trim() && (
          <Fato icone={Phone}>
            <p className="num text-body text-ink">{pedido.clienteTelefone}</p>
            {/* Sem número discável, o número fica como texto (`#d249`). */}
            {numero && (
              <Acoes>
                {/* Um `<a>`, e não `window.open` (`#d77`). */}
                <a
                  href={linkDoWhatsApp(numero, mensagem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao({ tamanho: "sm" })}
                >
                  <MessageCircle
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  WhatsApp
                  <span className="sr-only">
                    {cobrar ? ", com a cobrança escrita" : ", com o resumo"}
                  </span>
                </a>
                <a
                  href={`tel:+${numero}`}
                  className={classesBotao({ tamanho: "sm" })}
                >
                  <Phone aria-hidden className="size-4" strokeWidth={1.75} />
                  Ligar
                </a>
              </Acoes>
            )}
          </Fato>
        )}

        {pedido.observacoes?.trim() && (
          <Fato icone={NotebookPen}>
            <p className="max-w-[60ch] whitespace-pre-line text-body text-ink">
              {pedido.observacoes}
            </p>
          </Fato>
        )}

        <Fato icone={Wallet}>
          <p className="flex flex-wrap items-center gap-1.5 text-body text-ink">
            {pedido.pago && (
              <Check
                aria-hidden
                className="size-4 text-positive"
                strokeWidth={2.5}
              />
            )}
            {[forma?.nome, linhaDoPagamento(pedido, hoje)]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/* A cobrança com o Pix na mão (`#d278`): colado na conversa, ou
                onde ela quiser, já com o valor e o código do pedido. */}
          {!pedido.pago && forma?.pix && pedido.total > 0 && (
            <div className="mt-3">
              <BotaoCopiar
                rotulo={`Copiar o Pix de ${formatarMoeda(pedido.total)}`}
                texto={brCodePix({
                  ...forma.pix,
                  valor: pedido.total,
                  identificador: pedido.codigo,
                })}
              />
            </div>
          )}

          {escolherForma && (
            <div className="mt-3 space-y-2">
              <p className="text-label text-ink-muted">Como ela pagou?</p>
              <Pilulas
                rotulo="Forma de pagamento"
                opcoes={formasAtivas.map((item) => ({
                  valor: item.id,
                  rotulo: item.nome,
                }))}
                valor={formaEscolhida ?? ""}
                aoMudar={setFormaEscolhida}
              />
              {taxaDaEscolhida > 0 && (
                <p className="num text-label text-ink-muted">
                  A maquininha fica com {formatarMoeda(taxaDaEscolhida)}.
                </p>
              )}
            </div>
          )}

          {/* Errar o toque tem volta no mesmo lugar, enquanto a ficha fica
                aberta. Depois, desfazer é do editor, com a confirmação. */}
          {dona && pedido.pago && pagoAqui === pedido.id && (
            <Acoes>
              <Botao
                variante="terciaria"
                tamanho="sm"
                disabled={ocupado}
                onClick={() => void desfazer()}
                iconeInicial={
                  <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Desfazer
              </Botao>
            </Acoes>
          )}
        </Fato>
      </div>

      {falha && (
        <p role="alert" className="text-label text-negative">
          {falha}
        </p>
      )}
    </div>
  );

  if (acoplada) {
    return (
      <FichaAcoplada
        id={pedido.id}
        titulo={pedido.clienteNome}
        descricao={linhaDoDia(pedido, hoje)}
        aoFechar={fechar}
        rodape={rodape}
      >
        {conteudo}
      </FichaAcoplada>
    );
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={fechar}
      titulo={pedido.clienteNome}
      descricao={linhaDoDia(pedido, hoje)}
      rodape={rodape}
    >
      {conteudo}
    </Painel>
  );
}

/**
 * A coluna ao lado da tabela (`#d253`), a de `FichaAcoplada` de Materiais:
 * foco nela ao abrir e ao trocar de pedido, para o `Escape` ter de onde sair.
 */
function FichaAcoplada({
  id,
  titulo,
  descricao,
  aoFechar,
  rodape,
  children,
}: {
  id: string;
  titulo: string;
  descricao: string;
  aoFechar: () => void;
  rodape: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [id]);

  function aoTeclar(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key !== "Escape") return;
    evento.stopPropagation();
    aoFechar();
  }

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={titulo}
      onKeyDown={aoTeclar}
      className="mt-2 hidden w-104 shrink-0 flex-col rounded-lg border border-line bg-surface outline-none lg:flex"
    >
      <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-title font-semibold text-ink">
            {titulo}
          </h2>
          <p className="mt-1 text-label text-ink-muted">{descricao}</p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="toque -mr-2 -mt-1 flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="px-5 py-5">{children}</div>

      <footer className="border-t border-line px-5 py-4">{rodape}</footer>
    </aside>
  );
}

/** Uma linha de fato da ficha: ícone, o que é, e as ações embaixo. */
function Fato({
  icone: Icone,
  children,
}: {
  icone: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <Icone
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Acoes({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-2">{children}</div>;
}

/** "Hoje, quinta-feira, 1 de outubro, às 14:30 · o preço vale até 03 de out." */
function linhaDoDia(pedido: Pedido, hoje: DataISO): string {
  const agenda = rotuloAgenda(pedido.dataEntregaISO, hoje);
  const extenso = rotuloDiaPorExtenso(pedido.dataEntregaISO);
  const data =
    agenda.toLowerCase() === extenso ? agenda : `${agenda}, ${extenso}`;
  const dia = pedido.horaEntrega ? `${data}, às ${pedido.horaEntrega}` : data;
  return pedido.status === "ORCAMENTO" && pedido.validoAteISO
    ? `${dia} · o preço vale até ${rotuloDia(pedido.validoAteISO)}`
    : dia;
}

function linhaDoPagamento(pedido: Pedido, hoje: DataISO): string {
  if (!pedido.pago) return "ainda não pago";
  if (!pedido.pagoEm) return "pago";
  const dia = dataISODe(pedido.pagoEm.toDate());
  return dia === hoje ? "pago hoje" : `pago em ${rotuloDia(dia)}`;
}

/** A taxa e a sobra do pedido com outra forma, pela mesma conta do editor. */
function derivadosCom(pedido: Pedido, forma: FormaPagamento) {
  const derivado = derivarPedido({
    itens: pedido.itens,
    desconto: pedido.desconto,
    taxaEntrega: pedido.entrega.taxa,
    forma,
  });
  return {
    formaPagamentoId: forma.id,
    custoTaxaPagamento: derivado.custoTaxaPagamento,
    custoTotalEstimado: derivado.custoTotalEstimado,
    lucroEstimado: derivado.lucroEstimado,
  };
}

/** O pedido gravado, de volta ao que o "Salvar" do editor entrega, com a forma. */
function dadosComForma(
  pedido: Pedido,
  formaPagamentoId: string,
  formasPagamento: FormaPagamento[],
) {
  return {
    clienteId: pedido.clienteId ?? undefined,
    clienteNome: pedido.clienteNome,
    clienteTelefone: pedido.clienteTelefone ?? undefined,
    // O subtotal gravado sobra no objeto e não atrapalha: o corpo do pedido
    // escolhe campo por campo e refaz o subtotal.
    itens: pedido.itens,
    status: pedido.status,
    dataEntregaISO: pedido.dataEntregaISO,
    horaEntrega: pedido.horaEntrega,
    entrega: {
      tipo: pedido.entrega.tipo,
      taxa: pedido.entrega.taxa,
      endereco: pedido.entrega.endereco ?? undefined,
    },
    desconto: pedido.desconto,
    formaPagamentoId,
    formasPagamento,
    validoAteISO: pedido.validoAteISO ?? undefined,
    observacoes: pedido.observacoes ?? undefined,
  };
}
