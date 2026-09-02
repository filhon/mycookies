"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Plus, Truck } from "lucide-react";
import { limit, orderBy, query, where } from "firebase/firestore";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { ID_PEDIDO_NOVO } from "./EditorPedido";
import { SeloStatus } from "./SeloStatus";
import { dataISODe, diaVizinho, rotuloAgenda } from "@/lib/domain/datas";
import { ehConcluido, resumoDosItens } from "@/lib/domain/pedido";
import { colPedidos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { DataISO, Pedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/** O que cabe na tela de entrada sem virar a lista de pedidos inteira. */
const MAXIMO_NA_AGENDA = 12;

/**
 * A agenda da tela Hoje: o que sai do forno para hoje, e o que vem logo depois.
 *
 * A consulta começa em hoje e sobe: o pedido atrasado mora na tela de pedidos,
 * porque a tela de entrada precisa responder "o que eu entrego agora" sem
 * cobrança de ontem no meio. Data de entrega, e não data de pagamento — o
 * dinheiro é outro assunto e mora no caixa.
 */
export function AgendaHoje() {
  const contaId = useContaId();
  const [hoje] = useState(() => dataISODe(new Date()));
  const fimDaSemana = useMemo(() => diaVizinho(hoje, 7), [hoje]);

  const consulta = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        where("dataEntregaISO", ">=", hoje),
        orderBy("dataEntregaISO"),
        limit(MAXIMO_NA_AGENDA),
      ),
    [contaId, hoje],
  );

  const { dados, carregando, erro } = useColecao<Pedido>(consulta);

  const abertos = dados.filter((pedido) => !ehConcluido(pedido.status));
  const deHoje = abertos.filter((pedido) => pedido.dataEntregaISO === hoje);
  const daSemana = abertos.filter(
    (pedido) => pedido.dataEntregaISO <= fimDaSemana,
  );

  // Hoje primeiro. Sem nada hoje, a semana — que é a pergunta seguinte, e não
  // um consolo pela lista vazia.
  const naAgenda = deHoje.length > 0 ? deHoje : daSemana;
  const titulo = deHoje.length > 0 ? "Entregas de hoje" : "Os próximos dias";

  return (
    <section aria-labelledby="titulo-entregas" className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="titulo-entregas"
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          <CalendarDays
            aria-hidden
            className="size-5 text-ink-muted"
            strokeWidth={1.75}
          />
          {titulo}
        </h2>

        <Link
          href="/pedidos"
          className="toque -mr-2 inline-flex items-center gap-1 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          Ver todos
          <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
        </Link>
      </div>

      {carregando ? (
        <div role="status" aria-label="Carregando" className="mt-3 space-y-3">
          <Esqueleto className="h-24 rounded-lg" />
          <Esqueleto className="h-24 rounded-lg" />
        </div>
      ) : erro ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para carregar a agenda"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </div>
      ) : naAgenda.length === 0 ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Nada marcado para os próximos dias"
            descricao="Quando você anotar uma encomenda, ela aparece aqui no dia da entrega, com o que precisa ser produzido e quanto sobra."
            acao={
              <Link
                href={`/pedidos/${ID_PEDIDO_NOVO}`}
                className={classesBotao({
                  variante: "primaria",
                  tamanho: "lg",
                })}
              >
                <Plus aria-hidden className="size-5" strokeWidth={2} />
                Anotar um pedido
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {naAgenda.map((pedido) => (
            <li key={pedido.id}>
              <CartaoDaAgenda pedido={pedido} hoje={hoje} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Um pedido do dia, em cartão: aqui ele é de fato uma unidade destacável e
 * clicável, que é a única situação em que este sistema usa cartão.
 */
function CartaoDaAgenda({ pedido, hoje }: { pedido: Pedido; hoje: DataISO }) {
  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className="block rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-ink">
            {pedido.clienteNome}
          </p>
          <p className="num mt-0.5 truncate text-label text-ink-muted">
            {resumoDosItens(pedido.itens)}
          </p>
        </div>
        <Dinheiro centavos={pedido.total} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <SeloStatus status={pedido.status} />
        {pedido.dataEntregaISO !== hoje && (
          <Selo tom="neutro">{rotuloAgenda(pedido.dataEntregaISO, hoje)}</Selo>
        )}
        {pedido.entrega.tipo === "ENTREGA" && (
          <Selo tom="neutro" icone={<Truck aria-hidden className="size-3.5" />}>
            Entrega
          </Selo>
        )}
      </div>
    </Link>
  );
}
