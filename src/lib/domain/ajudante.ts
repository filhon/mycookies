import { z } from "zod";
import type { PapelNaConta } from "@/lib/types";

/**
 * O que a rota de membros, o `AuthProvider` e as telas da ajudante
 * compartilham (spec 030).
 *
 * Puro: nenhuma importação de Firebase ou React.
 */

/** Teto do convite. Não é regra de negócio: é freio de criação de login. */
export const LIMITE_DE_AJUDANTES = 5;

export const esquemaConvite = z.object({
  contaId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});
export type Convite = z.infer<typeof esquemaConvite>;

export type FalhaConvite =
  | "sem-acesso" // token ausente, inválido, ou quem chama não é dona
  | "fora-de-forma" // corpo que não passa no esquema, ou e-mail da própria dona
  | "ja-convidada" // o e-mail já abre esta conta
  | "cheio" // LIMITE_DE_AJUDANTES
  | "sem-configuracao"
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_CONVITE: Record<FalhaConvite, string> = {
  "sem-acesso":
    "Não deu para confirmar quem você é. Saia, entre de novo e tente outra vez.",
  "fora-de-forma":
    "Confira o e-mail. Ele precisa ser o de quem te ajuda, e não o seu.",
  "ja-convidada": "Esse e-mail já entra no seu negócio.",
  cheio: `Seu negócio já tem ${LIMITE_DE_AJUDANTES} pessoas ajudando. Tire o acesso de alguém para convidar outra.`,
  "sem-configuracao":
    "Isso ainda não está configurado neste servidor. Avise quem cuida do Rende.",
  "sem-resposta":
    "O servidor demorou demais para responder. Tente de novo em instantes.",
  "sem-rede": "Convidar precisa de internet. Conecte e tente de novo.",
};

/**
 * O valor da claim para uma conta. `'DONA'` é dona; qualquer outra coisa é
 * ajudante — claim escrita à mão ou de outra versão cai no lado restrito
 * (`DECISOES.md#d153`).
 */
export function papelDaClaim(valor: unknown): PapelNaConta {
  return valor === "DONA" ? "DONA" : "AJUDANTE";
}

/**
 * Rotas que só a dona abre. Lida pela navegação e pelo guarda de rota (sessão B).
 * `/insumos/nota` entrou na B: ler a nota consulta `transacoes` (a guarda de
 * duplicidade) e lança a compra no caixa (`DECISOES.md#d157`).
 */
export const ROTAS_SO_DA_DONA = [
  "/financeiro",
  "/clientes",
  "/comecar",
  "/insumos/nota",
] as const;

/** A rota ou uma filha dela; prefixo solto (`/comecarX`) não é rota. */
export function rotaSoDaDona(caminho: string): boolean {
  return ROTAS_SO_DA_DONA.some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`),
  );
}

const TAMANHO_MAXIMO_APELIDO = 20;

/** `"maynara@exemplo.com"` → `"maynara"`, para a lista não estourar em 360px. */
export function apelidoDoEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  return local.length > TAMANHO_MAXIMO_APELIDO
    ? `${local.slice(0, TAMANHO_MAXIMO_APELIDO - 1)}…`
    : local;
}
