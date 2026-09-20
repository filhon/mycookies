"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
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
    <MolduraDeEntrada
      titulo="Entrar"
      descricao="O seu preço, os seus pedidos e o seu caixa, no mesmo lugar."
    >
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

      {/* A porta nova (spec 027). Quem entra pelo script continua sendo
          instruída pelo script; a tela deixa de repetir a instrução. */}
      <p className="mt-8 flex flex-wrap items-center justify-center gap-x-1 text-label text-ink-muted">
        Ainda não tem conta?
        <Link
          href="/cadastro"
          className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
        >
          Criar minha conta
        </Link>
      </p>
    </MolduraDeEntrada>
  );
}
