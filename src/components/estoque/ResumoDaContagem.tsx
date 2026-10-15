import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import type { AchadosDaContagem } from "@/lib/domain/estoque";
import { formatarMoeda } from "@/lib/domain/money";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { cn } from "@/lib/utils/cn";

function materiais(quantos: number): string {
  return quantos === 1 ? "1 material" : `${quantos} materiais`;
}

/**
 * O fim da contagem (`#d333`): o que acabou, o que ficou longe do esperado e
 * quanto vale o que ela contou. É a única tela em que a diferença existe; os
 * números são o retrato do toque em "Salvar", e não são guardados.
 *
 * Seções no papel: as listas em `--surface` com divisórias, o valor no papel.
 * O primário é o botão, e só.
 */
export function ResumoDaContagem({
  achados,
  contadas,
  emBranco,
}: {
  achados: AchadosDaContagem;
  contadas: number;
  emBranco: number;
}) {
  const { zeradas, diferencas, valorContado } = achados;
  const total = diferencas.reduce((soma, item) => soma + item.centavos, 0);

  return (
    <div className="mt-6 space-y-8 pb-12">
      <div>
        <h2 className="font-display text-title font-semibold text-ink">
          Contagem salva.
        </h2>
        <p className="mt-2 max-w-[62ch] text-body text-ink-muted">
          {materiais(contadas)} com a data de hoje.
          {emBranco === 1
            ? " O que ficou em branco continua com a data que tinha."
            : emBranco > 1 &&
              ` Os ${emBranco} em branco continuam com a data que tinham.`}
        </p>
      </div>

      {zeradas.length > 0 && (
        <section aria-labelledby="resumo-acabou">
          <h2
            id="resumo-acabou"
            className="text-subheading font-semibold text-ink"
          >
            Acabou
          </h2>
          <p className="mt-1 max-w-[62ch] text-label text-ink-muted">
            Daqui pra frente a lista compra o que os pedidos pedirem delas.
          </p>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {zeradas.map((linha) => (
              <li
                key={linha.insumoId}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 lg:px-5"
              >
                <span className="min-w-0 truncate text-body font-medium text-ink">
                  {linha.nome}
                </span>
                <span className="num shrink-0 text-label text-ink-muted">
                  {formatarQuantidade(0, linha.unidadeBase)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {diferencas.length > 0 && (
        <section aria-labelledby="resumo-diferente">
          <h2
            id="resumo-diferente"
            className="text-subheading font-semibold text-ink"
          >
            Diferente do que esperávamos
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {diferencas.map(({ linha, contado, esperado, centavos }) => {
              const menos = centavos < 0;
              const Seta = menos ? TrendingDown : TrendingUp;
              return (
                <li
                  key={linha.insumoId}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 lg:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-ink">
                      {linha.nome}
                    </p>
                    <p className="num mt-0.5 text-label text-ink-muted">
                      {formatarQuantidade(contado, linha.unidadeBase)} ·
                      esperávamos{" "}
                      {formatarQuantidade(esperado, linha.unidadeBase)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5",
                      menos ? "text-negative" : "text-positive",
                    )}
                  >
                    <Seta aria-hidden className="size-4" strokeWidth={2} />
                    <Dinheiro centavos={centavos} comSinal />
                    <span className="sr-only">
                      {menos ? " a menos" : " a mais"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 max-w-[62ch] text-label text-ink-muted">
            A diferença pode ser fornada não registrada, prova, perda, ou a
            contagem anterior.
          </p>
          <p className="num mt-2 max-w-[62ch] text-body text-ink">
            {total === 0
              ? `As diferenças se compensam, em ${materiais(diferencas.length)}.`
              : `${formatarMoeda(Math.abs(total))} a ${
                  total < 0 ? "menos" : "mais"
                } do que esperávamos, em ${materiais(diferencas.length)}.`}
          </p>
        </section>
      )}

      <section aria-labelledby="resumo-valor">
        <h2
          id="resumo-valor"
          className="text-subheading font-semibold text-ink"
        >
          O que você contou vale
        </h2>
        <p className="mt-2">
          <Dinheiro centavos={valorContado} tamanho="xl" />
        </p>
        <p className="mt-1 text-label text-ink-muted">
          {contadas === 1
            ? "no material contado hoje"
            : `nos ${contadas} materiais contados hoje`}
        </p>
      </section>

      <Link
        href="/compras"
        className={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        Ver a lista de compras
      </Link>
    </div>
  );
}
