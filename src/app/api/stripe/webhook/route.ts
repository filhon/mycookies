import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { acessoAteDaAssinatura } from "@/lib/domain/assinatura";
import { adminDb, credencialDisponivel } from "@/lib/server/firebaseAdmin";
import {
  escreverAcessoAte,
  stripe,
  stripeDisponivel,
} from "@/lib/server/stripe";
import { caminhos, VERSAO_SCHEMA, type Conta } from "@/lib/types";

/**
 * O webhook do Stripe: sem `conferirToken`, porque quem chama é o Stripe, e a
 * assinatura do corpo é a autenticação (`DECISOES.md#d146`).
 *
 * **Não confia no evento.** Os três eventos de assinatura podem chegar fora
 * de ordem, e um `updated` velho depois de um `deleted` reabriria uma conta
 * cancelada. Por isso o handler pega só o id do evento e relê o estado atual
 * no Stripe (`#d145`).
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

  // Relê, e não confia no evento: eventos chegam fora de ordem (#d145).
  const id = (evento.data.object as Stripe.Subscription).id;
  const assinatura = await stripe().subscriptions.retrieve(id);
  const { contaId, uid } = assinatura.metadata;
  if (!contaId || !uid) return new Response(null, { status: 200 }); // não é nossa; nada a repetir

  const item = assinatura.items.data[0];
  if (!item) return new Response(null, { status: 200 }); // sem item, nada a fazer

  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data() as Conta | undefined;
  const ateMs = acessoAteDaAssinatura({
    status: assinatura.status,
    periodoInicioMs: item.current_period_start * 1000,
    periodoFimMs: item.current_period_end * 1000,
    trialAteMs: conta?.trialAte?.toMillis(),
    agoraMs: Date.now(),
  });

  await escreverAcessoAte(uid, contaId, ateMs); // claim antes do documento (#d145)
  await documento.set(
    {
      plano: "ASSINATURA",
      stripeCustomerId:
        typeof assinatura.customer === "string"
          ? assinatura.customer
          : assinatura.customer.id,
      stripeSubscriptionId: assinatura.id,
      assinaturaAte: Timestamp.fromMillis(ateMs),
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );

  return new Response(null, { status: 200 });
}
