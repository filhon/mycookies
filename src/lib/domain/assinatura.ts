import { z } from "zod";
import type { Centavos, Pacote, ResumoProduto } from "@/lib/types";
import { LIMITE_DE_AJUDANTES } from "./ajudante";

/**
 * O que a regra, o webhook, a tela e a linha da Hoje compartilham sobre o
 * relógio da assinatura (spec 028), e o que cada pacote abre (spec 032).
 *
 * Puro: nenhuma importação de Firebase, React ou `stripe`. O prazo em si mora
 * na claim `acessoAte` (`DECISOES.md#d144`); este módulo só decide os números
 * que entram e saem dela.
 */

/** Dias além do fim do período antes de a regra recusar: o cartão renova com atraso de horas. */
export const FOLGA_RENOVACAO_DIAS = 3;
/** Dias que uma cobrança recusada tem para ser acertada antes de a escrita parar. */
export const FOLGA_COBRANCA_DIAS = 7;
/** A partir de quantos dias a linha da Hoje ganha o ícone de atenção. */
export const DIAS_DE_ATENCAO = 3;

const DIA_MS = 24 * 60 * 60 * 1000;

export type Periodo = "mensal" | "anual";

export type Recurso = "cardapio" | "ajudante";

/** O que cada pacote abre. O teste e a conta livre abrem tudo (`#d168`). */
export const RECURSOS_DO_PACOTE: Record<Pacote, readonly Recurso[]> = {
  ESSENCIAL: [],
  COMPLETO: ["cardapio", "ajudante"],
};

export const NOME_DO_PACOTE: Record<Pacote, string> = {
  ESSENCIAL: "Essencial",
  COMPLETO: "Completo",
};

/**
 * Uma linha por pacote, para o cartão de `/assinatura` e o de `/conheca`: o que
 * ele dá, em texto, e nunca o que falta (spec 039). A ajudante não escolhe o
 * que vê: a régua é fixa (`#d157`), e a frase diz a régua.
 */
export const O_QUE_O_PACOTE_TEM: Record<Pacote, string> = {
  ESSENCIAL:
    "O preço de cada doce e o aviso quando um custo sobe, as encomendas com a lista do mercado, e o caixa do mês com a sua meta.",
  COMPLETO: `Tudo do Essencial, mais o cardápio com link pra cliente pedir sozinha e até ${LIMITE_DE_AJUDANTES} ajudantes, que produzem e entregam com você sem ver o seu caixa.`,
};

export type Situacao =
  | { tipo: "livre" } // sem `plano`: liberada à mão, sem prazo (`#d141`)
  | { tipo: "teste"; diasRestantes: number; acabaEmMs: number }
  | { tipo: "assinante"; renovaEmMs: number; pacote: Pacote }
  | { tipo: "vencida"; foi: "teste" | "assinatura" };

/** O que a tela precisa da conta, sem `Timestamp`: quem chama converte com `toMillis()`. */
export interface ContaParaSituar {
  plano?: "TRIAL" | "ASSINATURA";
  trialAteMs?: number;
  assinaturaAteMs?: number;
  /** Ausente em assinante = `"ESSENCIAL"` (`#d169`). */
  pacote?: Pacote;
}

/** Só o que `paraSituar` chama num `Timestamp`: o domínio não o importa. */
interface ComMillis {
  toMillis(): number;
}

/** `Conta` → `ContaParaSituar`, para quem nasceu na 032 (os lugares da 028 montam à mão). */
export function paraSituar(conta: {
  plano?: "TRIAL" | "ASSINATURA";
  trialAte?: ComMillis;
  assinaturaAte?: ComMillis;
  pacote?: Pacote;
}): ContaParaSituar {
  return {
    plano: conta.plano,
    trialAteMs: conta.trialAte?.toMillis(),
    assinaturaAteMs: conta.assinaturaAte?.toMillis(),
    pacote: conta.pacote,
  };
}

/** Arredonda para cima: às 23h do último dia ainda é "acaba hoje", não "acabou". */
export function diasRestantes(ateMs: number, agoraMs: number): number {
  return Math.max(0, Math.ceil((ateMs - agoraMs) / DIA_MS));
}

export function situacaoDaConta(
  conta: ContaParaSituar,
  agoraMs: number,
): Situacao {
  if (!conta.plano) return { tipo: "livre" };

  if (conta.plano === "ASSINATURA") {
    if (conta.assinaturaAteMs == null) return { tipo: "livre" };
    if (agoraMs > conta.assinaturaAteMs) {
      return { tipo: "vencida", foi: "assinatura" };
    }
    return {
      tipo: "assinante",
      renovaEmMs: conta.assinaturaAteMs,
      pacote: conta.pacote ?? "ESSENCIAL",
    };
  }

  if (conta.trialAteMs == null) return { tipo: "livre" };
  if (agoraMs > conta.trialAteMs) return { tipo: "vencida", foi: "teste" };
  return {
    tipo: "teste",
    diasRestantes: diasRestantes(conta.trialAteMs, agoraMs),
    acabaEmMs: conta.trialAteMs,
  };
}

/**
 * O portão dos dois upsells (`#d167`): `livre` e `teste` abrem tudo (`#d168`),
 * `vencida` não abre nada, `assinante` abre o que o pacote dela tem.
 */
export function permite(situacao: Situacao, recurso: Recurso): boolean {
  switch (situacao.tipo) {
    case "livre":
    case "teste":
      return true;
    case "vencida":
      return false;
    case "assinante":
      return RECURSOS_DO_PACOTE[situacao.pacote].includes(recurso);
  }
}

/** `"COMPLETO"` só quando a metadata diz isso; qualquer outra coisa é essencial (`#d169`). */
export function pacoteDaMetadata(valor: string | undefined): Pacote {
  return valor === "COMPLETO" ? "COMPLETO" : "ESSENCIAL";
}

/** "Seu teste grátis acaba hoje" · "acaba amanhã" · "acaba em N dias". */
export function fraseDoTeste(dias: number): string {
  if (dias <= 0) return "Seu teste grátis acaba hoje";
  if (dias === 1) return "Seu teste grátis acaba amanhã";
  return `Seu teste grátis acaba em ${dias} dias`;
}

/**
 * O número que vai para a claim, a partir do que o Stripe diz da assinatura.
 * `active` e `trialing`: fim do período + folga. `past_due`: início do período
 * + folga de cobrança (o período novo começou sem pagar; uma semana para
 * acertar o cartão). Qualquer outro (`canceled`, `unpaid`, `incomplete`,
 * `incomplete_expired`, `paused`): agora. **Nunca menor que `trialAteMs`**: um
 * checkout que nasce `incomplete` não pode encurtar o teste que ela ainda tem.
 */
export function acessoAteDaAssinatura(entrada: {
  status: string;
  periodoInicioMs: number;
  periodoFimMs: number;
  trialAteMs?: number;
  agoraMs: number;
}): number {
  const { status, periodoInicioMs, periodoFimMs, trialAteMs, agoraMs } =
    entrada;

  let base: number;
  if (status === "active" || status === "trialing") {
    base = periodoFimMs + FOLGA_RENOVACAO_DIAS * DIA_MS;
  } else if (status === "past_due") {
    base = periodoInicioMs + FOLGA_COBRANCA_DIAS * DIA_MS;
  } else {
    base = agoraMs;
  }

  return trialAteMs != null ? Math.max(base, trialAteMs) : base;
}

/** `mensal × 12 − anual`, em centavos. Zero ou negativo quando o anual não compensa. */
export function economiaAnual(mensal: Centavos, anual: Centavos): Centavos {
  return mensal * 12 - anual;
}

/**
 * Quantas unidades a este preço pagam o valor (`DECISOES.md#d182`). Para cima:
 * 4,6 cookies são 5. Preço zero ou negativo devolve 0, e a linha não aparece.
 */
export function unidadesQuePagam(
  valor: Centavos,
  precoUnidade: Centavos,
): number {
  return precoUnidade > 0 ? Math.ceil(valor / precoUnidade) : 0;
}

/**
 * O plano pago com o que sobra do produto que ela mais vendeu no mês
 * (`DECISOES.md#d219`): o `#d182` com o produto dela, e com sobra em vez de
 * preço. Mais vendido é a maior `quantidade`; no empate, a maior receita.
 * Sem produto vendido ou com sobra que não paga nada, `null`: a linha some.
 */
export function sobraQuePagaOPlano(
  produtos: Record<string, ResumoProduto>,
  mensal: Centavos,
): { nome: string; unidades: number } | null {
  const maisVendido = Object.values(produtos)
    .filter((produto) => produto.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade || b.receita - a.receita)[0];
  if (!maisVendido) return null;

  const unidades = unidadesQuePagam(
    mensal,
    Math.round(maisVendido.lucro / maisVendido.quantidade),
  );
  return unidades > 0 ? { nome: maisVendido.nome, unidades } : null;
}

export const esquemaCheckout = z.object({
  contaId: z.string().min(1),
  pacote: z.enum(["ESSENCIAL", "COMPLETO"]),
  periodo: z.enum(["mensal", "anual"]),
});

export type FalhaAssinatura =
  | "sem-acesso" // token ausente ou inválido
  | "fora-de-forma" // corpo que não passa em `esquemaCheckout`, ou conta que o token não abre
  | "sem-configuracao" // servidor sem chave do Stripe ou sem os quatro preços
  | "sem-assinatura" // portal pedido por conta que nunca assinou
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_ASSINATURA: Record<FalhaAssinatura, string> = {
  "sem-acesso":
    "Não deu para confirmar quem você é. Saia, entre de novo e tente outra vez.",
  "fora-de-forma": "Não foi possível abrir isso. Tente de novo.",
  "sem-configuracao":
    "A assinatura ainda não está configurada neste servidor. Avise quem cuida do Rende.",
  "sem-assinatura": "Esta conta ainda não tem assinatura para gerenciar.",
  "sem-resposta":
    "O servidor demorou demais para responder. Tente de novo em instantes.",
  "sem-rede": "Isso precisa de internet. Conecte e tente de novo.",
};
