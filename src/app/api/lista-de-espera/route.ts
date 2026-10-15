import { after, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  caiuNaIsca,
  esquemaListaDeEspera,
  idDaEspera,
} from "@/lib/domain/listaDeEspera";
import { VERSOES_PRIVACIDADE, versaoAtual } from "@/lib/domain/textoLegal";
import { listaDeEspera } from "@/lib/email/pecas";
import { comoEstadoDoBeta } from "@/lib/server/beta";
import { enviarEmail } from "@/lib/server/email";
import { adminDb, credencialDisponivel } from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA, type EstadoDoBeta } from "@/lib/types";

/**
 * A lista de espera do beta (spec 182). Sem login, como `api/senha`: a
 * resposta é a mesma para quem entra agora e para quem já estava (`#d143`),
 * `{ ok, posicao }` com a posição dela. Quem digita o e-mail de outra pessoa
 * sai sabendo só que ela está na fila.
 *
 * A posição sai de `plataforma/beta.espera` numa transação do Admin SDK, como
 * a vaga da 181 (`#d400`): sem ela, duas entradas no mesmo instante dividiriam
 * o número.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  let corpo: unknown = null;
  try {
    corpo = await requisicao.json();
  } catch {
    // Vira falha de forma logo abaixo.
  }
  // A isca: o robô ouve "deu certo" e nada é gravado.
  if (caiuNaIsca(corpo)) return NextResponse.json({ ok: true });

  const lido = esquemaListaDeEspera.safeParse(corpo);
  if (!lido.success) {
    return NextResponse.json({ erro: "fora-de-forma" }, { status: 400 });
  }
  if (!credencialDisponivel()) {
    return NextResponse.json({ erro: "sem-configuracao" }, { status: 503 });
  }

  const { nome, email, instagram, origem } = lido.data;
  const id = await idDaEspera(email);
  const db = adminDb();
  const referencia = db.doc(caminhos.listaDeEspera(id));
  const plataforma = db.doc(caminhos.plataformaBeta);

  const { posicao, nova } = await db.runTransaction(async (tx) => {
    const existente = await tx.get(referencia);
    if (existente.exists) {
      return { posicao: existente.get("posicao") as number, nova: false };
    }
    const estado = comoEstadoDoBeta(
      (await tx.get(plataforma)).data() as Partial<EstadoDoBeta> | undefined,
    );
    const posicao = estado.espera + 1;
    // Sem anotar `NaListaDeEspera`: o tipo usa o `Timestamp` do cliente, e
    // aqui é o do Admin SDK. A forma é a de lá.
    const documento = {
      email,
      nome,
      ...(instagram && { instagram }),
      origem,
      posicao,
      criadaEm: Timestamp.now(),
      privacidadeVersao: versaoAtual(VERSOES_PRIVACIDADE),
      v: VERSAO_SCHEMA,
    };
    tx.create(referencia, documento);
    tx.set(
      plataforma,
      { ...estado, espera: posicao, v: VERSAO_SCHEMA },
      { merge: true },
    );
    return { posicao, nova: true };
  });

  // Só quando a entrada nasce, depois da resposta (`#d202`). Passada a cota do
  // Resend, `enviarEmail` dá "falhou" e ela fica na lista sem o e-mail.
  if (nova) {
    const peca = listaDeEspera({ nome, posicao });
    after(() => enviarEmail({ para: email, peca, chave: `espera/${id}` }));
  }
  return NextResponse.json({ ok: true, posicao });
}
