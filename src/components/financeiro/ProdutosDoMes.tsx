import { TriangleAlert } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { produtosOrdenados } from "@/lib/domain/caixa";
import { formatarMoeda } from "@/lib/domain/money";
import type { ResumoProduto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * O que mais vendeu no mês, do maior faturamento para o menor.
 *
 * Lista com divisórias e uma barra de medida atrás de cada linha, como as
 * saídas por categoria: são linhas comparáveis, e a barra é a comparação
 * (`DESIGN.md`, Cartões). Ordenado por receita e não por quantidade — vender
 * trinta cookies não é o mesmo negócio que vender duas caixas.
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
    <section
      aria-labelledby="produtos-do-mes"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <h2
        id="produtos-do-mes"
        className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
      >
        O que mais vendeu
      </h2>

      <ul className="divide-y divide-line">
        {linhas.map(({ fichaId, produto }) => {
          const noPrejuizo = produto.lucro < 0;

          return (
            <li key={fichaId} className="relative">
              <span
                aria-hidden
                style={{
                  width: `${maior > 0 ? (produto.receita / maior) * 100 : 0}%`,
                }}
                className="absolute inset-y-0 left-0 bg-sunken"
              />
              <div className="relative flex min-h-14 items-center justify-between gap-3 px-4 py-3 lg:px-5">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-ink">
                    {produto.nome}
                  </p>
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

      <p className="border-t border-line bg-sunken px-4 py-3 text-label text-ink-muted lg:px-5">
        A sobra de cada produto é o preço menos o custo de produzir. Desconto,
        entrega e maquininha são do pedido inteiro e não cabem em uma linha:
        quem desconta os três é a sobra do mês, lá em cima.
      </p>
    </section>
  );
}
