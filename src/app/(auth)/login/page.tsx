"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Logotipo, PadraoCookie } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { obterAuth } from "@/lib/firebase/client";
import { traduzirErroAuth, useAuth } from "@/providers/AuthProvider";

/**
 * A mesma frase existindo ou não o cadastro.
 *
 * Um "esse e-mail não está cadastrado" seria o sistema confirmando, para quem
 * digitou, quem tem conta aqui. O que ela precisa saber é o que fazer agora, e
 * isso não depende da resposta.
 */
const AVISO_ENVIO =
  "Se houver uma conta com esse e-mail, o link para criar uma senha nova chega em instantes. Vale olhar também na caixa de spam.";

export default function PaginaLogin() {
  const { usuario, carregando, entrar } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) router.replace("/");
  }, [carregando, usuario, router]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAvisoSenha(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace("/");
    } catch (falha) {
      setErro(traduzirErroAuth(falha));
      setEnviando(false);
    }
  }

  /**
   * Trancada para fora, ela dependia de alguém com acesso ao console do
   * Firebase: era a única falha do produto que não se contorna por dentro dele.
   * `sendPasswordResetEmail` é do SDK que já está instalado.
   */
  async function recuperarSenha() {
    setErro(null);

    if (!email.trim()) {
      setAvisoSenha("Escreva o seu e-mail no campo acima e toque de novo.");
      return;
    }

    setRecuperando(true);
    try {
      await sendPasswordResetEmail(obterAuth(), email.trim());
      setAvisoSenha(AVISO_ENVIO);
    } catch (falha) {
      // Cadastro inexistente devolve a mesma frase do envio: quem pergunta pelo
      // e-mail de outra pessoa não sai daqui sabendo mais do que entrou.
      const codigo =
        typeof falha === "object" && falha !== null && "code" in falha
          ? String((falha as { code: unknown }).code)
          : "";

      setAvisoSenha(
        codigo === "auth/user-not-found"
          ? AVISO_ENVIO
          : traduzirErroAuth(
              falha,
              "Não deu para enviar agora. Tente de novo em instantes.",
            ),
      );
    } finally {
      setRecuperando(false);
    }
  }

  return (
    <div className="textura-papel flex min-h-dvh bg-canvas">
      {/* Painel de marca: o papel de embrulho da MyCookie's, só no desktop. */}
      <aside className="relative hidden w-[42%] shrink-0 overflow-hidden bg-wine-900 lg:flex lg:flex-col lg:justify-between">
        <PadraoCookie className="absolute inset-0 text-on-wine opacity-[0.07]" />

        <div className="filete-dourado relative px-10 pt-12">
          <Logotipo tamanho="lg" className="items-start text-on-wine" />
        </div>

        <p className="relative max-w-[26ch] px-10 pb-14 font-display text-title font-normal leading-snug text-on-wine">
          O preço certo de cada doce, antes de mandar o orçamento.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logotipo
              tamanho="md"
              className="text-wine-700 dark:text-wine-300"
            />
          </div>

          <h1 className="font-display text-title font-semibold text-ink">
            Entrar no sistema
          </h1>
          <p className="mt-1.5 text-body text-ink-muted">
            Acesso restrito à administradora da MyCookie&rsquo;s.
          </p>

          <form onSubmit={aoEnviar} className="mt-8 space-y-5" noValidate>
            <Campo
              rotulo="E-mail"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />

            <Campo
              rotulo="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />

            {erro && (
              <p role="alert" className="text-label text-negative">
                {erro}
              </p>
            )}

            <Botao
              type="submit"
              variante="primaria"
              tamanho="lg"
              larguraTotal
              carregando={enviando}
              disabled={!email || !senha}
            >
              Entrar
            </Botao>

            <div className="flex flex-col items-center gap-2">
              <Botao
                variante="terciaria"
                tamanho="sm"
                onClick={() => void recuperarSenha()}
                carregando={recuperando}
                disabled={enviando}
              >
                Esqueci minha senha
              </Botao>

              {/* A resposta é a mesma existindo ou não o cadastro, e nenhum
                  código do Firebase chega até aqui. */}
              {avisoSenha && (
                <p
                  aria-live="polite"
                  className="max-w-[42ch] text-center text-label text-ink-muted"
                >
                  {avisoSenha}
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
