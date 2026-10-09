"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarRange,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FileQuestion,
  Info,
  RefreshCw,
  ScanLine,
  ShoppingCart,
} from "lucide-react";
import { EntradaContagem } from "@/components/estoque/EntradaContagem";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { AvisoLeituraSemRede } from "@/components/notas/EntradaLeitura";
import { Botao } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas } from "@/components/ui/Pilulas";
import { LinhaCompra, LinhaJaTem, LinhaPulada } from "./LinhaCompra";
import { PorqueDoItem } from "./PorqueDoItem";
import { RodapeCompras } from "./RodapeCompras";
import { agruparPorCorredor, ROTULO_CORREDOR } from "@/lib/domain/corredores";
import { diaVizinho, rotuloDia } from "@/lib/domain/datas";
import { contagemDoInsumo, entradasDaLista } from "@/lib/domain/estoque";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { useTelaAcesa } from "@/lib/hooks/useTelaAcesa";
import {
  entraNaLista,
  explodirDemanda,
  EXPLICACAO_PENDENCIA,
  HORIZONTE_MAXIMO,
  montarLista,
  orcamentosDeFora,
  precisaComprar,
  resumoDaLista,
  type Pendencia,
} from "@/lib/domain/listaCompras";
import { resumoDosItens } from "@/lib/domain/pedido";
import {
  consumoDesdeAContagem,
  produzidoParaPedidos,
  reservaDeProducao,
} from "@/lib/domain/producao";
import { guardarSemente } from "@/lib/estado/sementeDaContagem";
import { usePapel } from "@/providers/AuthProvider";
import {
  arquivarListaCompras,
  corrigirPrecoNaLista,
  criarListaCompras,
  marcarItemComprado,
  pularItem,
  regerarListaCompras,
} from "@/lib/firebase/mutations/listasCompra";
import type {
  Centavos,
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  ItemListaCompras,
  ListaCompras,
  Pedido,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Por quantos dias adiante a lista olha.
 *
 * Uma semana por padrão: é o horizonte de uma ida ao mercado. Os outros dois
 * existem para a semana de festa junina e para o Natal, quando ela compra o mês.
 */
const HORIZONTES = [7, 15, HORIZONTE_MAXIMO];

/**
 * A lista de compras, do pedido combinado até o carrinho.
 *
 * A demanda é recalculada em memória a cada render — é aritmética pura sobre
 * dados que a tela já tem —, mas o que ela **marcou** mora no documento. É essa
 * a razão de `listasCompra` ser coleção e não consulta: recalcular a demanda é
 * barato, e meia hora de carrinho não se recalcula.
 */
export function ListaDoMercado({
  contaId,
  lista,
  pedidos,
  fichas,
  insumos,
  fornadas,
  hoje,
  pendente,
}: {
  contaId: string;
  /** A lista aberta, ou nada enquanto a primeira não foi montada. */
  lista: ListaCompras | null;
  /** Os pedidos do maior horizonte, já ordenados por data de entrega. */
  pedidos: Pedido[];
  fichas: FichaTecnica[];
  insumos: Insumo[];
  /** As fornadas recentes: o que saiu da despensa e o que já virou massa. */
  fornadas: Fornada[];
  hoje: DataISO;
  pendente: boolean;
}) {
  const router = useRouter();
  const online = useConexao();
  // A nota é da dona: lança a compra no caixa (spec 030).
  const dona = usePapel() === "DONA";

  // O período nasce do que está gravado, e não de um padrão que ignoraria a
  // lista já montada: reabrir a tela no mercado precisa devolver o mesmo
  // recorte que ela usou para montar o carrinho.
  const [dias, setDias] = useState(() => horizonteDaLista(lista, hoje));
  const [falha, setFalha] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  // O porquê aberto (`#d303`). O id fica depois de fechar, para a folha sair
  // com o conteúdo dentro.
  const [porqueId, setPorqueId] = useState<string | null>(null);
  const [porqueAberto, setPorqueAberto] = useState(false);

  const periodoFim = useMemo(() => diaVizinho(hoje, dias), [hoje, dias]);

  const noPeriodo = useMemo(
    () => pedidos.filter((pedido) => entraNaLista(pedido, hoje, periodoFim)),
    [pedidos, hoje, periodoFim],
  );
  const orcamentos = useMemo(
    () => orcamentosDeFora(pedidos, hoje, periodoFim),
    [pedidos, hoje, periodoFim],
  );

  /**
   * O que as fichas com piso querem sempre poder fazer (`#d96`). Serve à
   * montagem, e serve à linha para dizer de quem é a reserva — os nomes vêm
   * das fichas vivas, como o tamanho do pacote vem do insumo vivo.
   */
  const reserva = useMemo(() => reservaDeProducao(fichas), [fichas]);

  /**
   * A lista como ela ficaria se fosse montada agora. É o que "Refazer" grava.
   *
   * Com a massa dentro: o que saiu desde a contagem de cada insumo desce da
   * despensa, e o que já virou massa **para estes pedidos** sai da demanda. E
   * com o piso dentro: a reserva entra como demanda ao lado dos pedidos. Sem
   * fornada registrada e sem piso, os três mapas são vazios e a lista é a de
   * sempre.
   */
  const montada = useMemo(() => {
    const demanda = explodirDemanda(noPeriodo, fichas);
    return montarLista(demanda, insumos, hoje, {
      consumo: consumoDesdeAContagem(fornadas, insumos),
      produzido: produzidoParaPedidos(fornadas, demanda.pedidoIds),
      piso: reserva,
    });
  }, [noPeriodo, fichas, insumos, fornadas, hoje, reserva]);

  const porInsumo = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  /**
   * Escreve sem esperar o servidor.
   *
   * É a única tela do sistema que despacha assim, e o motivo é o contexto 2 do
   * `PRODUCT.md`: mercado, uma mão no carrinho, sinal ruim. A promessa de uma
   * escrita do Firestore **não resolve enquanto não há rede** — ela fica
   * pendente até a reconexão —, então um `await` aqui deixaria a tela travada em
   * "salvando" no exato lugar em que ela mais é usada.
   *
   * O que desenha a tela é o cache local, que já aplicou a escrita: a linha
   * aparece marcada no toque, e o selo de sincronização conta a verdade sobre o
   * que ainda não subiu. A falha de verdade — permissão, documento sumido —
   * continua chegando pelo `catch`.
   */
  function despachar(escrita: Promise<unknown>, aviso: string) {
    setFalha(null);
    escrita.catch(() => setFalha(aviso));
  }

  const dadosDaLista = () => ({
    periodoInicio: hoje,
    periodoFim,
    pedidoIds: noPeriodo.map((pedido) => pedido.id),
    linhas: montada.linhas,
    anteriores: lista?.itens,
  });

  const montar = () =>
    despachar(
      lista
        ? regerarListaCompras(contaId, lista.id, dadosDaLista())
        : criarListaCompras(contaId, dadosDaLista()),
      "Não deu para montar a lista agora. Tente de novo em instantes.",
    );

  const marcar = (insumoId: string, comprado: boolean) => {
    if (!lista) return;
    despachar(
      marcarItemComprado(contaId, lista, insumoId, comprado),
      "Não deu para marcar este item agora.",
    );
  };

  const pular = (insumoId: string, pulado: boolean) => {
    if (!lista) return;
    despachar(
      pularItem(contaId, lista, insumoId, pulado),
      pulado
        ? "Não deu para deixar este item para a próxima agora."
        : "Não deu para voltar este item para a lista agora.",
    );
  };

  const corrigirPreco = (insumo: Insumo, preco: Centavos) => {
    despachar(
      corrigirPrecoNaLista(contaId, insumo, preco, lista),
      "Não deu para salvar o preço agora.",
    );
  };

  const fechar = () => {
    if (!lista) return;
    despachar(
      arquivarListaCompras(contaId, lista.id),
      "Não deu para fechar a lista agora.",
    );
    setConfirmandoFechar(false);
  };

  const itens = useMemo(() => lista?.itens ?? [], [lista]);
  const aComprar = itens.filter(precisaComprar);
  const jaTem = itens.filter((item) => !precisaComprar(item));
  const resumo = resumoDaLista(itens);
  // O marcado sai do corredor e desce para "No carrinho" (`#d300`): riscado no
  // lugar, ele obrigava a reler cada corredor. Agrupar também o carrinho mantém
  // a ordem da loja ali embaixo.
  // O pulado sai dos dois e desce para "Fica pra próxima" (`#d304`).
  const corredores = agruparPorCorredor(
    aComprar.filter((i) => !i.comprado && !i.pulado),
  );
  const noCarrinho = agruparPorCorredor(
    aComprar.filter((i) => i.comprado && !i.pulado),
  ).flatMap((corredor) => corredor.itens);
  const pulados = agruparPorCorredor(aComprar.filter((i) => i.pulado)).flatMap(
    (corredor) => corredor.itens,
  );

  const linha = (item: ItemListaCompras) => (
    <LinhaCompra
      key={item.insumoId}
      item={item}
      insumo={porInsumo.get(item.insumoId)}
      hoje={hoje}
      aoMarcar={(comprado) => marcar(item.insumoId, comprado)}
      aoAbrirPorque={() => {
        setPorqueId(item.insumoId);
        setPorqueAberto(true);
      }}
    />
  );

  // Os pedidos que entraram na lista gravada: são eles que dizem de quem é.
  const pedidosDaLista = useMemo(() => {
    const ids = new Set(lista?.pedidoIds ?? []);
    return pedidos.filter((pedido) => ids.has(pedido.id));
  }, [lista, pedidos]);

  /**
   * Os insumos do carrinho em que a lista não confiou.
   *
   * É o que a frase do topo conta. A conta é sobre os itens **gravados**, e não
   * sobre a lista recalculada: é o carrinho que ela está olhando que precisa de
   * explicação.
   */
  const semContagem = useMemo(
    () =>
      itens.filter((item) => {
        const insumo = porInsumo.get(item.insumoId);
        if (!insumo) return false;
        const { frescor } = contagemDoInsumo(insumo, hoje);
        return frescor === "VENCIDA" || frescor === "NUNCA";
      }),
    [itens, porInsumo, hoje],
  );

  /**
   * A lista gravada ficou para trás do que a conta diria hoje.
   *
   * Medida em `quantidadePacotes`, e deliberadamente não específica de estoque:
   * a mesma comparação pega mudança de embalagem e pedido confirmado depois.
   * `/compras` desenha `lista.itens`, então sem refazer contar a despensa
   * pareceria não fazer nada.
   *
   * Só vale no mesmo período: com o período divergente, `montada` é de outro
   * recorte e a comparação não diz nada.
   */
  const desatualizada = useMemo(() => {
    if (!lista || lista.periodoFim !== periodoFim) return false;

    const agora = new Map(
      montada.linhas.map((linha) => [linha.insumoId, linha.quantidadePacotes]),
    );
    if (agora.size !== itens.length) return true;

    return itens.some(
      (item) => agora.get(item.insumoId) !== item.quantidadePacotes,
    );
  }, [lista, periodoFim, montada, itens]);

  const periodoMudou = !!lista && lista.periodoFim !== periodoFim;
  const algoMarcado = itens.some((item) => item.comprado);
  const ficouParaTras = periodoMudou || desatualizada;

  /**
   * Sem nada marcado a lista se refaz sozinha (`#d301`): não há carrinho a
   * perder, e o que ela vê passa a ser sempre a lista do período escolhido.
   *
   * A assinatura (período e quantidades) segura o laço: a mesma não se escreve
   * duas vezes, nem quando a escrita ainda não voltou do cache. Duas abas que
   * refazem com a mesma entrada gravam o mesmo corpo.
   */
  const assinatura = `${periodoFim}|${montada.linhas
    .map((l) => `${l.insumoId}:${l.quantidadePacotes}`)
    .join(",")}`;
  const despachada = useRef<string | null>(null);
  useEffect(() => {
    if (!lista || algoMarcado || !ficouParaTras) return;
    if (despachada.current === assinatura) return;
    despachada.current = assinatura;
    regerarListaCompras(contaId, lista.id, dadosDaLista()).catch(() =>
      setFalha(
        "Não deu para refazer a lista agora. Tente de novo em instantes.",
      ),
    );
  });

  // A tela não apaga entre um corredor e outro (`#d302`).
  useTelaAcesa(!!lista && resumo.comprados < resumo.aComprar);

  /**
   * O que ela marcou como comprado, pronto para semear a contagem.
   *
   * O tamanho do pacote sai do insumo vivo, e não da linha gravada: é lá que ele
   * muda quando a marca do mercado muda.
   */
  const entradasDaCompra = useMemo(
    () => entradasDaLista(itens, insumos),
    [itens, insumos],
  );

  const guardarNaDespensa = () => {
    if (!lista) return;
    guardarSemente({ origem: "LISTA", entradas: entradasDaCompra });
    fechar();
    router.push("/insumos/contagem");
  };

  // A nota faz o que "guardar na despensa" faz e mais dois: corrige os preços e
  // lança a compra no caixa. Fecha a lista do mesmo jeito, e a contagem que a
  // nota propõe volta para `/compras` sem lista — a compra acabou.
  const fecharELerANota = () => {
    fechar();
    router.push("/insumos/nota");
  };

  // O rodapé abre o mesmo bloco lá embaixo, e o foco vai com ele.
  const abrirFechar = () => {
    setConfirmandoFechar(true);
    requestAnimationFrame(() =>
      document.getElementById("fechar-lista")?.focus(),
    );
  };

  /**
   * As saídas do fechar, na ordem em que uma vence a outra (`#d301`): a nota faz
   * o que a despensa faz e mais dois, e a despensa faz o que o fechar faz e mais
   * um. O primário é a primeira que dá para usar agora; o resto vai embaixo.
   */
  const saidas: Saida[] = [
    ...(dona
      ? [
          {
            rotulo: "Ler a nota e fechar",
            frase:
              "Corrige os preços, lança a compra no caixa e propõe a contagem.",
            Icone: ScanLine,
            acao: fecharELerANota,
            desligada: !online,
          },
        ]
      : []),
    ...(entradasDaCompra.size > 0
      ? [
          {
            rotulo: "Guardar na despensa e fechar",
            frase: `Abre a contagem já somada com ${entradasDaCompra.size === 1 ? "o item que você marcou" : `os ${entradasDaCompra.size} itens que você marcou`}.`,
            Icone: ClipboardList,
            acao: guardarNaDespensa,
          },
        ]
      : []),
    {
      rotulo: "Fechar a lista",
      frase: "Guarda a lista como está, e a próxima nasce limpa.",
      Icone: Archive,
      acao: fechar,
    },
  ];
  const primaria = saidas.find((saida) => !saida.desligada) ?? saidas[0]!;
  const outras = saidas.filter((saida) => saida !== primaria);

  return (
    <>
      <CabecalhoPagina
        titulo="Lista de compras"
        pendente={pendente}
        recolhe
        descricao="O que os pedidos já fechados e a reserva de fornadas vão exigir do mercado, em pacote e em reais."
        acao={
          // Contar aparece **também quando não há lista**: domingo à noite sem
          // pedido confirmado é exatamente quando ela conta. Some enquanto o
          // cartão da contagem está na tela, que tem o dele ao lado do motivo
          // (`#d301`). "Refazer" saiu daqui: sem marcado a lista se refaz
          // sozinha, e com marcado o botão mora na faixa que diz por quê.
          semContagem.length === 0 ? <EntradaContagem /> : undefined
        }
      >
        <Periodo
          dias={dias}
          aoMudar={setDias}
          hoje={hoje}
          periodoFim={periodoFim}
          pedidos={noPeriodo.length}
        />
      </CabecalhoPagina>

      {/* O respiro acompanha o rodapé (`#d300`), que no celular ganha a linha
          de "Fechar a lista" com tudo marcado (`#d301`). */}
      <div
        className={cn(
          "mt-4 space-y-4",
          lista &&
            (resumo.aComprar > 0 && resumo.restante === 0
              ? "pb-56 sm:pb-40 lg:pb-32"
              : "pb-40 lg:pb-32"),
        )}
      >
        {/* Com algo marcado a lista não se refaz sozinha, e a tela diz que
            ficou para trás numa faixa só, com o botão dentro (`#d301`): é a
            ação da tela enquanto a faixa existe. A frase da conta não jura
            "você contou": a mesma comparação pega um pedido confirmado agora e
            um pacote de tamanho diferente. */}
        {lista && algoMarcado && ficouParaTras && (
          <section
            aria-label="A lista ficou para trás"
            className="rounded-lg border border-info/30 bg-info-soft p-4 lg:p-5"
          >
            <p className="flex items-start gap-2.5 text-label text-ink">
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-info"
                strokeWidth={1.75}
              />
              <span className="num max-w-[60ch]">
                {periodoMudou ? (
                  <>
                    Esta lista é de até{" "}
                    <strong className="font-semibold">
                      {rotuloDia(lista.periodoFim)}
                    </strong>
                    , e o período escolhido vai até {rotuloDia(periodoFim)}.
                  </>
                ) : (
                  "A conta mudou depois desta lista: uma contagem da despensa, um pedido novo ou outro tamanho de pacote."
                )}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Botao
                variante="primaria"
                tamanho="lg"
                onClick={montar}
                iconeInicial={
                  <RefreshCw
                    aria-hidden
                    className="size-5"
                    strokeWidth={1.75}
                  />
                }
              >
                Refazer
              </Botao>
              <p className="text-label text-ink-muted">
                O que você já marcou continua marcado.
              </p>
            </div>
          </section>
        )}

        {semContagem.length > 0 && (
          <SemContagemRecente itens={semContagem} total={itens.length} />
        )}

        {!lista ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo={
                montada.linhas.length === 0
                  ? "Nada pra comprar por enquanto."
                  : "Da encomenda para o carrinho"
              }
              descricao={
                noPeriodo.length > 0
                  ? `São ${noPeriodo.length} ${noPeriodo.length === 1 ? "pedido confirmado" : "pedidos confirmados"} neste período. O sistema soma o que os produtos consomem, desconta o que você já tem e diz quantos pacotes faltam.`
                  : reserva.size > 0
                    ? "Nenhum pedido confirmado neste período, mas há produto com fornada de reserva. O sistema soma o que a reserva consome, desconta o que você já tem e diz quantos pacotes faltam."
                    : "Quando você confirmar um pedido, a lista aparece aqui: só o que falta na despensa."
              }
              acao={
                <Botao
                  variante="primaria"
                  tamanho="lg"
                  disabled={montada.linhas.length === 0}
                  onClick={montar}
                  iconeInicial={
                    <ShoppingCart
                      aria-hidden
                      className="size-5"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Montar a lista
                </Botao>
              }
            />
          </div>
        ) : aComprar.length === 0 && jaTem.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Nada a comprar por enquanto"
              descricao="Nenhum pedido confirmado neste período consome material, e nenhum produto pede reserva. Confirme um orçamento ou aumente o período."
            />
          </div>
        ) : (
          <>
            {corredores.map((corredor) => (
              <section
                key={corredor.categoria}
                aria-labelledby={`corredor-${corredor.categoria}`}
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <h2
                  id={`corredor-${corredor.categoria}`}
                  className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
                >
                  {ROTULO_CORREDOR[corredor.categoria]}
                </h2>
                <ul className="divide-y divide-line">
                  {corredor.itens.map(linha)}
                </ul>
              </section>
            ))}

            {noCarrinho.length > 0 && (
              <section
                aria-labelledby="no-carrinho"
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <h2
                  id="no-carrinho"
                  className="num border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
                >
                  No carrinho
                  <span className="mx-1.5 text-ink-subtle">·</span>
                  {noCarrinho.length}
                </h2>
                <ul className="divide-y divide-line">
                  {noCarrinho.map(linha)}
                </ul>
              </section>
            )}

            {pulados.length > 0 && (
              <section
                aria-labelledby="fica-pra-proxima"
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5">
                  <h2
                    id="fica-pra-proxima"
                    className="num text-subheading font-semibold text-ink"
                  >
                    Fica pra próxima
                    <span className="mx-1.5 text-ink-subtle">·</span>
                    {pulados.length}
                  </h2>
                  <p className="mt-0.5 text-label text-ink-muted">
                    Fora do que falta. Refazer a lista não traz de volta.
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {pulados.map((item) => (
                    <LinhaPulada
                      key={item.insumoId}
                      item={item}
                      insumo={porInsumo.get(item.insumoId)}
                      aoLevar={() => pular(item.insumoId, false)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Fechado: dezenove linhas de conferência embaixo de oito de
                compra empurravam "Fechar esta lista" três telas para baixo
                (`#d300`). Continua à vista, a um toque. */}
            {jaTem.length > 0 && (
              <details className="group overflow-hidden rounded-lg border border-line bg-surface">
                <summary className="toque flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken lg:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="num block text-subheading text-ink">
                      <strong className="font-semibold">{jaTem.length}</strong>{" "}
                      você já tem em casa
                    </span>
                    <span className="mt-0.5 block text-label text-ink-muted">
                      A contagem ou a fornada já cobre estes.
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted transition-transform duration-150 ease-quart group-open:rotate-180"
                    strokeWidth={1.75}
                  />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {jaTem.map((item) => (
                    <LinhaJaTem
                      key={item.insumoId}
                      item={item}
                      insumo={porInsumo.get(item.insumoId)}
                      reservaPara={reserva.get(item.insumoId)?.fichas}
                      hoje={hoje}
                    />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {montada.pendencias.length > 0 && (
          <NaoExplodiu pendencias={montada.pendencias} />
        )}

        {orcamentos.length > 0 && (
          <Orcamentos pedidos={orcamentos} hoje={hoje} />
        )}

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {lista &&
          (confirmandoFechar ? (
            // Um primário pelo contexto e o resto embaixo de "Ou" (`#d301`).
            // A despensa propõe a contagem com os campos preenchidos, e não
            // grava: a compra sabe quanto entrou e não o que saiu desde então.
            <section
              id="fechar-lista"
              tabIndex={-1}
              aria-labelledby="fechar-lista-titulo"
              className="rounded-lg border border-line-strong bg-sunken p-4 outline-none lg:p-5"
            >
              <h2
                id="fechar-lista-titulo"
                className="text-subheading font-semibold text-ink"
              >
                A compra terminou?
              </h2>

              <div className="mt-3">
                <Botao
                  variante="primaria"
                  tamanho="lg"
                  larguraTotal
                  className="sm:w-auto"
                  onClick={primaria.acao}
                  iconeInicial={
                    <primaria.Icone
                      aria-hidden
                      className="size-5"
                      strokeWidth={1.75}
                    />
                  }
                >
                  {primaria.rotulo}
                </Botao>
                <p className="mt-1.5 max-w-[60ch] text-label text-ink-muted">
                  {primaria.frase}
                </p>
              </div>

              {outras.length > 0 && (
                <div className="mt-5">
                  <p className="text-label text-ink-muted">Ou</p>
                  <ul className="mt-1 space-y-2">
                    {outras.map((saida) => (
                      <li key={saida.rotulo}>
                        <Botao
                          variante="terciaria"
                          tamanho="sm"
                          className="-ml-3"
                          disabled={saida.desligada}
                          onClick={saida.acao}
                          iconeInicial={
                            <saida.Icone
                              aria-hidden
                              className="size-4"
                              strokeWidth={1.75}
                            />
                          }
                        >
                          {saida.rotulo}
                        </Botao>
                        <p className="max-w-[60ch] text-label text-ink-muted">
                          {saida.frase}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <AvisoLeituraSemRede className="mt-3" />
                </div>
              )}

              <div className="mt-4 border-t border-line pt-3">
                <Botao
                  variante="terciaria"
                  tamanho="sm"
                  className="-ml-3"
                  onClick={() => setConfirmandoFechar(false)}
                >
                  Voltar
                </Botao>
              </div>
            </section>
          ) : (
            <div className="border-t border-line pt-5">
              <Botao
                tamanho="sm"
                onClick={abrirFechar}
                iconeInicial={
                  <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Fechar esta lista
              </Botao>
            </div>
          ))}
      </div>

      <PorqueDoItem
        aberto={porqueAberto}
        aoFechar={() => setPorqueAberto(false)}
        item={itens.find((item) => item.insumoId === porqueId)}
        insumo={porqueId ? porInsumo.get(porqueId) : undefined}
        pedidos={pedidosDaLista}
        fichas={fichas}
        materiais={insumos}
        reservaPara={porqueId ? reserva.get(porqueId)?.fichas : undefined}
        hoje={hoje}
        aoSalvarPreco={corrigirPreco}
        aoPular={() => porqueId && pular(porqueId, true)}
      />

      {lista && (
        <RodapeCompras
          resumo={resumo}
          aoFechar={confirmandoFechar ? undefined : abrirFechar}
        />
      )}
    </>
  );
}

interface Saida {
  rotulo: string;
  frase: string;
  Icone: typeof Archive;
  acao: () => void;
  /** Sem rede, a nota não lê: fica embaixo, desligada, com o aviso. */
  desligada?: boolean;
}

/** O horizonte que a lista gravada usou, para a tela reabrir no mesmo recorte. */
function horizonteDaLista(lista: ListaCompras | null, hoje: DataISO): number {
  if (!lista) return HORIZONTES[0] ?? 7;

  const combina = HORIZONTES.find(
    (dias) => diaVizinho(hoje, dias) === lista.periodoFim,
  );
  return combina ?? HORIZONTES[0] ?? 7;
}

/**
 * De hoje até quando.
 *
 * Sempre começa hoje: comprar para uma entrega de ontem não é lista de compras,
 * é atraso — e atraso a agenda de `/pedidos` já mostra.
 */
function Periodo({
  dias,
  aoMudar,
  hoje,
  periodoFim,
  pedidos,
}: {
  dias: number;
  aoMudar: (dias: number) => void;
  hoje: DataISO;
  periodoFim: DataISO;
  pedidos: number;
}) {
  return (
    <div>
      <Pilulas
        rotulo="Período"
        numerico
        opcoes={HORIZONTES.map((opcao) => ({
          valor: opcao,
          rotulo: `${opcao} dias`,
        }))}
        valor={dias}
        aoMudar={aoMudar}
      />

      <p className="num mt-2 flex items-center gap-2 text-label text-ink-muted">
        <CalendarRange
          aria-hidden
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
        <span>
          De {rotuloDia(hoje)} a {rotuloDia(periodoFim)}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {pedidos} {pedidos === 1 ? "pedido" : "pedidos"} para produzir
        </span>
      </p>
    </div>
  );
}

/**
 * A frase que explica um carrinho maior do que ela esperava.
 *
 * A lista deixou de descontar o que não sabe: contagem vencida e contagem
 * inexistente valem "não sei", e ela compra a quantidade física inteira. A
 * escolha é entre dois erros e eles não custam o mesmo — descontar um número
 * velho erra para baixo e produz a fornada de sexta que não acontece; não
 * descontar erra para cima e produz um pacote a mais na prateleira, que volta na
 * semana seguinte.
 *
 * **Sem esta frase a decisão seria indefensável.** Uma lista que passa a comprar
 * mais e não diz por quê é pior do que a lista de antes, e por isso o atalho
 * para contar vem junto do motivo, e não em outra tela.
 */
function SemContagemRecente({
  itens,
  total,
}: {
  itens: ItemListaCompras[];
  total: number;
}) {
  const quantos = itens.length;
  const todos = quantos === total;

  return (
    <section
      aria-labelledby="sem-contagem"
      className="rounded-lg border border-line-strong bg-sunken p-4 lg:p-5"
    >
      <h2
        id="sem-contagem"
        className="flex items-center gap-2 text-subheading font-semibold text-ink"
      >
        <ClipboardList
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        {todos
          ? "A lista está comprando tudo"
          : "Parte da lista está sendo comprada inteira"}
      </h2>

      <p className="mt-2 max-w-[62ch] text-label text-ink">
        {todos ? "Sem descontar o que você já tem: " : "Sem descontar: "}
        <strong className="num font-semibold">
          {quantos} {quantos === 1 ? "material está" : "materiais estão"}
        </strong>{" "}
        sem contagem recente. Contar leva dois minutos e pode tirar itens do
        carrinho.
      </p>

      <p className="num mt-1.5 max-w-[62ch] text-label text-ink-muted">
        {itens.map((item) => item.nome).join(" · ")}
      </p>

      <div className="mt-3">
        <EntradaContagem tamanho="sm" />
      </div>
    </section>
  );
}

/**
 * O que a explosão não conseguiu somar.
 *
 * Aparece porque omitir a linha seria pior: o pedido guarda o nome congelado do
 * que foi vendido, então a lista sabe dizer o nome do que ficou de fora — e
 * dizer isso é melhor do que uma lista silenciosamente incompleta.
 */
function NaoExplodiu({ pendencias }: { pendencias: Pendencia[] }) {
  return (
    <section
      aria-labelledby="nao-explodiu"
      className="rounded-lg border border-attention/30 bg-attention-soft p-4 lg:p-5"
    >
      <h2
        id="nao-explodiu"
        className="flex items-center gap-2 text-subheading font-semibold text-ink"
      >
        <CircleAlert
          aria-hidden
          className="size-5 shrink-0 text-attention"
          strokeWidth={1.75}
        />
        Isto ficou fora da conta
      </h2>

      <ul className="mt-2 space-y-1">
        {pendencias.map((pendencia) => (
          <li
            key={`${pendencia.motivo}-${pendencia.nome}`}
            className="text-label text-ink"
          >
            <strong className="font-semibold">{pendencia.nome}</strong>:{" "}
            {EXPLICACAO_PENDENCIA[pendencia.motivo]}.
          </li>
        ))}
      </ul>

      <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
        A lista soma o resto normalmente. Confira estes na mão antes de sair, ou
        acerte o produto e refaça a lista.
      </p>
    </section>
  );
}

/**
 * Os orçamentos do período, que a lista deixou de fora de propósito.
 *
 * Comprar insumo para uma proposta que talvez não feche é dinheiro parado na
 * despensa. Mas uma lista que some com um pedido sem dizer por quê é uma lista
 * em que ela para de confiar, então cada orçamento vira um atalho para a tela
 * onde se confirma.
 */
function Orcamentos({ pedidos, hoje }: { pedidos: Pedido[]; hoje: DataISO }) {
  return (
    <section
      aria-labelledby="orcamentos-de-fora"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5">
        <h2
          id="orcamentos-de-fora"
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          <FileQuestion
            aria-hidden
            className="size-5 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
          {pedidos.length}{" "}
          {pedidos.length === 1
            ? "orçamento ficou de fora"
            : "orçamentos ficaram de fora"}
        </h2>
        <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
          Proposta que a cliente ainda não aceitou não entra na compra. Confirme
          o que já fechou e refaça a lista.
        </p>
      </div>

      <ul className="divide-y divide-line">
        {pedidos.map((pedido) => (
          <li key={pedido.id}>
            <Link
              href={`/pedidos/${pedido.id}`}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
            >
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-ink">
                  {pedido.clienteNome}
                </span>
                <span className="num mt-0.5 block truncate text-label text-ink-muted">
                  {resumoDosItens(pedido.itens, 1)}
                </span>
              </span>
              <span className="num shrink-0 text-label text-ink-muted">
                {pedido.dataEntregaISO === hoje
                  ? "hoje"
                  : rotuloDia(pedido.dataEntregaISO)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
