"use client";

import { Check, CircleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { formatarMoeda } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import type { ConferenciaTotal } from "@/lib/domain/notaFiscal";

export interface ResumoDaNota {
  /** Quantas linhas vão virar documento. */
  linhas: number;
  /** Quantas delas atualizam um insumo que já existe. */
  atualizacoes: number;
  /** Quantas ainda não têm nome, preço ou embalagem. */
  incompletas: number;
  conferencia: ConferenciaTotal;
  /** O que ela tirou da lista, somado. */
  removido: Centavos;
}

/**
 * O rodapé preso ao pé da tela, no mesmo padrão dos outros três.
 *
 * A conferência do total **não bloqueia** o cadastro: é o princípio 3 do
 * `PRODUCT.md` aplicado à confiança no próprio leitor — todo número mostra a
 * sua consequência, inclusive o número que o sistema leu errado. O que bloqueia
 * é linha sem preço, que não tem como virar documento.
 */
export function RodapeNota({
  resumo,
  salvando,
  aoCadastrar,
}: {
  resumo: ResumoDaNota;
  salvando: boolean;
  aoCadastrar: () => void;
}) {
  const { linhas, atualizacoes, incompletas, conferencia, removido } = resumo;

  /** A diferença que a remoção não explica. Zero é a nota fechando. */
  const naoExplicado = conferencia.diferenca - removido;
  const tudoCerto =
    incompletas === 0 && (naoExplicado === 0 || conferencia.total <= 0);

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 lg:px-5">
          <div className="min-w-0">
            <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
              {contagem(linhas, atualizacoes)}
            </p>
            <p className="mt-0.5">
              <Dinheiro centavos={conferencia.soma} tamanho="lg" />
            </p>
          </div>

          <Botao
            variante="primaria"
            tamanho="lg"
            carregando={salvando}
            disabled={linhas === 0 || incompletas > 0}
            onClick={aoCadastrar}
          >
            {linhas === 1
              ? "Cadastrar 1 insumo"
              : `Cadastrar ${linhas} insumos`}
          </Botao>
        </div>

        <p className="flex items-start gap-2.5 border-t border-line bg-sunken px-4 py-2.5 text-label text-ink-muted lg:px-5">
          {tudoCerto ? (
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-positive"
              strokeWidth={2}
            />
          ) : (
            <CircleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-attention"
              strokeWidth={1.75}
            />
          )}
          <span className="max-w-[64ch]" aria-live="polite">
            <Frase resumo={resumo} naoExplicado={naoExplicado} />
          </span>
        </p>
      </div>
    </div>
  );
}

function contagem(linhas: number, atualizacoes: number): string {
  const itens = `${linhas} ${linhas === 1 ? "insumo" : "insumos"}`;
  if (atualizacoes === 0) return itens;
  return `${itens} · ${atualizacoes} ${
    atualizacoes === 1 ? "atualização" : "atualizações"
  }`;
}

function Valor({ centavos }: { centavos: Centavos }) {
  return (
    <strong className="num font-semibold text-ink">
      {formatarMoeda(centavos)}
    </strong>
  );
}

function Frase({
  resumo,
  naoExplicado,
}: {
  resumo: ResumoDaNota;
  naoExplicado: Centavos;
}) {
  const { conferencia, removido, incompletas, linhas } = resumo;

  if (linhas === 0) {
    return (
      <>
        Todas as linhas saíram da lista. Traga alguma de volta para cadastrar.
      </>
    );
  }

  if (incompletas > 0) {
    return (
      <>
        <strong className="num font-semibold text-ink">{incompletas}</strong>{" "}
        {incompletas === 1
          ? "linha ainda está sem nome, sem preço ou sem embalagem"
          : "linhas ainda estão sem nome, sem preço ou sem embalagem"}
        . Complete ou tire da lista.
      </>
    );
  }

  if (conferencia.total <= 0) {
    return (
      <>
        A nota não trouxe um total legível, então não há com o que conferir a
        soma. Confira as linhas contra o papel antes de cadastrar.
      </>
    );
  }

  if (naoExplicado === 0) {
    // O caminho comum: ela tirou o que não é do negócio, e a diferença é
    // justamente isso.
    if (removido > 0) {
      return (
        <>
          As linhas somam <Valor centavos={conferencia.soma} />. A nota diz{" "}
          <Valor centavos={conferencia.total} />, e os{" "}
          <Valor centavos={removido} /> que você tirou explicam a diferença.
        </>
      );
    }

    return (
      <>
        As linhas somam <Valor centavos={conferencia.soma} />, exatamente o
        total impresso na nota.
      </>
    );
  }

  if (naoExplicado > 0) {
    return (
      <>
        Faltam <Valor centavos={naoExplicado} /> para fechar com a nota. Pode
        ter ficado uma linha para trás.
      </>
    );
  }

  return (
    <>
      As linhas somam <Valor centavos={Math.abs(naoExplicado)} /> a mais do que
      a nota. Confira se alguma linha entrou duas vezes.
    </>
  );
}
