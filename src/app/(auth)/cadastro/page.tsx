"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { CircleAlert } from "lucide-react";
import { BotaoGoogle } from "@/components/auth/BotaoGoogle";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Botao } from "@/components/ui/Botao";
import { Campo, CampoSenha, focarPrimeiroErro } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  CHAVE_DA_ORIGEM,
  CHAVE_DO_CONVITE,
  DIAS_DE_TESTE,
  MENSAGEM_FALHA_CADASTRO,
  TAMANHO_MAXIMO_NOME,
  sugerirEmail,
  type FalhaCadastro,
} from "@/lib/domain/cadastro";
import { exemploDoRascunho } from "@/lib/domain/calculadora";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";
import { RECUSA_SENHA_COMUM, senhaComum } from "@/lib/domain/senha";
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
  // "gmial.com" no teclado do celular é uma conta perdida (`#d366`). Informa,
  // não bloqueia: quem tem domínio parecido de verdade não pode ficar presa.
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [negocio, setNegocio] = useState("");
  const [termos, setTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<{
    email?: string;
    senha?: string;
    nome?: string;
    termos?: string;
  }>({});
  const [enviando, setEnviando] = useState(false);
  // O rascunho da calculadora pública (spec 040-B): a conta nasce sabendo de
  // onde veio, e a porta mostra o cookie dela no lugar do exemplo (`#d364`).
  const rascunho = useRascunhoDaPorta();
  const daCalculadora = rascunho !== null;
  const dela = rascunho && exemploDoRascunho(rascunho);
  const sugeridoDela =
    dela && calcularPrecoSugerido(dela.custo.custoUnitario, dela.parametros);

  useEffect(() => {
    if (!carregando && contaId) router.replace("/");
  }, [carregando, contaId, router]);

  // O código do link vai para o aparelho já na chegada (spec 181): se ela for
  // ao login, ou entrar com o Google por lá, volta para cá sem `?convite=`.
  useEffect(() => {
    const codigo = conviteDoEndereco();
    if (!codigo) return;
    try {
      localStorage.setItem(CHAVE_DO_CONVITE, codigo);
    } catch {
      // Sem armazenamento, o endereço ainda tem o código até o POST.
    }
  }, []);

  // O login já existe quando o `POST` caiu no meio: o segundo estado.
  const terminando = !carregando && usuario !== null;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!terminando) setSugestao(sugerirEmail(email));

    // O botão fica ativo, e o que falta aparece no campo: um botão apagado
    // não diz por quê.
    const faltas = {
      email: terminando || email.trim() ? undefined : "Escreva o seu e-mail.",
      senha: terminando
        ? undefined
        : !senha
          ? "Escreva uma senha."
          : senha.length < 6
            ? traduzirErroAuth({ code: "auth/weak-password" })
            : senhaComum(senha, email)
              ? RECUSA_SENHA_COMUM
              : undefined,
      nome: nome.trim() ? undefined : "Escreva o seu nome.",
      termos: termos ? undefined : "Marque a caixa para aceitar os termos.",
    };
    setErros(faltas);
    if (Object.values(faltas).some(Boolean)) {
      focarPrimeiroErro();
      return;
    }

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
          origem: daCalculadora
            ? "calculadora"
            : doCardapio()
              ? "cardapio"
              : undefined,
          convite: conviteGuardado(),
        }),
      });
      if (!resposta.ok) {
        setErro(MENSAGEM_FALHA_CADASTRO[await codigoDaFalha(resposta)]);
        setEnviando(false);
        return;
      }
      try {
        localStorage.removeItem(CHAVE_DO_CONVITE);
      } catch {
        // Nada guardado, nada a tirar.
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
      descricao={
        <>
          {`${DIAS_DE_TESTE} dias grátis, sem cartão. `}
          {/* No desktop o painel mostra os números dela; no celular, sem
              painel, a frase os diz. */}
          <span className={sugeridoDela?.ok ? "max-lg:hidden" : undefined}>
            {`Primeiro preço em 10 minutos.${
              daCalculadora ? " O cookie que você calculou vai estar lá." : ""
            }`}
          </span>
          {dela && sugeridoDela?.ok && (
            <span className="lg:hidden">
              {`O seu ${dela.nome.toLocaleLowerCase("pt-BR")} custa `}
              <span className="num font-semibold text-ink">
                {formatarMoeda(dela.custo.custoUnitario)}
              </span>{" "}
              e o sugerido é{" "}
              <span className="num font-semibold text-ink">
                {formatarMoeda(sugeridoDela.precoArredondado)}
              </span>
              : vai estar lá quando a conta abrir.
            </span>
          )}
        </>
      }
      painel={
        <ContaAberta
          parada
          exemplo={dela ?? EXEMPLO}
          dela={!!dela}
          className="max-w-md"
        />
      }
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
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-required
              erro={erros.email}
              dica={
                sugestao && (
                  <span
                    aria-live="polite"
                    className="flex flex-wrap items-center gap-x-1 text-ink"
                  >
                    <span>
                      Você quis dizer{" "}
                      <strong className="font-semibold">{sugestao}</strong>?
                    </span>
                    <Botao
                      variante="terciaria"
                      tamanho="sm"
                      onClick={() => {
                        setEmail(sugestao);
                        setSugestao(null);
                      }}
                    >
                      Corrigir
                    </Botao>
                  </span>
                )
              }
              value={email}
              onBlur={() => setSugestao(sugerirEmail(email))}
              onChange={(evento) => {
                setEmail(evento.target.value);
                setSugestao(null);
                setErros((e) => ({ ...e, email: undefined }));
              }}
            />

            <CampoSenha
              rotulo="Senha"
              name="senha"
              autoComplete="new-password"
              minLength={6}
              dica="Pelo menos 6 caracteres."
              aria-required
              erro={erros.senha}
              value={senha}
              onChange={(evento) => {
                setSenha(evento.target.value);
                setErros((e) => ({ ...e, senha: undefined }));
              }}
            />
          </>
        )}

        <Campo
          rotulo="Seu nome"
          name="nome"
          type="text"
          autoComplete="name"
          maxLength={TAMANHO_MAXIMO_NOME}
          aria-required
          erro={erros.nome}
          value={nome}
          onChange={(evento) => {
            setNome(evento.target.value);
            setErros((e) => ({ ...e, nome: undefined }));
          }}
        />

        <Campo
          rotulo="Nome do negócio"
          name="negocio"
          type="text"
          autoComplete="organization"
          maxLength={TAMANHO_MAXIMO_NOME}
          dica="Se ainda não tem, deixe em branco."
          value={negocio}
          onChange={(evento) => setNegocio(evento.target.value)}
        />

        {/* A caixa é o ato dela: é o que faz `termosAceitosEm` ser consentimento
            que se prova, e não uma linha de texto. Os links abrem em aba nova
            para não perder o formulário. A caixa inteira é o alvo do toque; sem
            moldura, para não ler como o quinto campo (`#d367`). */}
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
            <input
              type="checkbox"
              name="termos"
              aria-required
              checked={termos}
              aria-invalid={erros.termos ? true : undefined}
              aria-describedby={erros.termos ? idTermos : undefined}
              onChange={(evento) => {
                setTermos(evento.target.checked);
                setErros((e) => ({ ...e, termos: undefined }));
              }}
              className="mt-0.5 size-5 shrink-0"
            />
            <span className="text-label text-ink">
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
            </span>
          </label>
          {erros.termos && (
            // Sem a borda vermelha, o ícone é o segundo sinal além da cor.
            <p
              id={idTermos}
              role="alert"
              className="flex items-start gap-1.5 text-label text-negative"
            >
              <CircleAlert
                aria-hidden
                strokeWidth={1.75}
                className="mt-0.5 size-4 shrink-0"
              />
              {erros.termos}
            </p>
          )}
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
        >
          {/* Depois do Google é a primeira vez, e não uma nova tentativa. */}
          {terminando && erro ? "Tentar de novo" : "Começar o teste grátis"}
        </Botao>
      </form>

      {/* O que vem no dia 15, colado no botão (`#d365`), sem o valor em
          reais: o preço é do Stripe (`#d201`). Aba nova, como os termos. */}
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-center text-label text-ink-muted">
        No fim do teste nada é cobrado. Você escolhe se assina; se não assinar,
        o que fez continua lá.
        <a
          href="/conheca#preco"
          target="_blank"
          rel="noopener"
          className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
        >
          Ver os planos
        </a>
      </p>

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

/** Veio pelo rodapé de um cardápio (spec 114, `#d317`), marcado em `/conheca`. */
function doCardapio(): boolean {
  try {
    return localStorage.getItem(CHAVE_DA_ORIGEM) === "cardapio";
  } catch {
    return false;
  }
}

/** O teto é o do esquema: o que passar disso não é código, e a rota recusa. */
function conviteDoEndereco(): string | undefined {
  return (
    new URLSearchParams(location.search).get("convite")?.slice(0, 40) ||
    undefined
  );
}

/** O do endereço, e sem ele o que ficou no aparelho (spec 181). */
function conviteGuardado(): string | undefined {
  const doEndereco = conviteDoEndereco();
  if (doEndereco) return doEndereco;
  try {
    return localStorage.getItem(CHAVE_DO_CONVITE)?.slice(0, 40) || undefined;
  } catch {
    return undefined;
  }
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
