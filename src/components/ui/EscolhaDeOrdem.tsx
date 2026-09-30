"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { useId, useState } from "react";
import { Seletor } from "./Campo";
import { Painel } from "./Painel";
import { cn } from "@/lib/utils/cn";

export interface OpcaoOrdem<T extends string> {
  valor: T;
  rotulo: string;
  /** O que a ordem faz, na folha do celular: "De A a Z". */
  linha: string;
}

/**
 * A ordem de uma lista (`DECISOES.md#d242`). No celular, um botão com o nome
 * da ordem atual que abre a folha inferior, uma linha por ordem com o que ela
 * faz; escolher fecha. No desktop, o `Seletor` de sempre.
 */
export function EscolhaDeOrdem<T extends string>({
  titulo,
  opcoes,
  valor,
  aoMudar,
}: {
  /** O título da folha: "Ordenar materiais". */
  titulo: string;
  opcoes: OpcaoOrdem<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const nome = useId();
  const atual = opcoes.find((opcao) => opcao.valor === valor) ?? opcoes[0];

  return (
    <>
      <Seletor
        rotulo="Ordem"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value as T)}
        className="hidden flex-row items-center gap-2 lg:flex"
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Seletor>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        aria-label={`Ordem: ${atual?.rotulo}`}
        onClick={() => setAberta(true)}
        className="toque -my-2 -mr-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-semibold text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100 lg:hidden"
      >
        <ArrowUpDown aria-hidden className="size-4" strokeWidth={1.75} />
        {atual?.rotulo}
      </button>

      <Painel aberto={aberta} aoFechar={() => setAberta(false)} titulo={titulo}>
        <fieldset>
          <legend className="sr-only">{titulo}</legend>
          <ul className="-mx-3 -my-3 divide-y divide-line">
            {opcoes.map((opcao) => {
              const escolhida = opcao.valor === valor;
              return (
                <li key={opcao.valor}>
                  <label
                    className={cn(
                      "flex min-h-13 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 ease-quart hover:bg-sunken",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)",
                    )}
                  >
                    <input
                      type="radio"
                      name={nome}
                      value={opcao.valor}
                      checked={escolhida}
                      onChange={() => {
                        aoMudar(opcao.valor);
                        setAberta(false);
                      }}
                      // A já escolhida não dispara `change`: tocar nela fecha.
                      onClick={() => escolhida && setAberta(false)}
                      className="sr-only"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium text-ink">
                        {opcao.rotulo}
                      </span>
                      <span className="mt-0.5 block text-label text-ink-muted">
                        {opcao.linha}
                      </span>
                    </span>
                    <Check
                      aria-hidden
                      className={cn(
                        "size-5 shrink-0 text-brand-ink",
                        !escolhida && "invisible",
                      )}
                      strokeWidth={2}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </Painel>
    </>
  );
}
