import { ChevronRight } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Traco } from "./ProdutosDoMes";
import {
  ROTULO_CATEGORIA_TRANSACAO,
  saidasOrdenadas,
} from "@/lib/domain/caixa";
import { formatarPercentual } from "@/lib/domain/money";
import type { CategoriaTransacao, Centavos } from "@/lib/types";

/**
 * Para onde o dinheiro foi, do maior gasto para o menor.
 *
 * Seção no papel com lista com divisórias: são linhas comparáveis, e o traço
 * sob cada nome é a comparação (`#d267`). O traço é uma medida em neutro, e não
 * um alerta — comprar insumo é o negócio funcionando, não um erro a ser
 * pintado de vermelho.
 *
 * Tocar numa linha filtra a lista do mês por ela (`#d266`): "Despesa fixa R$
 * 950,00" mostra quais lançamentos somam isso.
 */
export function SaidasPorCategoria({
  porCategoriaSaida,
  saidas,
  aoFiltrar,
}: {
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;
  saidas: Centavos;
  aoFiltrar: (categoria: CategoriaTransacao) => void;
}) {
  const linhas = saidasOrdenadas(porCategoriaSaida);
  if (linhas.length === 0) return null;

  const maior = linhas[0]?.valor ?? 0;

  return (
    <section aria-labelledby="saidas-por-categoria">
      <h2
        id="saidas-por-categoria"
        className="text-subheading font-semibold text-ink"
      >
        Para onde o dinheiro foi
      </h2>

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {linhas.map((linha) => {
          const fatia = saidas > 0 ? (linha.valor / saidas) * 100 : 0;

          return (
            <li key={linha.categoria}>
              <button
                type="button"
                onClick={() => aoFiltrar(linha.categoria)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline text-body text-ink">
                    <span className="min-w-0 truncate font-medium">
                      {ROTULO_CATEGORIA_TRANSACAO[linha.categoria]}
                    </span>
                    <span className="num ml-2 text-label text-ink-muted">
                      {formatarPercentual(fatia, 0)}
                    </span>
                  </span>
                  <Traco fracao={maior > 0 ? linha.valor / maior : 0} />
                </span>
                <Dinheiro centavos={linha.valor} />
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-ink-subtle"
                  strokeWidth={1.75}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
