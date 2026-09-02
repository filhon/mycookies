"use client";

import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { formatarMoeda } from "@/lib/domain/money";
import { rotuloDeCompra } from "@/lib/domain/listaCompras";
import { formatarQuantidade } from "@/lib/domain/unidades";
import type { Centavos, Insumo, ItemListaCompras } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Uma linha do carrinho.
 *
 * A linha inteira é o alvo de marcar como comprado, porque a mão que usa isto
 * está empurrando um carrinho. O preço é o único alvo separado, e é separado
 * porque é a segunda coisa que ela faz no mercado: corrigir o que o insumo
 * custa de verdade hoje.
 *
 * As duas quantidades aparecem juntas de propósito. `1 pacote de 1 kg` é a
 * verdade da gôndola, e é o que ela põe no carrinho; `342,11 g em falta` é a
 * verdade da receita, e é o que explica por que o pacote está na lista.
 */
export function LinhaCompra({
  item,
  insumo,
  aoMarcar,
  aoCorrigirPreco,
}: {
  item: ItemListaCompras;
  /** O cadastro de hoje: é dele que saem o tamanho do pacote e o preço. */
  insumo?: Insumo;
  aoMarcar: (comprado: boolean) => void;
  aoCorrigirPreco: (insumo: Insumo, precoCompra: Centavos) => void;
}) {
  const [editando, setEditando] = useState(false);

  const comprado = item.comprado;
  const embalagem = insumo
    ? rotuloDeCompra(
        item.quantidadePacotes,
        insumo.quantidadeCompra,
        insumo.unidadeCompra,
      )
    : `${item.quantidadePacotes} ${item.quantidadePacotes === 1 ? "pacote" : "pacotes"}`;

  return (
    <li className={cn(comprado && "bg-sunken")}>
      <div className="flex items-stretch">
        <button
          type="button"
          aria-pressed={comprado}
          onClick={() => aoMarcar(!comprado)}
          className="flex min-h-16 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
        >
          {/* O círculo marcado carrega o traço do visto: a cor sozinha nunca
              decide, e o vinho da marca é vizinho do vermelho de erro. */}
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
              "transition-colors duration-150 ease-quart",
              comprado
                ? "border-wine-700 bg-wine-700 text-on-wine"
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
            <span className="num mt-0.5 block truncate text-label text-ink-muted">
              {embalagem}
              <span className="mx-1.5 text-ink-subtle">·</span>
              {formatarQuantidade(item.quantidadeComprar, item.unidadeBase)} em
              falta
            </span>
          </span>
        </button>

        {insumo ? (
          <button
            type="button"
            onClick={() => setEditando((aberto) => !aberto)}
            aria-expanded={editando}
            aria-label={`Corrigir o preço de ${item.nome}, hoje ${formatarMoeda(insumo.precoCompra)} o pacote`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-l border-line px-4 transition-colors duration-150 ease-quart",
              "hover:bg-sunken active:bg-sunken lg:px-5",
              editando && "bg-sunken",
            )}
          >
            <span
              className={cn(
                "num text-body font-semibold",
                comprado ? "text-ink-muted" : "text-ink",
              )}
            >
              {formatarMoeda(item.custoEstimado)}
            </span>
            <Pencil
              aria-hidden
              className="size-3.5 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          </button>
        ) : (
          <span className="num flex shrink-0 items-center border-l border-line px-4 text-body font-semibold text-ink-muted lg:px-5">
            {formatarMoeda(item.custoEstimado)}
          </span>
        )}
      </div>

      {editando && insumo && (
        <EditorDePreco
          insumo={insumo}
          pacotes={item.quantidadePacotes}
          aoSalvar={(preco) => {
            aoCorrigirPreco(insumo, preco);
            setEditando(false);
          }}
          aoFechar={() => setEditando(false)}
        />
      )}
    </li>
  );
}

/**
 * O preço corrigido na frente da gôndola.
 *
 * Abre dentro da própria linha, e não em painel: ela está com uma mão no
 * carrinho, e o nome do insumo precisa continuar visível enquanto ela digita o
 * que a etiqueta da prateleira diz.
 *
 * A frase embaixo do campo é a consequência do número, como em toda tela deste
 * sistema: corrigir aqui muda o custo de todas as fichas que usam o insumo, e
 * elas ganham o selo de custo desatualizado.
 */
function EditorDePreco({
  insumo,
  pacotes,
  aoSalvar,
  aoFechar,
}: {
  insumo: Insumo;
  pacotes: number;
  aoSalvar: (precoCompra: Centavos) => void;
  aoFechar: () => void;
}) {
  const [preco, setPreco] = useState(insumo.precoCompra);
  const embalagem = `${insumo.quantidadeCompra.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })} ${insumo.unidadeCompra}`;

  return (
    <div className="border-t border-line bg-sunken px-4 py-4 lg:px-5">
      <CampoMoeda
        rotulo={`Preço do pacote de ${embalagem}`}
        valor={preco}
        aoMudar={setPreco}
        dica={
          pacotes > 1
            ? `${pacotes} pacotes na lista: ${formatarMoeda(pacotes * preco)} no total.`
            : "O que a etiqueta da prateleira está pedindo hoje."
        }
      />

      <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
        Salvar corrige o insumo e marca as fichas que usam {insumo.nome} como
        custo desatualizado, para você não dar preço com número velho.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Botao tamanho="sm" variante="primaria" onClick={() => aoSalvar(preco)}>
          Salvar preço
        </Botao>
        <Botao tamanho="sm" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </div>
  );
}

/**
 * O que o estoque já cobre.
 *
 * Fica em bloco próprio, no fim, e **não some**: sumir com o item seria pedir
 * que ela confira de cabeça se esqueceu alguma coisa. Sem alvo de toque, porque
 * não há o que marcar — ela não vai comprar isto hoje.
 */
export function LinhaJaTem({ item }: { item: ItemListaCompras }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 lg:px-5">
      <p className="min-w-0 truncate text-body text-ink">{item.nome}</p>
      <p className="num shrink-0 text-label text-ink-muted">
        precisa de{" "}
        {formatarQuantidade(item.quantidadeNecessaria, item.unidadeBase)}
        <span className="mx-1.5 text-ink-subtle">·</span>
        você tem {formatarQuantidade(item.estoqueAtual, item.unidadeBase)}
      </p>
    </li>
  );
}
