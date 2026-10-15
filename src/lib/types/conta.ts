import type { Timestamp } from "firebase/firestore";
import type { DataISO, VersaoSchema } from "./common";

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
/** O que a assinatura dá. Ver `DECISOES.md#d168` a `#d170`. */
export type Pacote = "ESSENCIAL" | "COMPLETO";

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
   * Que versão do par termos e privacidade ela aceitou (spec 166, `#d380`):
   * `VERSAO_DO_ACEITE` de `domain/textoLegal.ts`. Gravado por `/api/conta` no
   * cadastro e por `/api/conta/termos` no "Entendi", e por mais ninguém.
   * Ausente = `PRIMEIRA_VERSAO` (`#d141`).
   */
  termosVersao?: DataISO;
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
   * Escrito pelo webhook do Stripe (spec 032) a partir do produto da
   * assinatura, e por mais ninguém. Ausente em assinante = `"ESSENCIAL"`;
   * ausente em teste e em conta liberada à mão não significa nada: as duas
   * abrem tudo (`DECISOES.md#d168`).
   */
  pacote?: Pacote;
  /**
   * Quando ela encerrou a conta, e o login que pediu. `encerradaPor` é o
   * único lugar do dado que aponta para um `uid`, e existe para a purga saber
   * qual login apagar depois que a claim já saiu (`DECISOES.md#d148`).
   */
  encerradaEm?: Timestamp;
  encerradaPor?: string;
  /**
   * Por onde ela chegou, gravado pelo cadastro (`/api/conta`, spec 040-B,
   * `DECISOES.md#d191`) e por mais ninguém. `"calculadora"`: havia o rascunho
   * da calculadora pública no aparelho. `"cardapio"`: chegou pelo rodapé
   * "Cardápio feito no Rende" (spec 114, `#d317`). `"convite"`: abriu a conta
   * com um convite de fundadora (spec 181); o rascunho da calculadora ganha
   * dele. Ausente = outro caminho.
   */
  origem?: "calculadora" | "cardapio" | "convite";
  /**
   * A fundadora do beta (spec 181). Gravado pela troca do convite em
   * `/api/conta` e por `npm run beta -- semear`, e por mais ninguém. Ausente =
   * conta que não ocupa vaga: aberta depois do lançamento, ou liberada à mão
   * e ainda não semeada.
   */
  beta?: {
    /** O número da vaga, de 1 ao teto: "fundadora nº 37". */
    fundadora: number;
    /** A cota de convites dela, `CONVITES_POR_FUNDADORA` ao nascer. */
    convites: number;
    /** O `contaId` de quem convidou. Ausente na semeada. */
    convidadaPor?: string;
  };
  /**
   * Meta batida e mês fechado por e-mail (spec 044-B, `DECISOES.md#d207`).
   * Ausente = recebe; escrito pela chave em `/configuracao#avisos`. Não desliga
   * boas-vindas, senha nova nem teste acabando, que são do funcionamento da
   * conta.
   */
  avisosPorEmail?: boolean;
  /**
   * O endereço do cardápio, `/c/{apelido}` (spec 116, `DECISOES.md#d319`). Espelho
   * de `apelidos/{apelido}` para o painel mostrar, escrito por
   * `/api/cardapio/apelido` e por mais ninguém. Ausente = `/c/{contaId}`.
   */
  apelido?: string;
  v: VersaoSchema;
}

/**
 * `apelidos/{apelido}`, na raiz: a única coleção fora de `contas/` (`#d319`).
 * Nenhum cliente lê nem escreve; só o Admin SDK. O id é o apelido. Arquivado =
 * um endereço antigo, que ainda leva à loja e que nenhuma outra conta pega.
 */
export interface ApelidoDoCardapio {
  contaId: string;
  criadoEm: Timestamp;
  arquivado: boolean;
  v: VersaoSchema;
}

/**
 * `plataforma/beta`, a segunda exceção à regra de ouro (spec 181): a fase e as
 * vagas do beta. Só o Admin SDK lê e escreve. Ausente = `BETA` com 100 vagas e
 * nenhuma ocupada (`lerBeta`).
 */
export interface EstadoDoBeta {
  fase: "BETA" | "PUBLICO";
  /** O teto. Muda por `npm run beta -- vagas <n>`, nunca abaixo de `ocupadas`. */
  vagas: number;
  /** Contas de fundadora abertas, por convite ou semeadas. Nunca desce. */
  ocupadas: number;
  /** A última posição dada na lista de espera (spec 182). */
  espera: number;
  /** Pesquisas do fim do teste respondidas (spec 185). */
  pesquisas: number;
  lancadoEm?: Timestamp;
  v: VersaoSchema;
}

/**
 * `contas/{dona}/convites/{codigo}`, um por convite de fundadora (spec 181).
 * Escrito só pelo servidor; a dona lê. Uso único: um convite, uma conta.
 */
export interface Convite {
  /** O id do documento repetido no campo, para a consulta por grupo de coleção. */
  codigo: string;
  /** O nome que ela escreveu, até 40 caracteres (spec 183). */
  paraQuem?: string;
  status: "ABERTO" | "USADO" | "CANCELADO";
  criadoEm: Timestamp;
  usadoEm?: Timestamp;
  /** O `contaId` da convidada. */
  usadoPor?: string;
  /** A `proprietaria` da conta que nasceu. */
  nomeDaConvidada?: string;
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
 * Um aparelho que toca quando chega pedido pelo cardápio (spec 119, `#d323`).
 * O id é o SHA-256 do token, em hex: ativar de novo regrava o mesmo documento.
 * Desligar, ou o FCM recusar o token, é `ativo: false`; nunca se apaga.
 */
export interface AparelhoDeAviso {
  id: string;
  /** Quem ativou. */
  uid: string;
  /** Credencial de envio: não sai na exportação. */
  token: string;
  ativo: boolean;
  plataforma: "android" | "iphone" | "computador";
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
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
