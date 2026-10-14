import type { DataISO } from "@/lib/types/common";

/**
 * As referências dos termos e da privacidade viram link no render (spec 165),
 * sem JSX dentro das cláusulas: o texto continua string, e esta função o
 * corta em pedaços. "seção N" aponta para `#secao-N`; os demais trechos são
 * literais que a página passa (o e-mail, os sites, o outro documento).
 */
export type PedacoDeTexto =
  | { tipo: "texto"; texto: string }
  | { tipo: "link"; texto: string; href: string; novaAba: boolean };

export interface TrechoComLink {
  trecho: string;
  href: string;
  novaAba?: boolean;
}

const SECAO = /^seção (\d+)$/;

function escapar(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fatiarReferencias(
  texto: string,
  trechos: readonly TrechoComLink[] = [],
): PedacoDeTexto[] {
  // O mais longo primeiro: um trecho contido em outro não rouba o casamento.
  const literais = [...trechos].sort(
    (a, b) => b.trecho.length - a.trecho.length,
  );
  const padrao = new RegExp(
    ["seção \\d+", ...literais.map((t) => escapar(t.trecho))].join("|"),
    "g",
  );

  const pedacos: PedacoDeTexto[] = [];
  let desde = 0;
  for (const casamento of texto.matchAll(padrao)) {
    const achado = casamento[0];
    const inicio = casamento.index;
    if (inicio > desde) {
      pedacos.push({ tipo: "texto", texto: texto.slice(desde, inicio) });
    }
    const secao = SECAO.exec(achado);
    const literal = literais.find((t) => t.trecho === achado);
    pedacos.push({
      tipo: "link",
      texto: achado,
      href: secao ? `#secao-${secao[1]}` : literal!.href,
      novaAba: secao ? false : (literal!.novaAba ?? false),
    });
    desde = inicio + achado.length;
  }
  if (desde < texto.length) {
    pedacos.push({ tipo: "texto", texto: texto.slice(desde) });
  }
  return pedacos;
}

/**
 * Uma versão dos termos ou da privacidade (spec 166, `DECISOES.md#d380`).
 * `mudou` é "Assunto: o que mudou", e cita "seção N" quando fala de uma.
 * `relevante` segue o critério da última seção de cada texto: novo tipo de
 * dado, novo fornecedor, nova finalidade, preço, ou o que afete direito.
 */
export interface Versao {
  em: DataISO;
  mudou: string;
  relevante: boolean;
}

/** Da mais antiga para a mais nova; a última é a que vale. */
export const VERSOES_PRIVACIDADE: readonly Versao[] = [
  { em: "2026-09-24", mudou: "Primeira versão.", relevante: false },
  {
    em: "2026-09-25",
    mudou: "Entrar com o Google: o que o Google entrega ao Rende (seção 3).",
    relevante: false,
  },
  {
    em: "2026-10-10",
    mudou:
      "A taxa de entrega pelo CEP: o CEP vai à ViaCEP e ao Google Maps (seção 5).",
    relevante: true,
  },
];

export const VERSOES_TERMOS: readonly Versao[] = [
  { em: "2026-09-24", mudou: "Primeira versão.", relevante: false },
];

/**
 * O que toda conta sem `termosVersao` aceitou: ausência é significado
 * (`#d141`), sem migração.
 */
export const PRIMEIRA_VERSAO: DataISO = "2026-09-24";

export function versaoAtual(versoes: readonly Versao[]): DataISO {
  return versoes.at(-1)!.em;
}

/** O aceite é de um par: a versão mais nova das duas cobre as duas. */
export const VERSAO_DO_ACEITE: DataISO = [
  versaoAtual(VERSOES_TERMOS),
  versaoAtual(VERSOES_PRIVACIDADE),
].reduce((a, b) => (a > b ? a : b));

/** A mudança relevante mais recente depois de `aceita`, se houver. */
export function mudancaParaAvisar(
  versoes: readonly Versao[],
  aceita: DataISO,
): Versao | undefined {
  for (let i = versoes.length - 1; i >= 0; i--) {
    const versao = versoes[i]!;
    if (versao.em <= aceita) return undefined;
    if (versao.relevante) return versao;
  }
  return undefined;
}

/** "A taxa de entrega pelo CEP: …" → "a taxa de entrega pelo CEP". */
export function assuntoDaMudanca(versao: Versao): string {
  const assunto = versao.mudou.split(":")[0]!.replace(/\.$/, "");
  return assunto.charAt(0).toLowerCase() + assunto.slice(1);
}
