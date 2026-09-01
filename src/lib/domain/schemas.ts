import { z } from "zod";
import { PERDA_MAXIMA } from "./custoInsumo";

/** Mensagens na língua da confeitaria, não na do validador. */
export const esquemaInsumo = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao insumo."),
  categoria: z.enum([
    "INGREDIENTE",
    "EMBALAGEM",
    "ETIQUETA",
    "ARMAZENAMENTO",
    "OUTRO",
  ]),
  precoCompra: z
    .number()
    .int()
    .positive("Informe quanto você pagou pela embalagem."),
  quantidadeCompra: z.number().positive("Informe quanto vem na embalagem."),
  unidadeCompra: z.enum(["kg", "g", "l", "ml", "un"]),
  perdaPercentual: z
    .number()
    .min(0, "A perda não pode ser negativa.")
    .max(PERDA_MAXIMA, `A perda precisa ser menor que ${PERDA_MAXIMA + 1}%.`),
  marca: z.string().trim().optional(),
  fornecedor: z.string().trim().optional(),
  estoqueAtual: z.number().min(0).optional(),
  estoqueMinimo: z.number().min(0).optional(),
});

export type EntradaInsumo = z.infer<typeof esquemaInsumo>;

/** Converte as falhas do zod em um mapa campo → primeira mensagem. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? "");
    if (campo && !mapa[campo]) mapa[campo] = problema.message;
  }
  return mapa;
}
