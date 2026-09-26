"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Plus, Truck } from "lucide-react";
import { limit, orderBy, query, where } from "firebase/firestore";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Marcador } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { ID_PEDIDO_NOVO } from "./EditorPedido";
import { SeloStatus } from "./SeloStatus";
import { LinhaDoCardapioHoje } from "@/components/conta/LinhaDoCardapioHoje";
import {
  dataISODe,
  diaVizinho,
  rotuloAgenda,
  rotuloDiaPorExtenso,
} from "@/lib/domain/datas";
import { ehConcluido, resumoDosItens } from "@/lib/domain/pedido";
import { colPedidos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { DataISO, Pedido } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** O que cabe na tela de entrada sem virar a lista de pedidos inteira. */
const MAXIMO_NA_AGENDA = 12;

/** Com três pedidos na semana, o convite do cardápio sobra (`#d215`). */
const SEMANA_CHEIA = 3;

/**
 * A agenda da tela Hoje: o que sai do forno para hoje, e o que vem logo depois.
 *
 * A consulta começa em hoje e sobe: a agenda responde "o que eu entrego
 * agora". O pedido que passou do dia mora logo acima, em "Esperando você", com
 * a pergunta "isso saiu?" e a saída na própria linha (spec 046, `#d213`). Data
 * de entrega, e não data de pagamento — o dinheiro é outro assunto.
 *
 * A semana vazia de quem já opera é uma linha, e não o estado vazio que ensina
 * a tela (`#d214`); e a semana calma traz o cardápio para perto (`#d215`).
 */
export function AgendaHoje() {
  const contaId = useContaId();
  const { conta } = useAuth();
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
    <section aria-labelledby="titulo-entregas">
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

      {/* Sem o documento da conta não se sabe qual dos dois vazios mostrar
          (`#d214`): o grande piscaria antes de virar linha. */}
      {carregando || !conta ? (
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
      ) : naAgenda.length === 0 && conta?.primeirosPassosEm ? (
        <div className="mt-3 flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-line bg-surface py-2 pr-2 pl-5">
          <p className="text-body text-ink-muted">
            Nada marcado até {rotuloDiaPorExtenso(fimDaSemana)}.
          </p>
          <Link
            href={`/pedidos/${ID_PEDIDO_NOVO}`}
            className={classesBotao({ variante: "terciaria" })}
          >
            <Plus aria-hidden className="size-4" strokeWidth={2} />
            Anotar um pedido
          </Link>
        </div>
      ) : naAgenda.length === 0 ? (
        // Antes dos primeiros passos terminarem, o estado vazio ensina a tela.
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Nada marcado para os próximos dias"
            descricao="Quando você anotar uma encomenda, ela aparece aqui no dia da entrega, com o que precisa ser produzido e quanto sobra."
            acao={
              // Secundário: na tela Hoje o primário é do cartão dos primeiros
              // passos enquanto ele existe, e depois a Hoje é tela de leitura.
              // "Novo pedido" mora em `/pedidos`.
              <Link
                href={`/pedidos/${ID_PEDIDO_NOVO}`}
                className={classesBotao({
                  variante: "secundaria",
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

      {!carregando && !erro && daSemana.length < SEMANA_CHEIA && (
        <div className="mt-4 empty:hidden">
          <LinhaDoCardapioHoje />
        </div>
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

      {/* Mesma regra da lista de pedidos: uma pílula, o resto em marcador. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <SeloStatus status={pedido.status} />
        {pedido.dataEntregaISO !== hoje && (
          <Marcador>{rotuloAgenda(pedido.dataEntregaISO, hoje)}</Marcador>
        )}
        {pedido.entrega.tipo === "ENTREGA" && (
          <Marcador
            icone={
              <Truck aria-hidden className="size-3.5" strokeWidth={1.75} />
            }
          >
            Entrega
          </Marcador>
        )}
      </div>
    </Link>
  );
}
