"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  HandCoins,
  Info,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { AtalhoParaCompras } from "@/components/compras/AtalhoParaCompras";
import { AtalhoParaClientes } from "@/components/clientes/AtalhoParaClientes";
import { EntregasAPagar } from "./EntregasAPagar";
import { FichaDoPedido } from "./FichaDoPedido";
import { DESKTOP } from "@/components/fichas/LinhaFicha";
import { arranjoDaMesa, COLUNAS_PEDIDO, LinhaPedido } from "./LinhaPedido";
import { ID_PEDIDO_NOVO } from "./EditorPedido";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloAgenda } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  agruparPorEntrega,
  aReceber,
  ehConcluido,
  filtrarPedidos,
  passouDoDia,
  somaDoDia,
  STATUS_CONCLUIDOS,
} from "@/lib/domain/pedido";
import { consultaClientes } from "@/lib/firebase/mutations/clientes";
import {
  consultaAgenda,
  consultaEntreguesEmAberto,
  consultaHistorico,
  consultaPedidosDaCliente,
} from "@/lib/firebase/mutations/pedidos";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { Cliente, DataISO, Pedido } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId, usePapel } from "@/providers/AuthProvider";

/**
 * As perguntas que ela faz à tela, e não os status do banco (`#d246`). Mora
 * na URL, `?vista=…`, para a Hoje poder apontar para "Me devem"; a agenda é a
 * ausência do parâmetro.
 */
type Vista = "agenda" | "orcamentos" | "me-devem" | "ja-sairam";

function vistaDa(parametro: string | null, dona: boolean): Vista {
  if (parametro === "orcamentos" || parametro === "ja-sairam") return parametro;
  if (parametro === "me-devem" && dona) return parametro;
  return "agenda";
}

/** Quantos concluídos cada "Mostrar mais antigos" traz. */
const PAGINA_DO_HISTORICO = 30;

/** Quantas clientes cadastradas a busca sugere; digitar mais estreita. */
const CLIENTES_SUGERIDAS = 3;

/**
 * A agenda de encomendas, por data de entrega.
 *
 * Três assinaturas, e não uma (`DECISOES.md#d105`): a **agenda** inteira — o
 * que ainda não saiu do forno, de qualquer data, finita porque ela fecha os
 * pedidos —, o **histórico** em páginas de trinta, dos mais recentes para
 * trás, e os **entregues em aberto**, completa e pequena, para a faixa não
 * somar só a primeira página. O índice `arquivado + status + dataEntregaISO`
 * nasceu para isso.
 *
 * As quatro vistas (`#d246`) só escolhem qual delas aparece: nenhuma
 * assinatura depende da vista, e trocar de vista não reabre nenhuma. O
 * histórico fica assinado fora de "Já saíram" porque "Entregas a pagar" soma
 * sobre ele, como somava com "Todos".
 */
export function ListaPedidos() {
  const contaId = useContaId();
  // Clientes é faturamento por pessoa, o acerto das entregas é saída no caixa
  // e "Me devem" é dinheiro: os três são da dona (`#d157`, `#d213`).
  const dona = usePapel() === "DONA";
  const router = useRouter();
  const vista = vistaDa(useSearchParams().get("vista"), dona);
  const [hoje] = useState(() => dataISODe(new Date()));
  const [limite, setLimite] = useState(PAGINA_DO_HISTORICO);
  // Tocar lê (`#d249`), pelo arranjo de Materiais (`#d222`): o pedido fica
  // depois de fechar, para a folha descer com o conteúdo dentro.
  const [lendo, setLendo] = useState<Pedido | null>(null);
  const [fichaAberta, setFichaAberta] = useState(false);
  // No desktop a ficha acopla ao lado da mesa (`#d253`). Guardado, e não
  // derivado da lista como em Materiais: o pedido pago em "Me devem" sai da
  // consulta, e a ficha precisa continuar nele para o "Desfazer".
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const mesa = useRef<HTMLDivElement>(null);
  // A busca atravessa as vistas (`#d252`): com texto no campo, a vista da URL
  // fica parada, e limpar o campo volta a ela.
  const [busca, setBusca] = useState("");
  const [clienteEscolhida, setClienteEscolhida] = useState<Cliente | null>(
    null,
  );
  const termo = chaveDeBusca(busca);
  const buscando = termo !== "";
  const online = useConexao();

  function mudarBusca(texto: string) {
    setBusca(texto);
    setClienteEscolhida(null);
  }

  /** No desktop, a ficha ao lado da mesa; abaixo de `lg`, a folha inferior. */
  function abrirPedido(pedido: Pedido) {
    if (window.matchMedia(DESKTOP).matches) {
      setSelecionado(pedido);
      return;
    }
    setLendo(pedido);
    setFichaAberta(true);
  }

  /** Fecha a ficha ao lado e devolve o foco à linha que estava marcada. */
  function fecharFicha() {
    const linha = mesa.current?.querySelector<HTMLElement>(
      'button[aria-current="true"]',
    );
    setSelecionado(null);
    linha?.focus();
  }

  // `replace`, e não `push`: trocar de vista não é ir a outro lugar, e o
  // voltar do navegador leva para onde ela estava antes de `/pedidos`.
  function escolherVista(valor: Vista) {
    mudarBusca("");
    router.replace(valor === "agenda" ? "/pedidos" : `/pedidos?vista=${valor}`);
  }

  const consultaDaAgenda = useMemo(() => consultaAgenda(contaId), [contaId]);
  const consultaDosEntregues = useMemo(
    () => (dona ? consultaEntreguesEmAberto(contaId) : null),
    [dona, contaId],
  );
  const consultaDoHistorico = useMemo(
    () => consultaHistorico(contaId, STATUS_CONCLUIDOS, limite),
    [contaId, limite],
  );

  const agenda = useColecao<Pedido>(consultaDaAgenda);
  const entreguesEmAberto = useColecao<Pedido>(consultaDosEntregues);
  const historico = useColecao<Pedido>(consultaDoHistorico);

  // As clientes só são assinadas com dois caracteres no campo: abrir
  // `/pedidos` sem buscar não paga leitura por elas. É a consulta do editor,
  // e cai no mesmo cache.
  const sugereClientes = termo.length >= 2;
  const consultaDasClientes = useMemo(
    () => (sugereClientes ? consultaClientes(contaId) : null),
    [sugereClientes, contaId],
  );
  const clientes = useColecao<Cliente>(consultaDasClientes);
  const consultaDaCliente = useMemo(
    () =>
      clienteEscolhida
        ? consultaPedidosDaCliente(contaId, clienteEscolhida.id)
        : null,
    [clienteEscolhida, contaId],
  );
  const daCliente = useColecao<Pedido>(consultaDaCliente);

  const carregando =
    agenda.carregando || entreguesEmAberto.carregando || historico.carregando;
  // Só a lista espera pelos pedidos da cliente; a faixa não pisca.
  const carregandoLista = carregando || daCliente.carregando;
  const erro =
    agenda.erro ?? entreguesEmAberto.erro ?? historico.erro ?? daCliente.erro;
  const pendente =
    agenda.pendente || entreguesEmAberto.pendente || historico.pendente;

  const orcamentos = useMemo(
    () => agenda.dados.filter((pedido) => pedido.status === "ORCAMENTO"),
    [agenda.dados],
  );
  const pedidosDaVista = {
    agenda: agenda.dados,
    orcamentos,
    "me-devem": entreguesEmAberto.dados,
    "ja-sairam": historico.dados,
  }[vista];

  const vistas: OpcaoPilula<Vista>[] = [
    { valor: "agenda", rotulo: "Agenda" },
    {
      valor: "orcamentos",
      rotulo: comContagem("Orçamentos", orcamentos.length),
    },
    ...(dona
      ? [
          {
            valor: "me-devem" as const,
            rotulo: comContagem("Me devem", entreguesEmAberto.dados.length),
          },
        ]
      : []),
    // "Já saíram" não cabia com as outras três em 360px (spec 062).
    { valor: "ja-sairam", rotulo: "Saíram" },
  ];

  // A agenda e os entregues em aberto não se cruzam (status diferentes) e os
  // dois são completos: a faixa continua exata em qualquer página.
  const paraReceber = useMemo(
    () => [...agenda.dados, ...entreguesEmAberto.dados],
    [agenda.dados, entreguesEmAberto.dados],
  );

  // Para as entregas, os três conjuntos sem repetir id: o histórico repete os
  // entregues em aberto, e a agenda é de onde saem as entregas esquecidas.
  const paraEntregas = useMemo(() => {
    const porId = new Map<string, Pedido>();
    for (const pedido of [
      ...agenda.dados,
      ...entreguesEmAberto.dados,
      ...historico.dados,
    ]) {
      porId.set(pedido.id, pedido);
    }
    return [...porId.values()];
  }, [agenda.dados, entreguesEmAberto.dados, historico.dados]);

  // A busca olha tudo o que a tela tem, sem repetir (`#d252`); com uma
  // cliente escolhida, os pedidos dela, que vêm do banco.
  const resultado = useMemo(
    () => filtrarPedidos(paraEntregas, busca),
    [paraEntregas, busca],
  );
  const pedidosNaTela = clienteEscolhida
    ? daCliente.dados
    : buscando
      ? resultado
      : pedidosDaVista;

  // Começa por qualquer palavra do nome: "jan" e "domingos" acham a Janessa
  // Domingos, "ssa" não.
  const sugeridas =
    sugereClientes && !clienteEscolhida
      ? clientes.dados
          .filter((cliente) => ` ${cliente.nomeBusca}`.includes(` ${termo}`))
          .slice(0, CLIENTES_SUGERIDAS)
      : [];

  // "Já saíram" corre ao contrário: o que interessa de um pedido entregue é
  // que ele é o mais recente. A busca também: ela procura o que já aconteceu.
  // "Me devem" não: a dívida mais antiga primeiro.
  const grupos = agruparPorEntrega(pedidosNaTela);
  if (vista === "ja-sairam" || buscando) grupos.reverse();

  // O fim da lista só se sabe com o servidor: do cache, a lista pode estar
  // mais curta que ele, e esconder o botão seria dizer "acabou" sem saber.
  const historicoAcabou = historico.dados.length < limite && !historico.doCache;

  const nadaGravado =
    agenda.dados.length === 0 &&
    entreguesEmAberto.dados.length === 0 &&
    historico.dados.length === 0;
  // Um botão primário por tela: enquanto o estado vazio ensina a tela, a ação
  // é dele, e o botão do cabeçalho e o "+" saem.
  const estadoVazioNaTela = !carregando && !erro && nadaGravado;
  const arranjo = arranjoDaMesa(selecionado !== null);

  return (
    <>
      <CabecalhoPagina
        titulo="Pedidos"
        pendente={pendente}
        recolhe
        descricao="O que você combinou entregar, para quem, e quanto sobra de cada encomenda."
        acao={
          <div className="flex items-center gap-2">
            {/* No desktop a lista de compras nasce daqui: o que comprar é
                consequência do que foi combinado. No celular ela mora no ⋯
                da navegação inferior (`DECISOES.md#d240`). */}
            <AtalhoParaCompras className="hidden lg:inline-flex" />
            {/* Mesma regra de "Novo pedido": sem pedido gravado não há
                cliente que a tela pudesse mostrar (`#d113`). */}
            {!estadoVazioNaTela && dona && (
              <AtalhoParaClientes className="hidden lg:inline-flex" />
            )}
            {!estadoVazioNaTela && (
              <Link
                href={`/pedidos/${ID_PEDIDO_NOVO}`}
                className={classesBotao({
                  variante: "primaria",
                  className: "hidden lg:inline-flex",
                })}
              >
                <Plus aria-hidden className="size-5" strokeWidth={2} />
                Novo pedido
              </Link>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <CampoBusca
            rotulo="Buscar pedido"
            placeholder="Cliente, produto ou código"
            value={busca}
            onChange={(evento) => mudarBusca(evento.target.value)}
          />
          {/* Com texto no campo nenhuma vista está escolhida: o resultado é
              de todas (`#d252`). */}
          <Pilulas
            rotulo="Vista"
            opcoes={vistas}
            valor={buscando ? null : vista}
            aoMudar={escolherVista}
          />
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        {clienteEscolhida ? (
          <p className="flex flex-wrap items-center gap-x-1 text-label text-ink-muted">
            <span className="num" aria-live="polite">
              {carregandoLista
                ? "Carregando"
                : `${contagem(pedidosNaTela.length)} de ${clienteEscolhida.nome}`}
            </span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setClienteEscolhida(null)}
              className="toque -my-2 rounded-md px-2 font-semibold text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
            >
              Voltar à busca
            </button>
          </p>
        ) : (
          <p className="num text-label text-ink-muted" aria-live="polite">
            {carregando
              ? "Carregando"
              : buscando
                ? `${contagem(resultado.length)} no que está aberto`
                : linhaDeContagem(vista, pedidosDaVista)}
          </p>
        )}
      </div>

      {/* Informativo, e não alerta: a busca em memória funciona igual. */}
      {buscando && !online && (
        <p className="mt-2 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3 py-2.5 text-label text-ink">
          <Info
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-info"
            strokeWidth={1.75}
          />
          Sem internet, a busca olha só o que já foi aberto neste aparelho.
        </p>
      )}

      {/* Somado sobre a agenda inteira mais os entregues em aberto, e não sobre
          a vista da vez nem sobre a página: o que devem é fato. */}
      {!carregando && (
        <AReceber
          pedidos={paraReceber}
          aoVerQuem={
            vista === "me-devem" ? undefined : () => escolherVista("me-devem")
          }
        />
      )}

      {/* O outro lado da entrega, sobre tudo o que a tela tem na mão. */}
      {!carregando && dona && (
        <EntregasAPagar pedidos={paraEntregas} hoje={hoje} />
      )}

      {/* A cliente cadastrada no topo: os pedidos dela vêm do banco, e não
          só das páginas abertas (`#d252`). */}
      {sugeridas.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {sugeridas.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => setClienteEscolhida(cliente)}
                className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left text-body text-ink transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
              >
                <span className="min-w-0 flex-1 truncate">
                  Todos os pedidos de{" "}
                  <span className="font-medium">{cliente.nome}</span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-ink-subtle"
                  strokeWidth={1.75}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No desktop a mesa e a ficha do pedido marcado dividem a largura: sem
          ficha, a mesa ocupa tudo (`#d253`, `#d225`). */}
      <div className="lg:flex lg:items-start lg:gap-4">
        <div ref={mesa} className="min-w-0 flex-1">
          {erro ? (
            <Caixa>
              <EstadoVazio
                titulo="Não deu para carregar seus pedidos"
                descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
              />
            </Caixa>
          ) : carregandoLista ? (
            <Caixa>
              <EsqueletoLista />
            </Caixa>
          ) : pedidosNaTela.length === 0 ? (
            <Caixa>
              {clienteEscolhida ? (
                <EstadoVazio
                  titulo={`Nenhum pedido de ${clienteEscolhida.nome} ainda.`}
                  descricao="O pedido anotado sem escolher a cliente cadastrada se acha pelo nome, na busca."
                />
              ) : buscando ? (
                <EstadoVazio
                  titulo={`Nada com “${busca.trim()}”.`}
                  descricao={
                    historicoAcabou
                      ? "Procurei em todos os pedidos, pelo nome da cliente, do produto e pelo código."
                      : "Nos pedidos abertos até agora, não. Os mais antigos ainda podem ter."
                  }
                />
              ) : nadaGravado ? (
                <EstadoVazio
                  titulo="Nenhuma encomenda combinada."
                  descricao="Anote o pedido com o preço de hoje. Ele fica congelado mesmo se o chocolate subir amanhã."
                  acao={
                    <Link
                      href={`/pedidos/${ID_PEDIDO_NOVO}`}
                      className={classesBotao({
                        variante: "primaria",
                        tamanho: "lg",
                      })}
                    >
                      <Plus aria-hidden className="size-5" strokeWidth={2} />
                      Anotar primeiro pedido
                    </Link>
                  }
                />
              ) : (
                <VazioDaVista vista={vista} aoEscolher={escolherVista} />
              )}
            </Caixa>
          ) : (
            <>
              <div className={cn("mt-2 space-y-6", arranjo.mesa)}>
                {/* O cabeçalho das colunas é para quem vê: cada célula da linha
                    carrega o rótulo em `sr-only`. */}
                <div
                  aria-hidden
                  className={cn(
                    "hidden gap-x-3 px-4 py-2 text-micro font-semibold uppercase tracking-wide text-ink-muted",
                    arranjo.grade,
                    COLUNAS_PEDIDO,
                  )}
                >
                  <span>Hora</span>
                  <span>Cliente</span>
                  <span>Itens</span>
                  <span>Estado</span>
                  <span>Pagamento</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Sobra</span>
                </div>
                {grupos.map((grupo) => (
                  <GrupoDoDia
                    key={grupo.dataISO}
                    dataISO={grupo.dataISO}
                    pedidos={grupo.pedidos}
                    hoje={hoje}
                    aoAbrir={abrirPedido}
                    selecionadoId={selecionado?.id}
                  />
                ))}
              </div>

              <div className="mt-6 space-y-6 empty:hidden">
                {/* A agenda acaba aqui: o histórico não disputa a rolagem com ela. */}
                {vista === "agenda" && !buscando && (
                  <Botao
                    variante="terciaria"
                    larguraTotal
                    onClick={() => escolherVista("ja-sairam")}
                  >
                    Ver o que já saiu
                  </Botao>
                )}

                {/* Um botão, e não rolagem infinita: é acessível e não dispara sem
              querer. A lista não pisca ao crescer — `useColecao` guarda a
              página anterior até o snapshot novo chegar do cache, no mesmo
              tique. */}
                {vista === "ja-sairam" && !buscando && !historicoAcabou && (
                  <Botao
                    tamanho="lg"
                    larguraTotal
                    onClick={() => setLimite(limite + PAGINA_DO_HISTORICO)}
                  >
                    Mostrar mais antigos
                  </Botao>
                )}
              </div>
            </>
          )}

          {/* A cliente avulsa não tem consulta própria: só se acha abrindo mais
          páginas do histórico, e o filtro refaz sozinho (`#d252`). */}
          {buscando &&
            !clienteEscolhida &&
            !carregando &&
            !erro &&
            !historicoAcabou && (
              <Botao
                tamanho="lg"
                larguraTotal
                className="mt-6"
                onClick={() => setLimite(limite + PAGINA_DO_HISTORICO)}
              >
                Procurar nos mais antigos
              </Botao>
            )}
        </div>

        {selecionado && (
          <FichaDoPedido
            key={selecionado.id}
            acoplada
            aberto
            aoFechar={fecharFicha}
            pedido={selecionado}
            hoje={hoje}
          />
        )}
      </div>

      {lendo && (
        <FichaDoPedido
          aberto={fichaAberta}
          aoFechar={() => setFichaAberta(false)}
          pedido={lendo}
          hoje={hoje}
        />
      )}
    </>
  );
}

/**
 * O dinheiro combinado que ainda não entrou, em duas quantias (`#d247`): o que
 * já devem, de pedido entregue, e o que vai entrar, do que está combinado. A
 * primeira pede cobrança; a segunda, só espera.
 *
 * Existe porque o painel financeiro é regime de caixa: um pedido entregue e não
 * pago não aparece no resultado do mês, e sem esta faixa ele não apareceria em
 * lugar nenhum (`DECISOES.md#d36`).
 *
 * O desenho é o de `FaixaResumo`, com duas linhas de valor no lugar de uma.
 */
function AReceber({
  pedidos,
  aoVerQuem,
}: {
  pedidos: Pedido[];
  /** Sem ele o "Ver quem" some: é a própria vista "Me devem". */
  aoVerQuem?: () => void;
}) {
  const { total, quantidade, entregues, totalEntregue } = aReceber(pedidos);
  if (quantidade === 0) return null;
  const combinados = quantidade - entregues;

  return (
    <section
      aria-label="A receber"
      className="mt-2 rounded-lg border border-line bg-sunken px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 gap-2">
        <HandCoins
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <div className="min-w-0 space-y-1">
          {entregues > 0 && (
            <Quantia rotulo="Me devem" valor={totalEntregue}>
              {entregues === 1
                ? "1 entregue sem pagar"
                : `${entregues} entregues sem pagar`}
            </Quantia>
          )}
          {combinados > 0 && (
            <Quantia rotulo="Vai entrar" valor={total - totalEntregue}>
              {combinados === 1 ? "1 combinado" : `${combinados} combinados`}
            </Quantia>
          )}
          <p className="text-label text-ink-muted">
            Só entra no resultado do mês quando você marca como pago.
          </p>
        </div>
      </div>

      {entregues > 0 && aoVerQuem && (
        <div className="mt-3 shrink-0 sm:mt-0">
          <Botao tamanho="sm" onClick={aoVerQuem}>
            Ver quem
          </Botao>
        </div>
      )}
    </section>
  );
}

function Quantia({
  rotulo,
  valor,
  children,
}: {
  rotulo: string;
  valor: number;
  children: ReactNode;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-label text-ink-muted">
      <span className="font-medium">{rotulo}</span>
      <Dinheiro centavos={valor} />
      <span className="num">· {children}</span>
    </p>
  );
}

/** "Me devem 3": o número só quando passa de zero. */
function comContagem(rotulo: string, quantidade: number): string {
  return quantidade > 0 ? `${rotulo} ${quantidade}` : rotulo;
}

/** "1 pedido", "12 pedidos", "nenhum pedido". */
function contagem(n: number): string {
  if (n === 0) return "nenhum pedido";
  return `${n} ${n === 1 ? "pedido" : "pedidos"}`;
}

/**
 * A contagem acima da lista segue a vista, e conta só o que é exato: o total
 * do histórico não existe sem `getCountFromServer`, que exige rede.
 */
function linhaDeContagem(vista: Vista, pedidos: Pedido[]): string {
  const n = pedidos.length;
  switch (vista) {
    case "agenda":
      return `${n} na agenda`;
    case "orcamentos":
      if (n === 0) return "nenhum orçamento";
      return `${n} ${n === 1 ? "orçamento" : "orçamentos"}`;
    case "me-devem":
      if (n === 0) return "nenhum pedido";
      return `${n} ${n === 1 ? "pedido" : "pedidos"} · ${formatarMoeda(pedidos.reduce((soma, pedido) => soma + pedido.total, 0))}`;
    case "ja-sairam":
      if (n === 0) return "nenhum pedido";
      return n === 1 ? "o mais recente" : `os ${n} mais recentes`;
  }
}

/** Cada vista vazia com a sua frase. */
function VazioDaVista({
  vista,
  aoEscolher,
}: {
  vista: Vista;
  aoEscolher: (vista: Vista) => void;
}) {
  switch (vista) {
    case "agenda":
      return (
        <EstadoVazio
          titulo="Nada na agenda agora"
          descricao="Nenhum pedido esperando para sair. O que já foi entregue continua no que saiu."
          acao={
            <Botao onClick={() => aoEscolher("ja-sairam")}>
              Ver o que já saiu
            </Botao>
          }
        />
      );
    case "orcamentos":
      return (
        <EstadoVazio
          titulo="Nenhum orçamento esperando resposta."
          descricao="O orçamento que você anotar, ou que a cliente pedir pelo cardápio, espera aqui."
        />
      );
    case "me-devem":
      return (
        <EstadoVazio
          titulo="Ninguém te deve nada."
          descricao="Todo pedido entregue já foi pago."
        />
      );
    case "ja-sairam":
      return (
        <EstadoVazio
          titulo="Nada saiu da agenda ainda"
          descricao="Os pedidos entregues e os cancelados aparecem aqui."
          acao={
            <Botao onClick={() => aoEscolher("agenda")}>Ver a agenda</Botao>
          }
        />
      );
  }
}

function Caixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </div>
  );
}

/**
 * Um dia da lista: o cabeçalho diz que dia é, quanto sai dele e quanto sobra,
 * e a lista carrega os pedidos. O total responde "dá para dar conta?"; a
 * sobra, "valeu o domingo?" (`#d248`).
 */
function GrupoDoDia({
  dataISO,
  pedidos,
  hoje,
  aoAbrir,
  selecionadoId,
}: {
  dataISO: DataISO;
  pedidos: Pedido[];
  hoje: DataISO;
  aoAbrir: (pedido: Pedido) => void;
  /** O pedido na ficha ao lado; com ele a mesa espera o `2xl` (`#d253`). */
  selecionadoId?: string;
}) {
  const { total, sobra } = somaDoDia(pedidos);
  const atrasado = pedidos.some((pedido) => passouDoDia(pedido, hoje));
  const id = `dia-${dataISO}`;
  const arranjo = arranjoDaMesa(selecionadoId !== undefined);

  const dia = (
    <>
      {rotuloAgenda(dataISO, hoje)}
      {atrasado && (
        <Selo
          tom="atencao"
          icone={<TriangleAlert aria-hidden className="size-3.5" />}
        >
          Passou da data
        </Selo>
      )}
    </>
  );
  const quantos = `${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}`;
  const quantoSobra = (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1",
        sobra < 0 && "text-negative",
      )}
    >
      {sobra < 0 && (
        <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2} />
      )}
      {sobra < 0
        ? `perde ${formatarMoeda(Math.abs(sobra))}`
        : `sobram ${formatarMoeda(sobra)}`}
    </span>
  );

  return (
    <section aria-labelledby={id}>
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1",
          arranjo.celular,
        )}
      >
        <h2
          id={id}
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          {dia}
        </h2>
        <p className="num text-label text-ink-muted">
          {quantos}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {formatarMoeda(total)}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {quantoSobra}
        </p>
      </div>

      {/* Na mesa, o dia é a linha do grupo: o total e a sobra caem nas
          colunas de Total e Sobra (`#d253`). */}
      <div
        className={cn(
          "hidden items-baseline gap-x-3 px-4 pb-2 pt-4",
          arranjo.grade,
          COLUNAS_PEDIDO,
        )}
      >
        <div className="col-span-5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-subheading font-semibold text-ink">
            {dia}
          </h2>
          <p className="num text-label text-ink-muted">{quantos}</p>
        </div>
        <p className="num text-right text-label font-semibold text-ink">
          <span className="sr-only">total do dia </span>
          {formatarMoeda(total)}
        </p>
        <p className="num text-right text-label font-semibold text-ink-muted">
          {quantoSobra}
        </p>
      </div>

      <ul
        className={cn(
          "mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface",
          arranjo.lista,
        )}
      >
        {pedidos.map((pedido) => (
          <LinhaPedido
            key={pedido.id}
            pedido={pedido}
            // No que já saiu a linha mostra só a exceção (`#d248`). Pelo
            // status, e não pela vista: a busca mistura os dois (`#d252`).
            saiu={ehConcluido(pedido.status)}
            aoAbrir={aoAbrir}
            selecionado={pedido.id === selecionadoId}
            comFicha={selecionadoId !== undefined}
          />
        ))}
      </ul>
    </section>
  );
}
