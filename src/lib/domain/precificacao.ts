import type {
  Centavos,
  FormaPagamento,
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
 * Até 6, a margem digitada é quase sempre o multiplicador da apostila (2, 2,5,
 * 3) no campo errado: sobrar 2,5% do preço não paga nem a maquininha, e 6× é o
 * maior múltiplo que se vê em confeitaria. A partir de 1 porque abaixo disso
 * não há multiplicador que dê preço acima do custo (`#d341`).
 */
const MARGEM_QUE_PARECE_MULTIPLICADOR = { de: 1, ate: 6 };

/**
 * Abaixo de 10% o preço mal cobre um erro de pesagem ou um doce que quebra.
 * Pode ser decisão dela (um item de entrada, uma promoção), e por isso é aviso,
 * e não erro (`#d341`).
 */
const MARGEM_BAIXA_ABAIXO_DE = 10;

export type AvisoPrecificacao =
  | {
      campo: "margemDesejada";
      tipo: "MARGEM_PARECE_MULTIPLICADOR";
      sugestao: { metodo: "MARKUP"; markup: number };
    }
  | { campo: "margemDesejada"; tipo: "MARGEM_BAIXA"; sugestao: null }
  | {
      campo: "taxaCartaoConsiderada";
      tipo: "TAXA_ZERADA";
      sugestao: { taxaCartaoConsiderada: Percentual; nome: string };
    };

/**
 * Os dois números que quase sempre são engano (`#d341`): a margem de um dígito
 * e a taxa de cartão zerada numa conta que tem maquininha. Só avisa; nada aqui
 * impede de salvar.
 */
export function conferirPrecificacao(
  parametros: Pick<
    ParametrosPreco,
    "metodo" | "margemDesejada" | "taxaCartaoConsiderada"
  >,
  formasPagamento: FormaPagamento[],
): AvisoPrecificacao[] {
  const avisos: AvisoPrecificacao[] = [];
  const margem = parametros.margemDesejada;

  if (parametros.metodo === "MARGEM") {
    if (
      margem >= MARGEM_QUE_PARECE_MULTIPLICADOR.de &&
      margem <= MARGEM_QUE_PARECE_MULTIPLICADOR.ate
    ) {
      avisos.push({
        campo: "margemDesejada",
        tipo: "MARGEM_PARECE_MULTIPLICADOR",
        sugestao: { metodo: "MARKUP", markup: margem },
      });
    } else if (margem > 0 && margem < MARGEM_BAIXA_ABAIXO_DE) {
      avisos.push({
        campo: "margemDesejada",
        tipo: "MARGEM_BAIXA",
        sugestao: null,
      });
    }
  }

  if (parametros.taxaCartaoConsiderada === 0) {
    // A forma desligada não cobra de ninguém (`maiorTaxaAtiva`).
    const maisCara = formasPagamento.reduce<FormaPagamento | null>(
      (maior, forma) =>
        forma.ativo && forma.taxaPercentual > (maior?.taxaPercentual ?? 0)
          ? forma
          : maior,
      null,
    );
    if (maisCara) {
      avisos.push({
        campo: "taxaCartaoConsiderada",
        tipo: "TAXA_ZERADA",
        sugestao: {
          taxaCartaoConsiderada: maisCara.taxaPercentual,
          nome: maisCara.nome,
        },
      });
    }
  }

  return avisos;
}

/**
 * O que sobra por unidade no preço que o método pede, antes do arredondamento:
 * a consequência em reais de cada aviso de `conferirPrecificacao`. `null` sem
 * preço possível.
 */
export function sobraNoSugerido(
  custoUnitario: Centavos,
  parametros: ParametrosPreco,
): Centavos | null {
  const resultado = calcularPrecoSugerido(custoUnitario, parametros);
  return resultado.ok
    ? verificarPreco(
        resultado.precoSugerido,
        custoUnitario,
        somaTaxas(parametros),
      ).lucroUnitario
    : null;
}

/** Acima disto o número é engano de digitação, e não pedido (spec 047). */
const QUANTIDADE_MAXIMA_DA_BUSCA = 9999;

const NUMERO = String.raw`(\d+(?:,\d+)?)`;
// "30x", "1,5 kg", "12 un": a unidade colada no número não é parte do nome.
const UNIDADE = String.raw`(?:\s*(?:x|kg|un)(?=\s|$))?`;
const NO_COMECO = new RegExp(String.raw`^${NUMERO}${UNIDADE}\s*(.*)$`, "i");
const NO_FIM = new RegExp(String.raw`^(.*?)\s*${NUMERO}${UNIDADE}$`, "i");

/**
 * "30 brigadeiros", "brig 30", "1,5 kg bolo": a quantidade e o que buscar, do
 * jeito que ela escreve no WhatsApp (`DECISOES.md#d216`). Sem número, 1. Zero
 * ou mais de 9999 é 1, e o número fica no termo.
 *
 * O "s" final do termo cai: "30 brigadeiros" acha "Brigadeiro tradicional".
 * Tirar do fim só alarga a busca, porque o que sobra é prefixo do que ela
 * digitou.
 */
export function lerPedidoDeBusca(texto: string): {
  quantidade: number;
  termo: string;
} {
  const limpo = texto.trim();
  const comeco = NO_COMECO.exec(limpo);
  const fim = comeco ? null : NO_FIM.exec(limpo);
  const numero = comeco?.[1] ?? fim?.[2];
  const resto = (comeco ? comeco[2] : fim ? fim[1] : limpo) ?? "";
  const quantidade = numero ? Number(numero.replace(",", ".")) : 1;

  const valida = quantidade > 0 && quantidade <= QUANTIDADE_MAXIMA_DA_BUSCA;
  return {
    quantidade: valida ? quantidade : 1,
    termo: (valida ? resto : limpo).trim().replace(/s$/i, ""),
  };
}

/**
 * Percentual e múltiplo são gravados com duas casas: são números de exibição,
 * e guardar 31.159420289855074 no banco só adiciona ruído ao documento.
 */
function duasCasas(valor: number): number {
  return Math.round(valor * 100) / 100;
}
