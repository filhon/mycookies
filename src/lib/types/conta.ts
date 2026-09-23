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

export type PlanoDaConta = "TRIAL" | "ASSINATURA";
/** `"ENCERRADA"` é escrita por `/api/conta/encerrar` (spec 029) e lida pelo `AuthProvider` e pela purga. */
export type StatusDaConta = "ATIVA" | "ENCERRADA";

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
  /**
   * Quando ela encerrou a conta, e o login que pediu. `encerradaPor` é o
   * único lugar do dado que aponta para um `uid`, e existe para a purga saber
   * qual login apagar depois que a claim já saiu (`DECISOES.md#d148`).
   */
  encerradaEm?: Timestamp;
  encerradaPor?: string;
  v: VersaoSchema;
}

/**
 * Dois papéis, e só. Ver `DECISOES.md#d153`. Valor desconhecido na claim é
 * tratado como `"AJUDANTE"` pela tela e pela regra: errar para menos acesso.
 */
export type PapelNaConta = "DONA" | "AJUDANTE";

/**
 * Vínculo login → conta, como vem na custom claim do token:
 * `{ contas: { 'mycookies': 'DONA' } }`.
 */
export type ContasDaClaim = Record<string, PapelNaConta>;

/**
 * `contas/{contaId}/membros/{uid}`, uma por ajudante convidada. Espelho escrito
 * só por `/api/conta/membros` (Admin SDK): a claim é a verdade, e este documento
 * existe para a tela listar e para o webhook e o encerrar percorrerem
 * (`DECISOES.md#d155`). A dona não tem documento aqui.
 */
export interface Membro {
  /** O `uid` é o id do documento. */
  id: string;
  /** O e-mail é o que a tela mostra. */
  email: string;
  papel: PapelNaConta;
  convidadaEm: Timestamp;
  /** O `uid` da dona que convidou. */
  convidadaPor: string;
  /** Presente = acesso tirado. O documento fica; a claim é que some. */
  removidaEm?: Timestamp;
  v: VersaoSchema;
}

/**
 * A forma da claim inteira, para quem a escreve: `/api/conta`, o webhook do
 * Stripe e `scripts/conceder-acesso.mjs`.
 */
export interface ClaimDaConta {
  contas: ContasDaClaim;
  /** Milissegundos de época, por conta. Sem a chave, sem prazo (`DECISOES.md#d144`). */
  acessoAte?: Record<string, number>;
}
