"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Cookie } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { useAuth } from "@/providers/AuthProvider";

/** Resultado da última reconferência. `null` = ainda não tentou. */
type Tentativa = null | "sem-acesso" | "sem-conexao";

export default function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, carregando, contaId, sair, reconferirAcesso } = useAuth();
  const router = useRouter();
  const [conferindo, setConferindo] = useState(false);
  const [tentativa, setTentativa] = useState<Tentativa>(null);

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
      <div className="textura-papel flex min-h-dvh items-center justify-center bg-canvas">
        <Cookie
          className="size-12 animate-pulse text-wine-700 dark:text-wine-300"
          gotas={false}
        />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  if (!usuario) return null;

  // A regra do Firestore já bloqueia no servidor. Esta tela existe para que a
  // falha apareça como instrução, e não como uma lista vazia inexplicável.
  if (!contaId) {
    return (
      <div className="textura-papel flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
        <ShieldAlert
          aria-hidden
          className="size-10 text-attention"
          strokeWidth={1.75}
        />
        <h1 className="font-display text-title font-semibold text-ink">
          Este login ainda não abre nenhuma conta
        </h1>
        <p className="max-w-[46ch] text-body text-ink-muted">
          Ele existe, mas não está vinculado ao negócio. Quem cuida da conta
          libera o acesso rodando{" "}
          <code className="rounded-sm bg-sunken px-1.5 py-0.5 text-label">
            npm run conceder-acesso -- {usuario.email} &lt;id-da-conta&gt;
          </code>
          .
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
              "Ainda não. Assim que rodarem o comando, é só conferir de novo."}
            {tentativa === "sem-conexao" &&
              "Não deu para conferir agora. Verifique a internet e tente de novo."}
          </p>

          <Botao tamanho="sm" onClick={() => void sair()} disabled={conferindo}>
            Sair
          </Botao>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
