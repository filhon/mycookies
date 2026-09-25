import type { Timestamp } from "firebase/firestore";
import type { Centavos, DataISO, Percentual, VersaoSchema } from "./common";

/** Método de precificação escolhido na ficha técnica. */
export type MetodoPrecificacao = "MARKUP" | "MARGEM";

/** Como o preço sugerido é arredondado para virar preço de vitrine. */
export type RegraArredondamento =
  "NENHUM" | "CENTAVO_90" | "REAL_INTEIRO" | "MEIO_REAL";

export type TipoPagamento =
  | "PIX"
  | "DINHEIRO"
  | "DEBITO"
  | "CREDITO"
  | "CREDITO_PARCELADO"
  | "TRANSFERENCIA";

export interface FormaPagamento {
  id: string;
  nome: string;
  tipo: TipoPagamento;
  /** Taxa da maquininha/gateway. Ex.: 4.99 para crédito. */
  taxaPercentual: Percentual;
  /** Taxa fixa por transação, quando houver. */
  taxaFixa: Centavos;
  prazoRecebimentoDias: number;
  ativo: boolean;
  /**
   * O que a cliente precisa para pagar por esta forma (chave Pix, banco,
   * beneficiário). Vai no resumo do WhatsApp enquanto o pedido não está pago.
   * Ausente quando não há o que dizer — dinheiro, cartão na entrega.
   */
  instrucoes?: string;
}

/**
 * Custos invisíveis. Tudo que não é insumo mas sai do bolso.
 * Alimentam o rateio de cada ficha técnica.
 */
export interface CustosOperacionais {
  /** Quanto vale 1 hora do trabalho da Maynara. */
  valorHoraTrabalho: Centavos;
  /** Horas que ela realmente produz por mês — base do rateio de despesa fixa. */
  horasProdutivasMes: number;
  custoEnergiaHora: Centavos;
  custoGasHora: Centavos;
  /** Aluguel, internet, contador, assinaturas. */
  despesasFixasMensais: Centavos;
  /** Derivado: despesasFixasMensais / horasProdutivasMes. Gravado para uso direto. */
  custoIndiretoPorHora: Centavos;
}

export interface PrecificacaoPadrao {
  metodoPadrao: MetodoPrecificacao;
  /** Multiplicador sobre o custo total. Ex.: 2.5. */
  markupPadrao: number;
  /** Margem de lucro líquida desejada. Ex.: 35 (%). */
  margemPadrao: Percentual;
  /** Impostos/comissões que incidem sobre o preço (Simples, marketplace). */
  outrasTaxasPadrao: Percentual;
  arredondamento: RegraArredondamento;
}

/**
 * TODA a configuração do app em UM documento:
 * `contas/{contaId}/configuracao/geral`.
 * O app inteiro sobe com 1 read, e ele fica no cache offline para sempre.
 */
export interface ConfiguracaoGeral {
  id: "geral";
  v: VersaoSchema;
  nomeNegocio: string;
  operacional: CustosOperacionais;
  precificacao: PrecificacaoPadrao;
  formasPagamento: FormaPagamento[];
  /** Categorias de produto criadas pela usuária (Cookie, Brownie, Kit...). */
  categoriasProduto: string[];
  /** O que a empresa vê no rodapé da folha (spec 017). Nada disso é obrigatório. */
  contato?: { telefone?: string; instagram?: string };
  /** Uma frase sua, para o rodapé do orçamento (spec 033, `DECISOES.md#d127`). */
  frase?: string;
  /** Tira a linha "feito com Rende" da folha (spec 028, `DECISOES.md#d147`). Só `true`. */
  ocultarFeitoCom?: true;
  /**
   * A assinatura dela, PNG com fundo transparente ou foto da assinatura em papel,
   * até 720 px de lado e 200 KB, como `data:` URL (`DECISOES.md#d109`). Vai
   * sobre a linha da folha; sem ela, o nome sobre a linha é a assinatura.
   */
  assinaturaDataUrl?: string;
  /**
   * O cardápio público (spec 031, `DECISOES.md#d159`). Ausente = fechado, que é
   * como toda conta nasce. `fichaIds` na ordem em que ela marcou; a página
   * ordena por categoria e nome. Escrito só por `salvarCardapio`.
   *
   * `limitados` (sessão D, `#d164`): as de `fichaIds` que mostram quantas
   * restam no pote e param de receber pedido quando acabam. Ausente = nenhuma.
   *
   * `promocoes` (sessão E, `#d165`): uma por ficha, contra o preço de sempre.
   */
  cardapio?: {
    aberto: boolean;
    fichaIds: string[];
    limitados?: string[];
    promocoes?: PromocaoDoCardapio[];
  };
  atualizadoEm: Timestamp;
}

/**
 * O que a tela de configuração entrega. `custoIndiretoPorHora` fica de fora de
 * propósito: é derivado, e derivado é calculado na escrita, nunca digitado
 * (`DECISOES.md#d04`). Mora aqui desde a 040, com o resto do schema: a
 * configuração sugerida, que tem esta forma, saiu para o domínio.
 */
export interface DadosConfiguracao {
  /**
   * Espelho de `contas/{contaId}.nome`, que é onde o nome do negócio de fato
   * mora desde D14. Ausente quando a tela ainda não sabe o valor: espelho que
   * não conhece o original não escreve por cima dele.
   */
  nomeNegocio?: string;
  operacional: Omit<CustosOperacionais, "custoIndiretoPorHora">;
  precificacao: PrecificacaoPadrao;
  formasPagamento: FormaPagamento[];
  categoriasProduto: string[];
  /** O rodapé e a assinatura da folha do orçamento (spec 017). */
  contato?: ConfiguracaoGeral["contato"];
  assinaturaDataUrl?: string;
  /** A frase dela no rodapé (`#d127`). */
  frase?: string;
  /** Tira o "feito com Rende" da folha (spec 028, `#d147`). */
  ocultarFeitoCom?: true;
}

/**
 * A cara da loja no cardápio público (spec 031, sessão F, `DECISOES.md#d166`):
 * `contas/{contaId}/configuracao/vitrine`. Documento à parte de `geral` porque
 * as imagens pesam, e `geral` sobe com o app inteiro. Só a página pública e o
 * painel "Seu cardápio" o leem.
 */
export interface VitrineDoCardapio {
  id: "vitrine";
  v: VersaoSchema;
  /** A foto larga do topo, `data:` URL (JPEG até `CAPA_LADO_PX`). */
  capa?: string;
  /** O logo, `data:` URL, quadrado na página (recortado em círculo). */
  logo?: string;
  /** A cor da loja, `#rrggbb`. Ausente = a tinta do Rende. */
  cor?: string;
  atualizadoEm: Timestamp;
}

/** Uma promoção do cardápio (spec 031, sessão E, `DECISOES.md#d165`). */
export interface PromocaoDoCardapio {
  fichaId: string;
  /** O preço na promoção. Vale só se `0 < preco < precoVenda` na hora de ler. */
  preco: Centavos;
  /** O último dia, inclusive, pelo dia de Brasília. Até 30 dias depois de criada. */
  ateISO: DataISO;
}
