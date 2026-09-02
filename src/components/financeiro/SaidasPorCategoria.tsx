import { Dinheiro } from "@/components/ui/Dinheiro";
import {
  ROTULO_CATEGORIA_TRANSACAO,
  saidasOrdenadas,
} from "@/lib/domain/caixa";
import { formatarPercentual } from "@/lib/domain/money";
import type { CategoriaTransacao, Centavos } from "@/lib/types";

/**
 * Para onde o dinheiro foi, do maior gasto para o menor.
 *
 * Lista com divisórias, e não grade de cartões: são linhas comparáveis, e a
 * barra atrás de cada uma é a comparação (`DESIGN.md`, Cartões). A barra é uma
 * medida em neutro, e não um alerta — comprar insumo é o negócio funcionando,
 * não um erro a ser pintado de vermelho.
 */
export function SaidasPorCategoria({
  porCategoriaSaida,
  saidas,
}: {
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;
  saidas: Centavos;
}) {
  const linhas = saidasOrdenadas(porCategoriaSaida);
  if (linhas.length === 0) return null;

  const maior = linhas[0]?.valor ?? 0;

  return (
    <section
      aria-labelledby="saidas-por-categoria"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <h2
        id="saidas-por-categoria"
        className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
      >
        Para onde o dinheiro foi
      </h2>

      <ul className="divide-y divide-line">
        {linhas.map((linha) => {
          const fatia = saidas > 0 ? (linha.valor / saidas) * 100 : 0;

          return (
            <li key={linha.categoria} className="relative">
              <span
                aria-hidden
                style={{
                  width: `${maior > 0 ? (linha.valor / maior) * 100 : 0}%`,
                }}
                className="absolute inset-y-0 left-0 bg-sunken"
              />
              <div className="relative flex min-h-14 items-center justify-between gap-3 px-4 py-3 lg:px-5">
                <p className="min-w-0 text-body text-ink">
                  <span className="truncate font-medium">
                    {ROTULO_CATEGORIA_TRANSACAO[linha.categoria]}
                  </span>
                  <span className="num ml-2 text-label text-ink-muted">
                    {formatarPercentual(fatia, 0)}
                  </span>
                </p>
                <Dinheiro centavos={linha.valor} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
