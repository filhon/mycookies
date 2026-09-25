"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { Botao } from "@/components/ui/Botao";
import { obterAuth } from "@/lib/firebase/client";
import { traduzirErroAuth } from "@/providers/AuthProvider";

/** Ela fechou a janela, ou tocou de novo antes da primeira voltar: não é erro. */
const DESISTENCIAS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

/**
 * "Continuar com o Google" e a divisória "ou com e-mail", em cima do
 * formulário do login e do cadastro (spec 043, `DECISOES.md#d198`).
 *
 * Popup, e não redirecionamento (`#d199`): o `authDomain` é o domínio do app,
 * que serve `/__/auth/*` pelo `rewrites` de `next.config.ts`.
 */
export function BotaoGoogle({
  aoEntrar,
}: {
  aoEntrar: (usuario: User) => void | Promise<void>;
}) {
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null);
    // Sem rede, a janela abriria vazia e o Firebase só desistiria depois.
    if (!navigator.onLine) {
      setErro(traduzirErroAuth({ code: "auth/network-request-failed" }));
      return;
    }

    setEntrando(true);
    const provedor = new GoogleAuthProvider();
    provedor.setCustomParameters({ prompt: "select_account" });
    try {
      // A primeira coisa do toque: qualquer `await` antes e o navegador
      // bloqueia a janela.
      const { user } = await signInWithPopup(obterAuth(), provedor);
      // `entrando` fica ligado: quem chama navega para fora daqui.
      await aoEntrar(user);
    } catch (falha) {
      const codigo =
        typeof falha === "object" && falha !== null && "code" in falha
          ? String((falha as { code: unknown }).code)
          : "";
      if (!DESISTENCIAS.has(codigo)) setErro(traduzirErroAuth(falha));
      setEntrando(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-2">
        <Botao
          variante="secundaria"
          tamanho="lg"
          larguraTotal
          carregando={entrando}
          iconeInicial={<LogoGoogle />}
          onClick={() => void entrar()}
        >
          Continuar com o Google
        </Botao>
        {erro && (
          <p role="alert" className="text-label text-negative">
            {erro}
          </p>
        )}
      </div>

      <p className="flex items-center gap-3 text-label text-ink-muted">
        <span aria-hidden className="h-px flex-1 bg-line" />
        ou com e-mail
        <span aria-hidden className="h-px flex-1 bg-line" />
      </p>
    </div>
  );
}

/**
 * O "G" nas cores do Google, as únicas fora dos tokens do Rende: as regras de
 * marca do Google exigem o logotipo como ele é, sem recolorir.
 */
function LogoGoogle() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
