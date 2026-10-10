import { NextResponse } from "next/server";
import { z } from "zod";
import { montarCardapio } from "@/lib/domain/cardapio";
import { taxaParaCliente } from "@/lib/domain/entrega";
import { lerContaDoCardapio } from "@/lib/server/cardapio";
import { taxaDoCep } from "@/lib/server/endereco";
import { credencialDisponivel } from "@/lib/server/firebaseAdmin";

/**
 * A taxa de entrega para a cliente (spec 118, sessão B, `DECISOES.md#d322`):
 * o CEP dela, a regra da dona, e só a taxa, o `fora` e o endereço do próprio
 * CEP voltam. Nunca a distância nem a origem.
 *
 * Sem login e gasta dinheiro do Rende a cada CEP novo. Os freios: o esquema,
 * o cardápio aberto pela mesma `montarCardapio` do handler, a regra
 * configurada, o cache de 30 dias por CEP e a cota diária do Google
 * (`DEPLOY.md` § 14). Passada a cota, a regra cai em "a combinar".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquema = z.object({
  contaId: z.string().trim().min(1),
  cep: z.string().regex(/^\d{8}$/),
});

function falha(
  codigo: "fora-de-forma" | "fechado" | "sem-regra" | "sem-configuracao",
  status: number,
) {
  return NextResponse.json({ erro: codigo }, { status });
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const corpo = esquema.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, cep } = corpo.data;

  const lido = await lerContaDoCardapio(contaId);
  const cardapio = lido && montarCardapio({ ...lido, agoraMs: Date.now() });
  if (!lido || !cardapio) return falha("fechado", 409);

  const regra = lido.configuracao?.entrega;
  if (!regra) return falha("sem-regra", 404);

  const { endereco, resultado } = await taxaDoCep(regra, cep);
  return NextResponse.json(taxaParaCliente(resultado, endereco));
}
