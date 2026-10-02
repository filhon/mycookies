"use client";

import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { ROTULO_CATEGORIA_TRANSACAO, taxaDaEntrada } from "@/lib/domain/caixa";
import { competenciaDeISO, diaDeISO } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { ContextoMeta } from "@/lib/firebase/mutations/metas";
import {
  arquivarTransacao,
  criarTransacao,
  type TransacaoReversivel,
} from "@/lib/firebase/mutations/transacoes";
import type { DataISO, FormaPagamento, Transacao } from "@/lib/types";

interface Pendente {
  conta: Transacao;
  dataISO: DataISO;
}

/** O "Desfazer" vive na linha por este tempo depois do "Lançar". */
const JANELA_DESFAZER_MS = 5000;

/**
 * As contas do mês anterior marcadas como "repete todo mês" que ainda não têm
 * par neste (`DECISOES.md#d263`). "Lançar" é a decisão dela, em um toque, pelo
 * mesmo `criarTransacao` do formulário; tocar no nome abre o formulário já
 * preenchido, para o valor que mudou.
 */
export function ContasQueRepetem({
  pendentes,
  contaId,
  formas,
  contextoMeta,
  aoAbrir,
}: {
  pendentes: Pendente[];
  contaId: string;
  formas: FormaPagamento[];
  contextoMeta: ContextoMeta;
  aoAbrir: (pendente: Pendente) => void;
}) {
  // As recém-lançadas saem de `pendentes` sozinhas (ganharam par); ficam aqui
  // pelos cinco segundos do "Desfazer".
  const [lancadas, setLancadas] = useState<
    (Pendente & { criada: TransacaoReversivel })[]
  >([]);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  const total = pendentes.reduce((soma, p) => soma + p.conta.valor, 0);
  const linhas = [
    ...pendentes
      .filter((p) => !lancadas.some((l) => l.conta.id === p.conta.id))
      .map((p) => ({ ...p, criada: null })),
    ...lancadas,
  ].sort((a, b) => a.dataISO.localeCompare(b.dataISO));

  if (linhas.length === 0) return null;

  async function lancar({ conta, dataISO }: Pendente) {
    setFalha(null);
    setOcupada(conta.id);
    const dados = {
      tipo: conta.tipo,
      categoria: conta.categoria,
      descricao: conta.descricao,
      valor: conta.valor,
      dataISO,
      formaPagamentoId: conta.formaPagamentoId,
      recorrente: true,
    };
    try {
      const id = await criarTransacao(contaId, dados, formas, contextoMeta);
      const criada: TransacaoReversivel = {
        id,
        competencia: competenciaDeISO(dataISO),
        tipo: dados.tipo,
        categoria: dados.categoria,
        valor: dados.valor,
        dataISO,
        custoTaxa: taxaDaEntrada(dados, formas),
      };
      setLancadas((anteriores) => [...anteriores, { conta, dataISO, criada }]);
      setTimeout(
        () =>
          setLancadas((anteriores) =>
            anteriores.filter((l) => l.criada.id !== id),
          ),
        JANELA_DESFAZER_MS,
      );
    } catch {
      setFalha("Não foi possível lançar agora. Tente de novo em instantes.");
    } finally {
      setOcupada(null);
    }
  }

  async function desfazer(criada: TransacaoReversivel) {
    setFalha(null);
    setOcupada(criada.id);
    try {
      await arquivarTransacao(contaId, criada, contextoMeta);
      setLancadas((anteriores) =>
        anteriores.filter((l) => l.criada.id !== criada.id),
      );
    } catch {
      setFalha("Não foi possível desfazer agora. Tente de novo em instantes.");
    } finally {
      setOcupada(null);
    }
  }

  return (
    <section
      id="contas-que-repetem"
      aria-labelledby="contas-que-repetem-titulo"
      className="scroll-mt-24 overflow-hidden rounded-lg border border-line bg-surface"
    >
      <h2
        id="contas-que-repetem-titulo"
        className="flex items-baseline justify-between gap-3 border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
      >
        Contas que repetem
        {pendentes.length > 0 && (
          <span className="num text-label font-medium text-ink-muted">
            {pendentes.length} · {formatarMoeda(total)}
          </span>
        )}
      </h2>

      <ul className="divide-y divide-line">
        {linhas.map(({ conta, dataISO, criada }) => (
          <li
            key={conta.id}
            className="flex min-h-14 items-center gap-3 py-1.5 pl-1 pr-4 lg:pl-2 lg:pr-5"
          >
            <button
              type="button"
              onClick={() => aoAbrir({ conta, dataISO })}
              disabled={criada !== null}
              className="toque min-w-0 flex-1 rounded-md px-3 py-1 text-left transition-colors duration-150 ease-quart enabled:hover:bg-sunken"
            >
              <span className="block truncate text-body font-medium text-ink">
                {conta.descricao}
              </span>
              <span className="block text-label text-ink-muted">
                {criada ? (
                  <span className="inline-flex items-center gap-1 text-positive">
                    <Check aria-hidden className="size-4" strokeWidth={2.25} />
                    Lançada no dia {Number(diaDeISO(dataISO))}
                  </span>
                ) : (
                  `${ROTULO_CATEGORIA_TRANSACAO[conta.categoria]} · dia ${Number(diaDeISO(dataISO))}`
                )}
              </span>
            </button>

            <Dinheiro centavos={conta.valor} className="text-ink" />

            {criada ? (
              <Botao
                tamanho="sm"
                variante="terciaria"
                carregando={ocupada === criada.id}
                onClick={() => void desfazer(criada)}
                iconeInicial={
                  <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Desfazer
              </Botao>
            ) : (
              <Botao
                tamanho="sm"
                carregando={ocupada === conta.id}
                disabled={ocupada !== null}
                onClick={() => void lancar({ conta, dataISO })}
                aria-label={`Lançar ${conta.descricao}, ${formatarMoeda(conta.valor)}`}
              >
                Lançar
              </Botao>
            )}
          </li>
        ))}
      </ul>

      {falha && (
        <p role="alert" className="px-4 py-3 text-label text-negative lg:px-5">
          {falha}
        </p>
      )}
    </section>
  );
}
