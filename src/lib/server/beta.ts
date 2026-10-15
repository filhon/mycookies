import { caminhos, VERSAO_SCHEMA, type EstadoDoBeta } from "@/lib/types";
import { adminDb, credencialDisponivel } from "./firebaseAdmin";

/** O que vale sem o documento: a porta fechada (spec 181). */
export const BETA_PADRAO: EstadoDoBeta = {
  fase: "BETA",
  vagas: 100,
  ocupadas: 0,
  espera: 0,
  pesquisas: 0,
  v: VERSAO_SCHEMA,
};

/**
 * Converte o `plataforma/beta` cru no estado, campo a campo sobre o padrão:
 * um documento semeado pela metade continua com a porta fechada.
 */
export function comoEstadoDoBeta(
  dado: Partial<EstadoDoBeta> | undefined,
): EstadoDoBeta {
  return { ...BETA_PADRAO, ...dado };
}

/**
 * A fase e as vagas. Documento ausente, servidor sem credencial (o build
 * local) ou leitura que falha: `BETA` com 100 vagas e nenhuma ocupada. Errar
 * para a porta fechada; quem abre é a transação, que lê de novo.
 */
export async function lerBeta(): Promise<EstadoDoBeta> {
  if (!credencialDisponivel()) return BETA_PADRAO;
  try {
    const snap = await adminDb().doc(caminhos.plataformaBeta).get();
    return comoEstadoDoBeta(snap.data() as Partial<EstadoDoBeta> | undefined);
  } catch {
    return BETA_PADRAO;
  }
}
