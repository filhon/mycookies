import { NextResponse } from "next/server";
import type { FalhaAssinatura } from "@/lib/domain/assinatura";
import {
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";
import { lerPrecos, stripeDisponivel } from "@/lib/server/stripe";

/**
 * O preço mora no Stripe e em lugar nenhum do código (roadmap §7); esta rota é
 * o jeito de a tela de assinar mostrá-lo. Sem `contaId`: preço não é dado de
 * conta. A leitura e o cache moram em `lerPrecos`, que a página de venda
 * também usa (spec 036).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaAssinatura, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

export async function GET(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  if (!stripeDisponivel()) return falha("sem-configuracao", 500);

  try {
    return NextResponse.json(await lerPrecos());
  } catch {
    return falha("sem-resposta", 502);
  }
}
