import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import {
  acessoAteDaAssinatura,
  pacoteDaMetadata,
  RECURSOS_DO_PACOTE,
} from "@/lib/domain/assinatura";
import {
  adminDb,
  credencialDisponivel,
  tirarContaDaClaim,
} from "@/lib/server/firebaseAdmin";
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
 *
 * Desde a 032 grava também o pacote, e é a primeira vez que escreve algo além
 * de prazo: assinatura viva de pacote sem ajudante tira as ajudantes (`#d170`).
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
  const assinatura = await stripe().subscriptions.retrieve(id, {
    expand: ["items.data.price.product"],
  });
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

  // O pacote vem do produto, e não do id do preço: preço muda criando um
  // `Price` novo no mesmo produto. Desconhecido é essencial (#d169).
  const produto = item.price.product;
  const pacote = pacoteDaMetadata(
    typeof produto === "object" && !produto.deleted
      ? produto.metadata.pacote
      : undefined,
  );
  // Só a assinatura viva tira ajudante; cancelada ou sem pagamento suspende,
  // como antes, e a ajudante volta sozinha se a dona voltar a pagar (#d170).
  const viva = ["active", "trialing", "past_due"].includes(assinatura.status);
  const ficam = !viva || RECURSOS_DO_PACOTE[pacote].includes("ajudante");

  // A dona (metadata) e as ajudantes: renovar a assinatura renova a claim de
  // todo mundo que escreve na conta (`DECISOES.md#d155`). Sem laço, a ajudante
  // para de salvar no dia em que o teste original venceria, numa conta em dia.
  // Sem `where`: campo ausente não casa com `== null`, e são até cinco
  // documentos. Sequencial: o Stripe repete o webhook se ele cair, e quem já
  // foi tirada tem `removidaEm` e não entra de novo.
  const membros = await adminDb().collection(caminhos.membros(contaId)).get();
  const ativas = membros.docs.filter((d) => !d.get("removidaEm"));

  // Claim antes do documento (#d145). A dona sempre; as ajudantes, se ficam.
  await escreverAcessoAte(uid, contaId, ateMs);
  for (const membro of ativas) {
    if (ficam) {
      await escreverAcessoAte(membro.id, contaId, ateMs);
    } else {
      // O DELETE de /api/conta/membros, disparado pelo Stripe (#d170).
      await tirarContaDaClaim(membro.id, contaId);
      await membro.ref.set(
        { removidaEm: Timestamp.now(), v: VERSAO_SCHEMA },
        { merge: true },
      );
    }
  }
  await documento.set(
    {
      plano: "ASSINATURA",
      stripeCustomerId:
        typeof assinatura.customer === "string"
          ? assinatura.customer
          : assinatura.customer.id,
      stripeSubscriptionId: assinatura.id,
      assinaturaAte: Timestamp.fromMillis(ateMs),
      pacote,
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );

  return new Response(null, { status: 200 });
}
