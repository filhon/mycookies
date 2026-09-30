"use client";

import { SunMoon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { CHAVE_TEMA, type Tema } from "@/lib/tema";
import { BlocoConfiguracao } from "./BlocoConfiguracao";

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
 * listas, e não espera o "Salvar" (`DECISOES.md#d244`).
 */
export function BlocoTema() {
  const [tema, mudar] = useTema();

  return (
    <BlocoConfiguracao
      icone={SunMoon}
      titulo="Tema"
      descricao="Claro para a cozinha iluminada, escuro para a noite. Vale neste aparelho, no toque."
    >
      <Pilulas rotulo="Tema" opcoes={TEMAS} valor={tema} aoMudar={mudar} />
    </BlocoConfiguracao>
  );
}
