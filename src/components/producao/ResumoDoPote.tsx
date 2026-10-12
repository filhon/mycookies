import Link from "next/link";
import { TrendingDown, TriangleAlert } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { TituloAssinado } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import type { AchadosDoPote } from "@/lib/domain/cardapio";
import { SUFIXO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { diasEntre, rotuloDia, rotuloDiaPorExtenso } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { DataISO, FichaTecnica } from "@/lib/types";

function produtos(quantos: number): string {
  return quantos === 1 ? "1 produto" : `${quantos} produtos`;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "hoje", "amanhã", "quinta" na semana, "22 de out." depois dela. */
function quando(iso: DataISO, hoje: DataISO): string {
  const dias = diasEntre(hoje, iso);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias <= 6) return rotuloDiaPorExtenso(iso).split(/[-,]/)[0] ?? "";
  return rotuloDia(iso);
}

/**
 * O fim da contagem do pronto (`#d337`), irmão do `ResumoDaContagem` da
 * despensa: o que falta para os pedidos, o que acabou, o que saiu sem pedido e
 * quanto vale o que está pronto. Retrato do toque em "Salvar", não guardado.
 */
export function ResumoDoPote({
  achados,
  contadas,
  emBranco,
  limitados,
  hoje,
}: {
  achados: AchadosDoPote<FichaTecnica>;
  contadas: number;
  emBranco: number;
  /** `cardapio.limitados`: a zerada daqui o cardápio já mostra esgotada. */
  limitados: ReadonlySet<string>;
  hoje: DataISO;
}) {
  const { faltam, zeradas, sumiram, aMais, valorVenda, valorCusto } = achados;
  const comValor = sumiram.filter((linha) => linha.venda !== null);
  const vendaSumida = comValor.reduce((soma, l) => soma + (l.venda ?? 0), 0);
  const custoSumido = comValor.reduce((soma, l) => soma + (l.custo ?? 0), 0);
  // A mais não é achado, é registro faltando: uma linha, sem valor, e sem
  // abrir "Saiu sem pedido" sozinha.
  const maisNoPote = aMais > 0 && (
    <p className="mt-3 max-w-[62ch] text-label text-ink-muted">
      Em {produtos(aMais)} tinha mais do que esperávamos: massa que não foi
      registrada, ou a contagem anterior.
    </p>
  );

  return (
    <div className="mt-6 space-y-8 pb-12">
      <div>
        <h2 className="font-display text-title font-semibold text-ink">
          <TituloAssinado titulo="Contagem salva." />
        </h2>
        <p className="mt-2 max-w-[62ch] text-body text-ink-muted">
          {produtos(contadas)} com a data de hoje.
          {emBranco === 1
            ? " O que ficou em branco continua com a data que tinha."
            : emBranco > 1 &&
              ` Os ${emBranco} em branco continuam com a data que tinham.`}
        </p>
      </div>

      {faltam.length > 0 && (
        <section aria-labelledby="pote-falta">
          <h2
            id="pote-falta"
            className="text-subheading font-semibold text-ink"
          >
            Falta para os pedidos
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {faltam.map(({ ficha, contado, levam, pedidos, ateISO }) => {
              const dia = quando(ateISO, hoje);
              return (
                <li
                  key={ficha.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 lg:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-ink">
                      {ficha.nome}
                    </p>
                    <p className="num mt-0.5 text-label text-ink-muted">
                      {numero(contado)} no pote ·{" "}
                      {pedidos === 1
                        ? `o pedido de ${dia} leva ${numero(levam)}`
                        : `os pedidos ${dia === "hoje" ? "de" : "até"} ${dia} levam ${numero(levam)}`}
                    </p>
                  </div>
                  <span className="num flex shrink-0 items-center gap-1.5 text-label font-semibold text-attention">
                    <TriangleAlert
                      aria-hidden
                      className="size-4"
                      strokeWidth={2}
                    />
                    faltam {numero(levam - contado)}
                  </span>
                  <Link
                    href={`/fichas/${ficha.id}`}
                    className={classesBotao({
                      variante: "terciaria",
                      tamanho: "sm",
                      className: "shrink-0",
                    })}
                    aria-label={`Fiz a massa de ${ficha.nome}`}
                  >
                    Fiz a massa
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {zeradas.length > 0 && (
        <section aria-labelledby="pote-acabou">
          <h2
            id="pote-acabou"
            className="text-subheading font-semibold text-ink"
          >
            Acabou
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {zeradas.map((ficha) => (
              <li key={ficha.id} className="min-h-11 px-4 py-3 lg:px-5">
                <p className="text-body font-medium text-ink">{ficha.nome}</p>
                {limitados.has(ficha.id) && (
                  <p className="mt-0.5 text-label text-ink-muted">
                    o cardápio já mostra Esgotado
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sumiram.length > 0 && (
        <section aria-labelledby="pote-sumiu">
          <h2
            id="pote-sumiu"
            className="text-subheading font-semibold text-ink"
          >
            Saiu sem pedido
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {sumiram.map(({ ficha, contado, esperado, unidades, venda }) => (
              <li
                key={ficha.id}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 lg:px-5"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink">{ficha.nome}</p>
                  <p className="num mt-0.5 text-label text-ink-muted">
                    {numero(contado)} no pote · esperávamos {numero(esperado)}
                  </p>
                </div>
                <span className="num flex shrink-0 items-center gap-1.5 text-label font-semibold text-negative">
                  <TrendingDown
                    aria-hidden
                    className="size-4"
                    strokeWidth={2}
                  />
                  −{numero(unidades)}{" "}
                  {SUFIXO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
                  {venda !== null && ` · ${formatarMoeda(venda)}`}
                  <span className="sr-only"> a menos</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[62ch] text-label text-ink-muted">
            Pode ser venda que não passou pelo app, prova, presente ou perda. O
            sistema não vê qual.
          </p>
          {comValor.length > 0 && (
            <p className="num mt-2 max-w-[62ch] text-body text-ink">
              {formatarMoeda(vendaSumida)} em venda,{" "}
              {formatarMoeda(custoSumido)} de custo, em{" "}
              {produtos(comValor.length)}.
            </p>
          )}
          {maisNoPote}
        </section>
      )}
      {sumiram.length === 0 && maisNoPote}

      <section aria-labelledby="pote-valor">
        <h2 id="pote-valor" className="text-subheading font-semibold text-ink">
          O que está pronto vale
        </h2>
        <p className="mt-2">
          <Dinheiro centavos={valorVenda} tamanho="xl" />
        </p>
        <p className="mt-1 text-label text-ink-muted">
          custou {formatarMoeda(valorCusto)} pra fazer,{" "}
          {contadas === 1
            ? "no produto contado hoje"
            : `nos ${contadas} produtos contados hoje`}
        </p>
      </section>

      <Link
        href="/fichas"
        className={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        Voltar para Produtos
      </Link>
    </div>
  );
}
