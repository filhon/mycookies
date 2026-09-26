"use client";

import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { temPrecoMedio } from "@/lib/domain/biblioteca";
import { CATEGORIAS_INSUMO, ultimaCompraDela } from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloDataCompleta, rotuloDia } from "@/lib/domain/datas";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import { custoDeReferencia, formatarQuantidade } from "@/lib/domain/unidades";
import type { DataISO, Fornada, Insumo } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** Abaixo disso a última compra não vira sinal na linha; a ficha diz tudo (`#d223`). */
const VARIACAO_NA_LINHA = 5;

/**
 * As seis colunas da tabela (`#d225`). `minmax(0, …)` deixa a célula quebrar
 * em vez de empurrar a tabela para fora da tela ao lado da ficha.
 */
export const COLUNAS_MATERIAL =
  "grid-cols-[minmax(0,2.4fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)]";

/**
 * A linha do insumo, com o que a despensa tem e desde quando.
 *
 * O selo era "Estoque baixo" e nunca pôde acender: dependia de um limiar por
 * insumo que nenhuma tela escrevia — vinte palpites a manter, cada um
 * envelhecendo do mesmo jeito que o estoque envelhecia. O que ficou no lugar é
 * uma afirmação verificável sobre um número que existe: esta contagem passou de
 * um mês, e a lista de compras parou de descontá-la.
 *
 * Dois arranjos no mesmo `<li>`, como `LinhaFicha`: o `display: none` tira o
 * oculto da árvore de acessibilidade. **No desktop**, a linha da tabela
 * (`#d225`); com a ficha acoplada aberta, a tabela só cabe a partir de `xl`, e
 * entre `lg` e `xl` volta a linha do celular.
 */
export function LinhaInsumo({
  insumo,
  fornadas,
  hoje,
  aoAbrir,
  produtos,
  selecionado = false,
  comFicha = false,
}: {
  insumo: Insumo;
  /** As fornadas recentes, para a linha dizer o que o forno já levou. */
  fornadas: Fornada[];
  hoje: DataISO;
  aoAbrir: (insumo: Insumo) => void;
  /** Em quantos produtos entra; ausente enquanto os produtos carregam. */
  produtos?: number;
  /** A linha cujo material está na ficha ao lado. Só no desktop. */
  selecionado?: boolean;
  /** A ficha acoplada divide a largura: a tabela espera o `xl`. */
  comFicha?: boolean;
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
  const valorReferencia =
    referencia.rotulo === "a unidade"
      ? formatarCustoUnitario(referencia.centavos)
      : formatarMoeda(referencia.centavos);

  // Sem cor semântica: subir não é erro nem prejuízo, é informação, e a
  // atenção já é do custo desatualizado (`#d223`).
  const ultima = ultimaCompraDela(insumo);
  const variacao = ultima?.variacao ?? null;
  const mostraVariacao =
    variacao !== null && Math.abs(variacao) >= VARIACAO_NA_LINHA;
  const Seta = (variacao ?? 0) > 0 ? TrendingUp : TrendingDown;
  const sinalVariacao = mostraVariacao && (
    <>
      <Seta aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      <span aria-hidden>{Math.abs(variacao)}%</span>
      <span className="sr-only">
        {variacao > 0 ? "subiu" : "caiu"} {Math.abs(variacao)}% na última compra
      </span>
    </>
  );

  const selos = (
    <>
      {contagemVencida && (
        <Selo
          tom="atencao"
          icone={<TriangleAlert aria-hidden className="size-3.5" />}
        >
          Contagem vencida
        </Selo>
      )}
      {temPrecoMedio(insumo) && <Selo tom="neutro">Preço médio</Selo>}
    </>
  );

  const despensa =
    contagem.anotado === null
      ? null
      : formatarQuantidade(contagem.anotado, insumo.unidadeBase);
  const projetamos =
    comForno && formatarQuantidade(projecao.disponivel, insumo.unidadeBase);

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(insumo)}
        aria-current={selecionado ? "true" : undefined}
        className={cn(
          "block w-full text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
          selecionado && "bg-sunken",
        )}
      >
        {/* ---- celular: três andares, como a linha da ficha ----
            Nome e custo em cima, a compra e a unidade no meio, e a despensa na
            largura inteira embaixo. Ao lado do custo, a despensa quebrava em
            três linhas num celular de 360px. */}
        <div className={cn("px-4 py-3", comFicha ? "xl:hidden" : "lg:hidden")}>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
              {insumo.nome}
            </p>
            {mostraVariacao && (
              <p className="num flex shrink-0 items-center gap-1 text-label text-ink-muted">
                {sinalVariacao}
              </p>
            )}
            <p className="num shrink-0 text-body font-semibold text-ink">
              {valorReferencia}
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
              {despensa === null
                ? "nunca contada"
                : contagem.frescor === "FRESCA"
                  ? `${despensa} na despensa`
                  : `${despensa} na despensa · ${rotuloDeIdade(contagem)}`}
            </p>

            {comForno && (
              <p className="num text-label text-ink-subtle">
                {projecao.fornadas === 1
                  ? "1 fornada desde então"
                  : `${projecao.fornadas} fornadas desde então`}
                <span className="mx-1.5">·</span>
                projetamos {projetamos}
              </p>
            )}

            {selos}
          </div>
        </div>

        {/* ---- desktop: a linha da tabela (`#d225`) ---- */}
        <div
          className={cn(
            "hidden items-center gap-x-4 px-4 py-3",
            comFicha ? "xl:grid" : "lg:grid",
            COLUNAS_MATERIAL,
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 truncate text-body font-semibold text-ink">
                {insumo.nome}
              </p>
              {selos}
            </div>
            <p className="mt-0.5 truncate text-label text-ink-muted">
              {[
                CATEGORIAS_INSUMO.find((c) => c.valor === insumo.categoria)
                  ?.rotulo,
                insumo.marca,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="num text-right text-body text-ink">
            <p>
              <span className="sr-only">compra </span>
              {formatarMoeda(insumo.precoCompra)}
              <span aria-hidden className="mx-1.5 text-ink-subtle">
                ·
              </span>
              <span className="sr-only"> por </span>
              {formatarQuantidade(insumo.quantidadeBase, insumo.unidadeBase)}
            </p>
            {insumo.perdaPercentual > 0 && (
              <p className="text-micro text-ink-muted">
                {insumo.perdaPercentual}% de perda
              </p>
            )}
          </div>

          <p className="num text-right text-body font-semibold text-ink">
            {valorReferencia}
            <span className="sr-only">, {referencia.rotulo}</span>
            {/* O quilo é o cabeçalho; o litro e a unidade dizem o seu. */}
            {referencia.rotulo !== "o quilo" && (
              <span
                aria-hidden
                className="block text-micro font-medium text-ink-muted"
              >
                {referencia.rotulo}
              </span>
            )}
          </p>

          <p className="num flex flex-wrap items-center justify-end gap-x-1 text-right text-body text-ink">
            {ultima ? (
              <>
                <span className="sr-only">
                  última compra em{" "}
                  {rotuloDataCompleta(dataISODe(new Date(ultima.dataMs)))}
                </span>
                <span aria-hidden>
                  {rotuloDia(dataISODe(new Date(ultima.dataMs)))}
                </span>
                {mostraVariacao && (
                  <span className="flex items-center gap-1 text-ink-muted">
                    <span aria-hidden className="text-ink-subtle">
                      ·
                    </span>
                    {sinalVariacao}
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-subtle">
                <span className="sr-only">última compra: </span>nenhuma
              </span>
            )}
          </p>

          <div className="num text-right">
            <p className="text-body text-ink">
              <span className="sr-only">na despensa: </span>
              {despensa ?? "nunca contada"}
            </p>
            {despensa !== null && (
              <p className="text-micro text-ink-muted">
                {projetamos
                  ? `projetamos ${projetamos}`
                  : rotuloDeIdade(contagem)}
              </p>
            )}
          </div>

          <p className="num text-right text-body text-ink">
            {produtos !== undefined && (
              <>
                <span className="sr-only">entra em </span>
                {produtos === 0
                  ? "nenhum"
                  : `${produtos} ${produtos === 1 ? "produto" : "produtos"}`}
              </>
            )}
          </p>
        </div>
      </button>
    </li>
  );
}
