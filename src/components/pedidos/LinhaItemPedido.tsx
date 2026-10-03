"use client";

import { Children, useState, type ReactNode } from "react";
import { Minus, NotebookPen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { BASE_CONTROLE, Campo } from "@/components/ui/Campo";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import {
  formatarMoeda,
  formatarValor,
  parseParaNumero,
} from "@/lib/domain/money";
import { quantidadeEmTexto } from "@/lib/domain/pedido";
import { CLASSES_PASSO } from "./EscolhaDoCombo";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CLASSES_QUANTIDADE = cn(
  BASE_CONTROLE,
  "num w-16 text-right font-semibold border-line-strong",
);

/**
 * Uma linha do pedido: o produto, quantos, por quanto cada, e o que dá a linha.
 *
 * O preço ao lado da quantidade é o congelado, e não o da ficha de hoje. Quando
 * os dois divergem — e só enquanto o pedido é orçamento — a linha mostra o
 * preço de agora e oferece trocá-lo. O sistema mostra e oferece; quem
 * reprecifica é ela (`DECISOES.md#d21`).
 */
export function LinhaItemPedido({
  nome,
  detalhe,
  quantidade,
  precoUnitario,
  subtotal,
  precoDeHoje,
  nota,
  aoMudarNota,
  aoMudarQuantidade,
  aoUsarPrecoDeHoje,
  aoRemover,
  erro,
  children,
}: {
  nome: string;
  /** O que foi escolhido num combo, embaixo do nome. */
  detalhe?: string;
  quantidade: string;
  precoUnitario: Centavos;
  subtotal: Centavos;
  /** Só vem preenchido quando o selo deve aparecer. */
  precoDeHoje?: Centavos;
  /** A nota deste item, em `ItemPedido.observacao` (spec 078). */
  nota: string;
  aoMudarNota: (texto: string) => void;
  aoMudarQuantidade: (valor: string) => void;
  aoUsarPrecoDeHoje: () => void;
  aoRemover: () => void;
  erro?: string;
  /** O que a despensa diz sobre esta quantidade, embaixo da linha. */
  children?: ReactNode;
}) {
  const [anotando, setAnotando] = useState(false);
  const numero = parseParaNumero(quantidade);
  // O passo é 1, e o − para em 1: tirar a linha é a lixeira. "1,5" continua
  // valendo pelo campo, e o −/+ anda a partir dele.
  const passo = (delta: number) =>
    aoMudarQuantidade(quantidadeEmTexto(Math.max(1, numero + delta)));

  return (
    <li className="px-4 py-3 lg:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">{nome}</p>
          {detalhe && (
            <p className="mt-0.5 text-label text-ink-muted">{detalhe}</p>
          )}
          {nota && !anotando && (
            <button
              type="button"
              onClick={() => setAnotando(true)}
              aria-label={`Editar a nota: ${nota}`}
              className="toque -mx-2 block max-w-full rounded-md px-2 text-left text-label text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken"
            >
              {nota}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Tirar ${nome} do pedido`}
          className="toque -mr-2 -mt-2.5 flex shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-quart hover:bg-negative-soft hover:text-negative"
        >
          <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Daqui para baixo, a largura toda: a lixeira mora só na linha do
          nome, e a escolha do combo não perde a faixa da direita. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => passo(-1)}
            disabled={numero <= 1}
            aria-label={`Um ${nome} a menos`}
            className={CLASSES_PASSO}
          >
            <Minus aria-hidden className="size-4" strokeWidth={2} />
          </button>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantidade}
            onChange={(evento) => aoMudarQuantidade(evento.target.value)}
            aria-label={`Quantidade de ${nome}`}
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
          />
          <button
            type="button"
            onClick={() => passo(1)}
            aria-label={`Mais um ${nome}`}
            className={CLASSES_PASSO}
          >
            <Plus aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </div>
        <span className="num text-label text-ink-muted">
          × {formatarValor(precoUnitario)}
        </span>
        <span className="ml-auto text-right">
          <Dinheiro centavos={subtotal} />
        </span>
      </div>

      {precoDeHoje !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Selo
            tom="atencao"
            icone={<RefreshCw aria-hidden className="size-3.5" />}
          >
            Hoje este produto sai por {formatarMoeda(precoDeHoje)}
          </Selo>
          <button
            type="button"
            onClick={aoUsarPrecoDeHoje}
            className="toque -my-2 inline-flex items-center rounded-md px-2 text-label font-medium text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
          >
            Usar o preço de hoje
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-1.5 text-label text-negative">
          {erro}
        </p>
      )}

      {/* `toArray` descarta `false`: dois filhos condicionais e nenhum
              presente não podem abrir um espaço vazio. */}
      {Children.toArray(children).length > 0 && (
        <div className="mt-2 space-y-2">{children}</div>
      )}

      {anotando ? (
        <Campo
          rotulo="Nota deste item"
          className="mt-2"
          autoFocus
          enterKeyHint="done"
          placeholder="Escrever “Feliz 30 anos” em dourado"
          value={nota}
          onChange={(evento) => aoMudarNota(evento.target.value)}
          onBlur={() => setAnotando(false)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.currentTarget.blur();
          }}
        />
      ) : (
        !nota && (
          <Botao
            tamanho="sm"
            variante="terciaria"
            className="-ml-2 mt-1"
            onClick={() => setAnotando(true)}
            iconeInicial={
              <NotebookPen aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Anotar neste item
          </Botao>
        )
      )}
    </li>
  );
}
