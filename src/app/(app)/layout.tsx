"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Cookie } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { useAuth } from "@/providers/AuthProvider";

export default function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, carregando, ehAdministradora, sair } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

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
  if (!ehAdministradora) {
    return (
      <div className="textura-papel flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
        <ShieldAlert
          aria-hidden
          className="size-10 text-attention"
          strokeWidth={1.75}
        />
        <h1 className="font-display text-title font-semibold text-ink">
          Esta conta ainda não tem acesso
        </h1>
        <p className="max-w-[46ch] text-body text-ink-muted">
          O sistema é liberado para uma única conta administradora. Conceda a
          permissão rodando{" "}
          <code className="rounded-sm bg-sunken px-1.5 py-0.5 text-label">
            npm run conceder-admin -- {usuario.email}
          </code>{" "}
          e entre novamente.
        </p>
        <Botao onClick={() => void sair()}>Sair</Botao>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
