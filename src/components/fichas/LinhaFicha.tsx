"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import {
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";
import {
  FraseDaCapacidade,
  FraseDoPronto,
} from "@/components/producao/FraseDaCapacidade";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import {
  kitDividido,
  sobraMudouDeVerdade,
  type CustoDeHoje,
} from "@/lib/domain/custoFicha";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import type {
  CapacidadeDaFicha,
  ProjecaoDoPronto,
} from "@/lib/domain/producao";
import type { Centavos, FichaTecnica, ResumoProduto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * As seis colunas da tabela (`#d228`). `minmax(0, …)` deixa a célula quebrar
 * em vez de empurrar a tabela para fora; o `grid` vem do `lg:` ou do `xl:`,
 * conforme o painel (`#d225`).
 */
export const COLUNAS_FICHA =
  "grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.3fr)]";

/** O `lg:` do Tailwind, para o clique decidir entre o painel e o editor. */
const DESKTOP = "(min-width: 64rem)";

/** "sobram" ou "perde", conforme o sinal (`#d136`). */
export function palavraSobra(centavos: Centavos): "sobram" | "perde" {
  return centavos < 0 ? "perde" : "sobram";
}

const PASSADO: Record<ReturnType<typeof palavraSobra>, string> = {
  sobram: "sobravam",
  perde: "perdia",
};

/**
 * "sobram R$ 1,80 → R$ 0,90" quando o gravado e o de hoje ficam do mesmo lado
 * do zero; "sobram R$ 0,07 → perde R$ 0,43" quando cruza — a segunda palavra
 * só aparece quando o sinal muda.
 */
export function fraseSetaSobra(gravado: Centavos, hoje: Centavos): string {
  const palavraHoje = palavraSobra(hoje);
  const segunda =
    palavraHoje === palavraSobra(gravado) ? "" : `${palavraHoje} `;
  return `${palavraSobra(gravado)} ${formatarMoeda(Math.abs(gravado))} → ${segunda}${formatarMoeda(Math.abs(hoje))}`;
}

/** A mesma frase, para quem ouve: o gravado no passado, o de hoje no presente. */
function fraseSetaSobraLeitorDeTela(gravado: Centavos, hoje: Centavos): string {
  return `${PASSADO[palavraSobra(gravado)]} ${formatarMoeda(Math.abs(gravado))}, hoje ${palavraSobra(hoje)} ${formatarMoeda(Math.abs(hoje))}`;
}

/** O sinal de menos é para quem vê: o leitor de tela ouve a palavra. */
function Sinal({ negativo }: { negativo: boolean }) {
  return negativo ? <span aria-hidden>−</span> : null;
}

/** A célula sem venda no mês: um traço para quem vê, a frase para quem ouve. */
function SemVenda() {
  return (
    <>
      <span aria-hidden className="font-normal text-ink-subtle">
        —
      </span>
      <span className="sr-only">sem venda no mês</span>
    </>
  );
}

/**
 * Uma ficha na lista: nome, o que ela custa, o que ela deixa por unidade e o
 * que deixou no mês.
 *
 * O preço sozinho não informa, então ele nunca aparece sozinho: ao lado dele
 * vem o que sobra por unidade e, com venda no mês, quanto o produto deixou,
 * que é o que diz qual produto a sustenta (`#d228`).
 *
 * Dois arranjos no mesmo `<li>`, e o `display: none` tira o oculto da árvore de
 * acessibilidade: o leitor de tela ouve um só.
 *
 * **No celular**, andares, e não colunas. Em cima, nome e preço; no meio,
 * custo e sobra, a sobra em `label` 600, nunca em `micro`; embaixo, com venda
 * no mês, quanto vendeu e quanto deixou; por último, o que está pronto e
 * quantas fornadas dá, na forma curta (`#d231`).
 *
 * **No desktop**, a linha da tabela, e o clique abre o painel ao lado da lista
 * em vez de sair dela (`#d130`). Com o painel aberto, a tabela espera o `xl`
 * (`comPainel`, `#d225`). Botão do meio, Ctrl+clique e menu de contexto
 * continuam abrindo o editor, como em todo link.
 */
export function LinhaFicha({
  ficha,
  capacidade,
  pronto,
  hoje,
  venda,
  selecionada = false,
  comPainel = false,
  aoSelecionar,
}: {
  ficha: FichaTecnica;
  /** `null` quando não há pergunta: ficha sem insumo ou sem rendimento. */
  capacidade?: CapacidadeDaFicha | null;
  /** O que está pronto, e quanto disso já é de pedido aberto (13D). */
  pronto?: { pronto: ProjecaoDoPronto; reservado: number };
  /** O custo e a sobra se ela salvasse agora, com os materiais de hoje (`#d135`). */
  hoje?: CustoDeHoje;
  /** A venda do mês corrente, do `ResumoMensal`; `null` sem venda (`#d228`). */
  venda?: ResumoProduto | null;
  /** A linha cujo produto está no painel ao lado. Só no desktop. */
  selecionada?: boolean;
  /** O painel está aberto: entre `lg` e `xl`, a linha é a do celular. */
  comPainel?: boolean;
  /** No desktop, o clique simples abre o painel em vez de navegar. */
  aoSelecionar?: () => void;
}) {
  const p = ficha.precificacao;
  const lucro = p.lucroUnitario;
  const sobraAtual = hoje?.sobra ?? lucro;
  const noPrejuizo = sobraAtual < 0;
  // A seta só quando a diferença vale uma olhada (`#d230`); abaixo disso, a
  // sobra de hoje sem seta, e o selo de custo desatualizado continua dizendo.
  const mudouHoje =
    hoje !== undefined && sobraMudouDeVerdade(lucro, hoje.sobra, p.precoVenda);
  // A margem gravada; com a seta, a de hoje, para não contradizer o número.
  const margem =
    mudouHoje && p.precoVenda > 0
      ? (sobraAtual / p.precoVenda) * 100
      : p.margemReal;
  const rotuloMargem = formatarPercentual(Math.abs(margem), 0);
  const perdeuNoMes = (venda?.lucro ?? 0) < 0;
  const temProducao =
    !!pronto || !!capacidade || kitDividido(ficha) || ficha.custoDesatualizado;

  function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    if (
      !aoSelecionar ||
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey ||
      !window.matchMedia(DESKTOP).matches
    ) {
      return;
    }
    evento.preventDefault();
    aoSelecionar();
  }

  const seloKit = ficha.tipo === "KIT" && <Selo tom="neutro">Kit</Selo>;
  const selos = (
    <>
      {/* O custo da caixa dividido pelo que vai dentro (`#d227`). */}
      {kitDividido(ficha) && (
        <Selo
          tom="atencao"
          icone={<TriangleAlert aria-hidden className="size-3.5" />}
        >
          Confira o kit
        </Selo>
      )}
      {ficha.custoDesatualizado && (
        <Selo
          tom="atencao"
          icone={<RefreshCw aria-hidden className="size-3.5" />}
        >
          Custo desatualizado
        </Selo>
      )}
    </>
  );

  // A forma curta, uma linha só (`#d231`): a idade da contagem, as unidades
  // e o "acaba primeiro" moram no painel, e a falta, na faixa acima da lista.
  const producao = (
    <>
      {pronto && (
        <FraseDoPronto
          projecao={pronto.pronto}
          unidade={ficha.unidadeRendimento}
          reservado={pronto.reservado}
          curta
        />
      )}
      {capacidade && <FraseDaCapacidade capacidade={capacidade} curta />}
    </>
  );

  // No prejuízo o ícone acompanha a cor: a cor sozinha nunca decide.
  const icone = noPrejuizo && (
    <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
  );
  const iconeDoMes = perdeuNoMes && (
    <TrendingDown aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
  );
  // Só existe quando a seta existe: sem mudança, o texto visível já se lê sozinho.
  const leitorDeTela = mudouHoje
    ? fraseSetaSobraLeitorDeTela(lucro, sobraAtual)
    : null;
  const deixouNoMes = venda
    ? `${perdeuNoMes ? "perdeu" : "deixou"} ${formatarMoeda(Math.abs(venda.lucro))}`
    : null;

  return (
    <li>
      <Link
        href={`/fichas/${ficha.id}`}
        onClick={aoClicar}
        aria-current={selecionada ? "true" : undefined}
        className={cn(
          "block transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
          selecionada && "bg-sunken",
        )}
      >
        {/* ---- celular, e o desktop estreito com o painel aberto ---- */}
        <div className={cn("px-4 py-3", comPainel ? "xl:hidden" : "lg:hidden")}>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <p className="min-w-0 truncate text-body font-medium text-ink">
                {ficha.nome}
              </p>
              {seloKit}
            </div>
            <Dinheiro centavos={p.precoVenda} />
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          </div>

          <p className="num mt-0.5 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
            <span>custa {formatarMoeda(ficha.custoUnitario)}</span>
            <span aria-hidden className="text-ink-subtle">
              ·
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                noPrejuizo ? "text-negative" : "text-ink",
              )}
            >
              {icone}
              {mudouHoje ? (
                <>
                  <span className="sr-only">{leitorDeTela}</span>
                  <span aria-hidden>{fraseSetaSobra(lucro, sobraAtual)}</span>
                </>
              ) : (
                `${palavraSobra(sobraAtual)} ${formatarMoeda(Math.abs(sobraAtual))}`
              )}
            </span>
            {p.precoVenda > 0 && <span>({rotuloMargem})</span>}
          </p>

          {venda && (
            <p className="num mt-0.5 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
              <span>vendeu {venda.quantidade}</span>
              <span aria-hidden className="text-ink-subtle">
                ·
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  perdeuNoMes && "text-negative",
                )}
              >
                {iconeDoMes}
                {deixouNoMes}
              </span>
              <span className="sr-only">no mês</span>
            </p>
          )}

          {temProducao && (
            <div className="mt-2 flex flex-wrap items-start gap-x-5 gap-y-1">
              {producao}
              {selos}
            </div>
          )}
        </div>

        {/* ---- desktop: a linha da tabela ---- */}
        <div
          className={cn(
            "hidden items-center gap-x-4 px-4 py-3",
            comPainel ? "xl:grid" : "lg:grid",
            COLUNAS_FICHA,
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 truncate text-body font-semibold text-ink">
                {ficha.nome}
              </p>
              {seloKit}
              {selos}
            </div>
            {(pronto || capacidade) && (
              <div className="mt-1 flex min-w-0 gap-x-3 overflow-hidden">
                {producao}
              </div>
            )}
          </div>

          <p className="num text-right text-body text-ink">
            <span className="sr-only">custa </span>
            {formatarMoeda(ficha.custoUnitario)}
          </p>

          <div className="text-right">
            <p className="num text-body font-semibold text-ink">
              <span className="sr-only">preço </span>
              {formatarMoeda(p.precoVenda)}
            </p>
            {/* Só a exceção: acima do sugerido, silêncio. */}
            {p.precoVenda < p.precoSugerido && (
              <p className="num mt-0.5 flex items-center justify-end gap-1 text-label text-attention">
                <TriangleAlert
                  aria-hidden
                  className="size-3.5 shrink-0"
                  strokeWidth={2}
                />
                sugerido {formatarMoeda(p.precoSugerido)}
              </p>
            )}
          </div>

          <div className="text-right">
            <p
              className={cn(
                "num flex flex-wrap items-center justify-end gap-1 text-body font-semibold",
                noPrejuizo ? "text-negative" : "text-ink",
              )}
            >
              <span className="sr-only">
                {leitorDeTela ?? `${palavraSobra(sobraAtual)} `}
              </span>
              {/* O gravado, só quando a seta vale: número menor, sem peso. */}
              {mudouHoje && (
                <>
                  <span aria-hidden className="font-normal text-ink-muted">
                    <Sinal negativo={lucro < 0} />
                    {formatarMoeda(Math.abs(lucro))}
                  </span>
                  <span aria-hidden className="text-ink-subtle">
                    →
                  </span>
                </>
              )}
              {icone}
              <Sinal negativo={noPrejuizo} />
              <span aria-hidden={mudouHoje || undefined}>
                {formatarMoeda(Math.abs(sobraAtual))}
              </span>
            </p>
            {/* Percentual sempre com os reais em cima (`DESIGN.md`). */}
            {p.precoVenda > 0 && (
              <p className="num mt-0.5 text-label text-ink-muted">
                <Sinal negativo={margem < 0} />
                {rotuloMargem}
                <span className="sr-only"> do preço</span>
              </p>
            )}
          </div>

          <p className="num text-right text-body text-ink">
            {venda ? (
              <>
                <span className="sr-only">vendeu </span>
                {venda.quantidade}
                <span className="sr-only"> no mês</span>
              </>
            ) : (
              <SemVenda />
            )}
          </p>

          <p
            className={cn(
              "num flex items-center justify-end gap-1 text-body font-semibold",
              perdeuNoMes ? "text-negative" : "text-ink",
            )}
          >
            {venda ? (
              <>
                <span className="sr-only">{deixouNoMes} no mês</span>
                {iconeDoMes}
                <span aria-hidden>
                  <Sinal negativo={perdeuNoMes} />
                  {formatarMoeda(Math.abs(venda.lucro))}
                </span>
              </>
            ) : (
              <SemVenda />
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}
