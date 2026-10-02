import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";

/**
 * A prévia da página de doces (spec 068), como a do cookie (`#d183`). Sem
 * número, como a resposta da página: o de cada doce está na tabela.
 */

const FRASE =
  "Some o que o doce custa na unidade em que você vende e divida por 1 menos a margem e menos as taxas.";

export const alt = `Como calcular o preço de doces. ${FRASE}`;
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default function Image() {
  return desenharPrevia({
    linhaDeCima: "Como calcular o preço de doces",
    frase: FRASE,
  });
}
