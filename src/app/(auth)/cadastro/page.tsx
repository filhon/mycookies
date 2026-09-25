"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { BotaoGoogle } from "@/components/auth/BotaoGoogle";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Botao } from "@/components/ui/Botao";
import { Campo, CampoSenha } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  MENSAGEM_FALHA_CADASTRO,
  TAMANHO_MAXIMO_NOME,
  type FalhaCadastro,
} from "@/lib/domain/cadastro";
import { obterAuth } from "@/lib/firebase/client";
import { useRascunhoDaPorta } from "@/lib/utils/rascunhoDaPorta";
import { traduzirErroAuth, useAuth } from "@/providers/AuthProvider";

/**
 * A porta (spec 027). O login nasce no aparelho; a conta e a claim nascem no
 * servidor, em `POST /api/conta` (`DECISOES.md#d141`).
 *
 * Um formulário com dois estados, e não duas telas: sem `usuario`, o formulário
 * inteiro; com `usuario` e sem `contaId`, o mesmo formulário sem e-mail e senha
 * — é o que aparece quando o `POST` caiu e ela volta, pelo "Tentar de novo",
 * recarregando a página ou dias depois pela tela "sem conta", e o que aparece
 * logo depois de "Continuar com o Google" (spec 043). Com `contaId`,
 * não há o que cadastrar: vai para `/`.
 */
export default function PaginaCadastro() {
  const { usuario, contaId, carregando, reconferirAcesso } = useAuth();
  const router = useRouter();
  const idTermos = useId();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [negocio, setNegocio] = useState("");
  const [termos, setTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // O rascunho da calculadora pública (spec 040-B): a conta nasce sabendo de
  // onde veio, e a moldura diz que o cookie dela vai estar lá.
  const daCalculadora = useRascunhoDaPorta() !== null;

  useEffect(() => {
    if (!carregando && contaId) router.replace("/");
  }, [carregando, contaId, router]);

  // O login já existe quando o `POST` caiu no meio: o segundo estado.
  const terminando = !carregando && usuario !== null;

  const pronto =
    nome.trim().length > 0 && termos && (terminando || (!!email && !!senha));

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const auth = obterAuth();
    try {
      // O mesmo `if` da bifurcação da tela: quem já entrou não cria login.
      if (!auth.currentUser) {
        await createUserWithEmailAndPassword(auth, email.trim(), senha);
      }
    } catch (falha) {
      setErro(
        traduzirErroAuth(
          falha,
          "Não foi possível criar a conta. Tente de novo.",
        ),
      );
      setEnviando(false);
      return;
    }

    // Daqui em diante o login existe: todo erro deixa a tela no segundo estado,
    // com o nome preenchido e o botão dizendo "Tentar de novo".
    try {
      const token = await auth.currentUser!.getIdToken();
      const resposta = await fetch("/api/conta", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          negocio: negocio.trim() || undefined,
          termos,
          origem: daCalculadora ? "calculadora" : undefined,
        }),
      });
      if (!resposta.ok) {
        setErro(MENSAGEM_FALHA_CADASTRO[await codigoDaFalha(resposta)]);
        setEnviando(false);
        return;
      }

      await reconferirAcesso();
      // `/fichas`, e não `/`: a conta vazia cai no botão da biblioteca, que é o
      // passo 1 do caminho (`DECISOES.md#d142`).
      router.replace("/fichas");
    } catch {
      // `TypeError` do `fetch`: sem rede, ou a rota bloqueada.
      setErro(MENSAGEM_FALHA_CADASTRO["sem-rede"]);
      setEnviando(false);
    }
  }

  return (
    <MolduraDeEntrada
      titulo="Criar minha conta"
      descricao={`Catorze dias grátis, sem cartão. Primeiro preço em dez minutos.${
        daCalculadora ? " O cookie que você calculou vai estar lá." : ""
      }`}
      painel={<ContaAberta parada className="max-w-md" />}
    >
      {/* Depois do Google, `usuario` existe e a tela cai no segundo estado: o
          nome vem do `displayName`, e a caixa dos termos continua dela. */}
      {!terminando && (
        <BotaoGoogle
          aoEntrar={(conta) =>
            setNome(
              (atual) =>
                atual ||
                (conta.displayName ?? "").slice(0, TAMANHO_MAXIMO_NOME),
            )
          }
        />
      )}

      <form
        onSubmit={aoEnviar}
        className={terminando ? "mt-8 space-y-5" : "mt-6 space-y-5"}
        noValidate
      >
        {terminando ? (
          <p className="rounded-md bg-sunken px-4 py-3 text-label text-ink">
            Você entrou como{" "}
            <strong className="font-semibold">{usuario?.email}</strong>. Confira
            o seu nome e aceite os termos.
          </p>
        ) : (
          <>
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

            <CampoSenha
              rotulo="Senha"
              autoComplete="new-password"
              minLength={6}
              dica="Pelo menos 6 caracteres."
              required
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
          </>
        )}

        <Campo
          rotulo="Seu nome"
          type="text"
          autoComplete="name"
          maxLength={TAMANHO_MAXIMO_NOME}
          required
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />

        <Campo
          rotulo="Nome do negócio"
          type="text"
          autoComplete="organization"
          maxLength={TAMANHO_MAXIMO_NOME}
          dica="Se ainda não tem, deixe em branco."
          value={negocio}
          onChange={(evento) => setNegocio(evento.target.value)}
        />

        {/* A caixa é o ato dela: é o que faz `termosAceitosEm` ser consentimento
            que se prova, e não uma linha de texto. Os links abrem em aba nova
            para não perder o formulário. */}
        <div className="flex min-h-11 items-start gap-3 rounded-md border border-line-strong px-3 py-3">
          <input
            id={idTermos}
            type="checkbox"
            required
            checked={termos}
            onChange={(evento) => setTermos(evento.target.checked)}
            className="mt-0.5 size-5 shrink-0"
          />
          <label htmlFor={idTermos} className="text-label text-ink">
            Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener"
              className="font-medium text-brand-ink underline underline-offset-2"
            >
              termos de uso
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="font-medium text-brand-ink underline underline-offset-2"
            >
              política de privacidade
            </a>
            .
          </label>
        </div>

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
          disabled={!pronto}
        >
          {/* Depois do Google é a primeira vez, e não uma nova tentativa. */}
          {terminando && erro ? "Tentar de novo" : "Criar conta"}
        </Botao>
      </form>

      <p className="mt-8 flex flex-wrap items-center justify-center gap-x-1 text-label text-ink-muted">
        Já tem conta?
        <Link
          href="/login"
          className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
        >
          Entrar
        </Link>
      </p>
    </MolduraDeEntrada>
  );
}

/** O padrão de `TelaNota`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaCadastro> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_CADASTRO) {
      return corpo.erro as FalhaCadastro;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  return "sem-resposta";
}
