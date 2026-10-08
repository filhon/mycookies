"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FaleComAGente } from "@/components/conta/FaleComAGente";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { classesBotao } from "@/components/ui/estilosBotao";
import { filtrarPerguntas } from "./perguntas";

const PREFIXO = "pergunta-";

/**
 * As perguntas que voltam, com a busca e a saída para uma pessoa
 * (`DECISOES.md#d297`).
 *
 * Cada uma é um `<details>`: abrir e fechar é do navegador, com teclado e
 * leitor de tela de graça, e sem animação de altura. O React só toca no `open`
 * quando a busca deixa uma pergunta sozinha, e só então: o que ela abriu ou
 * fechou com o dedo continua como ela deixou.
 */
export function PerguntasQueVoltam() {
  const [busca, setBusca] = useState("");
  const visiveis = filtrarPerguntas(busca);
  const unica = busca.trim() !== "" && visiveis.length === 1;

  // `/comecar#pergunta-{id}` abre a resposta: outras telas apontam para ela.
  // Direto no DOM, como o navegador faria, e não por estado.
  useEffect(() => {
    function abrirPeloEndereco() {
      if (!location.hash.startsWith(`#${PREFIXO}`)) return;
      const alvo = document.getElementById(location.hash.slice(1));
      if (!(alvo instanceof HTMLDetailsElement)) return;
      alvo.open = true;
      alvo.scrollIntoView({ block: "start" });
    }
    abrirPeloEndereco();
    window.addEventListener("hashchange", abrirPeloEndereco);
    return () => window.removeEventListener("hashchange", abrirPeloEndereco);
  }, []);

  return (
    <>
      <CampoBusca
        rotulo="Procurar uma pergunta"
        placeholder="Procurar uma pergunta"
        enterKeyHint="search"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />

      {/* Montada sempre, para o leitor de tela ouvir quando ela muda. */}
      <p
        role="status"
        className={
          visiveis.length > 0
            ? "sr-only"
            : "mt-4 px-4 text-label text-ink-muted lg:px-5"
        }
      >
        {visiveis.length === 0 && "Nenhuma pergunta com isso."}
      </p>

      {visiveis.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {visiveis.map((item) => (
            <li key={item.id}>
              <details
                id={`${PREFIXO}${item.id}`}
                open={unica}
                className="group scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken lg:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 text-body font-medium text-ink">
                    {item.pergunta}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-ink-subtle group-open:rotate-180"
                    strokeWidth={1.75}
                  />
                </summary>
                <div className="px-4 pb-3 lg:px-5">
                  <p className="max-w-[62ch] text-label text-ink-muted">
                    {item.resposta}
                  </p>
                  {/* O recuo negativo alinha o texto do link com o da resposta. */}
                  <Link
                    href={item.href}
                    className={classesBotao({
                      variante: "terciaria",
                      tamanho: "sm",
                      className: "-ml-3 mt-1",
                    })}
                  >
                    {item.rotuloLink}
                  </Link>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <div
        id="fale-com-a-gente"
        className="mt-6 scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
      >
        <h3 className="text-body font-semibold text-ink">
          Não achou o que procurava?
        </h3>
        {/* O mesmo da Configuração (084), que traz o próprio filete de cima. */}
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface *:border-t-0">
          <FaleComAGente />
        </div>
      </div>
    </>
  );
}
