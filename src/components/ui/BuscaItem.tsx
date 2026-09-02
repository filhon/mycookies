"use client";

import { Plus, Search } from "lucide-react";
import { useId, useState } from "react";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";

export interface OpcaoBusca {
  id: string;
  nome: string;
  nomeBusca: string;
  /** O custo da opção, em uma linha. É o que decide entre dois parecidos. */
  detalhe: string;
}

/** Mais que isso vira rolagem dentro de rolagem no celular. */
const MAXIMO_SUGESTOES = 8;

/**
 * Busca com adição por toque.
 *
 * A lista só aparece com termo digitado: sem isso, o editor abriria com a
 * despensa inteira empurrando o resto da ficha para fora da tela. Cada
 * resultado é um alvo de linha cheia, porque a mão que usa isso está ocupada.
 */
export function BuscaItem({
  rotulo,
  placeholder,
  opcoes,
  aoEscolher,
  semResultado,
}: {
  rotulo: string;
  placeholder: string;
  /** Já sem o que não pode ser escolhido. */
  opcoes: OpcaoBusca[];
  aoEscolher: (id: string) => void;
  /** O que dizer quando a busca não acha nada. */
  semResultado: string;
}) {
  const id = useId();
  const [termo, setTermo] = useState("");

  const chave = chaveDeBusca(termo);
  const achados = chave
    ? opcoes
        .filter((opcao) => opcao.nomeBusca.includes(chave))
        .slice(0, MAXIMO_SUGESTOES)
    : [];

  function escolher(idEscolhido: string) {
    aoEscolher(idEscolhido);
    // Some a lista e o campo fica pronto para o próximo item: ela adiciona
    // vários seguidos, e limpar à mão a cada um seria um toque perdido.
    setTermo("");
  }

  return (
    <div>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {rotulo}
      </label>

      <div className="relative mt-1.5">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle"
          strokeWidth={1.75}
        />
        <input
          id={id}
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 w-full rounded-md border border-line-strong bg-surface pl-10 pr-3 text-body text-ink placeholder:text-ink-subtle"
        />
      </div>

      {chave && (
        <>
          <p className="sr-only" aria-live="polite">
            {achados.length === 0
              ? semResultado
              : `${achados.length} ${achados.length === 1 ? "resultado" : "resultados"}`}
          </p>

          {achados.length === 0 ? (
            <p className="mt-2 text-label text-ink-muted">{semResultado}</p>
          ) : (
            <ul className="mt-2 overflow-hidden rounded-md border border-line">
              {achados.map((opcao) => (
                <li
                  key={opcao.id}
                  className="border-b border-line last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => escolher(opcao.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
                  >
                    <Plus
                      aria-hidden
                      className="size-5 shrink-0 text-wine-700 dark:text-wine-300"
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-ink">
                        {opcao.nome}
                      </span>
                      <span className="num mt-0.5 block truncate text-label text-ink-muted">
                        {opcao.detalhe}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
