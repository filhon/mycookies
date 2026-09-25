"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloudOff } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Botao } from "@/components/ui/Botao";
import { Campo, CampoSenha, focarPrimeiroErro } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { obterAuth } from "@/lib/firebase/client";
import { useConexao } from "@/lib/hooks/useDispositivo";
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

/** As falhas em que a saída é a senha nova, e não tentar de novo. */
const FALHAS_COM_SAIDA = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/too-many-requests",
]);

function codigoDe(falha: unknown): string {
  return typeof falha === "object" && falha !== null && "code" in falha
    ? String((falha as { code: unknown }).code)
    : "";
}

export default function PaginaLogin() {
  const { usuario, carregando, entrar } = useAuth();
  const router = useRouter();
  const online = useConexao();
  const formulario = useRef<HTMLFormElement>(null);

  const [erroEmail, setErroEmail] = useState<string>();
  const [erroSenha, setErroSenha] = useState<string>();
  const [falha, setFalha] = useState<{ codigo: string; frase: string } | null>(
    null,
  );
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) router.replace("/");
  }, [carregando, usuario, router]);

  /**
   * O valor sai do formulário, e não do estado do React: o preenchimento
   * automático do Chrome põe a senha no campo sem disparar `onChange` até o
   * primeiro toque na página (`DECISOES.md#d192`).
   */
  function lerCampos() {
    const dados = new FormData(formulario.current!);
    return {
      email: String(dados.get("email") ?? "").trim(),
      senha: String(dados.get("senha") ?? ""),
    };
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    setAvisoSenha(null);

    const { email, senha } = lerCampos();
    const semEmail = !email ? "Escreva o seu e-mail." : undefined;
    const semSenha = !senha ? "Escreva a sua senha." : undefined;
    setErroEmail(semEmail);
    setErroSenha(semSenha);
    if (semEmail || semSenha) {
      focarPrimeiroErro();
      return;
    }

    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace("/");
    } catch (erro) {
      setFalha({ codigo: codigoDe(erro), frase: traduzirErroAuth(erro) });
      setEnviando(false);
    }
  }

  /**
   * Trancada para fora, ela dependia de alguém com acesso ao console do
   * Firebase: era a única falha do produto que não se contorna por dentro dele.
   * `sendPasswordResetEmail` é do SDK que já está instalado.
   */
  async function recuperarSenha() {
    setFalha(null);
    const { email } = lerCampos();

    if (!email) {
      setAvisoSenha("Escreva o seu e-mail no campo acima e toque de novo.");
      return;
    }

    setRecuperando(true);
    try {
      await sendPasswordResetEmail(obterAuth(), email);
      setAvisoSenha(AVISO_ENVIO);
    } catch (erro) {
      // Cadastro inexistente devolve a mesma frase do envio: quem pergunta pelo
      // e-mail de outra pessoa não sai daqui sabendo mais do que entrou.
      setAvisoSenha(
        codigoDe(erro) === "auth/user-not-found"
          ? AVISO_ENVIO
          : traduzirErroAuth(
              erro,
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
      painel={<ContaAberta parada className="max-w-md" />}
    >
      {/* Antes de ela digitar tudo. Não bloqueia: `navigator.onLine` mente, e o
          erro de rede do Firebase continua traduzido. */}
      {!online && (
        <p className="mt-6 flex items-start gap-2 text-label text-ink-muted">
          <CloudOff
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
          <span>
            Sem internet agora. Entrar precisa de rede uma vez; depois o Rende
            funciona sem ela.
          </span>
        </p>
      )}

      <form
        ref={formulario}
        onSubmit={aoEnviar}
        className="mt-8 space-y-5"
        noValidate
      >
        {/* `aria-required`, e não `required`: com dois campos, os dois
            obrigatórios, o asterisco é ruído. */}
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-required
          erro={erroEmail}
          onChange={() => setErroEmail(undefined)}
        />

        <CampoSenha
          rotulo="Senha"
          name="senha"
          autoComplete="current-password"
          aria-required
          erro={erroSenha}
          onChange={() => setErroSenha(undefined)}
        />

        {falha && (
          <div className="flex flex-col items-start gap-1">
            <p role="alert" className="text-label text-negative">
              {falha.frase}
            </p>
            {FALHAS_COM_SAIDA.has(falha.codigo) && (
              <Botao
                variante="terciaria"
                tamanho="sm"
                className="-ml-3"
                onClick={() => void recuperarSenha()}
                carregando={recuperando}
              >
                Mandar link para criar senha nova
              </Botao>
            )}
          </div>
        )}

        <Botao
          type="submit"
          variante="primaria"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
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
