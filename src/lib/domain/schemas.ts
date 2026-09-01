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

/** Um mês tem 744 horas no maior dos casos. Acima disso é dedo errado. */
const HORAS_MAXIMAS_MES = 744;

export const esquemaFormaPagamento = z.object({
  nome: z.string().trim().min(2, "Dê um nome a esta forma de pagamento."),
  tipo: z.enum([
    "PIX",
    "DINHEIRO",
    "DEBITO",
    "CREDITO",
    "CREDITO_PARCELADO",
    "TRANSFERENCIA",
  ]),
  taxaPercentual: z
    .number()
    .min(0, "A taxa não pode ser negativa.")
    .max(99, "Uma taxa de 100% não deixaria nada para você."),
  taxaFixa: z.number().int().min(0, "A taxa fixa não pode ser negativa."),
  prazoRecebimentoDias: z
    .number()
    .int("O prazo é em dias inteiros.")
    .min(0, "O prazo não pode ser negativo.")
    .max(365, "Um prazo maior que um ano não é forma de pagamento."),
});

export type EntradaFormaPagamento = z.infer<typeof esquemaFormaPagamento>;

/**
 * Os cinco blocos da tela de configuração em um esquema só, porque eles são
 * gravados juntos em um documento só.
 */
export const esquemaConfiguracao = z.object({
  valorHoraTrabalho: z
    .number()
    .int()
    .min(0, "O valor da sua hora não pode ser negativo."),
  horasProdutivasMes: z
    .number()
    .min(0, "As horas não podem ser negativas.")
    .max(HORAS_MAXIMAS_MES, "Um mês inteiro tem 744 horas."),
  custoEnergiaHora: z.number().int().min(0, "A energia não pode ser negativa."),
  custoGasHora: z.number().int().min(0, "O gás não pode ser negativo."),
  despesasFixasMensais: z
    .number()
    .int()
    .min(0, "As despesas fixas não podem ser negativas."),
  metodoPadrao: z.enum(["MARKUP", "MARGEM"]),
  markupPadrao: z
    .number()
    .min(1, "Multiplicar por menos de 1 é vender por menos do que custa.")
    .max(20, "Multiplicar por mais de 20 não é preço, é engano."),
  margemPadrao: z
    .number()
    .min(0, "A margem não pode ser negativa.")
    .max(95, "Uma margem de 100% deixaria o preço infinito."),
  outrasTaxasPadrao: z
    .number()
    .min(0, "As taxas não podem ser negativas.")
    .max(95, "Taxas acima de 95% do preço não sobram para ninguém."),
  arredondamento: z.enum(["NENHUM", "CENTAVO_90", "REAL_INTEIRO", "MEIO_REAL"]),
});

export type EntradaConfiguracao = z.infer<typeof esquemaConfiguracao>;

/** Converte as falhas do zod em um mapa campo → primeira mensagem. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? "");
    if (campo && !mapa[campo]) mapa[campo] = problema.message;
  }
  return mapa;
}
