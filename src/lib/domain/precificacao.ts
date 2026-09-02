import type {
  Centavos,
  MetodoPrecificacao,
  Percentual,
  RegraArredondamento,
} from "@/lib/types";
import { arredondarPreco, percentualDe } from "./money";

/**
 * Margem pedida mais taxas não pode chegar a 100% do preço: nesse ponto o
 * divisor é zero, e daí para cima ele é negativo. Não existe preço que
 * satisfaça, e a conta precisa dizer isso em vez de devolver `Infinity`.
 */
export const LIMITE_MARGEM_MAIS_TAXAS = 100;

export type MotivoSemPreco = "MARGEM_IMPOSSIVEL" | "MARKUP_INVALIDO";

export interface ParametrosPreco {
  metodo: MetodoPrecificacao;
  /** Multiplicador sobre o custo. Usado quando `metodo` é MARKUP. */
  markup: number;
  /** Quanto a usuária quer que sobre. Usado quando `metodo` é MARGEM. */
  margemDesejada: Percentual;
  taxaCartaoConsiderada: Percentual;
  outrasTaxas: Percentual;
  arredondamento: RegraArredondamento;
}

export type ResultadoPreco =
  | { ok: true; precoSugerido: Centavos; precoArredondado: Centavos }
  | { ok: false; motivo: MotivoSemPreco };

type EntradaTaxas = Pick<
  ParametrosPreco,
  "taxaCartaoConsiderada" | "outrasTaxas"
>;

/** Tudo que a maquininha e o resto do mundo tiram de cima do preço de venda. */
export function somaTaxas(parametros: EntradaTaxas): Percentual {
  return parametros.taxaCartaoConsiderada + parametros.outrasTaxas;
}

/**
 * O preço que o método escolhido pede, e o mesmo preço já arredondado para a
 * vitrine.
 *
 * Os dois voltam juntos porque são a mesma resposta em dois momentos: o
 * sugerido é o que a conta manda, o arredondado é o que vai na etiqueta. Quem
 * chama fica livre para mostrar a diferença entre eles, que é justamente o
 * ganho escondido do arredondamento.
 */
export function calcularPrecoSugerido(
  custoUnitario: Centavos,
  parametros: ParametrosPreco,
): ResultadoPreco {
  if (parametros.metodo === "MARKUP") {
    // Markup zero ou negativo não é preço barato: é ausência de conta.
    if (!(parametros.markup > 0)) {
      return { ok: false, motivo: "MARKUP_INVALIDO" };
    }
    return comArredondamento(
      Math.round(custoUnitario * parametros.markup),
      parametros.arredondamento,
    );
  }

  const comprometido = parametros.margemDesejada + somaTaxas(parametros);
  if (!(comprometido < LIMITE_MARGEM_MAIS_TAXAS)) {
    return { ok: false, motivo: "MARGEM_IMPOSSIVEL" };
  }

  // O custo é o que sobra do preço depois da margem e das taxas; o preço é o
  // custo dividido por essa sobra. Multiplicar o custo pela margem, que é o
  // erro comum, entrega uma margem menor do que a pedida.
  const divisor = 1 - comprometido / 100;
  return comArredondamento(
    Math.round(custoUnitario / divisor),
    parametros.arredondamento,
  );
}

function comArredondamento(
  precoSugerido: Centavos,
  regra: RegraArredondamento,
): ResultadoPreco {
  return {
    ok: true,
    precoSugerido,
    precoArredondado: arredondarPreco(precoSugerido, regra),
  };
}

export interface VerificacaoPreco {
  /** O que as taxas comem deste preço, em dinheiro. */
  custoTaxas: Centavos;
  /** O que sobra por unidade depois do custo e das taxas. */
  lucroUnitario: Centavos;
  margemReal: Percentual;
  markupReal: number;
}

/**
 * A conferência sobre o preço realmente praticado, que é o único que a
 * usuária cobra da cliente.
 *
 * Ela precisa existir separada da sugestão porque o preço vai para a vitrine
 * arredondado, editado à mão, ou vindo da concorrente — e nesses três casos a
 * margem que ela pediu não é a margem que ela tem.
 */
export function verificarPreco(
  precoVenda: Centavos,
  custoUnitario: Centavos,
  taxas: Percentual,
): VerificacaoPreco {
  const custoTaxas = percentualDe(precoVenda, taxas);
  const lucroUnitario = precoVenda - custoUnitario - custoTaxas;

  return {
    custoTaxas,
    lucroUnitario,
    // Sem preço não há percentual de preço, e sem custo não há múltiplo de
    // custo. Zero, e nunca `Infinity` ou `NaN` vazando para a tela.
    margemReal:
      precoVenda > 0 ? duasCasas((lucroUnitario / precoVenda) * 100) : 0,
    markupReal: custoUnitario > 0 ? duasCasas(precoVenda / custoUnitario) : 0,
  };
}

/**
 * Percentual e múltiplo são gravados com duas casas: são números de exibição,
 * e guardar 31.159420289855074 no banco só adiciona ruído ao documento.
 */
function duasCasas(valor: number): number {
  return Math.round(valor * 100) / 100;
}
