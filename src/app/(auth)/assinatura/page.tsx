"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { MeusDados } from "@/components/conta/MeusDados";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  economiaAnual,
  MENSAGEM_FALHA_ASSINATURA,
  situacaoDaConta,
  type FalhaAssinatura,
  type Periodo,
} from "@/lib/domain/assinatura";
import { formatarMoeda } from "@/lib/domain/money";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

interface Precos {
  mensal: number;
  anual: number;
}

/**
 * A tela de quatro estados (spec 028, 3.5): teste, teste vencido, assinatura
 * vencida e assinante. `livre` não tem o que ver — sai sozinha para `/`.
 *
 * Fora do shell, em `(auth)`, com `MolduraDeEntrada`: a terceira tela que o
 * comentário dela esperava.
 */
export default function PaginaAssinatura() {
  const { usuario, contaId, conta, carregando, sair } = useAuth();
  const router = useRouter();

  const [precos, setPrecos] = useState<Precos | null>(null);
  const [falhaPrecos, setFalhaPrecos] = useState(false);
  const [enviando, setEnviando] = useState<Periodo | "portal" | null>(null);
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
    if (!usuario) return;
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
  }, [usuario]);

  const situacao = conta
    ? situacaoDaConta(
        {
          plano: conta.plano,
          trialAteMs: conta.trialAte?.toMillis(),
          assinaturaAteMs: conta.assinaturaAte?.toMillis(),
        },
        // `new Date().getTime()`, e não `Date.now()`: o compilador do React
        // recusa uma função impura direto no corpo do componente.
        new Date().getTime(),
      )
    : null;

  useEffect(() => {
    if (situacao?.tipo === "livre") router.replace("/");
  }, [situacao?.tipo, router]);

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
    chave: Periodo | "portal",
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

  const assinar = (periodo: Periodo) =>
    abrirUrl("/api/assinatura/checkout", { contaId, periodo }, periodo);
  const gerenciar = () =>
    abrirUrl("/api/assinatura/portal", { contaId }, "portal");

  if (
    carregando ||
    !usuario ||
    !contaId ||
    !situacao ||
    situacao.tipo === "livre"
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  const economia = precos ? economiaAnual(precos.mensal, precos.anual) : 0;

  const cartoesDePreco = (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <CartaoDePreco
        titulo="Mensal"
        centavos={precos?.mensal}
        rotulo="por mês"
        variante="secundaria"
        carregando={enviando === "mensal"}
        disabled={enviando !== null}
        onClick={() => void assinar("mensal")}
      />
      <CartaoDePreco
        titulo="Anual"
        centavos={precos?.anual}
        rotulo="por ano"
        subtitulo={
          economia > 0
            ? `${formatarMoeda(economia)} a menos que mês a mês`
            : undefined
        }
        variante="primaria"
        carregando={enviando === "anual"}
        disabled={enviando !== null}
        onClick={() => void assinar("anual")}
      />
    </div>
  );

  let titulo: string;
  let descricao: string;
  let acoes: ReactNode;

  if (situacao.tipo === "teste") {
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
    descricao =
      "Trocar o cartão, mudar para o anual ou cancelar é no portal de pagamento.";
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
      {falhaPrecos && !precos && (
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
  subtitulo,
  variante,
  carregando,
  disabled,
  onClick,
}: {
  titulo: string;
  centavos: number | undefined;
  rotulo: string;
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
