import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import {
  rendimentoDoMes,
  ticketMedioDe,
  type ParcelasDoAgregado,
} from "@/lib/domain/caixa";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import { Comparacao } from "./Comparacao";

/**
 * O mês em duas respostas, a que decide primeiro (`DECISOES.md#d260`).
 *
 * O display é o que as vendas deixaram acima do custo de fazer
 * (`rendimentoDoMes`); o caixa, entrou menos saiu, desce para a faixa
 * rebaixada. Os dois só batem quando ela compra e vende no mesmo mês, e é isso
 * que a faixa diz. Mês sem pedido pago não tem custo conhecido: o display volta
 * a ser o caixa, com a frase que diz por quê.
 *
 * "Saiu" leva a maquininha, como na Hoje (`#d209`), para que entrou menos saiu
 * feche com o "No caixa" nas duas telas. A comparação com o mês anterior
 * mora junto, como na Hoje (`#d264`); sem o agregado dele, não vem.
 */
export function ResultadoDoMes({
  parcelas,
  comparacao,
}: {
  parcelas: ParcelasDoAgregado;
  comparacao?: React.ComponentProps<typeof Comparacao>;
}) {
  const r = rendimentoDoMes(parcelas);
  const caixa = (
    <>
      <p className="num mt-1 text-label text-ink-muted">
        Entrou {formatarMoeda(parcelas.entradas)} · Saiu{" "}
        {formatarMoeda(parcelas.saidas + parcelas.custoTaxasPagamento)}
      </p>
      {comparacao && <Comparacao {...comparacao} />}
    </>
  );

  if (r.rendeu === null) {
    return (
      <section
        aria-labelledby="resultado-do-mes"
        className="rounded-lg border border-line bg-surface px-5 py-5"
      >
        <h2
          id="resultado-do-mes"
          className="text-label font-medium text-ink-muted"
        >
          No caixa
        </h2>
        {/* A mesma roupa da Hoje: tinta, e sinal só no negativo. */}
        <p className="mt-1 flex items-center gap-2">
          {parcelas.lucro < 0 ? (
            <>
              <Dinheiro centavos={parcelas.lucro} tamanho="xl" comSinal />
              <Queda />
            </>
          ) : (
            <Dinheiro
              centavos={parcelas.lucro}
              tamanho="xl"
              className="text-ink"
            />
          )}
        </p>
        {caixa}
        <p className="mt-3 max-w-[60ch] text-label text-ink-muted">
          Sem pedido pago neste mês. Venda lançada à mão não diz o que custou,
          então o que o mês rendeu não dá pra saber.
        </p>
      </section>
    );
  }

  const perdeu = r.rendeu < 0;
  const { qtdPedidos, qtdItensVendidos, receitaPedidos } = parcelas;

  return (
    <section
      aria-labelledby="resultado-do-mes"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="px-5 pt-5">
        <h2
          id="resultado-do-mes"
          className="text-label font-medium text-ink-muted"
        >
          {perdeu ? "O que o mês perdeu" : "O que o mês rendeu"}
        </h2>

        {perdeu ? (
          <p className="mt-1 flex items-center gap-2">
            <Dinheiro centavos={r.rendeu} tamanho="xl" comSinal />
            <Queda />
          </p>
        ) : (
          <p className="mt-1 flex items-baseline gap-2">
            <Dinheiro centavos={r.rendeu} tamanho="xl" className="text-ink" />
            {/* O ponto marca o número que decide; prejuízo não se enfeita. */}
            <span
              aria-hidden
              className="inline-block size-2.5 shrink-0 rounded-full bg-accent-500"
            />
          </p>
        )}

        <p className="mt-1.5 max-w-[60ch] text-label text-ink-muted">
          {perdeu
            ? `O custo de fazer, a maquininha${r.outrasSaidas > 0 ? " e as outras saídas" : ""} passaram do que você vendeu em pedido.`
            : `${formatarPercentual(r.percentual ?? 0, 0)} do que você vendeu em pedido, já sem o custo de fazer${r.outrasSaidas > 0 ? ", a maquininha e as outras saídas" : " e a maquininha"}.`}{" "}
          Sua hora já está paga dentro do custo.
        </p>

        <dl
          className={
            r.outrasSaidas > 0
              ? "mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4"
              : "mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-3"
          }
        >
          <Parcela rotulo="Vendeu em pedido" valor={r.vendeuEmPedido} />
          <Parcela rotulo="Custou fazer" valor={r.custouFazer}>
            <Link
              href="/fichas"
              className="inline-flex min-h-11 items-center text-label font-medium text-brand-ink underline underline-offset-2"
            >
              Ver meus produtos
            </Link>
          </Parcela>
          <Parcela rotulo="Maquininha" valor={r.maquininha} />
          {r.outrasSaidas > 0 && (
            <Parcela rotulo="Outras saídas" valor={r.outrasSaidas} />
          )}
        </dl>

        <p className="num mb-5 mt-2 max-w-[60ch] text-label text-ink-muted">
          {qtdPedidos} {qtdPedidos === 1 ? "pedido" : "pedidos"} ·{" "}
          {qtdItensVendidos} {qtdItensVendidos === 1 ? "doce" : "doces"} · cada
          pedido sai a{" "}
          {formatarMoeda(ticketMedioDe(receitaPedidos, qtdPedidos))}
          {r.deBalcao > 0 &&
            `, e ${formatarMoeda(r.deBalcao)} de balcão, fora desta conta porque não diz o que custou`}
        </p>
      </div>

      <div className="border-t border-line bg-sunken px-5 py-4">
        <h3 className="text-label font-medium text-ink-muted">No caixa</h3>
        <p className="mt-0.5 flex items-center gap-2">
          <Dinheiro centavos={parcelas.lucro} tamanho="lg" comSinal />
          {parcelas.lucro < 0 && <Queda />}
        </p>
        {caixa}
        <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
          O caixa conta o dinheiro que entrou e saiu. O que rendeu conta o que
          cada venda deixou. Os dois só batem quando você compra e vende no
          mesmo mês.
        </p>
      </div>
    </section>
  );
}

function Parcela({
  rotulo,
  valor,
  children,
}: {
  rotulo: string;
  valor: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label font-medium text-ink-muted">{rotulo}</dt>
      <dd>
        <Dinheiro centavos={valor} tamanho="md" />
        {children && <div>{children}</div>}
      </dd>
    </div>
  );
}

/** Sinal e cor não bastam: todo negativo leva o ícone. */
function Queda() {
  return (
    <TrendingDown
      aria-hidden
      className="size-5 shrink-0 text-negative"
      strokeWidth={2}
    />
  );
}
