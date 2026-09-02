"use client";

import Link from "next/link";
import { orderBy, query, where } from "firebase/firestore";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  RotateCcw,
  ScanLine,
  Store,
  Undo2,
} from "lucide-react";
import { Cookie } from "@/components/marca/Marca";
import { Bloco } from "@/components/ui/Bloco";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  CartaoLinhaNota,
  linhaCompleta,
  linhaEditada,
  type LinhaEditada,
} from "./CartaoLinhaNota";
import { RodapeNota, type ResumoDaNota } from "./RodapeNota";
import { dataISODe } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  atualizacaoDaLinha,
  cadastroDaLinha,
  conferirTotal,
  MENSAGEM_FALHA,
  normalizarNota,
  parearComInsumos,
  somarLinhas,
  type FalhaNota,
  type NotaLida,
  type RascunhoNota,
} from "@/lib/domain/notaFiscal";
import { colInsumos } from "@/lib/firebase/colecoes";
import { dadosDoInsumo } from "@/lib/firebase/mutations/insumos";
import {
  importarNota,
  type LinhaImportada,
  type ResultadoImportacao,
} from "@/lib/firebase/mutations/notas";
import { useColecao } from "@/lib/hooks/useColecao";
import { useConexao } from "@/lib/hooks/useDispositivo";
import type { Insumo } from "@/lib/types";
import { prepararParaLeitura } from "@/lib/utils/imagem";
import { useAuth, useContaId } from "@/providers/AuthProvider";

type Etapa = "escolher" | "lendo" | "conferindo" | "pronto";

interface Cabecalho {
  estabelecimento: string;
  cidade: string;
  dataISO: string;
}

/**
 * Do papel ao insumo: fotografar, ler, conferir, corrigir, remover e cadastrar.
 *
 * É página e não painel, e isso contraria a invariante do `CLAUDE.md` de
 * propósito: aquela regra é sobre formulário de **um** objeto, e aqui são seis
 * a vinte objetos editáveis — em 360px isso não cabe numa folha inferior. É a
 * mesma razão pela qual `/fichas/[id]` e `/pedidos/[id]` são páginas.
 *
 * Nenhuma linha lida vira documento sem ela ter visto. O modelo é um
 * datilógrafo rápido, não uma testemunha.
 */
export function TelaNota() {
  const contaId = useContaId();
  const { usuario } = useAuth();
  const online = useConexao();

  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const { dados: insumos } = useColecao<Insumo>(consulta);

  const [etapa, setEtapa] = useState<Etapa>("escolher");
  const [falha, setFalha] = useState<FalhaNota | null>(null);
  const [erroAoGravar, setErroAoGravar] = useState<string | null>(null);

  const [cabecalho, setCabecalho] = useState<Cabecalho>({
    estabelecimento: "",
    cidade: "",
    dataISO: "",
  });
  const [total, setTotal] = useState(0);
  const [linhas, setLinhas] = useState<LinhaEditada[]>([]);
  const [removidas, setRemovidas] = useState<LinhaEditada[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  const seletor = useRef<HTMLInputElement>(null);

  // O pareamento sai do nome **atual** da linha, e é refeito a cada tecla:
  // corrigir o nome é o que desfaz um pareamento errado, sem nenhum controle a
  // mais na tela.
  const pares = useMemo(
    () => parearComInsumos(linhas, insumos),
    [linhas, insumos],
  );

  const porId = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  const resumo: ResumoDaNota = {
    linhas: linhas.length,
    atualizacoes: linhas.filter((linha) => pares.has(linha.chave)).length,
    incompletas: linhas.filter((linha) => !linhaCompleta(linha)).length,
    conferencia: conferirTotal(linhas, total),
    removido: somarLinhas(removidas),
  };

  function recomecar() {
    setEtapa("escolher");
    setFalha(null);
    setErroAoGravar(null);
    setLinhas([]);
    setRemovidas([]);
    setResultado(null);
    setTotal(0);
    setCabecalho({ estabelecimento: "", cidade: "", dataISO: "" });
  }

  function receber(rascunho: RascunhoNota) {
    setCabecalho({
      estabelecimento: rascunho.estabelecimento,
      cidade: rascunho.cidade,
      // Data ilegível não deixa o campo vazio: a compra é de hoje quase sempre,
      // e um campo de data em branco é mais trabalho do que uma data para
      // corrigir.
      dataISO: rascunho.dataISO || dataISODe(new Date()),
    });
    setTotal(rascunho.total);
    setLinhas(rascunho.linhas.map(linhaEditada));
    setRemovidas([]);
    setEtapa("conferindo");
  }

  async function ler(arquivo: File) {
    setFalha(null);

    if (!online) {
      setFalha("sem-rede");
      return;
    }
    if (!usuario) {
      setFalha("sem-acesso");
      return;
    }

    setEtapa("lendo");

    try {
      const preparado = await prepararParaLeitura(arquivo);
      const token = await usuario.getIdToken();

      const resposta = await fetch("/api/nota", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contaId, arquivo: preparado }),
      });

      if (!resposta.ok) {
        setFalha(await codigoDaFalha(resposta));
        setEtapa("escolher");
        return;
      }

      receber(normalizarNota((await resposta.json()) as NotaLida));
    } catch {
      // Rede caiu no meio, arquivo ilegível, resposta truncada: para ela é a
      // mesma coisa, e a mesma frase.
      setFalha("sem-resposta");
      setEtapa("escolher");
    }
  }

  async function cadastrar() {
    setErroAoGravar(null);
    setSalvando(true);

    try {
      const importadas: LinhaImportada[] = linhas.map((linha) => {
        const par = pares.get(linha.chave);
        const anterior = par ? porId.get(par.insumoId) : undefined;

        // Uma nota traz preço. Ela não traz o que você configurou: perda,
        // estoque, categoria e o nome cadastrado vêm de `dadosDoInsumo` e só
        // são sobrescritos pelo que `atualizacaoDaLinha` deixa passar.
        if (anterior) {
          return {
            anterior,
            dados: {
              ...dadosDoInsumo(anterior),
              ...atualizacaoDaLinha(anterior, linha, cabecalho.estabelecimento),
            },
          };
        }

        return { dados: cadastroDaLinha(linha, cabecalho.estabelecimento) };
      });

      setResultado(await importarNota(contaId, importadas));
      setEtapa("pronto");
    } catch {
      setErroAoGravar(
        "Não deu para cadastrar agora. Nada foi gravado pela metade — tente de novo em instantes.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 pb-3 pt-3 lg:-mx-8 lg:px-8 lg:pb-4 lg:pt-6">
        <Link
          href="/insumos"
          className="toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          Insumos
        </Link>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-display text-title font-semibold text-ink lg:text-display">
            {etapa === "conferindo" ? "Confira a leitura" : "Ler uma nota"}
          </h1>
          {etapa === "conferindo" && (
            <Botao
              tamanho="sm"
              onClick={recomecar}
              className="shrink-0"
              iconeInicial={
                <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Outra nota
            </Botao>
          )}
        </div>
      </header>

      <input
        // Sem `capture`: o atributo forçaria a câmera e tiraria dela a galeria e
        // o gerenciador de arquivos. Sem ele, o iPhone oferece as três opções e
        // o computador abre o seletor de PDF. Um controle, dois contextos.
        ref={seletor}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          evento.target.value = "";
          if (arquivo) void ler(arquivo);
        }}
      />

      <div
        className={`mt-4 space-y-4 ${etapa === "conferindo" ? "pb-56 lg:pb-48" : ""}`}
      >
        {etapa === "escolher" && (
          <>
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <EstadoVazio
                titulo="A nota já sabe tudo isso"
                descricao="Fotografe o cupom, ou escolha o PDF que o mercado mandou. Você confere linha por linha antes de qualquer coisa virar cadastro."
                acao={
                  <Botao
                    variante="primaria"
                    tamanho="lg"
                    disabled={!online}
                    onClick={() => seletor.current?.click()}
                    iconeInicial={
                      <ScanLine
                        aria-hidden
                        className="size-5"
                        strokeWidth={1.75}
                      />
                    }
                  >
                    Escolher a nota
                  </Botao>
                }
              />
            </div>

            {/* Sem rede a frase é uma só: dizer "a leitura falhou" por cima de
                "não há internet" seria contar duas vezes a mesma coisa. */}
            {!online ? (
              <Aviso>{MENSAGEM_FALHA["sem-rede"]}</Aviso>
            ) : (
              falha && <Aviso>{MENSAGEM_FALHA[falha]}</Aviso>
            )}

            <p className="max-w-[62ch] text-label text-ink-muted">
              A foto não é guardada: ela sobe, a leitura volta, e o arquivo é
              descartado. O que fica é o preço de cada insumo, com a data da
              compra, dentro do próprio insumo.
            </p>
          </>
        )}

        {etapa === "lendo" && <Lendo />}

        {etapa === "conferindo" && (
          <>
            <Bloco
              icone={Store}
              titulo="A compra"
              descricao="Onde comprou vale para todas as linhas. Corrija aqui uma vez."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo
                  rotulo="Onde comprou"
                  value={cabecalho.estabelecimento}
                  placeholder="Mercado"
                  onChange={(evento) =>
                    setCabecalho((anterior) => ({
                      ...anterior,
                      estabelecimento: evento.target.value,
                    }))
                  }
                />
                <Campo
                  rotulo="Data da compra"
                  type="date"
                  value={cabecalho.dataISO}
                  onChange={(evento) =>
                    setCabecalho((anterior) => ({
                      ...anterior,
                      dataISO: evento.target.value,
                    }))
                  }
                />
              </div>

              {/* Cidade e UF não são campo: são a confirmação de que ela está
                  conferindo a nota que acha que está conferindo, e somem quando
                  a consulta de CNPJ não responde. O total impresso não depende
                  delas — ele veio do papel. */}
              {(cabecalho.cidade || total > 0) && (
                <p className="text-label text-ink-muted">
                  {cabecalho.cidade}
                  {cabecalho.cidade && total > 0 && (
                    <span className="mx-1.5 text-ink-subtle">·</span>
                  )}
                  {total > 0 && (
                    <span className="num">
                      Total impresso na nota: {formatarMoeda(total)}
                    </span>
                  )}
                </p>
              )}
            </Bloco>

            <ul className="space-y-3">
              {linhas.map((linha) => (
                <CartaoLinhaNota
                  key={linha.chave}
                  linha={linha}
                  par={pares.get(linha.chave)}
                  aoMudar={(mudanca) =>
                    setLinhas((anteriores) =>
                      anteriores.map((atual) =>
                        atual.chave === linha.chave
                          ? { ...atual, ...mudanca }
                          : atual,
                      ),
                    )
                  }
                  aoRemover={() => {
                    setLinhas((anteriores) =>
                      anteriores.filter((atual) => atual.chave !== linha.chave),
                    );
                    setRemovidas((anteriores) => [...anteriores, linha]);
                  }}
                />
              ))}
            </ul>

            {removidas.length > 0 && (
              <ForaDaCompra
                linhas={removidas}
                aoTrazer={(chave) => {
                  const linha = removidas.find(
                    (atual) => atual.chave === chave,
                  );
                  if (!linha) return;
                  setRemovidas((anteriores) =>
                    anteriores.filter((atual) => atual.chave !== chave),
                  );
                  setLinhas((anteriores) =>
                    [...anteriores, linha].sort((a, b) =>
                      a.chave.localeCompare(b.chave, "pt-BR", {
                        numeric: true,
                      }),
                    ),
                  );
                }}
              />
            )}

            {erroAoGravar && <Aviso>{erroAoGravar}</Aviso>}
          </>
        )}

        {etapa === "pronto" && resultado && (
          <Pronto resultado={resultado} aoLerOutra={recomecar} />
        )}
      </div>

      {etapa === "conferindo" && (
        <RodapeNota
          resumo={resumo}
          salvando={salvando}
          aoCadastrar={() => void cadastrar()}
        />
      )}
    </>
  );
}

/** O código da falha vem do corpo; o status é a reserva quando ele não vem. */
async function codigoDaFalha(resposta: Response): Promise<FalhaNota> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA) {
      return corpo.erro as FalhaNota;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 413) return "arquivo-grande";
  if (resposta.status === 422) return "fora-de-forma";
  return "sem-resposta";
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft px-4 py-3 text-label text-ink"
    >
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
      <span className="max-w-[60ch]">{children}</span>
    </p>
  );
}

/**
 * A espera é longa e é a única do sistema: entre dez e trinta segundos, com um
 * serviço externo do outro lado. Um esqueleto mentiria sobre o que está
 * acontecendo, então a tela diz.
 */
function Lendo() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <Cookie
        gotas={false}
        className="size-12 animate-pulse text-wine-700 dark:text-wine-300"
      />
      <p
        aria-live="polite"
        className="mt-5 font-display text-title font-semibold text-ink"
      >
        Lendo a nota
      </p>
      <p className="mt-2 max-w-[42ch] text-body text-ink-muted">
        Isso leva alguns segundos. Não feche a tela — nada é cadastrado antes de
        você conferir.
      </p>
    </div>
  );
}

/**
 * O que ela tirou da lista.
 *
 * Remover aqui não é apagar documento: não existe documento ainda, e a
 * invariante de nunca apagar não se aplica. O que se aplica é não perder o que
 * foi lido — daí o bloco, e daí "trazer de volta".
 */
function ForaDaCompra({
  linhas,
  aoTrazer,
}: {
  linhas: LinhaEditada[];
  aoTrazer: (chave: string) => void;
}) {
  return (
    <section
      aria-labelledby="fora-da-compra"
      className="overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5">
        <h2
          id="fora-da-compra"
          className="text-subheading font-semibold text-ink"
        >
          {linhas.length}{" "}
          {linhas.length === 1
            ? "item fora desta compra"
            : "itens fora desta compra"}
        </h2>
        <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
          Não viram cadastro e não entram na soma. Continuam aqui caso você
          tenha tirado sem querer.
        </p>
      </div>

      <ul className="divide-y divide-line">
        {linhas.map((linha) => (
          <li
            key={linha.chave}
            className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 lg:px-5"
          >
            <span className="min-w-0">
              <span className="block truncate text-body text-ink">
                {linha.nome}
              </span>
              <span className="num mt-0.5 block truncate text-label text-ink-muted">
                {formatarMoeda(linha.valorTotal)}
              </span>
            </span>
            <Botao
              tamanho="sm"
              onClick={() => aoTrazer(linha.chave)}
              iconeInicial={
                <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Trazer de volta
            </Botao>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pronto({
  resultado,
  aoLerOutra,
}: {
  resultado: ResultadoImportacao;
  aoLerOutra: () => void;
}) {
  const { criados, atualizados, fichasMarcadas } = resultado;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Check aria-hidden className="size-10 text-positive" strokeWidth={2} />
        <h2 className="mt-4 font-display text-title font-semibold text-ink">
          A compra virou cadastro
        </h2>

        <div className="mt-3 max-w-[46ch] space-y-1 text-body text-ink-muted">
          {criados > 0 && (
            <p>
              <strong className="num font-semibold text-ink">{criados}</strong>{" "}
              {criados === 1 ? "insumo novo" : "insumos novos"}.
            </p>
          )}
          {atualizados > 0 && (
            <p>
              <strong className="num font-semibold text-ink">
                {atualizados}
              </strong>{" "}
              {atualizados === 1
                ? "já existia e teve o preço atualizado"
                : "já existiam e tiveram o preço atualizado"}
              , com a compra guardada no histórico.
            </p>
          )}
          {fichasMarcadas > 0 && (
            <p>
              <strong className="num font-semibold text-ink">
                {fichasMarcadas}
              </strong>{" "}
              {fichasMarcadas === 1 ? "ficha ficou" : "fichas ficaram"} com o
              custo desatualizado. Abra e salve para o preço acompanhar.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/insumos"
            className={classesBotao({ variante: "secundaria", tamanho: "lg" })}
          >
            Ver os insumos
          </Link>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={aoLerOutra}
            iconeInicial={
              <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
            }
          >
            Ler outra nota
          </Botao>
        </div>
      </div>
    </div>
  );
}
