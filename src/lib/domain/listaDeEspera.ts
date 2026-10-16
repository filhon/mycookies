import { z } from "zod";
import { hojeEmBrasilia } from "@/lib/domain/datas";
import type { DataISO, OrigemDaEspera } from "@/lib/types";

/**
 * A lista de espera do beta (spec 182): quem chega sem convite deixa nome e
 * e-mail. O formulário, a rota e o script leem as mesmas regras daqui.
 *
 * Puro: o hash usa `crypto.subtle`, que o Node e o navegador têm.
 */

export const TAMANHO_MAXIMO_NOME_DA_ESPERA = 80;
export const TAMANHO_MAXIMO_INSTAGRAM = 40;

/** Onde o aparelho guarda que ela já entrou (`{ posicao }`), para o formulário não voltar. */
export const CHAVE_DA_ESPERA = "rende:espera";

const ORIGENS = [
  "conheca",
  "artigo",
  "cardapio",
  "cadastro",
  "convite",
] as const satisfies readonly OrigemDaEspera[];

/** "  Maria@Gmail.COM " → "maria@gmail.com": um e-mail, uma entrada. */
export function normalizarEmail(email: string): string {
  return email.replace(/\s/g, "").toLowerCase();
}

/** "@doces.da.carla " → "doces.da.carla"; vazio vira ausente. */
function normalizarInstagram(texto: string): string | undefined {
  return texto.replace(/\s/g, "").replace(/^@+/, "") || undefined;
}

/**
 * O corpo de `POST /api/lista-de-espera`. `site` é a isca: o campo escondido
 * que só robô preenche (`caiuNaIsca`).
 */
export const esquemaListaDeEspera = z.object({
  nome: z.string().trim().min(1).max(TAMANHO_MAXIMO_NOME_DA_ESPERA),
  email: z.string().max(254).transform(normalizarEmail).pipe(z.email()),
  instagram: z
    .string()
    .max(TAMANHO_MAXIMO_INSTAGRAM + 20)
    .transform(normalizarInstagram)
    .pipe(z.string().max(TAMANHO_MAXIMO_INSTAGRAM).optional())
    .optional(),
  origem: z.enum(ORIGENS),
  site: z.string().optional(),
});

export type EntradaNaEspera = z.infer<typeof esquemaListaDeEspera>;

/** O campo-isca preenchido: a rota responde `ok` e não grava nada. */
export function caiuNaIsca(corpo: unknown): boolean {
  const site = (corpo as { site?: unknown } | null)?.site;
  return typeof site === "string" && site.trim() !== "";
}

/**
 * O id do documento: SHA-256 do e-mail normalizado, em hex, os 32 primeiros
 * caracteres. O e-mail não aparece em id, caminho nem log.
 */
export async function idDaEspera(email: string): Promise<string> {
  const resumo = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizarEmail(email)),
  );
  return Array.from(new Uint8Array(resumo), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 32);
}

/**
 * Quantas da lista o cron avisa por dia depois do lançamento (spec 186,
 * `#d412`). Deixa espaço na cota grátis do Resend (100 por dia) para os
 * outros e-mails. `scripts/beta.mjs` repete.
 */
// ponytail: constante fixa; com o Resend Pro, sobe para 1.000 nesta linha.
export const LOTE_DO_LANCAMENTO = 60;

/**
 * O lote do dia: as ainda não avisadas, por posição, até o que falta para
 * `lote` no dia `hoje` de Brasília. Chamar o cron duas vezes no mesmo dia não
 * passa de `lote`; quem falhou fica sem `avisadaEm` e volta na próxima.
 */
export function loteDoLancamento<
  T extends { posicao: number; avisadaEm?: { toMillis(): number } },
>(entradas: T[], hoje: DataISO, lote = LOTE_DO_LANCAMENTO): T[] {
  const avisadasHoje = entradas.filter(
    (e) =>
      e.avisadaEm && hojeEmBrasilia(new Date(e.avisadaEm.toMillis())) === hoje,
  ).length;
  return entradas
    .filter((e) => !e.avisadaEm)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, Math.max(0, lote - avisadasHoje));
}

/** 37 → "37ª"; 1200 → "1.200ª". */
export function posicaoNaFila(posicao: number): string {
  return `${posicao.toLocaleString("pt-BR")}ª`;
}
