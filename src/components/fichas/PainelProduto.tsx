"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { RefreshCw, TrendingDown, X } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  composicaoDoLote,
  custoGravado,
  ROTULO_TIPO_FICHA,
  SUFIXO_UNIDADE_RENDIMENTO,
} from "@/lib/domain/custoFicha";
import { formatarPercentual } from "@/lib/domain/money";
import { somaTaxas } from "@/lib/domain/precificacao";
import type { Centavos, FichaTecnica } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { FaixaDeComposicao, Parcela } from "./FaixaDeComposicao";

function Metrica({ rotulo, valor }: { rotulo: string; valor: Centavos }) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-muted">
        {rotulo}
      </p>
      <p className="mt-0.5">
        <Dinheiro centavos={valor} />
      </p>
    </div>
  );
}

/**
 * O produto selecionado, ao lado da tabela de `/fichas`, só no desktop
 * (`DECISOES.md#d130`). Coluna acoplada, e não o `Painel`: aquele é sobreposição
 * com fundo escurecido e foco preso, e aqui a lista precisa continuar
 * clicável para trocar de produto sem fechar nada. No celular a linha vai ao
 * editor, e este componente não existe.
 *
 * Só leitura, do que a ficha já tem gravado (`custoGravado`): o mesmo número
 * que o editor gravou, e o selo de custo desatualizado é quem diz que ele
 * envelheceu. Sem o ponto âmbar: ele marca dado num lugar só, o painel de
 * preço do editor, e a faixa já é a assinatura desta peça.
 */
export function PainelProduto({
  ficha,
  aoFechar,
}: {
  ficha: FichaTecnica;
  aoFechar: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const custo = custoGravado(ficha);
  const segmentos = composicaoDoLote(custo);
  const lucro = ficha.precificacao.lucroUnitario;
  const noPrejuizo = lucro < 0;

  // Ao abrir, e ao trocar de produto, o foco vem para cá: é daqui que o
  // `Escape` devolve à linha.
  useEffect(() => {
    ref.current?.focus();
  }, [ficha.id]);

  function aoTeclar(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key !== "Escape") return;
    evento.stopPropagation();
    aoFechar();
  }

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={ficha.nome}
      onKeyDown={aoTeclar}
      className="hidden w-104 shrink-0 flex-col rounded-lg border border-line bg-surface outline-none lg:flex"
    >
      <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-title font-semibold text-ink">
            {ficha.nome}
          </h2>
          <p className="num mt-1 text-label text-ink-muted">
            rende {ficha.rendimento}{" "}
            {SUFIXO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
            <span className="mx-1.5 text-ink-subtle">·</span>
            {ficha.invisiveis.tempoProducaoMinutos} min
            <span className="mx-1.5 text-ink-subtle">·</span>
            {ROTULO_TIPO_FICHA[ficha.tipo].toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="toque -mr-2 -mt-1 flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="space-y-5 px-5 py-5">
        {ficha.custoDesatualizado && (
          <div className="space-y-2">
            <Selo
              tom="atencao"
              icone={<RefreshCw aria-hidden className="size-3.5" />}
            >
              Custo desatualizado
            </Selo>
            <p className="text-label text-ink-muted">
              Abra o produto e salve para recalcular com os preços de hoje.
            </p>
          </div>
        )}

        <section aria-labelledby={`custo-${ficha.id}`}>
          <h3
            id={`custo-${ficha.id}`}
            className="text-subheading font-semibold text-ink"
          >
            O custo do lote
          </h3>
          {/* As linhas são a legenda da faixa (`#d126`): as mesmas parcelas,
              na mesma ordem, saindo do mesmo mapeamento. */}
          <FaixaDeComposicao segmentos={segmentos} className="mt-3" />
          <dl className="mt-3 space-y-2 text-label">
            {segmentos.map((s) => (
              <Parcela
                key={s.rotulo}
                rotulo={s.rotulo}
                valor={s.centavos}
                destaque={s.destaque}
              />
            ))}
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
              <dt className="font-medium text-ink">Custo do lote inteiro</dt>
              <dd>
                <Dinheiro centavos={custo.custoTotalLote} />
              </dd>
            </div>
          </dl>
        </section>

        <div className="flex gap-5 border-t border-line pt-5">
          <Metrica rotulo="Custo/un" valor={custo.custoUnitario} />
          <Metrica rotulo="Sugerido" valor={ficha.precificacao.precoSugerido} />
          <Metrica rotulo="Praticado" valor={ficha.precificacao.precoVenda} />
        </div>

        {/* O preço nunca sozinho: a sobra é a resposta, e no prejuízo ela leva
            ícone, palavra e cor, nunca só a cor. */}
        <div className="border-t border-line pt-5">
          <p
            className={cn(
              "flex items-center gap-2 font-display text-display font-semibold",
              noPrejuizo ? "text-negative" : "text-ink",
            )}
          >
            {noPrejuizo && (
              <TrendingDown
                aria-hidden
                className="size-7 shrink-0"
                strokeWidth={1.75}
              />
            )}
            {noPrejuizo ? "Perde" : "Sobram"}{" "}
            <Dinheiro tamanho="xl" centavos={Math.abs(lucro)} />
          </p>
          <p className="mt-1 text-label text-ink-muted">
            por unidade, depois da maquininha (
            {formatarPercentual(somaTaxas(ficha.precificacao), 2)})
          </p>
        </div>
      </div>

      <footer className="border-t border-line px-5 py-4">
        <Link
          href={`/fichas/${ficha.id}`}
          className={classesBotao({ larguraTotal: true })}
        >
          Abrir produto
        </Link>
      </footer>
    </aside>
  );
}
