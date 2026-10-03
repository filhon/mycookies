import {
  Check,
  ChevronRight,
  Clock,
  HandCoins,
  Store,
  Truck,
  TriangleAlert,
} from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Marcador } from "@/components/ui/Selo";
import { SeloStatus } from "./SeloStatus";
import { formatarMoeda } from "@/lib/domain/money";
import { faltaPagar, resumoDosItens } from "@/lib/domain/pedido";
import type { Pedido } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** "14:30", com o relógio. Também na agenda da tela Hoje. */
export function MarcadorHora({ hora }: { hora: string }) {
  return (
    <Marcador
      className="num"
      icone={<Clock aria-hidden className="size-3.5" strokeWidth={1.75} />}
    >
      {hora}
    </Marcador>
  );
}

/**
 * As sete colunas da mesa (`#d253`). Estado e pagamento têm piso: o selo e
 * "Falta receber" não quebram bem; o que aperta é o resumo dos itens, que
 * trunca.
 */
export const COLUNAS_PEDIDO =
  "grid-cols-[3rem_minmax(0,1.3fr)_minmax(0,1.7fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)_minmax(5.5rem,0.8fr)_minmax(5.5rem,0.8fr)]";

/**
 * Onde a mesa começa (`#d253`). Sem a ficha, desde `lg`; com a ficha acoplada
 * ao lado, só a partir de `2xl`: em 1280px, tirados a barra lateral e os 26rem
 * da ficha, as sete colunas deixavam menos de 40px para cliente e itens
 * juntos. Antes disso a linha volta à do celular. Classes inteiras, e não um
 * prefixo montado, para o Tailwind achá-las.
 */
export function arranjoDaMesa(comFicha: boolean) {
  return comFicha
    ? {
        celular: "2xl:hidden",
        grade: "2xl:grid",
        mesa: "2xl:space-y-0 2xl:divide-y 2xl:divide-line 2xl:overflow-hidden 2xl:rounded-lg 2xl:border 2xl:border-line 2xl:bg-surface",
        lista: "2xl:mt-0 2xl:rounded-none 2xl:border-x-0 2xl:border-b-0",
      }
    : {
        celular: "lg:hidden",
        grade: "lg:grid",
        mesa: "lg:space-y-0 lg:divide-y lg:divide-line lg:overflow-hidden lg:rounded-lg lg:border lg:border-line lg:bg-surface",
        lista: "lg:mt-0 lg:rounded-none lg:border-x-0 lg:border-b-0",
      };
}

/**
 * Um pedido na lista: para quem, o que é, quanto, e em que pé está.
 *
 * O total nunca aparece sozinho: embaixo dele vem o que sobra do pedido, que é
 * a pergunta que este sistema existe para responder. O status vai como texto e
 * ícone, e não como cor de linha.
 *
 * No que já saiu (`saiu`), a linha mostra só a exceção (`DECISOES.md#d248`):
 * "Entregue · Pago" repetido em trinta linhas escondia as duas que não
 * pagaram. Ali o selo só aparece no cancelado, e o não pago diz "Falta
 * receber". Na agenda tudo fica: o status é o que ela lê ali.
 *
 * Dois arranjos no mesmo `<li>`, como `LinhaInsumo`: no desktop, a linha da
 * mesa (`#d253`), onde estado e pagamento têm coluna própria e aparecem
 * sempre; a exceção salta da coluna, e não da linha.
 */
export function LinhaPedido({
  pedido,
  saiu = false,
  aoAbrir,
  selecionado = false,
  comFicha = false,
}: {
  pedido: Pedido;
  saiu?: boolean;
  /** Tocar lê: abre a ficha do pedido (`#d249`). */
  aoAbrir: (pedido: Pedido) => void;
  /** A linha cujo pedido está na ficha ao lado. Só no desktop. */
  selecionado?: boolean;
  /** A ficha acoplada divide a largura: a mesa espera o `2xl`. */
  comFicha?: boolean;
}) {
  const noPrejuizo = pedido.lucroEstimado < 0;
  const naoPago = pedido.status === "ENTREGUE" && !pedido.pago;
  const arranjo = arranjoDaMesa(comFicha);
  // O sinal na linha enquanto falta o resto (`#d279`); cancelado não deve nada.
  const sinal =
    pedido.sinal && !pedido.pago && pedido.status !== "CANCELADO"
      ? `Sinal ${formatarMoeda(pedido.sinal.valor)} · faltam ${formatarMoeda(faltaPagar(pedido))}`
      : null;

  // Ícone e palavra, e não só o ocre: ele divide matiz com o âmbar.
  const faltaReceber = (
    <Marcador
      className="text-attention"
      icone={<HandCoins aria-hidden className="size-3.5" strokeWidth={1.75} />}
    >
      {sinal ?? "Falta receber"}
    </Marcador>
  );
  const comSinal = sinal && (
    <Marcador
      icone={<HandCoins aria-hidden className="size-3.5" strokeWidth={1.75} />}
    >
      {sinal}
    </Marcador>
  );
  const pago = (
    <Marcador
      icone={
        <Check
          aria-hidden
          className="size-3.5 text-positive"
          strokeWidth={2.5}
        />
      }
    >
      Pago
    </Marcador>
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(pedido)}
        aria-current={selecionado ? "true" : undefined}
        className={cn(
          "block w-full text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
          selecionado && "bg-sunken",
        )}
      >
        {/* ---- celular ---- */}
        <div
          className={cn("flex items-center gap-3 px-4 py-3", arranjo.celular)}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-ink">
              {pedido.clienteNome}
            </p>

            <p className="num mt-0.5 truncate text-label text-ink-muted">
              {resumoDosItens(pedido.itens, 2, { soNome: true })}
            </p>

            {/* Uma pílula só, a do status. Pago e entrega são marcadores sem
                fundo: em 360px três pílulas quebravam em duas linhas de cor. */}
            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {/* A hora abre a linha: é o que diz o que sai primeiro (`#d251`). */}
              {pedido.horaEntrega && <MarcadorHora hora={pedido.horaEntrega} />}
              {(!saiu || pedido.status === "CANCELADO") && (
                <SeloStatus status={pedido.status} />
              )}
              {saiu && naoPago && faltaReceber}
              {/* O marcador de pago é o que separa a agenda do caixa: sem ele,
                  "a receber" seria um número sem nenhuma linha que o explique. */}
              {!saiu && pedido.pago && pago}
              {!saiu && comSinal}
              {/* Marcador, e não pílula, pela mesma razão do pago (spec 031). */}
              {pedido.origem === "CARDAPIO" && (
                <Marcador
                  icone={
                    <Store
                      aria-hidden
                      className="size-3.5"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Pelo cardápio
                </Marcador>
              )}
              {pedido.entrega.tipo === "ENTREGA" && (
                <Marcador
                  icone={
                    <Truck
                      aria-hidden
                      className="size-3.5"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Entrega
                </Marcador>
              )}
            </span>
          </div>

          <div className="shrink-0 text-right">
            <Dinheiro centavos={pedido.total} />
            <p
              className={cn(
                "num mt-0.5 flex items-center justify-end gap-1 text-micro",
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
                : `sobram ${formatarMoeda(pedido.lucroEstimado)}`}
            </p>
          </div>

          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </div>

        {/* ---- desktop: a linha da mesa (`#d253`) ----
            O cabeçalho das colunas é `aria-hidden`: cada célula leva o rótulo
            em `sr-only`. */}
        <div
          className={cn(
            "hidden items-center gap-x-3 px-4 py-3",
            arranjo.grade,
            COLUNAS_PEDIDO,
          )}
        >
          <p className="num text-body text-ink">
            {pedido.horaEntrega && (
              <>
                <span className="sr-only">às </span>
                {pedido.horaEntrega}
              </>
            )}
          </p>

          <p className="truncate text-body font-semibold text-ink">
            {pedido.clienteNome}
          </p>

          <p
            className="num truncate text-body text-ink-muted"
            title={resumoDosItens(pedido.itens, pedido.itens.length, {
              soNome: true,
            })}
          >
            <span className="sr-only">itens: </span>
            {resumoDosItens(pedido.itens, 2, { soNome: true })}
          </p>

          <div className="min-w-0">
            <span className="sr-only">estado: </span>
            <SeloStatus status={pedido.status} />
          </div>

          <div className="min-w-0">
            {(pedido.pago || naoPago || sinal) && (
              <span className="sr-only">pagamento: </span>
            )}
            {pedido.pago ? pago : naoPago ? faltaReceber : comSinal}
          </div>

          <p className="text-right">
            <span className="sr-only">total </span>
            <Dinheiro centavos={pedido.total} />
          </p>

          <p
            className={cn(
              "num flex items-center justify-end gap-1 text-body font-semibold",
              noPrejuizo ? "text-negative" : "text-ink",
            )}
          >
            <span className="sr-only">
              {noPrejuizo ? "perde" : "sobram"}{" "}
              {formatarMoeda(Math.abs(pedido.lucroEstimado))}
            </span>
            {noPrejuizo && (
              <TriangleAlert
                aria-hidden
                className="size-3.5 shrink-0"
                strokeWidth={2}
              />
            )}
            <span aria-hidden>
              {noPrejuizo && "−"}
              {formatarMoeda(Math.abs(pedido.lucroEstimado))}
            </span>
          </p>
        </div>
      </button>
    </li>
  );
}
