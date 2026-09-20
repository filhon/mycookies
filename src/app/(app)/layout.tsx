"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";

/** Resultado da última reconferência. `null` = ainda não tentou. */
type Tentativa = null | "sem-acesso" | "sem-conexao";

export default function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, carregando, contaId, sair, reconferirAcesso } = useAuth();
  const router = useRouter();
  const [conferindo, setConferindo] = useState(false);
  const [tentativa, setTentativa] = useState<Tentativa>(null);
  const [saindo, setSaindo] = useState(false);
  const [sairPendente, setSairPendente] = useState(false);

  async function aoSair() {
    setSairPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setSairPendente(true);
      setSaindo(false);
    }
  }

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  async function conferir() {
    setTentativa(null);
    setConferindo(true);
    try {
      // Deu certo: `contaId` muda no provider e esta tela sai do ar sozinha.
      if (!(await reconferirAcesso())) setTentativa("sem-acesso");
    } catch {
      setTentativa("sem-conexao");
    } finally {
      setConferindo(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        {/* Indicador de estado, e não decoração: o pulso é o que diz "carregando". */}
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  if (!usuario) return null;

  // A regra do Firestore já bloqueia no servidor. Esta tela existe para que a
  // falha apareça como instrução, e não como uma lista vazia inexplicável.
  if (!contaId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
        <Simbolo className="size-16" />
        <h1 className="font-display text-title font-semibold text-ink">
          Este login ainda não abre nenhuma conta
        </h1>
        <p className="max-w-[46ch] text-body text-ink-muted">
          Você entrou com{" "}
          <strong className="font-semibold">{usuario.email}</strong>, mas esse
          e-mail ainda não está ligado a nenhum negócio. Avise quem te convidou
          e, quando liberarem, confira de novo aqui.
        </p>

        <div className="mt-2 flex flex-col items-center gap-3">
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={() => void conferir()}
            carregando={conferindo}
            iconeInicial={
              <RefreshCw aria-hidden className="size-5" strokeWidth={1.75} />
            }
          >
            Já liberaram meu acesso
          </Botao>

          {/* A mensagem é o estado: nada aqui depende de cor para ser lido. */}
          <p
            aria-live="polite"
            className="min-h-5 max-w-[42ch] text-label text-ink-muted"
          >
            {tentativa === "sem-acesso" &&
              "Ainda não. Assim que liberarem, é só conferir de novo."}
            {tentativa === "sem-conexao" &&
              "Não deu para conferir agora. Verifique a internet e tente de novo."}
          </p>

          {/* A terceira porta do segundo estado de `/cadastro` (spec 027):
              o login nasceu, o POST caiu, e ela voltou dias depois. */}
          <p className="flex flex-wrap items-center justify-center gap-x-1 text-label text-ink-muted">
            Acabou de se cadastrar?
            <Link
              href="/cadastro"
              className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
            >
              Terminar o cadastro
            </Link>
          </p>

          <Botao
            tamanho="sm"
            onClick={() => void aoSair()}
            disabled={conferindo || saindo}
            carregando={saindo}
          >
            Sair
          </Botao>

          {sairPendente && (
            <p
              aria-live="polite"
              className="max-w-[42ch] text-center text-label text-ink-muted"
            >
              {AVISO_SAIR_PENDENTE}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
