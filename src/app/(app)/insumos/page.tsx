"use client";

import { Info, Plus, ScanLine, X } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { BotaoBiblioteca } from "@/components/biblioteca/BotaoBiblioteca";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { FichaDoMaterial } from "@/components/insumos/FichaDoMaterial";
import { FormularioInsumo } from "@/components/insumos/FormularioInsumo";
import {
  COLUNAS_MATERIAL,
  LinhaInsumo,
} from "@/components/insumos/LinhaInsumo";
import {
  AvisoLeituraSemRede,
  EntradaLeitura,
} from "@/components/notas/EntradaLeitura";
import { Botao } from "@/components/ui/Botao";
import { BotaoMais } from "@/components/ui/BotaoMais";
import { Seletor } from "@/components/ui/Campo";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { temPrecoMedio } from "@/lib/domain/biblioteca";
import { custosDeHoje, usoDoMaterial } from "@/lib/domain/custoFicha";
import {
  CATEGORIAS_INSUMO,
  chaveDeBusca,
  ordenarMateriais,
  type OrdemMateriais,
} from "@/lib/domain/custoInsumo";
import { dataISODe } from "@/lib/domain/datas";
import { MENSAGEM_FALHA } from "@/lib/domain/notaFiscal";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type {
  CategoriaInsumo,
  FichaTecnica,
  Fornada,
  Insumo,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId, usePapel } from "@/providers/AuthProvider";

/** O `lg:` do Tailwind, para o toque decidir entre a coluna e o painel. */
const DESKTOP = "(min-width: 64rem)";

const ORDENS: { valor: OrdemMateriais; rotulo: string }[] = [
  { valor: "NOME", rotulo: "Pelo nome" },
  { valor: "PRECO_MUDOU", rotulo: "Preço mudou por último" },
  { valor: "PESO", rotulo: "Pesa mais nos produtos" },
];

/*
 * A ordem mora no aparelho (`#d226`). Navegador que bloqueia armazenamento
 * lança no acesso: tudo em `try/catch`, e quem não pode guardar volta ao nome.
 */
const CHAVE_ORDEM = "rende:ordem-materiais";

function ordemGuardada(): OrdemMateriais {
  try {
    const lida = localStorage.getItem(CHAVE_ORDEM);
    return ORDENS.find((ordem) => ordem.valor === lida)?.valor ?? "NOME";
  } catch {
    return "NOME";
  }
}

const semAssinatura = () => () => {};

/**
 * O material selecionado, ao lado da tabela, só no desktop (`#d225`): o
 * arranjo de `PainelProduto` (`#d130`), com a ficha do material dentro. A lista
 * continua clicável para trocar de material sem fechar nada.
 */
function FichaAcoplada({
  insumo,
  aoEditar,
  aoFechar,
  children,
}: {
  insumo: Insumo;
  aoEditar: () => void;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  // Ao abrir, e ao trocar de material, o foco vem para cá: é daqui que o
  // `Escape` devolve à linha.
  useEffect(() => {
    ref.current?.focus();
  }, [insumo.id]);

  function aoTeclar(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key !== "Escape") return;
    evento.stopPropagation();
    aoFechar();
  }

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={insumo.nome}
      onKeyDown={aoTeclar}
      className="hidden w-104 shrink-0 flex-col rounded-lg border border-line bg-surface outline-none lg:flex"
    >
      <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-title font-semibold text-ink">
            {insumo.nome}
          </h2>
          <p className="mt-1 text-label text-ink-muted">
            {[
              CATEGORIAS_INSUMO.find((c) => c.valor === insumo.categoria)
                ?.rotulo,
              insumo.marca,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="toque -mr-2 -mt-1 flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="px-5 py-5">{children}</div>

      {/* Secundário: o primário da tela continua sendo "Novo material". */}
      <footer className="border-t border-line px-5 py-4">
        <Botao onClick={aoEditar} className="w-full">
          Editar material
        </Botao>
      </footer>
    </aside>
  );
}

/** `PRECO_MEDIO` não é pílula: só a faixa entra nele, e "Ver todos" sai. */
type Filtro = CategoriaInsumo | "TODOS" | "PRECO_MEDIO";

const FILTROS: OpcaoPilula<Filtro>[] = [
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
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [emEdicao, setEmEdicao] = useState<Insumo | undefined>();
  const [painelAberto, setPainelAberto] = useState(false);
  // Tocar lê; editar é o botão do rodapé (`#d222`). "Novo" abre já editando.
  const [modo, setModo] = useState<"ver" | "editar">("ver");
  // O material na ficha ao lado, só no desktop (`#d225`).
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);
  // A guardada até ela escolher outra nesta visita; no servidor, o nome.
  const guardada = useSyncExternalStore(
    semAssinatura,
    ordemGuardada,
    () => "NOME" as const,
  );
  const [escolhida, setEscolhida] = useState<OrdemMateriais | null>(null);
  const ordem = escolhida ?? guardada;
  // O mesmo sinal de `EntradaLeitura`: sem rede, "Ler uma nota" na bandeja
  // nasce desabilitada e diz por quê.
  const online = useConexao();
  const dona = usePapel() === "DONA";

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

  // O que o forno levou desde a contagem de cada um: a linha diz a projeção.
  const consultaProducao = useMemo(
    () => consultaFornadas(contaId, hoje),
    [contaId, hoje],
  );
  const { dados: fornadas } = useColecao<Fornada>(consultaProducao);

  // A mesma consulta de `ListaFichas`, para cair no mesmo cache: "Onde entra"
  // abre sem rede para quem já abriu Produtos.
  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const custos = useMemo(
    () => custosDeHoje(fichas.dados, dados),
    [fichas.dados, dados],
  );
  const fichasProntas = !fichas.carregando && !fichas.erro;

  // Onde cada material entra: a coluna "Entra em" e a ordem "Pesa mais". Nulo
  // enquanto os produtos carregam, para a coluna não dizer "nenhum" por pressa.
  const usos = useMemo(
    () =>
      fichasProntas
        ? new Map(
            dados.map((insumo) => [
              insumo.id,
              usoDoMaterial(fichas.dados, insumo, custos),
            ]),
          )
        : null,
    [fichasProntas, fichas.dados, dados, custos],
  );
  // Partes de produtos diferentes somadas: uma ordem, nunca um número na tela.
  const peso = useMemo(
    () =>
      new Map(
        [...(usos ?? [])].map(([id, dele]) => [
          id,
          dele.reduce((soma, uso) => soma + uso.parte, 0),
        ]),
      ),
    [usos],
  );

  // O documento vivo, e não o da hora do toque: a ficha e o "anterior" da
  // escrita leem o que o cache tem agora.
  const aberto =
    emEdicao && (dados.find((insumo) => insumo.id === emEdicao.id) ?? emEdicao);

  // O critério é o do selo na linha (`temPrecoMedio`), não outro.
  const comPrecoMedio = useMemo(
    () => dados.filter(temPrecoMedio).length,
    [dados],
  );

  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    const filtrados = dados.filter((insumo) => {
      const combinaCategoria =
        filtro === "TODOS" ||
        (filtro === "PRECO_MEDIO"
          ? temPrecoMedio(insumo)
          : insumo.categoria === filtro);
      const combinaBusca = !termo || insumo.nomeBusca.includes(termo);
      return combinaCategoria && combinaBusca;
    });
    return ordenarMateriais(filtrados, ordem, peso);
  }, [dados, busca, filtro, ordem, peso]);

  // Derivado, e não guardado: arquivado aqui ou em outra aba, a ficha fecha.
  const selecionado = dados.find((insumo) => insumo.id === selecionadoId);

  function mudarOrdem(nova: OrdemMateriais) {
    setEscolhida(nova);
    try {
      localStorage.setItem(CHAVE_ORDEM, nova);
    } catch {
      // Sem armazenamento, a ordem vale só nesta visita.
    }
  }

  /** Fecha a ficha ao lado e devolve o foco à linha que estava selecionada. */
  function fecharFicha() {
    const linha = lista.current?.querySelector<HTMLElement>(
      'button[aria-current="true"]',
    );
    setSelecionadoId(null);
    linha?.focus();
  }

  /** No desktop, a ficha ao lado da tabela; abaixo de `lg`, a folha inferior. */
  function abrirMaterial(insumo: Insumo) {
    if (window.matchMedia(DESKTOP).matches) setSelecionadoId(insumo.id);
    else abrirFicha(insumo);
  }

  /** Da ficha ao lado, editar abre o painel já no formulário. */
  function editarSelecionado(insumo: Insumo) {
    setEmEdicao(insumo);
    setModo("editar");
    setPainelAberto(true);
  }

  function abrirNovo() {
    setEmEdicao(undefined);
    setModo("editar");
    setPainelAberto(true);
  }

  function abrirFicha(insumo: Insumo) {
    setEmEdicao(insumo);
    setModo("ver");
    setPainelAberto(true);
  }

  // Um botão primário por tela: enquanto o estado vazio ensina a tela, a ação
  // é dele (a biblioteca), e o botão do cabeçalho e o "+" saem.
  const estadoVazioNaTela = !carregando && !erro && dados.length === 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Materiais"
        descricao="Ingredientes e embalagens. É daqui que sai o custo de todo produto."
        acao={
          // No desktop as duas ações moram no cabeçalho; no celular só o "+",
          // e a bandeja é o único lugar delas (`DECISOES.md#d151`).
          <div className="flex items-start gap-2">
            <EntradaLeitura className="hidden lg:inline-flex" />
            {!estadoVazioNaTela && (
              <>
                <Botao
                  variante="primaria"
                  onClick={abrirNovo}
                  iconeInicial={
                    <Plus aria-hidden className="size-5" strokeWidth={2} />
                  }
                  className="hidden lg:inline-flex"
                >
                  Novo material
                </Botao>
                <BotaoMais
                  rotulo="Adicionar"
                  opcoes={[
                    {
                      rotulo: "Novo material",
                      icone: Plus,
                      onClick: abrirNovo,
                    },
                    // A nota é da dona (spec 030): lança a compra no caixa.
                    ...(dona
                      ? [
                          {
                            rotulo: "Ler uma nota",
                            icone: ScanLine,
                            href: "/insumos/nota" as const,
                            desabilitada: !online,
                            dica: MENSAGEM_FALHA["sem-rede"],
                          },
                        ]
                      : []),
                  ]}
                />
              </>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {/* A frase da entrada desabilitada vai aqui, e não embaixo do botão:
              é a faixa que tem a largura da página. No celular ela mora ao
              lado da opção que explica, na bandeja. */}
          <AvisoLeituraSemRede className="hidden lg:flex" />

          <CampoBusca
            rotulo="Buscar material"
            placeholder="Buscar material"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />

          <Pilulas
            rotulo="Categoria"
            opcoes={FILTROS}
            valor={filtro}
            aoMudar={setFiltro}
          />
        </div>
      </CabecalhoPagina>

      {/* O maior erro de custo do primeiro mês: o produto custado com a
          média da biblioteca, e não com o que ela paga. Dentro do filtro a
          linha da contagem já diz o mesmo. */}
      {comPrecoMedio > 0 && filtro !== "PRECO_MEDIO" && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-label text-ink">
          <Info
            aria-hidden
            className="mt-3 size-4 shrink-0 text-info"
            strokeWidth={1.75}
          />
          <p className="min-w-0 flex-1 py-2.5">
            {comPrecoMedio === 1
              ? "1 material ainda está"
              : `${comPrecoMedio} materiais ainda estão`}{" "}
            com o preço médio da biblioteca. Com o que você paga, o custo dos
            seus produtos fica seu.
          </p>
          <button
            type="button"
            onClick={() => setFiltro("PRECO_MEDIO")}
            className="toque shrink-0 rounded-md px-2 font-semibold text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
          >
            Mostrar esses
          </button>
        </div>
      )}

      <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {filtro === "PRECO_MEDIO" ? (
          <p className="flex items-center gap-1 text-label text-ink-muted">
            <span aria-live="polite">{visiveis.length} com preço médio</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setFiltro("TODOS")}
              className="toque -my-2 rounded-md px-2 font-semibold text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
            >
              Ver todos
            </button>
          </p>
        ) : (
          <p className="text-label text-ink-muted" aria-live="polite">
            {carregando
              ? "Carregando"
              : `${visiveis.length} ${visiveis.length === 1 ? "material" : "materiais"}`}
          </p>
        )}
        <div className="flex items-center gap-3">
          {/* O `select` nativo: no celular o próprio aparelho abre a folha. */}
          <Seletor
            rotulo="Ordem"
            value={ordem}
            onChange={(evento) =>
              mudarOrdem(evento.target.value as OrdemMateriais)
            }
            className="flex-row items-center gap-2"
          >
            {ORDENS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </Seletor>
          <SeloSincronizacao pendente={pendente} />
        </div>
      </div>

      {/* No desktop a tabela e a ficha do material selecionado dividem a
          largura: sem seleção, a tabela ocupa tudo (`#d225`, `#d130`). */}
      <div className="mt-2 lg:flex lg:items-start lg:gap-4">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface">
          {erro ? (
            <EstadoVazio
              titulo="Não deu para carregar seus materiais"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          ) : carregando ? (
            <EsqueletoLista />
          ) : visiveis.length === 0 ? (
            dados.length === 0 ? (
              <EstadoVazio
                titulo="Sua despensa começa aqui."
                descricao="Cadastre o que você compra: farinha, saquinho, caixa. O custo de cada doce sai sozinho."
                acao={
                  <div className="flex flex-col items-center gap-4">
                    <BotaoBiblioteca />
                    <div className="flex items-center gap-3">
                      <Botao variante="terciaria" onClick={abrirNovo}>
                        Cadastrar material
                      </Botao>
                      <EntradaLeitura tamanho="sm" />
                    </div>
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
            <>
              {/* O cabeçalho das colunas é para quem vê: cada célula da linha
                carrega o rótulo em `sr-only`. */}
              <div
                aria-hidden
                className={cn(
                  "hidden gap-x-4 border-b border-line px-4 py-2 text-micro font-semibold uppercase tracking-wide text-ink-muted",
                  selecionado ? "xl:grid" : "lg:grid",
                  COLUNAS_MATERIAL,
                )}
              >
                <span>Material</span>
                <span className="text-right">Compra</span>
                <span className="text-right">O quilo</span>
                <span className="text-right">Última compra</span>
                <span className="text-right">Despensa</span>
                <span className="text-right">Entra em</span>
              </div>
              <ul ref={lista} className="divide-y divide-line">
                {visiveis.map((insumo) => (
                  <LinhaInsumo
                    key={insumo.id}
                    insumo={insumo}
                    fornadas={fornadas}
                    hoje={hoje}
                    aoAbrir={abrirMaterial}
                    produtos={usos?.get(insumo.id)?.length}
                    selecionado={insumo.id === selecionado?.id}
                    comFicha={!!selecionado}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {selecionado && (
          <FichaAcoplada
            insumo={selecionado}
            aoEditar={() => editarSelecionado(selecionado)}
            aoFechar={fecharFicha}
          >
            <FichaDoMaterial
              insumo={selecionado}
              fichas={fichasProntas ? fichas.dados : null}
              custos={custos}
              fornadas={fornadas}
              hoje={hoje}
            />
          </FichaAcoplada>
        )}
      </div>

      <FormularioInsumo
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        insumo={aberto}
        leitura={
          aberto && modo === "ver" ? (
            <FichaDoMaterial
              insumo={aberto}
              fichas={fichasProntas ? fichas.dados : null}
              custos={custos}
              fornadas={fornadas}
              hoje={hoje}
            />
          ) : undefined
        }
        aoEditar={() => setModo("editar")}
        // Da ficha ao lado, "Cancelar" fecha o painel: a ficha já está na tela.
        aoVoltar={
          !emEdicao
            ? undefined
            : emEdicao.id === selecionado?.id
              ? () => setPainelAberto(false)
              : () => setModo("ver")
        }
        fichas={fichasProntas ? fichas.dados : null}
        materiais={dados}
      />
    </>
  );
}
