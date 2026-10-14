import { NextResponse } from "next/server";
import { senhaTrocada } from "@/lib/email/pecas";
import { enviarEmail } from "@/lib/server/email";
import {
  adminAuth,
  conferirToken,
  credencialDisponivel,
} from "@/lib/server/firebaseAdmin";

/**
 * "A senha do Rende foi trocada" (`DECISOES.md#d371`), chamada pela tela de
 * pronto da `/redefinir-senha` logo depois de entrar.
 *
 * Não é um botão de mandar e-mail para quem tem login: só manda se o registro
 * diz que a senha mudou há pouco. `tokensValidAfterTime` muda no
 * `confirmPasswordReset` (provado na 158) e também na criação do login, que
 * não é troca. Responde `ok` em todo caso com login: a tela não espera nem
 * mostra nada disto.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JANELA_MS = 15 * 60 * 1000;

const OK = () => NextResponse.json({ ok: true });

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return OK();
  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) {
    return NextResponse.json({ erro: "sem-login" }, { status: 401 });
  }

  try {
    const { email, tokensValidAfterTime, metadata } = await adminAuth().getUser(
      quem.uid,
    );
    if (!email || !tokensValidAfterTime) return OK();
    const quando = new Date(tokensValidAfterTime);
    const trocouAgora =
      Date.now() - quando.getTime() <= JANELA_MS &&
      quando.getTime() > Date.parse(metadata.creationTime);
    if (!trocouAgora) return OK();

    // Duas chamadas pela mesma troca, um e-mail.
    const resultado = await enviarEmail({
      para: email,
      peca: senhaTrocada({ email, quando }),
      chave: `senha-trocada/${quem.uid}/${quando.getTime()}`,
    });
    if (resultado === "falhou") {
      console.warn(`[senha-trocada] o aviso de ${quem.uid} não saiu.`);
    }
  } catch (erro) {
    console.warn("[senha-trocada] não deu para avisar:", erro);
  }
  return OK();
}
