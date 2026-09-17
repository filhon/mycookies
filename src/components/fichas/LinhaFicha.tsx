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
 * O preço sozinho não informa, então ele nunca aparece sozinho: embaixo dele
 * vem o que sobra por unidade, que é a pergunta que trouxe a Maynara até aqui.
 *
 * Três andares, e não duas colunas. Em cima, nome e preço; no meio, custo e
 * sobra, com a sobra alinhada sob o preço; embaixo, o que está pronto e quantas
 * fornadas dá, na **largura inteira da linha**. Com as frases de produção na
 * coluna da esquerda, ao lado do preço, cada uma quebrava em três a cinco
 * linhas num celular de 360px, e a lista virava um muro de texto.
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
  const temProducao =
    !!pronto ||
    !!capacidade ||
    ficha.tipo === "KIT" ||
    ficha.custoDesatualizado;

  return (
    <li>
      <Link
        href={`/fichas/${ficha.id}`}
        className="block px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {ficha.nome}
          </p>
          <Dinheiro centavos={ficha.precificacao.precoVenda} />
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </div>

        {/* `pr-8` é a seta mais o vão: a sobra fica debaixo do preço. */}
        <div className="mt-0.5 flex items-baseline gap-3 pr-8">
          <p className="num min-w-0 flex-1 truncate text-label text-ink-muted">
            custa {formatarMoeda(ficha.custoUnitario)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            rende {ficha.rendimento}{" "}
            {ROTULO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
          </p>
          <p
            className={cn(
              "num flex shrink-0 items-center gap-1 text-micro",
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

        {temProducao && (
          <div className="mt-2 flex flex-wrap items-start gap-x-5 gap-y-1">
            {pronto && (
              <FraseDoPronto
                projecao={pronto.pronto}
                unidade={ficha.unidadeRendimento}
                reservado={pronto.reservado}
              />
            )}
            {capacidade && <FraseDaCapacidade capacidade={capacidade} />}
            {ficha.tipo === "KIT" && <Selo tom="neutro">Kit</Selo>}
            {ficha.custoDesatualizado && (
              <Selo
                tom="atencao"
                icone={<RefreshCw aria-hidden className="size-3.5" />}
              >
                Custo desatualizado
              </Selo>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}
