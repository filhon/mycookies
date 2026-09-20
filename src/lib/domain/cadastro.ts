import { z } from "zod";

/**
 * O que o cadastro decide e o handler e a tela compartilham (spec 027).
 *
 * Puro: o fim do teste é aritmética de data, o corpo do `POST /api/conta` é
 * um esquema, e as frases de falha são as mesmas dos dois lados da rota.
 */

export const DIAS_DE_TESTE = 14;
export const TAMANHO_MAXIMO_NOME = 80;

/** 14 × 24 h depois de `inicio`. Como mostrar "faltam N dias" é da 028. */
export function fimDoTeste(inicio: Date): Date {
  return new Date(inicio.getTime() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);
}

/**
 * O corpo do POST. `termos` é `literal(true)`: a caixa desmarcada não é um
 * corpo válido, e `termosAceitosEm` só existe porque ela marcou.
 */
export const esquemaCadastro = z.object({
  nome: z.string().trim().min(1).max(TAMANHO_MAXIMO_NOME),
  negocio: z.string().trim().max(TAMANHO_MAXIMO_NOME).optional(),
  termos: z.literal(true),
});
export type Cadastro = z.infer<typeof esquemaCadastro>;

/** `negocio` vazio vira o nome dela: quem ainda não tem marca é o negócio. */
export function nomeDoNegocio(cadastro: Cadastro): string {
  return cadastro.negocio || cadastro.nome;
}

export type FalhaCadastro =
  | "sem-acesso" // token ausente ou inválido
  | "fora-de-forma" // corpo que não passa em `esquemaCadastro`
  | "sem-configuracao" // servidor sem credencial
  | "sem-resposta" // 5xx, timeout
  | "sem-rede";

export const MENSAGEM_FALHA_CADASTRO: Record<FalhaCadastro, string> = {
  "sem-acesso":
    "Não deu para confirmar quem você é. Saia, entre de novo e tente outra vez.",
  "fora-de-forma": "Confira o seu nome e a caixa dos termos e tente de novo.",
  "sem-configuracao":
    "O cadastro ainda não está configurado neste servidor. Avise quem cuida do Rende.",
  "sem-resposta":
    "O servidor demorou demais para abrir a sua conta. Tente de novo em instantes.",
  "sem-rede":
    "Abrir a conta precisa de internet. Conecte e toque em tentar de novo.",
};
