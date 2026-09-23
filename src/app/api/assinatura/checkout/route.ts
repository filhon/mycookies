import { NextResponse } from "next/server";
import { esquemaCheckout, type FalhaAssinatura } from "@/lib/domain/assinatura";
import {
  ehDona,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { PRECOS, stripe, stripeDisponivel } from "@/lib/server/stripe";
import { caminhos, type Conta } from "@/lib/types";

/**
 * Abre a Checkout Session do Stripe, na ordem de `/api/conta` e `/api/nota`:
 * credencial → token → corpo → autorização.
 *
 * Não escreve nada: quem grava `acessoAte` e o documento é o webhook, depois
 * que o pagamento acontecer de verdade (`DECISOES.md#d145`).
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

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaCheckout.safeParse(await comoJson(requisicao));
  if (!corpo.success || !ehDona(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  const { contaId, periodo } = corpo.data;
  const conta = (await adminDb().doc(caminhos.conta(contaId)).get()).data() as
    Conta | undefined;

  const origem = new URL(requisicao.url).origin;
  const sessao = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRECOS[periodo], quantity: 1 }],
    client_reference_id: contaId,
    ...(conta?.stripeCustomerId
      ? { customer: conta.stripeCustomerId }
      : { customer_email: quem.email }),
    subscription_data: { metadata: { contaId, uid: quem.uid } },
    locale: "pt-BR",
    success_url: `${origem}/assinatura/confirmando`,
    cancel_url: `${origem}/assinatura`,
  });

  return NextResponse.json({ url: sessao.url });
}
