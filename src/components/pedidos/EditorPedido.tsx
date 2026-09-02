"use client";

import Link from "next/link";
import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import { FormularioPedido } from "./FormularioPedido";
import {
  colClientes,
  colFichas,
  docConfiguracao,
  docPedido,
} from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  Cliente,
  ConfiguracaoGeral,
  FichaTecnica,
  Pedido,
} from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/** O id que a rota usa para "ainda não existe". */
export const ID_PEDIDO_NOVO = "novo";

/**
 * Carrega o que o pedido precisa e só então monta o formulário.
 *
 * Mesma separação do editor de ficha, e pelo mesmo motivo: montar o formulário
 * apenas quando os dados chegaram deixa os valores iniciais serem valores de
 * montagem, em vez de virarem um efeito que reescreve o que ela já digitou.
 *
 * O pedido é lido pelo id, e não achado dentro da lista: assim um pedido
 * arquivado continua abrindo pelo endereço dele.
 */
export function EditorPedido({ id }: { id: string }) {
  const contaId = useContaId();
  const ehNovo = id === ID_PEDIDO_NOVO;

  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const consultaClientes = useMemo(
    () =>
      query(
        colClientes(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const referenciaConfiguracao = useMemo(
    () => docConfiguracao(contaId),
    [contaId],
  );

  const referenciaPedido = useMemo(
    () => (ehNovo ? null : docPedido(contaId, id)),
    [contaId, id, ehNovo],
  );

  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const clientes = useColecao<Cliente>(consultaClientes);
  const configuracao = useDocumento<ConfiguracaoGeral>(referenciaConfiguracao);
  const pedido = useDocumento<Pedido>(referenciaPedido);

  const carregando =
    fichas.carregando ||
    clientes.carregando ||
    configuracao.carregando ||
    pedido.carregando;

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

  if (!ehNovo && !pedido.dado) {
    return (
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
        <EstadoVazio
          titulo="Este pedido não está aqui"
          descricao="Ele pode ter sido arquivado, ou o endereço veio errado. Sua agenda continua na lista de pedidos."
          acao={
            <Link
              href="/pedidos"
              className={classesBotao({ variante: "primaria", tamanho: "lg" })}
            >
              Ver meus pedidos
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <FormularioPedido
      contaId={contaId}
      pedido={pedido.dado ?? undefined}
      fichas={fichas.dados}
      clientes={clientes.dados}
      configuracao={configuracao.dado}
      pendente={pedido.pendente || fichas.pendente}
    />
  );
}
