import Link from "next/link";
import { ChevronRight, RefreshCw, TriangleAlert } from "lucide-react";
import {
  FraseDaCapacidade,
  FraseDoPronto,
} from "@/components/producao/FraseDaCapacidade";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { ROTULO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { formatarMoeda } from "@/lib/domain/money";
import type {
  CapacidadeDaFicha,
  ProjecaoDoPronto,
} from "@/lib/domain/producao";
import type { FichaTecnica } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Uma ficha na lista: nome, o que ela custa, o que ela deixa e quantas
 * fornadas a despensa aguenta hoje.
 *
 * O preço sozinho não informa, então ele nunca aparece sozinho: ao lado dele
 * vem o que sobra por unidade, que é a pergunta que trouxe a Maynara até aqui.
 * A capacidade vem embaixo porque é a pergunta que a cliente faz no WhatsApp,
 * e esta é a tela que ela abre para responder.
 */
export function LinhaFicha({
  ficha,
  capacidade,
  pronto,
}: {
  ficha: FichaTecnica;
  /** `null` quando não há pergunta: ficha sem insumo ou sem rendimento. */
  capacidade?: CapacidadeDaFicha | null;
  /** O que está pronto, e quanto disso já é de pedido aberto (13D). */
  pronto?: { pronto: ProjecaoDoPronto; reservado: number };
}) {
  const lucro = ficha.precificacao.lucroUnitario;
  const noPrejuizo = lucro < 0;

  return (
    <li>
      <Link
        href={`/fichas/${ficha.id}`}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">
            {ficha.nome}
          </p>

          <p className="num mt-0.5 truncate text-label text-ink-muted">
            custa {formatarMoeda(ficha.custoUnitario)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            rende {ficha.rendimento}{" "}
            {ROTULO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
          </p>

          {pronto && (
            <FraseDoPronto
              projecao={pronto.pronto}
              unidade={ficha.unidadeRendimento}
              reservado={pronto.reservado}
              className="mt-1"
            />
          )}

          {capacidade && (
            <FraseDaCapacidade capacidade={capacidade} className="mt-1" />
          )}

          {(ficha.tipo === "KIT" || ficha.custoDesatualizado) && (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {ficha.tipo === "KIT" && <Selo tom="neutro">Kit</Selo>}
              {ficha.custoDesatualizado && (
                <Selo
                  tom="atencao"
                  icone={<RefreshCw aria-hidden className="size-3.5" />}
                >
                  Custo desatualizado
                </Selo>
              )}
            </span>
          )}
        </div>

        <div className="shrink-0 text-right">
          <Dinheiro centavos={ficha.precificacao.precoVenda} />
          <p
            className={cn(
              "num mt-0.5 flex items-center justify-end gap-1 text-micro",
              noPrejuizo ? "text-negative" : "text-ink-muted",
            )}
          >
            {/* No prejuízo o ícone acompanha a cor: vermelho de erro e vinho
                da marca são vizinhos de matiz. */}
            {noPrejuizo && (
              <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2} />
            )}
            {noPrejuizo
              ? `perde ${formatarMoeda(Math.abs(lucro))}`
              : `sobram ${formatarMoeda(lucro)}`}
          </p>
        </div>

        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </Link>
    </li>
  );
}
