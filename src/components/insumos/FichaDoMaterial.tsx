"use client";

import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { usoDoMaterial, type CustoDeHoje } from "@/lib/domain/custoFicha";
import { comprasDoInsumo, type CompraDoInsumo } from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloDataCompleta, rotuloDia } from "@/lib/domain/datas";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import {
  custoDeReferencia,
  formatarQuantidade,
  paraBase,
} from "@/lib/domain/unidades";
import type {
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  UnidadeBase,
  UnidadeRendimento,
} from "@/lib/types";

export const POR_UNIDADE: Record<UnidadeRendimento, string> = {
  un: "por unidade",
  porcao: "por porção",
  g: "por grama",
  ml: "por ml",
};

/** O quilo e o litro em centavos inteiros; a unidade, fracionária (`#d220`). */
export function formatarReferencia(centavos: number, unidadeBase: UnidadeBase) {
  return unidadeBase === "un"
    ? formatarCustoUnitario(centavos)
    : formatarMoeda(centavos);
}

function dia(ms: number): DataISO {
  return dataISODe(new Date(ms));
}

/** "subiu 9%" / "caiu 6%"; nada abaixo de 1%. */
function palavraVariacao(variacao: number | null): string | null {
  if (variacao === null || Math.abs(variacao) < 1) return null;
  return `${variacao > 0 ? "subiu" : "caiu"} ${Math.abs(variacao)}%`;
}

function LinhaCompra({
  compra,
  unidadeBase,
  rotulo,
}: {
  compra: CompraDoInsumo;
  unidadeBase: UnidadeBase;
  rotulo: string;
}) {
  const embalagem = formatarQuantidade(
    paraBase(compra.quantidadeCompra, compra.unidadeCompra),
    unidadeBase,
  );
  const referencia = formatarReferencia(compra.referencia, unidadeBase);
  const variacao = palavraVariacao(compra.variacao);
  const Seta = (compra.variacao ?? 0) > 0 ? TrendingUp : TrendingDown;

  // O leitor de tela ouve uma frase por compra; a grade é para o olho.
  const frase = compra.daBiblioteca
    ? `Preço médio da biblioteca, ${referencia} ${rotulo}.`
    : [
        rotuloDataCompleta(dia(compra.dataMs)),
        `${formatarMoeda(compra.precoCompra)} por ${embalagem}`,
        `${referencia} ${rotulo}`,
        variacao,
        compra.fornecedor,
      ]
        .filter(Boolean)
        .join(", ") + ".";

  return (
    <li className="py-2.5">
      <span className="sr-only">{frase}</span>
      <div
        aria-hidden
        className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-3"
      >
        {compra.daBiblioteca ? (
          <p className="col-span-2 text-label text-ink-muted">
            preço médio da biblioteca
          </p>
        ) : (
          <>
            <p className="num text-label text-ink-muted">
              {rotuloDia(dia(compra.dataMs))}
            </p>
            <p className="num min-w-0 truncate text-label text-ink">
              {formatarMoeda(compra.precoCompra)}
              <span className="mx-1.5 text-ink-subtle">·</span>
              {embalagem}
            </p>
          </>
        )}
        <p className="num text-right text-label font-semibold text-ink">
          {referencia}{" "}
          <span className="text-micro font-medium text-ink-muted">
            {rotulo}
          </span>
        </p>

        {(variacao || compra.fornecedor) && (
          <p className="col-start-2 col-end-4 mt-0.5 flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
            {variacao && (
              <>
                <Seta className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="num">{variacao}</span>
              </>
            )}
            {variacao && compra.fornecedor && (
              <span className="text-ink-subtle">·</span>
            )}
            {compra.fornecedor && (
              <span className="truncate">{compra.fornecedor}</span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * O material para ler (`#d222`): o que custa, o preço de cada compra, onde
 * entra e a despensa. Editar é o botão do rodapé do painel, e não esta tela.
 *
 * `fichas` nulo é "ainda não sei": carregando, ou negado pela regra. "Onde
 * entra" some, em vez de dizer "nenhum produto" por um instante.
 */
export function FichaDoMaterial({
  insumo,
  fichas,
  custos,
  fornadas,
  hoje,
}: {
  insumo: Insumo;
  fichas: FichaTecnica[] | null;
  custos: Map<string, CustoDeHoje>;
  fornadas: Fornada[];
  hoje: DataISO;
}) {
  const referencia = custoDeReferencia(
    insumo.custoUnidadeBaseCorrigido,
    insumo.unidadeBase,
  );
  const historico = comprasDoInsumo(insumo);
  const primeira = historico.primeiraMs
    ? rotuloDataCompleta(dia(historico.primeiraMs))
    : null;
  const usos = fichas ? usoDoMaterial(fichas, insumo, custos) : null;

  const contagem = contagemDoInsumo(insumo, hoje);
  const projecao = projecaoDoInsumo(fornadas, insumo, hoje);
  const comForno = projecao.fornadas > 0 && contagem.quantidade !== null;

  return (
    <div className="space-y-7">
      <section aria-label="O que custa">
        <p className="num text-label text-ink-muted">
          {formatarMoeda(insumo.precoCompra)} por{" "}
          {formatarQuantidade(insumo.quantidadeBase, insumo.unidadeBase)}
        </p>
        {/* Com a perda, como a linha e os produtos: é o custo que entra na conta. */}
        <p className="mt-1 text-heading text-ink">
          <span className="num font-semibold">
            {formatarReferencia(referencia.centavos, insumo.unidadeBase)}
          </span>{" "}
          <span className="text-body text-ink-muted">
            {referencia.rotulo},{" "}
            {insumo.perdaPercentual > 0
              ? `com ${insumo.perdaPercentual}% de perda`
              : "sem perda"}
          </span>
        </p>
      </section>

      <section aria-labelledby="compras-do-material">
        <h3
          id="compras-do-material"
          className="text-subheading font-semibold text-ink"
        >
          O preço de cada compra
        </h3>
        <ul className="mt-1 divide-y divide-line">
          {historico.compras.map((compra, indice) => (
            <LinhaCompra
              key={`${compra.dataMs}-${indice}`}
              compra={compra}
              unidadeBase={insumo.unidadeBase}
              rotulo={referencia.rotulo}
            />
          ))}
        </ul>
        <p className="mt-2 text-label text-ink-muted">
          {historico.quantas === 0
            ? "Nenhuma compra sua ainda. Quando você corrigir o preço, ela aparece aqui."
            : historico.quantas === 1
              ? `Uma compra registrada, em ${primeira}. As próximas aparecem aqui.`
              : historico.variacaoTotal === 0
                ? `O mesmo preço desde ${primeira}.`
                : `${(historico.variacaoTotal ?? 0) > 0 ? "Subiu" : "Caiu"} ${Math.abs(historico.variacaoTotal ?? 0)}% desde a primeira compra, em ${primeira}.`}
        </p>
      </section>

      {usos && (
        <section aria-labelledby="onde-entra">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="onde-entra"
              className="text-subheading font-semibold text-ink"
            >
              Onde entra
            </h3>
            {usos.length > 0 && (
              <p className="text-label text-ink-muted">
                em {usos.length} {usos.length === 1 ? "produto" : "produtos"}
              </p>
            )}
          </div>
          {usos.length === 0 ? (
            <p className="mt-2 text-label text-ink-muted">
              Ainda não entra em nenhum produto.
            </p>
          ) : (
            <ul className="-mx-2 mt-1">
              {usos.map((uso) => {
                const parte = Math.round(uso.parte * 100);
                return (
                  <li key={uso.fichaId}>
                    <Link
                      href={`/fichas/${uso.fichaId}`}
                      className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-ink">
                          {uso.nome}
                        </span>
                        <span className="num block text-label text-ink-muted">
                          {formatarCustoUnitario(uso.custoPorUnidade)}{" "}
                          {POR_UNIDADE[uso.unidadeRendimento]}
                          <span aria-hidden className="mx-1.5 text-ink-subtle">
                            ·
                          </span>
                          <span className="sr-only">, </span>
                          {parte < 1 ? "menos de 1%" : `${parte}%`} do custo
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-5 shrink-0 text-ink-subtle"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* As frases da linha, com a idade sempre: aqui é o lugar dela (`#d87`). */}
      <section aria-labelledby="na-despensa">
        <h3 id="na-despensa" className="text-subheading font-semibold text-ink">
          Na despensa
        </h3>
        <p className="num mt-2 text-label text-ink-muted">
          {contagem.anotado === null
            ? "Nunca contada."
            : `${formatarQuantidade(contagem.anotado, insumo.unidadeBase)} · ${rotuloDeIdade(contagem)}`}
          {comForno && (
            <>
              {" · "}
              {projecao.fornadas === 1
                ? "1 fornada desde então"
                : `${projecao.fornadas} fornadas desde então`}
              , projetamos{" "}
              {formatarQuantidade(projecao.disponivel, insumo.unidadeBase)}
            </>
          )}
        </p>
      </section>
    </div>
  );
}
