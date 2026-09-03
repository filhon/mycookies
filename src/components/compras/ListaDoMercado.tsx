"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Archive,
  CalendarRange,
  CircleAlert,
  ClipboardList,
  FileQuestion,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { EntradaContagem } from "@/components/estoque/EntradaContagem";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Botao } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaCompra, LinhaJaTem } from "./LinhaCompra";
import { RodapeCompras } from "./RodapeCompras";
import { agruparPorCorredor, ROTULO_CORREDOR } from "@/lib/domain/corredores";
import { diaVizinho, rotuloDia } from "@/lib/domain/datas";
import { contagemDoInsumo, entradasDaLista } from "@/lib/domain/estoque";
import {
  entraNaLista,
  explodirDemanda,
  EXPLICACAO_PENDENCIA,
  montarLista,
  orcamentosDeFora,
  precisaComprar,
  resumoDaLista,
  type Pendencia,
} from "@/lib/domain/listaCompras";
import { resumoDosItens } from "@/lib/domain/pedido";
import { guardarSemente } from "@/lib/estado/sementeDaContagem";
import {
  arquivarListaCompras,
  corrigirPrecoNaLista,
  criarListaCompras,
  marcarItemComprado,
  regerarListaCompras,
} from "@/lib/firebase/mutations/listasCompra";
import type {
  Centavos,
  DataISO,
  FichaTecnica,
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
const HORIZONTES = [7, 15, 30];

/** O maior deles, que é o recorte da consulta. O resto é filtro em memória. */
export const HORIZONTE_MAXIMO = 30;

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
  hoje: DataISO;
  pendente: boolean;
}) {
  const router = useRouter();

  // O período nasce do que está gravado, e não de um padrão que ignoraria a
  // lista já montada: reabrir a tela no mercado precisa devolver o mesmo
  // recorte que ela usou para montar o carrinho.
  const [dias, setDias] = useState(() => horizonteDaLista(lista, hoje));
  const [falha, setFalha] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  const periodoFim = useMemo(() => diaVizinho(hoje, dias), [hoje, dias]);

  const noPeriodo = useMemo(
    () => pedidos.filter((pedido) => entraNaLista(pedido, hoje, periodoFim)),
    [pedidos, hoje, periodoFim],
  );
  const orcamentos = useMemo(
    () => orcamentosDeFora(pedidos, hoje, periodoFim),
    [pedidos, hoje, periodoFim],
  );

  /** A lista como ela ficaria se fosse montada agora. É o que "Refazer" grava. */
  const montada = useMemo(
    () => montarLista(explodirDemanda(noPeriodo, fichas), insumos, hoje),
    [noPeriodo, fichas, insumos, hoje],
  );

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
  const corredores = agruparPorCorredor(aComprar);

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
   * Sem a frase, contar a despensa pareceria não fazer nada — `/compras` desenha
   * `lista.itens`, e quem refaz é o botão.
   *
   * Cala quando o período divergiu, porque aí a frase do período já está
   * mandando refazer, e duas frases dizendo a mesma coisa é uma a mais.
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

  return (
    <>
      <CabecalhoPagina
        titulo="Lista de compras"
        descricao="O que os pedidos já fechados vão exigir do mercado, em pacote e em reais."
        acao={
          // Em coluna no celular: as duas ações lado a lado espremeriam o
          // título em 360px. Contar aparece **também quando não há lista** —
          // domingo à noite sem pedido confirmado é exatamente quando ela conta.
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
            <EntradaContagem />
            {lista && (
              <Botao
                onClick={montar}
                iconeInicial={
                  <RefreshCw
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                }
              >
                Refazer
              </Botao>
            )}
          </div>
        }
      >
        <Periodo
          dias={dias}
          aoMudar={setDias}
          hoje={hoje}
          periodoFim={periodoFim}
          pedidos={noPeriodo.length}
          pendente={pendente}
        />
      </CabecalhoPagina>

      <div className={cn("mt-4 space-y-4", lista && "pb-52 lg:pb-44")}>
        {/* A lista na tela é a gravada, e o período acima é o escolhido. Quando
            os dois divergem, dizer isso é obrigatório: sem a frase, as pílulas
            estariam descrevendo uma lista que não é a que está embaixo delas. */}
        {lista && lista.periodoFim !== periodoFim && (
          <p className="rounded-lg border border-line bg-sunken px-4 py-3 text-label text-ink-muted">
            Esta lista foi montada para as entregas até{" "}
            <span className="num font-semibold text-ink">
              {rotuloDia(lista.periodoFim)}
            </span>
            . Toque em <strong className="font-semibold">Refazer</strong> para
            incluir as de até {rotuloDia(periodoFim)} — o que você já marcou
            continua marcado.
          </p>
        )}

        {/* Contar depois de montar a lista não muda a lista gravada: `/compras`
            desenha `lista.itens`, e quem refaz é o botão. Sem esta frase,
            contar pareceria não fazer nada — e ela não contaria de novo na
            semana seguinte, que é a aposta desta spec inteira.

            A frase nomeia a contagem primeiro porque é a causa mais provável e
            é a que ela acabou de provocar, mas não afirma só isso: a mesma
            comparação de `quantidadePacotes` pega um pedido confirmado agora e
            um pacote de tamanho diferente, e uma frase que jurasse "você
            contou" seria falsa nesses dois casos. */}
        {desatualizada && (
          <p className="rounded-lg border border-line bg-sunken px-4 py-3 text-label text-ink-muted">
            A conta mudou depois que esta lista foi montada — uma contagem da
            despensa, um pedido novo, outro tamanho de pacote. Toque em{" "}
            <strong className="font-semibold text-ink">Refazer</strong> para
            descontar o que você tem agora — o que já está marcado continua
            marcado.
          </p>
        )}

        {semContagem.length > 0 && (
          <SemContagemRecente itens={semContagem} total={itens.length} />
        )}

        {!lista ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Da encomenda para o carrinho"
              descricao={
                noPeriodo.length === 0
                  ? "Assim que houver um pedido confirmado para os próximos dias, o sistema soma o que cada receita consome e diz quantos pacotes comprar."
                  : `São ${noPeriodo.length} ${noPeriodo.length === 1 ? "pedido confirmado" : "pedidos confirmados"} neste período. O sistema soma o que as receitas consomem, desconta o que você já tem e diz quantos pacotes faltam.`
              }
              acao={
                <Botao
                  variante="primaria"
                  tamanho="lg"
                  disabled={noPeriodo.length === 0}
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
              descricao="Nenhum pedido confirmado neste período consome insumo. Confirme um orçamento ou aumente o período, e refaça a lista."
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
                  {corredor.itens.map((item) => (
                    <LinhaCompra
                      key={item.insumoId}
                      item={item}
                      insumo={porInsumo.get(item.insumoId)}
                      hoje={hoje}
                      aoMarcar={(comprado) => marcar(item.insumoId, comprado)}
                      aoCorrigirPreco={(insumo, preco) =>
                        corrigirPreco(insumo, preco)
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}

            {jaTem.length > 0 && (
              <section
                aria-labelledby="ja-tem"
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5">
                  <h2
                    id="ja-tem"
                    className="text-subheading font-semibold text-ink"
                  >
                    Não precisa comprar
                  </h2>
                  <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
                    A contagem que você fez já cobre estes. Eles ficam à vista
                    para você conferir, em vez de sumirem da lista.
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {jaTem.map((item) => (
                    <LinhaJaTem
                      key={item.insumoId}
                      item={item}
                      insumo={porInsumo.get(item.insumoId)}
                      hoje={hoje}
                    />
                  ))}
                </ul>
              </section>
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
            <div className="rounded-lg border border-line-strong bg-sunken p-4">
              <p className="max-w-[60ch] text-label text-ink">
                Fechar guarda esta lista como está e deixa a próxima nascer
                limpa, sem nenhum item já marcado. É o que se faz quando a
                compra terminou.
              </p>

              {/* A compra sabe quanto entrou e não sabe o que saiu desde então:
                  somar e gravar seria inventar a metade que falta. Então ela
                  propõe, com os campos já preenchidos, e a decisão continua
                  sendo de quem está de pé na frente da despensa. */}
              {entradasDaCompra.size > 0 && (
                <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
                  Você marcou{" "}
                  <strong className="num font-semibold text-ink">
                    {entradasDaCompra.size}
                  </strong>{" "}
                  {entradasDaCompra.size === 1 ? "item" : "itens"} como
                  {entradasDaCompra.size === 1 ? " comprado" : " comprados"}.
                  Guardar na despensa abre a contagem já somada com o que
                  entrou, para você conferir enquanto tira das sacolas.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Botao tamanho="sm" onClick={() => setConfirmandoFechar(false)}>
                  Continuar comprando
                </Botao>
                <Botao
                  tamanho="sm"
                  variante={
                    entradasDaCompra.size > 0 ? "secundaria" : "primaria"
                  }
                  onClick={fechar}
                >
                  Fechar a lista
                </Botao>
                {entradasDaCompra.size > 0 && (
                  <Botao
                    tamanho="sm"
                    variante="primaria"
                    onClick={guardarNaDespensa}
                    iconeInicial={
                      <ClipboardList
                        aria-hidden
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                  >
                    Fechar e guardar na despensa
                  </Botao>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-5">
              <Botao
                tamanho="sm"
                onClick={() => setConfirmandoFechar(true)}
                iconeInicial={
                  <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Fechar esta lista
              </Botao>
            </div>
          ))}
      </div>

      {lista && <RodapeCompras resumo={resumo} />}
    </>
  );
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
  pendente,
}: {
  dias: number;
  aoMudar: (dias: number) => void;
  hoje: DataISO;
  periodoFim: DataISO;
  pedidos: number;
  pendente: boolean;
}) {
  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {HORIZONTES.map((opcao) => {
          const ativo = dias === opcao;
          return (
            <button
              key={opcao}
              type="button"
              onClick={() => aoMudar(opcao)}
              aria-pressed={ativo}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-label font-medium",
                "transition-colors duration-150 ease-quart",
                ativo
                  ? "bg-wine-700 text-on-wine"
                  : "border border-line-strong text-ink-muted hover:bg-sunken",
              )}
            >
              {opcao} dias
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="num flex items-center gap-2 text-label text-ink-muted">
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
        <SeloSincronizacao pendente={pendente} />
      </div>
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
          {quantos} {quantos === 1 ? "insumo está" : "insumos estão"}
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
        acerte a ficha e refaça a lista.
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
