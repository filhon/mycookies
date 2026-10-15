import type { Segmento } from "@/lib/domain/custoFicha";
import { formatarMoeda } from "@/lib/domain/money";
import { cn } from "@/lib/utils/cn";

/**
 * Degraus de luminância em `ink`, que inverte sozinho no tema escuro; os
 * `brand-400/500` do pacote somem sobre a superfície escura (`#d126`). O
 * degrau mais claro fica em `/30`: em `/25` o último segmento lia como trilha
 * vazia sobre o papel cru. Com mais de quatro parcelas neutras (o kit com
 * escolhas) a escala recomeça, e o corte entre elas separa.
 */
const NEUTROS = ["bg-ink/90", "bg-ink/65", "bg-ink/45", "bg-ink/30"];

/**
 * A segunda assinatura da marca, e a única que é gráfico: o custo do lote em
 * proporção real, com o trabalho dela em cobalto. As porções são separadas
 * pelo corte de 3px a 8° (`DESIGN.md`, Signature): o vão é o `gap` de uma
 * fileira inclinada, e as pontas inclinadas ficam fora do recorte do pai. O
 * rosa não entra: ele é só a sobra, e esta faixa ainda não mede o preço
 * (`#d381`). As linhas do bloco abaixo são a legenda; o `aria-label` diz o
 * mesmo para quem não vê.
 */
export function FaixaDeComposicao({
  segmentos,
  className,
}: {
  segmentos: Segmento[];
  className?: string;
}) {
  if (segmentos.length === 0) return null;
  let neutro = 0;

  return (
    <div
      role="img"
      aria-label={segmentos
        .map((s) => `${s.rotulo} ${Math.round(s.fracao * 100)}%`)
        .join(", ")}
      className={cn("h-2.5 overflow-hidden rounded-[3px]", className)}
    >
      <div className="-mx-0.5 flex h-full -skew-x-8 gap-0.75">
        {segmentos.map((s) => (
          <span
            key={s.rotulo}
            style={{ flex: s.fracao }}
            className={
              s.destaque
                ? "bg-brand-ink"
                : NEUTROS[neutro++ % NEUTROS.length]
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Uma linha da legenda da faixa (`#d126`): o rótulo e o valor de uma parcela,
 * dentro de um `<dl>`. Mora aqui, e não no editor, porque a legenda é da faixa;
 * o editor e o painel de produto só a listam.
 */
export function Parcela({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  /** A linha que casa com o segmento cobalto da faixa. Uma só. */
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        destaque && "font-semibold text-brand-ink",
      )}
    >
      <dt className={cn(!destaque && "text-ink-muted")}>{rotulo}</dt>
      <dd className={cn("num", !destaque && "font-medium text-ink")}>
        {formatarMoeda(valor)}
      </dd>
    </div>
  );
}
