"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CalendarClock, HandCoins, Inbox } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { dataISODe, diaVizinho, rotuloAgenda } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { aReceber, passouDoDia, resumoDosItens } from "@/lib/domain/pedido";
import {
  consultaAgenda,
  consultaEntreguesEmAberto,
} from "@/lib/firebase/mutations/pedidos";
import { useColecao } from "@/lib/hooks/useColecao";
import type { DataISO, Pedido } from "@/lib/types";
import { useContaId, usePapel } from "@/providers/AuthProvider";

/** Até três de cada; o resto é "e mais N", que leva a `/pedidos`. */
const POR_TIPO = 3;

/**
 * O que pede resposta dela (spec 046, `#d213`): o pedido que a cliente fez pelo
 * cardápio, o pedido que passou do dia e o dinheiro de entrega feita que não
 * entrou. Não existe quando está vazio: sem título, sem "tudo em dia".
 *
 * As duas primeiras saem da agenda de `/pedidos` (`consultaAgenda`, o que não
 * fechou, de qualquer data), filtrada em memória: a mesma assinatura que a
 * tela de pedidos já abre, nenhum índice novo. A terceira é a dos entregues em
 * aberto, só para a dona: é dinheiro.
 */
export function EsperandoVoce() {
  const contaId = useContaId();
  const dona = usePapel() === "DONA";
  const [hoje] = useState(() => dataISODe(new Date()));

  const consultaDaAgenda = useMemo(() => consultaAgenda(contaId), [contaId]);
  const consultaDosEntregues = useMemo(
    () => (dona ? consultaEntreguesEmAberto(contaId) : null),
    [dona, contaId],
  );
  const agenda = useColecao<Pedido>(consultaDaAgenda);
  const entregues = useColecao<Pedido>(consultaDosEntregues);

  // A agenda vem por data de entrega: o pedido do cardápio para hoje e amanhã
  // já chega no topo, sem ordenar de novo.
  const peloCardapio = agenda.dados.filter(
    (pedido) => pedido.status === "ORCAMENTO" && pedido.origem === "CARDAPIO",
  );
  // O orçamento esquecido não é "isso saiu?": continua só em `/pedidos`. O
  // mais recente primeiro, que é o que ela ainda lembra.
  const passaram = agenda.dados
    .filter(
      (pedido) => pedido.status !== "ORCAMENTO" && passouDoDia(pedido, hoje),
    )
    .reverse();
  const receber = aReceber(entregues.dados);

  // Carregando não vira esqueleto, e erro não vira aviso: a lista pode não
  // existir, e a agenda logo abaixo já diz quando a rede falhou.
  if (agenda.carregando || entregues.carregando) return null;
  if (peloCardapio.length === 0 && passaram.length === 0 && receber.total === 0)
    return null;

  return (
    <section aria-labelledby="titulo-esperando">
      <h2
        id="titulo-esperando"
        className="text-subheading font-semibold text-ink"
      >
        Esperando você
      </h2>

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {peloCardapio.slice(0, POR_TIPO).map((pedido) => (
          <li key={pedido.id}>
            <LinhaPedidoDoCardapio pedido={pedido} hoje={hoje} />
          </li>
        ))}
        <MaisN resto={peloCardapio.length - POR_TIPO} />

        {passaram.slice(0, POR_TIPO).map((pedido) => (
          <li key={pedido.id}>
            <Linha
              href={`/pedidos/${pedido.id}` as Route}
              icone={
                <CalendarClock
                  aria-hidden
                  className="size-5 shrink-0 text-attention"
                  strokeWidth={1.75}
                />
              }
              titulo={`Pedido de ${pedido.clienteNome} era para ${minuscula(rotuloAgenda(pedido.dataEntregaISO, hoje))}`}
              detalhe="Marcar como entregue ou mudar o dia"
            />
          </li>
        ))}
        <MaisN resto={passaram.length - POR_TIPO} />

        {receber.total > 0 && (
          <li>
            <Linha
              href="/pedidos"
              icone={
                <HandCoins
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
              }
              titulo={`${formatarMoeda(receber.total)} pra receber`}
              detalhe={`de ${receber.quantidade} ${receber.quantidade === 1 ? "entrega já feita" : "entregas já feitas"}`}
            />
          </li>
        )}
      </ul>
    </section>
  );
}

function LinhaPedidoDoCardapio({
  pedido,
  hoje,
}: {
  pedido: Pedido;
  hoje: DataISO;
}) {
  const dia = pedido.dataEntregaISO;
  // Hoje e amanhã (e o que já passou) é o que ela não pode deixar para depois.
  const urgente =
    dia < hoje
      ? "Passou do dia"
      : dia === hoje
        ? "Para hoje"
        : dia === diaVizinho(hoje, 1)
          ? "Para amanhã"
          : null;

  return (
    <Linha
      href={`/pedidos/${pedido.id}` as Route}
      icone={
        <Inbox
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
      }
      titulo={`${pedido.clienteNome} pediu pelo cardápio`}
      detalhe={
        <>
          {urgente && (
            <span className="font-medium text-ink">{urgente} · </span>
          )}
          {resumoDosItens(pedido.itens, 1)}
          {!urgente && ` · ${rotuloAgenda(dia, hoje)}`}
        </>
      }
      direita={<Dinheiro centavos={pedido.total} tamanho="sm" />}
    />
  );
}

/** Uma linha da lista: alvo inteiro de 52 px. */
function Linha({
  href,
  icone,
  titulo,
  detalhe,
  direita,
}: {
  href: Route;
  icone: ReactNode;
  titulo: string;
  detalhe: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-13 items-center gap-3 px-5 py-2.5 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      {icone}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-ink">
          {titulo}
        </span>
        <span className="num mt-0.5 block truncate text-label text-ink-muted">
          {detalhe}
        </span>
      </span>
      {direita && <span className="shrink-0">{direita}</span>}
    </Link>
  );
}

function MaisN({ resto }: { resto: number }) {
  if (resto <= 0) return null;
  return (
    <li>
      <Link
        href="/pedidos"
        className="flex min-h-11 items-center px-5 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
      >
        e mais {resto} {resto === 1 ? "pedido" : "pedidos"}
      </Link>
    </li>
  );
}

/** "Ontem" → "ontem"; "Quinta-feira, 24 de setembro" → "quinta-feira, …". */
function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}
