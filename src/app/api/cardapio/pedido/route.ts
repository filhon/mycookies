import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  esquemaPedidoDoCardapio,
  LIMITE_DE_ORCAMENTOS_EM_ABERTO,
  montarCardapio,
  pedidoDoCardapio,
  type FalhaPedidoCardapio,
} from "@/lib/domain/cardapio";
import { hojeEmBrasilia, meiaNoiteEmBrasilia } from "@/lib/domain/datas";
import { lerContaDoCardapio } from "@/lib/server/cardapio";
import { adminDb, credencialDisponivel } from "@/lib/server/firebaseAdmin";
import { caminhos, type Pedido } from "@/lib/types";

// ponytail: sem captcha e sem limite por IP; o teto por conta é o freio (#d161).
// Turnstile quando o teto for atingido por lixo.

/**
 * O pedido pelo cardápio (spec 031, sessão B): a primeira rota que escreve sem
 * login. Recebe ids e quantidades, relê a configuração e as fichas, e grava um
 * orçamento com o preço e o custo de agora (`DECISOES.md#d160`). Um documento,
 * um `set`, e nada mais.
 *
 * Não é idempotente: dois toques em "Enviar" são dois orçamentos. A página
 * desabilita o botão enquanto envia; o que escapar ela cancela.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaPedidoCardapio, status: number) {
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

  const corpo = esquemaPedidoDoCardapio.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);
  const pedido = corpo.data;

  // O pote de mel: sucesso sem gravar, para o robô não aprender (`#d161`).
  if (pedido.site) return NextResponse.json({ codigo: null });

  // A mesma `montarCardapio` da página: nenhuma segunda opinião sobre o que
  // está aberto.
  const lido = await lerContaDoCardapio(pedido.contaId);
  const cardapio = lido && montarCardapio({ ...lido, agoraMs: Date.now() });
  if (!lido || !cardapio) return falha("fechado", 409);

  const db = adminDb();
  const colecao = db.collection(caminhos.pedidos(pedido.contaId));

  // Só igualdades: o Firestore junta os índices de campo único.
  const emAberto = await colecao
    .where("origem", "==", "CARDAPIO")
    .where("status", "==", "ORCAMENTO")
    .where("arquivado", "==", false)
    .count()
    .get();
  if (emAberto.data().count >= LIMITE_DE_ORCAMENTOS_EM_ABERTO) {
    return falha("cheio", 429);
  }

  const montado = pedidoDoCardapio({
    pedido,
    fichas: lido.fichas,
    fichaIds: lido.configuracao?.cardapio?.fichaIds ?? [],
    hojeISO: hojeEmBrasilia(new Date()),
  });
  if (!montado.ok) {
    return falha(montado.falha, montado.falha === "mudou" ? 409 : 400);
  }

  const agora = Timestamp.now();
  const novo = {
    ...montado.corpo,
    // O Admin SDK tem o seu `Timestamp`; a forma é a mesma do cliente.
    dataEntrega: Timestamp.fromDate(
      meiaNoiteEmBrasilia(montado.corpo.dataEntregaISO),
    ) as unknown as Pedido["dataEntrega"],
    criadoEm: agora as unknown as Pedido["criadoEm"],
    atualizadoEm: agora as unknown as Pedido["atualizadoEm"],
  } satisfies Omit<Pedido, "id">;

  await colecao.doc().set(novo);

  return NextResponse.json({
    codigo: montado.corpo.codigo,
    total: montado.corpo.total,
  });
}
