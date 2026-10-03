import type { MesDaFaixa, NoAno } from "@/lib/domain/caixa";
import { rotuloCompetencia, rotuloMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { CompetenciaMensal } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** Barra visível mesmo quando o valor é pequeno perto do maior mês. */
const ALTURA_MINIMA = 4;

/**
 * Os doze meses até o corrente, uma barra de entradas por mês (`#d265`).
 *
 * Uma série só: o rendeu vai no texto da barra, não numa segunda barra. Cada
 * coluna inteira é o botão que abre o mês, então o alvo é a largura da coluna
 * pela altura da faixa mais a etiqueta. O mês aberto não depende só da cor: a
 * etiqueta vai em 600 e o botão leva `aria-current`.
 */
export function DozeMeses({
  meses,
  aberto,
  ano,
  aoAbrir,
}: {
  meses: MesDaFaixa[];
  aberto: CompetenciaMensal;
  ano: NoAno;
  aoAbrir: (competencia: CompetenciaMensal) => void;
}) {
  // Com menos de dois meses, a faixa é uma barra sozinha: não compara nada.
  if (meses.filter((m) => m.temAgregado).length < 2) return null;

  const maximo = Math.max(...meses.map((m) => m.entradas));

  function altura(valor: number): string {
    if (valor <= 0 || maximo <= 0) return "0%";
    return `${Math.max(ALTURA_MINIMA, (valor / maximo) * 100)}%`;
  }

  return (
    <section aria-labelledby="doze-meses">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="doze-meses" className="text-subheading font-semibold text-ink">
          O que entrou nos últimos 12 meses
        </h2>
        <p className="num text-label text-ink-muted">
          {rotuloDoAno(aberto, ano)}
        </p>
      </div>

      <ul role="list" className="mt-3 flex">
        {meses.map((mes) => {
          const selecionado = mes.competencia === aberto;
          const leitura = leituraDoMes(mes);
          return (
            <li key={mes.competencia} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => aoAbrir(mes.competencia)}
                aria-current={selecionado ? "date" : undefined}
                title={leitura}
                className="group flex w-full flex-col rounded-sm pb-1 transition-colors duration-150 ease-quart hover:bg-sunken"
              >
                <span
                  aria-hidden
                  className="flex h-16 items-end justify-center border-b border-line-strong px-0.5"
                >
                  <span
                    style={{ height: altura(mes.entradas) }}
                    className={cn(
                      "w-full max-w-6 rounded-t-xs",
                      selecionado ? "bg-brand-ink" : "bg-ink-subtle",
                    )}
                  />
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 text-center text-micro",
                    selecionado ? "font-semibold text-ink" : "text-ink-muted",
                  )}
                >
                  {rotuloMes(mes.competencia).slice(0, 3)}
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

/** "Setembro de 2026: entrou R$ 2.086,00, rendeu R$ 1.010,40." */
function leituraDoMes(mes: MesDaFaixa): string {
  const nome = rotuloCompetencia(mes.competencia);
  const titulo = nome.charAt(0).toUpperCase() + nome.slice(1);
  if (!mes.temAgregado) return `${titulo}: nada lançado.`;
  const entrou = `entrou ${formatarMoeda(mes.entradas)}`;
  if (mes.rendeu === null) return `${titulo}: ${entrou}, sem pedido pago.`;
  return `${titulo}: ${entrou}, ${mes.rendeu < 0 ? "perdeu" : "rendeu"} ${formatarMoeda(Math.abs(mes.rendeu))}.`;
}

/** "Em 2026 até junho: entrou R$ … · rendeu R$ …, nos meses com pedido" */
function rotuloDoAno(aberto: CompetenciaMensal, ano: NoAno): string {
  const ate = aberto.endsWith("-12") ? "" : ` até ${rotuloMes(aberto)}`;
  const partes = [`entrou ${formatarMoeda(ano.entradas)}`];
  if (ano.rendeu !== null) {
    partes.push(
      `${ano.rendeu < 0 ? "perdeu" : "rendeu"} ${formatarMoeda(Math.abs(ano.rendeu))}${ano.faltouMes ? ", nos meses com pedido" : ""}`,
    );
  }
  return `Em ${aberto.slice(0, 4)}${ate}: ${partes.join(" · ")}`;
}
