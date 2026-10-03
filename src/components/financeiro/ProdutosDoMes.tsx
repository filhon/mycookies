import { TriangleAlert } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { produtosOrdenados } from "@/lib/domain/caixa";
import { formatarMoeda } from "@/lib/domain/money";
import type { ResumoProduto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * O que mais vendeu no mês, do maior faturamento para o menor.
 *
 * Seção no papel com lista com divisórias e um traço de medida sob cada nome,
 * como as saídas por categoria: são linhas comparáveis, e o traço é a
 * comparação. Fundo de linha inteira lia como linha selecionada (`#d267`).
 * Ordenado por receita e não por quantidade — vender trinta cookies não é o
 * mesmo negócio que vender duas caixas.
 *
 * A frase do rodapé não é decoração: sem ela, o lucro por produto seria lido
 * como lucro final, e ele não desconta desconto, entrega nem maquininha.
 */
export function ProdutosDoMes({
  produtos,
}: {
  produtos: Record<string, ResumoProduto>;
}) {
  const linhas = produtosOrdenados(produtos);
  if (linhas.length === 0) return null;

  const maior = linhas[0]?.produto.receita ?? 0;

  return (
    <section aria-labelledby="produtos-do-mes">
      <h2
        id="produtos-do-mes"
        className="text-subheading font-semibold text-ink"
      >
        O que mais vendeu
      </h2>

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {linhas.map(({ fichaId, produto }) => {
          const noPrejuizo = produto.lucro < 0;

          return (
            <li key={fichaId}>
              <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 lg:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">
                    {produto.nome}
                  </p>
                  <Traco fracao={maior > 0 ? produto.receita / maior : 0} />
                  <p className="num mt-0.5 text-label text-ink-muted">
                    {produto.quantidade}{" "}
                    {produto.quantidade === 1 ? "unidade" : "unidades"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <Dinheiro centavos={produto.receita} />
                  <p
                    className={cn(
                      "num mt-0.5 flex items-center justify-end gap-1 text-micro",
                      noPrejuizo ? "text-negative" : "text-ink-muted",
                    )}
                  >
                    {noPrejuizo && (
                      <TriangleAlert
                        aria-hidden
                        className="size-3.5"
                        strokeWidth={2}
                      />
                    )}
                    {noPrejuizo
                      ? `perde ${formatarMoeda(Math.abs(produto.lucro))}`
                      : `sobram ${formatarMoeda(produto.lucro)}`}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
        A sobra de cada produto é o preço menos o custo de produzir. Desconto,
        entrega e maquininha são do pedido inteiro e não cabem em uma linha:
        quem desconta os três é o que o mês rendeu.
      </p>
    </section>
  );
}

/**
 * A medida de uma linha contra a maior: 4 px sob o nome, na largura da coluna
 * do nome (`#d267`). Neutra, porque vender menos não é erro.
 */
export function Traco({ fracao }: { fracao: number }) {
  return (
    <span aria-hidden className="mt-1.5 block h-1 rounded-full bg-sunken">
      <span
        style={{ width: `${fracao * 100}%` }}
        className="block h-full rounded-full bg-ink-subtle"
      />
    </span>
  );
}
