"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DESKTOP } from "@/components/fichas/LinhaFicha";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import {
  EscolhaDeOrdem,
  type OpcaoOrdem,
} from "@/components/ui/EscolhaDeOrdem";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { classesBotao } from "@/components/ui/estilosBotao";
import { FichaDaCliente } from "./FichaDaCliente";
import { arranjoDaTabela, COLUNAS_CLIENTE, LinhaCliente } from "./LinhaCliente";
import { PainelCliente } from "./PainelCliente";
import {
  diasSemPedir,
  filtrarClientes,
  momentoDaCliente,
  ordenarClientes,
  retornoDasChamadas,
  silencioDaChamada,
  type MomentoDaCliente,
  type OrdemClientes,
} from "@/lib/domain/clientes";
import { dataISODe } from "@/lib/domain/datas";
import { consultaClientes } from "@/lib/firebase/mutations/clientes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { novoId } from "@/lib/utils/id";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/**
 * Com quem ela fala hoje (`#d309`): "Todas" é a ausência do parâmetro, as
 * outras são um momento, `?vista=sumiram`. As que pedem ação vêm primeiro.
 */
type Vista = "todas" | Exclude<MomentoDaCliente, "sem-pedido">;

const VISTAS: { valor: Vista; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "sumiram", rotulo: "Sumiram" },
  { valor: "uma-vez", rotulo: "Uma vez só" },
  { valor: "novas", rotulo: "Novas" },
  { valor: "voltam", rotulo: "Voltam" },
];

function vistaDa(parametro: string | null): Vista {
  return VISTAS.find((vista) => vista.valor === parametro)?.valor ?? "todas";
}

/** Nessas duas a ordem é quem está há mais tempo sem pedir, e há "Chamar". */
const PARA_CHAMAR = new Set<Vista>(["sumiram", "uma-vez"]);

/** Abaixo disso a frase do topo é conta que ela faz de olho. */
const CLIENTES_PARA_A_FRASE = 10;

const ORDENS: OpcaoOrdem<OrdemClientes>[] = [
  {
    valor: "GASTO",
    rotulo: "Mais gasto",
    linha: "Quem mais deixou dinheiro no caixa",
  },
  {
    valor: "RECENTE",
    rotulo: "Pedido mais recente",
    linha: "Quem pagou um pedido por último",
  },
  {
    valor: "PARADA",
    rotulo: "Mais tempo sem pedir",
    linha: "Quem está há mais tempo sem pagar um pedido",
  },
  { valor: "NOME", rotulo: "Nome", linha: "De A a Z" },
];

/*
 * A ordem mora no aparelho (`#d310`), como a de Produtos (`#d229`). Navegador
 * que bloqueia armazenamento lança no acesso: quem não pode guardar volta à de
 * sempre.
 */
const CHAVE_ORDEM = "rende:ordem-clientes";

function ordemGuardada(): OrdemClientes {
  try {
    const lida = localStorage.getItem(CHAVE_ORDEM);
    return ORDENS.find((ordem) => ordem.valor === lida)?.valor ?? "GASTO";
  } catch {
    return "GASTO";
  }
}

const semAssinatura = () => () => {};

/**
 * Quem mais deixou dinheiro no caixa primeiro (`#d137`), em cinco momentos
 * pelos agregados (`#d309`). Não cadastra: uma cliente nasce do pedido, e
 * esta tela só lê e ordena o que os agregados dela já sabem.
 */
export function ListaClientes() {
  const contaId = useContaId();
  const negocio = useAuth().conta?.nome ?? "";
  const router = useRouter();
  const vista = vistaDa(useSearchParams().get("vista"));
  const [busca, setBusca] = useState("");
  const [hoje] = useState(() => dataISODe(new Date()));
  const [emEdicao, setEmEdicao] = useState<{
    aberto: boolean;
    cliente?: Cliente;
    chave: string;
    daFolha?: boolean;
  }>({ aberto: false, chave: "fechado" });
  // Tocar lê (`#d308`). O id fica depois de fechar, para a folha descer com o
  // conteúdo dentro; a cliente vem da lista, viva, e some se for arquivada.
  const [lendoId, setLendoId] = useState<string | null>(null);
  const [fichaAberta, setFichaAberta] = useState(false);
  // No desktop a ficha acopla ao lado da tabela (`#d310`).
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);
  // A guardada até ela escolher outra nesta visita; no servidor, a de sempre.
  const guardada = useSyncExternalStore(
    semAssinatura,
    ordemGuardada,
    () => "GASTO" as const,
  );
  const [escolhida, setEscolhida] = useState<OrdemClientes | null>(null);
  const ordem = escolhida ?? guardada;

  const consulta = useMemo(() => consultaClientes(contaId), [contaId]);
  const { dados, carregando, erro, pendente } = useColecao<Cliente>(consulta);
  const lendo = dados.find((cliente) => cliente.id === lendoId);

  // O momento, os dias e a chamada de cada uma, uma vez por leitura da coleção.
  const { situacao, retorno } = useMemo(() => {
    const porId = new Map<
      string,
      {
        momento: MomentoDaCliente;
        dias: number | null;
        chamadaHa: number | null;
      }
    >();
    const chamadas = [];
    for (const cliente of dados) {
      const ultimoPedidoISO = cliente.ultimoPedidoEm
        ? dataISODe(cliente.ultimoPedidoEm.toDate())
        : null;
      const chamadaISO = cliente.chamadaEm
        ? dataISODe(cliente.chamadaEm.toDate())
        : null;
      const momento = momentoDaCliente(cliente, ultimoPedidoISO, hoje);
      porId.set(cliente.id, {
        momento,
        dias: diasSemPedir(ultimoPedidoISO, hoje),
        chamadaHa: silencioDaChamada(momento, chamadaISO, hoje),
      });
      chamadas.push({
        totalPedidos: cliente.totalPedidos,
        chamadaISO,
        ultimoPedidoISO,
      });
    }
    return {
      situacao: porId,
      retorno: retornoDasChamadas(chamadas, hoje),
    };
  }, [dados, hoje]);

  // A frase conta todas; a pílula, só quem ainda está para chamar (`#d312`).
  const { contagem, naPilula } = useMemo(() => {
    const zerado = (): Record<MomentoDaCliente, number> => ({
      voltam: 0,
      novas: 0,
      sumiram: 0,
      "uma-vez": 0,
      "sem-pedido": 0,
    });
    const porMomento = zerado();
    const paraChamar = zerado();
    for (const { momento, chamadaHa } of situacao.values()) {
      porMomento[momento]++;
      if (chamadaHa == null) paraChamar[momento]++;
    }
    return { contagem: porMomento, naPilula: paraChamar };
  }, [situacao]);

  const daVista = useMemo(
    () =>
      vista === "todas"
        ? dados
        : dados.filter(
            (cliente) => situacao.get(cliente.id)?.momento === vista,
          ),
    [dados, situacao, vista],
  );

  // A busca vale dentro da vista, e a vista de chamar impõe a ordem dela, com
  // a chamada há pouco no fim (`#d312`).
  const ordemDaVista = PARA_CHAMAR.has(vista) ? null : ordem;
  const visiveis = useMemo(() => {
    const ordenadas = ordenarClientes(
      filtrarClientes(daVista, busca),
      ordemDaVista ?? "PARADA",
    );
    if (ordemDaVista) return ordenadas;
    const chamada = (c: Cliente) => situacao.get(c.id)?.chamadaHa != null;
    return [
      ...ordenadas.filter((c) => !chamada(c)),
      ...ordenadas.filter(chamada),
    ];
  }, [daVista, busca, ordemDaVista, situacao]);
  const maiorGasto = Math.max(0, ...visiveis.map((c) => c.totalGasto));
  // Derivada, e não guardada: arquivada em outra aba, a ficha fecha sozinha.
  const selecionada = dados.find((cliente) => cliente.id === selecionadaId);
  const arranjo = arranjoDaTabela(!!selecionada);

  function mudarOrdem(nova: OrdemClientes) {
    setEscolhida(nova);
    try {
      localStorage.setItem(CHAVE_ORDEM, nova);
    } catch {
      // Sem armazenamento, a ordem vale só nesta visita.
    }
  }

  const vistas: OpcaoPilula<Vista>[] = VISTAS.map(({ valor, rotulo }) => {
    const quantas = valor === "todas" ? 0 : naPilula[valor];
    return { valor, rotulo: quantas > 0 ? `${rotulo} ${quantas}` : rotulo };
  });

  // `replace`, como em `/pedidos` (`#d246`): trocar de vista não é ir a outro
  // lugar. A busca fica: ela vale dentro da vista.
  function escolherVista(valor: Vista) {
    router.replace(
      valor === "todas" ? "/clientes" : `/clientes?vista=${valor}`,
    );
  }

  /** No desktop, a ficha ao lado da tabela; abaixo de `lg`, a folha. */
  function abrirFicha(cliente: Cliente) {
    if (window.matchMedia(DESKTOP).matches) {
      setSelecionadaId(cliente.id);
      return;
    }
    setLendoId(cliente.id);
    setFichaAberta(true);
  }

  /** Fecha a ficha ao lado e devolve o foco à linha que estava marcada. */
  function fecharFichaAcoplada() {
    const linha = lista.current?.querySelector<HTMLElement>(
      'button[aria-current="true"]',
    );
    setSelecionadaId(null);
    linha?.focus();
  }

  /**
   * "Editar" troca a folha pelo formulário, e fechar o formulário volta a
   * ela. A ficha acoplada fica onde está, com o formulário por cima.
   */
  function abrirEdicao(cliente: Cliente, daFolha: boolean) {
    if (daFolha) setFichaAberta(false);
    setEmEdicao({
      aberto: true,
      cliente,
      chave: `${cliente.id}-${novoId()}`,
      daFolha,
    });
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        pendente={pendente}
        recolhe
        descricao="Quem compra de você, quanto já deixou no caixa e quando foi a última vez. Pedido combinado e ainda não pago não entra na conta."
      >
        <div className="space-y-3">
          <CampoBusca
            rotulo="Buscar cliente"
            placeholder="Nome, telefone ou Instagram"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
          {vista === "todas" && (
            <FraseDoTopo
              total={dados.length}
              umaVez={contagem["uma-vez"]}
              sumiram={contagem.sumiram}
              retorno={retorno}
            />
          )}
          <Pilulas
            rotulo="Momento da cliente"
            opcoes={vistas}
            valor={vista}
            aoMudar={escolherVista}
            numerico
          />
        </div>
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          {carregando
            ? "Carregando"
            : `${visiveis.length} ${visiveis.length === 1 ? "cliente" : "clientes"}`}
        </p>
        {/* Em Sumiram e Uma vez só a ordem é da vista (`#d309`), e a escolha
            some enquanto ela está ativa. */}
        {ordemDaVista && (
          <EscolhaDeOrdem
            titulo="Ordenar clientes"
            opcoes={ORDENS}
            valor={ordemDaVista}
            aoMudar={mudarOrdem}
          />
        )}
      </div>

      {/* No desktop a tabela e a ficha da cliente selecionada dividem a
          largura: sem seleção, a tabela ocupa tudo (`#d310`). */}
      <div className="lg:flex lg:items-start lg:gap-4">
        <div className="mt-2 min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface">
          {erro ? (
            <EstadoVazio
              titulo="Não deu para carregar suas clientes"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          ) : carregando ? (
            <EsqueletoLista />
          ) : visiveis.length === 0 ? (
            dados.length > 0 && daVista.length === 0 ? (
              <VazioDaVista vista={vista} />
            ) : dados.length === 0 ? (
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
                titulo="Ninguém com essa busca"
                descricao="A busca acha pelo nome, pelo Instagram ou por quatro números ou mais do telefone."
                acao={<Botao onClick={() => setBusca("")}>Limpar busca</Botao>}
              />
            )
          ) : (
            <>
              {/* O cabeçalho das colunas é para quem vê: cada célula da linha
                carrega o rótulo em `sr-only`. */}
              <div
                aria-hidden
                className={cn(
                  "hidden border-b border-line text-micro font-semibold uppercase tracking-wide text-ink-muted",
                  arranjo.cabecalho,
                )}
              >
                <div
                  className={cn(
                    "grid flex-1 gap-x-4 px-4 py-2",
                    COLUNAS_CLIENTE,
                  )}
                >
                  <span>Cliente</span>
                  <span className="text-right">Pedidos</span>
                  <span className="text-right">Média</span>
                  <span className="text-right">Último</span>
                  <span className="text-right">Total</span>
                </div>
                {PARA_CHAMAR.has(vista) && <span className="w-32 shrink-0" />}
              </div>
              <ul ref={lista} className="divide-y divide-line">
                {visiveis.map((cliente) => (
                  <LinhaCliente
                    key={cliente.id}
                    cliente={cliente}
                    aoAbrir={abrirFicha}
                    maiorGasto={maiorGasto}
                    selecionada={cliente.id === selecionada?.id}
                    comFicha={!!selecionada}
                    parada={
                      PARA_CHAMAR.has(vista)
                        ? {
                            dias: situacao.get(cliente.id)?.dias ?? null,
                            chamadaHa:
                              situacao.get(cliente.id)?.chamadaHa ?? null,
                            negocio,
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {selecionada && (
          <FichaDaCliente
            key={selecionada.id}
            acoplada
            aberto
            aoFechar={fecharFichaAcoplada}
            aoEditar={() => abrirEdicao(selecionada, false)}
            cliente={selecionada}
            clientes={dados}
            hoje={hoje}
          />
        )}
      </div>

      {lendo && (
        <FichaDaCliente
          key={lendo.id}
          aberto={fichaAberta}
          aoFechar={() => setFichaAberta(false)}
          aoEditar={() => abrirEdicao(lendo, true)}
          cliente={lendo}
          clientes={dados}
          hoje={hoje}
        />
      )}

      <PainelCliente
        aberto={emEdicao.aberto}
        chave={emEdicao.chave}
        contaId={contaId}
        cliente={emEdicao.cliente}
        nomeSugerido={emEdicao.cliente?.nome ?? ""}
        podeArquivar
        aoSalvar={() => {}}
        aoFechar={() => {
          setEmEdicao((anterior) => ({ ...anterior, aberto: false }));
          // Arquivada, ela sai de `dados` e a ficha não volta.
          if (emEdicao.daFolha) setFichaAberta(true);
        }}
      />
    </>
  );
}

/**
 * "**38** de 55 compraram uma vez só. **4** que voltavam sumiram." No papel,
 * nada de cartão de métrica; cada metade só com número acima de zero, e só com
 * `CLIENTES_PARA_A_FRASE` clientes ou mais. Embaixo, com chamada nos últimos
 * 60 dias, "Das **8** que você chamou, **3** voltaram." (`#d312`).
 */
function FraseDoTopo({
  total,
  umaVez,
  sumiram,
  retorno,
}: {
  total: number;
  umaVez: number;
  sumiram: number;
  retorno: { chamadas: number; voltaram: number };
}) {
  const momentos =
    total >= CLIENTES_PARA_A_FRASE && (umaVez > 0 || sumiram > 0);
  if (!momentos && retorno.chamadas === 0) return null;
  return (
    <div className="space-y-1">
      {momentos && (
        <FraseDosMomentos total={total} umaVez={umaVez} sumiram={sumiram} />
      )}
      {retorno.chamadas > 0 && <FraseDoRetorno {...retorno} />}
    </div>
  );
}

function FraseDoRetorno({
  chamadas,
  voltaram,
}: {
  chamadas: number;
  voltaram: number;
}) {
  const forte = (n: number) => (
    <strong className="text-body font-semibold text-ink">{n}</strong>
  );
  return (
    <p className="num text-label text-ink-muted">
      {chamadas === 1 ? (
        <>
          Você chamou {forte(1)} cliente, e ela{" "}
          {voltaram > 0 ? "voltou." : "ainda não voltou."}
        </>
      ) : (
        <>
          Das {forte(chamadas)} que você chamou,{" "}
          {voltaram === 0 ? (
            "nenhuma voltou ainda."
          ) : (
            <>
              {forte(voltaram)} {voltaram === 1 ? "voltou." : "voltaram."}
            </>
          )}
        </>
      )}
    </p>
  );
}

function FraseDosMomentos({
  total,
  umaVez,
  sumiram,
}: {
  total: number;
  umaVez: number;
  sumiram: number;
}) {
  return (
    <p className="num text-label text-ink-muted">
      {umaVez > 0 && (
        <>
          <strong className="text-body font-semibold text-ink">{umaVez}</strong>{" "}
          de {total} {umaVez === 1 ? "comprou" : "compraram"} uma vez só.
        </>
      )}
      {umaVez > 0 && sumiram > 0 && " "}
      {sumiram > 0 && (
        <>
          <strong className="text-body font-semibold text-ink">
            {sumiram}
          </strong>{" "}
          {sumiram === 1 ? "que voltava sumiu." : "que voltavam sumiram."}
        </>
      )}
    </p>
  );
}

const VAZIO_DA_VISTA: Record<
  Exclude<Vista, "todas">,
  { titulo: string; descricao: string }
> = {
  sumiram: {
    titulo: "Ninguém sumiu",
    descricao:
      "Aqui aparece quem já pagou dois pedidos ou mais e está há 30 dias ou mais sem pedir. Com o histórico curto, ainda não deu tempo de ninguém sumir.",
  },
  "uma-vez": {
    titulo: "Ninguém parado no primeiro pedido",
    descricao: "Aqui aparece quem pagou um pedido só, há 30 dias ou mais.",
  },
  novas: {
    titulo: "Nenhuma cliente nova",
    descricao: "Aqui aparece quem pagou o primeiro pedido nos últimos 30 dias.",
  },
  voltam: {
    titulo: "Ninguém voltou nos últimos 30 dias",
    descricao:
      "Aqui aparece quem já pagou dois pedidos ou mais, o último nos últimos 30 dias.",
  },
};

/** Pílula sem ninguém continua tocável, e o vazio diz quem apareceria ali. */
function VazioDaVista({ vista }: { vista: Vista }) {
  if (vista === "todas") return null;
  return <EstadoVazio {...VAZIO_DA_VISTA[vista]} />;
}
