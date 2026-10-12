import { after, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import {
  NOME_DE_QUEM_APROVA_MAX,
  podeAprovar,
} from "@/lib/domain/acompanhamento";
import { avisoDeOrcamentoAprovado } from "@/lib/domain/cardapio";
import { hojeEmBrasilia } from "@/lib/domain/datas";
import { avisarAparelhos } from "@/lib/server/avisos";
import { pedidoPelaChave } from "@/lib/server/cardapio";
import { credencialDisponivel } from "@/lib/server/firebaseAdmin";
import { VERSAO_SCHEMA } from "@/lib/types";

/**
 * A cliente aprova o orçamento pelo link (spec 149, sessão B,
 * `DECISOES.md#d358`). A chave do link é a credencial, conferida pela mesma
 * porta da página (`pedidoPelaChave`). Grava só `aprovacao` e `v`, pelo Admin
 * SDK, e nunca o status: o aparelho dela é offline-first, e um status escrito
 * aqui brigaria com a edição que ela tem na fila. Confirmar é dela.
 *
 * Idempotente: já aprovado responde como aprovado, sem escrever nem avisar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquema = z.object({
  /** O endereço do cardápio, como na URL do link: o apelido ou o id (`#d319`). */
  contaId: z.string(),
  pedidoId: z.string(),
  chave: z.string(),
  nome: z.string().trim().min(1).max(NOME_DE_QUEM_APROVA_MAX),
});

type Falha =
  "sem-configuracao" | "fora-de-forma" | "nao-encontrado" | "fechado";

function falha(codigo: Falha, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

async function comoJson(requisicao: Request): Promise<unknown> {
  try {
    return await requisicao.json();
  } catch {
    return null;
  }
}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const corpo = esquema.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, pedidoId, chave, nome } = corpo.data;

  const achado = await pedidoPelaChave(contaId, pedidoId, chave);
  if (!achado) return falha("nao-encontrado", 404);
  const { pedido, referencia } = achado;

  if (pedido.status === "ORCAMENTO" && pedido.aprovacao) {
    return NextResponse.json({ aprovado: true });
  }
  if (!podeAprovar(pedido, hojeEmBrasilia(new Date()))) {
    return falha("fechado", 409);
  }

  // ponytail: dois toques no mesmo segundo gravam duas vezes, e o último nome
  // fica. A página desabilita o botão enquanto envia; precondição de
  // `lastUpdateTime` se isso aparecer com cliente de verdade.
  await referencia.update({
    aprovacao: { em: Timestamp.now(), nome },
    v: VERSAO_SCHEMA,
  });

  // O celular dela toca depois da resposta, como no pedido novo (spec 119).
  const aviso = avisoDeOrcamentoAprovado({ ...pedido, id: referencia.id });
  after(() => avisarAparelhos(achado.contaId, aviso));

  return NextResponse.json({ aprovado: true });
}
