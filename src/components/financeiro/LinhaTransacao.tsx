import { ChevronRight } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { ROTULO_CATEGORIA_TRANSACAO } from "@/lib/domain/caixa";
import { rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { FormaPagamento, Transacao } from "@/lib/types";

/**
 * Um lançamento na lista do mês.
 *
 * O valor carrega o sinal em texto, e não só em cor: `+` e `−` dizem a direção
 * do dinheiro para quem não distingue o verde do vermelho. A taxa da venda
 * aparece embaixo do valor porque é o que a Maynara não veria em lugar nenhum
 * — a venda entra pelo bruto, e o que a maquininha ficou some se ninguém
 * escrever.
 */
export function LinhaTransacao({
  transacao,
  forma,
  aoAbrir,
}: {
  transacao: Transacao;
  forma?: FormaPagamento;
  aoAbrir: (transacao: Transacao) => void;
}) {
  const ehEntrada = transacao.tipo === "ENTRADA";
  const taxa = transacao.custoTaxa ?? 0;

  const detalhe = [
    rotuloDia(transacao.dataISO),
    ROTULO_CATEGORIA_TRANSACAO[transacao.categoria],
    forma?.nome,
    transacao.recorrente ? "repete todo mês" : undefined,
  ].filter(Boolean);

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(transacao)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">
            {transacao.descricao}
          </p>
          <p className="mt-0.5 truncate text-label text-ink-muted">
            {detalhe.join(" · ")}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <Dinheiro
            centavos={ehEntrada ? transacao.valor : -transacao.valor}
            comSinal
          />
          {taxa > 0 && (
            <p className="num mt-0.5 text-micro text-ink-muted">
              maquininha ficou com {formatarMoeda(taxa)}
            </p>
          )}
        </div>

        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </button>
    </li>
  );
}
