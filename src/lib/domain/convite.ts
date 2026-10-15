/**
 * O convite de fundadora (spec 181): o código que vira uma conta no beta.
 *
 * Puro: o sorteio recebe a fonte de aleatoriedade (`crypto.getRandomValues` no
 * servidor, uma sequência fixa no teste). O código mora no id do documento
 * `contas/{dona}/convites/{codigo}` e no link `/convite/{codigo}`.
 */

import { z } from "zod";
import { primeiroNome } from "./whatsapp";

/** 31 símbolos, sem 0/O e 1/I/L: o código é ditado e copiado de print. */
export const ALFABETO_DO_CONVITE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TAMANHO_DO_CODIGO = 8;
/** A cota de cada fundadora, `Conta.beta.convites` ao nascer. */
export const CONVITES_POR_FUNDADORA = 5;

/** O maior múltiplo de 31 que cabe num byte: acima dele, o byte é jogado fora. */
const TETO_SEM_VIES = 256 - (256 % ALFABETO_DO_CONVITE.length);

/**
 * Oito símbolos sorteados, ~39 bits. Bytes de 248 a 255 são descartados para
 * que nenhum símbolo saia mais que os outros.
 */
export function gerarCodigo(
  aleatorio: (bytes: Uint8Array) => Uint8Array,
): string {
  let codigo = "";
  while (codigo.length < TAMANHO_DO_CODIGO) {
    for (const byte of aleatorio(new Uint8Array(TAMANHO_DO_CODIGO))) {
      if (byte >= TETO_SEM_VIES) continue;
      codigo += ALFABETO_DO_CONVITE[byte % ALFABETO_DO_CONVITE.length];
      if (codigo.length === TAMANHO_DO_CODIGO) break;
    }
  }
  return codigo;
}

/** "K7Q3M9XA" → "K7Q3-M9XA", como a tela e o e-mail mostram. */
export function formatarCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

/**
 * O que ela digitou ou o que veio no link → o código, ou `null`. Aceita
 * minúsculas, espaço e hífen; qualquer outro símbolo, ou outro tamanho, é
 * `null`.
 */
export function lerCodigo(texto: string): string | null {
  const codigo = texto.toUpperCase().replace(/[\s-]/g, "");
  if (codigo.length !== TAMANHO_DO_CODIGO) return null;
  for (const simbolo of codigo) {
    if (!ALFABETO_DO_CONVITE.includes(simbolo)) return null;
  }
  return codigo;
}

/** O nome que ela escreve ao criar o convite (spec 183). */
export const TAMANHO_MAXIMO_PARA_QUEM = 40;

/** `POST /api/convites` (spec 183). Nome vazio é nome nenhum. */
export const esquemaNovoConvite = z.object({
  contaId: z.string().trim().min(1),
  paraQuem: z
    .string()
    .trim()
    .max(TAMANHO_MAXIMO_PARA_QUEM)
    .optional()
    .transform((nome) => nome || undefined),
});

/** `DELETE /api/convites` (spec 183). */
export const esquemaCancelarConvite = z.object({
  contaId: z.string().trim().min(1),
  codigo: z.string().trim().min(1),
});

export type FalhaDoConvite =
  | "sem-acesso" // token ausente, ou quem chama não é a dona
  | "fora-de-forma" // corpo fora do esquema, convite que não é dela ou não está aberto
  | "sem-configuracao" // servidor sem credencial
  | "sem-cota" // não é fundadora, ou a cota acabou
  | "sem-rede" // `fetch` falhou no aparelho
  | "sem-resposta"; // o resto

export const MENSAGEM_FALHA_DO_CONVITE: Record<FalhaDoConvite, string> = {
  "sem-acesso": "Só a dona da conta mexe nos convites.",
  "fora-de-forma": "Esse convite já mudou. Feche e abra a lista de novo.",
  "sem-configuracao":
    "O servidor não está pronto para convites. Fale com a gente.",
  "sem-cota": "Os seus convites acabaram.",
  "sem-rede": "Convidar precisa de internet. Conecte e tente de novo.",
  "sem-resposta":
    "O servidor demorou demais para responder. Tente de novo em instantes.",
};

/**
 * Quantos convites ela ainda pode criar: a cota menos os abertos e os usados.
 * O cancelado devolve a vaga (spec 183). Nunca abaixo de zero, nem quando a
 * cota baixou depois de usada.
 */
export function convitesLivres(
  cota: number,
  convites: readonly { status: string }[],
): number {
  const gastos = convites.filter(
    (c) => c.status === "ABERTO" || c.status === "USADO",
  ).length;
  return Math.max(0, cota - gastos);
}

/**
 * O texto que vai antes do link no WhatsApp (spec 183). O link vai separado:
 * `MandarAPagina` o junta ao texto no `wa.me` e o entrega à parte ao `share`.
 * O nome dela não entra: a mensagem sai do número dela.
 */
export function mensagemDoConvite(paraQuem?: string): string {
  const nome = paraQuem?.trim();
  const oi = nome ? `Oi, ${nome}!` : "Oi!";
  return `${oi} Tô usando o Rende pra calcular o preço dos meus doces e organizar os pedidos. Ele está em beta fechado, só entra quem é convidada, e eu guardei uma das minhas vagas pra você:`;
}

/**
 * O que a página `/convite/{codigo}` mostra (spec 183). Usado, cancelado,
 * inexistente e de conta encerrada são um estado só, `nao-vale`: quem testa
 * códigos não aprende nada, e quem recebeu o link tem a mesma saída.
 */
export type EstadoDoConvite = "aberto" | "sem-vaga" | "nao-vale" | "publico";

export function estadoDoConvite(
  convite: { status: string } | null,
  conta: { status?: string } | null,
  beta: { fase: "BETA" | "PUBLICO"; vagas: number; ocupadas: number },
): EstadoDoConvite {
  if (beta.fase === "PUBLICO") return "publico";
  if (convite?.status !== "ABERTO" || !conta || conta.status === "ENCERRADA") {
    return "nao-vale";
  }
  return beta.ocupadas < beta.vagas ? "aberto" : "sem-vaga";
}

/**
 * O título da página do convite: quem convida antes do produto (spec 183).
 * Sem negócio próprio (o nome do negócio é o dela), sem o "da".
 */
export function fraseDaVaga({
  paraQuem,
  proprietaria,
  negocio,
}: {
  paraQuem?: string;
  proprietaria: string;
  negocio: string;
}): string {
  const quem = primeiroNome(proprietaria);
  const da =
    negocio.trim() && negocio.trim() !== proprietaria.trim()
      ? `, da ${negocio.trim()},`
      : "";
  const nome = paraQuem?.trim();
  const sujeito = nome ? `${nome}, a ${quem}` : `A ${quem}`;
  return `${sujeito}${da} guardou uma vaga do Rende pra você.`;
}

/**
 * O número das vagas nas páginas públicas (spec 184), da contagem de
 * `plataforma/beta`. Sem `ocupadas` (o build sem credencial, a leitura que
 * falhou), o teto sem o que resta: nunca um número inventado.
 */
export function fraseDasVagas({
  vagas,
  ocupadas,
}: {
  vagas: number;
  ocupadas?: number;
}): string {
  if (ocupadas === undefined) return `São ${vagas} vagas, por convite.`;
  const restam = vagas - ocupadas;
  if (restam <= 0) return `As ${vagas} vagas estão ocupadas.`;
  if (restam === 1) return "Resta só 1 vaga.";
  if (restam <= 10) return `Restam só ${restam} vagas.`;
  return `Restam ${restam} das ${vagas} vagas.`;
}
