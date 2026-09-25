"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { Botao } from "@/components/ui/Botao";
import { CampoSenha, focarPrimeiroErro } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { obterAuth } from "@/lib/firebase/client";
import { traduzirErroAuth, useAuth } from "@/providers/AuthProvider";

/**
 * O código que não vale mais. `user-not-found` é a conta purgada depois do
 * pedido (`#d148`): para ela, o link também não serve.
 */
const LINK_QUE_NAO_SERVE = new Set([
  "auth/expired-action-code",
  "auth/invalid-action-code",
  "auth/user-not-found",
]);

type Estado =
  | { tipo: "conferindo" }
  | { tipo: "formulario"; email: string }
  | { tipo: "sem-rede"; frase: string }
  | { tipo: "invalido" };

function codigoDe(falha: unknown): string {
  return typeof falha === "object" && falha !== null && "code" in falha
    ? String((falha as { code: unknown }).code)
    : "";
}

/**
 * A URL de ação personalizada do modelo de e-mail (`DECISOES.md#d196`). O
 * Firebase acrescenta `mode`, `oobCode`, `apiKey` e `lang`; só os dois primeiros
 * importam, porque o `apiKey` é o mesmo do app.
 */
export default function PaginaRedefinirSenha() {
  return (
    <Suspense fallback={<Conferindo />}>
      <RedefinirSenha />
    </Suspense>
  );
}

function RedefinirSenha() {
  const parametros = useSearchParams();
  const modo = parametros.get("mode");
  const codigo = parametros.get("oobCode");
  const linkDeSenha = modo === "resetPassword" && !!codigo;

  const [estado, setEstado] = useState<Estado>(
    linkDeSenha ? { tipo: "conferindo" } : { tipo: "invalido" },
  );
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!linkDeSenha) return;
    let cancelado = false;

    // Conferir não gasta o código: rodar duas vezes no modo estrito não
    // estraga o link.
    verifyPasswordResetCode(obterAuth(), codigo)
      .then((email) => {
        if (!cancelado) setEstado({ tipo: "formulario", email });
      })
      .catch((falha: unknown) => {
        if (cancelado) return;
        setEstado(
          LINK_QUE_NAO_SERVE.has(codigoDe(falha))
            ? { tipo: "invalido" }
            : {
                tipo: "sem-rede",
                frase: traduzirErroAuth(
                  falha,
                  "Não deu para conferir o link agora. Tente de novo em instantes.",
                ),
              },
        );
      });

    return () => {
      cancelado = true;
    };
  }, [linkDeSenha, codigo, tentativa]);

  if (estado.tipo === "invalido") return <LinkQueNaoServe />;
  if (estado.tipo === "formulario") {
    return (
      <Formulario
        codigo={codigo!}
        email={estado.email}
        aoVencer={() => setEstado({ tipo: "invalido" })}
      />
    );
  }
  if (estado.tipo === "sem-rede") {
    return (
      <MolduraDeEntrada
        titulo="Senha nova"
        descricao="Falta conferir o link do e-mail."
      >
        <div className="mt-8 space-y-5">
          <p role="alert" className="text-label text-negative">
            {estado.frase}
          </p>
          <Botao
            variante="primaria"
            tamanho="lg"
            larguraTotal
            onClick={() => {
              setEstado({ tipo: "conferindo" });
              setTentativa((n) => n + 1);
            }}
          >
            Tentar de novo
          </Botao>
        </div>
      </MolduraDeEntrada>
    );
  }
  return <Conferindo />;
}

/** O formulário antes do e-mail chegar: a forma dele, sem giro (`#d196`). */
function Conferindo() {
  return (
    <MolduraDeEntrada titulo="Senha nova" descricao="Conferindo o link.">
      <div role="status" aria-label="Conferindo o link" className="mt-8">
        <Esqueleto className="h-4 w-24" />
        <Esqueleto className="mt-2.5 h-12 rounded-md" />
        <Esqueleto className="mt-2 h-4 w-40" />
        <Esqueleto className="mt-5 h-13 rounded-md" />
      </div>
    </MolduraDeEntrada>
  );
}

function LinkQueNaoServe() {
  return (
    <MolduraDeEntrada
      titulo="Senha nova"
      descricao="Este link já foi usado ou venceu. Peça outro na tela de entrar."
    >
      <Link
        href="/login"
        className={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          larguraTotal: true,
          className: "mt-8",
        })}
      >
        Ir para a tela de entrar
      </Link>
    </MolduraDeEntrada>
  );
}

function Formulario({
  codigo,
  email,
  aoVencer,
}: {
  codigo: string;
  email: string;
  aoVencer: () => void;
}) {
  const { entrar } = useAuth();
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  // Salva e ainda fora (a rede caiu entre os dois passos): tentar de novo só
  // entra, porque o código já foi gasto.
  const salva = useRef(false);

  const [erroSenha, setErroSenha] = useState<string>();
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);

    // Do formulário, e não do estado: o gerenciador de senhas preenche sem
    // disparar `onChange` (`#d192`).
    const senha = String(new FormData(formulario.current!).get("senha") ?? "");
    const recusa = !senha
      ? "Escreva a senha nova."
      : senha.length < 6
        ? traduzirErroAuth({ code: "auth/weak-password" })
        : undefined;
    setErroSenha(recusa);
    if (recusa) {
      focarPrimeiroErro();
      return;
    }

    setEnviando(true);
    try {
      if (!salva.current) {
        await confirmPasswordReset(obterAuth(), codigo, senha);
        salva.current = true;
      }
      // Ela já entra com a senha que acabou de digitar (`#d197`).
      await entrar(email, senha);
      router.replace("/");
    } catch (erro) {
      setEnviando(false);
      const codigoErro = codigoDe(erro);
      if (!salva.current && LINK_QUE_NAO_SERVE.has(codigoErro)) {
        aoVencer();
      } else if (codigoErro === "auth/weak-password") {
        setErroSenha(traduzirErroAuth(erro));
        focarPrimeiroErro();
      } else {
        setFalha(
          traduzirErroAuth(
            erro,
            salva.current
              ? "A senha nova está salva, mas não deu para entrar agora. Tente de novo."
              : "Não deu para salvar a senha agora. Tente de novo em instantes.",
          ),
        );
      }
    }
  }

  return (
    <MolduraDeEntrada
      titulo="Senha nova"
      descricao={
        <>
          Para <strong className="font-semibold text-ink">{email}</strong>.
        </>
      }
    >
      <form
        ref={formulario}
        onSubmit={aoEnviar}
        className="mt-8 space-y-5"
        noValidate
      >
        {/* Para o gerenciador de senhas saber de quem é a senha nova. */}
        <input
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />

        <CampoSenha
          rotulo="Senha nova"
          name="senha"
          autoComplete="new-password"
          minLength={6}
          dica="Pelo menos 6 caracteres."
          aria-required
          erro={erroSenha}
          onChange={() => setErroSenha(undefined)}
        />

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        <div className="space-y-3">
          <Botao
            type="submit"
            variante="primaria"
            tamanho="lg"
            larguraTotal
            carregando={enviando}
          >
            Salvar e entrar
          </Botao>

          {/* O link do e-mail abre no navegador, e depois dele não há tela de
              sucesso: ela cai em Hoje. Então a frase vem antes (`#d197`). */}
          <p className="text-center text-label text-ink-muted">
            Se você usa o Rende instalado, abra por ele depois e entre com a
            senha nova.
          </p>
        </div>
      </form>
    </MolduraDeEntrada>
  );
}
