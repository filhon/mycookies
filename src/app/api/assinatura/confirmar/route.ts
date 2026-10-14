import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  esquemaConfirmar,
  type FalhaAssinatura,
  type SituacaoDaVolta,
} from "@/lib/domain/assinatura";
import {
  ehDona,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import {
  sincronizarAssinatura,
  stripe,
  stripeDisponivel,
} from "@/lib/server/stripe";

/**
 * A volta do checkout (spec 163), na ordem de `/api/assinatura/checkout`:
 * credencial → token → corpo → autorização.
 *
 * Lê a sessão no Stripe e, paga, sincroniza na hora pela mesma função do
 * webhook, sem esperar por ele. O id da sessão não é credencial: a sessão
 * precisa ser da conta que o token abre.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function responder(situacao: SituacaoDaVolta) {
  return NextResponse.json({ situacao });
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaConfirmar.safeParse(await comoJson(requisicao));
  if (!corpo.success || !ehDona(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  let sessao: Stripe.Checkout.Session;
  try {
    sessao = await stripe().checkout.sessions.retrieve(corpo.data.sessao);
  } catch {
    return falha("sem-resposta", 502);
  }
  if (sessao.client_reference_id !== corpo.data.contaId) {
    return falha("fora-de-forma", 400);
  }

  if (sessao.status !== "complete") return responder("aberta");
  if (sessao.payment_status === "unpaid") return responder("esperando");

  // `paid` ou `no_payment_required` (o teste da 161 e a cortesia).
  const assinatura = sessao.subscription;
  if (!assinatura) return responder("aberta");
  try {
    await sincronizarAssinatura(
      typeof assinatura === "string" ? assinatura : assinatura.id,
    );
  } catch {
    return falha("sem-resposta", 502);
  }
  return responder("confirmada");
}
