import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { esquemaApelido, type FalhaApelido } from "@/lib/domain/cardapio";
import {
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA } from "@/lib/types";

/**
 * O endereço do cardápio (spec 116, `DECISOES.md#d319`): grava
 * `apelidos/{apelido}` e o espelho `Conta.apelido`, e arquiva o anterior sem
 * apagá-lo, que continua levando à loja e não vai para outra conta.
 *
 * Numa transação do Admin SDK: é servidor, não o aparelho offline, e duas
 * lojas pedindo o mesmo apelido no mesmo segundo é o caso que ela resolve.
 * Idempotente: pedir o apelido que já é o atual não escreve nada.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaApelido, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

async function comoJson(requisicao: Request): Promise<unknown> {
  try {
    return await requisicao.json();
  } catch {
    return null;
  }
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaApelido.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, apelido } = corpo.data;

  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const db = adminDb();
  const refConta = db.doc(caminhos.conta(contaId));
  const refNovo = db.doc(caminhos.apelido(apelido));
  // `/c/{x}` tenta o apelido antes do `contaId`: um apelido igual ao id de
  // outra conta tomaria o link antigo dela.
  const refHomonima = db.doc(caminhos.conta(apelido));

  const resultado = await db.runTransaction(async (tx) => {
    const [conta, novo, homonima] = await Promise.all([
      tx.get(refConta),
      tx.get(refNovo),
      tx.get(refHomonima),
    ]);
    if (!conta.exists) return "fora-de-forma" as const;
    if (novo.exists && novo.get("contaId") !== contaId) return "ocupado";
    if (apelido !== contaId && homonima.exists) return "ocupado";

    const anterior = conta.get("apelido") as string | undefined;
    if (anterior === apelido) return null;

    // Retomar um apelido arquivado desta conta é o mesmo gesto.
    tx.set(
      refNovo,
      novo.exists
        ? { arquivado: false, v: VERSAO_SCHEMA }
        : {
            contaId,
            criadoEm: Timestamp.now(),
            arquivado: false,
            v: VERSAO_SCHEMA,
          },
      { merge: true },
    );
    if (anterior) {
      tx.set(
        db.doc(caminhos.apelido(anterior)),
        { arquivado: true, v: VERSAO_SCHEMA },
        { merge: true },
      );
    }
    tx.update(refConta, { apelido, v: VERSAO_SCHEMA });
    return null;
  });

  if (resultado === "ocupado") return falha("ocupado", 409);
  if (resultado) return falha(resultado, 400);
  return NextResponse.json({ apelido });
}
