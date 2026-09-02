"use client";

import { CornerDownRight, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { formatarMoeda } from "@/lib/domain/money";
import type { DerivadosPedido } from "@/lib/domain/pedido";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Tom = "neutro" | "positivo" | "atencao";

const TONS: Record<Tom, string> = {
  neutro: "border-line bg-sunken text-ink-muted",
  positivo: "border-line bg-sunken text-ink-muted",
  atencao: "border-attention/30 bg-attention-soft text-ink",
};

function Parcela({
  rotulo,
  valor,
  prefixo,
}: {
  rotulo: string;
  valor: Centavos;
  prefixo?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
        {rotulo}
      </p>
      <p className="mt-0.5 inline-flex items-baseline gap-0.5">
        {prefixo && (
          <span className="num text-body font-semibold text-ink">
            {prefixo}
          </span>
        )}
        <Dinheiro centavos={valor} />
      </p>
    </div>
  );
}

/**
 * O rodapé preso ao pé da tela enquanto ela monta o pedido.
 *
 * Mesma razão do painel de preço da ficha: a pergunta que a trouxe até aqui —
 * "quanto sobra deste pedido?" — não pode depender de rolar a lista de itens.
 * Subtotal, desconto e entrega ficam do lado do total porque um total sozinho
 * não presta contas de como chegou ali.
 */
export function PainelPedido({ derivado }: { derivado: DerivadosPedido }) {
  const semItens = derivado.linhas.length === 0;
  const lucro = derivado.lucroEstimado;

  function explicar(): { tom: Tom; icone: ReactNode; mensagem: ReactNode } {
    const alerta = (
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
    );

    if (semItens) {
      return {
        tom: "neutro",
        icone: (
          <CornerDownRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        ),
        mensagem:
          "Busque o que ela pediu e adicione por toque. O total e a sobra aparecem aqui.",
      };
    }

    const depoisDe =
      derivado.custoTaxaPagamento > 0
        ? "depois do custo de produzir e da maquininha"
        : "depois do custo de produzir";

    // O prejuízo carrega ícone e a palavra: a cor sozinha nunca decide.
    if (lucro < 0) {
      return {
        tom: "atencao",
        icone: alerta,
        mensagem: (
          <>
            Neste pedido você <strong className="font-semibold">perde</strong>{" "}
            <Realce>{formatarMoeda(Math.abs(lucro))}</Realce> {depoisDe}.
          </>
        ),
      };
    }

    return {
      tom: "positivo",
      icone: (
        <CornerDownRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      ),
      mensagem: (
        <>
          Sobram <Realce>{formatarMoeda(lucro)}</Realce> deste pedido {depoisDe}
          .
          {/* A taxa de entrega é receita e está dentro desta sobra: sem dizer
              isso, o número pareceria lucro de doce. */}
          {derivado.taxaEntrega > 0 && (
            <>
              {" "}
              <Realce>{formatarMoeda(derivado.taxaEntrega)}</Realce> dessa sobra
              é a entrega.
            </>
          )}
        </>
      ),
    };
  }

  const { tom, icone, mensagem } = explicar();

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 lg:px-5">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Parcela rotulo="Subtotal" valor={derivado.subtotal} />
            {derivado.desconto > 0 && (
              <Parcela
                rotulo="Desconto"
                valor={derivado.desconto}
                prefixo="−"
              />
            )}
            {derivado.taxaEntrega > 0 && (
              <Parcela rotulo="Entrega" valor={derivado.taxaEntrega} />
            )}
          </div>

          <div className="text-right">
            <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
              Total do pedido
            </p>
            <p className="mt-0.5">
              <Dinheiro centavos={derivado.total} tamanho="lg" />
            </p>
          </div>
        </div>

        <div
          className={cn(
            "border-t px-4 py-2.5 text-label lg:px-5",
            TONS[derivado.descontoLimitado ? "atencao" : tom],
          )}
        >
          {derivado.descontoLimitado && (
            <p className="flex items-start gap-2.5">
              <TriangleAlert
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-attention"
                strokeWidth={1.75}
              />
              <span className="max-w-[64ch]">
                O desconto não cabia no pedido e entrou como{" "}
                <Realce>{formatarMoeda(derivado.desconto)}</Realce>: mais do que
                isso deixaria o total negativo.
              </span>
            </p>
          )}
          <p
            className={cn(
              "flex items-start gap-2.5",
              derivado.descontoLimitado && "mt-1.5",
            )}
          >
            {icone}
            <span className="max-w-[64ch]">{mensagem}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Número dentro da frase. O dado tem peso; a frase não. */
function Realce({ children }: { children: ReactNode }) {
  return <strong className="num font-semibold text-ink">{children}</strong>;
}
