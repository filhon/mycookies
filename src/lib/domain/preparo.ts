import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import type { UnidadeBase } from "@/lib/types";

/**
 * O modo de preparo é texto, um passo por linha (`DECISOES.md#d342`): colado
 * do caderno ou do WhatsApp, sem lista de campos. Linha em branco não é passo,
 * e o `\r` do que veio do Windows sai junto com o espaço das pontas.
 */
export function passosDoPreparo(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** As fornadas que a bancada oferece (`DECISOES.md#d343`). */
export const FORNADAS_DA_BANCADA = [0.5, 1, 2, 3] as const;

/**
 * Arredonda para o passo da unidade: grama e mililitro inteiros, `un` de meio
 * em meio (não se quebra um ovo em terços). Abaixo de 10 g ou ml fica uma
 * casa: o fermento de 2,5 g não vira 3 g nem com a fornada de sempre. O que
 * tem quantidade nunca arredonda para zero, porque zero é ingrediente pulado.
 */
function noPasso(quantidade: number, unidadeBase: UnidadeBase): number {
  const passo = unidadeBase === "un" ? 0.5 : quantidade < 10 ? 0.1 : 1;
  const arredondada = Number(
    (Math.round(quantidade / passo) * passo).toFixed(1),
  );
  return quantidade > 0 ? Math.max(passo, arredondada) : 0;
}

/**
 * 1120 g → "1.120 g", e não "1,12 kg": ela pesa em gramas na balança, e é na
 * unidade da receita que a quantidade é lida (`#d343`). 1,5 un → "1 ½", sem
 * "un": na cozinha se diz "2 ovos", e o nome já está na linha (`#d347`).
 */
export function quantidadeNaBancada(
  quantidade: number,
  unidadeBase: UnidadeBase,
): string {
  if (unidadeBase === "un") {
    const inteiro = Math.floor(quantidade);
    const meio = quantidade - inteiro >= 0.5;
    if (!meio) return String(inteiro);
    return inteiro === 0 ? "½" : `${inteiro} ½`;
  }
  return `${quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidadeBase}`;
}

/**
 * A receita vezes as fornadas, no passo de cada unidade. A quantidade continua
 * na unidade base, que é a que o editor mostra e a que ela digitou.
 */
export function escalarItens<
  T extends { quantidade: number; unidadeBase: UnidadeBase },
>(itens: readonly T[], fator: number): (T & { rotulo: string })[] {
  return itens.map((item) => {
    const quantidade = noPasso(item.quantidade * fator, item.unidadeBase);
    return {
      ...item,
      quantidade,
      rotulo: quantidadeNaBancada(quantidade, item.unidadeBase),
    };
  });
}

/** Um pedaço do passo: o texto e, logo depois dele, a quantidade que ele cita. */
export interface PedacoDoPasso {
  texto: string;
  rotulo?: string;
}

const LETRA = "[\\p{L}\\p{N}]";
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A palavra inteira, com o plural em "s": "ovo" casa "ovos", não "ovoide". */
const palavra = (chave: string) =>
  new RegExp(`(?<!${LETRA})${escapar(chave)}s?(?!${LETRA})`, "gu");

/**
 * A quantidade de cada ingrediente dentro do passo (`#d350`). Casa, em texto
 * normalizado: (1) o nome inteiro, o mais longo primeiro, para que
 * "chocolate branco" não seja lido como "chocolate"; senão (2) a primeira
 * palavra do nome, de 4 letras ou mais, só se nenhum outro ingrediente
 * começar por ela. Com dois açúcares, "açúcar" sozinho não é de nenhum. Só a
 * primeira menção de cada um, e na dúvida não casa: o passo sem quantidade é
 * o de antes, e o com a quantidade errada é pior.
 */
export function mencoesNoPasso(
  passo: string,
  ingredientes: readonly { nomeSnapshot: string; rotulo: string }[],
): PedacoDoPasso[] {
  // O texto normalizado letra a letra, sabendo de onde veio cada uma.
  const texto = passo.normalize("NFC");
  let normal = "";
  const inicio: number[] = [];
  const fim: number[] = [];
  let posicao = 0;
  for (const letra of texto) {
    const chave = /\s/.test(letra) ? " " : chaveDeBusca(letra);
    for (const c of chave) {
      normal += c;
      inicio.push(posicao);
      fim.push(posicao + letra.length);
    }
    posicao += letra.length;
  }

  const nomes = ingredientes.map((item) => chaveDeBusca(item.nomeSnapshot));
  const primeira = nomes.map((nome) => nome.split(" ")[0] ?? "");
  const achados: { de: number; ate: number; rotulo: string }[] = [];
  const casado = new Set<number>();

  function procurar(indice: number, chave: string) {
    for (const achado of normal.matchAll(palavra(chave))) {
      const de = achado.index;
      const ate = de + achado[0].length;
      if (achados.some((a) => de < a.ate && a.de < ate)) continue;
      achados.push({ de, ate, rotulo: ingredientes[indice]!.rotulo });
      casado.add(indice);
      return;
    }
  }

  nomes
    .map((nome, indice) => ({ nome, indice }))
    .filter(({ nome }) => nome)
    .sort((a, b) => b.nome.length - a.nome.length)
    .forEach(({ nome, indice }) => procurar(indice, nome));
  primeira.forEach((chave, indice) => {
    const sozinha =
      chave.length >= 4 &&
      primeira.every((outra, i) => i === indice || outra !== chave);
    if (!casado.has(indice) && sozinha) procurar(indice, chave);
  });

  const pedacos: PedacoDoPasso[] = [];
  let desde = 0;
  for (const { ate, rotulo } of achados.sort((a, b) => a.de - b.de)) {
    const corte = fim[ate - 1]!;
    pedacos.push({ texto: texto.slice(desde, corte), rotulo });
    desde = corte;
  }
  if (desde < texto.length) pedacos.push({ texto: texto.slice(desde) });
  return pedacos;
}

/**
 * Número com unidade de medida escrito no passo, "560 g" ou "2 xícaras"
 * (`#d350`): é a quantidade de uma fornada, que o texto não escala. "180
 * graus" e "12 minutos" não são.
 */
const QUANTIDADE_ESCRITA = new RegExp(
  `(?<!${LETRA})(\\d+([.,/]\\d+)?|[½¼¾])\\s*(g|gr|gramas?|kg|quilos?|ml|l|litros?|xicaras?|colher(es)?|copos?|latas?|caixas?)(?!${LETRA})`,
  "u",
);

export function temQuantidadeEscrita(passo: string): boolean {
  return QUANTIDADE_ESCRITA.test(chaveDeBusca(passo));
}

const NUMERO = "(\\d+(?:[.,]\\d+)?)";
const MINUTOS = "(?:min|minutos?)";
/**
 * "12 minutos", "10 a 12 min", "1h30", "1 hora e 30 minutos", "30 segundos",
 * "meia hora". Os minutos depois da hora só valem colados ("1h30") ou com a
 * unidade ("1 hora e 30 min"): "1 hora 2 ovos" não é 1h02.
 */
const TEMPO = new RegExp(
  `(?<!${LETRA})(?:${NUMERO}\\s*(?:a|ate|ou|-|–)\\s*)?${NUMERO}\\s*` +
    `(?:(h|horas?)(?:\\s*(?:e\\s*)?(\\d{1,2})\\s*${MINUTOS}|(\\d{2}))?|(${MINUTOS})|(s|seg|segundos?))(?!${LETRA})` +
    `|(?<!${LETRA})meia hora(?!${LETRA})`,
  "u",
);

const numero = (texto: string) => Number(texto.replace(",", "."));

/**
 * O primeiro tempo escrito no passo, em segundos, ou `null` (`#d351`). Faixa
 * ("10 a 12 minutos") vale o menor: é a hora de olhar o forno, não de tirar.
 */
export function tempoNoPasso(passo: string): number | null {
  const achado = TEMPO.exec(chaveDeBusca(passo));
  if (!achado) return null;
  const [, faixa, valor, hora, minutosDepois, minutosColados, minuto] = achado;
  if (!valor) return 30 * 60; // meia hora
  const quanto = faixa ? Math.min(numero(faixa), numero(valor)) : numero(valor);
  const extra = numero(minutosDepois ?? minutosColados ?? "0") * 60;
  const segundos = Math.round(
    hora ? quanto * 3600 + extra : minuto ? quanto * 60 : quanto,
  );
  return segundos > 0 ? segundos : null;
}

/** 720 → "12 min", 5400 → "1h30", 3600 → "1 h", 90 → "1 min 30 s". */
export function rotuloDoTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return min > 0 ? `${h}h${String(min).padStart(2, "0")}` : `${h} h`;
  if (min > 0) return s > 0 ? `${min} min ${s} s` : `${min} min`;
  return `${s} s`;
}

/** O que falta, em relógio: 702 → "11:42", 3725 → "1:02:05". Nunca negativo. */
export function relogio(segundos: number): string {
  const total = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(total % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * O preparo aberto na bancada da receita de cima (`#d349`): o que o pote dá e
 * os ingredientes de dentro, na quantidade que esta massa pede.
 *
 * O pote segue `tirarDoPote` (`#d346`): contado em zero, ou nunca contado
 * (`pote` ausente), é "fiz junto" e `pote` volta `null`. Quando o pote não dá,
 * a lista é a do `resto`, o que sai dos ingredientes; quando dá, é a do pedido
 * inteiro, para o "fiz junto?" de quem não usou o pote.
 */
export function preparoNaBancada<
  T extends { quantidade: number; unidadeBase: UnidadeBase },
>(
  preparo: { rendimento: number; itens: readonly T[] },
  pede: number,
  pote: number | undefined,
): {
  pote: number | null;
  resto: number;
  ingredientes: (T & { rotulo: string })[];
} {
  const tem = pote !== undefined && pote > 0 ? pote : null;
  const resto = tem === null ? pede : Math.max(0, pede - tem);
  const gramas = resto > 0 ? resto : pede;
  return {
    pote: tem,
    resto,
    ingredientes: escalarItens(
      preparo.itens,
      preparo.rendimento > 0 ? gramas / preparo.rendimento : 0,
    ),
  };
}
