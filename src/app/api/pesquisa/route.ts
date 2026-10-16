import { after, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { diasEntre, hojeEmBrasilia } from "@/lib/domain/datas";
import {
  esquemaEnvioDaPesquisa,
  situacaoDaPesquisa,
  type FalhaDaPesquisa,
} from "@/lib/domain/pesquisa";
import { comoEstadoDoBeta } from "@/lib/server/beta";
import { enviarEmail } from "@/lib/server/email";
import {
  adminDb,
  conferirToken,
  credencialDisponivel,
  ehDona,
} from "@/lib/server/firebaseAdmin";
import { caminhos, VERSAO_SCHEMA, type EstadoDoBeta } from "@/lib/types";

/**
 * A pesquisa do fim do teste (spec 185). Pelo servidor, e não pelo cliente: no
 * fim do teste a regra já recusa a escrita dela (`#d144`), e a resposta é o
 * que dá o preço de fundadora, que ela não pode se dar sozinha.
 *
 * Numa transação do Admin SDK, como a troca do convite (`#d400`): a resposta,
 * `pesquisaRespondidaEm` na conta e a soma em `plataforma/beta.pesquisas`
 * juntas. Mandar de novo (dois toques, duas abas) responde `ok` e não conta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(codigo: FalhaDaPesquisa, status: number) {
  return NextResponse.json({ erro: codigo }, { status });
}

/** A pesquisa fora do prazo ou de quem não é fundadora, dentro da transação. */
class Fora extends Error {}

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);

  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  let json: unknown = null;
  try {
    json = await requisicao.json();
  } catch {
    // Vira falha de forma logo abaixo.
  }
  const corpo = esquemaEnvioDaPesquisa.safeParse(json);
  if (!corpo.success) return falha("fora-de-forma", 400);
  const { contaId, respostas } = corpo.data;
  if (!ehDona(quem, contaId)) return falha("sem-acesso", 401);

  const db = adminDb();
  const conta = db.doc(caminhos.conta(contaId));
  const resposta = db.doc(caminhos.pesquisa(contaId));
  const plataforma = db.doc(caminhos.plataformaBeta);
  const agora = new Date();

  let contada: { n: number; vagas: number } | null;
  try {
    contada = await db.runTransaction(async (tx) => {
      const [contaSnap, respostaSnap, betaSnap] = await Promise.all([
        tx.get(conta),
        tx.get(resposta),
        tx.get(plataforma),
      ]);
      if (respostaSnap.exists) return null;
      const dados = contaSnap.data();
      if (!dados || situacaoDaPesquisa(dados, agora.getTime()) !== "aberta") {
        throw new Fora();
      }

      const estado = comoEstadoDoBeta(
        betaSnap.data() as Partial<EstadoDoBeta> | undefined,
      );
      const n = estado.pesquisas + 1;
      const respondidaEm = Timestamp.fromDate(agora);
      tx.create(resposta, {
        // O Admin SDK recusa `undefined`: as respostas vazias saem aqui.
        ...(JSON.parse(JSON.stringify(respostas)) as typeof respostas),
        respondidaEm,
        diasDeUso: diasEntre(
          hojeEmBrasilia((dados.criadaEm as Timestamp).toDate()),
          hojeEmBrasilia(agora),
        ),
        v: VERSAO_SCHEMA,
      });
      tx.update(conta, {
        pesquisaRespondidaEm: respondidaEm,
        v: VERSAO_SCHEMA,
      });
      tx.set(
        plataforma,
        { ...estado, pesquisas: n, v: VERSAO_SCHEMA },
        { merge: true },
      );
      return { n, vagas: estado.vagas };
    });
  } catch (erro) {
    if (erro instanceof Fora) return falha("fora", 409);
    throw erro;
  }

  // A 187 pendura aqui o desconto de quem já assina.

  // Na centésima, avisa; não lança (`npm run beta -- lancar`, 186).
  if (contada && contada.n === contada.vagas) {
    const { n } = contada;
    const texto = `${n} pesquisas respondidas. Para abrir o Rende: npm run beta -- lancar --confirmo\n`;
    after(() =>
      enviarEmail({
        para: RESPONSAVEL.email,
        peca: {
          assunto: `${n} pesquisas respondidas`,
          preheader: "",
          html: "",
          texto,
        },
        chave: "beta/pesquisas-completas",
      }),
    );
  }
  return NextResponse.json({ ok: true });
}
