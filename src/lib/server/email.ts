import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import type { Peca } from "@/lib/email/pecas";

/**
 * O e-mail do Rende sai pelo Resend, por `fetch` (`DECISOES.md#d202`): o SDK
 * embrulha este mesmo `POST` e não faz mais nada que o projeto use.
 *
 * Nunca lança. E-mail é consequência, nunca o motivo de uma rota falhar: quem
 * chama decide o que fazer com `"falhou"` (a senha tem a reserva do Firebase,
 * `#d204`; a boas-vindas só não chega).
 */

/** `ola@` não tem caixa: a resposta vai para uma pessoa (`#d208`). */
const REMETENTE = "Rende <ola@rendeapp.com.br>";

export type ResultadoEnvio = "enviado" | "repetido" | "falhou";

export async function enviarEmail({
  para,
  peca,
  chave,
}: {
  para: string;
  peca: Peca;
  /** `Idempotency-Key`: a mesma chave em 24 h manda um e-mail só. */
  chave: string;
}): Promise<ResultadoEnvio> {
  const chaveApi = process.env.RESEND_API_KEY?.trim();
  if (!chaveApi) {
    console.warn(`[email] sem RESEND_API_KEY; ${chave} não saiu.`);
    return "falhou";
  }

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chaveApi}`,
        "Content-Type": "application/json",
        "Idempotency-Key": chave,
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [para],
        reply_to: RESPONSAVEL.email,
        subject: peca.assunto,
        html: peca.html,
        text: peca.texto,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (resposta.ok) return "enviado";
    // A chave já usada, com outro corpo (a senha: outro `oobCode`) ou ainda
    // em andamento. O primeiro e-mail é o que vale.
    if (resposta.status === 409) return "repetido";
    // Sem o endereço no log: a chave diz de quem é.
    console.warn(`[email] Resend respondeu ${resposta.status} para ${chave}.`);
    return "falhou";
  } catch (erro) {
    console.warn(`[email] ${chave} não saiu:`, erro);
    return "falhou";
  }
}
