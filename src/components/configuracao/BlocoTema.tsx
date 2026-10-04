"use client";

import { SunMoon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { CHAVE_TEMA, type Tema } from "@/lib/tema";

/** O `<html>` é a fonte: o script do `<head>` já o escreveu do armazenamento. */
function lido(): Tema {
  const tema = document.documentElement.dataset.theme;
  return tema === "dark" ? "escuro" : tema === "light" ? "claro" : "sistema";
}

const ouvintes = new Set<() => void>();

function useTema(): [Tema, (tema: Tema) => void] {
  const tema = useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    lido,
    () => "sistema" as const,
  );

  function mudar(novo: Tema) {
    const raiz = document.documentElement;
    if (novo === "sistema") delete raiz.dataset.theme;
    else raiz.dataset.theme = novo === "escuro" ? "dark" : "light";
    try {
      if (novo === "sistema") localStorage.removeItem(CHAVE_TEMA);
      else localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // Sem armazenamento, o tema vale até recarregar.
    }
    ouvintes.forEach((ouvinte) => ouvinte());
  }

  return [tema, mudar];
}

const TEMAS: OpcaoPilula<Tema>[] = [
  { valor: "sistema", rotulo: "Do aparelho" },
  { valor: "claro", rotulo: "Claro" },
  { valor: "escuro", rotulo: "Escuro" },
];

/**
 * O tema, fora do formulário: vale no toque e neste aparelho, como a ordem das
 * listas, e não espera o "Salvar" (`DECISOES.md#d244`). Uma linha da lista de
 * "A sua conta" (`#d284`): as pílulas à direita no desktop, embaixo no celular.
 */
export function BlocoTema() {
  const [tema, mudar] = useTema();

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-4 lg:flex-row lg:items-center lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SunMoon
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0">
          <span className="block text-body font-medium text-ink">Tema</span>
          <span className="mt-0.5 block text-label text-ink-muted">
            Claro para a cozinha iluminada, escuro para a noite. Vale neste
            aparelho.
          </span>
        </span>
      </div>
      <Pilulas
        rotulo="Tema"
        opcoes={TEMAS}
        valor={tema}
        aoMudar={mudar}
        className="lg:shrink-0 lg:flex-nowrap"
      />
    </div>
  );
}
