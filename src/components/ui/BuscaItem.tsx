"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { CampoBusca } from "./CampoBusca";
import { Selo } from "./Selo";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";

export interface OpcaoBusca {
  id: string;
  nome: string;
  nomeBusca: string;
  /** O custo da opção, em uma linha. É o que decide entre dois parecidos. */
  detalhe: string;
  /** O que a separa das outras da mesma lista: "Preparo" entre materiais. */
  selo?: string;
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
  icone: Icone = Plus,
  children,
}: {
  rotulo: string;
  placeholder: string;
  /** Já sem o que não pode ser escolhido. */
  opcoes: OpcaoBusca[];
  aoEscolher: (id: string) => void;
  /** O que dizer quando a busca não acha nada. */
  semResultado: string;
  /** O ícone de cada resultado: `Plus` quando escolher é adicionar. */
  icone?: LucideIcon;
  /** O que vem antes do campo, entre o rótulo e a busca. */
  children?: ReactNode;
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

      {children}

      <CampoBusca
        id={id}
        rotulo={rotulo}
        className="mt-1.5"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        placeholder={placeholder}
      />

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
                    <Icone
                      aria-hidden
                      className="size-5 shrink-0 text-brand-ink"
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-body font-medium text-ink">
                          {opcao.nome}
                        </span>
                        {opcao.selo && <Selo tom="neutro">{opcao.selo}</Selo>}
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
