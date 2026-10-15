import { cache } from "react";
import { lerCodigo } from "@/lib/domain/convite";
import {
  caminhos,
  VERSAO_SCHEMA,
  type Conta,
  type Convite,
  type EstadoDoBeta,
} from "@/lib/types";
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
 *
 * Nesses três casos devolve o próprio `BETA_PADRAO`, e a `PortaDoBeta` (spec
 * 184) compara por referência para não dizer um número que ninguém leu. Uma
 * leitura por requisição (`cache`): a página e as portas dela leem juntas.
 */
export const lerBeta = cache(async (): Promise<EstadoDoBeta> => {
  if (!credencialDisponivel()) return BETA_PADRAO;
  try {
    const snap = await adminDb().doc(caminhos.plataformaBeta).get();
    return comoEstadoDoBeta(snap.data() as Partial<EstadoDoBeta> | undefined);
  } catch {
    return BETA_PADRAO;
  }
});

/** O convite e quem o mandou, como a página `/convite/{codigo}` precisa. */
export interface ConviteLido {
  convite: Pick<Convite, "status" | "paraQuem"> | null;
  /** A conta de quem convida. `null` quando o convite não existe. */
  conta: Pick<Conta, "status" | "proprietaria" | "nome"> | null;
}

const NADA: ConviteLido = { convite: null, conta: null };

/**
 * O convite pelo grupo de coleção (spec 183), e a conta de quem convida, o avô
 * do documento. Código fora da forma, servidor sem credencial ou leitura que
 * falha: nada, e a página diz que o convite não vale.
 */
export async function lerConvite(texto: string): Promise<ConviteLido> {
  const codigo = lerCodigo(texto);
  if (!codigo || !credencialDisponivel()) return NADA;
  try {
    const achados = await adminDb()
      .collectionGroup(caminhos.grupoConvites)
      .where("codigo", "==", codigo)
      .limit(1)
      .get();
    const doc = achados.docs[0];
    const dona = doc?.ref.parent.parent;
    if (!doc || !dona) return NADA;
    const conta = (await dona.get()).data() as Conta | undefined;
    const convite = doc.data() as Convite;
    return {
      convite: { status: convite.status, paraQuem: convite.paraQuem },
      conta: conta
        ? {
            status: conta.status,
            proprietaria: conta.proprietaria,
            nome: conta.nome,
          }
        : null,
    };
  } catch {
    return NADA;
  }
}
