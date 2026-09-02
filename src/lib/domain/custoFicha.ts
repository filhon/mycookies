import type {
  CategoriaInsumo,
  Centavos,
  CentavosFracionados,
  CustosOperacionais,
  Percentual,
  TipoFicha,
  UnidadeRendimento,
} from "@/lib/types";
import { custoDeMinutos } from "./custosOperacionais";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
  type MotivoSemPreco,
  type ParametrosPreco,
  type VerificacaoPreco,
} from "./precificacao";

/**
 * O que conta como embalagem na hora de separar as duas somas da ficha.
 *
 * A divisão não é decorativa: a Maynara precisa ver quanto do custo é receita e
 * quanto é o que embrulha, porque é o segundo que ela esquece de cobrar. Tudo
 * que envolve, fecha, identifica ou guarda o produto pesa em `custoEmbalagem`.
 * Ingrediente e a categoria genérica `OUTRO` ficam do lado da receita, porque
 * `OUTRO` é o que ela usa para o que não soube classificar, e chamar isso de
 * embalagem seria adivinhar.
 */
export function ehEmbalagem(categoria: CategoriaInsumo): boolean {
  return (
    categoria === "EMBALAGEM" ||
    categoria === "ETIQUETA" ||
    categoria === "ARMAZENAMENTO"
  );
}

/**
 * Kit não contém kit (`DECISOES.md#d11`), e ficha nenhuma contém a si mesma.
 * O limite de um nível é o que mantém a explosão de demanda da lista de
 * compras finita e o custo auditável em uma leitura.
 */
export function podeSerComponente(
  candidata: { id: string; tipo: TipoFicha; arquivado: boolean },
  fichaAtualId?: string,
): boolean {
  return (
    candidata.tipo === "SIMPLES" &&
    !candidata.arquivado &&
    candidata.id !== fichaAtualId
  );
}

/** Como a ficha conta o que sai de um lote. */
export const ROTULO_UNIDADE_RENDIMENTO: Record<UnidadeRendimento, string> = {
  un: "unidades",
  porcao: "porções",
  g: "gramas",
  ml: "mililitros",
};

export const ROTULO_TIPO_FICHA: Record<TipoFicha, string> = {
  SIMPLES: "Receita",
  KIT: "Kit",
};

export interface ItemParaCusto {
  categoria: CategoriaInsumo;
  /** Custo do insumo já corrigido pela perda, por unidade base. */
  custoUnidadeBaseCorrigido: CentavosFracionados;
  /** Quantidade na unidade base do insumo (g/ml/un). */
  quantidade: number;
}

export interface ComponenteParaCusto {
  /** `custoUnitario` da ficha componente no momento do cálculo. */
  custoUnitarioSnapshot: Centavos;
  quantidade: number;
}

/**
 * A parte da configuração que a ficha consome. `custoIndiretoPorHora` já vem
 * rateado de `configuracao/geral`, calculado na escrita daquela tela.
 */
export type RateioOperacional = Pick<
  CustosOperacionais,
  | "valorHoraTrabalho"
  | "custoEnergiaHora"
  | "custoGasHora"
  | "custoIndiretoPorHora"
>;

/**
 * O que uma ficha usa enquanto a conta não salvou configuração alguma.
 *
 * Zero, e não um palpite: um rateio inventado pelo sistema produz um preço
 * errado com aparência de certo, que é pior do que preço nenhum. A tela avisa
 * e aponta para `/configuracao` (`DECISOES.md#d17`).
 */
export const SEM_RATEIO: RateioOperacional = {
  valorHoraTrabalho: 0,
  custoEnergiaHora: 0,
  custoGasHora: 0,
  custoIndiretoPorHora: 0,
};

export interface EntradaCustoFicha {
  itens: ItemParaCusto[];
  /** Sempre vazio em ficha simples. */
  componentes: ComponenteParaCusto[];
  tempoProducaoMinutos: number;
  /** Quantas unidades saem de um lote. */
  rendimento: number;
  operacional: RateioOperacional;
}

export interface CustoFichaCalculado {
  custoInsumos: Centavos;
  custoEmbalagem: Centavos;
  custoComponentes: Centavos;
  custoMaoDeObra: Centavos;
  custoEnergiaGas: Centavos;
  custoIndireto: Centavos;
  custoTotalLote: Centavos;
  custoUnitario: Centavos;
}

/** O custo de uma linha de insumo, arredondado ao centavo. */
export function custoLinhaItem(item: ItemParaCusto): Centavos {
  return Math.round(item.custoUnidadeBaseCorrigido * item.quantidade);
}

/** O custo de uma linha de componente de kit. */
export function custoLinhaComponente(
  componente: ComponenteParaCusto,
): Centavos {
  return Math.round(componente.custoUnitarioSnapshot * componente.quantidade);
}

/**
 * O custo de um lote inteiro e o de cada unidade que sai dele.
 *
 * Arredonda linha a linha, e não só no total: é a linha que a Maynara confere
 * contra a nota do mercado, e um total que não bate com a soma do que está na
 * tela é um total em que ela não confia.
 */
export function calcularCustoFicha(
  entrada: EntradaCustoFicha,
): CustoFichaCalculado {
  const { operacional } = entrada;

  let custoInsumos = 0;
  let custoEmbalagem = 0;
  for (const item of entrada.itens) {
    const linha = custoLinhaItem(item);
    if (ehEmbalagem(item.categoria)) custoEmbalagem += linha;
    else custoInsumos += linha;
  }

  const custoComponentes = entrada.componentes.reduce(
    (soma, componente) => soma + custoLinhaComponente(componente),
    0,
  );

  const minutos = entrada.tempoProducaoMinutos;
  const custoMaoDeObra = custoDeMinutos(operacional.valorHoraTrabalho, minutos);
  const custoEnergiaGas = custoDeMinutos(
    operacional.custoEnergiaHora + operacional.custoGasHora,
    minutos,
  );
  const custoIndireto = custoDeMinutos(
    operacional.custoIndiretoPorHora,
    minutos,
  );

  const custoTotalLote =
    custoInsumos +
    custoEmbalagem +
    custoComponentes +
    custoMaoDeObra +
    custoEnergiaGas +
    custoIndireto;

  return {
    custoInsumos,
    custoEmbalagem,
    custoComponentes,
    custoMaoDeObra,
    custoEnergiaGas,
    custoIndireto,
    custoTotalLote,
    // Sem rendimento não há unidade para dividir. Zero, e a tela pede o
    // rendimento em vez de exibir `Infinity` como se fosse preço.
    custoUnitario:
      entrada.rendimento > 0
        ? Math.round(custoTotalLote / entrada.rendimento)
        : 0,
  };
}

export interface EntradaFicha extends EntradaCustoFicha {
  precificacao: ParametrosPreco;
  /** Preço praticado escolhido pela usuária. `null` aceita o sugerido. */
  precoVenda: Centavos | null;
}

export interface DerivadosFicha {
  custo: CustoFichaCalculado;
  taxas: Percentual;
  /** O que a conta pediu, antes do arredondamento. `null` quando não há preço. */
  precoSugerido: Centavos | null;
  /** O mesmo preço já pronto para a etiqueta. É o que a tela oferece. */
  precoArredondado: Centavos | null;
  motivoSemPreco: MotivoSemPreco | null;
  precoVenda: Centavos;
  verificacao: VerificacaoPreco;
}

/**
 * Todos os números derivados de uma ficha, de uma vez só.
 *
 * Existe para que a tela e a escrita no banco cheguem exatamente ao mesmo
 * resultado: o editor chama isto para mostrar, a mutação chama isto para
 * gravar. Dois caminhos calculando preço seriam dois caminhos para divergir.
 */
export function derivarFicha(entrada: EntradaFicha): DerivadosFicha {
  const custo = calcularCustoFicha(entrada);
  const taxas = somaTaxas(entrada.precificacao);
  const resultado = calcularPrecoSugerido(
    custo.custoUnitario,
    entrada.precificacao,
  );

  const precoSugerido = resultado.ok ? resultado.precoSugerido : null;
  const precoVenda =
    entrada.precoVenda ?? (resultado.ok ? resultado.precoArredondado : 0);

  return {
    custo,
    taxas,
    precoSugerido,
    precoArredondado: resultado.ok ? resultado.precoArredondado : null,
    motivoSemPreco: resultado.ok ? null : resultado.motivo,
    precoVenda,
    verificacao: verificarPreco(precoVenda, custo.custoUnitario, taxas),
  };
}
