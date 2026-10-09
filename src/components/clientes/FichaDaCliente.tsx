"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  AtSign,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";
import { ID_PEDIDO_NOVO } from "@/components/pedidos/EditorPedido";
import {
  FichaAcoplada,
  FichaDoPedido,
} from "@/components/pedidos/FichaDoPedido";
import { SeloStatus } from "@/components/pedidos/SeloStatus";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Painel } from "@/components/ui/Painel";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  instagramParaLer,
  instagramParaLink,
  momentoDaCliente,
  resumoDaCliente,
  telefoneParaLer,
  temAlergia,
} from "@/lib/domain/clientes";
import { dataISODe, rotuloAgenda, rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  aReceber,
  faltaPagar,
  maisPedidos,
  quantidadeEmTexto,
  resumoDosItens,
} from "@/lib/domain/pedido";
import {
  linkDoWhatsApp,
  mensagemDeCobranca,
  mensagemDeVolta,
  primeiroNome,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import { consultaPedidosDaCliente } from "@/lib/firebase/mutations/pedidos";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Cliente, DataISO, Pedido } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** A lista dela mostra os dez mais recentes; o resto, no toque (`#d308`). */
const PEDIDOS_NA_FICHA = 10;

const MARCADOS = new Set(["CONFIRMADO", "EM_PRODUCAO", "PRONTO"]);

/**
 * A cliente para ler (`DECISOES.md#d308`), o desenho da `FichaDoPedido`: o
 * cabeçalho, a observação e os botões vêm do documento dela, na hora e sem
 * rede; o que ela deve, o que está marcado, o que ela pede e os pedidos vêm da
 * `consultaPedidosDaCliente` (`#d252`), com esqueleto só nesses blocos.
 *
 * Tocar num pedido troca esta folha pela ficha do pedido, sem empilhar dois
 * `Painel`, e fechar aquela devolve a esta.
 */
export function FichaDaCliente({
  aberto,
  aoFechar,
  aoEditar,
  cliente,
  hoje,
  acoplada = false,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoEditar: () => void;
  cliente: Cliente;
  hoje: DataISO;
  /** Na coluna ao lado da tabela, e não no `Painel`. Só no desktop. */
  acoplada?: boolean;
}) {
  const contaId = useContaId();
  const negocio = useAuth().conta?.nome ?? "";
  const consulta = useMemo(
    () => consultaPedidosDaCliente(contaId, cliente.id),
    [contaId, cliente.id],
  );
  const pedidos = useColecao<Pedido>(consulta);
  // Do cache e vazio não é "nenhum pedido": é o aparelho que nunca abriu.
  const esperando =
    pedidos.carregando || (pedidos.doCache && pedidos.dados.length === 0);

  const [lendo, setLendo] = useState<Pedido | null>(null);
  const [lendoAberto, setLendoAberto] = useState(false);
  const [todos, setTodos] = useState(false);

  function abrirPedido(pedido: Pedido) {
    setLendo(pedido);
    setLendoAberto(true);
  }

  const ultimoISO = cliente.ultimoPedidoEm
    ? dataISODe(cliente.ultimoPedidoEm.toDate())
    : null;
  const observacao = cliente.observacoes?.trim();
  const numero = telefoneParaWhatsApp(cliente.telefone);
  const instagram = instagramParaLink(cliente.instagram);
  const endereco = cliente.endereco?.trim();
  const contato = [
    telefoneParaLer(cliente.telefone),
    instagramParaLer(cliente.instagram),
  ].filter(Boolean);

  const deve = pedidos.dados
    .filter((pedido) => pedido.status === "ENTREGUE" && !pedido.pago)
    .reverse();
  const totalDevido = aReceber(deve).totalEntregue;
  const marcados = pedidos.dados
    .filter((pedido) => MARCADOS.has(pedido.status))
    .sort((a, b) =>
      `${a.dataEntregaISO}${a.horaEntrega ?? "99"}`.localeCompare(
        `${b.dataEntregaISO}${b.horaEntrega ?? "99"}`,
      ),
    );
  const contados = pedidos.dados.filter(
    (pedido) => pedido.status !== "CANCELADO",
  );
  const oQueElaPede = contados.length >= 2 ? produtosDela(contados) : [];
  // Parada (`#d309`): "Chamar de volta" vira o primeiro botão de "Falar com
  // ela", com o produto que ela mais pede, quando os pedidos já chegaram.
  const momento = momentoDaCliente(cliente, ultimoISO, hoje);
  const deVolta =
    numero && (momento === "sumiram" || momento === "uma-vez")
      ? mensagemDeVolta({
          primeiroNome: primeiroNome(cliente.nome),
          negocio,
          produto: produtosDela(contados)[0]?.nome || undefined,
        })
      : null;
  const naLista = todos
    ? pedidos.dados
    : pedidos.dados.slice(0, PEDIDOS_NA_FICHA);

  const rodape = (
    <div className="flex gap-2">
      <Link
        href={`/pedidos/${ID_PEDIDO_NOVO}?cliente=${cliente.id}`}
        className={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          className: "flex-1",
        })}
      >
        <Plus aria-hidden className="size-5" strokeWidth={2} />
        Novo pedido pra ela
      </Link>
      <Botao
        tamanho="lg"
        className="shrink-0"
        onClick={aoEditar}
        iconeInicial={
          <Pencil aria-hidden className="size-4" strokeWidth={1.75} />
        }
      >
        Editar
      </Botao>
    </div>
  );

  const conteudo = (
    <div className="space-y-6">
      {observacao &&
        (temAlergia(observacao) ? (
          <p className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft px-3 py-2.5 text-body text-ink">
            <TriangleAlert
              aria-hidden
              className="mt-1 size-4 shrink-0 text-attention"
              strokeWidth={2}
            />
            <span className="max-w-[60ch] whitespace-pre-line">
              <strong className="font-semibold">Alergia.</strong> {observacao}
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3 py-2.5 text-body text-ink">
            <Info
              aria-hidden
              className="mt-1 size-4 shrink-0 text-info"
              strokeWidth={1.75}
            />
            <span className="max-w-[60ch] whitespace-pre-line">
              {observacao}
            </span>
          </p>
        ))}

      {contato.length > 0 && (
        <div className="space-y-3">
          {/* Formatado só aqui (`#d310`): o documento fica como ela escreveu. */}
          <p className="num flex flex-wrap gap-x-2 text-body text-ink">
            {contato.map((parte, indice) => (
              <span key={parte}>
                {indice > 0 && (
                  <span aria-hidden className="mr-2 text-ink-subtle">
                    ·
                  </span>
                )}
                {parte}
              </span>
            ))}
          </p>
          {(numero || instagram) && (
            <div aria-label="Falar com ela" className="flex flex-wrap gap-2">
              {deVolta && (
                <a
                  href={linkDoWhatsApp(numero, deVolta)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao({ tamanho: "sm" })}
                >
                  <MessageCircle
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  Chamar de volta
                </a>
              )}
              {numero && (
                <>
                  {/* Um `<a>`, e não `window.open` (`#d77`). */}
                  <a
                    href={linkDoWhatsApp(numero, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classesBotao({ tamanho: "sm" })}
                  >
                    <MessageCircle
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.75}
                    />
                    WhatsApp
                  </a>
                  <a
                    href={`tel:+${numero}`}
                    className={classesBotao({ tamanho: "sm" })}
                  >
                    <Phone aria-hidden className="size-4" strokeWidth={1.75} />
                    Ligar
                  </a>
                </>
              )}
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao({ tamanho: "sm" })}
                >
                  <AtSign aria-hidden className="size-4" strokeWidth={1.75} />
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {pedidos.erro ? (
        // Informativo, e não erro: offline é o estado normal.
        <p className="text-label text-ink-muted">
          Os pedidos dela aparecem quando a conexão voltar.
        </p>
      ) : esperando ? (
        <div
          role="status"
          aria-label="Carregando os pedidos dela"
          className="space-y-3"
        >
          <Esqueleto className="h-5 w-1/3" />
          <Esqueleto className="h-12 w-full" />
          <Esqueleto className="h-12 w-full" />
        </div>
      ) : (
        <>
          {deve.length > 0 && (
            <Bloco
              titulo={
                <span className="flex items-center gap-1.5 text-negative">
                  <TrendingDown
                    aria-hidden
                    className="size-5"
                    strokeWidth={2}
                  />
                  <span className="num">Deve {formatarMoeda(totalDevido)}</span>
                </span>
              }
            >
              <Linhas>
                {deve.map((pedido) => (
                  <LinhaPedidoDela
                    key={pedido.id}
                    pedido={pedido}
                    dia={rotuloDia(pedido.dataEntregaISO)}
                    valor={faltaPagar(pedido)}
                    aoAbrir={abrirPedido}
                  />
                ))}
              </Linhas>
              {numero && (
                <a
                  href={linkDoWhatsApp(numero, mensagemDeCobranca(deve[0]!))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao({
                    tamanho: "sm",
                    className: "mt-3",
                  })}
                >
                  <MessageCircle
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                  {/* Uma mensagem por pedido; com mais de um, o mais
                          antigo, e os outros pela ficha de cada um. */}
                  {deve.length > 1
                    ? "Cobrar o mais antigo no WhatsApp"
                    : "Cobrar no WhatsApp"}
                </a>
              )}
            </Bloco>
          )}

          {marcados.length > 0 && (
            <Bloco titulo="Marcado">
              <Linhas>
                {marcados.map((pedido) => (
                  <LinhaPedidoDela
                    key={pedido.id}
                    pedido={pedido}
                    dia={
                      pedido.horaEntrega
                        ? `${rotuloAgenda(pedido.dataEntregaISO, hoje)}, às ${pedido.horaEntrega}`
                        : rotuloAgenda(pedido.dataEntregaISO, hoje)
                    }
                    valor={pedido.total}
                    aoAbrir={abrirPedido}
                  />
                ))}
              </Linhas>
            </Bloco>
          )}

          {oQueElaPede.length > 0 && (
            <Bloco titulo="O que ela pede">
              <ul className="space-y-1.5">
                {oQueElaPede.map((produto) => (
                  <li key={produto.id} className="text-body text-ink">
                    {produto.nome}
                    <span className="num text-label text-ink-muted">
                      {" "}
                      · {quantidadeEmTexto(produto.unidades)} no total
                    </span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          <Bloco titulo="Pedidos">
            {pedidos.dados.length === 0 ? (
              <p className="text-label text-ink-muted">
                Nenhum pedido ligado a ela ainda. O pedido anotado sem escolher
                a cliente cadastrada se acha pelo nome, em Pedidos.
              </p>
            ) : (
              <>
                <Linhas>
                  {naLista.map((pedido) => (
                    <LinhaPedidoDela
                      key={pedido.id}
                      pedido={pedido}
                      dia={rotuloDia(pedido.dataEntregaISO)}
                      valor={pedido.total}
                      aoAbrir={abrirPedido}
                      comStatus
                    />
                  ))}
                </Linhas>
                {naLista.length < pedidos.dados.length && (
                  <Botao
                    variante="terciaria"
                    larguraTotal
                    className="mt-2"
                    onClick={() => setTodos(true)}
                  >
                    Ver os {pedidos.dados.length} pedidos
                  </Botao>
                )}
              </>
            )}
          </Bloco>
        </>
      )}

      {endereco && (
        <Bloco titulo="Endereço">
          <p className="text-body text-ink">{endereco}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={classesBotao({ tamanho: "sm", className: "mt-2" })}
          >
            <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
            Abrir no mapa
          </a>
        </Bloco>
      )}
    </div>
  );

  const descricao = resumoDaCliente(cliente, ultimoISO);

  return (
    <>
      {acoplada ? (
        // A coluna ao lado da tabela (`#d310`); o pedido tocado abre por cima,
        // no `Painel`, e a ficha dela fica onde está.
        <FichaAcoplada
          id={cliente.id}
          titulo={cliente.nome}
          descricao={descricao}
          aoFechar={aoFechar}
          rodape={rodape}
        >
          {conteudo}
        </FichaAcoplada>
      ) : (
        <Painel
          aberto={aberto && !lendoAberto}
          aoFechar={aoFechar}
          titulo={cliente.nome}
          descricao={descricao}
          rodape={rodape}
        >
          {conteudo}
        </Painel>
      )}

      {lendo && (
        <FichaDoPedido
          aberto={aberto && lendoAberto}
          aoFechar={() => setLendoAberto(false)}
          pedido={lendo}
          hoje={hoje}
        />
      )}
    </>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-subheading font-semibold text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

function Linhas({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line border-y border-line">{children}</ul>
  );
}

/** Dia e itens à esquerda, o valor à direita; o toque abre a ficha do pedido. */
function LinhaPedidoDela({
  pedido,
  dia,
  valor,
  aoAbrir,
  comStatus = false,
}: {
  pedido: Pedido;
  dia: string;
  valor: number;
  aoAbrir: (pedido: Pedido) => void;
  comStatus?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(pedido)}
        className="flex min-h-11 w-full items-start gap-3 py-2.5 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body text-ink">{dia}</span>
          <span className="num block truncate text-label text-ink-muted">
            {resumoDosItens(pedido.itens, 2, { soNome: true })}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Dinheiro centavos={valor} />
          {comStatus && <SeloStatus status={pedido.status} />}
        </span>
      </button>
    </li>
  );
}

/**
 * Até três produtos que ela mais pede, por `maisPedidos`, com as unidades
 * somadas e o nome do pedido mais recente (a lista chega do mais novo).
 */
function produtosDela(
  pedidos: Pedido[],
): { id: string; nome: string; unidades: number }[] {
  return maisPedidos(pedidos)
    .slice(0, 3)
    .map((id) => {
      let nome = "";
      let unidades = 0;
      for (const pedido of pedidos) {
        for (const item of pedido.itens) {
          if (item.fichaTecnicaId !== id) continue;
          nome ||= item.nomeSnapshot;
          unidades += Math.max(0, item.quantidade);
        }
      }
      return { id, nome, unidades };
    });
}
