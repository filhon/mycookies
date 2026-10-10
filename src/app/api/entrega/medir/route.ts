import { NextResponse } from "next/server";
import { z } from "zod";
import type { MedidaDoCep } from "@/lib/domain/entrega";
import { buscarCep, coordenadasDoCep } from "@/lib/server/endereco";
import {
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";

/**
 * Medir um CEP para a dona (spec 118, sessão A, `DECISOES.md#d322`): o de
 * onde sai a entrega e o "Testar um CEP" do painel. Só com o token da dona: é
 * dinheiro do Rende a cada CEP novo.
 *
 * Não grava nada. A origem é gravada pelo aparelho, por `salvarEntrega`, como
 * o resto da configuração: o servidor não escreve dado de negócio
 * (`firebaseAdmin.ts`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquema = z.object({
  contaId: z.string().trim().min(1),
  cep: z.string().regex(/^\d{8}$/),
});

function falha(
  codigo: "sem-acesso" | "fora-de-forma" | "sem-configuracao",
  status: number,
) {
  return NextResponse.json({ erro: codigo }, { status });
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquema.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, cep } = corpo.data;

  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const [endereco, medida] = await Promise.all([
    buscarCep(cep),
    coordenadasDoCep(cep),
  ]);
  const resposta: MedidaDoCep = {
    endereco,
    coordenadas: medida?.achado ? medida.coordenadas : null,
    naoAchado: medida?.achado === false,
  };
  return NextResponse.json(resposta);
}
