import { NextResponse } from "next/server";
import { z } from "zod";
import type { FalhaMeusDados } from "@/lib/domain/meusDados";
import { VERSAO_DO_ACEITE } from "@/lib/domain/textoLegal";
import {
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA } from "@/lib/types";

/**
 * O "Entendi" do aviso de mudança nos termos ou na privacidade (spec 166,
 * `DECISOES.md#d380`): grava `termosVersao` com a versão atual do par. Só a
 * dona; a regra não muda, porque escreve o Admin SDK. Idempotente.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaTermos = z.object({ contaId: z.string().min(1) });

function falha(codigo: FalhaMeusDados, status: number) {
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

  const corpo = esquemaTermos.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId } = corpo.data;
  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const documento = adminDb().doc(caminhos.conta(contaId));
  if (!(await documento.get()).exists) return falha("fora-de-forma", 400);

  await documento.update({ termosVersao: VERSAO_DO_ACEITE, v: VERSAO_SCHEMA });
  return NextResponse.json({ termosVersao: VERSAO_DO_ACEITE });
}
