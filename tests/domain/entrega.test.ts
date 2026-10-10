import { describe, expect, it } from "vitest";
import {
  distanciaKm,
  esquemaEntrega,
  limparCep,
  taxaDeEntrega,
} from "@/lib/domain/entrega";
import type { RegraDeEntrega } from "@/lib/types";

// Spec 118, `DECISOES.md#d321`.

const ORIGEM = { cep: "50000000", lat: 0, lng: 0 };
/** Um grau de latitude é 111,19 km: `km / 111.19` graus ao norte da origem. */
const aoNorte = (km: number) => ({ lat: km / 111.19, lng: 0 });

const REGRA: RegraDeEntrega = {
  origem: ORIGEM,
  raioKm: 8,
  faixas: [
    { ateKm: 3, taxa: 500 },
    { ateKm: 6, taxa: 800 },
    { ateKm: 8, taxa: 1200 },
  ],
  bairros: [
    { nome: "Candeias", taxa: null },
    { nome: "Espinheiro", taxa: 700 },
  ],
};

describe("distanciaKm", () => {
  it("dá 111,2 km para um grau de latitude", () => {
    expect(distanciaKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBe(111.2);
  });

  it("dá o mesmo nos dois sentidos, e zero no mesmo ponto", () => {
    const recife = { lat: -8.0476, lng: -34.877 };
    const olinda = { lat: -8.0089, lng: -34.8553 };
    expect(distanciaKm(recife, olinda)).toBe(distanciaKm(olinda, recife));
    expect(distanciaKm(recife, olinda)).toBeCloseTo(4.9, 0);
    expect(distanciaKm(recife, recife)).toBe(0);
  });
});

describe("taxaDeEntrega", () => {
  it("cobra pela primeira faixa que cabe", () => {
    expect(taxaDeEntrega(REGRA, { coordenadas: aoNorte(4.2) })).toEqual({
      tipo: "taxa",
      taxa: 800,
      porque: { km: 4.2, ateKm: 6 },
    });
  });

  it("põe na faixa quem está exatamente na fronteira", () => {
    expect(taxaDeEntrega(REGRA, { coordenadas: aoNorte(3) })).toMatchObject({
      taxa: 500,
    });
  });

  it("não entrega além do raio, e entrega no raio", () => {
    expect(taxaDeEntrega(REGRA, { coordenadas: aoNorte(8.1) })).toEqual({
      tipo: "fora",
      porque: { km: 8.1 },
    });
    expect(taxaDeEntrega(REGRA, { coordenadas: aoNorte(8) })).toMatchObject({
      taxa: 1200,
    });
  });

  it("deixa a última faixa ir até o raio", () => {
    const regra = { ...REGRA, raioKm: 10 };
    expect(taxaDeEntrega(regra, { coordenadas: aoNorte(9.5) })).toMatchObject({
      taxa: 1200,
    });
  });

  it("olha o bairro antes da distância, sem acento nem caixa", () => {
    expect(
      taxaDeEntrega(REGRA, { bairro: "ESPINHÊIRO", coordenadas: aoNorte(1) }),
    ).toEqual({ tipo: "taxa", taxa: 700, porque: { bairro: "Espinheiro" } });
  });

  it("não entrega no bairro com `null`, mesmo perto", () => {
    expect(
      taxaDeEntrega(REGRA, { bairro: "candeias", coordenadas: aoNorte(1) }),
    ).toEqual({ tipo: "fora", porque: { bairro: "Candeias" } });
  });

  it("vale o bairro mesmo sem coordenada", () => {
    expect(taxaDeEntrega(REGRA, { bairro: "Candeias" }).tipo).toBe("fora");
  });

  it("fica a combinar quando falta dado", () => {
    expect(taxaDeEntrega(REGRA, { bairro: "Boa Viagem" })).toEqual({
      tipo: "a-combinar",
    });
    const semOrigem = { ...REGRA, origem: undefined };
    expect(taxaDeEntrega(semOrigem, { coordenadas: aoNorte(1) }).tipo).toBe(
      "a-combinar",
    );
  });
});

describe("esquemaEntrega", () => {
  it("aceita a regra do roteiro", () => {
    expect(esquemaEntrega.safeParse(REGRA).success).toBe(true);
  });

  it("recusa faixa fora de ordem", () => {
    const regra = {
      ...REGRA,
      faixas: [
        { ateKm: 6, taxa: 800 },
        { ateKm: 3, taxa: 500 },
      ],
    };
    expect(esquemaEntrega.safeParse(regra).success).toBe(false);
  });

  it("recusa taxa negativa ou quebrada", () => {
    for (const taxa of [-100, 5.5]) {
      const regra = { ...REGRA, faixas: [{ ateKm: 8, taxa }] };
      expect(esquemaEntrega.safeParse(regra).success).toBe(false);
    }
  });

  it("recusa raio menor que a primeira faixa", () => {
    expect(esquemaEntrega.safeParse({ ...REGRA, raioKm: 2 }).success).toBe(
      false,
    );
  });

  it("recusa mais de cinco faixas e nenhuma", () => {
    const seis = [1, 2, 3, 4, 5, 6].map((ateKm) => ({ ateKm, taxa: 100 }));
    expect(esquemaEntrega.safeParse({ ...REGRA, faixas: seis }).success).toBe(
      false,
    );
    expect(esquemaEntrega.safeParse({ ...REGRA, faixas: [] }).success).toBe(
      false,
    );
  });

  it("recusa o mesmo bairro duas vezes", () => {
    const bairros = [
      { nome: "Candeias", taxa: null },
      { nome: "candêias", taxa: 500 },
    ];
    expect(esquemaEntrega.safeParse({ ...REGRA, bairros }).success).toBe(false);
  });
});

describe("limparCep", () => {
  it("aceita com e sem máscara, e só com 8 dígitos", () => {
    expect(limparCep("50.010-000")).toBe("50010000");
    expect(limparCep("50010000")).toBe("50010000");
    expect(limparCep("5001000")).toBeNull();
  });
});
