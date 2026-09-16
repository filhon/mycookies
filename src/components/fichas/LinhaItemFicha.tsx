"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { listarNomes } from "@/components/producao/FraseDaCapacidade";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { formatarMoeda, formatarValor } from "@/lib/domain/money";
import type { Centavos, UnidadeCompra } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CLASSES_QUANTIDADE = cn(
  BASE_CONTROLE,
  "num w-24 text-right font-semibold border-line-strong",
);

/**
 * O esqueleto comum das duas listas do editor: nome em cima, quantidade e
 * custo da linha embaixo, e o botão de remover sempre no mesmo lugar.
 *
 * Linha com divisória, e não cartão: isto é uma tabela de receita, e cartão
 * dentro de cartão seria a segunda caixa em volta do mesmo dado.
 */
function Linha({
  nome,
  etiqueta,
  controles,
  detalhe,
  custoLinha,
  aoRemover,
  rotuloRemover,
  erro,
}: {
  /** Sem nome, os controles são a primeira linha: é o caso da escolha. */
  nome?: string;
  etiqueta?: ReactNode;
  controles: ReactNode;
  /** A consequência, embaixo dos controles. */
  detalhe?: ReactNode;
  custoLinha: Centavos;
  aoRemover: () => void;
  rotuloRemover: string;
  erro?: string;
}) {
  return (
    <li className="px-4 py-3 lg:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {nome && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-body font-medium text-ink">
                {nome}
              </span>
              {etiqueta}
            </p>
          )}

          <div className={cn("flex items-center gap-2", nome && "mt-2")}>
            {controles}
            <span className="ml-auto text-right">
              <Dinheiro centavos={custoLinha} />
            </span>
          </div>

          {detalhe && <div className="mt-1.5">{detalhe}</div>}

          {erro && (
            <p role="alert" className="mt-1.5 text-label text-negative">
              {erro}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={aoRemover}
          aria-label={rotuloRemover}
          className="toque -mr-2 flex shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-quart hover:bg-negative-soft hover:text-negative"
        >
          <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}

export function LinhaItemFicha({
  nome,
  ehEmbalagem,
  unidades,
  custoLinha,
  campoQuantidade,
  campoUnidade,
  aoRemover,
  erro,
}: {
  nome: string;
  ehEmbalagem: boolean;
  /** Só as unidades compatíveis com a unidade base do insumo. */
  unidades: UnidadeCompra[];
  custoLinha: Centavos;
  campoQuantidade: UseFormRegisterReturn;
  campoUnidade: UseFormRegisterReturn;
  aoRemover: () => void;
  erro?: string;
}) {
  const unica = unidades[0];

  return (
    <Linha
      nome={nome}
      etiqueta={ehEmbalagem ? <Selo tom="neutro">Embalagem</Selo> : undefined}
      custoLinha={custoLinha}
      aoRemover={aoRemover}
      rotuloRemover={`Tirar ${nome} do produto`}
      erro={erro}
      controles={
        <>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={`Quantidade de ${nome}`}
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            {...campoQuantidade}
          />

          {/* Uma unidade só não é escolha: vira rótulo, e o toque sobra para
              quem precisa dele. */}
          {unidades.length === 1 && unica ? (
            <span className="text-label text-ink-muted">{unica}</span>
          ) : (
            <select
              aria-label={`Unidade de ${nome}`}
              className={cn(BASE_CONTROLE, "w-20 border-line-strong px-2")}
              {...campoUnidade}
            >
              {unidades.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          )}
        </>
      }
    />
  );
}

export function LinhaComponenteFicha({
  nome,
  custoUnitario,
  custoLinha,
  campoQuantidade,
  aoRemover,
  erro,
}: {
  nome: string;
  custoUnitario: Centavos;
  custoLinha: Centavos;
  campoQuantidade: UseFormRegisterReturn;
  aoRemover: () => void;
  erro?: string;
}) {
  return (
    <Linha
      nome={nome}
      custoLinha={custoLinha}
      aoRemover={aoRemover}
      rotuloRemover={`Tirar ${nome} do kit`}
      erro={erro}
      controles={
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Quantidade de ${nome} no kit`}
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            {...campoQuantidade}
          />
          <span className="num text-label text-ink-muted">
            × {formatarValor(custoUnitario)}
          </span>
        </>
      }
    />
  );
}

/**
 * Uma escolha do kit: quantas, de qual categoria, e o que isso custa pela
 * opção mais cara. Embaixo, a consequência: quais receitas servem hoje, ou o
 * aviso de que nenhuma serve, com ícone porque a cor não basta.
 */
export function LinhaEscolhaFicha({
  categorias,
  opcoes,
  maisCara,
  custoLinha,
  campoQuantidade,
  campoCategoria,
  aoRemover,
  erro,
}: {
  categorias: string[];
  /** Os nomes das receitas que servem a esta escolha hoje. */
  opcoes: string[];
  maisCara: Centavos;
  custoLinha: Centavos;
  campoQuantidade: UseFormRegisterReturn;
  campoCategoria: UseFormRegisterReturn;
  aoRemover: () => void;
  erro?: string;
}) {
  return (
    <Linha
      custoLinha={custoLinha}
      aoRemover={aoRemover}
      rotuloRemover="Tirar esta escolha do kit"
      erro={erro}
      controles={
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Quantas unidades a cliente escolhe"
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            {...campoQuantidade}
          />
          <span className="shrink-0 text-label text-ink-muted">un de</span>
          <select
            aria-label="Categoria da escolha"
            className={cn(BASE_CONTROLE, "min-w-0 flex-1 border-line-strong")}
            {...campoCategoria}
          >
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </>
      }
      detalhe={
        opcoes.length === 0 ? (
          <p className="flex items-start gap-1.5 text-label text-attention">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.75}
            />
            Nenhuma receita nesta categoria. O custo desta escolha está zerado.
          </p>
        ) : (
          <p className="text-label text-ink-muted">
            {opcoes.length === 1
              ? `1 receita serve: ${opcoes[0]}`
              : `${opcoes.length} receitas servem: ${listarNomes(opcoes, 3)}`}
            <span aria-hidden> · </span>
            <span className="num">
              a mais cara custa {formatarMoeda(maisCara)}
            </span>
          </p>
        )
      }
    />
  );
}
