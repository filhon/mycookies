import type { Route } from "next";
import Link from "next/link";
import { ArrowDown, ChevronRight, TriangleAlert } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import type { PrevisaoDoMes } from "@/lib/domain/caixa";
import { rotuloMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { AReceber } from "@/lib/domain/pedido";
import type { CompetenciaMensal } from "@/lib/types";

/**
 * O que vem até o fim do mês corrente (`DECISOES.md#d262`): o que deve entrar
 * dos pedidos, o que deve sair das contas que repetem e onde o caixa fecha se
 * tudo acontecer. Cada número leva ao caminho dele. Previsão, não fato: o
 * negativo é atenção com ícone e palavra, nunca vermelho.
 */
export function AteOFimDoMes({
  competencia,
  previsao,
  receber,
  qtdContas,
}: {
  competencia: CompetenciaMensal;
  previsao: PrevisaoDoMes;
  receber: AReceber;
  qtdContas: number;
}) {
  const marcados = receber.quantidade - receber.entregues;
  const detalheEntrar = [
    marcados > 0 &&
      `${marcados} ${marcados === 1 ? "pedido marcado" : "pedidos marcados"}`,
    receber.entregues > 0 &&
      `${receber.entregues} que já ${receber.entregues === 1 ? "te deve" : "te devem"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const negativo = previsao.fechaEm < 0;

  return (
    <section
      aria-labelledby="ate-o-fim-do-mes"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <h2
        id="ate-o-fim-do-mes"
        className="px-4 pt-4 text-subheading font-semibold text-ink lg:px-5"
      >
        Até o fim de {rotuloMes(competencia)}
      </h2>

      <ul className="mt-2 divide-y divide-line border-y border-line">
        {previsao.deveEntrar > 0 && (
          <Linha
            href={
              receber.entregues > 0 ? "/pedidos?vista=me-devem" : "/pedidos"
            }
            rotulo="Deve entrar"
            valor={previsao.deveEntrar}
            detalhe={detalheEntrar}
            icone={
              <ChevronRight
                aria-hidden
                className="size-5 text-ink-subtle"
                strokeWidth={1.75}
              />
            }
          />
        )}
        {previsao.deveSair > 0 && (
          <Linha
            href="#contas-que-repetem"
            rotulo="Deve sair"
            valor={previsao.deveSair}
            detalhe={`${qtdContas} ${qtdContas === 1 ? "conta que repete" : "contas que repetem"}`}
            icone={
              <ArrowDown
                aria-hidden
                className="size-5 text-ink-subtle"
                strokeWidth={1.75}
              />
            }
          />
        )}
      </ul>

      <p className="flex items-start gap-2 bg-sunken px-4 py-4 text-label text-ink lg:px-5">
        {negativo && (
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
        )}
        <span className="max-w-[60ch]">
          Se tudo isso acontecer, o caixa fecha o mês em{" "}
          <strong className="num whitespace-nowrap font-semibold">
            {negativo ? "−" : ""}
            {formatarMoeda(Math.abs(previsao.fechaEm))}
          </strong>
          {negativo ? ", no negativo." : "."}
        </span>
      </p>
    </section>
  );
}

function Linha({
  href,
  rotulo,
  valor,
  detalhe,
  icone,
}: {
  href: Route;
  rotulo: string;
  valor: number;
  detalhe: string;
  icone: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-quart hover:bg-sunken lg:px-5"
      >
        <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
          <span className="flex items-baseline justify-between gap-3 sm:contents">
            <span className="text-label font-medium text-ink-muted sm:w-24 sm:shrink-0">
              {rotulo}
            </span>
            <Dinheiro
              centavos={valor}
              className="text-ink sm:w-28 sm:shrink-0"
            />
          </span>
          <span className="block text-label text-ink-muted">{detalhe}</span>
        </span>
        {icone}
      </Link>
    </li>
  );
}
