import type { Segmento } from "@/lib/domain/custoFicha";
import { cn } from "@/lib/utils/cn";

/**
 * Degraus de luminância em `ink`, que inverte sozinho no tema escuro; os
 * `brand-400/500` do pacote somem sobre a superfície escura (`#d126`). O
 * degrau mais claro fica em `/30`: em `/25` o último segmento lia como trilha
 * vazia sobre o papel cru. Sem vão entre segmentos: a luminância separa. Com
 * mais de quatro parcelas neutras (o kit com escolhas) a escala recomeça, e o
 * salto de `/30` para `/90` separa tanto quanto qualquer degrau.
 */
const NEUTROS = ["bg-ink/90", "bg-ink/65", "bg-ink/45", "bg-ink/30"];

/**
 * A segunda assinatura da marca, e a única que é gráfico: o custo do lote em
 * proporção real, com o trabalho dela em âmbar. As linhas do bloco abaixo são
 * a legenda; o `aria-label` diz o mesmo para quem não vê.
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
      className={cn("flex h-2.5 overflow-hidden rounded-[3px]", className)}
    >
      {segmentos.map((s) => (
        <span
          key={s.rotulo}
          style={{ flex: s.fracao }}
          className={
            s.destaque ? "bg-accent-500" : NEUTROS[neutro++ % NEUTROS.length]
          }
        />
      ))}
    </div>
  );
}
