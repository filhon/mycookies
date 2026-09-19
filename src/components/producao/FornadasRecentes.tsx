"use client";

import { useState } from "react";
import { CookingPot } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { SUFIXO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { rotuloDia } from "@/lib/domain/datas";
import { parseParaNumero } from "@/lib/domain/money";
import {
  anotarQuebra,
  arquivarFornada,
} from "@/lib/firebase/mutations/fornadas";
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
  const [anotando, setAnotando] = useState<string | null>(null);
  const [valorQuebra, setValorQuebra] = useState("");
  const [erroQuebra, setErroQuebra] = useState<string | null>(null);

  if (fornadas.length === 0) return null;

  function desfazer(id: string) {
    arquivarFornada(contaId, id);
    setConfirmando(null);
  }

  function abrirQuebra(fornada: Fornada) {
    setAnotando(fornada.id);
    setConfirmando(null);
    setValorQuebra(
      fornada.perdidas !== undefined ? texto(fornada.perdidas) : "",
    );
    setErroQuebra(null);
  }

  function confirmarQuebra(fornada: Fornada) {
    const perdidas = parseParaNumero(valorQuebra);
    if (perdidas < 0 || perdidas > fornada.unidadesProduzidas) {
      setErroQuebra("Não dá para quebrar mais do que a massa rendeu.");
      return;
    }
    anotarQuebra(contaId, fornada.id, perdidas);
    setAnotando(null);
  }

  return (
    <div className="-mx-4 lg:-mx-5">
      <h3 className="px-4 text-label font-medium text-ink lg:px-5">
        Massas registradas
      </h3>
      <ul className="mt-1.5 divide-y divide-line border-y border-line">
        {fornadas.map((fornada) => {
          const pedindo = confirmando === fornada.id;
          const anotandoEsta = anotando === fornada.id;
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
                  {fornada.perdidas !== undefined && (
                    <>
                      <span className="mx-1.5 text-ink-subtle">·</span>
                      <span className="text-ink-muted">
                        {texto(fornada.perdidas)}{" "}
                        {fornada.perdidas === 1 ? "quebrou" : "quebraram"}
                      </span>
                    </>
                  )}
                </span>
              </span>

              {anotandoEsta ? (
                <div className="flex w-full flex-wrap items-end gap-3">
                  <Campo
                    rotulo="Quantas não deram para vender?"
                    inputMode="decimal"
                    autoComplete="off"
                    sufixo={
                      SUFIXO_UNIDADE_RENDIMENTO[fornada.unidadeRendimento]
                    }
                    value={valorQuebra}
                    onChange={(evento) => setValorQuebra(evento.target.value)}
                    erro={erroQuebra ?? undefined}
                    className="w-40"
                  />
                  <span className="flex shrink-0 gap-2">
                    <Botao tamanho="sm" onClick={() => setAnotando(null)}>
                      Cancelar
                    </Botao>
                    <Botao
                      tamanho="sm"
                      variante="primaria"
                      onClick={() => confirmarQuebra(fornada)}
                    >
                      Anotar
                    </Botao>
                  </span>
                </div>
              ) : pedindo ? (
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
                <span className="flex shrink-0 gap-2">
                  <Botao tamanho="sm" onClick={() => abrirQuebra(fornada)}>
                    {fornada.perdidas !== undefined
                      ? `Quebrou: ${texto(fornada.perdidas)}`
                      : "Quebrou"}
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="terciaria"
                    onClick={() => setConfirmando(fornada.id)}
                  >
                    Desfazer
                  </Botao>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-4 text-label text-ink-muted lg:px-5">
        Desfazer tira a massa da projeção da despensa e da lista de compras. O
        registro fica guardado, arquivado. O que quebrou sai do que está pronto
        e volta para a lista de compras. A despensa não muda: o material já foi
        gasto.
      </p>
    </div>
  );
}
