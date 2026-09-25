import { NextResponse } from "next/server";
import { z } from "zod";
import { URL_DO_SITE } from "@/app/site";
import { senhaNova } from "@/lib/email/pecas";
import { enviarEmail } from "@/lib/server/email";
import { adminAuth, credencialDisponivel } from "@/lib/server/firebaseAdmin";

/**
 * "Esqueci minha senha" pelo Resend, com o Firebase de reserva
 * (`DECISOES.md#d204`).
 *
 * Sem login: é a porta de quem não consegue entrar. A resposta é a mesma com e
 * sem conta (`#d143`). Qualquer falha do caminho novo responde
 * `503 { reserva: true }`, e o login chama `sendPasswordResetEmail`, o modelo
 * do Firebase que a 042 configurou.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esquemaEmail = z.object({ email: z.email() });

/** Cinco toques seguidos, um e-mail: a chave muda a cada bloco de 10 min. */
const JANELA_MS = 10 * 60 * 1000;

const OK = () => NextResponse.json({ ok: true });
const RESERVA = () => NextResponse.json({ reserva: true }, { status: 503 });

export async function POST(requisicao: Request) {
  let corpo: unknown = null;
  try {
    corpo = await requisicao.json();
  } catch {
    // Vira falha de forma logo abaixo.
  }
  const lido = esquemaEmail.safeParse(corpo);
  if (!lido.success) {
    return NextResponse.json({ erro: "fora-de-forma" }, { status: 400 });
  }
  const { email } = lido.data;
  if (!credencialDisponivel()) return RESERVA();

  try {
    const auth = adminAuth();
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid;
    } catch (erro) {
      if ((erro as { code?: string }).code === "auth/user-not-found") {
        return OK();
      }
      throw erro;
    }

    // Da URL que o Admin SDK monta, só o código: o link aponta para a tela da
    // 042, qualquer que seja a URL de ação do console.
    const oobCode = new URL(
      await auth.generatePasswordResetLink(email),
    ).searchParams.get("oobCode");
    if (!oobCode) return RESERVA();

    const link = `${URL_DO_SITE}/redefinir-senha?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&lang=pt-BR`;
    const resultado = await enviarEmail({
      para: email,
      peca: senhaNova({ email, link }),
      chave: `senha/${uid}/${Math.floor(Date.now() / JANELA_MS)}`,
    });
    return resultado === "falhou" ? RESERVA() : OK();
  } catch (erro) {
    console.warn("[senha] caiu para a reserva:", erro);
    return RESERVA();
  }
}
