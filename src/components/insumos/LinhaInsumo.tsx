"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { temPrecoMedio } from "@/lib/domain/biblioteca";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import { custoDeReferencia, formatarQuantidade } from "@/lib/domain/unidades";
import type { DataISO, Fornada, Insumo } from "@/lib/types";

/**
 * A linha do insumo, com o que a despensa tem e desde quando.
 *
 * O selo era "Estoque baixo" e nunca pôde acender: dependia de um limiar por
 * insumo que nenhuma tela escrevia — vinte palpites a manter, cada um
 * envelhecendo do mesmo jeito que o estoque envelhecia. O que ficou no lugar é
 * uma afirmação verificável sobre um número que existe: esta contagem passou de
 * um mês, e a lista de compras parou de descontá-la.
 */
export function LinhaInsumo({
  insumo,
  fornadas,
  hoje,
  aoAbrir,
}: {
  insumo: Insumo;
  /** As fornadas recentes, para a linha dizer o que o forno já levou. */
  fornadas: Fornada[];
  hoje: DataISO;
  aoAbrir: (insumo: Insumo) => void;
}) {
  // `contagemDoInsumo`, e não `frescorDaContagem` direto: é ele que sabe que
  // data sem número não é contagem, e que `null` no documento é ausência.
  const contagem = contagemDoInsumo(insumo, hoje);
  const contagemVencida = contagem.frescor === "VENCIDA";

  // A projeção só vale a frase quando o forno mexeu num número que ainda vale:
  // a contagem gravada não muda, e a linha diz os dois (`#d87`).
  const projecao = projecaoDoInsumo(fornadas, insumo, hoje);
  const comForno = projecao.fornadas > 0 && contagem.quantidade !== null;

  // O custo no número da gôndola, já com a perda (`#d220`). O grama fica no
  // formulário, onde a conta é "quantos gramas × quanto o grama".
  const referencia = custoDeReferencia(
    insumo.custoUnidadeBaseCorrigido,
    insumo.unidadeBase,
  );

  // Três andares, como a linha da ficha: nome e custo em cima, a compra e a
  // unidade no meio, e a despensa na largura inteira embaixo. Ao lado do custo,
  // a despensa quebrava em três linhas num celular de 360px.
  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(insumo)}
        className="block w-full px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {insumo.nome}
          </p>
          <p className="num shrink-0 text-body font-semibold text-ink">
            {referencia.rotulo === "a unidade"
              ? formatarCustoUnitario(referencia.centavos)
              : formatarMoeda(referencia.centavos)}
            {/* O leitor de tela lê valor e rótulo na mesma frase. */}
            <span className="sr-only">, {referencia.rotulo}</span>
          </p>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </div>

        {/* `pr-8` é a seta mais o vão: a unidade fica debaixo do custo. */}
        <div className="mt-0.5 flex items-baseline gap-3 pr-8">
          <p className="num min-w-0 flex-1 truncate text-label text-ink-muted">
            {formatarMoeda(insumo.precoCompra)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            {formatarQuantidade(insumo.quantidadeBase, insumo.unidadeBase)}
            {insumo.perdaPercentual > 0 && (
              <>
                <span className="mx-1.5 text-ink-subtle">·</span>
                {insumo.perdaPercentual}% de perda
              </>
            )}
          </p>
          <p aria-hidden className="shrink-0 text-micro text-ink-muted">
            {referencia.rotulo}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-start gap-x-5 gap-y-1">
          {/* A despensa, e desde quando. Sem a idade o número é um palpite
              antigo tratado como verdade, que é exatamente o que a lista de
              compras deixou de fazer. A idade fresca sai: repetida em toda
              linha, virava o cinza da planilha e não pedia decisão. */}
          <p className="num text-label text-ink-subtle">
            {contagem.anotado === null
              ? "nunca contada"
              : contagem.frescor === "FRESCA"
                ? `${formatarQuantidade(contagem.anotado, insumo.unidadeBase)} na despensa`
                : `${formatarQuantidade(contagem.anotado, insumo.unidadeBase)} na despensa · ${rotuloDeIdade(contagem)}`}
          </p>

          {comForno && (
            <p className="num text-label text-ink-subtle">
              {projecao.fornadas === 1
                ? "1 fornada desde então"
                : `${projecao.fornadas} fornadas desde então`}
              <span className="mx-1.5">·</span>
              projetamos{" "}
              {formatarQuantidade(projecao.disponivel, insumo.unidadeBase)}
            </p>
          )}

          {contagemVencida && (
            <Selo
              tom="atencao"
              icone={<TriangleAlert aria-hidden className="size-3.5" />}
            >
              Contagem vencida
            </Selo>
          )}
          {temPrecoMedio(insumo) && <Selo tom="neutro">Preço médio</Selo>}
        </div>
      </button>
    </li>
  );
}
