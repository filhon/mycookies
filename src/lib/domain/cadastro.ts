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
  /**
   * Por onde ela chegou: a calculadora pública com rascunho no aparelho (spec
   * 040-B, `#d191`), o rodapé de um cardápio (spec 114, `#d317`) ou o e-mail
   * do lançamento para a lista de espera (spec 186, `?de=espera`).
   */
  origem: z.enum(["calculadora", "cardapio", "espera"]).optional(),
  /**
   * O código do convite de fundadora, como veio do link ou do aparelho (spec
   * 181). A rota lê com `lerCodigo`; `"convite"` em `Conta.origem` é a rota que
   * grava, quando a troca acontece, e nunca o que o cliente diz.
   */
  convite: z.string().max(40).optional(),
});

/**
 * Onde `/conheca?de=cardapio` deixa a marca para o cadastro (spec 114,
 * `#d317`). O rascunho da calculadora, quando existe, ganha: é ele que muda o
 * e-mail de boas-vindas e a biblioteca.
 */
export const CHAVE_DA_ORIGEM = "rende:origem";
/**
 * Onde `/cadastro?convite=` guarda o código (spec 181): sobrevive à ida ao
 * login e à volta do Google, que caem em `/cadastro` sem o parâmetro.
 */
export const CHAVE_DO_CONVITE = "rende:convite";
export type Cadastro = z.infer<typeof esquemaCadastro>;

/** `negocio` vazio vira o nome dela: quem ainda não tem marca é o negócio. */
export function nomeDoNegocio(cadastro: Cadastro): string {
  return cadastro.negocio || cadastro.nome;
}

/**
 * Os domínios do público, na ordem de frequência: no empate, ganha o primeiro
 * (spec 156, `#d366`).
 */
const DOMINIOS_COMUNS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
  "globo.com",
];

/**
 * "maynara@gmial.com" → "maynara@gmail.com". `null` quando o domínio está na
 * lista, fica longe de todos (mais de 2 erros) ou é curto demais para adivinhar.
 * A parte local volta como ela digitou.
 */
export function sugerirEmail(email: string): string | null {
  const limpo = email.trim();
  const arroba = limpo.lastIndexOf("@");
  if (arroba <= 0) return null;
  const local = limpo.slice(0, arroba);
  const dominio = limpo.slice(arroba + 1).toLowerCase();
  if (dominio.length < 4 || DOMINIOS_COMUNS.includes(dominio)) return null;

  let melhor: string | null = null;
  let menor = 3;
  for (const candidato of DOMINIOS_COMUNS) {
    const d = distancia(dominio, candidato);
    if (d < menor) {
      menor = d;
      melhor = candidato;
    }
  }
  return melhor && `${local}@${melhor}`;
}

/** Damerau (alinhamento ótimo): trocar duas letras vizinhas conta um erro. */
function distancia(a: string, b: string): number {
  // A tabela numa linha só: `em(i, j)` é a distância entre os prefixos.
  const largura = b.length + 1;
  const d: number[] = [];
  const em = (i: number, j: number) => d[i * largura + j]!;
  for (let i = 0; i <= a.length; i++) {
    for (let j = 0; j <= b.length; j++) {
      if (i === 0 || j === 0) {
        d[i * largura + j] = i + j;
        continue;
      }
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let menor = Math.min(
        em(i - 1, j) + 1,
        em(i, j - 1) + 1,
        em(i - 1, j - 1) + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        menor = Math.min(menor, em(i - 2, j - 2) + 1);
      }
      d[i * largura + j] = menor;
    }
  }
  return em(a.length, b.length);
}

export type FalhaCadastro =
  | "sem-acesso" // token ausente ou inválido
  | "fora-de-forma" // corpo que não passa em `esquemaCadastro`
  | "sem-configuracao" // servidor sem credencial
  | "sem-resposta" // 5xx, timeout
  | "sem-rede"
  // Fase BETA (spec 181), todas 403 e sem conta criada:
  | "sem-convite"
  | "convite-invalido" // não existe, cancelado ou de conta encerrada
  | "convite-usado"
  | "sem-vaga";

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
  // A tela que mostra estas direito, com a lista de espera, é a 182.
  "sem-convite":
    "O Rende está abrindo por convite. Peça o link a uma confeiteira que já usa.",
  "convite-invalido":
    "Esse convite não vale. Confira o código ou peça outro a quem te convidou.",
  "convite-usado":
    "Esse convite já abriu uma conta. Peça outro a quem te convidou.",
  "sem-vaga":
    "As vagas desta fase acabaram. Logo o Rende abre para todo mundo.",
};
