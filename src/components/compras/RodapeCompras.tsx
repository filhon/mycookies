import { Archive, Check } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { RodapeFixo } from "@/components/ui/RodapeFixo";
import type { ResumoDaLista } from "@/lib/domain/listaCompras";

/**
 * O rodapé preso ao pé da tela enquanto ela anda pelo mercado.
 *
 * Mesma razão do rodapé do pedido e do painel de preço da ficha: a pergunta que
 * a trouxe até aqui — "quanto ainda falta gastar?" — não pode depender de rolar
 * a lista até o fim.
 *
 * Um número só por vez (`#d300`): antes de marcar, o que falta **é** a lista
 * inteira, e mostrar os dois lado a lado era repetir. Depois do primeiro item, o
 * grande passa a ser o que falta, com o total em rótulo; com tudo marcado, o que
 * ela gastou. A contagem ao lado faz o que a faixa de prosa fazia.
 *
 * O que ficou pra próxima sai das contas e entra na contagem ao lado (`#d304`).
 *
 * Com tudo marcado, "Fechar a lista" abre o bloco do fechar (`#d301`). Some com
 * o teclado aberto, como o resto do que não é correção (`#d75`).
 */
export function RodapeCompras({
  resumo,
  aoFechar,
}: {
  resumo: ResumoDaLista;
  /** Ausente quando o bloco do fechar já está aberto. */
  aoFechar?: () => void;
}) {
  const nadaMarcado = resumo.comprados === 0;
  const tudoNoCarrinho = resumo.aComprar > 0 && resumo.restante === 0;

  return (
    <RodapeFixo>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-4 py-3 lg:px-5">
        <p className="flex flex-wrap items-baseline gap-x-2 text-label text-ink-muted">
          {nadaMarcado ? (
            <>
              A lista dá <Dinheiro centavos={resumo.total} tamanho="lg" />
            </>
          ) : tudoNoCarrinho ? (
            <>
              Você gastou <Dinheiro centavos={resumo.total} tamanho="lg" />
            </>
          ) : (
            <>
              Ainda falta <Dinheiro centavos={resumo.restante} tamanho="lg" />
              <span>
                de <Dinheiro centavos={resumo.total} tamanho="sm" />
              </span>
            </>
          )}
        </p>

        <p
          aria-live="polite"
          className="num flex items-center gap-1.5 text-label text-ink-muted"
        >
          {tudoNoCarrinho ? (
            <>
              <Check
                aria-hidden
                className="size-4 shrink-0 text-positive"
                strokeWidth={2}
              />
              Tudo no carrinho
            </>
          ) : (
            <span>
              <strong className="font-semibold text-ink">
                {resumo.comprados} de {resumo.aComprar}
              </strong>{" "}
              no carrinho
            </span>
          )}
          {/* Fora do total (`#d304`), e por isso dito: o número de cima
              desceu por uma decisão dela, e não por um item a menos. */}
          {resumo.pulados > 0 && (
            <>
              <span className="text-ink-subtle">·</span>
              <span>{resumo.pulados} pra próxima</span>
            </>
          )}
        </p>

        {tudoNoCarrinho && aoFechar && (
          <Botao
            larguraTotal
            className="mt-2 apertado:hidden sm:mt-0 sm:w-auto"
            onClick={aoFechar}
            iconeInicial={
              <Archive aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Fechar a lista
          </Botao>
        )}
      </div>
    </RodapeFixo>
  );
}
