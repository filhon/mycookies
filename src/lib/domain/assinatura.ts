import { z } from "zod";
import type { Centavos, Pacote, ResumoProduto } from "@/lib/types";
import { LIMITE_DE_AJUDANTES } from "./ajudante";
import { formatarMoeda } from "./money";

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
 * O que cada pacote dá, uma linha por coisa, para `/assinatura` e `/conheca`:
 * nunca o que falta (spec 039), em lista para comparar em 360px (spec 160). A
 * ajudante não escolhe o que vê: a régua é fixa (`#d157`), e a linha diz a régua.
 */
export const O_QUE_O_PACOTE_TEM: Record<Pacote, readonly string[]> = {
  ESSENCIAL: [
    "O preço de cada doce, e o aviso quando um custo sobe",
    "Os pedidos, com a lista do mercado",
    "O caixa do mês e a sua meta",
  ],
  COMPLETO: [
    "Tudo do Essencial",
    "O cardápio com link: a cliente escolhe e o pedido chega anotado",
    `Até ${LIMITE_DE_AJUDANTES} ajudantes, que produzem e entregam sem ver o seu caixa`,
  ],
};

/**
 * Para quem é cada pacote, numa linha embaixo do nome (spec 170). Nenhum "mais
 * escolhido": não há dado que o sustente.
 */
export const PRA_QUEM_E: Record<Pacote, string> = {
  ESSENCIAL:
    "Pra quem vende na porta, na feira ou por encomenda e quer o preço, os pedidos e o caixa no lugar.",
  COMPLETO:
    "Pra quem recebe pedido por mensagem todo dia, ou tem quem ajude na cozinha.",
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

/** Quantos meses inteiros o anual dá de graça (spec 170). Zero sem mensal ou sem economia. */
export function mesesDeGraca(mensal: Centavos, anual: Centavos): number {
  if (mensal <= 0) return 0;
  return Math.max(0, Math.floor(economiaAnual(mensal, anual) / mensal));
}

const POR_EXTENSO = [
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
];

/** "um mês de graça" · "dois meses de graça": por extenso até dez. */
export function fraseDosMesesDeGraca(meses: number): string {
  const numero = POR_EXTENSO[meses - 1] ?? String(meses);
  return `${numero} ${meses === 1 ? "mês" : "meses"} de graça`;
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

/**
 * O que `/api/assinatura/resumo` lê do Stripe e devolve, sem gravar nada
 * (`DECISOES.md#d285`). `ateMs` é a próxima cobrança, ou o fim quando
 * `cancela`. `final` é o fim do cartão; `null` quando não há cartão.
 * `emTeste` é o `trialing` do Stripe: nada cobrado ainda (spec 164).
 */
export interface ResumoAssinatura {
  valor: Centavos;
  periodo: Periodo;
  ateMs: number;
  final: string | null;
  cancela: boolean;
  emTeste: boolean;
}

/**
 * O que cada recurso do completo faz, numa frase: a linha de "O Completo traz"
 * para quem está no essencial (spec 084).
 */
export const O_QUE_O_RECURSO_FAZ: Record<Recurso, string> = {
  cardapio: "O cardápio com link: a cliente escolhe e o pedido chega anotado.",
  ajudante: `Até ${LIMITE_DE_AJUDANTES} ajudantes, que produzem e entregam com você sem ver o seu caixa.`,
};

/** As frases do que o completo tem e este pacote não. Vazia no completo. */
export function oQueOCompletoTraz(pacote: Pacote): string[] {
  return RECURSOS_DO_PACOTE.COMPLETO.filter(
    (recurso) => !RECURSOS_DO_PACOTE[pacote].includes(recurso),
  ).map((recurso) => O_QUE_O_RECURSO_FAZ[recurso]);
}

// Brasília, como o resto da conta (`#d160`): no servidor e no aparelho, o mesmo dia.
const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

/** "12 de novembro". */
export function diaEMes(ms: number): string {
  return DIA_E_MES.format(ms);
}

/** "12 nov": o mês nas três primeiras letras, sem o ponto do `short`. */
function diaEMesCurto(ms: number): string {
  const partes = DIA_E_MES.formatToParts(ms);
  const dia = partes.find((parte) => parte.type === "day")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value ?? "";
  return `${dia} ${mes.slice(0, 3)}`;
}

/**
 * O dia da cobrança pelo que o aparelho sabe: `assinaturaAte` é o fim do
 * período **mais a folga** (`acessoAteDaAssinatura`), e a cobrança é no fim.
 */
export function cobrancaPrevistaMs(renovaEmMs: number): number {
  return renovaEmMs - FOLGA_RENOVACAO_DIAS * DIA_MS;
}

/** O anual dividido pelos meses: como a tela de assinar o mostra (spec 160). */
export function mensalDoAnual(anual: Centavos): Centavos {
  return Math.round(anual / 12);
}

/** O plano por mês, que é como ele entra nas despesas fixas (`#d287`). */
export function mensalDoPlano(
  resumo: Pick<ResumoAssinatura, "valor" | "periodo">,
): Centavos {
  return resumo.periodo === "anual"
    ? mensalDoAnual(resumo.valor)
    : resumo.valor;
}

/**
 * "Assinar o Essencial · R$ 290,00 por ano": o botão repete a escolha inteira,
 * com o número que sai do cartão (spec 160). Sem preço, só "Assinar o Essencial".
 */
export function fraseDeAssinar(
  pacote: Pacote,
  periodo: Periodo,
  valor: Centavos | undefined,
): string {
  const nome = `Assinar o ${NOME_DO_PACOTE[pacote]}`;
  if (valor == null) return nome;
  const por = periodo === "anual" ? "por ano" : "por mês";
  return `${nome} · ${formatarMoeda(valor)} ${por}`;
}

/** O que o resumo lê de cada cupom do Stripe: um dos dois vem preenchido. */
export interface Cupom {
  percent_off: number | null;
  amount_off: Centavos | null;
}

/**
 * O valor depois dos cupons, um depois do outro, nunca negativo (`#d314`):
 * o `CORTESIA` (100%) dá zero.
 */
export function valorComDesconto(valor: Centavos, cupons: Cupom[]): Centavos {
  return cupons.reduce(
    (resto, cupom) =>
      Math.max(
        0,
        Math.round(resto * (1 - (cupom.percent_off ?? 0) / 100)) -
          (cupom.amount_off ?? 0),
      ),
    valor,
  );
}

/** "Plano Essencial · R$ 39,90 por mês" · com valor zero, "Plano Completo · cortesia". */
export function fraseDoPlano(
  pacote: Pacote,
  resumo: Pick<ResumoAssinatura, "valor" | "periodo">,
): string {
  if (resumo.valor === 0) return `Plano ${NOME_DO_PACOTE[pacote]} · cortesia`;
  const por = resumo.periodo === "anual" ? "por ano" : "por mês";
  return `Plano ${NOME_DO_PACOTE[pacote]} · ${formatarMoeda(resumo.valor)} ${por}`;
}

/**
 * "Renova em 12 de novembro, no cartão final 4242." · sem cartão, só o dia ·
 * com o cancelamento marcado, "Termina em 12 de novembro. Até lá, tudo
 * continua aberto."
 */
export function fraseDaCobranca(
  resumo: Pick<ResumoAssinatura, "ateMs" | "final" | "cancela">,
): string {
  const dia = diaEMes(resumo.ateMs);
  if (resumo.cancela) return `Termina em ${dia}. Até lá, tudo continua aberto.`;
  return resumo.final
    ? `Renova em ${dia}, no cartão final ${resumo.final}.`
    : `Renova em ${dia}.`;
}

/**
 * O que aconteceu com o dinheiro, na volta do Stripe (spec 164): nunca afirma
 * uma cobrança que não houve. A cortesia vem antes do teste: em teste, ela
 * também é `trialing`, e o que vale dizer é que nada será cobrado.
 */
export function fraseDaConfirmacao(
  resumo: Pick<ResumoAssinatura, "valor" | "ateMs" | "final" | "emTeste">,
): string {
  if (resumo.valor === 0) return "É cortesia: nada é cobrado.";
  if (resumo.emTeste) {
    return `Nada foi cobrado hoje. A primeira cobrança é em ${diaEMes(resumo.ateMs)}, quando o teste acaba.`;
  }
  const valor = formatarMoeda(resumo.valor);
  return resumo.final
    ? `${valor} cobrados no cartão final ${resumo.final}.`
    : `${valor} cobrados.`;
}

/**
 * O que fica depois de cancelar, no passo "Antes de cancelar" (spec 162):
 * verdade pelo `#d144`, o acesso vai até o fim do período, e pela 029.
 */
export function fraseDoQueFica(ateMs: number): string {
  return `Até ${diaEMes(ateMs)} tudo continua aberto. Depois, seus preços, pedidos e caixa ficam guardados para ler e baixar.`;
}

/**
 * A saída mais barata para quem paga o Completo (spec 162): o Essencial do
 * mesmo período, pelo mês. `null` no Essencial (nada abaixo dele) e na
 * cortesia (nada a economizar).
 */
export function fraseDoEssencial(
  pacote: Pacote,
  resumo: Pick<ResumoAssinatura, "valor" | "periodo">,
  essencial: { mensal: Centavos; anual: Centavos },
): string | null {
  if (pacote !== "COMPLETO" || resumo.valor === 0) return null;
  const mensal =
    resumo.periodo === "anual"
      ? mensalDoAnual(essencial.anual)
      : essencial.mensal;
  return `Quer pagar menos? O Essencial custa ${formatarMoeda(mensal)} por mês e mantém preço, pedidos e caixa.`;
}

/** "Essencial · renova em 12 nov": a legenda da linha fechada, pelo aparelho. */
export function legendaDaAssinatura(
  pacote: Pacote,
  renovaEmMs: number,
): string {
  return `${NOME_DO_PACOTE[pacote]} · renova em ${diaEMesCurto(cobrancaPrevistaMs(renovaEmMs))}`;
}

/** "No anual você paga R$ 99,80 a menos por ano", ou `null` quando não compensa. */
export function fraseDaEconomia(precos: {
  mensal: Centavos;
  anual: Centavos;
}): string | null {
  const economia = economiaAnual(precos.mensal, precos.anual);
  return economia > 0
    ? `No anual você paga ${formatarMoeda(economia)} a menos por ano`
    : null;
}

/**
 * "O Essencial dá R$ 24,17 por mês: a sobra de 3 unidades de Cookie de
 * Nutella." O `#d219` com o plano escolhido em `/assinatura` (spec 161).
 */
export function fraseDaSobraQuePaga(
  pacote: Pacote,
  mensal: Centavos,
  paga: { nome: string; unidades: number },
): string {
  const unidades = paga.unidades === 1 ? "unidade" : "unidades";
  return `O ${NOME_DO_PACOTE[pacote]} dá ${formatarMoeda(mensal)} por mês: a sobra de ${paga.unidades} ${unidades} de ${paga.nome}.`;
}

/**
 * Por que o Completo vem escolhido, para quem tem ajudante (spec 161): pelo
 * e-mail, que é o que o convite guarda. `null` sem ajudante.
 */
export function motivoDoCompleto(ajudantes: readonly string[]): string | null {
  if (ajudantes.length === 0) return null;
  if (ajudantes.length === 1) return `${ajudantes[0]} ajuda você aqui.`;
  return `${ajudantes.length} pessoas ajudam você aqui.`;
}

/** O que o Essencial tira de quem tem ajudante (spec 161). `null` sem ajudante. */
export function perdaNoEssencial(ajudantes: readonly string[]): string | null {
  if (ajudantes.length === 0) return null;
  if (ajudantes.length === 1) return `${ajudantes[0]} perde o acesso ao Rende.`;
  return `As ${ajudantes.length} pessoas que ajudam você perdem o acesso ao Rende.`;
}

/** O que o Stripe exige de `trial_end` no checkout: 48 horas à frente. */
const MINIMO_DO_TRIAL_END_MS = 48 * 60 * 60 * 1000;
/** Uma hora de margem: o relógio do aparelho e a ida ao Stripe não são o instante da conta. */
const MARGEM_DO_TRIAL_END_MS = 60 * 60 * 1000;

/**
 * Se o checkout deixa a primeira cobrança para o fim do teste (spec 161). Com
 * menos que o mínimo do Stripe, ou vencido, cobra na hora, como antes.
 */
export function deveCobrarNoFimDoTeste(
  trialAteMs: number | undefined,
  agoraMs: number,
): trialAteMs is number {
  return (
    trialAteMs != null &&
    trialAteMs - agoraMs >= MINIMO_DO_TRIAL_END_MS + MARGEM_DO_TRIAL_END_MS
  );
}

/** "Primeira cobrança em 28 de outubro, quando o teste acaba." */
export function fraseDaPrimeiraCobranca(trialAteMs: number): string {
  return `Primeira cobrança em ${diaEMes(trialAteMs)}, quando o teste acaba.`;
}

export const esquemaCheckout = z.object({
  contaId: z.string().min(1),
  pacote: z.enum(["ESSENCIAL", "COMPLETO"]),
  periodo: z.enum(["mensal", "anual"]),
});

/** A volta do Stripe: o id da sessão do checkout vem em `?sessao=` (spec 163). */
export const esquemaConfirmar = z.object({
  contaId: z.string().min(1),
  sessao: z.string().startsWith("cs_"),
});

/** O que `/api/assinatura/confirmar` leu na sessão do checkout. */
export type SituacaoDaVolta = "aberta" | "esperando" | "confirmada";

/** O texto pronto da ajuda em `confirmando`, com o código que se procura no Stripe. */
export function textoDaAjudaDaConfirmacao(sessao: string | null): string {
  const frase = "Oi, assinei o Rende e a conta não liberou.";
  return sessao ? `${frase} Código: ${sessao}` : frase;
}

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
