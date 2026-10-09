import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import type { FalhaAssinatura } from "@/lib/domain/assinatura";
import {
  ehDona,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { PRECOS, stripe, stripeDisponivel } from "@/lib/server/stripe";
import { caminhos, type Conta } from "@/lib/types";

/**
 * Abre a sessão do Customer Portal: trocar cartão, mudar de preço, cancelar.
 * Com `para: "COMPLETO"`, abre direto na confirmação da troca para o completo
 * do mesmo período (spec 110, `DECISOES.md#d313`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaPortal = z.object({
  contaId: z.string().min(1),
  para: z.literal("COMPLETO").optional(),
});

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
  if (!corpo.success || !ehDona(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  const conta = (
    await adminDb().doc(caminhos.conta(corpo.data.contaId)).get()
  ).data() as Conta | undefined;
  if (!conta?.stripeCustomerId) return falha("sem-assinatura", 409);

  const retorno = `${new URL(requisicao.url).origin}/configuracao`;
  let fluxo: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;

  if (corpo.data.para) {
    if (!conta.stripeSubscriptionId) return falha("sem-assinatura", 409);
    let assinatura: Stripe.Subscription;
    try {
      assinatura = await stripe().subscriptions.retrieve(
        conta.stripeSubscriptionId,
      );
    } catch {
      return falha("sem-resposta", 502);
    }
    const item = assinatura.items.data[0];
    if (!item) return falha("sem-assinatura", 409);

    // O período não muda na troca: quem paga mensal vai para o completo mensal.
    const periodo =
      item.price.recurring?.interval === "year" ? "anual" : "mensal";
    const destino = PRECOS[corpo.data.para][periodo];
    // Já no completo: o portal comum, e não uma confirmação de nada.
    if (item.price.id !== destino) {
      fluxo = {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: assinatura.id,
          items: [{ id: item.id, price: destino, quantity: 1 }],
        },
        // Confirmou, volta sozinha; o documento observado vira "Plano
        // Completo" quando o webhook gravar.
        after_completion: {
          type: "redirect",
          redirect: { return_url: retorno },
        },
      };
    }
  }

  const sessao = await stripe().billingPortal.sessions.create({
    customer: conta.stripeCustomerId,
    return_url: retorno,
    flow_data: fluxo,
  });

  return NextResponse.json({ url: sessao.url });
}
