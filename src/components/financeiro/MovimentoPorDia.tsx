import type { ResumoDia } from "@/lib/types";
import { diasNoMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { CompetenciaMensal } from "@/lib/types";

/** Barra visível mesmo quando o valor é pequeno perto do maior do mês. */
const ALTURA_MINIMA = 4;

/**
 * O movimento do mês, dia a dia, desenhado à mão.
 *
 * São 31 barras: uma `div` com altura percentual faz exatamente isso, e uma
 * biblioteca de gráfico seria uma dependência de produção nova para desenhar o
 * que o CSS já desenha (`DECISOES.md#d25`). Cada dia é um item de lista com a
 * leitura em texto, porque a altura de uma barra não é informação para quem
 * não a enxerga.
 */
export function MovimentoPorDia({
  competencia,
  porDia,
}: {
  competencia: CompetenciaMensal;
  porDia: Record<string, ResumoDia>;
}) {
  const total = diasNoMes(competencia);

  const dias = Array.from({ length: total }, (_, indice) => {
    const numero = indice + 1;
    const chave = String(numero).padStart(2, "0");
    const linha = porDia[chave];
    return {
      numero,
      chave,
      entradas: linha?.entradas ?? 0,
      saidas: linha?.saidas ?? 0,
    };
  });

  const maximo = dias.reduce(
    (maior, dia) => Math.max(maior, dia.entradas, dia.saidas),
    0,
  );

  // Mês sem movimento não vira um gráfico de linha reta: some.
  if (maximo === 0) return null;

  function altura(valor: number): string {
    if (valor <= 0) return "0%";
    return `${Math.max(ALTURA_MINIMA, (valor / maximo) * 100)}%`;
  }

  return (
    <section
      aria-labelledby="movimento-por-dia"
      className="rounded-lg border border-line bg-surface px-4 py-5 lg:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="movimento-por-dia"
          className="text-subheading font-semibold text-ink"
        >
          Movimento por dia
        </h2>
        <p className="flex items-center gap-3 text-micro font-medium text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-xs bg-positive" />
            entrou
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-xs bg-negative" />
            saiu
          </span>
        </p>
      </div>

      <ul
        role="list"
        className="mt-4 flex h-32 items-end gap-px border-b border-line-strong lg:h-40"
      >
        {dias.map((dia) => (
          <li key={dia.chave} className="flex h-full flex-1 items-end">
            <span className="sr-only">
              {`Dia ${dia.numero}: entrou ${formatarMoeda(dia.entradas)}, saiu ${formatarMoeda(dia.saidas)}.`}
            </span>
            <span
              aria-hidden
              className="flex h-full w-full items-end justify-center gap-px"
            >
              <span
                style={{ height: altura(dia.entradas) }}
                className="w-full max-w-1.5 rounded-t-xs bg-positive"
              />
              <span
                style={{ height: altura(dia.saidas) }}
                className="w-full max-w-1.5 rounded-t-xs bg-negative"
              />
            </span>
          </li>
        ))}
      </ul>

      {/* Mesma grade de colunas, para o número cair debaixo do próprio dia. */}
      <div aria-hidden className="mt-1.5 flex gap-px">
        {dias.map((dia) => (
          <span
            key={dia.chave}
            // `min-w-0` mantém todas as colunas com a mesma largura das barras:
            // sem ele o número escolhido alarga a própria coluna e desalinha.
            className="num min-w-0 flex-1 text-center text-micro text-ink-subtle"
          >
            {dia.numero === 1 || dia.numero % 5 === 0 ? dia.numero : ""}
          </span>
        ))}
      </div>
    </section>
  );
}
