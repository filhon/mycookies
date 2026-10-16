/**
 * A pesquisa do fim do teste (spec 185): o que o Rende mudou, o que faltou, se
 * ela continua, e um depoimento com autorização. Quem responde ganha o preço
 * de fundadora (o desconto é da 187); quem não quer, pula.
 *
 * Puro, e sem import de valor com `@/`: `scripts/beta.mjs` importa este
 * arquivo direto (o Node tira os tipos) para ler o NPS pela mesma regra.
 */

import { z } from "zod";

/** O documento da resposta: uma por conta, `contas/{id}/pesquisas/fim-do-teste`. */
export const ID_DA_PESQUISA = "fim-do-teste";

/** O rascunho no aparelho até o envio dar certo. */
export const CHAVE_DO_RASCUNHO = "rende:pesquisa";

/** A pesquisa abre tantos dias antes do fim do teste, e não fecha. */
export const DIAS_ANTES_DO_FIM = 3;

export const MINIMO_DO_QUE_MUDOU = 20;
export const MAXIMO_DE_TEXTO = 600;
export const MAXIMO_DO_DEPOIMENTO = 280;
export const MAXIMO_DE_TEXTO_CURTO = 80;

/** A frase da oferta, a mesma na faixa, na assinatura e na configuração. */
export const OFERTA_DA_PESQUISA =
  "Responda a pesquisa do beta (2 minutos) e ganhe o preço de fundadora: 30% a menos, para sempre.";

/**
 * O texto que ela marca, com a versão gravada ao lado da frase. Mudou o texto,
 * muda a versão: a frase publicada responde ao que ela leu.
 */
export const AUTORIZACAO_DO_DEPOIMENTO = {
  versao: "2026-10-15",
  texto:
    "Autorizo o Rende a publicar esta frase com o meu nome, o nome do meu negócio e a minha cidade, no site e nas redes do Rende. Posso pedir para tirar quando quiser.",
} as const;

const SEM_O_RENDE = ["muito", "um-pouco", "nao-faria-falta"] as const;
const USOS = [
  "preco",
  "pedidos",
  "cardapio",
  "compras",
  "caixa",
  "mei",
  "bancada",
] as const;
const CONTINUA = ["sim", "nao-sei", "nao"] as const;
const MOTIVOS = [
  "preco",
  "falta-coisa",
  "sem-tempo",
  "outra-coisa",
  "outro",
] as const;
const SIM_OU_NAO = ["sim", "nao"] as const;

type Opcoes<T extends readonly string[]> = readonly {
  valor: T[number];
  rotulo: string;
}[];

/** As perguntas como dado: a tela lê os textos daqui, o script também. */
export const PERGUNTAS_DO_FIM_DO_TESTE = {
  semORende: {
    texto: "Se o Rende sumisse amanhã, como você se sentiria?",
    obrigatoria: true,
    opcoes: [
      { valor: "muito", rotulo: "Muito decepcionada" },
      { valor: "um-pouco", rotulo: "Um pouco decepcionada" },
      { valor: "nao-faria-falta", rotulo: "Não faria falta" },
    ] satisfies Opcoes<typeof SEM_O_RENDE>,
  },
  nota: {
    texto:
      "De 0 a 10, quanto você indicaria o Rende para uma confeiteira amiga?",
    obrigatoria: true,
  },
  maisUsou: {
    texto: "O que você mais usou?",
    obrigatoria: false,
    opcoes: [
      { valor: "preco", rotulo: "Preço dos produtos" },
      { valor: "pedidos", rotulo: "Pedidos e agenda" },
      { valor: "cardapio", rotulo: "Cardápio" },
      { valor: "compras", rotulo: "Compras" },
      { valor: "caixa", rotulo: "O mês e o caixa" },
      { valor: "mei", rotulo: "MEI" },
      { valor: "bancada", rotulo: "Receita na bancada" },
    ] satisfies Opcoes<typeof USOS>,
  },
  oQueMudou: {
    texto: "O que o Rende mudou no seu preço ou na sua rotina nestes 14 dias?",
    obrigatoria: true,
  },
  oQueFaltou: {
    texto: "O que faltou, atrapalhou ou você não achou?",
    obrigatoria: false,
  },
  continua: {
    texto: "Vai continuar com o Rende?",
    obrigatoria: true,
    opcoes: [
      { valor: "sim", rotulo: "Sim, já assinei ou vou assinar" },
      { valor: "nao-sei", rotulo: "Ainda não sei" },
      { valor: "nao", rotulo: "Não" },
    ] satisfies Opcoes<typeof CONTINUA>,
  },
  motivo: {
    texto: "O que pesou mais?",
    obrigatoria: false,
    opcoes: [
      { valor: "preco", rotulo: "O preço" },
      { valor: "falta-coisa", rotulo: "Falta uma coisa que eu preciso" },
      { valor: "sem-tempo", rotulo: "Não tive tempo de usar" },
      { valor: "outra-coisa", rotulo: "Uso outra coisa" },
      { valor: "outro", rotulo: "Outro" },
    ] satisfies Opcoes<typeof MOTIVOS>,
  },
  depoimento: {
    texto:
      "Em uma ou duas frases, o que você diria a uma confeiteira sobre o Rende?",
    obrigatoria: false,
  },
  conversa: {
    texto: "Topa uma conversa de 20 minutos por vídeo ou ligação?",
    obrigatoria: false,
    opcoes: [
      { valor: "sim", rotulo: "Sim" },
      { valor: "nao", rotulo: "Não" },
    ] satisfies Opcoes<typeof SIM_OU_NAO>,
  },
} as const;

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .optional()
    .transform((texto) => texto || undefined);

/**
 * As respostas, como a tela manda e a rota grava. O que depende de outra
 * resposta sai quando a outra não pede: o motivo de quem continua, o nome e a
 * cidade de quem não escreveu a frase, o WhatsApp de quem não topou.
 */
export const esquemaRespostas = z
  .object({
    semORende: z.enum(SEM_O_RENDE),
    nota: z.number().int().min(0).max(10),
    maisUsou: z
      .array(z.enum(USOS))
      .max(USOS.length)
      .default([])
      .transform((usos) => [...new Set(usos)]),
    oQueMudou: z.string().trim().min(MINIMO_DO_QUE_MUDOU).max(MAXIMO_DE_TEXTO),
    oQueFaltou: textoOpcional(MAXIMO_DE_TEXTO),
    continua: z.enum(CONTINUA),
    motivo: z.enum(MOTIVOS).optional(),
    motivoOutro: textoOpcional(MAXIMO_DE_TEXTO_CURTO),
    depoimento: textoOpcional(MAXIMO_DO_DEPOIMENTO),
    cidade: textoOpcional(MAXIMO_DE_TEXTO_CURTO),
    nomeNoDepoimento: textoOpcional(MAXIMO_DE_TEXTO_CURTO),
    autorizaDepoimento: z.boolean().default(false),
    conversa: z.enum(SIM_OU_NAO).optional(),
    whatsapp: textoOpcional(30),
  })
  .transform((r) => {
    const comMotivo = r.continua !== "sim";
    const comDepoimento = !!r.depoimento;
    return {
      semORende: r.semORende,
      nota: r.nota,
      maisUsou: r.maisUsou,
      oQueMudou: r.oQueMudou,
      oQueFaltou: r.oQueFaltou,
      continua: r.continua,
      motivo: comMotivo ? r.motivo : undefined,
      motivoOutro:
        comMotivo && r.motivo === "outro" ? r.motivoOutro : undefined,
      depoimento: r.depoimento,
      cidade: comDepoimento ? r.cidade : undefined,
      nomeNoDepoimento: comDepoimento ? r.nomeNoDepoimento : undefined,
      // Sem frase não há o que autorizar; com ela, a versão do texto lido.
      autorizacaoVersao:
        comDepoimento && r.autorizaDepoimento
          ? AUTORIZACAO_DO_DEPOIMENTO.versao
          : undefined,
      conversa: r.conversa,
      whatsapp: r.conversa === "sim" ? r.whatsapp : undefined,
    };
  });

export type RespostasDaPesquisa = z.output<typeof esquemaRespostas>;

/** `POST /api/pesquisa`. */
export const esquemaEnvioDaPesquisa = z.object({
  contaId: z.string().trim().min(1),
  respostas: esquemaRespostas,
});

export type SituacaoDaPesquisa = "fora" | "aberta";

const MS_POR_DIA = 86_400_000;
/** Brasília não tem horário de verão desde 2019: −03:00 o ano inteiro. */
const FUSO_MS = 3 * 60 * 60 * 1000;
const diaEmBrasilia = (ms: number) => Math.floor((ms - FUSO_MS) / MS_POR_DIA);

/**
 * Quando ela vê a oferta. `"fora"`: não é fundadora, nunca teve teste (as
 * semeadas), encerrou ou já respondeu. `"aberta"`: da meia-noite de Brasília
 * do dia 3 dias antes do fim do teste em diante, sem prazo para fechar. Dia de
 * calendário, como o e-mail do teste acabando (`#d205`): o link das 9h não
 * cai fechado. Recebe a conta do cliente ou a do Admin SDK: as duas
 * `Timestamp` têm `toMillis`.
 */
export function situacaoDaPesquisa(
  conta: {
    beta?: { fundadora?: number };
    trialAte?: { toMillis(): number };
    status?: string;
    pesquisaRespondidaEm?: unknown;
  },
  agoraMs: number,
): SituacaoDaPesquisa {
  if (
    !conta.beta?.fundadora ||
    !conta.trialAte ||
    conta.status === "ENCERRADA" ||
    conta.pesquisaRespondidaEm
  ) {
    return "fora";
  }
  const abreNoDia =
    diaEmBrasilia(conta.trialAte.toMillis()) - DIAS_ANTES_DO_FIM;
  return diaEmBrasilia(agoraMs) >= abreNoDia ? "aberta" : "fora";
}

export interface ResumoDasPesquisas {
  total: number;
  /** De 0 a 100, arredondado. 40 é o corte usual de produto que encaixou. */
  muitoDecepcionada: number;
  /** % de 9 e 10 menos % de 0 a 6, de −100 a 100, arredondado. */
  nps: number;
  continua: Record<(typeof CONTINUA)[number], number>;
  motivos: Partial<Record<(typeof MOTIVOS)[number], number>>;
}

const porcento = (parte: number, total: number) =>
  total ? Math.round((parte / total) * 100) : 0;

/** O resumo do `npm run beta -- pesquisas`. */
export function resumoDasPesquisas(
  respostas: readonly (Pick<
    RespostasDaPesquisa,
    "semORende" | "nota" | "continua"
  > &
    Partial<Pick<RespostasDaPesquisa, "motivo">>)[],
): ResumoDasPesquisas {
  const total = respostas.length;
  const contar = (teste: (r: (typeof respostas)[number]) => boolean) =>
    respostas.filter(teste).length;
  const motivos: ResumoDasPesquisas["motivos"] = {};
  for (const { motivo } of respostas) {
    if (motivo) motivos[motivo] = (motivos[motivo] ?? 0) + 1;
  }
  return {
    total,
    muitoDecepcionada: porcento(
      contar((r) => r.semORende === "muito"),
      total,
    ),
    nps:
      porcento(
        contar((r) => r.nota >= 9),
        total,
      ) -
      porcento(
        contar((r) => r.nota <= 6),
        total,
      ),
    continua: {
      sim: contar((r) => r.continua === "sim"),
      "nao-sei": contar((r) => r.continua === "nao-sei"),
      nao: contar((r) => r.continua === "nao"),
    },
    motivos,
  };
}

export type FalhaDaPesquisa =
  | "sem-acesso" // token ausente, ou quem chama não é a dona
  | "fora-de-forma" // corpo fora do esquema
  | "fora" // a pesquisa não está aberta para esta conta
  | "sem-configuracao" // servidor sem credencial
  | "sem-rede" // `fetch` falhou no aparelho
  | "sem-resposta"; // o resto

export const MENSAGEM_FALHA_DA_PESQUISA: Record<FalhaDaPesquisa, string> = {
  "sem-acesso": "Só a dona da conta responde a pesquisa.",
  "fora-de-forma": "Falta responder alguma pergunta. Confira as marcadas.",
  fora: "A pesquisa não está aberta para esta conta.",
  "sem-configuracao":
    "O servidor não está pronto para a pesquisa. Fale com a gente.",
  "sem-rede": "Precisa de internet para mandar. Suas respostas ficam aqui.",
  "sem-resposta":
    "O servidor demorou demais para responder. Tente de novo em instantes.",
};
