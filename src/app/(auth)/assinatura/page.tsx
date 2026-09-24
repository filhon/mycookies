"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { MeusDados } from "@/components/conta/MeusDados";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  economiaAnual,
  MENSAGEM_FALHA_ASSINATURA,
  NOME_DO_PACOTE,
  O_QUE_O_PACOTE_TEM,
  paraSituar,
  situacaoDaConta,
  type FalhaAssinatura,
  type Periodo,
} from "@/lib/domain/assinatura";
import { formatarMoeda } from "@/lib/domain/money";
import type { Pacote } from "@/lib/types";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

type Precos = Record<Pacote, Record<Periodo, number>>;

/** O essencial primeiro, e primário: o produto que se vende é a frase do preço (spec 032, 3.5). */
const PACOTES: Pacote[] = ["ESSENCIAL", "COMPLETO"];

/**
 * A tela de quatro estados (spec 028, 3.5): teste, teste vencido, assinatura
 * vencida e assinante. `livre` não tem o que ver — sai sozinha para `/`.
 *
 * Fora do shell, em `(auth)`, com `MolduraDeEntrada`: a terceira tela que o
 * comentário dela esperava.
 *
 * A ajudante não paga (`DECISOES.md#d156`): para ela a tela só existe vencida,
 * sem preço, sem portal e sem `MeusDados`. Antes de vencer, volta para `/`.
 */
export default function PaginaAssinatura() {
  const { usuario, contaId, papel, conta, carregando, sair } = useAuth();
  const ajudante = papel === "AJUDANTE";
  const router = useRouter();

  const [precos, setPrecos] = useState<Precos | null>(null);
  const [falhaPrecos, setFalhaPrecos] = useState(false);
  const [enviando, setEnviando] = useState<Pacote | "portal" | null>(null);
  // O anual continua sendo a arma contra o churn (roadmap §1).
  const [periodo, setPeriodo] = useState<Periodo>("anual");
  const idPeriodo = useId();
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [sairPendente, setSairPendente] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  useEffect(() => {
    if (!carregando && usuario && !contaId) router.replace("/");
  }, [carregando, usuario, contaId, router]);

  useEffect(() => {
    if (!usuario || ajudante) return;
    let cancelado = false;

    async function carregar() {
      try {
        const token = await usuario!.getIdToken();
        const resposta = await fetch("/api/assinatura/precos", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) throw new Error();
        const dados = (await resposta.json()) as Precos;
        if (!cancelado) setPrecos(dados);
      } catch {
        if (!cancelado) setFalhaPrecos(true);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [usuario, ajudante]);

  const situacao = conta
    ? situacaoDaConta(
        paraSituar(conta),
        // `new Date().getTime()`, e não `Date.now()`: o compilador do React
        // recusa uma função impura direto no corpo do componente.
        new Date().getTime(),
      )
    : null;

  // Para a ajudante, prazo de cobrança não é assunto até vencer (spec 030, 3.B.4).
  const semNadaAVer =
    situacao?.tipo === "livre" || (ajudante && situacao?.tipo !== "vencida");

  useEffect(() => {
    if (semNadaAVer) router.replace("/");
  }, [semNadaAVer, router]);

  async function aoSair() {
    setSairPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setSairPendente(true);
      setSaindo(false);
    }
  }

  async function abrirUrl(
    rota: string,
    corpo: Record<string, unknown>,
    chave: Pacote | "portal",
  ) {
    if (!usuario) return;
    setErro(null);
    setEnviando(chave);
    try {
      const token = await usuario.getIdToken();
      const resposta = await fetch(rota, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        setErro(MENSAGEM_FALHA_ASSINATURA[await codigoDaFalha(resposta)]);
        setEnviando(null);
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.assign(url);
    } catch {
      // `TypeError` do `fetch`: sem rede, ou a rota bloqueada.
      setErro(MENSAGEM_FALHA_ASSINATURA["sem-rede"]);
      setEnviando(null);
    }
  }

  const assinar = (pacote: Pacote) =>
    abrirUrl("/api/assinatura/checkout", { contaId, pacote, periodo }, pacote);
  const gerenciar = () =>
    abrirUrl("/api/assinatura/portal", { contaId }, "portal");

  if (carregando || !usuario || !contaId || !situacao || semNadaAVer) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  // Duas perguntas separadas (spec 032, 3.5): por quanto tempo, no rádio;
  // o quê, nos cartões. Quatro cartões empilhados em 360px seriam uma tela e meia.
  const cartoesDePreco = (
    <div className="mt-8 space-y-4">
      <fieldset>
        <legend className="text-label font-medium text-ink">Pagar</legend>
        <div className="mt-1 flex gap-6">
          {(["anual", "mensal"] as const).map((cada) => (
            <label
              key={cada}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-body text-ink"
            >
              <input
                type="radio"
                name={idPeriodo}
                checked={periodo === cada}
                onChange={() => setPeriodo(cada)}
                disabled={enviando !== null}
                className="size-5 shrink-0"
              />
              {cada === "anual" ? "Por ano" : "Por mês"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        {PACOTES.map((pacote) => {
          const economia = precos
            ? economiaAnual(precos[pacote].mensal, precos[pacote].anual)
            : 0;
          return (
            <CartaoDePreco
              key={pacote}
              titulo={NOME_DO_PACOTE[pacote]}
              centavos={precos?.[pacote][periodo]}
              rotulo={periodo === "anual" ? "por ano" : "por mês"}
              oQueTem={O_QUE_O_PACOTE_TEM[pacote]}
              subtitulo={
                periodo === "anual" && economia > 0
                  ? `${formatarMoeda(economia)} a menos que mês a mês`
                  : undefined
              }
              variante={pacote === "ESSENCIAL" ? "primaria" : "secundaria"}
              carregando={enviando === pacote}
              disabled={enviando !== null}
              onClick={() => void assinar(pacote)}
            />
          );
        })}
      </div>
    </div>
  );

  let titulo: string;
  let descricao: string;
  let acoes: ReactNode;

  if (ajudante) {
    // A conta é da dona; a conversa é entre as duas (`#d156`).
    titulo = "O acesso a este negócio está suspenso";
    descricao =
      "Fale com quem é dona do Rende aqui: a assinatura precisa ser renovada para vocês duas voltarem a usar.";
    acoes = (
      <div className="mt-8">
        <Botao
          tamanho="lg"
          larguraTotal
          onClick={() => void aoSair()}
          disabled={saindo}
          carregando={saindo}
        >
          Sair
        </Botao>
      </div>
    );
  } else if (situacao.tipo === "teste") {
    titulo = `Seu teste grátis acaba em ${situacao.diasRestantes} dias`;
    if (situacao.diasRestantes === 0) titulo = "Seu teste grátis acaba hoje";
    if (situacao.diasRestantes === 1) titulo = "Seu teste grátis acaba amanhã";
    descricao =
      "Depois disso, tudo o que você cadastrou continua aqui, mas só assinando dá para mexer.";
    acoes = (
      <>
        {cartoesDePreco}
        <Link
          href="/"
          className={cn(classesBotao({ variante: "terciaria" }), "mt-4 w-full")}
        >
          Voltar
        </Link>
      </>
    );
  } else if (situacao.tipo === "vencida" && situacao.foi === "teste") {
    titulo = "Seu teste grátis acabou";
    descricao =
      "Tudo o que você cadastrou continua guardado. Assine para voltar a mexer.";
    acoes = (
      <>
        {cartoesDePreco}
        <div className="mt-4 space-y-3">
          {/* A vencida que não vai assinar tem os dois direitos da LGPD sem
              assinar (spec 029): levar o dado e encerrar. */}
          <MeusDados />
          <Botao
            tamanho="lg"
            larguraTotal
            onClick={() => void aoSair()}
            disabled={saindo}
            carregando={saindo}
          >
            Sair
          </Botao>
        </div>
      </>
    );
  } else if (situacao.tipo === "vencida" && situacao.foi === "assinatura") {
    titulo = "Não conseguimos renovar sua assinatura";
    descricao = "Atualize a forma de pagamento e o acesso volta sozinho.";
    acoes = (
      <div className="mt-8 space-y-3">
        <Botao
          variante="primaria"
          tamanho="lg"
          larguraTotal
          onClick={gerenciar}
          carregando={enviando === "portal"}
          disabled={enviando !== null}
        >
          Atualizar pagamento
        </Botao>
        <MeusDados />
        <Botao
          tamanho="lg"
          larguraTotal
          onClick={() => void aoSair()}
          disabled={saindo}
          carregando={saindo}
        >
          Sair
        </Botao>
      </div>
    );
  } else {
    // assinante
    titulo = "Sua assinatura está ativa";
    // O `else` não estreita a união: as duas vencidas saíram pelos `&&` acima.
    const pacote =
      situacao.tipo === "assinante" ? situacao.pacote : "ESSENCIAL";
    descricao = `Você está no plano ${NOME_DO_PACOTE[pacote]}. Trocar o cartão, mudar de plano ou cancelar é no portal de pagamento.`;
    acoes = (
      <div className="mt-8 space-y-3">
        <Botao
          variante="primaria"
          tamanho="lg"
          larguraTotal
          onClick={gerenciar}
          carregando={enviando === "portal"}
          disabled={enviando !== null}
        >
          Gerenciar assinatura
        </Botao>
        <Link
          href="/configuracao"
          className={cn(classesBotao({ tamanho: "lg" }), "w-full")}
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <MolduraDeEntrada titulo={titulo} descricao={descricao}>
      {falhaPrecos && !precos && !ajudante && (
        <p className="mt-4 text-label text-ink-muted">
          Não deu para carregar os preços agora, mas dá para continuar.
        </p>
      )}

      {acoes}

      {erro && (
        <p role="alert" className="mt-4 text-label text-negative">
          {erro}
        </p>
      )}

      {sairPendente && (
        <p aria-live="polite" className="mt-4 text-label text-ink-muted">
          {AVISO_SAIR_PENDENTE}
        </p>
      )}
    </MolduraDeEntrada>
  );
}

function CartaoDePreco({
  titulo,
  centavos,
  rotulo,
  oQueTem,
  subtitulo,
  variante,
  carregando,
  disabled,
  onClick,
}: {
  titulo: string;
  centavos: number | undefined;
  rotulo: string;
  oQueTem: string;
  subtitulo?: string;
  variante: "primaria" | "secundaria";
  carregando: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={carregando || undefined}
      className={cn(
        "flex min-h-13 flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors duration-150 ease-quart disabled:cursor-not-allowed disabled:opacity-60",
        variante === "primaria"
          ? "border-transparent bg-accent-500 text-on-accent hover:bg-accent-600"
          : "border-line-strong bg-surface text-ink hover:bg-sunken",
      )}
    >
      <span className="text-label font-medium uppercase tracking-wide opacity-80">
        {titulo}
      </span>
      <span className="num text-subheading font-semibold">
        {centavos != null ? formatarMoeda(centavos) : "—"}{" "}
        <span className="text-label font-normal opacity-80">{rotulo}</span>
      </span>
      {subtitulo && <span className="text-label opacity-90">{subtitulo}</span>}
      <span className="mt-1 text-label">{oQueTem}</span>
    </button>
  );
}

/** O padrão de `TelaNota` e `PaginaCadastro`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaAssinatura> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_ASSINATURA) {
      return corpo.erro as FalhaAssinatura;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  if (resposta.status === 409) return "sem-assinatura";
  return "sem-resposta";
}
