"use client";

import Link from "next/link";
import { Plus, TriangleAlert, Wallet } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { AtalhoParaCompras } from "@/components/compras/AtalhoParaCompras";
import { LinhaPedido } from "./LinhaPedido";
import { ID_PEDIDO_NOVO } from "./EditorPedido";
import { dataISODe, rotuloAgenda } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { agruparPorEntrega, aReceber, ehConcluido } from "@/lib/domain/pedido";
import { colPedidos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { DataISO, Pedido, StatusPedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const FILTROS: { valor: StatusPedido | "TODOS"; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "ORCAMENTO", rotulo: "Orçamentos" },
  { valor: "CONFIRMADO", rotulo: "Confirmados" },
  { valor: "EM_PRODUCAO", rotulo: "Em produção" },
  { valor: "PRONTO", rotulo: "Prontos" },
  { valor: "ENTREGUE", rotulo: "Entregues" },
  { valor: "CANCELADO", rotulo: "Cancelados" },
];

/**
 * A agenda de encomendas, por data de entrega.
 *
 * Uma consulta ordenada pela data, e o status filtrado em memória: são dezenas
 * de pedidos por mês, e um índice por combinação de status seria manutenção sem
 * retorno. Os pedidos que já saíram — entregues e cancelados — vão para o fim,
 * porque o que ela precisa ver ao abrir a tela é o que ainda vai para o forno.
 */
export function ListaPedidos() {
  const contaId = useContaId();
  const [filtro, setFiltro] = useState<StatusPedido | "TODOS">("TODOS");
  const [hoje] = useState(() => dataISODe(new Date()));

  const consulta = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        orderBy("dataEntregaISO"),
      ),
    [contaId],
  );

  const { dados, carregando, erro, pendente } = useColecao<Pedido>(consulta);

  const visiveis = useMemo(
    () =>
      filtro === "TODOS"
        ? dados
        : dados.filter((pedido) => pedido.status === filtro),
    [dados, filtro],
  );

  const gruposAbertos = agruparPorEntrega(
    visiveis.filter((pedido) => !ehConcluido(pedido.status)),
  );
  // Os concluídos correm ao contrário: o que interessa de um pedido entregue é
  // que ele é o mais recente, e não que ele é o mais próximo.
  const gruposConcluidos = agruparPorEntrega(
    visiveis.filter((pedido) => ehConcluido(pedido.status)),
  ).reverse();

  return (
    <>
      <CabecalhoPagina
        titulo="Pedidos"
        descricao="O que você combinou entregar, para quem, e quanto sobra de cada encomenda."
        acao={
          <div className="flex items-center gap-2">
            {/* A lista de compras não cabe na navegação inferior — cinco
                destinos é o teto —, e é daqui que ela nasce: o que comprar é
                consequência do que foi combinado. */}
            <AtalhoParaCompras />
            <Link
              href={`/pedidos/${ID_PEDIDO_NOVO}`}
              className={classesBotao({
                variante: "primaria",
                className: "hidden lg:inline-flex",
              })}
            >
              <Plus aria-hidden className="size-5" strokeWidth={2} />
              Novo pedido
            </Link>
          </div>
        }
      >
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {FILTROS.map((opcao) => {
            const ativo = filtro === opcao.valor;
            return (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setFiltro(opcao.valor)}
                aria-pressed={ativo}
                className={cn(
                  "h-11 shrink-0 rounded-full px-4 text-label font-medium",
                  "transition-colors duration-150 ease-quart",
                  ativo
                    ? "bg-wine-700 text-on-wine"
                    : "border border-line-strong text-ink-muted hover:bg-sunken",
                )}
              >
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "pedido" : "pedidos"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      {/* Somado sobre os pedidos que a consulta já trouxe, e sobre todos eles:
          o que está a receber é fato da agenda inteira, e não do filtro da vez. */}
      {!carregando && <AReceber pedidos={dados} />}

      {erro ? (
        <Caixa>
          <EstadoVazio
            titulo="Não deu para carregar seus pedidos"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </Caixa>
      ) : carregando ? (
        <Caixa>
          <EsqueletoLista />
        </Caixa>
      ) : visiveis.length === 0 ? (
        <Caixa>
          {dados.length === 0 ? (
            <EstadoVazio
              titulo="A encomenda sai do WhatsApp e entra na agenda"
              descricao="Monte o pedido com as fichas que você já precificou: o sistema soma o total, desconta a maquininha e diz quanto sobra antes de você fechar o combinado."
              acao={
                <Link
                  href={`/pedidos/${ID_PEDIDO_NOVO}`}
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Anotar primeiro pedido
                </Link>
              }
            />
          ) : (
            <EstadoVazio
              titulo="Nada com esse filtro"
              descricao="Nenhum pedido está nesse pé agora. Volte para todos e veja a agenda inteira."
              acao={<Botao onClick={() => setFiltro("TODOS")}>Ver todos</Botao>}
            />
          )}
        </Caixa>
      ) : (
        <div className="mt-2 space-y-6">
          {gruposAbertos.map((grupo) => (
            <GrupoDoDia
              key={`abertos-${grupo.dataISO}`}
              prefixo="abertos"
              dataISO={grupo.dataISO}
              pedidos={grupo.pedidos}
              hoje={hoje}
            />
          ))}

          {gruposConcluidos.length > 0 && (
            <div className="space-y-6">
              {gruposAbertos.length > 0 && (
                <h2 className="border-t border-line pt-5 text-label font-medium text-ink-muted">
                  Já saíram da agenda
                </h2>
              )}
              {gruposConcluidos.map((grupo) => (
                <GrupoDoDia
                  key={`concluidos-${grupo.dataISO}`}
                  prefixo="concluidos"
                  dataISO={grupo.dataISO}
                  pedidos={grupo.pedidos}
                  hoje={hoje}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ação primária ao alcance do polegar, acima da navegação inferior. */}
      <Link
        href={`/pedidos/${ID_PEDIDO_NOVO}`}
        aria-label="Novo pedido"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-wine-700 text-on-wine shadow-overlay transition-colors duration-150 ease-quart hover:bg-wine-600 active:bg-wine-800 lg:hidden"
      >
        <Plus aria-hidden className="size-6" strokeWidth={2} />
      </Link>
    </>
  );
}

/**
 * O dinheiro combinado que ainda não entrou.
 *
 * Existe porque o painel financeiro é regime de caixa: um pedido entregue e não
 * pago não aparece no resultado do mês, e sem esta linha ele não apareceria em
 * lugar nenhum — o painel mentiria por omissão (`DECISOES.md#d36`).
 *
 * Não é um cartão nem um KPI: é uma faixa rebaixada entre o cabeçalho e a
 * agenda, porque a agenda continua sendo o que ela veio ver.
 */
function AReceber({ pedidos }: { pedidos: Pedido[] }) {
  const { total, quantidade, entregues } = aReceber(pedidos);
  if (quantidade === 0) return null;

  return (
    <section
      aria-labelledby="a-receber"
      className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-sunken px-4 py-3"
    >
      <h2
        id="a-receber"
        className="flex items-center gap-2 text-label font-medium text-ink-muted"
      >
        <Wallet aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span>A receber</span>
      </h2>

      <Dinheiro centavos={total} />

      <p className="w-full max-w-[64ch] text-label text-ink-muted">
        {quantidade === 1
          ? "1 pedido combinado que ainda não entrou no caixa"
          : `${quantidade} pedidos combinados que ainda não entraram no caixa`}
        {entregues > 0 &&
          (entregues === 1
            ? ", e um deles já foi entregue"
            : `, e ${entregues} deles já foram entregues`)}
        . Enquanto o pedido não estiver marcado como pago, esse dinheiro não
        conta no resultado do mês.
      </p>
    </section>
  );
}

function Caixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </div>
  );
}

/**
 * Um dia da agenda: o cabeçalho diz que dia é e quanto sai dele, e a lista
 * carrega os pedidos. O total do dia é o que responde "dá para dar conta?"
 * antes de abrir pedido por pedido.
 */
function GrupoDoDia({
  prefixo,
  dataISO,
  pedidos,
  hoje,
}: {
  prefixo: string;
  dataISO: DataISO;
  pedidos: Pedido[];
  hoje: DataISO;
}) {
  const total = pedidos.reduce((soma, pedido) => soma + pedido.total, 0);
  const atrasado =
    dataISO < hoje && pedidos.some((pedido) => !ehConcluido(pedido.status));
  const id = `dia-${prefixo}-${dataISO}`;

  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h2
          id={id}
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          {rotuloAgenda(dataISO, hoje)}
          {atrasado && (
            <Selo
              tom="atencao"
              icone={<TriangleAlert aria-hidden className="size-3.5" />}
            >
              Passou da data
            </Selo>
          )}
        </h2>
        <p className="num text-label text-ink-muted">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {formatarMoeda(total)}
        </p>
      </div>

      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {pedidos.map((pedido) => (
          <LinhaPedido key={pedido.id} pedido={pedido} />
        ))}
      </ul>
    </section>
  );
}
