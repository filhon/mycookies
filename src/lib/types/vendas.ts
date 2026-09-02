import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  DocumentoBase,
  UnidadeBase,
  UnidadeCompra,
} from "./common";
import type { CategoriaInsumo } from "./insumos";

export interface Cliente extends DocumentoBase {
  nome: string;
  nomeBusca: string;
  telefone?: string;
  instagram?: string;
  endereco?: string;
  observacoes?: string;

  // Agregados denormalizados: a lista de clientes mostra ticket médio e
  // total gasto sem varrer a coleção de pedidos.
  totalPedidos: number;
  totalGasto: Centavos;
  ticketMedio: Centavos;
  ultimoPedidoEm?: Timestamp;
}

export type StatusPedido =
  | "ORCAMENTO"
  | "CONFIRMADO"
  | "EM_PRODUCAO"
  | "PRONTO"
  | "ENTREGUE"
  | "CANCELADO";

export interface ItemPedido {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  quantidade: number;
  /** Preço congelado no momento do pedido. */
  precoUnitario: Centavos;
  /**
   * Custo congelado no momento do pedido. Sem este snapshot, reajustar o preço
   * do chocolate reescreveria o lucro de todos os pedidos já entregues.
   */
  custoUnitarioSnapshot: Centavos;
  subtotal: Centavos;
  observacao?: string;
}

export interface Pedido extends DocumentoBase {
  /**
   * Código curto gerado no cliente (ex.: 'P-260901-K3F').
   * É offline-safe: transação do Firestore não roda sem rede, então não dá
   * para sortear um número sequencial no ato do pedido.
   */
  codigo: string;
  /**
   * Sequencial humano. **Nunca gravado**, e de propósito: contar em um lugar só
   * exige `runTransaction`, transação exige rede, e um pedido anotado na feira
   * sem sinal não pode esperar um número. Quem identifica o pedido é `codigo`.
   * O campo fica para o dia em que houver servidor (`DECISOES.md#d31`).
   */
  numero?: number;

  clienteId?: string;
  /** Snapshot: pedido de cliente avulso não precisa de cadastro. */
  clienteNome: string;
  clienteTelefone?: string;

  itens: ItemPedido[];
  /** Espelho de itens[].fichaTecnicaId, para array-contains. */
  fichaIds: string[];

  status: StatusPedido;
  dataEntrega: Timestamp;
  /** Redundante com dataEntrega, mas permite filtrar a agenda sem range query. */
  dataEntregaISO: DataISO;
  /** 'YYYY-MM' da dataEntrega — chave de agregação do dashboard. */
  competencia: CompetenciaMensal;

  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    taxa: Centavos;
    endereco?: string;
  };

  subtotal: Centavos;
  desconto: Centavos;
  total: Centavos;

  formaPagamentoId?: string;
  /** Taxa da maquininha em centavos, já calculada sobre o total. */
  custoTaxaPagamento: Centavos;

  // Resultado financeiro do pedido, pronto para o dashboard.
  custoTotalEstimado: Centavos;
  lucroEstimado: Centavos;

  pago: boolean;
  pagoEm?: Timestamp;
  /** Vínculo com a entrada no fluxo de caixa, criada quando o pedido é pago. */
  transacaoId?: string;

  observacoes?: string;
}

export interface ItemListaCompras {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  /** Soma da demanda de todos os pedidos do período, em unidade base. */
  quantidadeNecessaria: number;
  unidadeBase: UnidadeBase;
  estoqueAtual: number;
  /** max(0, necessária − estoque), já com a perda percentual aplicada. */
  quantidadeComprar: number;
  /** Traduzido de volta para o mundo real: "comprar 3 pacotes de 1 kg". */
  unidadeCompra: UnidadeCompra;
  quantidadePacotes: number;
  custoEstimado: Centavos;
  comprado: boolean;
}

export interface ListaCompras extends DocumentoBase {
  nome: string;
  periodoInicio: DataISO;
  periodoFim: DataISO;
  /** Pedidos que originaram esta lista — permite regerar e auditar. */
  pedidoIds: string[];
  itens: ItemListaCompras[];
  custoEstimado: Centavos;
  status: "ABERTA" | "PARCIAL" | "COMPRADA";
}
