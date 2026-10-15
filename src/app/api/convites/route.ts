import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  convitesLivres,
  esquemaCancelarConvite,
  esquemaNovoConvite,
  gerarCodigo,
  lerCodigo,
  type FalhaDoConvite,
} from "@/lib/domain/convite";
import {
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA, type Conta } from "@/lib/types";

/**
 * Os convites que a fundadora cria e cancela (spec 183). O convite nasce
 * quando ela toca, e não semeado. Só daqui o cliente escreve em `convites`,
 * que as regras deixam só ao servidor (`DECISOES.md#d399`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Colisão em ~39 bits é rara; três sorteios bastam, e o quarto é um bug. */
const SORTEIOS = 3;

function falha(codigo: FalhaDoConvite, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

async function comoJson(requisicao: Request): Promise<unknown> {
  try {
    return await requisicao.json();
  } catch {
    return null;
  }
}

/** A cota fora do limite, dentro da transação. */
class SemCota extends Error {}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaNovoConvite.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, paraQuem } = corpo.data;
  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const db = adminDb();
  const conta = db.doc(caminhos.conta(contaId));
  const seus = db.collection(caminhos.convites(contaId));

  // Na transação do servidor, como a troca (`#d400`): dois toques ao mesmo
  // tempo na última vaga da cota não criam o sexto convite.
  try {
    const codigo = await db.runTransaction(async (tx) => {
      const cota = ((await tx.get(conta)).data() as Conta | undefined)?.beta
        ?.convites;
      if (!cota) throw new SemCota();
      const existentes = (await tx.get(seus)).docs.map((d) => d.data());
      if (convitesLivres(cota, existentes as { status: string }[]) === 0) {
        throw new SemCota();
      }

      for (let i = 0; i < SORTEIOS; i++) {
        const sorteado = gerarCodigo((bytes) => randomBytes(bytes.length));
        const igual = await tx.get(
          db
            .collectionGroup(caminhos.grupoConvites)
            .where("codigo", "==", sorteado)
            .limit(1),
        );
        if (!igual.empty) continue;
        tx.create(seus.doc(sorteado), {
          codigo: sorteado,
          ...(paraQuem && { paraQuem }),
          status: "ABERTO",
          criadoEm: Timestamp.now(),
          v: VERSAO_SCHEMA,
        });
        return sorteado;
      }
      throw new Error("Três códigos sorteados já existiam.");
    });
    return NextResponse.json({ codigo });
  } catch (erro) {
    if (erro instanceof SemCota) return falha("sem-cota", 403);
    throw erro;
  }
}

/** Só o aberto se cancela, e a vaga da cota volta. O documento fica (`#d148`). */
export async function DELETE(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaCancelarConvite.safeParse(await comoJson(requisicao));
  const codigo = corpo.success && lerCodigo(corpo.data.codigo);
  if (!corpo.success || !codigo) return falha("fora-de-forma", 400);
  const { contaId } = corpo.data;
  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const referencia = adminDb()
    .collection(caminhos.convites(contaId))
    .doc(codigo);
  const convite = await referencia.get();
  if (convite.get("status") !== "ABERTO") return falha("fora-de-forma", 409);

  // A precondição segura a troca que usou o convite entre a leitura e aqui:
  // um usado nunca vira cancelado, nem devolve a vaga.
  try {
    await referencia.update(
      { status: "CANCELADO", v: VERSAO_SCHEMA },
      { lastUpdateTime: convite.updateTime! },
    );
  } catch {
    return falha("fora-de-forma", 409);
  }
  return NextResponse.json({});
}
