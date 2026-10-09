"use client";

import {
  Check,
  ChevronRight,
  CookingPot,
  PackageOpen,
  Shield,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import { listarNomes } from "@/components/producao/FraseDaCapacidade";
import { Botao } from "@/components/ui/Botao";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { poucoAproveitado, soParaAReserva } from "@/lib/domain/listaCompras";
import { formatarMoeda } from "@/lib/domain/money";
import {
  formatarQuantidade,
  quantidadeParaOMercado,
} from "@/lib/domain/unidades";
import type {
  DataISO,
  Insumo,
  ItemListaCompras,
  UnidadeBase,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Uma linha do carrinho.
 *
 * A linha inteira é o alvo de marcar como comprado, porque a mão que usa isto
 * está empurrando um carrinho. O preço é o único alvo separado: abre o porquê
 * do item (`#d303`), com a conta, os pedidos, a reserva e o campo para corrigir
 * o preço. Na linha fica só o que vai pro carrinho e a frase de atenção.
 *
 * As duas quantidades aparecem juntas de propósito. `1 pacote de 1 kg` é a
 * verdade da gôndola, e é o que ela põe no carrinho; `falta 350 g` é a verdade
 * da receita, arredondada para cima (`#d300`), e é o que explica por que o
 * pacote está na lista.
 */
export function LinhaCompra({
  item,
  insumo,
  hoje,
  aoMarcar,
  aoAbrirPorque,
}: {
  item: ItemListaCompras;
  /** O cadastro de hoje: é dele que sai o tamanho do pacote. */
  insumo?: Insumo;
  hoje: DataISO;
  aoMarcar: (comprado: boolean) => void;
  aoAbrirPorque: () => void;
}) {
  const comprado = item.comprado;
  // O pacote é o que vai pro carrinho, e por isso é o dado forte da linha
  // (`#d300`); o tamanho dele fica em rótulo, ao lado.
  const pacotes = `${item.quantidadePacotes} ${item.quantidadePacotes === 1 ? "pacote" : "pacotes"}`;
  const tamanho = insumo
    ? `de ${insumo.quantidadeCompra.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${insumo.unidadeCompra}`
    : null;

  // Só a frase de atenção fica na linha (`#d303`): a idade, o forno e a
  // reserva moram no porquê. Do insumo **vivo**, e não da linha gravada.
  const contagem = fraseDaContagem(insumo, item.unidadeBase, hoje);
  const atencao = contagem?.ignorada ? contagem.frase : null;
  const { pacote, reserva } = frasesDoPacote(item, insumo);

  return (
    // Marcar muda a linha de seção: ela chega pela opacidade, sem animar a
    // posição (`#d300`).
    <li
      className={cn(
        "transition-opacity duration-200 ease-quart starting:opacity-0",
        comprado && "bg-sunken",
      )}
    >
      <div className="flex items-stretch">
        {/* `min-w-0`: sem ele, o `truncate` de dentro faz a largura mínima do
            botão ser a da frase inteira, e o preço sai da tela no celular. */}
        <button
          type="button"
          aria-pressed={comprado}
          onClick={() => aoMarcar(!comprado)}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
        >
          {/* O círculo marcado carrega o traço do visto: a cor sozinha nunca
              decide. Em tinta, e não em `brand-700`: no escuro o cromo some
              sobre a superfície, e a tinta inverte. */}
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
              "transition-colors duration-150 ease-quart",
              comprado
                ? "border-brand-ink bg-brand-ink text-surface"
                : "border-line-strong",
            )}
          >
            {comprado && <Check className="size-4" strokeWidth={3} />}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-body font-medium",
                comprado ? "text-ink-muted line-through" : "text-ink",
              )}
            >
              {item.nome}
            </span>
            <span className="num mt-0.5 line-clamp-2 text-label text-ink-muted">
              <span
                className={cn(
                  "text-body font-semibold",
                  comprado ? "text-ink-muted" : "text-ink",
                )}
              >
                {pacotes}
              </span>
              {tamanho && <> {tamanho}</>}
              <span className="mx-1.5 text-ink-subtle">·</span>
              falta{" "}
              {quantidadeParaOMercado(item.quantidadeComprar, item.unidadeBase)}
            </span>

            {/* A contagem que a lista ignorou: é o que explica um carrinho
                maior, e é a única frase que fica na linha. */}
            {atencao && (
              <Frase icone={TriangleAlert} atencao>
                {atencao}
              </Frase>
            )}
            {/* Informativas (`#d304`): a decisão de levar é dela, e estas
                dizem só o que a conta esconde. */}
            {pacote && <Frase icone={PackageOpen}>{pacote}</Frase>}
            {reserva && <Frase icone={Shield}>{reserva}</Frase>}
          </span>
        </button>

        <button
          type="button"
          onClick={aoAbrirPorque}
          aria-haspopup="dialog"
          aria-label={`Por que ${item.nome}: ${formatarMoeda(item.custoEstimado)}. A conta, de onde vem e o preço.`}
          className="flex shrink-0 items-center gap-1 border-l border-line pl-4 pr-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:pl-5 lg:pr-4"
        >
          <span
            className={cn(
              "num text-body font-semibold",
              comprado ? "text-ink-muted" : "text-ink",
            )}
          >
            {formatarMoeda(item.custoEstimado)}
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </button>
      </div>
    </li>
  );
}

/**
 * As duas frases do pacote contra a falta (`#d304`), só quando verdadeiras.
 * Do insumo vivo, como o tamanho do pacote: sem ele, nenhuma.
 */
function frasesDoPacote(
  item: ItemListaCompras,
  insumo: Insumo | undefined,
): { pacote: string | null; reserva: string | null } {
  if (!insumo) return { pacote: null, reserva: null };

  const falta = quantidadeParaOMercado(
    item.quantidadeComprar,
    item.unidadeBase,
  );
  const pacote = poucoAproveitado(item, insumo.quantidadeBase)
    ? `${falta.startsWith("1 ") ? "Falta" : "Faltam"} ${falta}; o pacote tem ${insumo.quantidadeCompra.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${insumo.unidadeCompra}.`
    : null;

  const temPedido =
    item.quantidadeNecessaria - (item.quantidadeDeReserva ?? 0) > 1e-6;
  const reserva = soParaAReserva(item, insumo.perdaPercentual)
    ? temPedido
      ? "Os pedidos estão cobertos: falta só para a reserva."
      : "Falta só para a reserva."
    : null;

  return { pacote, reserva };
}

/**
 * O que ela deixou para a próxima (`#d304`): sem marcar, sem porquê, só o que
 * era e o "Levar" que desfaz.
 */
export function LinhaPulada({
  item,
  insumo,
  aoLevar,
}: {
  item: ItemListaCompras;
  insumo?: Insumo;
  aoLevar: () => void;
}) {
  const n = item.quantidadePacotes;
  const tamanho = insumo
    ? ` de ${insumo.quantidadeCompra.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${insumo.unidadeCompra}`
    : "";

  return (
    <li className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-opacity duration-200 ease-quart starting:opacity-0 lg:px-5">
      <span className="min-w-0">
        <span className="block truncate text-body text-ink">{item.nome}</span>
        <span className="num mt-0.5 block text-label text-ink-muted">
          {n} {n === 1 ? "pacote" : "pacotes"}
          {tamanho}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {formatarMoeda(item.custoEstimado)}
        </span>
      </span>
      <Botao
        tamanho="sm"
        className="shrink-0"
        onClick={aoLevar}
        aria-label={`Levar ${item.nome}`}
      >
        Levar
      </Botao>
    </li>
  );
}

/** Quem pede a reserva deste insumo, das fichas vivas. */
type ReservaPara = { nome: string; fornadas: number }[];

/**
 * Uma frase de baixo da linha: a contagem ignorada no carrinho; contagem,
 * forno ou reserva em "você já tem em casa".
 *
 * Texto que ela lê, então `--ink-muted`; o ícone fica em `--ink-subtle`, que
 * não é cor de texto (`DESIGN.md`). Quebra em até duas linhas em vez de cortar
 * no meio da palavra.
 */
function Frase({
  icone: Icone,
  atencao = false,
  className,
  children,
}: {
  icone?: LucideIcon;
  /** A contagem que a lista ignorou: ocre, e sempre com o triângulo. */
  atencao?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "num mt-1 flex items-start gap-1.5 text-micro",
        atencao ? "text-attention" : "text-ink-muted",
        className,
      )}
    >
      {Icone && (
        <Icone
          aria-hidden
          className={cn(
            "mt-0.5 size-3 shrink-0",
            !atencao && "text-ink-subtle",
          )}
          strokeWidth={2}
        />
      )}
      <span className="line-clamp-2">{children}</span>
    </span>
  );
}

/**
 * O que a lista fez com a contagem, quando há algo a dizer.
 *
 * Quatro estados, três frases. `FRESCA` cala: a contagem foi usada, o desconto
 * aconteceu, e anunciar isso seria ruído em toda linha da tela. `ENVELHECENDO`
 * diz a idade sem alarme — uma contagem de doze dias ainda é a melhor
 * informação que existe sobre aquele armário. `VENCIDA` e `NUNCA` dizem que o
 * número **não** foi descontado, que é a explicação do carrinho maior, e vêm com
 * ícone: a cor nunca é o único portador de significado.
 *
 * Sem número anotado não há frase: dizer "nunca contada" em um insumo que nunca
 * teve estoque nenhum é dizer o óbvio em vinte linhas de uma vez, e a frase do
 * topo já conta quantos são.
 */
export function fraseDaContagem(
  insumo: Insumo | undefined,
  unidadeBase: UnidadeBase,
  hoje: DataISO,
): { frase: string; ignorada: boolean } | null {
  if (!insumo) return null;

  const contagem = contagemDoInsumo(insumo, hoje);
  if (contagem.frescor === "FRESCA") return null;

  if (contagem.frescor === "ENVELHECENDO") {
    return {
      frase: `${formatarQuantidade(contagem.quantidade ?? 0, unidadeBase)} · ${rotuloDeIdade(contagem)}`,
      ignorada: false,
    };
  }

  if (contagem.anotado === null) return null;

  const quanto = formatarQuantidade(contagem.anotado, unidadeBase);
  return {
    frase:
      contagem.frescor === "VENCIDA"
        ? `${quanto} anotados, mas a contagem passou de um mês: não descontamos`
        : `${quanto} anotados, sem contagem: não descontamos`,
    ignorada: true,
  };
}

/**
 * O que a lista descontou por causa da massa, quando descontou alguma coisa.
 *
 * Duas parcelas, as duas gravadas na linha (`#d87`, `#d91`): o que já virou
 * massa para os pedidos desta lista, que saiu da demanda; e o que foi para a
 * massa desde a contagem, que saiu do que ela tem. A segunda só vale a frase
 * quando havia contagem de que descontar — contagem vencida já diz "não
 * descontamos", e um consumo em cima de nada seria ruído.
 */
function fraseDoForno(item: ItemListaCompras): string | null {
  const produzida = item.quantidadeJaProduzida ?? 0;
  const consumo = item.consumoDeFornadas ?? 0;
  const quanto = (valor: number) => formatarQuantidade(valor, item.unidadeBase);

  const partes: string[] = [];
  if (produzida > 0) {
    partes.push(`${quanto(produzida)} já viraram massa para o pedido`);
  }
  if (consumo > 0 && item.estoqueAtual > 0) {
    partes.push(`${quanto(consumo)} foram para a massa desde a contagem`);
  }

  return partes.length > 0 ? partes.join(" · ") : null;
}

/**
 * De onde veio a quantidade, quando parte dela é reserva e não pedido.
 *
 * "300 g para os pedidos · 500 g para manter 1 fornada de Cookie de reserva".
 * A quantidade é a gravada na linha (`#d96`); os nomes vêm das fichas vivas,
 * pelo mesmo motivo de o tamanho do pacote vir do insumo vivo. Sem reserva,
 * nada a dizer: a linha inteira é pedido, como sempre foi.
 */
function fraseDaReserva(
  item: ItemListaCompras,
  reservaPara: ReservaPara | undefined,
): string | null {
  const daReserva = item.quantidadeDeReserva ?? 0;
  if (!(daReserva > 0)) return null;

  const quanto = (valor: number) => formatarQuantidade(valor, item.unidadeBase);
  const dosPedidos = item.quantidadeNecessaria - daReserva;
  const quem =
    reservaPara && reservaPara.length > 0
      ? listarNomes(
          reservaPara.map(
            (ficha) =>
              `${ficha.fornadas} ${ficha.fornadas === 1 ? "fornada" : "fornadas"} de ${ficha.nome}`,
          ),
        )
      : "a fornada";

  const partes: string[] = [];
  if (dosPedidos > 1e-6) partes.push(`${quanto(dosPedidos)} para os pedidos`);
  partes.push(`${quanto(daReserva)} para manter ${quem} de reserva`);
  return partes.join(" · ");
}

/**
 * O que a contagem já cobre.
 *
 * Fica em bloco próprio, no fim, e **não some**: sumir com o item seria pedir
 * que ela confira de cabeça se esqueceu alguma coisa. Sem alvo de toque, porque
 * não há o que marcar — ela não vai comprar isto hoje.
 *
 * A idade vem junto do número, e do insumo vivo: "você tem 50 un" sem dizer
 * desde quando é a mesma promessa que esta spec existe para desfazer. Este bloco
 * só tem linha quando alguma contagem valeu — uma contagem vencida não cobre
 * nada, e o item vai para o carrinho.
 */
export function LinhaJaTem({
  item,
  insumo,
  reservaPara,
  hoje,
}: {
  item: ItemListaCompras;
  insumo?: Insumo;
  reservaPara?: ReservaPara;
  hoje: DataISO;
}) {
  const idade = insumo ? rotuloDeIdade(contagemDoInsumo(insumo, hoje)) : null;
  const forno = fraseDoForno(item);
  const reserva = fraseDaReserva(item, reservaPara);
  // O que ela tem é a projeção: a contagem menos o que o forno levou depois.
  const tem = Math.max(0, item.estoqueAtual - (item.consumoDeFornadas ?? 0));
  const produzida = item.quantidadeJaProduzida ?? 0;

  return (
    <li className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 lg:px-5">
      <p className="min-w-0 truncate text-body text-ink">{item.nome}</p>
      <p className="num min-w-0 text-label text-ink-muted">
        {/* Coberto só pela fornada: "você tem 0 g" seria verdade e ruído. */}
        {produzida > 0 && tem === 0 ? (
          "já virou massa para o pedido"
        ) : (
          <>
            precisa de{" "}
            {formatarQuantidade(item.quantidadeNecessaria, item.unidadeBase)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            você tem {formatarQuantidade(tem, item.unidadeBase)}
            {idade && (
              <>
                <span className="mx-1.5 text-ink-subtle">·</span>
                {idade}
              </>
            )}
          </>
        )}
      </p>
      {forno && (
        <Frase icone={CookingPot} className="mt-0 basis-full">
          {forno}
        </Frase>
      )}
      {reserva && (
        <Frase icone={Shield} className="mt-0 basis-full">
          {reserva}
        </Frase>
      )}
    </li>
  );
}
