import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";

/** A prévia de `/conheca` (spec 039, `#d183`): o `h1` da página, com os números do `EXEMPLO`. */

const SUGERIDO = calcularPrecoSugerido(
  EXEMPLO.custo.custoUnitario,
  EXEMPLO.parametros,
);
// O resultado existe para o `EXEMPLO`; `tests/domain/exemplo.test.ts` prende.
const PRECO = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;

const FRASE = `Este cookie te custa ${formatarMoeda(EXEMPLO.custo.custoUnitario)}. Você deveria cobrar ${formatarMoeda(PRECO)}.`;

export const alt = `Rende. ${FRASE}`;
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default function Image() {
  return desenharPrevia({
    linhaDeCima: "Você sabe fazer doce. Isso nunca foi o problema.",
    frase: FRASE,
  });
}
