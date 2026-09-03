import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  DocumentoBase,
  Percentual,
  VersaoSchema,
} from "./common";

export type TipoTransacao = "ENTRADA" | "SAIDA";

export type CategoriaTransacao =
  | "VENDA"
  | "COMPRA_INSUMO"
  | "EMBALAGEM"
  | "DESPESA_FIXA"
  | "EQUIPAMENTO"
  | "MARKETING"
  | "TAXA_PAGAMENTO"
  | "IMPOSTO"
  | "PRO_LABORE"
  | "OUTRO";

export interface Transacao extends DocumentoBase {
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  descricao: string;
  /** SEMPRE positivo. O sinal vem de `tipo` — evita erro de sinal em soma. */
  valor: Centavos;

  data: Timestamp;
  dataISO: DataISO;
  competencia: CompetenciaMensal;

  /** Origem, quando houver. Permite navegar do caixa para o pedido/compra. */
  pedidoId?: string;
  listaComprasId?: string;
  formaPagamentoId?: string;

  /**
   * A nota fiscal que originou este lançamento: `CNPJ-dataISO-totalImpresso`,
   * por exemplo `75315333000109-2026-09-02-17620`.
   *
   * É a guarda contra lançar a mesma nota duas vezes: antes de lançar, uma
   * consulta por igualdade neste campo — índice de campo único, criado
   * automaticamente pelo Firestore. Ler a mesma nota de novo, porque a primeira
   * leitura saiu torta ou porque ela esqueceu, criaria uma segunda saída
   * idêntica e o mês fecharia a menos sem que nada na tela explicasse.
   *
   * Ausente é o estado normal: só nasce com ele o lançamento que veio de uma
   * nota **com CNPJ legível**. Sem CNPJ não há chave e não há guarda, e a tela
   * não inventa uma a partir do nome da loja, que é o campo mais frágil do
   * cabeçalho (`DECISOES.md#d52`).
   */
  notaChave?: string;

  /**
   * O que a maquininha ficou desta entrada, congelado no lançamento.
   *
   * Zero em toda saída e em toda entrada sem forma de pagamento. É snapshot
   * pelo mesmo motivo de `ItemPedido.custoUnitarioSnapshot` (`DECISOES.md#d08`):
   * a taxa cobrada em uma venda é fato histórico, e recalculá-la a partir da
   * forma de pagamento de hoje faria arquivar um lançamento antigo reverter um
   * número diferente do que foi somado — o agregado torceria em silêncio.
   */
  custoTaxa: Centavos;

  recorrente: boolean;
  observacoes?: string;
}

export interface Meta extends DocumentoBase {
  competencia: CompetenciaMensal;
  faturamentoAlvo: Centavos;
  lucroAlvo?: Centavos;

  /**
   * O valor de referência do forecast, sugerido e editável.
   *
   * Guarda o **preço médio de um doce** — a média das fichas ativas, editável.
   * É a unidade em que a meta é dita ("102 doces por semana"), que é a unidade
   * em que a Maynara produz. O valor médio de um *pedido* não mora aqui: ele é
   * `ResumoMensal.ticketMedio`, exato porque nasce de dois incrementos
   * (`DECISOES.md#d28` e `#d36`).
   */
  ticketMedioReferencia: Centavos;

  // ---- Forecast (derivado, gravado para o card de meta ler direto) ----
  /**
   * ceil(faturamentoAlvo / valor médio de um pedido).
   *
   * O divisor **não** é `ticketMedioReferencia`: é `ResumoMensal.ticketMedio`,
   * o valor médio real de um pedido pago no mês. Os dois números medem coisas
   * diferentes — um doce e um pedido —, e usar o mesmo campo para os dois faria
   * a meta dizer "cada pedido tem um doce" (`DECISOES.md#d36`).
   *
   * Gravado no salvamento e refeito na leitura, como o espelho da meta: o
   * ticket médio anda a cada pedido pago, e a meta não é reescrita junto
   * (`#d30`). Zero é ausência de pedido pago no mês, e ausência não aparece.
   */
  pedidosNecessarios: number;
  /** Doces a vender no mês, pelo preço médio unitário. */
  unidadesNecessarias: number;
  semanasNoMes: number;
  /** unidadesNecessarias / semanasNoMes — o número que a Maynara persegue. */
  unidadesPorSemana: number;

  ativo: boolean;
}

/** Uma linha do ranking de produtos dentro do resumo mensal. */
export interface ResumoProduto {
  nome: string;
  quantidade: number;
  receita: Centavos;
  lucro: Centavos;
}

export interface ResumoDia {
  entradas: Centavos;
  saidas: Centavos;
  pedidos: number;
}

/**
 * Documento agregado do mês: `contas/{contaId}/agregados/{'YYYY-MM'}`.
 *
 * É o coração da otimização de leitura. O dashboard inteiro — KPIs, gráfico
 * diário, ranking de produtos e progresso da meta — sai de UM read.
 * Mantido por incremento (`FieldValue.increment`) nas escritas de pedido e
 * transação, o que também funciona offline: a operação entra na fila.
 */
export interface ResumoMensal {
  id: CompetenciaMensal;
  v: VersaoSchema;
  competencia: CompetenciaMensal;

  entradas: Centavos;
  saidas: Centavos;
  lucro: Centavos;

  qtdPedidos: number;
  qtdItensVendidos: number;
  /**
   * Σ do total dos pedidos pagos no mês.
   *
   * Não é a mesma coisa que `entradas`: a venda de balcão lançada à mão entra
   * em `entradas` e não em `receitaPedidos`. Existe para que `ticketMedio` seja
   * razão de dois incrementos exatos, em vez de um valor que a tela teria de
   * ler antes de gravar (`DECISOES.md#d36`).
   */
  receitaPedidos: Centavos;
  /** receitaPedidos / qtdPedidos. Razão: gravada por valor, refeita na leitura. */
  ticketMedio: Centavos;

  /**
   * O custo total do que foi vendido — mão de obra e rateio inclusos —, e não o
   * que ela gastou comprando insumo, que mora em
   * `porCategoriaSaida.COMPRA_INSUMO`. Na tela se chama "custo do que você
   * vendeu", nunca "custo de insumos" (`DECISOES.md#d36`).
   */
  custoDoVendido: Centavos;
  custoTaxasPagamento: Centavos;

  /** Quebra das saídas por categoria — alimenta o gráfico de despesas. */
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;
  /** Chave = '01'..'31'. Gera o gráfico do mês sem uma única query extra. */
  porDia: Record<string, ResumoDia>;
  /** Chave = fichaTecnicaId. Negócio pequeno: dezenas de chaves, não milhares. */
  produtos: Record<string, ResumoProduto>;

  /**
   * Espelho do progresso da meta, reescrito junto com as entradas.
   *
   * `realizado` é a mesma coisa que `entradas`: é a segunda fonte de verdade do
   * módulo, e existe para o cartão da tela Hoje sair de uma leitura só. Quem
   * escreve é `mutations/transacoes.ts` e `mutations/metas.ts`, sempre por
   * valor e nunca por incremento (`DECISOES.md#d29`); `unidadesPorSemanaRestante`
   * e `noRitmo` também dependem do dia, e por isso são refeitos na leitura por
   * `ritmoDoEspelho` (`#d30`).
   */
  meta?: {
    faturamentoAlvo: Centavos;
    realizado: Centavos;
    progresso: Percentual;
    unidadesRestantes: number;
    /** Recalculado com as semanas que ainda restam no mês. */
    unidadesPorSemanaRestante: number;
    noRitmo: boolean;
  };

  atualizadoEm: Timestamp;
}

/**
 * Documento único de contadores globais: `contas/{contaId}/agregados/global`.
 * Serve para badges e telas iniciais sem `count()` nem varredura.
 */
export interface ResumoGlobal {
  id: "global";
  v: VersaoSchema;
  totalInsumos: number;
  totalFichas: number;
  totalClientes: number;
  pedidosAbertos: number;
  proximaEntrega?: Timestamp;
  ultimoNumeroPedido: number;
  atualizadoEm: Timestamp;
}
