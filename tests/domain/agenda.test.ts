import { describe, expect, it } from "vitest";
import { eventoDoPedido, type EventoDoPedido } from "@/lib/domain/agenda";

// Spec 172.

const EVENTO: EventoDoPedido = {
  pedidoId: "abc123",
  codigo: "P-261018-K3F",
  loja: "MyCookie's",
  tipo: "RETIRADA",
  dataISO: "2026-10-18",
  hora: "15:00",
  local: "Rua das Flores, 120; casa 2",
  link: "https://rende.app/c/mycookies/pedido/abc123/chave",
  agora: new Date("2026-10-15T12:34:56.789Z"),
};

/** As linhas desdobradas, como um leitor de agenda as vê. */
const linhas = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("eventoDoPedido", () => {
  it("com hora: o início em UTC (Brasília +3), uma hora de duração", () => {
    const ics = eventoDoPedido(EVENTO);
    const l = linhas(ics);
    expect(l).toContain("DTSTART:20261018T180000Z");
    expect(l).toContain("DTEND:20261018T190000Z");
    expect(l).toContain("DTSTAMP:20261015T123456Z");
    expect(l).toContain("SUMMARY:Retirar na MyCookie's");
    expect(l).toContain("UID:abc123@rende");
    expect(l[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("sem hora: o dia inteiro", () => {
    const l = linhas(eventoDoPedido({ ...EVENTO, hora: undefined }));
    expect(l).toContain("DTSTART;VALUE=DATE:20261018");
    expect(l).toContain("DTEND;VALUE=DATE:20261019");
    // Meia-noite menos 15 horas: 9h da véspera.
    expect(l).toContain("TRIGGER:-PT900M");
  });

  it("o aviso às 9h da véspera", () => {
    const l = linhas(eventoDoPedido(EVENTO));
    // 15h do dia menos 30 horas = 9h do dia anterior.
    expect(l).toContain("TRIGGER:-PT1800M");
    expect(l).toContain("DESCRIPTION:Amanhã: Retirar na MyCookie's");
    expect(l.indexOf("BEGIN:VALARM")).toBeLessThan(l.indexOf("END:VALARM"));
  });

  it("escapa vírgula, ponto e vírgula e quebra de linha", () => {
    const l = linhas(
      eventoDoPedido({ ...EVENTO, local: "Rua A, 1;\nfundos\\portão" }),
    );
    expect(l).toContain("LOCATION:Rua A\\, 1\\;\\nfundos\\\\portão");
  });

  it("a descrição só com o código e o link, nada de itens nem valores", () => {
    const l = linhas(eventoDoPedido(EVENTO));
    expect(l).toContain(
      "DESCRIPTION:Pedido P-261018-K3F. Acompanhe: https://rende.app/c/mycookies/pedido/abc123/chave",
    );
  });

  it("a entrega: outro resumo, e sem local quando não há", () => {
    const l = linhas(
      eventoDoPedido({ ...EVENTO, tipo: "ENTREGA", local: undefined }),
    );
    expect(l).toContain("SUMMARY:Entrega da MyCookie's");
    expect(l.some((linha) => linha.startsWith("LOCATION"))).toBe(false);
  });

  it("linhas em CRLF de até 75 octetos, o mesmo UID a cada download", () => {
    const ics = eventoDoPedido({
      ...EVENTO,
      local:
        "Avenida Conselheiro Aguiar, 4000, apartamento 1201, Boa Viagem, Recife, Pernambuco",
    });
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    for (const linha of ics.split("\r\n")) {
      expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
    }
    const outro = eventoDoPedido({ ...EVENTO, agora: new Date() });
    expect(linhas(outro)).toContain("UID:abc123@rende");
  });
});
