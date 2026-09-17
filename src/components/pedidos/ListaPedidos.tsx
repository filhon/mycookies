"use client";

import Link from "next/link";
import { Plus, TriangleAlert, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Botao } from "@/components/ui/Botao";
import { BotaoFlutuante } from "@/components/ui/BotaoFlutuante";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { Selo } from "@/components/ui/Selo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { AtalhoParaCompras } from "@/components/compras/AtalhoParaCompras";
import { EntregasAPagar } from "./EntregasAPagar";
import { LinhaPedido } from "./LinhaPedido";
import { ID_PEDIDO_NOVO } from "./EditorPedido";
import { dataISODe, rotuloAgenda } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  agruparPorEntrega,
  aReceber,
  ehConcluido,
  ROTULO_STATUS_PEDIDO,
  STATUS_CONCLUIDOS,
} from "@/lib/domain/pedido";
import {
  consultaAgenda,
  consultaEntreguesEmAberto,
  consultaHistorico,
} from "@/lib/firebase/mutations/pedidos";
import { useColecao } from "@/lib/hooks/useColecao";
import type { DataISO, Pedido, StatusPedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

const FILTROS: OpcaoPilula<StatusPedido | "TODOS">[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "ORCAMENTO", rotulo: "Orçamentos" },
  { valor: "CONFIRMADO", rotulo: "Confirmados" },
  { valor: "EM_PRODUCAO", rotulo: "Em produção" },
  { valor: "PRONTO", rotulo: "Prontos" },
  { valor: "ENTREGUE", rotulo: "Entregues" },
  { valor: "CANCELADO", rotulo: "Cancelados" },
];

/** Quantos concluídos cada "Mostrar mais antigos" traz. */
const PAGINA_DO_HISTORICO = 30;

/**
 * A agenda de encomendas, por data de entrega.
 *
 * Três assinaturas, e não uma (`DECISOES.md#d105`): a **agenda** inteira — o
 * que ainda não saiu do forno, de qualquer data, finita porque ela fecha os
 * pedidos —, o **histórico** em páginas de trinta, dos mais recentes para
 * trás, e os **entregues em aberto**, completa e pequena, para a faixa "A
 * receber" não somar só a primeira página. O índice `arquivado + status +
 * dataEntregaISO` nasceu para isso. O filtro de status vai para a consulta do
 * histórico, e na agenda é filtrado em memória.
 */
export function ListaPedidos() {
  const contaId = useContaId();
  const [filtro, setFiltro] = useState<StatusPedido | "TODOS">("TODOS");
  const [hoje] = useState(() => dataISODe(new Date()));
  const [limite, setLimite] = useState(PAGINA_DO_HISTORICO);

  function escolherFiltro(valor: StatusPedido | "TODOS") {
    setFiltro(valor);
    setLimite(PAGINA_DO_HISTORICO);
  }

  const consultaDaAgenda = useMemo(() => consultaAgenda(contaId), [contaId]);
  const consultaDosEntregues = useMemo(
    () => consultaEntreguesEmAberto(contaId),
    [contaId],
  );
  // Com um status da agenda na pílula não há histórico a assinar: `null`
  // desliga a assinatura, e só a agenda aparece.
  const consultaDoHistorico = useMemo(() => {
    const status =
      filtro === "TODOS"
        ? STATUS_CONCLUIDOS
        : ehConcluido(filtro)
          ? [filtro]
          : null;
    return status ? consultaHistorico(contaId, status, limite) : null;
  }, [contaId, filtro, limite]);

  const agenda = useColecao<Pedido>(consultaDaAgenda);
  const entreguesEmAberto = useColecao<Pedido>(consultaDosEntregues);
  const historico = useColecao<Pedido>(consultaDoHistorico);

  const carregando =
    agenda.carregando || entreguesEmAberto.carregando || historico.carregando;
  const erro = agenda.erro ?? entreguesEmAberto.erro ?? historico.erro;
  const pendente =
    agenda.pendente || entreguesEmAberto.pendente || historico.pendente;

  // A agenda não tem status concluído, então com "Entregues" na pílula ela
  // esvazia sozinha; o histórico já vem filtrado pela consulta.
  const abertosVisiveis = useMemo(
    () =>
      filtro === "TODOS"
        ? agenda.dados
        : agenda.dados.filter((pedido) => pedido.status === filtro),
    [agenda.dados, filtro],
  );

  // A agenda e os entregues em aberto não se cruzam (status diferentes) e os
  // dois são completos: "A receber" continua exata em qualquer página.
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

  const gruposAbertos = agruparPorEntrega(abertosVisiveis);
  // Os concluídos correm ao contrário: o que interessa de um pedido entregue é
  // que ele é o mais recente, e não que ele é o mais próximo.
  const gruposConcluidos = agruparPorEntrega(historico.dados).reverse();

  // O fim da lista só se sabe com o servidor: do cache, a lista pode estar
  // mais curta que ele, e esconder o botão seria dizer "acabou" sem saber.
  const historicoAcabou = historico.dados.length < limite && !historico.doCache;

  const visiveis = abertosVisiveis.length + historico.dados.length;
  const nadaGravado =
    agenda.dados.length === 0 &&
    entreguesEmAberto.dados.length === 0 &&
    historico.dados.length === 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Pedidos"
        descricao="O que você combinou entregar, para quem, e quanto sobra de cada encomenda."
        acao={
          <div className="flex items-center gap-2">
            {/* A lista de compras não cabe na navegação inferior — cinco
                destinos é o teto —, e é daqui que ela nasce: o que comprar é
                consequência do que foi combinado. */}
            <AtalhoParaCompras />
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
          </div>
        }
      >
        <Pilulas
          rotulo="Status"
          opcoes={FILTROS}
          valor={filtro}
          aoMudar={escolherFiltro}
        />
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : linhaDeContagem(
                filtro,
                abertosVisiveis.length,
                historico.dados.length,
              )}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      {/* Somado sobre a agenda inteira mais os entregues em aberto, e não sobre
          o filtro da vez nem sobre a página: o que está a receber é fato. */}
      {!carregando && <AReceber pedidos={paraReceber} />}

      {/* O outro lado da entrega, sobre tudo o que a tela tem na mão. */}
      {!carregando && <EntregasAPagar pedidos={paraEntregas} hoje={hoje} />}

      {erro ? (
        <Caixa>
          <EstadoVazio
            titulo="Não deu para carregar seus pedidos"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </Caixa>
      ) : carregando ? (
        <Caixa>
          <EsqueletoLista />
        </Caixa>
      ) : visiveis === 0 ? (
        <Caixa>
          {nadaGravado ? (
            <EstadoVazio
              titulo="A encomenda sai do WhatsApp e entra na agenda"
              descricao="Monte o pedido com os produtos que você já precificou: o sistema soma o total, desconta a maquininha e diz quanto sobra antes de você fechar o combinado."
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
            <EstadoVazio
              titulo="Nada com esse filtro"
              descricao="Nenhum pedido está nesse pé agora. Volte para todos e veja a agenda inteira."
              acao={
                <Botao onClick={() => escolherFiltro("TODOS")}>Ver todos</Botao>
              }
            />
          )}
        </Caixa>
      ) : (
        <div className="mt-2 space-y-6">
          {gruposAbertos.map((grupo) => (
            <GrupoDoDia
              key={`abertos-${grupo.dataISO}`}
              prefixo="abertos"
              dataISO={grupo.dataISO}
              pedidos={grupo.pedidos}
              hoje={hoje}
            />
          ))}

          {gruposConcluidos.length > 0 && (
            <div className="space-y-6">
              {gruposAbertos.length > 0 && (
                <h2 className="border-t border-line pt-5 text-label font-medium text-ink-muted">
                  Já saíram da agenda
                </h2>
              )}
              {gruposConcluidos.map((grupo) => (
                <GrupoDoDia
                  key={`concluidos-${grupo.dataISO}`}
                  prefixo="concluidos"
                  dataISO={grupo.dataISO}
                  pedidos={grupo.pedidos}
                  hoje={hoje}
                />
              ))}

              {/* Um botão, e não rolagem infinita: é acessível e não dispara
                  sem querer. A lista não pisca ao crescer — `useColecao`
                  guarda a página anterior até o snapshot novo chegar do
                  cache, no mesmo tique. */}
              {!historicoAcabou && (
                <Botao
                  tamanho="lg"
                  larguraTotal
                  onClick={() => setLimite(limite + PAGINA_DO_HISTORICO)}
                >
                  Mostrar mais antigos
                </Botao>
              )}
            </div>
          )}
        </div>
      )}

      <BotaoFlutuante
        rotulo="Novo pedido"
        href={`/pedidos/${ID_PEDIDO_NOVO}`}
      />
    </>
  );
}

/**
 * O dinheiro combinado que ainda não entrou.
 *
 * Existe porque o painel financeiro é regime de caixa: um pedido entregue e não
 * pago não aparece no resultado do mês, e sem esta linha ele não apareceria em
 * lugar nenhum — o painel mentiria por omissão (`DECISOES.md#d36`).
 *
 * Não é um cartão nem um KPI: é uma faixa rebaixada entre o cabeçalho e a
 * agenda, porque a agenda continua sendo o que ela veio ver.
 */
function AReceber({ pedidos }: { pedidos: Pedido[] }) {
  const { total, quantidade, entregues } = aReceber(pedidos);
  if (quantidade === 0) return null;

  return (
    <section
      aria-labelledby="a-receber"
      className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-sunken px-4 py-3"
    >
      <h2
        id="a-receber"
        className="flex items-center gap-2 text-label font-medium text-ink-muted"
      >
        <Wallet aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span>A receber</span>
      </h2>

      <Dinheiro centavos={total} />

      <p className="w-full max-w-[64ch] text-label text-ink-muted">
        {quantidade === 1
          ? "1 pedido combinado que ainda não entrou no caixa"
          : `${quantidade} pedidos combinados que ainda não entraram no caixa`}
        {entregues > 0 &&
          (entregues === 1
            ? ", e um deles já foi entregue"
            : `, e ${entregues} deles já foram entregues`)}
        . Enquanto o pedido não estiver marcado como pago, esse dinheiro não
        conta no resultado do mês.
      </p>
    </section>
  );
}

/**
 * "12 na agenda" ou "os 30 entregues mais recentes": conta só o que é exato.
 * O total do histórico não existe sem `getCountFromServer`, que exige rede.
 */
function linhaDeContagem(
  filtro: StatusPedido | "TODOS",
  naAgenda: number,
  noHistorico: number,
): string {
  if (filtro === "TODOS" || !ehConcluido(filtro)) {
    return `${naAgenda} na agenda`;
  }
  const singular = ROTULO_STATUS_PEDIDO[filtro].toLowerCase();
  const plural = `${singular}s`;
  if (noHistorico === 0) return `nenhum ${singular}`;
  if (noHistorico === 1) return `o ${singular} mais recente`;
  return `os ${noHistorico} ${plural} mais recentes`;
}

function Caixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </div>
  );
}

/**
 * Um dia da agenda: o cabeçalho diz que dia é e quanto sai dele, e a lista
 * carrega os pedidos. O total do dia é o que responde "dá para dar conta?"
 * antes de abrir pedido por pedido.
 */
function GrupoDoDia({
  prefixo,
  dataISO,
  pedidos,
  hoje,
}: {
  prefixo: string;
  dataISO: DataISO;
  pedidos: Pedido[];
  hoje: DataISO;
}) {
  const total = pedidos.reduce((soma, pedido) => soma + pedido.total, 0);
  const atrasado =
    dataISO < hoje && pedidos.some((pedido) => !ehConcluido(pedido.status));
  const id = `dia-${prefixo}-${dataISO}`;

  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h2
          id={id}
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          {rotuloAgenda(dataISO, hoje)}
          {atrasado && (
            <Selo
              tom="atencao"
              icone={<TriangleAlert aria-hidden className="size-3.5" />}
            >
              Passou da data
            </Selo>
          )}
        </h2>
        <p className="num text-label text-ink-muted">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          <span className="mx-1.5 text-ink-subtle">·</span>
          {formatarMoeda(total)}
        </p>
      </div>

      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {pedidos.map((pedido) => (
          <LinhaPedido key={pedido.id} pedido={pedido} />
        ))}
      </ul>
    </section>
  );
}
