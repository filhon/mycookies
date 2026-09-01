import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { formatarQuantidade, ROTULO_UNIDADE_BASE } from "@/lib/domain/unidades";
import type { CustoInsumoCalculado } from "@/lib/domain/custoInsumo";

/**
 * A conta que a Maynara nunca fez à mão, mostrada enquanto ela digita.
 * É o retorno imediato que transforma cadastro em entendimento.
 */
export function ResumoCusto({
  custo,
  perdaPercentual,
}: {
  custo: CustoInsumoCalculado;
  perdaPercentual: number;
}) {
  const temPerda = perdaPercentual > 0;

  return (
    <div className="filete-dourado rounded-lg bg-sunken px-4 pb-4 pt-4">
      <p className="text-label font-medium text-ink-muted">
        Cada {ROTULO_UNIDADE_BASE[custo.unidadeBase]} aproveitado custa
      </p>
      <p className="num mt-1 font-display text-display font-semibold text-ink">
        {formatarCustoUnitario(custo.custoUnidadeBaseCorrigido)}
      </p>

      <dl className="mt-4 space-y-2 border-t border-line pt-3 text-label">
        {temPerda && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Sem contar a perda</dt>
              <dd className="num font-medium text-ink">
                {formatarCustoUnitario(custo.custoUnidadeBase)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">A perda custa, por embalagem</dt>
              <dd className="num font-semibold text-attention">
                {formatarMoeda(custo.custoDaPerda)}
              </dd>
            </div>
          </>
        )}

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Sobra para usar</dt>
          <dd className="num font-medium text-ink">
            {formatarQuantidade(custo.rendimentoLiquido, custo.unidadeBase)}
            {temPerda && (
              <span className="ml-1 font-normal text-ink-subtle">
                de {formatarQuantidade(custo.quantidadeBase, custo.unidadeBase)}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
