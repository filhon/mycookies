"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { limit, query, where } from "firebase/firestore";
import { Botao } from "@/components/ui/Botao";
import {
  colFichas,
  colInsumos,
  docConfiguracao,
} from "@/lib/firebase/colecoes";
import { instalarBiblioteca } from "@/lib/firebase/mutations/biblioteca";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral, FichaTecnica, Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/**
 * O botão da biblioteca de partida (`DECISOES.md#d114`).
 *
 * Sabe sozinho quando existir: duas consultas `limit(1)` — as mesmas de
 * `useComeco` — mais o documento de configuração. Renderiza `null` enquanto
 * carrega e sempre que a conta já tem um insumo ou uma ficha, para que a
 * farinha dela nunca ganhe uma irmã de mentira.
 */
export function BotaoBiblioteca({
  variante = "primaria",
}: {
  variante?: "primaria" | "secundaria";
}) {
  const contaId = useContaId();
  const router = useRouter();

  const consultaInsumos = useMemo(
    () => query(colInsumos(contaId), where("arquivado", "==", false), limit(1)),
    [contaId],
  );
  const consultaFichas = useMemo(
    () => query(colFichas(contaId), where("arquivado", "==", false), limit(1)),
    [contaId],
  );
  const refConfiguracao = useMemo(() => docConfiguracao(contaId), [contaId]);

  const insumos = useColecao<Insumo>(consultaInsumos);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const configuracao = useDocumento<ConfiguracaoGeral>(refConfiguracao);

  const carregando =
    insumos.carregando || fichas.carregando || configuracao.carregando;
  const contaVazia = insumos.dados.length === 0 && fichas.dados.length === 0;

  if (carregando || !contaVazia) return null;

  function comecar() {
    const idDaFicha = instalarBiblioteca(contaId, configuracao.dado);
    router.push(`/fichas/${idDaFicha}`);
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Botao variante={variante} tamanho="lg" onClick={comecar}>
        Começar com o que toda cozinha tem
      </Botao>
      <p className="max-w-[42ch] text-label text-ink-muted">
        25 ingredientes e embalagens com preço médio, e dois produtos de cookie
        já com preço. Você corrige o que for diferente na sua cozinha.
      </p>
    </div>
  );
}
