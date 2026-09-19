import { TriangleAlert } from "lucide-react";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import { somaTaxas, verificarPreco } from "@/lib/domain/precificacao";
import { custoPorVendavel, type QuebraDaFicha } from "@/lib/domain/producao";
import type { Centavos, FichaTecnica } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { texto } from "./FraseDaCapacidade";

/** "sobram" ou "perde", conforme o sinal — a mesma régua do `#d136`. */
function palavra(centavos: Centavos): "sobram" | "perde" {
  return centavos < 0 ? "perde" : "sobram";
}

/**
 * O custo real por unidade vendável, e o que isso vale na sobra — a última
 * parcela do custo honesto (`DECISOES.md#d139`, `#d140`).
 *
 * Leitura, nunca gravação: `custoPorVendavel` e `verificarPreco` sobre o que
 * já está na ficha, com a taxa de quebra das fornadas anotadas. Nada aqui
 * reescreve `precoSugerido` — é a mesma família de notícia do `PainelProduto`
 * da 024, e por isso a mesma régua visual.
 */
export function FraseDaQuebra({
  quebra,
  ficha,
}: {
  quebra: QuebraDaFicha;
  ficha: FichaTecnica;
}) {
  const prefixo = quebra.fornadas === 1 ? "Na" : "Nas";
  const meio =
    quebra.fornadas === 1
      ? "última massa que você anotou"
      : `${texto(quebra.fornadas)} últimas massas que você anotou`;

  if (quebra.taxa === 0) {
    return (
      <p className="max-w-[60ch] text-label text-ink-muted">
        {prefixo} <span className="font-medium text-ink">{meio}</span>, nada
        quebrou. Cada unidade custa os{" "}
        <span className="font-medium text-ink">
          {formatarMoeda(ficha.custoUnitario)}
        </span>{" "}
        da receita.
      </p>
    );
  }

  const custoReal = custoPorVendavel(ficha.custoUnitario, quebra.taxa);
  const temPreco = ficha.rendimento > 0 && ficha.precificacao.precoVenda > 0;
  const sobraGravada = ficha.precificacao.lucroUnitario;
  const sobraReal = temPreco
    ? verificarPreco(
        ficha.precificacao.precoVenda,
        custoReal,
        somaTaxas(ficha.precificacao),
      ).lucroUnitario
    : null;

  const primeira = sobraReal !== null ? palavra(sobraReal) : null;
  const segunda = palavra(sobraGravada);
  const cruzou = primeira === "perde" && segunda === "sobram";

  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-label",
        cruzou ? "text-negative" : "text-ink-muted",
      )}
    >
      {cruzou && (
        <TriangleAlert
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0"
          strokeWidth={2}
        />
      )}
      <span className="max-w-[60ch]">
        {prefixo} <span className="font-medium text-ink">{meio}</span>,{" "}
        {texto(quebra.perdidas)} de {texto(quebra.produzidas)} não deram para
        vender (
        <span className="font-medium text-ink">
          {formatarPercentual(quebra.taxa, 0)}
        </span>
        ). Cada unidade que você vende custa{" "}
        <span className="font-medium text-ink">{formatarMoeda(custoReal)}</span>
        , e não {formatarMoeda(ficha.custoUnitario)}
        {sobraReal !== null && primeira && (
          <>
            {" — "}
            {cruzou ? "você " : ""}
            {primeira}{" "}
            <span className="font-medium text-ink">
              {formatarMoeda(Math.abs(sobraReal))}
            </span>{" "}
            por unidade, e não {segunda !== primeira ? `${segunda} ` : ""}
            {formatarMoeda(Math.abs(sobraGravada))}
          </>
        )}
        .
      </span>
    </p>
  );
}
