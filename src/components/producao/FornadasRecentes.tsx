"use client";

import { useState } from "react";
import { CookingPot } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { SUFIXO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { rotuloDia } from "@/lib/domain/datas";
import { arquivarFornada } from "@/lib/firebase/mutations/fornadas";
import type { Fornada } from "@/lib/types";

function texto(numero: number): string {
  return String(Number(numero.toFixed(2))).replace(".", ",");
}

/**
 * As massas registradas há pouco, com o desfazer de cada uma.
 *
 * Existe por um motivo só: a massa registrada por engano precisa de um jeito
 * de sair da projeção, e arquivar é o único caminho — nenhuma fornada é apagada.
 * Não é histórico de produção (isso está fora da spec 013): são as dos últimos
 * trinta dias, que são as que ainda descontam alguma coisa.
 *
 * Desfazer é em dois toques, inline: um dedo com farinha num alvo de 44px não
 * pode custar uma fornada, e modal é só para o destrutivo de verdade.
 */
export function FornadasRecentes({
  contaId,
  fornadas,
}: {
  contaId: string;
  /** Já recortadas por quem chama: as desta ficha, ou as deste pedido. */
  fornadas: Fornada[];
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (fornadas.length === 0) return null;

  function desfazer(id: string) {
    arquivarFornada(contaId, id);
    setConfirmando(null);
  }

  return (
    <div className="-mx-4 lg:-mx-5">
      <h3 className="px-4 text-label font-medium text-ink lg:px-5">
        Massas registradas
      </h3>
      <ul className="mt-1.5 divide-y divide-line border-y border-line">
        {fornadas.map((fornada) => {
          const pedindo = confirmando === fornada.id;
          return (
            <li
              key={fornada.id}
              className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 lg:px-5"
            >
              <span className="num flex min-w-0 flex-1 items-center gap-2 text-label text-ink">
                <CookingPot
                  aria-hidden
                  className="size-4 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
                <span className="truncate">
                  {rotuloDia(fornada.dataISO)}
                  <span className="mx-1.5 text-ink-subtle">·</span>
                  {fornada.nomeSnapshot}: massa para{" "}
                  {texto(fornada.unidadesProduzidas)}{" "}
                  {SUFIXO_UNIDADE_RENDIMENTO[fornada.unidadeRendimento]}
                  <span className="mx-1.5 text-ink-subtle">·</span>
                  <span className="text-ink-muted">
                    {texto(fornada.lotes)}{" "}
                    {fornada.lotes === 1 ? "lote" : "lotes"}
                  </span>
                </span>
              </span>

              {pedindo ? (
                <span className="flex shrink-0 gap-2">
                  <Botao tamanho="sm" onClick={() => setConfirmando(null)}>
                    Manter
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="perigo"
                    onClick={() => desfazer(fornada.id)}
                  >
                    Desfazer esta
                  </Botao>
                </span>
              ) : (
                <Botao
                  tamanho="sm"
                  variante="terciaria"
                  className="shrink-0"
                  onClick={() => setConfirmando(fornada.id)}
                >
                  Desfazer
                </Botao>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-4 text-label text-ink-muted lg:px-5">
        Desfazer tira a massa da projeção da despensa e da lista de compras. O
        registro fica guardado, arquivado.
      </p>
    </div>
  );
}
