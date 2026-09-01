import type { Timestamp } from "firebase/firestore";
import type { VersaoSchema } from "./common";

/**
 * O dono do dado é o negócio, não o login.
 *
 * `uid` diz quem entrou; `contaId` diz de quem é o dado. Enquanto os dois forem
 * a mesma coisa, nada muda na prática — a diferença aparece no dia em que
 * houver uma ajudante, um contador com acesso de leitura, ou uma pessoa com
 * dois negócios.
 *
 * O documento é propositalmente magro: `plano`, `status` e `trialAte` entram
 * quando existir cobrança. O valor dele hoje é ser o gancho onde esses campos
 * cabem sem tocar em mais nada.
 */
export interface Conta {
  id: string;
  /** Nome do negócio. Ex.: "MyCookie's". */
  nome: string;
  /** Quem toca o negócio. Alimenta a saudação da tela Hoje. */
  proprietaria: string;
  criadaEm: Timestamp;
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
