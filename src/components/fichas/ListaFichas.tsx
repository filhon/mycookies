"use client";

import Link from "next/link";
import { PackageOpen, Plus } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useRef, useState } from "react";
import { EntradaContagem } from "@/components/estoque/EntradaContagem";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { BotaoMais } from "@/components/ui/BotaoMais";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Botao } from "@/components/ui/Botao";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { COLUNAS_FICHA, LinhaFicha } from "./LinhaFicha";
import { PainelProduto } from "./PainelProduto";
import { ID_FICHA_NOVA } from "./EditorFicha";
import { BotaoBiblioteca } from "@/components/biblioteca/BotaoBiblioteca";
import { EntradaContagemPronto } from "@/components/producao/EntradaContagemPronto";
import { custosDeHoje } from "@/lib/domain/custoFicha";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { dataISODe } from "@/lib/domain/datas";
import { capacidadeDaFicha, projecaoDoPronto } from "@/lib/domain/producao";
import { colFichas } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import {
  contextoDaCapacidade,
  useDespensaParaProduzir,
} from "@/lib/hooks/useDespensaParaProduzir";
import type { FichaTecnica, TipoFicha } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";

const FILTROS: OpcaoPilula<TipoFicha | "TODAS">[] = [
  { valor: "TODAS", rotulo: "Todos" },
  { valor: "SIMPLES", rotulo: "Receitas" },
  { valor: "KIT", rotulo: "Kits" },
];

export function ListaFichas() {
  const contaId = useContaId();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<TipoFicha | "TODAS">("TODAS");
  // O produto no painel ao lado, só no desktop (`DECISOES.md#d130`).
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);

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

  // Quantas fornadas dá, por ficha: a despensa projetada, menos o que os
  // pedidos abertos já prometeram. É a tela que ela abre quando alguém
  // pergunta se tem cookie, e a resposta é sobre hoje.
  const [hoje] = useState(() => dataISODe(new Date()));
  const despensa = useDespensaParaProduzir(contaId, hoje);
  const pedidos = despensa.pedidos.dados;
  const insumos = despensa.insumos.dados;
  const fornadas = despensa.fornadas.dados;
  const capacidades = useMemo(() => {
    const { consumo, prometido, reservado } = contextoDaCapacidade(
      pedidos,
      dados,
      insumos,
      fornadas,
      hoje,
    );
    return new Map(
      dados.map((ficha) => [
        ficha.id,
        {
          capacidade: capacidadeDaFicha(
            ficha,
            dados,
            insumos,
            consumo,
            hoje,
            prometido,
          ),
          // O que está pronto, sem o que já é de pedido aberto (13D).
          pronto: projecaoDoPronto(fornadas, ficha, hoje),
          reservado: reservado.get(ficha.id) ?? 0,
        },
      ]),
    );
  }, [pedidos, dados, insumos, fornadas, hoje]);

  // O custo e a sobra se cada ficha salvasse agora, com os materiais de hoje
  // (`#d135`). Só passado adiante quando a despensa chegou: enquanto isso, a
  // linha não diz nada, em vez de dizer "igual" por um instante e trocar.
  const hojes = useMemo(() => custosDeHoje(dados, insumos), [dados, insumos]);

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    return dados.filter((ficha) => {
      const combinaTipo = filtro === "TODAS" || ficha.tipo === filtro;
      const combinaBusca = !termo || ficha.nomeBusca.includes(termo);
      return combinaTipo && combinaBusca;
    });
  }, [dados, busca, filtro]);

  // Derivada, e não guardada: se a ficha sair de `dados` (arquivada em outra
  // aba), o painel fecha sozinho.
  const selecionada = dados.find((ficha) => ficha.id === selecionadaId) ?? null;

  /** Fecha o painel e devolve o foco à linha que estava selecionada. */
  function fecharPainel() {
    const linha = lista.current?.querySelector<HTMLElement>(
      'a[aria-current="true"]',
    );
    setSelecionadaId(null);
    linha?.focus();
  }

  const despensaPronta = !despensa.carregando;
  // O botão da biblioteca só existe em conta vazia (`DECISOES.md#d114`): sem
  // isso o estado vazio de hoje trocaria de texto para quem já tem insumo.
  const contaVazia = despensaPronta && insumos.length === 0;
  // Um botão primário por tela: enquanto o estado vazio ensina a tela, a ação
  // é dele, e o botão do cabeçalho e o "+" saem.
  const estadoVazioNaTela = !carregando && !erro && dados.length === 0;
  const semContagem =
    despensaPronta &&
    visiveis.some(
      (ficha) =>
        (capacidades.get(ficha.id)?.capacidade?.semContagem.length ?? 0) > 0,
    );

  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        descricao="O produto, o custo real dele e o preço que fecha a sua margem."
        acao={
          <div className="flex items-center gap-2">
            {/* No mesmo lugar em que `/pedidos` leva a "o que comprar": o que
                está pronto é consequência do que foi feito, e é daqui que se
                responde "tem cookie?". */}
            <EntradaContagemPronto className="hidden lg:inline-flex" />
            {!estadoVazioNaTela && (
              <>
                <Link
                  href={`/fichas/${ID_FICHA_NOVA}`}
                  className={classesBotao({
                    variante: "primaria",
                    className: "hidden lg:inline-flex",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Novo produto
                </Link>
                {/* No celular, o "+" e a bandeja são o único lugar das duas
                    ações (`DECISOES.md#d151`). */}
                <BotaoMais
                  rotulo="Adicionar"
                  opcoes={[
                    {
                      rotulo: "Novo produto",
                      icone: Plus,
                      href: `/fichas/${ID_FICHA_NOVA}`,
                    },
                    {
                      rotulo: "Contar o que está pronto",
                      icone: PackageOpen,
                      href: "/fichas/contagem",
                    },
                  ]}
                />
              </>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <CampoBusca
            rotulo="Buscar produto"
            placeholder="Buscar produto"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />

          <Pilulas
            rotulo="Tipo"
            opcoes={FILTROS}
            valor={filtro}
            aoMudar={setFiltro}
          />
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "produto" : "produtos"}`}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      {/* O atalho para contar mora aqui, e não em cada linha: a linha inteira
          já é um link para a ficha, e link dentro de link não existe. */}
      {semContagem && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="max-w-[48ch] text-label text-ink-muted">
            Quantas fornadas dá sai da contagem, e há material sem contagem que
            valha.
          </p>
          <EntradaContagem tamanho="sm" />
        </div>
      )}

      {/* No desktop a tabela e o painel do produto selecionado dividem a
          largura: sem seleção, a tabela ocupa tudo (`DECISOES.md#d130`). */}
      <div className="mt-2 lg:flex lg:items-start lg:gap-4">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface">
          {erro ? (
            <EstadoVazio
              titulo="Não deu para carregar seus produtos"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          ) : carregando ? (
            <EsqueletoLista />
          ) : visiveis.length === 0 ? (
            dados.length === 0 ? (
              contaVazia ? (
                <EstadoVazio
                  titulo="Nenhum produto com preço ainda."
                  descricao="Monte uma receita, diga quanto ela rende, e o Rende mostra quanto custa e quanto cobrar."
                  acao={
                    <div className="flex flex-col items-center gap-3">
                      <BotaoBiblioteca />
                      <Link
                        href={`/fichas/${ID_FICHA_NOVA}`}
                        className={classesBotao({ variante: "terciaria" })}
                      >
                        Criar primeiro produto
                      </Link>
                    </div>
                  }
                />
              ) : (
                <EstadoVazio
                  titulo="Comece pelo que você mais vende"
                  descricao="Monte o produto com os materiais que você já cadastrou. O sistema soma o seu tempo, o gás e a taxa da maquininha, e devolve o preço que fecha a margem que você quer."
                  acao={
                    <Link
                      href={`/fichas/${ID_FICHA_NOVA}`}
                      className={classesBotao({
                        variante: "primaria",
                        tamanho: "lg",
                      })}
                    >
                      <Plus aria-hidden className="size-5" strokeWidth={2} />
                      Criar primeiro produto
                    </Link>
                  }
                />
              )
            ) : (
              <EstadoVazio
                titulo="Nada com esse filtro"
                descricao="Tente outro termo de busca ou volte para todos os produtos."
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
            <>
              {/* O cabeçalho das colunas é para quem vê: cada célula da linha
                  carrega o rótulo em `sr-only`, com as palavras do celular. */}
              <div
                aria-hidden
                className={cn(
                  "hidden gap-x-4 border-b border-line px-4 py-2 text-micro font-semibold uppercase tracking-wide text-ink-muted lg:grid",
                  COLUNAS_FICHA,
                )}
              >
                <span>Produto</span>
                <span className="text-right">Rende</span>
                <span className="text-right">Custo/un</span>
                <span className="text-right">Sugerido</span>
                <span className="text-right">Praticado</span>
                <span className="text-right">Sobra</span>
              </div>
              <ul ref={lista} className="divide-y divide-line">
                {visiveis.map((ficha) => (
                  <LinhaFicha
                    key={ficha.id}
                    ficha={ficha}
                    // Enquanto a despensa não chegou, a linha não diz nada: dizer
                    // "não dá para saber" por um instante seria mentir por pressa.
                    capacidade={
                      despensaPronta
                        ? capacidades.get(ficha.id)?.capacidade
                        : undefined
                    }
                    pronto={
                      despensaPronta ? capacidades.get(ficha.id) : undefined
                    }
                    hoje={despensaPronta ? hojes.get(ficha.id) : undefined}
                    selecionada={ficha.id === selecionada?.id}
                    aoSelecionar={() => setSelecionadaId(ficha.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {selecionada && (
          <PainelProduto
            ficha={selecionada}
            hoje={despensaPronta ? hojes.get(selecionada.id) : undefined}
            aoFechar={fecharPainel}
          />
        )}
      </div>
    </>
  );
}
