"use client";

import { useId } from "react";
import { CircleAlert, Wallet } from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { ROTULO_CATEGORIA_TRANSACAO } from "@/lib/domain/caixa";
import { rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { LancamentoDaNota } from "@/lib/domain/notaFiscal";
import type { Centavos, Transacao } from "@/lib/types";

/**
 * A compra vira saída no caixa, e a tela diz isso antes de acontecer.
 *
 * O bloco nasce **ligado**. É a decisão mais discutível da sessão, e o
 * argumento é este: uma compra que não chega ao caixa é exatamente o custo
 * invisível que este sistema existe para tornar visível, e deixar isso
 * desligado por padrão é escolher o número errado como caminho de menor
 * esforço. Hoje, sem isto, `porCategoriaSaida.COMPRA_INSUMO` fica vazio e o
 * "quanto sobra" do mês fica otimista. Desligar é um toque, para o dia em que a
 * compra já tiver sido lançada à mão.
 */
export function BlocoCaixa({
  lancamento,
  removido,
  ligado,
  aoAlternar,
  duplicado,
}: {
  lancamento: LancamentoDaNota;
  /** O que ela tirou da lista, somado: é o que explica a diferença. */
  removido: Centavos;
  ligado: boolean;
  aoAlternar: (ligado: boolean) => void;
  /** O lançamento que esta mesma nota já criou, quando a guarda encontrou um. */
  duplicado: Transacao | null;
}) {
  const idLancar = useId();

  return (
    <Bloco
      icone={Wallet}
      titulo="Esta compra no caixa"
      descricao="Uma nota é um lançamento só. O detalhe item a item já fica guardado dentro de cada insumo."
    >
      {duplicado && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-attention/30 bg-attention-soft px-3 py-2.5 text-label text-ink"
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
          <span className="max-w-[60ch]">
            Esta nota já foi lançada no caixa em{" "}
            <strong className="num font-semibold">
              {rotuloDia(duplicado.dataISO)}
            </strong>
            , no valor de{" "}
            <strong className="num font-semibold">
              {formatarMoeda(duplicado.valor)}
            </strong>
            . Os insumos podem ser cadastrados de novo à vontade — atualizar
            preço não repete nada.
          </span>
        </p>
      )}

      <div className="flex items-start gap-3 rounded-md border border-line-strong px-3 py-3">
        <input
          id={idLancar}
          type="checkbox"
          checked={ligado}
          onChange={(evento) => aoAlternar(evento.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-wine-700"
        />
        <label htmlFor={idLancar} className="text-label text-ink">
          <span className="font-medium">Lançar esta compra como saída</span>
          <span className="mt-1 block text-ink-muted">
            <Frase lancamento={lancamento} removido={removido} />
          </span>
        </label>
      </div>
    </Bloco>
  );
}

/**
 * O valor é a soma do que **ficou**, e não o total da nota.
 *
 * O shampoo de R$ 29,80 não é do negócio. Se o caixa recebesse os R$ 176,20
 * impressos, o sistema estaria dizendo que a confeitaria gastou em shampoo — e
 * o "quanto sobra" do mês sairia R$ 29,80 menor por uma compra pessoal. Dizer
 * as duas metades da conta é o que deixa isso conferível antes de acontecer.
 */
function Frase({
  lancamento,
  removido,
}: {
  lancamento: LancamentoDaNota;
  removido: Centavos;
}) {
  const categoria =
    ROTULO_CATEGORIA_TRANSACAO[lancamento.categoria].toLowerCase();

  return (
    <>
      Vai para o caixa:{" "}
      <strong className="num font-semibold text-ink">
        {formatarMoeda(lancamento.valor)}
      </strong>{" "}
      em <span className="num">{rotuloDia(lancamento.dataISO)}</span>
      {removido > 0 && (
        <>
          . Os <span className="num">{formatarMoeda(removido)}</span> que você
          tirou ficam de fora
        </>
      )}
      . Aparece em {categoria}, como &ldquo;{lancamento.descricao}&rdquo;.
    </>
  );
}
