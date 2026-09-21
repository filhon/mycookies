import type { Timestamp } from "firebase/firestore";
import type { VersaoSchema } from "./common";

/**
 * O dono do dado é o negócio, não o login.
 *
 * `uid` diz quem entrou; `contaId` diz de quem é o dado. Enquanto os dois forem
 * a mesma coisa, nada muda na prática — a diferença aparece no dia em que
 * houver uma ajudante, um contador com acesso de leitura, ou uma pessoa com
 * dois negócios.
 */

/** A 029 acrescenta o encerramento em `StatusDaConta`. */
export type PlanoDaConta = "TRIAL" | "ASSINATURA";
export type StatusDaConta = "ATIVA";

export interface Conta {
  id: string;
  /** Nome do negócio. Ex.: "MyCookie's". */
  nome: string;
  /** Quem toca o negócio. Alimenta a saudação da tela Hoje. */
  proprietaria: string;
  criadaEm: Timestamp;
  /**
   * Quando ela encerrou o caminho dos primeiros passos — concluindo os cinco ou
   * dizendo que não precisa dele. Ausente enquanto o caminho corre.
   *
   * Mora aqui, e não em `localStorage`, porque ela usa o celular na bancada e o
   * computador à noite: um caminho concluído em um aparelho precisa estar
   * concluído no outro. E é gravado, e não derivado dos cinco fatos, porque um
   * caminho que se recalcula é um caminho que volta — arquivar o último insumo
   * em janeiro faria o cartão reaparecer ensinando o que ela faz há meses
   * (`DECISOES.md#d68`).
   */
  primeirosPassosEm?: Timestamp;
  /**
   * Os quatro são gravados pelo cadastro (`/api/conta`, spec 027) e **ausentes
   * numa conta liberada à mão** pelo script — que não tem prazo nem cobrança.
   * Ausência é significado, não dado velho (`DECISOES.md#d141`).
   */
  plano?: PlanoDaConta;
  status?: StatusDaConta;
  /** Fim do teste grátis. Ausente = não vence. */
  trialAte?: Timestamp;
  termosAceitosEm?: Timestamp;
  /**
   * Escritos pelo webhook do Stripe (`/api/stripe/webhook`, spec 028) e por
   * mais ninguém. `assinaturaAte` é o espelho de `acessoAte[contaId]` na
   * claim: a claim é para a regra, o campo é para a tela (`DECISOES.md#d145`).
   * Ausentes até a primeira assinatura.
   */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Até quando a assinatura deixa escrever: fim do período mais a folga. */
  assinaturaAte?: Timestamp;
  v: VersaoSchema;
}

/**
 * Vínculo login → conta, como vem na custom claim do token:
 * `{ contas: { 'mycookies': 'DONA' } }`.
 *
 * O papel é string livre por ora, com `'DONA'` como único valor emitido. O que
 * importa é a forma do mapa; vocabulário de papéis inventado antes de existir
 * um segundo tipo de acesso é regra escrita para caso que não existe.
 */
export type ContasDaClaim = Record<string, string>;

/**
 * A forma da claim inteira, para quem a escreve: `/api/conta`, o webhook do
 * Stripe e `scripts/conceder-acesso.mjs`.
 */
export interface ClaimDaConta {
  contas: ContasDaClaim;
  /** Milissegundos de época, por conta. Sem a chave, sem prazo (`DECISOES.md#d144`). */
  acessoAte?: Record<string, number>;
}
