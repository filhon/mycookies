import Stripe from "stripe";
import type { Periodo } from "@/lib/domain/assinatura";
import type { Centavos, Pacote } from "@/lib/types";
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

/**
 * Vazio quando a variável de ambiente não está configurada. O essencial fica
 * nas variáveis da 028; o completo nas da 032. Serve ao checkout e à tela de
 * preços: quem decide o pacote de uma assinatura é o produto, não o preço
 * (`DECISOES.md#d169`).
 */
export const PRECOS: Record<Pacote, Record<Periodo, string>> = {
  ESSENCIAL: {
    mensal: process.env.STRIPE_PRICE_MENSAL?.trim() ?? "",
    anual: process.env.STRIPE_PRICE_ANUAL?.trim() ?? "",
  },
  COMPLETO: {
    mensal: process.env.STRIPE_PRICE_COMPLETO_MENSAL?.trim() ?? "",
    anual: process.env.STRIPE_PRICE_COMPLETO_ANUAL?.trim() ?? "",
  },
};

/**
 * Chave secreta e os quatro preços — o mínimo para checkout e webhook
 * existirem. Meio catálogo venderia um pacote e daria erro no outro.
 */
export function stripeDisponivel(): boolean {
  return (
    !!chaveSecreta() &&
    Object.values(PRECOS).every((periodos) =>
      Object.values(periodos).every(Boolean),
    )
  );
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

/** Cache por instância, como o CNPJ de `/api/nota` (`DECISOES.md#d52`). */
const CACHE = new Map<string, { centavos: Centavos; ate: number }>();
const VALIDADE_MS = 60 * 60 * 1000;

async function precoDe(pacote: Pacote, periodo: Periodo): Promise<Centavos> {
  const chave = `${pacote}:${periodo}`;
  const guardado = CACHE.get(chave);
  if (guardado && guardado.ate > Date.now()) return guardado.centavos;

  const preco = await stripe().prices.retrieve(PRECOS[pacote][periodo]);
  const centavos = preco.unit_amount ?? 0;
  CACHE.set(chave, { centavos, ate: Date.now() + VALIDADE_MS });
  return centavos;
}

async function precosDe(pacote: Pacote) {
  const [mensal, anual] = await Promise.all([
    precoDe(pacote, "mensal"),
    precoDe(pacote, "anual"),
  ]);
  return { mensal, anual };
}

/**
 * Os quatro preços, lidos do Stripe: o preço mora lá e em lugar nenhum do
 * código (roadmap §7). Quem chama confere `stripeDisponivel()` antes; lida por
 * `/api/assinatura/precos` e pela página de venda (`DECISOES.md#d174`).
 */
export async function lerPrecos(): Promise<
  Record<Pacote, { mensal: Centavos; anual: Centavos }>
> {
  const [ESSENCIAL, COMPLETO] = await Promise.all([
    precosDe("ESSENCIAL"),
    precosDe("COMPLETO"),
  ]);
  return { ESSENCIAL, COMPLETO };
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
