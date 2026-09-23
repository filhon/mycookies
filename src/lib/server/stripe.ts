import Stripe from "stripe";
import type { Periodo } from "@/lib/domain/assinatura";
import { adminAuth } from "./firebaseAdmin";

/**
 * O Stripe do lado do servidor, ao lado de `firebaseAdmin.ts`.
 *
 * Nada aqui entra no pacote do cliente: só `src/lib/server/` e
 * `src/app/api/` importam este arquivo, nem `Stripe.js` — o checkout e o
 * portal são uma URL para onde o navegador vai (`DECISOES.md#d146`).
 */

function chaveSecreta(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

/** Vazio quando a variável de ambiente não está configurada. */
export const PRECOS: Record<Periodo, string> = {
  mensal: process.env.STRIPE_PRICE_MENSAL?.trim() ?? "",
  anual: process.env.STRIPE_PRICE_ANUAL?.trim() ?? "",
};

/** Chave secreta e os dois preços — o mínimo para checkout e webhook existirem. */
export function stripeDisponivel(): boolean {
  return !!chaveSecreta() && !!PRECOS.mensal && !!PRECOS.anual;
}

let instancia: Stripe | undefined;

/** Singleton, como `adminAuth()`/`adminDb()`. */
export function stripe(): Stripe {
  if (!instancia) {
    const chave = chaveSecreta();
    if (!chave) throw new Error("Servidor sem STRIPE_SECRET_KEY.");
    instancia = new Stripe(chave);
  }
  return instancia;
}

/**
 * Grava a claim inteira preservando o que não é desta conta.
 *
 * A única função que renova `acessoAte` depois do cadastro e do convite: o
 * webhook do Stripe a chama para a dona e para cada ajudante ativa
 * (`DECISOES.md#d144`, `#d145`, `#d155`).
 */
export async function escreverAcessoAte(
  uid: string,
  contaId: string,
  ateMs: number,
): Promise<void> {
  const auth = adminAuth();
  const usuario = await auth.getUser(uid);
  const claims = usuario.customClaims ?? {};
  const acessoAte = (claims.acessoAte ?? {}) as Record<string, number>;

  await auth.setCustomUserClaims(uid, {
    ...claims,
    acessoAte: { ...acessoAte, [contaId]: ateMs },
  });
}
