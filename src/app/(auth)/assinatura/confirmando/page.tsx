"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AJUDA_DA_ASSINATURA,
  MolduraDeEntrada,
} from "@/components/auth/MolduraDeEntrada";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  diaEMes,
  fraseDaConfirmacao,
  mensalDoAnual,
  NOME_DO_PACOTE,
  paraSituar,
  situacaoDaConta,
  textoDaAjudaDaConfirmacao,
  type ResumoAssinatura,
  type SituacaoDaVolta,
} from "@/lib/domain/assinatura";
import { formatarMoeda } from "@/lib/domain/money";
import type { Pacote } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

/** Passados este tanto sem o documento virar `assinante`, o botão aparece. */
const ESPERA_BOTAO_MS = 45_000;

/** `useSearchParams` pede o limite de `Suspense`, como em `/redefinir-senha`. */
export default function PaginaConfirmandoAssinatura() {
  return (
    <Suspense fallback={<Carregando />}>
      <ConfirmandoAssinatura />
    </Suspense>
  );
}

/** Rótulo à esquerda, valor à direita: a "Seção no papel" do `DESIGN.md`. */
function LinhaDoRecibo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-label text-ink-muted">{rotulo}</dt>
      <dd className="text-right text-body text-ink">{children}</dd>
    </div>
  );
}

function Carregando() {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center bg-canvas"
    >
      <Simbolo className="size-12 animate-pulse" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/**
 * Para onde o Stripe devolve depois do pagamento, com `?sessao=` desde a 163.
 * Com a sessão, pede a `/api/assinatura/confirmar` que a confira e sincronize
 * na hora; sem ela (favorito, histórico), ou se a rota falhar, só observa.
 *
 * O gatilho continua sendo a assinatura viva do documento (`useAuth().conta`):
 * quando ela virar `assinante`, a claim já está lá para o `reconferirAcesso()`
 * buscar (`DECISOES.md#d145`, claim antes do documento).
 */
function ConfirmandoAssinatura() {
  const { usuario, contaId, conta, carregando, reconferirAcesso } = useAuth();
  const router = useRouter();
  const sessao = useSearchParams().get("sessao");
  const [volta, setVolta] = useState<SituacaoDaVolta | null>(null);
  const [mostrarBotao, setMostrarBotao] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [recibo, setRecibo] = useState<{
    resumo: ResumoAssinatura;
    pacote: Pacote;
  } | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  useEffect(() => {
    if (!carregando && usuario && !contaId) router.replace("/");
  }, [carregando, usuario, contaId, router]);

  // Uma vez por sessão; a falha não diz nada e deixa o webhook chegar.
  useEffect(() => {
    if (!sessao || !usuario || !contaId) return;
    let cancelado = false;

    async function confirmar() {
      try {
        const token = await usuario!.getIdToken();
        const resposta = await fetch("/api/assinatura/confirmar", {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ contaId, sessao }),
        });
        if (!resposta.ok) return;
        const { situacao } = (await resposta.json()) as {
          situacao: SituacaoDaVolta;
        };
        if (cancelado) return;
        if (situacao === "aberta") router.replace("/assinatura");
        else setVolta(situacao);
      } catch {
        // Sem rede: segue observando o documento.
      }
    }

    void confirmar();
    return () => {
      cancelado = true;
    };
  }, [sessao, usuario, contaId, router]);

  const situacao = conta
    ? situacaoDaConta(paraSituar(conta), new Date().getTime())
    : null;

  // Assinante: com `?sessao=`, o quadro do que ela fez (spec 164); sem ela
  // (favorito, histórico) ou sem resumo, a Hoje, como antes. O quadro é bônus.
  const pacote = situacao?.tipo === "assinante" ? situacao.pacote : null;
  useEffect(() => {
    if (!pacote) return;
    let cancelado = false;

    async function lerResumo(): Promise<ResumoAssinatura | null> {
      if (!sessao) return null;
      try {
        const resposta = await fetch("/api/assinatura/resumo", {
          method: "POST",
          headers: {
            authorization: `Bearer ${await usuario!.getIdToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ contaId }),
        });
        return resposta.ok
          ? ((await resposta.json()) as ResumoAssinatura)
          : null;
      } catch {
        return null;
      }
    }

    // Sem rede o token não renova; a Hoje reconfere sozinha.
    void Promise.all([lerResumo(), reconferirAcesso().catch(() => false)]).then(
      ([lido]) => {
        if (cancelado) return;
        if (lido) setRecibo({ resumo: lido, pacote });
        else router.replace("/");
      },
    );

    return () => {
      cancelado = true;
    };
  }, [pacote, sessao, usuario, contaId, reconferirAcesso, router]);

  // O leitor de tela anuncia a chegada pelo título (`#d368`).
  useEffect(() => {
    if (recibo) titulo.current?.focus();
  }, [recibo]);

  useEffect(() => {
    const id = setTimeout(() => setMostrarBotao(true), ESPERA_BOTAO_MS);
    return () => clearTimeout(id);
  }, []);

  async function conferirDeNovo() {
    setConferindo(true);
    try {
      await reconferirAcesso();
    } finally {
      setConferindo(false);
    }
  }

  if (carregando || !usuario || !contaId) return <Carregando />;

  const ajuda = {
    pergunta: AJUDA_DA_ASSINATURA.pergunta,
    texto: textoDaAjudaDaConfirmacao(sessao),
  };

  // Forma de pagamento que compensa depois: o webhook abre a conta sozinho.
  if (volta === "esperando") {
    return (
      <MolduraDeEntrada
        titulo="Esperando o pagamento"
        descricao="Assim que ele compensar, a conta abre sozinha. Pode fechar esta tela."
        ajuda={ajuda}
      >
        {null}
      </MolduraDeEntrada>
    );
  }

  if (recibo) {
    const { resumo, pacote } = recibo;
    const cortesia = resumo.valor === 0;
    // O `key` remonta a coluna: a entrada começa do zero, e não do pulso.
    return (
      <MolduraDeEntrada
        key="recibo"
        titulo="Assinatura feita"
        descricao={fraseDaConfirmacao(resumo)}
        refTitulo={titulo}
        ajuda={ajuda}
        classeDaColuna="recibo-entra"
      >
        <CircleCheck
          aria-hidden
          strokeWidth={1.75}
          className="recibo-selo mx-auto mt-8 size-12 text-positive"
        />

        <dl className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
          <LinhaDoRecibo rotulo="Plano">
            {NOME_DO_PACOTE[pacote]} · {cortesia ? "cortesia" : resumo.periodo}
          </LinhaDoRecibo>
          {!cortesia && (
            <LinhaDoRecibo rotulo="Valor">
              <Dinheiro centavos={resumo.valor} />{" "}
              {resumo.periodo === "anual" ? "por ano" : "por mês"}
              {resumo.periodo === "anual" && (
                <span className="block text-label text-ink-muted">
                  {formatarMoeda(mensalDoAnual(resumo.valor))} por mês
                </span>
              )}
            </LinhaDoRecibo>
          )}
          {!cortesia && (
            <LinhaDoRecibo rotulo="Próxima cobrança">
              {diaEMes(resumo.ateMs)}
            </LinhaDoRecibo>
          )}
          {resumo.final && (
            <LinhaDoRecibo rotulo="Cartão">final {resumo.final}</LinhaDoRecibo>
          )}
        </dl>

        {/* O Stripe manda o recibo de cada cobrança paga (`DEPLOY.md`). */}
        {!cortesia && usuario.email && (
          <p className="mt-4 text-label text-ink-muted">
            O recibo de cada cobrança chega em{" "}
            <span className="break-all text-ink">{usuario.email}</span>.
          </p>
        )}
        <p className="mt-2 text-label text-ink-muted">
          Para mudar o plano, trocar o cartão ou cancelar:{" "}
          <Link
            href="/configuracao#assinatura"
            replace
            className={classesBotao({
              variante: "terciaria",
              tamanho: "sm",
              className: "-mx-1 px-1",
            })}
          >
            Configuração
          </Link>
          , em Assinatura.
        </p>

        <Link
          href="/"
          replace
          className={classesBotao({
            variante: "primaria",
            tamanho: "lg",
            larguraTotal: true,
            className: "mt-8",
          })}
        >
          Ir para a Hoje
        </Link>
      </MolduraDeEntrada>
    );
  }

  return (
    <MolduraDeEntrada
      titulo="Confirmando a assinatura"
      descricao="Leva alguns segundos."
      ajuda={ajuda}
    >
      {/* Viva desde o início: o aviso dos 45 s é lido quando aparece. */}
      <div aria-live="polite" className="mt-8 flex flex-col items-center gap-4">
        <Simbolo className="size-12 animate-pulse" />

        {mostrarBotao && (
          <div className="flex flex-col items-center gap-2 text-center">
            <Botao
              onClick={() => void conferirDeNovo()}
              carregando={conferindo}
            >
              Conferir de novo
            </Botao>
            {/* "Fale com a gente" é o link do rodapé, com o código da sessão. */}
            <p className="max-w-[42ch] text-label text-ink-muted">
              Está demorando mais que o normal. Se não liberar em alguns
              minutos, fale com a gente.
            </p>
          </div>
        )}
      </div>
    </MolduraDeEntrada>
  );
}
