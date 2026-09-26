"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { efeitoDoPrecoNovo, type EfeitoNaFicha } from "@/lib/domain/custoFicha";
import {
  variacaoEntre,
  type CustoInsumoCalculado,
} from "@/lib/domain/custoInsumo";
import { formatarMoeda } from "@/lib/domain/money";
import { custoDeReferencia } from "@/lib/domain/unidades";
import type { FichaTecnica, Insumo } from "@/lib/types";
import { formatarReferencia, POR_UNIDADE } from "./FichaDoMaterial";

const LINHAS = 3;

/** O sinal da sobra mudou: é ali que a decisão muda (`#d224`). */
function cruzou(efeito: EfeitoNaFicha): "entra" | "sai" | null {
  if (efeito.antes >= 0 && efeito.depois < 0) return "entra";
  if (efeito.antes < 0 && efeito.depois >= 0) return "sai";
  return null;
}

function LinhaEfeito({ efeito }: { efeito: EfeitoNaFicha }) {
  const vermelho = cruzou(efeito);
  const diferenca = efeito.depois - efeito.antes;
  const Seta = diferenca > 0 ? TrendingUp : TrendingDown;
  const porUnidade = POR_UNIDADE[efeito.unidadeRendimento];
  const antes = formatarMoeda(efeito.antes);
  const depois = formatarMoeda(efeito.depois);

  const frase = `${efeito.nome}: sobrava ${antes}, passa a ${depois} ${porUnidade}, ${
    vermelho === "entra"
      ? "fica no vermelho"
      : vermelho === "sai"
        ? "sai do vermelho"
        : `${diferenca > 0 ? "mais" : "menos"} ${formatarMoeda(Math.abs(diferenca))}`
  }.`;

  return (
    <li className="py-2.5">
      <span className="sr-only">{frase}</span>
      <div aria-hidden>
        <p className="truncate text-body font-medium text-ink">{efeito.nome}</p>
        <p className="num mt-0.5 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
          <span>
            sobra {antes} →{" "}
            <span
              className={
                vermelho === "entra"
                  ? "font-semibold text-negative"
                  : vermelho === "sai"
                    ? "font-semibold text-positive"
                    : "font-semibold text-ink"
              }
            >
              {depois}
            </span>{" "}
            {porUnidade}
          </span>
          {vermelho ? (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                vermelho === "entra" ? "text-negative" : "text-positive"
              }`}
            >
              {vermelho === "entra" ? (
                <TriangleAlert className="size-4 shrink-0" strokeWidth={1.75} />
              ) : (
                <TrendingUp className="size-4 shrink-0" strokeWidth={1.75} />
              )}
              {vermelho === "entra" ? "fica no vermelho" : "sai do vermelho"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Seta className="size-4 shrink-0" strokeWidth={1.75} />
              {formatarMoeda(Math.abs(diferenca))}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * O que o preço digitado faz com a sobra dos produtos, antes de salvar
 * (`#d224`). Some quando nada muda: nenhum produto usa o material, ou o preço
 * voltou ao gravado.
 */
export function EfeitoDoPreco({
  insumo,
  custo,
  fichas,
  materiais,
}: {
  /** O gravado. */
  insumo: Insumo;
  /** O digitado, de `calcularCustoInsumo`. */
  custo: CustoInsumoCalculado;
  fichas: FichaTecnica[];
  materiais: Insumo[];
}) {
  // Trocar g por un não é mudar o preço: as quantidades das fichas estão na
  // base gravada, e a conta sairia sem sentido.
  const mesmaBase = custo.unidadeBase === insumo.unidadeBase;
  const efeitos = useMemo(
    () =>
      mesmaBase
        ? efeitoDoPrecoNovo(fichas, materiais, {
            id: insumo.id,
            nome: insumo.nome,
            custoUnidadeBaseCorrigido: custo.custoUnidadeBaseCorrigido,
          })
        : [],
    [
      mesmaBase,
      fichas,
      materiais,
      insumo.id,
      insumo.nome,
      custo.custoUnidadeBaseCorrigido,
    ],
  );
  if (efeitos.length === 0) return null;

  // Quem cruza o zero sobe para as três linhas: é a linha que ela precisa ver.
  const visiveis = [...efeitos]
    .sort((a, b) => Number(!!cruzou(b)) - Number(!!cruzou(a)))
    .slice(0, LINHAS);
  const resto = efeitos.length - visiveis.length;
  const entram = efeitos.filter((e) => cruzou(e) === "entra").length;
  const saem = efeitos.filter((e) => cruzou(e) === "sai").length;

  const antes = custoDeReferencia(
    insumo.custoUnidadeBaseCorrigido,
    insumo.unidadeBase,
  );
  const depois = custoDeReferencia(
    custo.custoUnidadeBaseCorrigido,
    insumo.unidadeBase,
  );
  const variacao = variacaoEntre(
    insumo.custoUnidadeBaseCorrigido,
    custo.custoUnidadeBaseCorrigido,
  );
  const SetaPreco = (variacao ?? 0) > 0 ? TrendingUp : TrendingDown;

  const n = efeitos.length;
  const resumo = [
    `Com esse preço, ${n} ${n === 1 ? "produto muda" : "produtos mudam"}`,
    entram > 0 && `${entram} ${entram === 1 ? "fica" : "ficam"} no vermelho`,
    saem > 0 && `${saem} ${saem === 1 ? "sai" : "saem"} do vermelho`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <section
      aria-labelledby="efeito-do-preco"
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="efeito-do-preco"
          className="text-subheading font-semibold text-ink"
        >
          Com esse preço
        </h3>
        <p className="num flex items-center gap-1.5 text-label text-ink-muted">
          <span>
            {antes.rotulo}:{" "}
            {formatarReferencia(antes.centavos, insumo.unidadeBase)} →{" "}
            <span className="font-semibold text-ink">
              {formatarReferencia(depois.centavos, insumo.unidadeBase)}
            </span>
          </span>
          {variacao !== null && variacao !== 0 && (
            <span className="inline-flex items-center gap-1">
              <SetaPreco
                aria-hidden
                className="size-4 shrink-0"
                strokeWidth={1.75}
              />
              <span className="sr-only">{variacao > 0 ? "sobe" : "cai"}</span>
              {Math.abs(variacao)}%
            </span>
          )}
        </p>
      </div>
      {/* Só a contagem é viva: a lista inteira a cada tecla seria ruído. */}
      <p aria-live="polite" className="sr-only">
        {resumo}.
      </p>

      <ul className="mt-2 divide-y divide-line">
        {visiveis.map((efeito) => (
          <LinhaEfeito key={efeito.fichaId} efeito={efeito} />
        ))}
      </ul>
      {resto > 0 && (
        <p className="mt-1 text-label text-ink-muted">
          e mais {resto} {resto === 1 ? "produto" : "produtos"}
        </p>
      )}

      <p className="mt-3 border-t border-line pt-3 text-label text-ink-muted">
        {n === 1
          ? "Ao salvar, ele fica marcado para rever o preço em Produtos."
          : "Ao salvar, eles ficam marcados para rever o preço em Produtos."}
      </p>
    </section>
  );
}
