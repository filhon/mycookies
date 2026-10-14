"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { CircleAlert, CloudOff } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { pedirSenhaNova } from "@/components/auth/pedirSenhaNova";
import { Botao } from "@/components/ui/Botao";
import { Campo, CampoSenha, focarPrimeiroErro } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { RECUSA_SENHA_COMUM, senhaComum } from "@/lib/domain/senha";
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

type Motivo = "vencido" | "outro";

type Estado =
  | { tipo: "conferindo" }
  | { tipo: "formulario"; email: string }
  | { tipo: "sem-rede"; rede: boolean; frase: string }
  | { tipo: "invalido"; motivo: Motivo }
  | { tipo: "pronta"; email: string };

function codigoDe(falha: unknown): string {
  return typeof falha === "object" && falha !== null && "code" in falha
    ? String((falha as { code: unknown }).code)
    : "";
}

function motivoDe(codigo: string): Motivo {
  return codigo === "auth/expired-action-code" ? "vencido" : "outro";
}

/** A frase de erro com o ícone: nesta tela, nenhum erro só pela cor. */
function Erro({ children }: { children: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-label text-negative">
      <CircleAlert
        aria-hidden
        strokeWidth={1.75}
        className="mt-0.5 size-4 shrink-0"
      />
      <span>{children}</span>
    </p>
  );
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
    linkDeSenha
      ? { tipo: "conferindo" }
      : { tipo: "invalido", motivo: "outro" },
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
        const codigoFalha = codigoDe(falha);
        setEstado(
          LINK_QUE_NAO_SERVE.has(codigoFalha)
            ? { tipo: "invalido", motivo: motivoDe(codigoFalha) }
            : {
                tipo: "sem-rede",
                rede: codigoFalha === "auth/network-request-failed",
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

  // A rede que volta refaz a conferência sozinha. É o mesmo evento que o
  // `useConexao()` escuta, ouvido só enquanto a tela espera por ele.
  const semRede = estado.tipo === "sem-rede";
  useEffect(() => {
    if (!semRede) return;
    function deNovo() {
      setEstado({ tipo: "conferindo" });
      setTentativa((n) => n + 1);
    }
    window.addEventListener("online", deNovo);
    return () => window.removeEventListener("online", deNovo);
  }, [semRede]);

  if (estado.tipo === "invalido") {
    return <LinkQueNaoServe motivo={estado.motivo} />;
  }
  if (estado.tipo === "pronta") return <Pronta email={estado.email} />;
  if (estado.tipo === "formulario") {
    return (
      <Formulario
        codigo={codigo!}
        email={estado.email}
        aoVencer={(motivo) => setEstado({ tipo: "invalido", motivo })}
        aoTerminar={() => {
          setEstado({ tipo: "pronta", email: estado.email });
          // O código gasto sai da barra e do histórico: recarregar cai em
          // "Você já entrou" (`#d368`).
          window.history.replaceState(null, "", "/redefinir-senha");
        }}
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
          {estado.rede ? (
            <p className="flex items-start gap-2 text-label text-ink-muted">
              <CloudOff
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-attention"
                strokeWidth={1.75}
              />
              <span>
                Sem internet agora. Conferir o link precisa de rede; a tela
                tenta de novo quando ela voltar.
              </span>
            </p>
          ) : (
            <Erro>{estado.frase}</Erro>
          )}
          {/* Continua: `navigator.onLine` mente, e o evento pode não vir. */}
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
    <MolduraDeEntrada titulo="Senha nova" descricao="Conferindo o link…">
      <div role="status" className="mt-8">
        <span className="sr-only">Conferindo o link…</span>
        <Esqueleto className="h-4 w-24" />
        <Esqueleto className="mt-2.5 h-12 rounded-md" />
        <Esqueleto className="mt-2 h-4 w-40" />
        <Esqueleto className="mt-5 h-13 rounded-md" />
      </div>
    </MolduraDeEntrada>
  );
}

const CLASSE_ABRIR = classesBotao({
  variante: "primaria",
  tamanho: "lg",
  larguraTotal: true,
});

/**
 * Depois de salvar e entrar, o fim do fluxo diz que deu certo (`#d368`).
 * Sem redirecionamento automático: o toque a mais é o preço da confirmação.
 */
function Pronta({ email }: { email: string }) {
  const titulo = useRef<HTMLHeadingElement>(null);

  // O leitor de tela anuncia o pronto pelo título.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <MolduraDeEntrada
      titulo="Senha trocada"
      refTitulo={titulo}
      descricao={
        <>
          Você já entrou como{" "}
          <strong className="font-semibold text-ink">{email}</strong>.
        </>
      }
    >
      <div className="mt-8 space-y-3">
        <Link href="/" replace className={CLASSE_ABRIR}>
          Abrir o Rende
        </Link>
        {/* No Android o app instalado divide a sessão com o Chrome; no iPhone
            ele tem a dele e vai pedir. A frase vale nos dois. O aviso é dito
            sempre, sem esperar a rota (`#d371`). */}
        <p className="text-center text-label text-ink-muted">
          Mandamos um aviso para{" "}
          <strong className="font-semibold text-ink">{email}</strong>. Se o
          Rende pedir a senha em outro aparelho ou no app instalado, é esta
          nova.
        </p>
      </div>
    </MolduraDeEntrada>
  );
}

/**
 * Três caras, decididas na hora de montar (`#d369`): quem já está dentro abre o
 * Rende; os outros mandam outro link ali mesmo.
 */
function LinkQueNaoServe({ motivo }: { motivo: Motivo }) {
  const { usuario, carregando } = useAuth();

  // Esperar a sessão: senão o formulário de e-mail pisca para quem já entrou.
  if (carregando) return <Conferindo />;

  if (usuario) {
    return (
      <MolduraDeEntrada
        titulo="Você já entrou"
        descricao={
          <>
            Este link já foi usado. Você está no Rende como{" "}
            <strong className="font-semibold text-ink">{usuario.email}</strong>.
          </>
        }
      >
        <Link href="/" replace className={`${CLASSE_ABRIR} mt-8`}>
          Abrir o Rende
        </Link>
      </MolduraDeEntrada>
    );
  }

  return (
    <MolduraDeEntrada
      titulo={
        motivo === "vencido" ? "Este link venceu" : "Este link não vale mais"
      }
      descricao={
        motivo === "vencido"
          ? "Ele vale por uma hora. Mande outro para o seu e-mail."
          : "Ele funciona uma vez. Mande outro para o seu e-mail."
      }
    >
      <PedirOutroLink />
    </MolduraDeEntrada>
  );
}

function PedirOutroLink() {
  const formulario = useRef<HTMLFormElement>(null);
  const [erroEmail, setErroEmail] = useState<string>();
  const [resposta, setResposta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setResposta(null);

    // Do formulário, e não do estado (`#d192`).
    const email = String(
      new FormData(formulario.current!).get("email") ?? "",
    ).trim();
    if (!email) {
      setErroEmail("Escreva o seu e-mail.");
      focarPrimeiroErro();
      return;
    }

    setEnviando(true);
    // A mesma frase do login, exista ou não a conta (`#d143`).
    setResposta(await pedirSenhaNova(email));
    setEnviando(false);
  }

  return (
    <form
      ref={formulario}
      onSubmit={aoEnviar}
      className="mt-8 space-y-5"
      noValidate
    >
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

      <Botao
        type="submit"
        variante="primaria"
        tamanho="lg"
        larguraTotal
        carregando={enviando}
      >
        Mandar outro link
      </Botao>

      <div className="flex flex-col items-center gap-2">
        {/* A região vive montada: a que nasce junto com o texto não é lida. */}
        <div aria-live="polite">
          {resposta && (
            <p className="max-w-[42ch] text-center text-label text-ink-muted">
              {resposta}
            </p>
          )}
        </div>

        <Link
          href="/login"
          className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
        >
          Ir para a tela de entrar
        </Link>
      </div>
    </form>
  );
}

/**
 * O aviso por e-mail da troca (`#d371`). Sem `await`: o pronto não espera a
 * ida ao Resend, e a falha não aparece na tela.
 */
function avisarTroca() {
  obterAuth()
    .currentUser?.getIdToken()
    .then((token) =>
      fetch("/api/senha/trocada", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      }),
    )
    .catch(() => {});
}

function Formulario({
  codigo,
  email,
  aoVencer,
  aoTerminar,
}: {
  codigo: string;
  email: string;
  aoVencer: (motivo: Motivo) => void;
  aoTerminar: () => void;
}) {
  const { entrar } = useAuth();
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
        : senhaComum(senha, email)
          ? RECUSA_SENHA_COMUM
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
      avisarTroca();
      aoTerminar();
    } catch (erro) {
      setEnviando(false);
      const codigoErro = codigoDe(erro);
      if (!salva.current && LINK_QUE_NAO_SERVE.has(codigoErro)) {
        aoVencer(motivoDe(codigoErro));
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

        {/* A tela existe para uma coisa só. No iPhone o teclado não sobe sem
            toque; no Android e no desktop, ela já digita. */}
        <CampoSenha
          rotulo="Senha nova"
          name="senha"
          autoComplete="new-password"
          minLength={6}
          dica="Pelo menos 6 caracteres."
          aria-required
          autoFocus
          erro={erroSenha}
          onChange={() => setErroSenha(undefined)}
        />

        {falha && <Erro>{falha}</Erro>}

        <Botao
          type="submit"
          variante="primaria"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
        >
          Salvar e entrar
        </Botao>
      </form>
    </MolduraDeEntrada>
  );
}
