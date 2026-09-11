"use client";

import { Check, ShoppingBasket } from "lucide-react";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import {
  numeroContado,
  procedenciaDaSugestao,
  rotuloDeIdade,
  textoContado,
} from "@/lib/domain/estoque";
import type { LinhaDeContagem, OrigemDaEntrada } from "@/lib/domain/estoque";
import type { ProjecaoDoInsumo } from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { cn } from "@/lib/utils/cn";

/**
 * Uma linha da contagem: o nome, o campo, e a frase que explica o número velho.
 *
 * **O campo nasce vazio quando não houve compra**, e é a coisa mais importante
 * desta tela. Semeá-lo com o valor anterior seria mais confortável de digitar e
 * destruiria a única coisa que esta tela constrói: a diferença entre um número
 * conferido e um número herdado. Vazio é "não contei esta"; `0` é "contei, e não
 * tem".
 *
 * A exceção é a compra, e ela não é a mesma coisa: ali o campo nasce com
 * `contagem + o que entrou`, um número que o sistema tem como defender — e a
 * frase embaixo diz as duas parcelas, para ela conferir a soma em vez de
 * acreditar nela.
 *
 * A referência fica embaixo do nome, e não embaixo do campo: em 360px o campo
 * tem 112px, e "500 g · contada há 12 dias" quebraria em três linhas ali.
 *
 * A projeção do forno é referência, e **não semente**: um número herdado com
 * uma conta em cima continua sendo herdado (`#d59`), e semeá-lo seria o mesmo
 * erro com uma camada de aritmética por fora.
 */
export function LinhaContagem({
  linha,
  projecao,
  origem,
  texto,
  aoMudar,
}: {
  linha: LinhaDeContagem;
  /** O que o forno levou desde a contagem desta linha. */
  projecao?: ProjecaoDoInsumo;
  /** De onde a semente veio. Ausente quando ela chegou por `/compras`. */
  origem?: OrigemDaEntrada;
  texto: string;
  aoMudar: (texto: string) => void;
}) {
  const digitado = texto.trim().length > 0;
  const valor = numeroContado(texto);
  const ilegivel = digitado && valor === null;
  const contado = valor !== null;

  // A procedência vale enquanto o campo ainda é o que a compra propôs. No
  // instante em que ela corrige o número, a frase passa a falar do número dela.
  const proposto =
    origem !== undefined &&
    linha.sugestao !== null &&
    texto === textoContado(linha.sugestao);
  const procedencia = proposto ? procedenciaDaSugestao(linha, origem) : null;
  // A frase do forno também pode quebrar: cortá-la esconderia a projeção, que
  // é a parte que ela veio conferir.
  const comForno = !!projecao && projecao.fornadas > 0;

  return (
    <li className={cn("px-4 py-3 lg:px-5", contado && "bg-sunken")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`contagem-${linha.insumoId}`}
            className="block truncate text-body font-medium text-ink"
          >
            {linha.nome}
          </label>

          <p
            id={`contagem-${linha.insumoId}-referencia`}
            className={cn(
              "num mt-0.5 flex items-start gap-1.5 text-label",
              ilegivel
                ? "text-negative"
                : contado && !procedencia
                  ? "text-ink"
                  : "text-ink-muted",
            )}
          >
            {procedencia ? (
              <ShoppingBasket
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-ink-subtle"
                strokeWidth={2}
              />
            ) : (
              contado &&
              !ilegivel && (
                <Check
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-positive"
                  strokeWidth={2.5}
                />
              )
            )}
            {/* A procedência pode quebrar em duas linhas: "620 g contados há 4
                dias + 1 kg da nota" não cabe em 360px, e cortá-la esconderia
                justamente a parcela que ela precisa conferir. */}
            <span className={cn(!procedencia && !comForno && "truncate")}>
              {ilegivel
                ? "não deu para ler este número"
                : (procedencia ??
                  (contado
                    ? consequencia(valor, linha)
                    : referencia(linha, projecao)))}
            </span>
          </p>
        </div>

        <div className="relative w-28 shrink-0">
          <input
            id={`contagem-${linha.insumoId}`}
            // Teclado numérico com vírgula, e não `type="number"`: a seta de
            // incremento não serve para contar despensa, e o teclado do celular
            // precisa oferecer a vírgula decimal.
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            placeholder="—"
            value={texto}
            aria-describedby={`contagem-${linha.insumoId}-referencia`}
            aria-invalid={ilegivel ? true : undefined}
            onChange={(evento) => aoMudar(evento.target.value)}
            className={cn(
              BASE_CONTROLE,
              "num pr-10 text-right font-semibold",
              ilegivel ? "border-negative" : "border-line-strong",
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-muted"
          >
            {linha.unidadeBase}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * O que está gravado hoje, com a idade — é a frase que explica por que a lista
 * de compras está comprando o que ela acha que já tem.
 *
 * Com fornada depois da contagem, a frase diz quantas e o que projetamos:
 * "1,2 kg · contada há 5 dias · 2 fornadas desde então, projetamos 674 g". É o
 * que a deixa desconfiar sozinha de um número que o forno já mexeu.
 */
function referencia(
  linha: LinhaDeContagem,
  projecao: ProjecaoDoInsumo | undefined,
): string {
  const { contagem, unidadeBase } = linha;
  if (contagem.anotado === null) return "nunca contada";

  const quanto = formatarQuantidade(contagem.anotado, unidadeBase);
  if (contagem.frescor === "NUNCA") return `${quanto} anotados, sem contagem`;

  const base = `${quanto} · ${rotuloDeIdade(contagem)}`;
  if (!projecao || projecao.fornadas === 0 || contagem.quantidade === null) {
    return base;
  }

  const fornadas =
    projecao.fornadas === 1
      ? "1 fornada desde então"
      : `${projecao.fornadas} fornadas desde então`;
  return `${base} · ${fornadas}, projetamos ${formatarQuantidade(projecao.disponivel, unidadeBase)}`;
}

/** O número que ela acabou de digitar, com a consequência dele. */
function consequencia(valor: number, linha: LinhaDeContagem): string {
  if (valor === 0) return "zero: conferido, e não tem";
  return `${formatarQuantidade(valor, linha.unidadeBase)}, contados hoje`;
}
