import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { FalhaMeusDados } from "@/lib/domain/meusDados";
import {
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
  tirarContaDaClaim,
} from "@/lib/server/firebaseAdmin";
import { stripe, stripeDisponivel } from "@/lib/server/stripe";
import { caminhos, VERSAO_SCHEMA, type Conta } from "@/lib/types";

/**
 * Encerra a conta em três passos, nesta ordem (`DECISOES.md#d148`): cancela a
 * assinatura no Stripe, marca `status: "ENCERRADA"` e tira a conta da claim —
 * da dona e de cada ajudante ativa (spec 030).
 * Idempotente como `/api/conta` (`#d141`): toda volta bate na mesma rota e faz
 * só o que faltou. Não apaga documento nenhum — a purga é
 * `scripts/encerrar-conta.mjs`, à mão.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaEncerrar = z.object({ contaId: z.string().min(1) });

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

  const corpo = esquemaEncerrar.safeParse(await comoJson(requisicao));
  // Só a dona encerra: não é a conta da ajudante (spec 030).
  if (!corpo.success || !ehDona(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  const { contaId } = corpo.data;

  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data() as Conta | undefined;
  if (!conta) return falha("fora-de-forma", 400);

  // 1. A cobrança, antes de tudo. Sem Stripe configurado e com assinatura no
  //    documento, recusa: a conta não encerra deixando a cobrança acesa.
  if (conta.stripeSubscriptionId) {
    if (!stripeDisponivel()) return falha("sem-configuracao", 500);
    const assinatura = await stripe().subscriptions.retrieve(
      conta.stripeSubscriptionId,
    );
    if (assinatura.status !== "canceled") {
      await stripe().subscriptions.cancel(conta.stripeSubscriptionId);
    }
  }

  // 2. O documento: o que a purga procura e o que o AuthProvider observa.
  if (conta.status !== "ENCERRADA") {
    await documento.set(
      {
        status: "ENCERRADA",
        encerradaEm: Timestamp.now(),
        encerradaPor: quem.uid,
        v: VERSAO_SCHEMA,
      },
      { merge: true },
    );
  }

  // 3. A claim: fora do mapa, ninguém lê nem escreve a partir do próximo token.
  //    A 030 estendeu o passo a cada ajudante ativa, com `removidaEm` no
  //    espelho (`#d155`) — senão ela ficaria com a chave de uma conta que a
  //    purga vai apagar. As ajudantes antes da dona: se a volta cair no meio,
  //    a dona ainda abre a conta e a próxima volta termina o laço.
  const membros = await adminDb().collection(caminhos.membros(contaId)).get();
  for (const membro of membros.docs.filter((d) => !d.get("removidaEm"))) {
    await tirarContaDaClaim(membro.id, contaId);
    await membro.ref.set(
      { removidaEm: Timestamp.now(), v: VERSAO_SCHEMA },
      { merge: true },
    );
  }
  await tirarContaDaClaim(quem.uid, contaId);

  return NextResponse.json({});
}
