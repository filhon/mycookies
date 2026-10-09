"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas, type OpcaoPilula } from "@/components/ui/Pilulas";
import { classesBotao } from "@/components/ui/estilosBotao";
import { FichaDaCliente } from "./FichaDaCliente";
import { LinhaCliente } from "./LinhaCliente";
import { PainelCliente } from "./PainelCliente";
import {
  diasSemPedir,
  momentoDaCliente,
  ordenarPorGasto,
  type MomentoDaCliente,
} from "@/lib/domain/clientes";
import { dataISODe } from "@/lib/domain/datas";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { consultaClientes } from "@/lib/firebase/mutations/clientes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Cliente } from "@/lib/types";
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
  }>({ aberto: false, chave: "fechado" });
  // Tocar lê (`#d308`). O id fica depois de fechar, para a folha descer com o
  // conteúdo dentro; a cliente vem da lista, viva, e some se for arquivada.
  const [lendoId, setLendoId] = useState<string | null>(null);
  const [fichaAberta, setFichaAberta] = useState(false);

  const consulta = useMemo(() => consultaClientes(contaId), [contaId]);
  const { dados, carregando, erro, pendente } = useColecao<Cliente>(consulta);
  const lendo = dados.find((cliente) => cliente.id === lendoId);

  // O momento e os dias de cada uma, uma vez por leitura da coleção.
  const situacao = useMemo(() => {
    const porId = new Map<
      string,
      { momento: MomentoDaCliente; dias: number | null }
    >();
    for (const cliente of dados) {
      const ultimoISO = cliente.ultimoPedidoEm
        ? dataISODe(cliente.ultimoPedidoEm.toDate())
        : null;
      porId.set(cliente.id, {
        momento: momentoDaCliente(cliente, ultimoISO, hoje),
        dias: diasSemPedir(ultimoISO, hoje),
      });
    }
    return porId;
  }, [dados, hoje]);

  const contagem = useMemo(() => {
    const porMomento: Record<MomentoDaCliente, number> = {
      voltam: 0,
      novas: 0,
      sumiram: 0,
      "uma-vez": 0,
      "sem-pedido": 0,
    };
    for (const { momento } of situacao.values()) porMomento[momento]++;
    return porMomento;
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

  // A busca vale dentro da vista.
  const visiveis = useMemo(() => {
    const termo = chaveDeBusca(busca);
    const filtradas = termo
      ? daVista.filter((cliente) => cliente.nomeBusca.includes(termo))
      : daVista;
    if (!PARA_CHAMAR.has(vista)) return ordenarPorGasto(filtradas);
    // Há mais tempo sem pedir primeiro; sem a data, antes de todas.
    const dias = (cliente: Cliente) =>
      situacao.get(cliente.id)?.dias ?? Infinity;
    return [...filtradas].sort(
      (a, b) => dias(b) - dias(a) || a.nomeBusca.localeCompare(b.nomeBusca),
    );
  }, [daVista, busca, vista, situacao]);

  const vistas: OpcaoPilula<Vista>[] = VISTAS.map(({ valor, rotulo }) => {
    const quantas = valor === "todas" ? 0 : contagem[valor];
    return { valor, rotulo: quantas > 0 ? `${rotulo} ${quantas}` : rotulo };
  });

  // `replace`, como em `/pedidos` (`#d246`): trocar de vista não é ir a outro
  // lugar. A busca fica: ela vale dentro da vista.
  function escolherVista(valor: Vista) {
    router.replace(
      valor === "todas" ? "/clientes" : `/clientes?vista=${valor}`,
    );
  }

  function abrirFicha(cliente: Cliente) {
    setLendoId(cliente.id);
    setFichaAberta(true);
  }

  /** "Editar" troca a ficha pelo formulário; fechar o formulário volta a ela. */
  function abrirEdicao(cliente: Cliente) {
    setFichaAberta(false);
    setEmEdicao({ aberto: true, cliente, chave: `${cliente.id}-${novoId()}` });
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
            placeholder="Buscar cliente"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
          {vista === "todas" && dados.length >= CLIENTES_PARA_A_FRASE && (
            <FraseDoTopo
              total={dados.length}
              umaVez={contagem["uma-vez"]}
              sumiram={contagem.sumiram}
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
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
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
              titulo="Ninguém com esse nome"
              descricao="Tente outro termo de busca."
              acao={<Botao onClick={() => setBusca("")}>Limpar busca</Botao>}
            />
          )
        ) : (
          <ul className="divide-y divide-line">
            {visiveis.map((cliente) => (
              <LinhaCliente
                key={cliente.id}
                cliente={cliente}
                aoAbrir={abrirFicha}
                parada={
                  PARA_CHAMAR.has(vista)
                    ? { dias: situacao.get(cliente.id)?.dias ?? null, negocio }
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      {lendo && (
        <FichaDaCliente
          key={lendo.id}
          aberto={fichaAberta}
          aoFechar={() => setFichaAberta(false)}
          aoEditar={() => abrirEdicao(lendo)}
          cliente={lendo}
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
          setFichaAberta(true);
        }}
      />
    </>
  );
}

/**
 * "**38** de 55 compraram uma vez só. **4** que voltavam sumiram." No papel,
 * nada de cartão de métrica; cada metade só com número acima de zero.
 */
function FraseDoTopo({
  total,
  umaVez,
  sumiram,
}: {
  total: number;
  umaVez: number;
  sumiram: number;
}) {
  if (umaVez === 0 && sumiram === 0) return null;
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
