import type Stripe from "stripe";
import { credencialDisponivel } from "@/lib/server/firebaseAdmin";
import {
  sincronizarAssinatura,
  stripe,
  stripeDisponivel,
} from "@/lib/server/stripe";

/**
 * O webhook do Stripe: sem `conferirToken`, porque quem chama é o Stripe, e a
 * assinatura do corpo é a autenticação (`DECISOES.md#d146`).
 *
 * Pega só o id da assinatura e deixa `sincronizarAssinatura` reler o estado
 * atual (`#d145`); a volta do checkout chama a mesma função (spec 163).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  if (!credencialDisponivel() || !stripeDisponivel()) {
    return new Response(null, { status: 500 });
  }

  const corpo = await requisicao.text(); // cru: a assinatura é sobre os bytes
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(
      corpo,
      requisicao.headers.get("stripe-signature") ?? "",
      segredo ?? "",
    );
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!evento.type.startsWith("customer.subscription.")) {
    return new Response(null, { status: 200 });
  }

  await sincronizarAssinatura((evento.data.object as Stripe.Subscription).id);
  return new Response(null, { status: 200 });
}
