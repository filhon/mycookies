import { sendPasswordResetEmail } from "firebase/auth";
import { obterAuth } from "@/lib/firebase/client";
import { traduzirErroAuth } from "@/providers/AuthProvider";

/**
 * A mesma frase existindo ou não o cadastro.
 *
 * Um "esse e-mail não está cadastrado" seria o sistema confirmando, para quem
 * digitou, quem tem conta aqui. O que ela precisa saber é o que fazer agora, e
 * isso não depende da resposta.
 */
export const AVISO_ENVIO =
  "Se houver uma conta com esse e-mail, o link para criar uma senha nova chega em instantes. Vale olhar também na caixa de spam.";

/** `true` quando o Rende mandou (ou nem precisava mandar); senão, a reserva. */
async function senhaPeloRende(email: string): Promise<boolean> {
  try {
    const resposta = await fetch("/api/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return resposta.ok;
  } catch {
    // Sem rede: a reserva também cai, e a frase de rede é a dela.
    return false;
  }
}

/**
 * Manda o link de senha nova e devolve a frase a mostrar: o aviso, ou a falha
 * traduzida. O e-mail sai pelo Rende (`/api/senha`, `DECISOES.md#d204`); com a
 * rota pedindo reserva ou sem resposta, pelo modelo do Firebase. Usada pelo
 * login e pelo link que não vale mais (`#d369`).
 */
export async function pedirSenhaNova(email: string): Promise<string> {
  try {
    if (!(await senhaPeloRende(email))) {
      await sendPasswordResetEmail(obterAuth(), email);
    }
    return AVISO_ENVIO;
  } catch (erro) {
    // Cadastro inexistente devolve a mesma frase do envio: quem pergunta pelo
    // e-mail de outra pessoa não sai daqui sabendo mais do que entrou.
    const codigo =
      typeof erro === "object" && erro !== null && "code" in erro
        ? String((erro as { code: unknown }).code)
        : "";
    return codigo === "auth/user-not-found"
      ? AVISO_ENVIO
      : traduzirErroAuth(
          erro,
          "Não deu para enviar agora. Tente de novo em instantes.",
        );
  }
}
