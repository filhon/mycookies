import type {
  CategoriaInsumo,
  Centavos,
  CentavosFracionados,
  CustosOperacionais,
  EscolhaDoKit,
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

/** O kit em que a cliente escolhe o que vai dentro (`DECISOES.md#d99`). */
export function temEscolhas(ficha: {
  tipo: TipoFicha;
  escolhas?: EscolhaDoKit[];
}): boolean {
  return ficha.tipo === "KIT" && (ficha.escolhas?.length ?? 0) > 0;
}

/** O que uma escolha precisa saber de uma ficha candidata. `FichaTecnica` serve. */
export interface FichaParaEscolha {
  id: string;
  nome: string;
  tipo: TipoFicha;
  categoria: string;
  arquivado: boolean;
  custoUnitario: Centavos;
}

/**
 * As receitas que servem a uma escolha: vivas, SIMPLES, da categoria, e nunca
 * o próprio kit. É `podeSerComponente` com a categoria por cima — a escolha é
 * um componente que a cliente aponta.
 */
export function opcoesDaEscolha<F extends FichaParaEscolha>(
  escolha: Pick<EscolhaDoKit, "categoria">,
  fichas: F[],
  kitId?: string,
): F[] {
  return fichas.filter(
    (ficha) =>
      podeSerComponente(ficha, kitId) && ficha.categoria === escolha.categoria,
  );
}

export interface CustoDasEscolhas {
  /** O que entra no custo do kit: a mais cara de cada escolha (`#d101`). */
  referencia: Centavos;
  minimo: Centavos;
  maximo: Centavos;
  /** As categorias sem receita viva: a parcela sai zerada, e a tela avisa. */
  semOpcao: string[];
}

/**
 * A parcela das escolhas no custo de UM kit, e a faixa em que ela pode cair.
 *
 * A referência é a opção mais cara de cada escolha: o preço do combo é fixo,
 * e um preço que fecha a margem na combinação mais cara fecha em todas. Uma
 * média prometeria uma margem que metade dos combos não entrega. Categoria sem
 * receita viva entra como zero com aviso, e não como `Infinity`.
 */
export function custoDasEscolhas(
  escolhas: EscolhaDoKit[],
  fichas: FichaParaEscolha[],
  kitId?: string,
): CustoDasEscolhas {
  let minimo = 0;
  let maximo = 0;
  const semOpcao: string[] = [];

  for (const escolha of escolhas) {
    const custos = opcoesDaEscolha(escolha, fichas, kitId).map(
      (opcao) => opcao.custoUnitario,
    );
    if (custos.length === 0) {
      semOpcao.push(escolha.categoria);
      continue;
    }
    const quantidade = escolha.quantidade > 0 ? escolha.quantidade : 0;
    minimo += Math.round(Math.min(...custos) * quantidade);
    maximo += Math.round(Math.max(...custos) * quantidade);
  }

  return { referencia: maximo, minimo, maximo, semOpcao };
}

/** Como a ficha conta o que sai de um lote. */
export const ROTULO_UNIDADE_RENDIMENTO: Record<UnidadeRendimento, string> = {
  un: "unidades",
  porcao: "porções",
  g: "gramas",
  ml: "mililitros",
};

/** O sufixo curto de um campo: "un", e não "unidades", ao lado de um número. */
export const SUFIXO_UNIDADE_RENDIMENTO: Record<UnidadeRendimento, string> = {
  un: "un",
  porcao: "porções",
  g: "g",
  ml: "ml",
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

export interface EntradaCustoFicha {
  itens: ItemParaCusto[];
  /** Sempre vazio em ficha simples. */
  componentes: ComponenteParaCusto[];
  /**
   * A parcela das escolhas, já calculada por `custoDasEscolhas` (`#d101`).
   * Ausente vale zero, que é toda ficha sem escolha.
   */
  custoEscolhas?: Centavos;
  tempoProducaoMinutos: number;
  /** Quantas unidades saem de um lote. */
  rendimento: number;
  operacional: RateioOperacional;
}

export interface CustoFichaCalculado {
  custoInsumos: Centavos;
  custoEmbalagem: Centavos;
  custoComponentes: Centavos;
  custoEscolhas: Centavos;
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
  const custoEscolhas = Math.max(0, Math.round(entrada.custoEscolhas ?? 0));

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
    custoEscolhas +
    custoMaoDeObra +
    custoEnergiaGas +
    custoIndireto;

  return {
    custoInsumos,
    custoEmbalagem,
    custoComponentes,
    custoEscolhas,
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

/**
 * O nome de cada parcela, na ordem em que o bloco "O custo do lote" as lista.
 * As linhas do bloco são a legenda da faixa de composição: um nome só.
 */
export const ROTULO_PARCELA = {
  custoInsumos: "Materiais",
  custoEmbalagem: "Embalagem",
  custoComponentes: "Produtos de dentro",
  custoEscolhas: "O que a cliente escolhe (pela opção mais cara)",
  custoMaoDeObra: "Seu trabalho",
  custoEnergiaGas: "Energia e gás",
  custoIndireto: "Fatia das despesas fixas",
} as const satisfies Partial<Record<keyof CustoFichaCalculado, string>>;

/** Um segmento da faixa de composição (`DECISOES.md#d126`). */
export interface Segmento {
  rotulo: string;
  centavos: Centavos;
  /** A fatia do lote, de 0 a 1. Somam 1 dentro do arredondamento. */
  fracao: number;
  /** O segmento âmbar. Só o trabalho dela. */
  destaque: boolean;
}

/**
 * A faixa de composição é dado, nunca enfeite: só existe onde existe custo
 * calculado, com as parcelas e a ordem das linhas que o bloco já mostra.
 * Parcela zerada não vira segmento; lote zerado não tem faixa.
 */
export function composicaoDoLote(custo: CustoFichaCalculado): Segmento[] {
  const total = custo.custoTotalLote;
  if (total <= 0) return [];
  return (Object.keys(ROTULO_PARCELA) as (keyof typeof ROTULO_PARCELA)[])
    .filter((chave) => custo[chave] > 0)
    .map((chave) => ({
      rotulo: ROTULO_PARCELA[chave],
      centavos: custo[chave],
      fracao: custo[chave] / total,
      destaque: chave === "custoMaoDeObra",
    }));
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
