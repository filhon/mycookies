import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  DocumentoBase,
  Percentual,
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

  recorrente: boolean;
  observacoes?: string;
}

export interface Meta extends DocumentoBase {
  competencia: CompetenciaMensal;
  faturamentoAlvo: Centavos;
  lucroAlvo?: Centavos;

  /** Ticket médio usado no forecast (histórico ou definido à mão). */
  ticketMedioReferencia: Centavos;

  // ---- Forecast (derivado, gravado para o card de meta ler direto) ----
  /** ceil(faturamentoAlvo / ticketMedioReferencia) */
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
 * Documento agregado do mês: `users/{uid}/agregados/{'YYYY-MM'}`.
 *
 * É o coração da otimização de leitura. O dashboard inteiro — KPIs, gráfico
 * diário, ranking de produtos e progresso da meta — sai de UM read.
 * Mantido por incremento (`FieldValue.increment`) nas escritas de pedido e
 * transação, o que também funciona offline: a operação entra na fila.
 */
export interface ResumoMensal {
  id: CompetenciaMensal;
  competencia: CompetenciaMensal;

  entradas: Centavos;
  saidas: Centavos;
  lucro: Centavos;

  qtdPedidos: number;
  qtdItensVendidos: number;
  ticketMedio: Centavos;

  custoInsumos: Centavos;
  custoTaxasPagamento: Centavos;

  /** Quebra das saídas por categoria — alimenta o gráfico de despesas. */
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;
  /** Chave = '01'..'31'. Gera o gráfico do mês sem uma única query extra. */
  porDia: Record<string, ResumoDia>;
  /** Chave = fichaTecnicaId. Negócio pequeno: dezenas de chaves, não milhares. */
  produtos: Record<string, ResumoProduto>;

  /** Espelho do progresso da meta, atualizado junto com as entradas. */
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
 * Documento único de contadores globais: `users/{uid}/agregados/global`.
 * Serve para badges e telas iniciais sem `count()` nem varredura.
 */
export interface ResumoGlobal {
  id: "global";
  totalInsumos: number;
  totalFichas: number;
  totalClientes: number;
  pedidosAbertos: number;
  proximaEntrega?: Timestamp;
  ultimoNumeroPedido: number;
  atualizadoEm: Timestamp;
}
