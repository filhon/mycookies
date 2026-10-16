"use client";

import { useId } from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { CustoPorBase } from "@/lib/domain/notaFiscal";
import { custoDeReferencia } from "@/lib/domain/unidades";
import { formatarReferencia } from "./FichaDoMaterial";

/** "O quilo sai a R$ 54,90; era R$ 10,98. Confira a quantidade e a unidade." */
export function fraseDoSalto(
  anterior: CustoPorBase,
  novo: CustoPorBase,
): string {
  const era = custoDeReferencia(
    anterior.custoUnidadeBase,
    anterior.unidadeBase,
  );
  const sai = custoDeReferencia(novo.custoUnidadeBase, novo.unidadeBase);
  const rotulo = sai.rotulo[0]!.toUpperCase() + sai.rotulo.slice(1);
  return `${rotulo} sai a ${formatarReferencia(sai.centavos, novo.unidadeBase)}; era ${formatarReferencia(era.centavos, anterior.unidadeBase)}. Confira a quantidade e a unidade.`;
}

/**
 * A frase do salto, de atenção até ela confirmar e neutra depois (spec 188).
 * Preço dobra de verdade, e por isso é confirmação e não proibição.
 */
export function FraseDoSalto({
  anterior,
  novo,
  confirmado,
}: {
  anterior: CustoPorBase;
  novo: CustoPorBase;
  confirmado: boolean;
}) {
  const Icone = confirmado ? Check : TriangleAlert;
  return (
    <p
      className={`num flex items-start gap-1.5 text-label ${confirmado ? "text-ink-muted" : "text-attention"}`}
    >
      <Icone
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      <span>
        {fraseDoSalto(anterior, novo)}
        {confirmado && " Você confirmou."}
      </span>
    </p>
  );
}

/** A caixa que destrava a gravação do preço que saltou. */
export function CaixaDoSalto({
  confirmado,
  aoMudar,
}: {
  confirmado: boolean;
  aoMudar: (confirmado: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3 rounded-md border border-line-strong px-3 py-3">
      <input
        id={id}
        type="checkbox"
        checked={confirmado}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="mt-0.5 size-5 shrink-0"
      />
      <label htmlFor={id} className="text-label text-ink">
        O preço é esse mesmo
      </label>
    </div>
  );
}
