"use client";

import { CornerDownRight, TriangleAlert, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Dinheiro } from "@/components/ui/Dinheiro";
import type { DerivadosFicha } from "@/lib/domain/custoFicha";
import {
  formatarMoeda,
  formatarMultiplicador,
  formatarPercentual,
} from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Tom = "neutro" | "positivo" | "atencao";

const TONS: Record<Tom, string> = {
  neutro: "border-line bg-sunken text-ink-muted",
  positivo: "border-line bg-sunken text-ink-muted",
  atencao: "border-attention/30 bg-attention-soft text-ink",
};

function Metrica({
  rotulo,
  valor,
  acao,
}: {
  rotulo: string;
  valor: Centavos | null;
  acao?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
        {rotulo}
      </p>
      <p className="mt-0.5 flex items-center gap-2">
        {valor === null ? (
          <span className="text-body font-semibold text-ink-subtle">—</span>
        ) : (
          <Dinheiro centavos={valor} />
        )}
        {acao}
      </p>
    </div>
  );
}

/**
 * O painel que fica preso ao pé da tela enquanto ela monta a receita.
 *
 * Preso porque a pergunta que trouxe a Maynara até aqui — "quanto sobra pra
 * mim?" — não pode depender de rolar até o fim de uma lista de ingredientes.
 * Custo, preço e sobra ficam juntos: preço sozinho não informa nada.
 */
export function PainelPreco({
  derivado,
  precoManual,
  rendimentoValido,
  aoMudarPreco,
  aoUsarSugerido,
}: {
  derivado: DerivadosFicha;
  /** A usuária sobrescreveu o preço sugerido. */
  precoManual: boolean;
  rendimentoValido: boolean;
  aoMudarPreco: (centavos: Centavos) => void;
  aoUsarSugerido: () => void;
}) {
  const { custo, verificacao } = derivado;
  const lucro = verificacao.lucroUnitario;

  const podeVoltarAoSugerido =
    precoManual &&
    derivado.precoArredondado !== null &&
    derivado.precoArredondado !== derivado.precoVenda;

  function explicar(): { tom: Tom; icone: ReactNode; mensagem: ReactNode } {
    const alerta = (
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
    );

    if (!rendimentoValido) {
      return {
        tom: "atencao",
        icone: alerta,
        mensagem:
          "Diga quantas unidades saem de um lote e o preço por unidade aparece aqui.",
      };
    }

    if (derivado.motivoSemPreco === "MARGEM_IMPOSSIVEL") {
      return {
        tom: "atencao",
        icone: alerta,
        mensagem:
          "A margem que você pediu mais as taxas passam de 100% do preço. Não existe preço que caiba nisso: diminua a margem ou a taxa.",
      };
    }

    if (derivado.motivoSemPreco === "MARKUP_INVALIDO") {
      return {
        tom: "atencao",
        icone: alerta,
        mensagem:
          "Multiplicar o custo por zero não dá preço nenhum. Escolha por quanto multiplicar.",
      };
    }

    // O prejuízo carrega ícone e a palavra: a cor sozinha nunca decide, e o
    // vermelho de erro é vizinho do vinho da marca.
    if (lucro < 0) {
      return {
        tom: "atencao",
        icone: alerta,
        mensagem: (
          <>
            Neste preço você <strong className="font-semibold">perde</strong>{" "}
            <Realce>{formatarMoeda(Math.abs(lucro))}</Realce> por unidade,
            depois do custo e das taxas.
          </>
        ),
      };
    }

    return {
      tom: "positivo",
      icone: (
        <CornerDownRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      ),
      mensagem: (
        <>
          Sobram <Realce>{formatarMoeda(lucro)}</Realce> por unidade depois da
          maquininha. É{" "}
          <Realce>{formatarPercentual(verificacao.margemReal)}</Realce> do
          preço, ou{" "}
          <Realce>{formatarMultiplicador(verificacao.markupReal)}</Realce> o
          custo.
        </>
      ),
    };
  }

  const { tom, icone, mensagem } = explicar();

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 lg:px-5">
          <div className="flex gap-5">
            <Metrica rotulo="Custo da unidade" valor={custo.custoUnitario} />
            <Metrica
              rotulo="Sugerido"
              valor={derivado.precoArredondado}
              acao={
                podeVoltarAoSugerido ? (
                  <button
                    type="button"
                    onClick={aoUsarSugerido}
                    className="toque -my-2 inline-flex items-center gap-1 rounded-md px-2 text-label font-medium text-wine-700 transition-colors duration-150 ease-quart hover:bg-wine-100 dark:text-wine-300"
                  >
                    <Wand2 aria-hidden className="size-4" strokeWidth={1.75} />
                    Usar
                  </button>
                ) : undefined
              }
            />
          </div>

          <CampoMoeda
            rotulo="Preço de venda"
            valor={derivado.precoVenda}
            aoMudar={aoMudarPreco}
            className="w-36 shrink-0"
          />
        </div>

        <div
          className={cn(
            "flex items-start gap-2.5 border-t px-4 py-2.5 text-label lg:px-5",
            TONS[tom],
          )}
        >
          {icone}
          <p className="max-w-[64ch]">{mensagem}</p>
        </div>
      </div>
    </div>
  );
}

/** Número dentro da frase. O dado tem peso; a frase não. */
function Realce({ children }: { children: ReactNode }) {
  return <strong className="num font-semibold text-ink">{children}</strong>;
}
