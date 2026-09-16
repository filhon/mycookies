import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  DataISO,
  DocumentoBase,
  Percentual,
  UnidadeBase,
} from "./common";
import type { CategoriaInsumo } from "./insumos";
import type { MetodoPrecificacao } from "./configuracao";

/**
 * SIMPLES: receita que consome insumos e rende N unidades (um lote de cookies).
 * KIT: caixa/combo que consome OUTRAS fichas simples, mais a própria embalagem.
 *
 * Um kit não pode conter outro kit. Um nível de profundidade mantém a explosão
 * de demanda da lista de compras finita e o custo auditável.
 *
 * Na tela, chama-se produto (spec 021, `#d117`).
 */
export type TipoFicha = "SIMPLES" | "KIT";

/** Em que a ficha conta o que sai de um lote. */
export type UnidadeRendimento = "un" | "porcao" | "g" | "ml";

export interface ComponenteKit {
  fichaId: string;
  nomeSnapshot: string;
  /** Quantas unidades desta ficha entram no kit. */
  quantidade: number;
  /** custoUnitario da ficha componente no momento do cálculo. */
  custoUnitarioSnapshot: Centavos;
  custoLinha: Centavos;
}

/**
 * O que a cliente escolhe num kit: "2 de Cookie", e ela diz quais. A escolha é
 * por categoria, e não por lista de fichas: um sabor novo entra no combo no dia
 * em que nasce, sem reabrir o combo (`DECISOES.md#d99`).
 */
export interface EscolhaDoKit {
  /** Quantas unidades desta escolha entram em UM kit. */
  quantidade: number;
  /** As receitas que servem: as vivas, do tipo SIMPLES, com esta categoria. */
  categoria: string;
}

export interface ItemFichaTecnica {
  insumoId: string;
  /** Snapshot do nome: a linha continua legível mesmo se o insumo for arquivado. */
  nomeSnapshot: string;
  categoria: CategoriaInsumo;
  /** Quantidade na unidade base do insumo (g/ml/un). */
  quantidade: number;
  unidadeBase: UnidadeBase;
  /** quantidade × custoUnidadeBaseCorrigido, arredondado. Recalculado a cada save. */
  custoLinha: Centavos;
}

/** Os custos invisíveis já rateados para ESTE lote. */
export interface CustosInvisiveisFicha {
  tempoProducaoMinutos: number;
  /** (tempoProducaoMinutos / 60) × valorHoraTrabalho */
  custoMaoDeObra: Centavos;
  /** (tempoProducaoMinutos / 60) × (custoEnergiaHora + custoGasHora) */
  custoEnergiaGas: Centavos;
  /** (tempoProducaoMinutos / 60) × custoIndiretoPorHora */
  custoIndireto: Centavos;
}

export interface Precificacao {
  metodo: MetodoPrecificacao;
  /** Usado quando metodo === 'MARKUP'. */
  markup?: number;
  /** Usado quando metodo === 'MARGEM'. */
  margemDesejada?: Percentual;
  /** Taxa de cartão embutida no preço (senão a margem some na maquininha). */
  taxaCartaoConsiderada: Percentual;
  outrasTaxas: Percentual;

  /** Saída da calculadora, antes do arredondamento. */
  precoSugerido: Centavos;
  /** Preço praticado de fato. A usuária pode sobrescrever o sugerido. */
  precoVenda: Centavos;

  // Derivados do precoVenda REAL — é o que a usuária precisa ver na tela.
  lucroUnitario: Centavos;
  margemReal: Percentual;
  markupReal: number;
}

export interface FichaTecnica extends DocumentoBase {
  nome: string;
  nomeBusca: string;
  categoria: string;
  /**
   * A miniatura do produto na folha do orçamento (spec 017): um `data:` URL
   * de JPEG com até 320 px de lado e 80 KB, gravado pelo editor
   * (`DECISOES.md#d109`). Ausente em ficha sem foto.
   */
  fotoUrl?: string;
  /**
   * Como ela apresenta o produto para quem compra: duas frases, no máximo 240
   * caracteres. Vai na folha do orçamento (spec 017). Ausente em ficha que
   * nunca escreveu; `modoPreparo` é para dentro, esta é para fora.
   */
  descricao?: string;
  modoPreparo?: string;

  tipo: TipoFicha;

  /** Quantas unidades saem de UM lote desta receita (ou 1, para um kit). */
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  /**
   * O piso de produção: quantas fornadas ela quer sempre poder fazer. Quando a
   * despensa não dá mais isso, o que falta entra na lista de compras como
   * demanda, ao lado dos pedidos. Ausente em ficha gravada antes da spec 013
   * (sessão 13C): vale 0, e zero não muda a lista em nada (`DECISOES.md#d96`).
   */
  fornadasMinimas?: number;

  /**
   * O que está pronto: a massa congelada e o que já assou, contados no pote, na
   * unidade de rendimento. É a 007 aplicada um nível acima (spec 013, 13D): uma
   * medição com data, e não um saldo. A fornada **não** escreve aqui, ela propõe
   * a contagem (`DECISOES.md#d97`). Ausente em ficha que nunca contou.
   */
  estoqueProntoAtual?: number | null;
  estoqueProntoContadoEmISO?: DataISO | null;

  /**
   * Insumos consumidos. Em uma ficha SIMPLES, ingredientes e embalagem.
   * Em um KIT, apenas a embalagem própria do kit (caixa, laço, etiqueta).
   */
  itens: ItemFichaTecnica[];
  /** Fichas que compõem o kit. Sempre vazio em ficha SIMPLES. */
  componentes: ComponenteKit[];
  /**
   * O que a cliente escolhe num kit (`DECISOES.md#d99`). Ausente ou vazio:
   * conteúdo fixo, que é toda ficha gravada antes da spec 014.
   */
  escolhas?: EscolhaDoKit[];

  /**
   * Espelho de itens[].insumoId. Existe para responder com UMA query
   * `where('insumoIds','array-contains', X)`: "quais receitas usam este insumo?"
   * — necessário para marcar fichas desatualizadas quando um preço muda.
   */
  insumoIds: string[];
  /** Espelho de componentes[].fichaId. Mesma finalidade, um nível acima. */
  componenteIds: string[];

  invisiveis: CustosInvisiveisFicha;

  // ---- Resultado do motor de custo (derivado, gravado) ----
  custoInsumos: Centavos;
  custoEmbalagem: Centavos;
  /** Soma dos componentes, em kit. Zero em ficha simples. */
  custoComponentes: Centavos;
  /**
   * A parcela das escolhas no custo, pela opção mais cara de cada uma
   * (`DECISOES.md#d101`). Zero sem escolhas; ausente em ficha antiga, que vale
   * o mesmo. É o que permite ao pedido saber a base do kit:
   * `custoUnitario − custoEscolhas`.
   */
  custoEscolhas?: Centavos;
  custoTotalLote: Centavos;
  /** custoTotalLote / rendimento. Base de toda precificação. */
  custoUnitario: Centavos;

  precificacao: Precificacao;

  custoCalculadoEm: Timestamp;
  /**
   * Marcado como true quando um insumo da receita muda de preço.
   * A UI mostra um selo "custo desatualizado" e oferece recalcular —
   * sem isso, a Maynara venderia com preço de farinha do ano passado.
   */
  custoDesatualizado: boolean;

  ativo: boolean;
}
