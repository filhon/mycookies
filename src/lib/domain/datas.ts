import type { CompetenciaMensal, DataISO } from "@/lib/types";

/**
 * Data no fuso do aparelho, e nunca em UTC.
 *
 * É a decisão que este módulo inteiro protege. `new Date('2026-09-03')` é lido
 * como meia-noite UTC, o que no Brasil cai no dia 2 às 21h: um lançamento feito
 * no dia 3 apareceria no dia 2, e uma venda do dia 1º mudaria de competência.
 * Toda conversão daqui monta e lê a data pelos componentes locais.
 *
 * Não usa `date-fns`: o que o caixa precisa é recortar 'YYYY-MM-DD', contar os
 * dias de um mês e escrever o nome dele em português. O primeiro é `slice`, o
 * segundo é o dia zero do mês seguinte, e o terceiro é `Intl` — que já está no
 * navegador e conhece o idioma. Ver `DECISOES.md#d26`.
 */

const NOME_DO_MES = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const NOME_CURTO_DO_MES = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
});

const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** 'YYYY-MM-DD' do dia em que a data cai, no relógio de quem está usando. */
export function dataISODe(data: Date): DataISO {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(
    data.getDate(),
  )}`;
}

/** 'YYYY-MM' — a competência a que a data pertence. */
export function competenciaDe(data: Date): CompetenciaMensal {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}`;
}

/** A competência de uma data já em ISO. É o recorte, não uma nova conta. */
export function competenciaDeISO(iso: DataISO): CompetenciaMensal {
  return iso.slice(0, 7);
}

/** '03' — a chave do dia dentro de `porDia`. */
export function diaDeISO(iso: DataISO): string {
  return iso.slice(8, 10);
}

/** Reconstrói a data local a partir do ISO, sem passar por UTC. */
export function dataDeISO(iso: DataISO): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

/** O mês corrente, que é o que a tela de caixa abre por padrão. */
export function competenciaAtual(agora: Date = new Date()): CompetenciaMensal {
  return competenciaDe(agora);
}

/** Quantos dias tem a competência. O dia 0 do mês seguinte é o último deste. */
export function diasNoMes(competencia: CompetenciaMensal): number {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Date(ano ?? 1970, mes ?? 1, 0).getDate();
}

/**
 * A competência `passo` meses adiante (ou atrás, com passo negativo).
 * `Date` normaliza o mês 12 para janeiro do ano seguinte sozinho.
 */
export function competenciaVizinha(
  competencia: CompetenciaMensal,
  passo: number,
): CompetenciaMensal {
  const [ano, mes] = competencia.split("-").map(Number);
  return competenciaDe(new Date(ano ?? 1970, (mes ?? 1) - 1 + passo, 1));
}

/** 'setembro de 2026' — o mês por extenso, para o seletor. */
export function rotuloCompetencia(competencia: CompetenciaMensal): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return NOME_DO_MES.format(new Date(ano ?? 1970, (mes ?? 1) - 1, 1));
}

/** 'set. de 2026' — o mesmo mês onde a largura é curta. */
export function rotuloCompetenciaCurto(competencia: CompetenciaMensal): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return NOME_CURTO_DO_MES.format(new Date(ano ?? 1970, (mes ?? 1) - 1, 1));
}

/** '03 de set.' — o dia de um lançamento na lista. */
export function rotuloDia(iso: DataISO): string {
  return DIA_E_MES.format(dataDeISO(iso));
}
