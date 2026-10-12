"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Check, ShoppingBasket, TriangleAlert } from "lucide-react";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  naBase,
  numeroContado,
  procedenciaDaSugestao,
  rotuloDeIdade,
  textoContado,
} from "@/lib/domain/estoque";
import type {
  LinhaDeContagem,
  OrigemDaEntrada,
  UnidadeDoCampo,
} from "@/lib/domain/estoque";
import type { ProjecaoDoInsumo } from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { useDesktop } from "@/lib/hooks/useDispositivo";
import type { UnidadeBase } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const POR_EXTENSO: Record<UnidadeBase, string> = {
  g: "gramas",
  ml: "mililitros",
  un: "unidades",
};

/**
 * As quatro colunas do desktop (`#d334`): material, última contagem,
 * projetamos e hoje. "Hoje" tem 13rem, e não os 9rem da spec: o "Igual" mais o
 * campo de 128px não cabem em 144px.
 */
export const COLUNAS_CONTAGEM = "lg:grid-cols-[minmax(0,1fr)_9rem_9rem_13rem]";

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
 * tem 128px, e "500 g · contada há 12 dias" quebraria em três linhas ali.
 *
 * A projeção do forno é referência, e **não semente**: um número herdado com
 * uma conta em cima continua sendo herdado (`#d59`), e semeá-lo seria o mesmo
 * erro com uma camada de aritmética por fora.
 *
 * O "Igual" (`#d330`) não contradiz isso: é um gesto dela, por linha, e só
 * aparece onde o número anotado ainda pode ser o da prateleira.
 *
 * **No desktop** (`#d334`), a mesma `<li>` vira grade: nome, última contagem,
 * projeção e campo lado a lado. Um campo só, para o Enter e o rascunho não
 * conhecerem duas linhas; o que muda de lugar é o texto em volta dele.
 */
export function LinhaContagem({
  linha,
  projecao,
  origem,
  texto,
  unidade,
  aoMudar,
  aoTrocarUnidade,
  aoIgual,
}: {
  linha: LinhaDeContagem;
  /** O que o forno levou desde a contagem desta linha. */
  projecao?: ProjecaoDoInsumo;
  /** De onde a semente veio. Ausente quando ela chegou por `/compras`. */
  origem?: OrigemDaEntrada;
  texto: string;
  /** Em que o campo está: embalagens ou a unidade base (`#d329`). */
  unidade: UnidadeDoCampo;
  aoMudar: (texto: string) => void;
  aoTrocarUnidade: () => void;
  aoIgual: () => void;
}) {
  const digitado = texto.trim().length > 0;
  const valor = numeroContado(texto);
  const ilegivel = digitado && valor === null;
  const contado = valor !== null;
  const emEmbalagem = unidade === "embalagem";

  // A procedência vale enquanto o campo ainda é o que a compra propôs. No
  // instante em que ela corrige o número, a frase passa a falar do número dela.
  const proposto =
    origem !== undefined &&
    linha.sugestao !== null &&
    !emEmbalagem &&
    texto === textoContado(linha.sugestao);
  const procedencia = proposto ? procedenciaDaSugestao(linha, origem) : null;
  // A frase do forno também pode quebrar: cortá-la esconderia a projeção, que
  // é a parte que ela veio conferir.
  const comForno = !!projecao && projecao.fornadas > 0;
  const atencao =
    linha.contagem.frescor === "VENCIDA" || linha.contagem.frescor === "NUNCA";

  // Com fornada desde a contagem, o número velho já não é o da prateleira, e o
  // atalho convidaria a confirmá-lo sem olhar.
  const igual =
    !digitado &&
    !comForno &&
    (linha.contagem.frescor === "FRESCA" ||
      linha.contagem.frescor === "ENVELHECENDO");
  const tamanho = formatarQuantidade(linha.tamanhoEmbalagem, linha.unidadeBase);
  const extenso = POR_EXTENSO[linha.unidadeBase];

  // No desktop (`#d334`) os números vão para as colunas, e embaixo do nome fica
  // só a palavra de atenção. O que o campo diz desce para baixo dele.
  const desktop = useDesktop();
  const id = `contagem-${linha.insumoId}`;
  const { contagem } = linha;
  const soPalavra = atencao && !contado && !ilegivel && !procedencia;
  const projetada = comForno && contagem.quantidade !== null;
  const estado = ilegivel
    ? "não deu para ler este número"
    : (procedencia ??
      (contado ? consequencia(valor, unidade, linha, true) : null));
  const descritores = desktop
    ? [
        soPalavra && `${id}-referencia`,
        contagem.anotado !== null && `${id}-ultima`,
        projetada && `${id}-projecao`,
        estado && `${id}-estado`,
      ]
        .filter(Boolean)
        .join(" ") || undefined
    : `${id}-referencia`;

  /** Em 360px o botão desce para a linha da referência, para o nome não sumir. */
  const botaoIgual = (className: string) => (
    <button
      type="button"
      onClick={aoIgual}
      aria-label={`Igual à última contagem: ${formatarQuantidade(
        linha.contagem.anotado ?? 0,
        linha.unidadeBase,
      )}`}
      className={classesBotao({
        variante: "terciaria",
        tamanho: "sm",
        className: cn("shrink-0", className),
      })}
    >
      Igual
    </button>
  );

  return (
    <li
      className={cn(
        "px-4 py-3 lg:grid lg:items-center lg:gap-x-6 lg:px-5",
        COLUNAS_CONTAGEM,
        contado && "bg-sunken",
      )}
    >
      {/* `lg:contents`: no desktop os filhos viram as células da grade. */}
      <div className="flex items-center gap-3 lg:contents">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="block truncate text-body font-medium text-ink"
          >
            {linha.nome}
          </label>

          <div className="flex items-center gap-2">
            <p
              id={`${id}-referencia`}
              className={cn(
                "num mt-0.5 flex min-w-0 flex-1 items-start gap-1.5 text-label",
                !soPalavra && "lg:hidden",
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
              ) : contado ? (
                !ilegivel && (
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-positive"
                    strokeWidth={2.5}
                  />
                )
              ) : (
                !ilegivel &&
                atencao && (
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-attention"
                    strokeWidth={2}
                  />
                )
              )}
              {/* A procedência pode quebrar em duas linhas: "620 g contados há 4
                dias + 1 kg da nota" não cabe em 360px, e cortá-la esconderia
                justamente a parcela que ela precisa conferir. Em embalagem,
                idem: a frase diz a conta inteira, e o resultado vem no fim. */}
              <span
                className={cn(
                  !procedencia &&
                    !comForno &&
                    !(contado && emEmbalagem) &&
                    "truncate",
                )}
              >
                {ilegivel
                  ? "não deu para ler este número"
                  : (procedencia ??
                    (contado
                      ? consequencia(valor, unidade, linha)
                      : referencia(linha, projecao)))}
              </span>
            </p>
            {igual && botaoIgual("min-[400px]:hidden")}
          </div>
        </div>

        {/* ---- desktop: as duas colunas que ela compara ---- */}
        <div id={`${id}-ultima`} className="num hidden text-right lg:block">
          <span className="sr-only">Última contagem, </span>
          {contagem.anotado !== null && (
            <>
              <p className="text-body text-ink">
                {formatarQuantidade(contagem.anotado, linha.unidadeBase)}
                <span className="sr-only">,</span>
              </p>
              <p className="text-label text-ink-muted">
                {contagem.frescor === "NUNCA" ? "anotados" : haQuanto(contagem)}
              </p>
            </>
          )}
        </div>
        <div id={`${id}-projecao`} className="num hidden text-right lg:block">
          {projetada && projecao && (
            <>
              <span className="sr-only">Projetamos, </span>
              <p className="text-body text-ink">
                {formatarQuantidade(projecao.disponivel, linha.unidadeBase)}
                <span className="sr-only">,</span>
              </p>
              <p className="text-label text-ink-muted">
                {projecao.fornadas === 1
                  ? "1 fornada"
                  : `${projecao.fornadas} fornadas`}
              </p>
            </>
          )}
        </div>

        {/* No celular `contents`, e nada muda; no desktop, a célula "Hoje". */}
        <div className="contents lg:block">
          <div className="contents lg:flex lg:items-center lg:justify-end lg:gap-2">
            {igual && botaoIgual("hidden min-[400px]:inline-flex")}

            <div className="relative w-32 shrink-0">
              <input
                id={id}
                data-contagem
                // Teclado numérico com vírgula, e não `type="number"`: a seta de
                // incremento não serve para contar despensa, e o teclado do celular
                // precisa oferecer a vírgula decimal.
                inputMode="decimal"
                enterKeyHint="next"
                autoComplete="off"
                placeholder="—"
                value={texto}
                aria-describedby={descritores}
                aria-invalid={ilegivel ? true : undefined}
                onChange={(evento) => aoMudar(evento.target.value)}
                onKeyDown={andarParaOProximo}
                className={cn(
                  BASE_CONTROLE,
                  "num pr-12 text-right font-semibold",
                  ilegivel ? "border-negative" : "border-line-strong",
                )}
              />
              {/* Comprado de um em um, as duas unidades seriam a mesma: sem botão. */}
              {linha.tamanhoEmbalagem > 1 ? (
                <button
                  type="button"
                  onClick={aoTrocarUnidade}
                  aria-label={
                    emEmbalagem
                      ? `Contando em embalagens de ${tamanho}. Contar em ${extenso}`
                      : `Contando em ${extenso}. Contar em embalagens de ${tamanho}`
                  }
                  className="toque absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-label font-medium text-brand-ink underline decoration-dotted underline-offset-4 hover:bg-brand-100"
                >
                  {emEmbalagem ? "emb" : linha.unidadeBase}
                </button>
              ) : (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-muted"
                >
                  {linha.unidadeBase}
                </span>
              )}
            </div>
          </div>
          {estado && (
            <p
              id={`${id}-estado`}
              className={cn(
                "num mt-1 hidden text-right text-label lg:block",
                ilegivel
                  ? "text-negative"
                  : procedencia
                    ? "text-ink-muted"
                    : "text-ink",
              )}
            >
              {estado}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * O "próximo" do teclado (`#d332`): Enter leva ao campo seguinte da tela, na
 * ordem do DOM, inclusive de um corredor para o outro. Só o que está na tela
 * existe no DOM, então o recorte já vale. No último, nada: salvar é o botão.
 */
export function andarParaOProximo(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key !== "Enter") return;
  evento.preventDefault();
  const campos = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[data-contagem]"),
  );
  const proximo = campos[campos.indexOf(evento.currentTarget) + 1];
  proximo?.focus();
  proximo?.select();
}

/**
 * O que está gravado hoje, com a idade — é a frase que explica por que a lista
 * de compras está comprando o que ela acha que já tem.
 *
 * Com fornada depois da contagem, a projeção abre a frase (`#d331`):
 * "projetamos 674 g · 1,2 kg contados há 5 dias, 2 fornadas depois". É o que a
 * deixa desconfiar sozinha de um número que o forno já mexeu.
 */
function referencia(
  linha: LinhaDeContagem,
  projecao: ProjecaoDoInsumo | undefined,
): ReactNode {
  const { contagem, unidadeBase } = linha;
  const quanto =
    contagem.anotado === null
      ? null
      : formatarQuantidade(contagem.anotado, unidadeBase);

  // Vencida e nunca contada são as que mais precisam de olho (`#d331`): a
  // palavra vem primeiro, em atenção, e o triângulo ao lado dela.
  if (contagem.frescor === "NUNCA" || contagem.frescor === "VENCIDA") {
    const nunca = contagem.frescor === "NUNCA";
    const resto = nunca
      ? quanto && `${quanto} anotados`
      : `${quanto} · ${rotuloDeIdade(contagem)}`;
    return (
      <>
        <span className="font-medium text-attention">
          {nunca ? "nunca contada" : "vencida"}
        </span>
        {/* No desktop o resto está nas colunas (`#d334`). */}
        {resto && <span className="lg:hidden"> · {resto}</span>}
      </>
    );
  }

  const base = `${quanto} · ${rotuloDeIdade(contagem)}`;
  if (!projecao || projecao.fornadas === 0 || contagem.quantidade === null) {
    return base;
  }

  // A projeção é o melhor palpite, e por isso vem primeiro.
  const fornadas =
    projecao.fornadas === 1 ? "1 fornada" : `${projecao.fornadas} fornadas`;
  return `projetamos ${formatarQuantidade(projecao.disponivel, unidadeBase)} · ${quanto} contados ${haQuanto(contagem)}, ${fornadas} depois`;
}

/** "há 15 dias", sem o "contada" de `rotuloDeIdade`: a coluna já diz o que é. */
export function haQuanto(contagem: LinhaDeContagem["contagem"]): string {
  if (contagem.frescor === "VENCIDA") return "há mais de um mês";
  const dias = contagem.idadeEmDias ?? 0;
  return dias === 0 ? "hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/**
 * O número que ela acabou de digitar, com a consequência dele. Em embalagem, a
 * conta inteira: "2,5 embalagens de 395 g = 987,5 g, contados hoje". `curta`
 * é a da célula de 13rem no desktop: "2,5 emb. = 987,5 g".
 */
function consequencia(
  valor: number,
  unidade: UnidadeDoCampo,
  linha: LinhaDeContagem,
  curta = false,
): string {
  if (valor === 0) return "zero: conferido, e não tem";

  const { contagem, unidadeBase, tamanhoEmbalagem } = linha;
  const base = naBase(valor, unidade, tamanhoEmbalagem);
  const quanto = formatarQuantidade(base, unidadeBase);
  const igualAUltima =
    contagem.frescor !== "NUNCA" && base === contagem.anotado;
  const fecho = igualAUltima
    ? "igual à última, conferido hoje"
    : "contados hoje";

  if (unidade === "base") return igualAUltima ? fecho : `${quanto}, ${fecho}`;

  const numero = valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  if (curta) return `${numero} emb. = ${quanto}`;
  const embalagens = `${numero} ${valor < 2 ? "embalagem" : "embalagens"}`;
  return `${embalagens} de ${formatarQuantidade(tamanhoEmbalagem, unidadeBase)} = ${quanto}, ${fecho}`;
}
