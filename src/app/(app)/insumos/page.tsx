"use client";

import { Plus, Search } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { FormularioInsumo } from "@/components/insumos/FormularioInsumo";
import { LinhaInsumo } from "@/components/insumos/LinhaInsumo";
import {
  AvisoLeituraSemRede,
  EntradaLeitura,
} from "@/components/notas/EntradaLeitura";
import { Botao } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { dataISODe } from "@/lib/domain/datas";
import { colInsumos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { CategoriaInsumo, Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const FILTROS: { valor: CategoriaInsumo | "TODOS"; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "INGREDIENTE", rotulo: "Ingredientes" },
  { valor: "EMBALAGEM", rotulo: "Embalagens" },
  { valor: "ETIQUETA", rotulo: "Etiquetas" },
  { valor: "ARMAZENAMENTO", rotulo: "Armazenamento" },
  { valor: "OUTRO", rotulo: "Outros" },
];

export default function PaginaInsumos() {
  const contaId = useContaId();
  // O dia congela na abertura: é contra ele que a idade de cada contagem é
  // medida, e uma tela que o relesse a cada render mediria contra outro relógio.
  const [hoje] = useState(() => dataISODe(new Date()));
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<CategoriaInsumo | "TODOS">("TODOS");
  const [emEdicao, setEmEdicao] = useState<Insumo | undefined>();
  const [painelAberto, setPainelAberto] = useState(false);

  /**
   * Uma consulta só, ordenada, e todo o resto filtrado em memória.
   * A coleção de insumos de uma confeitaria artesanal tem dezenas de itens: o
   * cache do Firestore já os tem, e cada filtro no servidor seria leitura paga
   * para reordenar o que já está no aparelho.
   */
  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const { dados, carregando, erro, pendente } = useColecao<Insumo>(consulta);

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    return dados.filter((insumo) => {
      const combinaCategoria =
        filtro === "TODOS" || insumo.categoria === filtro;
      const combinaBusca = !termo || insumo.nomeBusca.includes(termo);
      return combinaCategoria && combinaBusca;
    });
  }, [dados, busca, filtro]);

  function abrirNovo() {
    setEmEdicao(undefined);
    setPainelAberto(true);
  }

  function abrirEdicao(insumo: Insumo) {
    setEmEdicao(insumo);
    setPainelAberto(true);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Insumos"
        descricao="Ingredientes e embalagens. É daqui que sai o custo de toda receita."
        acao={
          // "Ler uma nota" aparece nos dois tamanhos de tela, e "Novo insumo"
          // só no desktop: no celular a ação primária é o botão flutuante, e
          // dois flutuantes disputariam o mesmo polegar.
          <div className="flex items-start gap-2">
            <EntradaLeitura />
            <Botao
              variante="primaria"
              onClick={abrirNovo}
              iconeInicial={
                <Plus aria-hidden className="size-5" strokeWidth={2} />
              }
              className="hidden lg:inline-flex"
            >
              Novo insumo
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          {/* A frase da entrada desabilitada vai aqui, e não embaixo do botão:
              é a faixa que tem a largura da página. */}
          <AvisoLeituraSemRede />

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
              placeholder="Buscar insumo"
              aria-label="Buscar insumo"
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
            : `${visiveis.length} ${visiveis.length === 1 ? "insumo" : "insumos"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
        {erro ? (
          <EstadoVazio
            titulo="Não deu para carregar seus insumos"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        ) : carregando ? (
          <EsqueletoLista />
        ) : visiveis.length === 0 ? (
          dados.length === 0 ? (
            <EstadoVazio
              titulo="Comece pela farinha"
              descricao="Cadastre um insumo com o preço que você paga e a quantidade da embalagem. O sistema converte para custo por grama e usa isso em toda ficha técnica."
              acao={
                <div className="flex flex-col items-center gap-4">
                  <Botao
                    variante="primaria"
                    tamanho="lg"
                    onClick={abrirNovo}
                    iconeInicial={
                      <Plus aria-hidden className="size-5" strokeWidth={2} />
                    }
                  >
                    Cadastrar insumo
                  </Botao>
                  {/* A segunda ação: a nota da última compra tem tudo isso
                      impresso, e a primeira carga é onde digitar mais custa. */}
                  <EntradaLeitura tamanho="lg" />
                  <AvisoLeituraSemRede centralizado />
                </div>
              }
            />
          ) : (
            <EstadoVazio
              titulo="Nada com esse filtro"
              descricao="Tente outro termo de busca ou volte para todas as categorias."
              acao={
                <Botao
                  onClick={() => {
                    setBusca("");
                    setFiltro("TODOS");
                  }}
                >
                  Limpar filtros
                </Botao>
              }
            />
          )
        ) : (
          <ul className="divide-y divide-line">
            {visiveis.map((insumo) => (
              <LinhaInsumo
                key={insumo.id}
                insumo={insumo}
                hoje={hoje}
                aoAbrir={abrirEdicao}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Ação primária ao alcance do polegar, acima da navegação inferior. */}
      <button
        type="button"
        onClick={abrirNovo}
        aria-label="Novo insumo"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-wine-700 text-on-wine shadow-overlay transition-colors duration-150 ease-quart hover:bg-wine-600 active:bg-wine-800 lg:hidden"
      >
        <Plus aria-hidden className="size-6" strokeWidth={2} />
      </button>

      <FormularioInsumo
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        insumo={emEdicao}
      />
    </>
  );
}
