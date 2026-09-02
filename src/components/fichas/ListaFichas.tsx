"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Botao } from "@/components/ui/Botao";
import { LinhaFicha } from "./LinhaFicha";
import { ID_FICHA_NOVA } from "./EditorFicha";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { colFichas } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { FichaTecnica, TipoFicha } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const FILTROS: { valor: TipoFicha | "TODAS"; rotulo: string }[] = [
  { valor: "TODAS", rotulo: "Todas" },
  { valor: "SIMPLES", rotulo: "Receitas" },
  { valor: "KIT", rotulo: "Kits" },
];

export function ListaFichas() {
  const contaId = useContaId();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<TipoFicha | "TODAS">("TODAS");

  // Uma consulta ordenada, o resto filtrado em memória: são dezenas de
  // fichas, e o cache do Firestore já as tem.
  const consulta = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const { dados, carregando, erro, pendente } =
    useColecao<FichaTecnica>(consulta);

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    return dados.filter((ficha) => {
      const combinaTipo = filtro === "TODAS" || ficha.tipo === filtro;
      const combinaBusca = !termo || ficha.nomeBusca.includes(termo);
      return combinaTipo && combinaBusca;
    });
  }, [dados, busca, filtro]);

  return (
    <>
      <CabecalhoPagina
        titulo="Fichas técnicas"
        descricao="A receita, o custo real dela e o preço que fecha a sua margem."
        acao={
          <Link
            href={`/fichas/${ID_FICHA_NOVA}`}
            className={classesBotao({
              variante: "primaria",
              className: "hidden lg:inline-flex",
            })}
          >
            <Plus aria-hidden className="size-5" strokeWidth={2} />
            Nova ficha
          </Link>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar ficha"
              aria-label="Buscar ficha"
              className="h-12 w-full rounded-md border border-line-strong bg-surface pl-10 pr-3 text-body text-ink placeholder:text-ink-subtle"
            />
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {FILTROS.map((opcao) => {
              const ativo = filtro === opcao.valor;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setFiltro(opcao.valor)}
                  aria-pressed={ativo}
                  className={cn(
                    "h-11 shrink-0 rounded-full px-4 text-label font-medium",
                    "transition-colors duration-150 ease-quart",
                    ativo
                      ? "bg-wine-700 text-on-wine"
                      : "border border-line-strong text-ink-muted hover:bg-sunken",
                  )}
                >
                  {opcao.rotulo}
                </button>
              );
            })}
          </div>
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "ficha" : "fichas"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
        {erro ? (
          <EstadoVazio
            titulo="Não deu para carregar suas fichas"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        ) : carregando ? (
          <EsqueletoLista />
        ) : visiveis.length === 0 ? (
          dados.length === 0 ? (
            <EstadoVazio
              titulo="Comece pelo que você mais vende"
              descricao="Monte a receita com os insumos que você já cadastrou. O sistema soma o seu tempo, o gás e a taxa da maquininha, e devolve o preço que fecha a margem que você quer."
              acao={
                <Link
                  href={`/fichas/${ID_FICHA_NOVA}`}
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Criar primeira ficha
                </Link>
              }
            />
          ) : (
            <EstadoVazio
              titulo="Nada com esse filtro"
              descricao="Tente outro termo de busca ou volte para todas as fichas."
              acao={
                <Botao
                  onClick={() => {
                    setBusca("");
                    setFiltro("TODAS");
                  }}
                >
                  Limpar filtros
                </Botao>
              }
            />
          )
        ) : (
          <ul className="divide-y divide-line">
            {visiveis.map((ficha) => (
              <LinhaFicha key={ficha.id} ficha={ficha} />
            ))}
          </ul>
        )}
      </div>

      {/* Ação primária ao alcance do polegar, acima da navegação inferior. */}
      <Link
        href={`/fichas/${ID_FICHA_NOVA}`}
        aria-label="Nova ficha"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-wine-700 text-on-wine shadow-overlay transition-colors duration-150 ease-quart hover:bg-wine-600 active:bg-wine-800 lg:hidden"
      >
        <Plus aria-hidden className="size-6" strokeWidth={2} />
      </Link>
    </>
  );
}
