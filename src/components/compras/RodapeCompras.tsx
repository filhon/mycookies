import { Check, ShoppingCart } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import type { ResumoDaLista } from "@/lib/domain/listaCompras";
import { formatarMoeda } from "@/lib/domain/money";

/**
 * O rodapé preso ao pé da tela enquanto ela anda pelo mercado.
 *
 * Mesma razão do rodapé do pedido e do painel de preço da ficha: a pergunta que
 * a trouxe até aqui — "quanto ainda falta gastar?" — não pode depender de rolar
 * a lista até o fim. O número grande é o que **falta**, e não o total: é ele que
 * decide se dá para levar tudo hoje, e é ele que desce a cada item marcado.
 */
export function RodapeCompras({ resumo }: { resumo: ResumoDaLista }) {
  const tudoNoCarrinho = resumo.aComprar > 0 && resumo.restante === 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 lg:px-5">
          <div>
            <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
              Lista inteira
            </p>
            <p className="mt-0.5">
              <Dinheiro centavos={resumo.total} />
            </p>
          </div>

          <div className="text-right">
            <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
              {tudoNoCarrinho ? "Você gastou" : "Ainda falta"}
            </p>
            <p className="mt-0.5">
              <Dinheiro
                centavos={tudoNoCarrinho ? resumo.total : resumo.restante}
                tamanho="lg"
              />
            </p>
          </div>
        </div>

        <p className="flex items-start gap-2.5 border-t border-line bg-sunken px-4 py-2.5 text-label text-ink-muted lg:px-5">
          {tudoNoCarrinho ? (
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-positive"
              strokeWidth={2}
            />
          ) : (
            <ShoppingCart
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          )}
          <span className="max-w-[64ch]" aria-live="polite">
            {tudoNoCarrinho ? (
              <>
                Tudo marcado. A compra deu{" "}
                <strong className="num font-semibold text-ink">
                  {formatarMoeda(resumo.total)}
                </strong>
                , e você pode fechar a lista no fim da página.
              </>
            ) : (
              <>
                <strong className="num font-semibold text-ink">
                  {resumo.comprados} de {resumo.aComprar}
                </strong>{" "}
                {resumo.aComprar === 1 ? "item" : "itens"} no carrinho.
                {resumo.jaTem > 0 && (
                  <>
                    {" "}
                    Mais {resumo.jaTem} {resumo.jaTem === 1 ? "item" : "itens"}{" "}
                    você já tem em casa.
                  </>
                )}
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
