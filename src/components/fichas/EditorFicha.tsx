"use client";

import Link from "next/link";
import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import {
  colFichas,
  colInsumos,
  docConfiguracao,
} from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral, FichaTecnica, Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { FormularioFicha } from "./FormularioFicha";

/** O id que a rota usa para "ainda não existe". */
export const ID_FICHA_NOVA = "nova";

/**
 * Carrega o que a ficha precisa e só então monta o formulário.
 *
 * A separação existe por causa do estado inicial: montar o formulário apenas
 * quando os dados chegaram deixa os valores iniciais serem o que são — valores
 * de montagem — em vez de virarem um efeito que reescreve o que a usuária já
 * começou a digitar.
 */
export function EditorFicha({ id }: { id: string }) {
  const contaId = useContaId();
  const ehNova = id === ID_FICHA_NOVA;

  const consultaInsumos = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  // A mesma consulta serve a três coisas: achar a ficha em edição, oferecer
  // componentes ao kit e listar as categorias já usadas. Uma leitura, não três.
  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const referenciaConfiguracao = useMemo(
    () => docConfiguracao(contaId),
    [contaId],
  );

  const insumos = useColecao<Insumo>(consultaInsumos);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const configuracao = useDocumento<ConfiguracaoGeral>(referenciaConfiguracao);

  const carregando =
    insumos.carregando || fichas.carregando || configuracao.carregando;
  const ficha = ehNova
    ? undefined
    : fichas.dados.find((candidata) => candidata.id === id);

  if (carregando) {
    return (
      <div role="status" aria-label="Carregando" className="space-y-4 pt-4">
        <Esqueleto className="h-10 w-2/3 rounded-md" />
        {[0, 1, 2].map((indice) => (
          <Esqueleto key={indice} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!ehNova && !ficha) {
    return (
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
        <EstadoVazio
          titulo="Esta ficha não está aqui"
          descricao="Ela pode ter sido arquivada, ou o endereço veio errado. Suas fichas continuam na lista."
          acao={
            <Link
              href="/fichas"
              className={classesBotao({ variante: "primaria", tamanho: "lg" })}
            >
              Ver minhas fichas
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <FormularioFicha
      contaId={contaId}
      ficha={ficha}
      insumos={insumos.dados}
      fichas={fichas.dados}
      configuracao={configuracao.dado}
      pendente={fichas.pendente}
    />
  );
}
