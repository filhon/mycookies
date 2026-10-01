import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";
import { EXEMPLO_BRIGADEIRO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";

/** A prévia da página do brigadeiro (spec 068), como a do cookie (`#d183`). */

const { custo, parametros } = EXEMPLO_BRIGADEIRO;
const SUGERIDO = calcularPrecoSugerido(custo.custoUnitario, parametros);
// O resultado existe para o exemplo; `tests/domain/exemplo.test.ts` prende.
const PRECO = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;

const FRASE = `Um cento que custa ${formatarMoeda(custo.custoUnitario)}, com ${parametros.margemDesejada}% de margem e ${parametros.taxaCartaoConsiderada}% de maquininha, sai a ${formatarMoeda(PRECO)}.`;

export const alt = `Como calcular o preço do brigadeiro. ${FRASE}`;
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default function Image() {
  return desenharPrevia({
    linhaDeCima: "Como calcular o preço do brigadeiro",
    frase: FRASE,
  });
}
