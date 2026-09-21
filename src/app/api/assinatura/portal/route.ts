import { NextResponse } from "next/server";
import { z } from "zod";
import type { FalhaAssinatura } from "@/lib/domain/assinatura";
import {
  abreAConta,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { stripe, stripeDisponivel } from "@/lib/server/stripe";
import { caminhos, type Conta } from "@/lib/types";

/** Abre a sessão do Customer Portal: trocar cartão, mudar de preço, cancelar. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaPortal = z.object({ contaId: z.string().min(1) });

function falha(codigo: FalhaAssinatura, status: number) {
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

  const corpo = esquemaPortal.safeParse(await comoJson(requisicao));
  if (!corpo.success || !abreAConta(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  const conta = (
    await adminDb().doc(caminhos.conta(corpo.data.contaId)).get()
  ).data() as Conta | undefined;
  if (!conta?.stripeCustomerId) return falha("sem-assinatura", 409);

  const origem = new URL(requisicao.url).origin;
  const sessao = await stripe().billingPortal.sessions.create({
    customer: conta.stripeCustomerId,
    return_url: `${origem}/configuracao`,
  });

  return NextResponse.json({ url: sessao.url });
}
