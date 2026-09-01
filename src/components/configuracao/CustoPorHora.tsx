import { formatarMoeda } from "@/lib/domain/money";
import {
  custoDeMinutos,
  custoHoraProducao,
  custoIndiretoPorHora,
  FORNADA_EXEMPLO_MINUTOS,
  type EntradaCustosOperacionais,
} from "@/lib/domain/custosOperacionais";

function Parcela({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="num font-medium text-ink">{formatarMoeda(valor)}</dd>
    </div>
  );
}

/**
 * A soma dos três blocos anteriores, no lugar onde ela fecha o raciocínio.
 *
 * É o número que a Maynara nunca calculou: quanto custa uma hora de forno
 * ligado antes de qualquer ingrediente. Sem ele, os três campos acima são só
 * campos.
 */
export function CustoPorHora({
  operacional,
}: {
  operacional: EntradaCustosOperacionais;
}) {
  const total = custoHoraProducao(operacional);
  const indireto = custoIndiretoPorHora(
    operacional.despesasFixasMensais,
    operacional.horasProdutivasMes,
  );

  return (
    <div className="filete-dourado rounded-lg bg-sunken px-4 py-5 lg:px-5">
      <p className="text-label font-medium text-ink-muted">
        Cada hora de produção custa
      </p>
      <p className="num mt-1 font-display text-display font-semibold text-ink">
        {formatarMoeda(total)}
      </p>
      <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
        Antes do primeiro grama de farinha. Uma fornada de 1h30 já começa
        devendo{" "}
        <strong className="num font-semibold text-ink">
          {formatarMoeda(custoDeMinutos(total, FORNADA_EXEMPLO_MINUTOS))}
        </strong>
        .
      </p>

      <dl className="mt-4 space-y-2 border-t border-line pt-3 text-label">
        <Parcela rotulo="Seu trabalho" valor={operacional.valorHoraTrabalho} />
        <Parcela
          rotulo="Energia e gás"
          valor={operacional.custoEnergiaHora + operacional.custoGasHora}
        />
        <Parcela rotulo="Despesas fixas rateadas" valor={indireto} />
      </dl>
    </div>
  );
}
