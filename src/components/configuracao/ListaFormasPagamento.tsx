"use client";

import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  EyeOff,
  Plus,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import {
  liquidoRecebido,
  textoPrazo,
  VENDA_EXEMPLO,
} from "@/lib/domain/custosOperacionais";
import type { FormaPagamento, TipoPagamento } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ICONE_TIPO: Record<TipoPagamento, LucideIcon> = {
  PIX: Smartphone,
  DINHEIRO: Banknote,
  DEBITO: CreditCard,
  CREDITO: CreditCard,
  CREDITO_PARCELADO: CreditCard,
  TRANSFERENCIA: ArrowLeftRight,
};

function textoTaxa(forma: FormaPagamento): string {
  if (forma.taxaPercentual === 0 && forma.taxaFixa === 0) return "sem taxa";
  const percentual = forma.taxaPercentual.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
  const fixa =
    forma.taxaFixa > 0
      ? ` mais R$ ${(forma.taxaFixa / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "";
  return `${percentual}%${fixa}`;
}

function LinhaForma({
  forma,
  aoAbrir,
}: {
  forma: FormaPagamento;
  aoAbrir: (forma: FormaPagamento) => void;
}) {
  const Icone = ICONE_TIPO[forma.tipo];
  const liquido = liquidoRecebido(VENDA_EXEMPLO, forma);

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(forma)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          "min-h-14 transition-colors duration-150 ease-quart hover:bg-sunken",
        )}
      >
        <Icone
          aria-hidden
          className={cn(
            "size-5 shrink-0",
            forma.ativo ? "text-ink-muted" : "text-ink-subtle",
          )}
          strokeWidth={1.75}
        />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "truncate text-body font-medium",
                forma.ativo ? "text-ink" : "text-ink-muted",
              )}
            >
              {forma.nome}
            </span>
            {!forma.ativo && (
              <Selo
                icone={<EyeOff aria-hidden className="size-3.5" />}
                tom="neutro"
              >
                Desativada
              </Selo>
            )}
          </span>
          <span className="mt-0.5 block text-label text-ink-muted">
            {textoTaxa(forma)} · {textoPrazo(forma.prazoRecebimentoDias)}
          </span>
        </span>

        {/* A consequência da taxa, em dinheiro, na própria linha. */}
        <span className="shrink-0 text-right">
          <Dinheiro
            centavos={liquido}
            className={forma.ativo ? undefined : "opacity-60"}
          />
          <span className="mt-0.5 block text-micro text-ink-subtle">
            de cada 100 reais
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Lista com divisórias, não grade de cartões: cada forma é uma linha de dado,
 * e a linha inteira é o alvo de toque.
 */
export function ListaFormasPagamento({
  formas,
  aoAbrir,
  aoAdicionar,
}: {
  formas: FormaPagamento[];
  aoAbrir: (forma: FormaPagamento) => void;
  aoAdicionar: () => void;
}) {
  return (
    <div className="-mx-4 lg:-mx-5">
      {formas.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {formas.map((forma) => (
            <LinhaForma key={forma.id} forma={forma} aoAbrir={aoAbrir} />
          ))}
        </ul>
      )}

      <div className="px-4 pt-4 lg:px-5">
        {formas.length === 0 && (
          <p className="mb-3 text-label text-ink-muted">
            Sem forma de pagamento cadastrada, nenhum preço sabe quanto a
            maquininha vai comer.
          </p>
        )}
        <Botao
          onClick={aoAdicionar}
          larguraTotal
          iconeInicial={<Plus aria-hidden className="size-5" strokeWidth={2} />}
        >
          Adicionar forma de pagamento
        </Botao>
      </div>
    </div>
  );
}
