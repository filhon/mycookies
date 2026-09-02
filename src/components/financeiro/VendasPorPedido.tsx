import Link from "next/link";
import { ClipboardList, Factory } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { ticketMedioDe, type ParcelasDoAgregado } from "@/lib/domain/caixa";
import { formatarMoeda } from "@/lib/domain/money";

/**
 * O que veio de encomenda, dentro do que entrou no mês.
 *
 * Mesma anatomia do resultado do mês, e de propósito: o número que responde a
 * pergunta em cima, as parcelas que levam até ele no meio, e a consequência na
 * faixa rebaixada do pé. O que muda é a pergunta — não "quanto sobrou", mas
 * "quanto disso foi pedido, e a que custo".
 *
 * A seção inteira some quando não há pedido pago: o mês sem encomenda não tem
 * ticket médio de R$ 0,00, ele não tem ticket médio nenhum, e zero em painel
 * financeiro é ausência e não resultado.
 */
export function VendasPorPedido({
  parcelas,
}: {
  parcelas: ParcelasDoAgregado;
}) {
  const {
    entradas,
    qtdPedidos,
    qtdItensVendidos,
    receitaPedidos,
    custoDoVendido,
  } = parcelas;

  if (qtdPedidos === 0) return null;

  // A razão é refeita aqui, e não lida do documento: `receitaPedidos` e
  // `qtdPedidos` são exatos porque são incrementos (`DECISOES.md#d36`).
  const ticketMedio = ticketMedioDe(receitaPedidos, qtdPedidos);
  const deBalcao = entradas - receitaPedidos;

  return (
    <section
      aria-labelledby="vendas-por-pedido"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="px-5 pb-5 pt-5">
        <h2
          id="vendas-por-pedido"
          className="flex items-center gap-2 text-label font-medium text-ink-muted"
        >
          <ClipboardList aria-hidden className="size-4" strokeWidth={1.75} />O
          que veio de encomenda
        </h2>

        <p className="mt-1">
          <Dinheiro centavos={receitaPedidos} tamanho="lg" />
        </p>

        <p className="mt-1.5 max-w-[52ch] text-label text-ink-muted">
          {deBalcao > 0 ? (
            <>
              Os outros{" "}
              <strong className="num font-semibold text-ink">
                {formatarMoeda(deBalcao)}
              </strong>{" "}
              que entraram no mês foram lançados à mão: venda de balcão que
              nunca virou pedido.
            </>
          ) : (
            <>
              Tudo que entrou no mês veio de pedido. Cada um deles virou um
              lançamento na lista abaixo, no dia em que foi pago.
            </>
          )}
        </p>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
        <Parcela rotulo="Pedidos" valor={String(qtdPedidos)} />
        <Parcela rotulo="Ticket médio" valor={formatarMoeda(ticketMedio)} />
        <Parcela rotulo="Doces" valor={String(qtdItensVendidos)} />
      </dl>

      <div className="flex items-start gap-3 border-t border-line bg-sunken px-5 py-4">
        <Factory
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <div className="min-w-0">
          <h3 className="text-label font-medium text-ink-muted">
            Custo do que você vendeu
          </h3>
          <p className="num mt-0.5 text-heading font-semibold text-ink">
            {formatarMoeda(custoDoVendido)}
          </p>
          <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
            É o que esses pedidos custaram para produzir, com ingrediente,
            embalagem, seu tempo e o rateio das contas dentro. Não é o que você
            gastou no mercado neste mês.{" "}
            <Link
              href="/fichas"
              className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
            >
              Ver minhas fichas
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function Parcela({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 px-4 py-4 lg:px-5">
      <dt className="truncate text-label font-medium text-ink-muted">
        {rotulo}
      </dt>
      <dd className="num mt-0.5 truncate text-body font-semibold text-ink">
        {valor}
      </dd>
    </div>
  );
}
