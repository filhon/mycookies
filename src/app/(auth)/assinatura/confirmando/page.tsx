"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AJUDA_DA_ASSINATURA,
  MolduraDeEntrada,
} from "@/components/auth/MolduraDeEntrada";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import {
  situacaoDaConta,
  textoDaAjudaDaConfirmacao,
  type SituacaoDaVolta,
} from "@/lib/domain/assinatura";
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
    ? situacaoDaConta(
        {
          plano: conta.plano,
          trialAteMs: conta.trialAte?.toMillis(),
          assinaturaAteMs: conta.assinaturaAte?.toMillis(),
        },
        new Date().getTime(),
      )
    : null;

  useEffect(() => {
    if (situacao?.tipo !== "assinante") return;
    let cancelado = false;

    void reconferirAcesso().then(() => {
      if (!cancelado) router.replace("/");
    });

    return () => {
      cancelado = true;
    };
  }, [situacao?.tipo, reconferirAcesso, router]);

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

  return (
    <MolduraDeEntrada
      titulo="Pagamento recebido"
      descricao="Liberando sua conta…"
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
