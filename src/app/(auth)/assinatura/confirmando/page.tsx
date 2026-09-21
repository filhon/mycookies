"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MolduraDeEntrada } from "@/components/auth/MolduraDeEntrada";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { situacaoDaConta } from "@/lib/domain/assinatura";
import { useAuth } from "@/providers/AuthProvider";

/** Passados este tanto sem o documento virar `assinante`, o botão aparece. */
const ESPERA_BOTAO_MS = 45_000;

/**
 * Para onde o Stripe devolve depois do pagamento. Sem timer no caminho feliz:
 * a assinatura viva do documento (`useAuth().conta`) é o gatilho — quando ela
 * virar `assinante`, a claim já está lá para o `reconferirAcesso()` buscar
 * (`DECISOES.md#d145`, claim antes do documento).
 */
export default function PaginaConfirmandoAssinatura() {
  const { usuario, contaId, conta, carregando, reconferirAcesso } = useAuth();
  const router = useRouter();
  const [mostrarBotao, setMostrarBotao] = useState(false);
  const [conferindo, setConferindo] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  useEffect(() => {
    if (!carregando && usuario && !contaId) router.replace("/");
  }, [carregando, usuario, contaId, router]);

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

  if (carregando || !usuario || !contaId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  return (
    <MolduraDeEntrada
      titulo="Pagamento recebido"
      descricao="Liberando sua conta…"
    >
      <div className="mt-8 flex flex-col items-center gap-4">
        <Simbolo className="size-12 animate-pulse" />

        {mostrarBotao && (
          <div className="flex flex-col items-center gap-2 text-center">
            <Botao
              onClick={() => void conferirDeNovo()}
              carregando={conferindo}
            >
              Conferir de novo
            </Botao>
            <p className="max-w-[42ch] text-label text-ink-muted">
              Está demorando mais que o normal. O pagamento chegou ao Stripe; se
              não liberar em alguns minutos, avise quem cuida do Rende.
            </p>
          </div>
        )}
      </div>
    </MolduraDeEntrada>
  );
}
