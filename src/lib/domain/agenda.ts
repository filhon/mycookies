import type { DataISO, StatusPedido } from "@/lib/types";
import { diaVizinho } from "./datas";

/**
 * "Pôr na agenda do celular" (spec 172): o `.ics` de um pedido com data por
 * vir, para a agenda do aparelho da cliente, seja qual for.
 */

/** Fora do orçamento, não cancelado, não entregue, e o dia é hoje ou depois. */
export function vaiParaAgenda(
  pedido: { status: StatusPedido; dataEntregaISO: DataISO },
  hojeISO: DataISO,
): boolean {
  return (
    pedido.status !== "ORCAMENTO" &&
    pedido.status !== "CANCELADO" &&
    pedido.status !== "ENTREGUE" &&
    pedido.dataEntregaISO >= hojeISO
  );
}

export interface EventoDoPedido {
  pedidoId: string;
  codigo: string;
  loja: string;
  tipo: "RETIRADA" | "ENTREGA";
  dataISO: DataISO;
  /** "HH:MM". Sem ela, o evento é de dia inteiro. */
  hora?: string;
  /** O endereço da retirada ou o da entrega. */
  local?: string;
  /** O link do acompanhamento, inteiro. */
  link: string;
  /** O `DTSTAMP`: quando o arquivo foi gerado. */
  agora: Date;
}

/** Vírgula, ponto e vírgula, barra invertida e quebra de linha (RFC 5545 §3.3.11). */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Linha de até 75 octetos; o resto continua na seguinte, com um espaço (§3.1). */
function dobrar(linha: string): string {
  const partes: string[] = [];
  let atual = "";
  let octetos = 0;
  const limite = () => (partes.length === 0 ? 75 : 74);
  for (const letra of linha) {
    const tamanho = new TextEncoder().encode(letra).length;
    if (octetos + tamanho > limite()) {
      partes.push(atual);
      atual = "";
      octetos = 0;
    }
    atual += letra;
    octetos += tamanho;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

/** `2026-10-18T18:00:00.000Z` → `20261018T180000Z`. */
function emUtc(data: Date): string {
  return data
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

const semTraco = (iso: DataISO) => iso.replace(/-/g, "");

export function eventoDoPedido(evento: EventoDoPedido): string {
  const resumo =
    evento.tipo === "RETIRADA"
      ? `Retirar na ${evento.loja}`
      : `Entrega da ${evento.loja}`;
  // Brasília é UTC−3 fixo desde 2019 (`DECISOES.md#d160`).
  const inicio = evento.hora
    ? new Date(`${evento.dataISO}T${evento.hora}:00-03:00`)
    : undefined;
  const [h, m] = (evento.hora ?? "00:00").split(":").map(Number);
  // Às 9h da véspera, contado do início: o dia inteiro começa à meia-noite
  // de quem abre, então a mesma conta vale para os dois.
  const antes = 24 * 60 - 9 * 60 + h! * 60 + m!;

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rende//Pedido//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // O mesmo pedido baixado duas vezes atualiza o evento, e não duplica.
    `UID:${evento.pedidoId}@rende`,
    `DTSTAMP:${emUtc(evento.agora)}`,
    ...(inicio
      ? [
          `DTSTART:${emUtc(inicio)}`,
          `DTEND:${emUtc(new Date(inicio.getTime() + 60 * 60 * 1000))}`,
        ]
      : [
          `DTSTART;VALUE=DATE:${semTraco(evento.dataISO)}`,
          `DTEND;VALUE=DATE:${semTraco(diaVizinho(evento.dataISO, 1))}`,
        ]),
    `SUMMARY:${escapar(resumo)}`,
    ...(evento.local?.trim()
      ? [`LOCATION:${escapar(evento.local.trim())}`]
      : []),
    // Nada de itens nem valores: o arquivo vai parar em agenda compartilhada.
    `DESCRIPTION:${escapar(`Pedido ${evento.codigo}. Acompanhe: ${evento.link}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(`Amanhã: ${resumo}`)}`,
    `TRIGGER:-PT${antes}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
