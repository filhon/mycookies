"use client";

import Link from "next/link";
import { PackageOpen, Plus, TriangleAlert } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EntradaContagem } from "@/components/estoque/EntradaContagem";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { BotaoMais } from "@/components/ui/BotaoMais";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Botao } from "@/components/ui/Botao";
import { Seletor } from "@/components/ui/Campo";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { COLUNAS_FICHA, LinhaFicha } from "./LinhaFicha";
import { PainelProduto } from "./PainelProduto";
import { ID_FICHA_NOVA } from "./EditorFicha";
import { BotaoBiblioteca } from "@/components/biblioteca/BotaoBiblioteca";
import { EntradaContagemPronto } from "@/components/producao/EntradaContagemPronto";
import {
  custosDeHoje,
  ordenarFichas,
  vendaDoMes,
  type OrdemFichas,
} from "@/lib/domain/custoFicha";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { competenciaAtual, dataISODe, rotuloMes } from "@/lib/domain/datas";
import {
  capacidadeDaFicha,
  faltasDaLista,
  projecaoDoPronto,
} from "@/lib/domain/producao";
import { listarNomes } from "@/components/producao/FraseDaCapacidade";
import { colFichas, docResumoMensal } from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import {
  contextoDaCapacidade,
  useDespensaParaProduzir,
} from "@/lib/hooks/useDespensaParaProduzir";
import type { FichaTecnica, ResumoMensal, TipoFicha } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId, usePapel } from "@/providers/AuthProvider";

const FILTROS: OpcaoPilula<TipoFicha | "TODAS">[] = [
  { valor: "TODAS", rotulo: "Todos" },
  { valor: "SIMPLES", rotulo: "Receitas" },
  { valor: "KIT", rotulo: "Kits" },
];

const ORDENS: { valor: OrdemFichas; rotulo: string }[] = [
  { valor: "NOME", rotulo: "Pelo nome" },
  { valor: "DEIXOU", rotulo: "Deixou mais no mês" },
  { valor: "SOBRA", rotulo: "Sobra por unidade" },
  { valor: "MARGEM", rotulo: "Margem" },
];

/*
 * A ordem mora no aparelho (`#d229`), como a de materiais (`#d226`). Navegador
 * que bloqueia armazenamento lança no acesso: tudo em `try/catch`, e quem não
 * pode guardar volta ao nome.
 */
const CHAVE_ORDEM = "rende:ordem-produtos";

function ordemGuardada(): OrdemFichas {
  try {
    const lida = localStorage.getItem(CHAVE_ORDEM);
    return ORDENS.find((ordem) => ordem.valor === lida)?.valor ?? "NOME";
  } catch {
    return "NOME";
  }
}

const semAssinatura = () => () => {};

export function ListaFichas() {
  const contaId = useContaId();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<TipoFicha | "TODAS">("TODAS");
  // O produto no painel ao lado, só no desktop (`DECISOES.md#d130`).
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);
  // A guardada até ela escolher outra nesta visita; no servidor, o nome.
  const guardada = useSyncExternalStore(
    semAssinatura,
    ordemGuardada,
    () => "NOME" as const,
  );
  const [escolhida, setEscolhida] = useState<OrdemFichas | null>(null);
  const ordem = escolhida ?? guardada;

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

  // O que cada produto vendeu e deixou no mês: a mesma leitura do Caixa e da
  // Hoje, casada pelo `fichaId`, e não pelo nome (`#d228`). O dinheiro não é
  // da ajudante: a regra nega a leitura, e a tela nem pede (`#d157`).
  const dona = usePapel() === "DONA";
  const [competencia] = useState(() => competenciaAtual(new Date()));
  const refResumo = useMemo(
    () => (dona ? docResumoMensal(contaId, competencia) : null),
    [dona, contaId, competencia],
  );
  const produtosDoMes = useDocumento<ResumoMensal>(refResumo).dado?.produtos;

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
    const filtradas = dados.filter((ficha) => {
      const combinaTipo = filtro === "TODAS" || ficha.tipo === filtro;
      const combinaBusca = !termo || ficha.nomeBusca.includes(termo);
      return combinaTipo && combinaBusca;
    });
    return ordenarFichas(filtradas, ordem, produtosDoMes ?? {});
  }, [dados, busca, filtro, ordem, produtosDoMes]);

  // Derivada, e não guardada: se a ficha sair de `dados` (arquivada em outra
  // aba), o painel fecha sozinho.
  const selecionada = dados.find((ficha) => ficha.id === selecionadaId) ?? null;

  function mudarOrdem(nova: OrdemFichas) {
    setEscolhida(nova);
    try {
      localStorage.setItem(CHAVE_ORDEM, nova);
    } catch {
      // Sem armazenamento, a ordem vale só nesta visita.
    }
  }

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

  // A falta dita uma vez, do que está à vista (`#d231`): a linha só diz
  // "falta X", e a faixa diz o tamanho e leva à lista de compras.
  const faltas = despensaPronta
    ? faltasDaLista(
        visiveis.map((ficha) => capacidades.get(ficha.id)?.capacidade),
      )
    : null;

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

      <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "produto" : "produtos"}${dona ? ` · vendas de ${rotuloMes(competencia)}` : ""}`}
        </p>
        <div className="flex items-center gap-3">
          {/* O `select` nativo: no celular o próprio aparelho abre a folha. */}
          <Seletor
            rotulo="Ordem"
            value={ordem}
            onChange={(evento) =>
              mudarOrdem(evento.target.value as OrdemFichas)
            }
            className="flex-row items-center gap-2"
          >
            {ORDENS.filter((opcao) => dona || opcao.valor !== "DEIXOU").map(
              (opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ),
            )}
          </Seletor>
          <SeloSincronizacao pendente={pendente} />
        </div>
      </div>

      {/* "Abrir a lista", e não "ver o que comprar": `/compras` monta a demanda
          dos pedidos e do piso, e o produto sem piso pode não estar lá. */}
      {faltas && faltas.produtos > 0 && (
        <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft p-4 text-label text-ink">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <p className="num">
              <span className="font-semibold">
                {faltas.produtos}{" "}
                {faltas.produtos === 1 ? "produto para" : "produtos param"} por
                falta de {faltas.materiais.length}{" "}
                {faltas.materiais.length === 1 ? "material" : "materiais"}:
              </span>{" "}
              {listarNomes(faltas.materiais, 4)}.
            </p>
            <Link
              href="/compras"
              className="toque mt-1 inline-flex items-center rounded-md text-label font-semibold text-brand-ink underline underline-offset-2"
            >
              Abrir a lista de compras
            </Link>
          </div>
        </div>
      )}

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
                  "hidden gap-x-4 border-b border-line px-4 py-2 text-micro font-semibold uppercase tracking-wide text-ink-muted",
                  selecionada ? "xl:grid" : "lg:grid",
                  COLUNAS_FICHA,
                )}
              >
                <span>Produto</span>
                <span className="text-right">Custo/un</span>
                <span className="text-right">Preço</span>
                <span className="text-right">Sobra/un</span>
                <span className="text-right">Vendeu</span>
                <span className="text-right">Deixou</span>
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
                    venda={vendaDoMes(produtosDoMes?.[ficha.id])}
                    selecionada={ficha.id === selecionada?.id}
                    comPainel={!!selecionada}
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
            capacidade={
              despensaPronta
                ? capacidades.get(selecionada.id)?.capacidade
                : undefined
            }
            pronto={
              despensaPronta ? capacidades.get(selecionada.id) : undefined
            }
            aoFechar={fecharPainel}
          />
        )}
      </div>
    </>
  );
}
