import { z } from "zod";
import type { Centavos, RegraDeEntrega } from "@/lib/types";
import { chaveDeBusca } from "./custoInsumo";

/**
 * A taxa de entrega do cardápio (spec 118, `DECISOES.md#d321`): o bairro
 * primeiro, depois a distância em linha reta, e "a combinar" quando falta dado.
 * Só o `fora` impede um pedido, e ele vem da regra dela, nunca de uma falha do
 * Rende.
 */

export const FAIXAS_MAXIMAS = 5;
export const RAIO_MAXIMO_KM = 100;
export const BAIRROS_MAXIMOS = 30;

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** O endereço do CEP, pelo ViaCEP. */
export interface EnderecoDoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** O que `/api/entrega/medir` devolve à dona (`#d322`). */
export interface MedidaDoCep {
  endereco: EnderecoDoCep | null;
  coordenadas: Coordenadas | null;
  /** O Google respondeu que esse CEP não existe. Falha do serviço é `false`. */
  naoAchado: boolean;
}

/** O que se sabe do CEP da cliente. Sem um dos dois, a regra faz o que dá. */
export interface Destino {
  bairro?: string;
  coordenadas?: Coordenadas;
}

/** O que decidiu. Só o painel da dona mostra: a distância nunca sai (`#d322`). */
export type PorQue = { bairro: string } | { km: number; ateKm?: number };

export type TaxaDeEntrega =
  | { tipo: "taxa"; taxa: Centavos; porque: PorQue }
  | { tipo: "fora"; porque: PorQue }
  | { tipo: "a-combinar" };

/** Raio médio da Terra, em km: 1° de latitude dá 111,19 km. */
const RAIO_DA_TERRA_KM = 6371;

/** Em linha reta, pela haversine, arredondada a 0,1 km. */
export function distanciaKm(de: Coordenadas, ate: Coordenadas): number {
  const rad = (graus: number) => (graus * Math.PI) / 180;
  const dLat = rad(ate.lat - de.lat);
  const dLng = rad(ate.lng - de.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(de.lat)) * Math.cos(rad(ate.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * RAIO_DA_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  return Math.round(km * 10) / 10;
}

export function taxaDeEntrega(
  regra: RegraDeEntrega,
  destino: Destino,
): TaxaDeEntrega {
  // 1. O bairro, que conhece a cidade melhor que a linha reta.
  if (destino.bairro) {
    const chave = chaveDeBusca(destino.bairro);
    const excecao = regra.bairros?.find((b) => chaveDeBusca(b.nome) === chave);
    if (excecao) {
      const porque = { bairro: excecao.nome };
      return excecao.taxa === null
        ? { tipo: "fora", porque }
        : { tipo: "taxa", taxa: excecao.taxa, porque };
    }
  }

  // 2. A distância.
  if (!regra.origem || !destino.coordenadas) return { tipo: "a-combinar" };
  const km = distanciaKm(regra.origem, destino.coordenadas);
  if (km > regra.raioKm) return { tipo: "fora", porque: { km } };
  // A última faixa vai até o raio, mesmo que o `ateKm` dela tenha ficado atrás.
  const faixa = regra.faixas.find((f) => km <= f.ateKm) ?? regra.faixas.at(-1);
  if (!faixa) return { tipo: "a-combinar" };
  return { tipo: "taxa", taxa: faixa.taxa, porque: { km, ateKm: faixa.ateKm } };
}

/** "50.010-000", "50010000" → `"50010000"`; o que não tem 8 dígitos → `null`. */
export function limparCep(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length === 8 ? digitos : null;
}

/** `"50010000"` → `"50010-000"`. */
export function cepFormatado(cep: string): string {
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

/**
 * O que `/api/cardapio/entrega` devolve à cliente (spec 118, sessão B): a taxa
 * ou o `fora`, e o endereço do CEP dela. **Nunca o `porque`**: com três CEPs e
 * as distâncias, dá para achar a casa da dona (`#d322`).
 */
export type TaxaParaCliente =
  | { tipo: "taxa"; taxa: Centavos; endereco: EnderecoDoCep | null }
  | { tipo: "fora" | "a-combinar"; endereco: EnderecoDoCep | null };

export function taxaParaCliente(
  resultado: TaxaDeEntrega,
  endereco: EnderecoDoCep | null,
): TaxaParaCliente {
  return resultado.tipo === "taxa"
    ? { tipo: "taxa", taxa: resultado.taxa, endereco }
    : { tipo: resultado.tipo, endereco };
}

const taxa = z.number().int().min(0);
const km = z.number().positive().max(RAIO_MAXIMO_KM);

export const esquemaEntrega = z
  .object({
    origem: z
      .object({
        cep: z.string().regex(/^\d{8}$/),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    raioKm: km,
    faixas: z
      .array(z.object({ ateKm: km, taxa }))
      .min(1)
      .max(FAIXAS_MAXIMAS),
    bairros: z
      .array(
        z.object({
          nome: z.string().trim().min(1).max(60),
          taxa: taxa.nullable(),
        }),
      )
      .max(BAIRROS_MAXIMOS)
      .optional(),
  })
  .superRefine((regra, contexto) => {
    regra.faixas.forEach((faixa, i) => {
      const anterior = regra.faixas[i - 1];
      if (anterior && faixa.ateKm <= anterior.ateKm) {
        contexto.addIssue({
          code: "custom",
          path: ["faixas", i, "ateKm"],
          message: "fora-de-ordem",
        });
      }
      if (faixa.ateKm > regra.raioKm) {
        contexto.addIssue({
          code: "custom",
          path: ["faixas", i, "ateKm"],
          message: "alem-do-raio",
        });
      }
    });
    const vistos = new Set<string>();
    regra.bairros?.forEach((bairro, i) => {
      const chave = chaveDeBusca(bairro.nome);
      if (vistos.has(chave)) {
        contexto.addIssue({
          code: "custom",
          path: ["bairros", i, "nome"],
          message: "repetido",
        });
      }
      vistos.add(chave);
    });
  });
