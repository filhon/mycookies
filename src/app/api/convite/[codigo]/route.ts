import { NextResponse } from "next/server";
import { estadoDoConvite } from "@/lib/domain/convite";
import { primeiroNome } from "@/lib/domain/whatsapp";
import { lerBeta, lerConvite } from "@/lib/server/beta";

/**
 * O cabeçalho do convite no `/cadastro` (spec 183): só se ele vale e o
 * primeiro nome de quem convida. Sem login, e sem dizer por que não vale
 * (usado, cancelado, inexistente e de conta encerrada são o mesmo `false`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const [{ convite, conta }, beta] = await Promise.all([
    lerConvite(codigo),
    lerBeta(),
  ]);
  const estado = estadoDoConvite(convite, conta, beta);
  if (estado !== "aberto" || !conta)
    return NextResponse.json({ valido: false });
  return NextResponse.json({
    valido: true,
    deQuem: primeiroNome(conta.proprietaria),
  });
}
