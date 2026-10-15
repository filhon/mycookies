import { NextResponse } from "next/server";
import { lerBeta } from "@/lib/server/beta";

/**
 * A fase e as vagas que restam, para as telas de cliente (spec 182). As de
 * servidor chamam `lerBeta()` direto. Cinco minutos na borda: o número das
 * vagas não precisa ser do segundo, e a transação do cadastro lê de novo.
 *
 * `vagas` vai junto do que a spec pedia: a frase diz o teto, e o teto muda por
 * `npm run beta -- vagas <n>`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { fase, vagas, ocupadas } = await lerBeta();
  return NextResponse.json(
    { fase, vagas, restam: Math.max(0, vagas - ocupadas) },
    { headers: { "Cache-Control": "public, s-maxage=300" } },
  );
}
