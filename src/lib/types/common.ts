import type { Timestamp } from "firebase/firestore";

/**
 * Valor monetário SEMPRE em centavos inteiros.
 * Nunca usar `number` decimal para dinheiro (0.1 + 0.2 !== 0.3).
 * Formatação para exibição acontece só na borda da UI (lib/utils/format.ts).
 */
export type Centavos = number;

/**
 * Custo unitário em centavos por unidade base (g/ml/un).
 * Aceita casas decimais porque 1 grama de farinha custa fração de centavo.
 * Só é arredondado para `Centavos` quando vira total de linha ou de receita.
 */
export type CentavosFracionados = number;

/** Percentual na escala humana: 35 = 35%. Nunca 0.35. */
export type Percentual = number;

/** 'YYYY-MM' — chave de competência mensal e id dos documentos de agregado. */
export type CompetenciaMensal = string;

/** 'YYYY-MM-DD' — data sem fuso, para filtros e agrupamentos locais. */
export type DataISO = string;

/** Unidades canônicas em que TODO custo é normalizado antes de qualquer cálculo. */
export type UnidadeBase = "g" | "ml" | "un";

/** Como a Maynara efetivamente compra o insumo no mercado. */
export type UnidadeCompra = "kg" | "g" | "l" | "ml" | "un";

/** Fatores de conversão para unidade base. Fonte única de verdade. */
export const CONVERSAO_UNIDADE: Record<
  UnidadeCompra,
  { base: UnidadeBase; fator: number }
> = {
  kg: { base: "g", fator: 1000 },
  g: { base: "g", fator: 1 },
  l: { base: "ml", fator: 1000 },
  ml: { base: "ml", fator: 1 },
  un: { base: "un", fator: 1 },
};

/**
 * Campos presentes em todo documento.
 *
 * `id` NÃO é persistido no Firestore — é injetado pelo FirestoreDataConverter
 * a partir de `snapshot.id`. Ao gravar, o converter remove o campo.
 */
export interface DocumentoBase {
  id: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /**
   * Soft delete. Nunca apagamos insumo/ficha de verdade: pedidos antigos
   * referenciam esses ids e o histórico de custo precisa continuar íntegro.
   */
  arquivado: boolean;
}

/** Tipo de escrita: sem `id`, com timestamps resolvidos pelo servidor. */
export type Novo<T extends DocumentoBase> = Omit<
  T,
  "id" | "criadoEm" | "atualizadoEm"
>;
export type Atualizacao<T extends DocumentoBase> = Partial<
  Omit<T, "id" | "criadoEm">
>;
