import { describe, expect, it } from "vitest";
import {
  competenciaDe,
  competenciaDeISO,
  competenciaVizinha,
  dataDeISO,
  dataISODe,
  diaDeISO,
  diasNoMes,
  diaVizinho,
  rotuloAgenda,
  rotuloCompetencia,
  rotuloMes,
} from "@/lib/domain/datas";

describe("dataISODe e competenciaDe", () => {
  it("lê a data pelo relógio local, não por UTC", () => {
    // Meia-noite e cinco do dia 1º. Em qualquer fuso a oeste de Greenwich,
    // converter por UTC jogaria isso para o dia anterior — e, no dia 1º, para
    // a competência anterior. É o erro que este módulo existe para não cometer.
    const virada = new Date(2026, 8, 1, 0, 5);

    expect(dataISODe(virada)).toBe("2026-09-01");
    expect(competenciaDe(virada)).toBe("2026-09");
  });

  it("preenche mês e dia com dois dígitos", () => {
    expect(dataISODe(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("dataDeISO", () => {
  it("volta para o mesmo dia local de onde saiu", () => {
    const data = dataDeISO("2026-09-03");

    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(8);
    expect(data.getDate()).toBe(3);
    expect(dataISODe(data)).toBe("2026-09-03");
  });
});

describe("recortes do ISO", () => {
  it("separa competência e dia", () => {
    expect(competenciaDeISO("2026-09-03")).toBe("2026-09");
    expect(diaDeISO("2026-09-03")).toBe("03");
    expect(diaDeISO("2026-09-30")).toBe("30");
  });
});

describe("diasNoMes", () => {
  it("conta os dias de cada mês, inclusive fevereiro bissexto", () => {
    expect(diasNoMes("2026-09")).toBe(30);
    expect(diasNoMes("2026-01")).toBe(31);
    expect(diasNoMes("2026-02")).toBe(28);
    expect(diasNoMes("2028-02")).toBe(29);
  });
});

describe("competenciaVizinha", () => {
  it("anda um mês para cada lado", () => {
    expect(competenciaVizinha("2026-09", 1)).toBe("2026-10");
    expect(competenciaVizinha("2026-09", -1)).toBe("2026-08");
  });

  it("vira o ano nos dois sentidos", () => {
    expect(competenciaVizinha("2026-12", 1)).toBe("2027-01");
    expect(competenciaVizinha("2026-01", -1)).toBe("2025-12");
  });
});

describe("diaVizinho", () => {
  it("anda um dia para cada lado", () => {
    expect(diaVizinho("2026-09-15", 1)).toBe("2026-09-16");
    expect(diaVizinho("2026-09-15", -1)).toBe("2026-09-14");
  });

  it("vira o mês e o ano sem passar por UTC", () => {
    expect(diaVizinho("2026-09-30", 1)).toBe("2026-10-01");
    expect(diaVizinho("2026-01-01", -1)).toBe("2025-12-31");
    expect(diaVizinho("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("rotuloAgenda", () => {
  it("fala do dia dela como ela fala", () => {
    expect(rotuloAgenda("2026-09-15", "2026-09-15")).toBe("Hoje");
    expect(rotuloAgenda("2026-09-16", "2026-09-15")).toBe("Amanhã");
    expect(rotuloAgenda("2026-09-14", "2026-09-15")).toBe("Ontem");
  });

  it("escreve o dia da semana por extenso quando está mais longe", () => {
    expect(rotuloAgenda("2026-09-20", "2026-09-15")).toBe(
      "Domingo, 20 de setembro",
    );
  });
});

describe("rotuloCompetencia", () => {
  it("escreve o mês por extenso em português", () => {
    expect(rotuloCompetencia("2026-09")).toBe("setembro de 2026");
  });

  it("escreve o mês sozinho para caber dentro de uma frase", () => {
    expect(rotuloMes("2026-09")).toBe("setembro");
    expect(rotuloMes("2026-01")).toBe("janeiro");
  });
});
