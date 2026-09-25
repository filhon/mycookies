import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";

/** A prévia da página do preço (spec 039, `#d183`): a resposta curta, com os números do `EXEMPLO`. */

const { custo, parametros } = EXEMPLO;
const SUGERIDO = calcularPrecoSugerido(custo.custoUnitario, parametros);
// O resultado existe para o `EXEMPLO`; `tests/domain/exemplo.test.ts` prende.
const PRECO = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;

const FRASE = `Um cookie que custa ${formatarMoeda(custo.custoUnitario)}, com ${parametros.margemDesejada}% de margem e ${parametros.taxaCartaoConsiderada}% de maquininha, sai a ${formatarMoeda(PRECO)}.`;

export const alt = `Como calcular o preço do seu cookie. ${FRASE}`;
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default function Image() {
  return desenharPrevia({
    linhaDeCima: "Como calcular o preço do seu cookie",
    frase: FRASE,
  });
}
