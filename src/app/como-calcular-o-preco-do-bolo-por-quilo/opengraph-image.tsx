import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";
import { boloDe } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";

/** A prévia da página do bolo por quilo (spec 068), como a do cookie (`#d183`). */

const { custo, parametros } = boloDe(2);
const SUGERIDO = calcularPrecoSugerido(custo.custoUnitario, parametros);
// O resultado existe para o exemplo; `tests/domain/exemplo.test.ts` prende.
const PRECO = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;

const FRASE = `No bolo de 2 kg, o quilo que custa ${formatarMoeda(custo.custoUnitario)}, com ${parametros.margemDesejada}% de margem e ${parametros.taxaCartaoConsiderada}% de maquininha, sai a ${formatarMoeda(PRECO)}.`;

export const alt = `Como calcular o preço do bolo por quilo. ${FRASE}`;
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default function Image() {
  return desenharPrevia({
    linhaDeCima: "Como calcular o preço do bolo por quilo",
    frase: FRASE,
  });
}
