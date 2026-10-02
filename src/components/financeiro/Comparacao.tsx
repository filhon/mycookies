import { TrendingDown, TrendingUp } from "lucide-react";
import { formatarMoeda } from "@/lib/domain/money";
import { cn } from "@/lib/utils/cn";

/** Abaixo disto, "a mais" e "a menos" são arredondamento: é igual (`#d211`). */
const DIFERENCA_QUE_CONTA = 100;

/**
 * O que entrou contra o mês anterior, na Hoje e no Caixa (`#d211`, `#d264`).
 * Com `dia`, é o mês corrente até ali; sem ele, o mês fechado inteiro.
 *
 * Seta e palavra, nunca vermelho: vender menos que o mês passado até aqui não
 * é erro, e o alarme não é a voz da marca.
 */
export function Comparacao({
  diferenca,
  mesAnterior,
  dia,
}: {
  diferenca: number;
  mesAnterior: string;
  dia?: number;
}) {
  const ate = dia === undefined ? "" : ` até o dia ${dia}`;

  if (Math.abs(diferenca) < DIFERENCA_QUE_CONTA) {
    return (
      <p className="mt-1 text-label text-ink-muted">
        Entrou igual a {mesAnterior}
        {ate}
      </p>
    );
  }

  const aMais = diferenca > 0;
  const Icone = aMais ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1.5 text-label",
        aMais ? "text-positive" : "text-ink-muted",
      )}
    >
      <Icone aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      <span>
        Entrou <span className="num">{formatarMoeda(Math.abs(diferenca))}</span>{" "}
        {aMais ? "a mais" : "a menos"} que {mesAnterior}
        {ate}
      </span>
    </p>
  );
}
