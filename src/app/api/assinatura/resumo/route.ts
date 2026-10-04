import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import type {
  FalhaAssinatura,
  ResumoAssinatura,
} from "@/lib/domain/assinatura";
import {
  ehDona,
  adminDb,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { stripe, stripeDisponivel } from "@/lib/server/stripe";
import { caminhos, type Conta } from "@/lib/types";

/**
 * O valor, a próxima cobrança e o cartão, lidos no Stripe pela assinatura da
 * conta (spec 084). Nada é gravado: o Stripe é a verdade, e o webhook continua
 * o único que escreve a conta (`DECISOES.md#d285`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaResumo = z.object({ contaId: z.string().min(1) });

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

/** O fim do cartão, se o que veio expandido é um cartão. */
function finalDoCartao(
  metodo: string | Stripe.PaymentMethod | null | undefined,
): string | null {
  return typeof metodo === "object" && metodo?.card ? metodo.card.last4 : null;
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaResumo.safeParse(await comoJson(requisicao));
  if (!corpo.success || !ehDona(quem, corpo.data.contaId)) {
    return falha("fora-de-forma", 400);
  }
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  const conta = (
    await adminDb().doc(caminhos.conta(corpo.data.contaId)).get()
  ).data() as Conta | undefined;
  if (!conta?.stripeSubscriptionId) return falha("sem-assinatura", 409);

  let assinatura: Stripe.Subscription;
  try {
    // O cartão da assinatura; sem ele, o padrão do cliente, que é onde o
    // portal grava quando ela troca.
    assinatura = await stripe().subscriptions.retrieve(
      conta.stripeSubscriptionId,
      {
        expand: [
          "default_payment_method",
          "customer.invoice_settings.default_payment_method",
        ],
      },
    );
  } catch {
    return falha("sem-resposta", 502);
  }

  const item = assinatura.items.data[0];
  if (!item) return falha("sem-assinatura", 409);

  const cliente = assinatura.customer;
  const final =
    finalDoCartao(assinatura.default_payment_method) ??
    (typeof cliente === "object" && !cliente.deleted
      ? finalDoCartao(cliente.invoice_settings.default_payment_method)
      : null);

  // O portal marca o cancelamento por `cancel_at_period_end` ou por `cancel_at`.
  const cancela =
    assinatura.cancel_at_period_end || assinatura.cancel_at != null;

  // ponytail: o preço da tabela, sem cupom; `invoices.createPreview` se um
  // dia houver desconto.
  const resumo: ResumoAssinatura = {
    valor: (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
    periodo: item.price.recurring?.interval === "year" ? "anual" : "mensal",
    ateMs: (assinatura.cancel_at ?? item.current_period_end) * 1000,
    final,
    cancela,
  };
  return NextResponse.json(resumo);
}
