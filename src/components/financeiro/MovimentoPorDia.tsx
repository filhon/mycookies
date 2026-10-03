import type { CompetenciaMensal, DataISO, ResumoDia } from "@/lib/types";
import { diasNoMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { cn } from "@/lib/utils/cn";

/** Barra visível mesmo quando o valor é pequeno perto do maior do mês. */
const ALTURA_MINIMA = 4;

/** Até aqui, o gráfico é baixo: dois dias de dado não pedem a altura de um mês. */
const DIAS_DO_GRAFICO_BAIXO = 7;

/**
 * O movimento do mês, dia a dia, desenhado à mão.
 *
 * Uma `div` com altura percentual faz exatamente isso, e uma biblioteca de
 * gráfico seria uma dependência de produção nova para desenhar o que o CSS já
 * desenha (`DECISOES.md#d25`).
 *
 * No mês corrente o eixo para em `max(hoje, 7)` (`#d268`): no dia 2, sete
 * colunas largas, e não trinta com duas cheias. Cada coluna é o botão que
 * filtra a lista pelo dia. As colunas cobrem a largura sem fresta, então o
 * toque cai sempre no dia mais próximo; a coluna inteira, barra e número, é o
 * alvo. A leitura em texto vai no `sr-only`, porque a altura de uma barra não é
 * informação para quem não a enxerga.
 */
export function MovimentoPorDia({
  competencia,
  porDia,
  hoje,
  diaEscolhido,
  aoEscolherDia,
}: {
  competencia: CompetenciaMensal;
  porDia: Record<string, ResumoDia>;
  /** O dia de hoje, só no mês corrente. */
  hoje?: number;
  diaEscolhido: DataISO | null;
  aoEscolherDia: (dia: DataISO) => void;
}) {
  const doMes = diasNoMes(competencia);
  // Um lançamento com data adiante continua no gráfico: cortar o eixo em hoje
  // não pode esconder dinheiro.
  const ultimoComMovimento = Math.max(
    0,
    ...Object.entries(porDia)
      .filter(([, dia]) => dia.entradas > 0 || dia.saidas > 0)
      .map(([chave]) => Number(chave)),
  );
  const total =
    hoje === undefined
      ? doMes
      : Math.min(
          doMes,
          Math.max(hoje, DIAS_DO_GRAFICO_BAIXO, ultimoComMovimento),
        );

  const dias = Array.from({ length: total }, (_, indice) => {
    const numero = indice + 1;
    const chave = String(numero).padStart(2, "0");
    const linha = porDia[chave];
    return {
      numero,
      dataISO: `${competencia}-${chave}`,
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

  const comMovimento = dias.filter((d) => d.entradas > 0 || d.saidas > 0);
  const baixo = comMovimento.length <= DIAS_DO_GRAFICO_BAIXO;
  // Com poucas colunas, cada uma tem espaço para o próprio número.
  const todosOsNumeros = total <= 10;

  function altura(valor: number): string {
    if (valor <= 0) return "0%";
    return `${Math.max(ALTURA_MINIMA, (valor / maximo) * 100)}%`;
  }

  return (
    <section aria-labelledby="movimento-por-dia">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="movimento-por-dia"
          className="text-subheading font-semibold text-ink"
        >
          {hoje === undefined ? "Movimento por dia" : "Movimento até hoje"}
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

      <ul role="list" className="mt-3 flex">
        {dias.map((dia) => {
          const escolhido = dia.dataISO === diaEscolhido;
          const leitura = `Dia ${dia.numero}: entrou ${formatarMoeda(dia.entradas)}, saiu ${formatarMoeda(dia.saidas)}.`;
          return (
            <li key={dia.numero} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => aoEscolherDia(dia.dataISO)}
                aria-pressed={escolhido}
                title={leitura}
                className={cn(
                  "flex w-full flex-col rounded-sm pb-1 transition-colors duration-150 ease-quart hover:bg-sunken",
                  escolhido && "bg-sunken",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex w-full items-end justify-center gap-px border-b border-line-strong px-px",
                    baixo ? "h-24" : "h-32 lg:h-40",
                  )}
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
                <span
                  aria-hidden
                  className={cn(
                    "num mt-1.5 min-h-4 text-center text-micro",
                    escolhido ? "font-semibold text-ink" : "text-ink-subtle",
                  )}
                >
                  {todosOsNumeros ||
                  escolhido ||
                  dia.numero === 1 ||
                  dia.numero % 5 === 0
                    ? dia.numero
                    : ""}
                </span>
                <span className="sr-only">{leitura}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
