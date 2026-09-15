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

/** O que foi escolhido para um item de combo (`DECISOES.md#d100`). */
export interface EscolhaFeita {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  /** Por unidade do kit: num pedido de 3 combos, "1" aqui são 3 cookies. */
  quantidade: number;
  /** O `custoUnitario` da receita escolhida, congelado na hora (`#d08`). */
  custoUnitarioSnapshot: Centavos;
}

export interface ItemPedido {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  quantidade: number;
  /** Preço congelado no momento do pedido. */
  precoUnitario: Centavos;
  /**
   * Custo congelado no momento do pedido. Sem este snapshot, reajustar o preço
   * do chocolate reescreveria o lucro de todos os pedidos já entregues.
   *
   * Numa linha de combo (`escolhas` presente) é o custo do **combo montado**:
   * a base do kit mais as escolhas, congelado quando ela fechou a escolha
   * (`DECISOES.md#d100`). Para o resto do sistema é o mesmo campo.
   */
  custoUnitarioSnapshot: Centavos;
  subtotal: Centavos;
  observacao?: string;
  /** O que foi escolhido para ESTE item, por unidade do kit (`#d100`). */
  escolhas?: EscolhaFeita[];
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
  /**
   * 'YYYY-MM' da dataEntrega — a chave da **agenda**: o mês em que se entrega.
   *
   * Não é a chave do painel financeiro. O painel é regime de caixa, e lá o
   * pedido entra na competência do **pagamento**, que é `competenciaPagamento`
   * (`DECISOES.md#d36`).
   */
  competencia: CompetenciaMensal;

  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    taxa: Centavos;
    endereco?: string;
    /**
     * Quando esta entrega foi acertada com o entregador. Ausente enquanto não
     * foi paga, que é o estado normal (`DECISOES.md#d84`).
     *
     * O que ela cobrou é o que ela paga: `taxa` é o valor do repasse, e não uma
     * referência dele (`#d82`).
     */
    repassadoEm?: Timestamp;
    /** A saída do caixa que pagou esta entrega, junto de outras. */
    repasseTransacaoId?: string;
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
  /**
   * 'YYYY-MM' de `pagoEm`, e **ausente enquanto o pedido não foi pago**.
   *
   * É a chave de agregação do painel financeiro, e é gravada em vez de deduzida
   * pelo mesmo motivo de `Transacao.competencia`: sem ela não existe a consulta
   * "os pedidos pagos deste mês", e sem essa consulta "Recalcular o mês" não
   * consegue refazer a metade do agregado que nasce de pedido.
   */
  competenciaPagamento?: CompetenciaMensal;
  /** Vínculo com a entrada no fluxo de caixa, criada quando o pedido é pago. */
  transacaoId?: string;

  /**
   * Até quando o preço deste orçamento vale, no fuso do aparelho. Gravado
   * porque é combinado, como a data de entrega; ausente em pedido feito antes
   * da spec 017 ou que nunca foi orçamento (`DECISOES.md#d110`).
   */
  validoAteISO?: DataISO;

  observacoes?: string;
}

export interface ItemListaCompras {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  /** Soma da demanda de todos os pedidos do período, em unidade base. */
  quantidadeNecessaria: number;
  /**
   * A parte de `quantidadeNecessaria` que é reserva de fornadas, e não pedido
   * (`DECISOES.md#d96`). Ausente em lista gravada antes da sessão 13C.
   */
  quantidadeDeReserva?: number;
  unidadeBase: UnidadeBase;
  estoqueAtual: number;
  /**
   * O que já foi assado para os pedidos desta lista, em quantidade física.
   * Ausente em lista gravada antes da spec 013 (`DECISOES.md#d91`).
   */
  quantidadeJaProduzida?: number;
  /** O que saiu para o forno desde a contagem deste insumo (`#d87`). */
  consumoDeFornadas?: number;
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
