import { describe, expect, it } from "vitest";
import {
  haNovidade,
  NOVIDADES,
  novidadesRecentes,
  rotuloNovidade,
  type Novidade,
} from "@/components/comecar/novidades";

const de = (dataISO: string): Novidade => ({
  dataISO,
  titulo: dataISO,
  frase: "",
  href: "/fichas",
});

describe("novidadesRecentes", () => {
  it("só as dos 90 dias, no máximo seis", () => {
    const lista = [
      "2026-10-08",
      "2026-10-07",
      "2026-10-06",
      "2026-10-05",
      "2026-10-04",
      "2026-10-03",
      "2026-10-02",
    ].map(de);
    expect(novidadesRecentes("2026-10-08", lista)).toHaveLength(6);
    expect(
      novidadesRecentes("2027-01-05", lista).map((n) => n.dataISO),
    ).toEqual(["2026-10-08", "2026-10-07"]);
    expect(novidadesRecentes("2027-06-01", lista)).toEqual([]);
  });
});

describe("haNovidade", () => {
  it("mais nova que a vista", () => {
    expect(haNovidade("2026-10-08", "2026-10-05", "2026-10-08")).toBe(true);
    expect(haNovidade("2026-10-08", "2026-10-08", "2026-10-08")).toBe(false);
  });

  it("aparelho que nunca viu: só as de até 14 dias", () => {
    expect(haNovidade("2026-10-22", null, "2026-10-08")).toBe(true);
    expect(haNovidade("2026-10-23", null, "2026-10-08")).toBe(false);
  });
});

it("a mais nova primeiro", () => {
  const datas = NOVIDADES.map((n) => n.dataISO);
  expect(datas).toEqual([...datas].sort().reverse());
});

it("“2 out”", () => {
  expect(rotuloNovidade("2026-10-02")).toBe("2 out");
});
