"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import { LinhaCliente } from "./LinhaCliente";
import { PainelCliente } from "./PainelCliente";
import { ordenarPorGasto } from "@/lib/domain/clientes";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { consultaClientes } from "@/lib/firebase/mutations/clientes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Cliente } from "@/lib/types";
import { novoId } from "@/lib/utils/id";
import { useContaId } from "@/providers/AuthProvider";

/**
 * Quem mais deixou dinheiro no caixa primeiro (`#d137`). Não cadastra: uma
 * cliente nasce do pedido, e esta tela só lê e ordena o que os agregados dela
 * já sabem.
 */
export function ListaClientes() {
  const contaId = useContaId();
  const [busca, setBusca] = useState("");
  const [emEdicao, setEmEdicao] = useState<{
    aberto: boolean;
    cliente?: Cliente;
    chave: string;
  }>({ aberto: false, chave: "fechado" });

  const consulta = useMemo(() => consultaClientes(contaId), [contaId]);
  const { dados, carregando, erro, pendente } = useColecao<Cliente>(consulta);

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    const filtradas = termo
      ? dados.filter((cliente) => cliente.nomeBusca.includes(termo))
      : dados;
    return ordenarPorGasto(filtradas);
  }, [dados, busca]);

  function abrirEdicao(cliente: Cliente) {
    setEmEdicao({ aberto: true, cliente, chave: `${cliente.id}-${novoId()}` });
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Quem compra de você, quanto já deixou no caixa e quando foi a última vez. Pedido combinado e ainda não pago não entra na conta."
      >
        <CampoBusca
          rotulo="Buscar cliente"
          placeholder="Buscar cliente"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "cliente" : "clientes"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
        {erro ? (
          <EstadoVazio
            titulo="Não deu para carregar suas clientes"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        ) : carregando ? (
          <EsqueletoLista />
        ) : visiveis.length === 0 ? (
          dados.length === 0 ? (
            <EstadoVazio
              titulo="Suas clientes nascem dos pedidos."
              descricao="Ao anotar uma encomenda, toque em Cadastrar esta cliente para guardar telefone e endereço. Ela aparece aqui com o que já comprou."
              acao={
                <Link
                  href="/pedidos"
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  Ver pedidos
                </Link>
              }
            />
          ) : (
            <EstadoVazio
              titulo="Ninguém com esse nome"
              descricao="Tente outro termo de busca."
              acao={<Botao onClick={() => setBusca("")}>Limpar busca</Botao>}
            />
          )
        ) : (
          <ul className="divide-y divide-line">
            {visiveis.map((cliente) => (
              <LinhaCliente
                key={cliente.id}
                cliente={cliente}
                aoAbrir={abrirEdicao}
              />
            ))}
          </ul>
        )}
      </div>

      <PainelCliente
        aberto={emEdicao.aberto}
        chave={emEdicao.chave}
        contaId={contaId}
        cliente={emEdicao.cliente}
        nomeSugerido={emEdicao.cliente?.nome ?? ""}
        podeArquivar
        aoSalvar={() => {}}
        aoFechar={() =>
          setEmEdicao((anterior) => ({ ...anterior, aberto: false }))
        }
      />
    </>
  );
}
