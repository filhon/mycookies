"use client";

import { useEffect, useId, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { mensalDoPlano, type ResumoAssinatura } from "@/lib/domain/assinatura";
import {
  DESPESAS_MAXIMAS,
  despesasQueFaltam,
} from "@/lib/domain/custosOperacionais";
import {
  digitosParaCentavos,
  formatarMoeda,
  formatarValor,
} from "@/lib/domain/money";
import type { Centavos, DespesaFixa } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** Onde achar o valor, enquanto a linha está sem ele. */
const DICA: Record<string, string> = {
  "DAS do MEI": "O valor está no boleto do mês, no portal do Simples.",
  Rende: "O valor do seu plano por mês. No anual, divida por 12.",
};

type Atualizar = (atual: DespesaFixa[]) => DespesaFixa[];

/**
 * As despesas fixas uma a uma (spec 086, `#d287`): uma linha por despesa, as
 * pílulas das que costumam faltar e o total embaixo. O total não se digita: é
 * a soma, gravada na escrita.
 *
 * `aoMudar` recebe uma atualização, e não a lista, porque o valor do Rende
 * chega depois do toque, pelo Stripe, e não pode desfazer o que ela digitou
 * enquanto isso.
 */
export function DespesasFixas({
  despesas,
  aoMudar,
  erros,
  assinante,
}: {
  despesas: DespesaFixa[];
  aoMudar: (atualizar: Atualizar) => void;
  /** Por linha, de `errosDeLinha`. */
  erros: Record<number, string>;
  /** Só a assinante tem plano para ler (`#d285`). */
  assinante: boolean;
}) {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const idComuns = useId();
  const lista = useRef<HTMLUListElement>(null);
  // Qual campo da linha nova ganha o foco: o nome (0) ou o valor (1).
  const focar = useRef<number | null>(null);

  useEffect(() => {
    if (focar.current === null) return;
    lista.current?.lastElementChild
      ?.querySelectorAll("input")
      [focar.current]?.focus();
    focar.current = null;
  }, [despesas.length]);

  const faltam = despesasQueFaltam(despesas);
  const cabe = despesas.length < DESPESAS_MAXIMAS;
  const total = despesas.reduce((soma, d) => soma + d.valor, 0);

  /** O plano por mês, quando a 084 o conhece; `null` sem rede ou sem plano. */
  async function valorDoRende(): Promise<Centavos | null> {
    if (!assinante || !usuario) return null;
    try {
      const resposta = await fetch("/api/assinatura/resumo", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await usuario.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId }),
      });
      if (!resposta.ok) return null;
      return mensalDoPlano((await resposta.json()) as ResumoAssinatura);
    } catch {
      return null;
    }
  }

  function adicionar(nome: string) {
    focar.current = nome ? 1 : 0;
    aoMudar((atual) => [...atual, { nome, valor: 0 }]);
    if (nome !== "Rende") return;
    void valorDoRende().then((valor) => {
      if (!valor) return;
      aoMudar((atual) =>
        atual.map((d) =>
          d.nome === "Rende" && d.valor === 0 ? { ...d, valor } : d,
        ),
      );
    });
  }

  const mudar = (indice: number, mudanca: Partial<DespesaFixa>) =>
    aoMudar((atual) =>
      atual.map((d, i) => (i === indice ? { ...d, ...mudanca } : d)),
    );

  return (
    <div className="space-y-4">
      {cabe && faltam.length > 0 && (
        <div role="group" aria-labelledby={idComuns}>
          <p id={idComuns} className="text-label font-medium text-ink-muted">
            Costumam ficar de fora
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {faltam.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => adicionar(nome)}
                aria-label={`Adicionar ${nome}`}
                className="toque inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 text-label font-medium text-ink transition-colors duration-150 ease-quart hover:bg-sunken"
              >
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-brand-ink"
                  strokeWidth={2}
                />
                {nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {despesas.length === 0 ? (
        <p className="text-label text-ink-muted">
          Nenhuma despesa ainda. Toque numa acima ou adicione a sua.
        </p>
      ) : (
        <ul ref={lista} className="space-y-2">
          {despesas.map((despesa, indice) => {
            const erro = erros[indice];
            const dica = despesa.valor === 0 ? DICA[despesa.nome] : undefined;
            const rotulo = despesa.nome.trim() || "esta despesa";
            return (
              // Índice como chave: as linhas são campos controlados, e a lista
              // não tem id para dar (`#d287`).
              <li key={indice}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={despesa.nome}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="Nome da despesa"
                    aria-label={`Nome da despesa ${indice + 1}`}
                    aria-invalid={erro ? true : undefined}
                    onChange={(evento) =>
                      mudar(indice, { nome: evento.target.value })
                    }
                    className={cn(
                      BASE_CONTROLE,
                      "min-w-0 flex-1",
                      erro ? "border-negative" : "border-line-strong",
                    )}
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-label font-medium text-ink-muted">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formatarValor(despesa.valor)}
                      aria-label={`Quanto ${rotulo} custa por mês`}
                      onChange={(evento) =>
                        mudar(indice, {
                          valor: digitosParaCentavos(evento.target.value),
                        })
                      }
                      onFocus={(evento) => evento.currentTarget.select()}
                      className="num h-12 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-right text-body font-semibold text-ink transition-colors duration-150 ease-quart"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      aoMudar((atual) => atual.filter((_, i) => i !== indice))
                    }
                    aria-label={`Tirar ${rotulo}`}
                    className="toque -mr-2 flex shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-quart hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
                {erro ? (
                  <p role="alert" className="mt-1 text-label text-negative">
                    {erro}
                  </p>
                ) : (
                  dica && (
                    <p className="mt-1 text-label text-ink-muted">{dica}</p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {cabe && (
        <Botao
          onClick={() => adicionar("")}
          className="w-full sm:w-auto"
          iconeInicial={<Plus aria-hidden className="size-5" strokeWidth={2} />}
        >
          Adicionar despesa
        </Botao>
      )}

      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <span className="text-label font-medium text-ink-muted">
          Total do mês
        </span>
        <span className="num text-body font-semibold text-ink">
          {formatarMoeda(total)}
        </span>
      </div>
    </div>
  );
}
