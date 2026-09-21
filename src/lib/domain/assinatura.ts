import { z } from "zod";
import type { Centavos } from "@/lib/types";

/**
 * O que a regra, o webhook, a tela e a linha da Hoje compartilham sobre o
 * relógio da assinatura (spec 028).
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

export type Situacao =
  | { tipo: "livre" } // sem `plano`: liberada à mão, sem prazo (`#d141`)
  | { tipo: "teste"; diasRestantes: number; acabaEmMs: number }
  | { tipo: "assinante"; renovaEmMs: number }
  | { tipo: "vencida"; foi: "teste" | "assinatura" };

/** O que a tela precisa da conta, sem `Timestamp`: quem chama converte com `toMillis()`. */
export interface ContaParaSituar {
  plano?: "TRIAL" | "ASSINATURA";
  trialAteMs?: number;
  assinaturaAteMs?: number;
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
    return { tipo: "assinante", renovaEmMs: conta.assinaturaAteMs };
  }

  if (conta.trialAteMs == null) return { tipo: "livre" };
  if (agoraMs > conta.trialAteMs) return { tipo: "vencida", foi: "teste" };
  return {
    tipo: "teste",
    diasRestantes: diasRestantes(conta.trialAteMs, agoraMs),
    acabaEmMs: conta.trialAteMs,
  };
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

export const esquemaCheckout = z.object({
  contaId: z.string().min(1),
  periodo: z.enum(["mensal", "anual"]),
});

export type FalhaAssinatura =
  | "sem-acesso" // token ausente ou inválido
  | "fora-de-forma" // corpo que não passa em `esquemaCheckout`, ou conta que o token não abre
  | "sem-configuracao" // servidor sem chave do Stripe ou sem os dois preços
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
