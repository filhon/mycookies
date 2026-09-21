import { NextResponse } from "next/server";
import type { Periodo } from "@/lib/domain/assinatura";
import type { FalhaAssinatura } from "@/lib/domain/assinatura";
import {
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { PRECOS, stripe, stripeDisponivel } from "@/lib/server/stripe";
import type { Centavos } from "@/lib/types";

/**
 * O preço mora no Stripe e em lugar nenhum do código (roadmap §7); esta rota é
 * o único jeito de a tela mostrá-lo. Sem `contaId`: preço não é dado de conta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaAssinatura, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

/** Cache por instância, como o CNPJ de `/api/nota` (`DECISOES.md#d52`). */
const CACHE = new Map<Periodo, { centavos: Centavos; ate: number }>();
const VALIDADE_MS = 60 * 60 * 1000;

async function precoDe(periodo: Periodo): Promise<Centavos> {
  const guardado = CACHE.get(periodo);
  if (guardado && guardado.ate > Date.now()) return guardado.centavos;

  const preco = await stripe().prices.retrieve(PRECOS[periodo]);
  const centavos = preco.unit_amount ?? 0;
  CACHE.set(periodo, { centavos, ate: Date.now() + VALIDADE_MS });
  return centavos;
}

export async function GET(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  try {
    const [mensal, anual] = await Promise.all([
      precoDe("mensal"),
      precoDe("anual"),
    ]);
    return NextResponse.json({ mensal, anual });
  } catch {
    return falha("sem-resposta", 502);
  }
}
