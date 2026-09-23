"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { orderBy, query, where } from "firebase/firestore";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Share2,
  Store,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { Painel } from "@/components/ui/Painel";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  DIAS_DE_PROMOCAO,
  entraNoCardapio,
  LIMITE_DO_CARDAPIO,
  porCategoria,
  precoVigente,
  problemaDaPromocao,
} from "@/lib/domain/cardapio";
import { dataISODe, diaVizinho, rotuloDiaPorExtenso } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { contagemDoPronto, temPronto } from "@/lib/domain/producao";
import { colFichas } from "@/lib/firebase/colecoes";
import { salvarCardapio } from "@/lib/firebase/mutations/configuracao";
import { useColecao } from "@/lib/hooks/useColecao";
import type {
  ConfiguracaoGeral,
  FichaTecnica,
  PromocaoDoCardapio,
} from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** O endereço e o `share` não mudam enquanto a tela está aberta. */
const SEM_MUDANCA = () => () => {};

/** "contado hoje", "contado ontem", "contado há 3 dias". */
function contadoHa(dias: number): string {
  if (dias === 0) return "contado hoje";
  if (dias === 1) return "contado ontem";
  return `contado há ${dias} dias`;
}

/** Onde o telefone mora: o bloco "Na folha do orçamento" desta mesma tela. */
export const ANCORA_DO_CONTATO = "folha-do-orcamento";

/**
 * "Seu cardápio" (spec 031, 3.A.5): a linha na prateleira de `/configuracao`,
 * irmã de "Quem te ajuda", e o painel de onde a dona abre o cardápio, escolhe
 * os produtos e copia o link. Só a dona o vê (`DECISOES.md#d157`).
 *
 * Cada toque grava na hora por `salvarCardapio` (a 015); o estado vem de volta
 * pelo documento que a tela já assina, e não de um estado local que poderia
 * discordar dele.
 */
export function SeuCardapio({
  configuracao,
  carregando: carregandoConfiguracao,
}: {
  configuracao: ConfiguracaoGeral | null;
  carregando: boolean;
}) {
  const contaId = useContaId();
  const { conta } = useAuth();
  const idInterruptor = useId();
  const idPromocoes = useId();

  // A mesma consulta de `/compras` e do editor de produto: o índice existe.
  const consulta = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const fichas = useColecao<FichaTecnica>(consulta);

  const aberto = configuracao?.cardapio?.aberto ?? false;
  const fichaIds = useMemo(
    () => configuracao?.cardapio?.fichaIds ?? [],
    [configuracao],
  );
  const marcadas = useMemo(() => new Set(fichaIds), [fichaIds]);
  const podem = useMemo(
    () => fichas.dados.filter(entraNoCardapio),
    [fichas.dados],
  );
  const grupos = useMemo(
    () => porCategoria(podem, configuracao?.categoriasProduto),
    [podem, configuracao],
  );
  const naPagina = podem.filter((ficha) => marcadas.has(ficha.id)).length;

  // Quantidade limitada (sessão D, `#d164`): só o marcado que tem pote.
  const [hoje] = useState(() => dataISODe(new Date()));
  const limitados = useMemo(
    () => configuracao?.cardapio?.limitados ?? [],
    [configuracao],
  );
  const comPote = podem.filter(
    (ficha) => marcadas.has(ficha.id) && temPronto(ficha),
  );
  const limitadoSemContagem = comPote.some(
    (ficha) =>
      limitados.includes(ficha.id) &&
      contagemDoPronto(ficha, hoje).quantidade === null,
  );
  const noLimite = fichaIds.length >= LIMITE_DO_CARDAPIO;

  // Promoções (sessão E, `#d165`): só as que valem hoje; a vencida, a de
  // produto desmarcado e a que ficou maior que o preço saem no próximo toque.
  const naLista = podem.filter((ficha) => marcadas.has(ficha.id));
  const promocoes = (configuracao?.cardapio?.promocoes ?? []).flatMap(
    (promocao) => {
      const ficha = naLista.find((f) => f.id === promocao.fichaId);
      return ficha && precoVigente(ficha, [promocao], hoje).cheio !== undefined
        ? [{ promocao, ficha }]
        : [];
    },
  );
  const [nova, setNova] = useState<PromocaoDoCardapio | null>(null);
  const [erroNova, setErroNova] =
    useState<ReturnType<typeof problemaDaPromocao>>(null);
  const fichaDaNova = naLista.find((f) => f.id === nova?.fichaId);

  const [painelAberto, setPainelAberto] = useState(false);
  // Só no navegador: o servidor não sabe o endereço nem se há `share`.
  const origem = useSyncExternalStore(
    SEM_MUDANCA,
    () => window.location.origin,
    () => "",
  );
  const podeCompartilhar = useSyncExternalStore(
    SEM_MUDANCA,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const relogio = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(relogio);
  }, [copiado]);

  const endereco = `${origem}/c/${contaId}`;
  const semTelefone = !configuracao?.contato?.telefone?.trim();

  function gravar(mudanca: {
    aberto?: boolean;
    fichaIds?: string[];
    limitados?: string[];
    promocoes?: PromocaoDoCardapio[];
  }) {
    const ids = mudanca.fichaIds ?? fichaIds;
    salvarCardapio(contaId, {
      aberto: mudanca.aberto ?? aberto,
      fichaIds: ids,
      limitados: mudanca.limitados ?? limitados,
      promocoes: (
        mudanca.promocoes ?? promocoes.map(({ promocao }) => promocao)
      ).filter((promocao) => ids.includes(promocao.fichaId)),
    });
  }

  function porEmPromocao() {
    if (!nova || !fichaDaNova) return;
    const problema = problemaDaPromocao(nova, fichaDaNova, hoje);
    if (problema) {
      setErroNova(problema);
      return;
    }
    // Uma por produto: a nova toma o lugar da que havia.
    gravar({
      promocoes: [
        ...promocoes
          .map(({ promocao }) => promocao)
          .filter((p) => p.fichaId !== nova.fichaId),
        nova,
      ],
    });
    setNova(null);
  }

  function encerrar(fichaId: string) {
    gravar({
      promocoes: promocoes
        .map(({ promocao }) => promocao)
        .filter((p) => p.fichaId !== fichaId),
    });
  }

  function marcar(fichaId: string, marcada: boolean) {
    gravar(
      marcada
        ? { fichaIds: [...fichaIds, fichaId] }
        : {
            // Saiu do cardápio, sai dos limitados: `limitados` ⊆ `fichaIds`.
            fichaIds: fichaIds.filter((id) => id !== fichaId),
            limitados: limitados.filter((id) => id !== fichaId),
          },
    );
  }

  function limitar(fichaId: string, limitada: boolean) {
    gravar({
      limitados: limitada
        ? [...limitados, fichaId]
        : limitados.filter((id) => id !== fichaId),
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
    } catch {
      // Sem permissão de área de transferência: o endereço está na tela,
      // selecionável num toque.
    }
  }

  function compartilhar() {
    // Fechar a folha do sistema sem escolher rejeita a promessa; não é erro.
    navigator.share({ title: conta?.nome, url: endereco }).catch(() => {});
  }

  const legenda = aberto
    ? `Aberto · ${naPagina} ${naPagina === 1 ? "produto" : "produtos"}`
    : "Fechado";

  return (
    <>
      <button
        type="button"
        onClick={() => setPainelAberto(true)}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
      >
        <Store
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">
            Seu cardápio
          </span>
          <span className="mt-0.5 block truncate text-label text-ink-muted">
            {/* Enquanto nada chega, nada: "Fechado" por um instante seria
                mentir para quem abriu. */}
            {carregandoConfiguracao || fichas.carregando ? " " : legenda}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </button>

      <Painel
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        titulo="Seu cardápio"
        descricao="Um link com os seus produtos e preços, para a bio do Instagram e o WhatsApp."
      >
        {carregandoConfiguracao || fichas.carregando ? (
          <EsqueletoLista linhas={3} />
        ) : fichas.erro ? (
          <p role="alert" className="text-label text-negative">
            Não deu para carregar os seus produtos. Verifique a conexão e abra
            de novo.
          </p>
        ) : !configuracao ? (
          // Gravar o cardápio numa conta que nunca salvou a configuração
          // criaria o documento sem os custos (`salvarCardapio`).
          <p className="max-w-[52ch] text-body text-ink">
            Salve a configuração uma vez, com o botão desta tela, e depois volte
            aqui para abrir o cardápio.
          </p>
        ) : podem.length === 0 ? (
          <div className="space-y-3">
            <p className="max-w-[52ch] text-body text-ink">
              Para montar o cardápio, dê um preço de venda aos seus produtos.
            </p>
            <Link
              href="/fichas"
              className={classesBotao({ variante: "secundaria" })}
            >
              Ver meus produtos
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex min-h-11 items-start gap-3">
              <input
                id={idInterruptor}
                type="checkbox"
                role="switch"
                checked={aberto}
                onChange={(evento) => gravar({ aberto: evento.target.checked })}
                className="mt-0.5 size-5 shrink-0"
              />
              <label htmlFor={idInterruptor} className="text-body text-ink">
                {aberto ? (
                  <>
                    <span className="font-semibold">Aberto:</span> quem tem o
                    link vê os produtos e faz o pedido.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Fechado:</span> o link
                    mostra que o cardápio não está aberto.
                  </>
                )}
              </label>
            </div>

            {aberto && (
              <div className="space-y-3">
                <p className="select-all break-all rounded-md bg-sunken px-4 py-3 text-label text-ink">
                  {endereco}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Botao
                    onClick={() => void copiar()}
                    iconeInicial={
                      copiado ? (
                        <Check aria-hidden className="size-4" strokeWidth={2} />
                      ) : (
                        <Copy
                          aria-hidden
                          className="size-4"
                          strokeWidth={1.75}
                        />
                      )
                    }
                  >
                    <span aria-live="polite">
                      {copiado ? "Copiado" : "Copiar"}
                    </span>
                  </Botao>
                  {podeCompartilhar && (
                    <Botao
                      onClick={compartilhar}
                      iconeInicial={
                        <Share2
                          aria-hidden
                          className="size-4"
                          strokeWidth={1.75}
                        />
                      }
                    >
                      Compartilhar
                    </Botao>
                  )}
                  <a
                    href={endereco}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classesBotao({ variante: "terciaria" })}
                  >
                    <ExternalLink
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.75}
                    />
                    Ver como a cliente vê
                  </a>
                </div>
              </div>
            )}

            {semTelefone && (
              <div className="flex items-start gap-2.5 rounded-md border border-attention/30 bg-attention-soft px-3 py-3 text-label text-ink">
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-attention"
                  strokeWidth={1.75}
                />
                <p>
                  Sem o seu WhatsApp, a cliente não tem como falar com você pelo
                  cardápio.{" "}
                  <a
                    href={`#${ANCORA_DO_CONTATO}`}
                    onClick={() => setPainelAberto(false)}
                    className="font-medium text-brand-ink underline underline-offset-2"
                  >
                    Pôr o telefone
                  </a>
                </p>
              </div>
            )}

            <fieldset>
              <legend className="text-label font-medium text-ink">
                O que aparece no cardápio
              </legend>
              <div className="mt-2 space-y-4">
                {grupos.map(({ categoria, itens }) => (
                  <div key={categoria}>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      {categoria}
                    </p>
                    <ul className="mt-1 divide-y divide-line border-y border-line">
                      {itens.map((ficha) => {
                        const marcada = marcadas.has(ficha.id);
                        return (
                          <li key={ficha.id}>
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 has-disabled:cursor-not-allowed has-disabled:opacity-45">
                              <input
                                type="checkbox"
                                checked={marcada}
                                disabled={!marcada && noLimite}
                                onChange={(evento) =>
                                  marcar(ficha.id, evento.target.checked)
                                }
                                className="size-5 shrink-0"
                              />
                              <span className="min-w-0 flex-1 wrap-break-word text-body text-ink">
                                {ficha.nome}
                              </span>
                              <Dinheiro
                                centavos={ficha.precificacao.precoVenda}
                                tamanho="sm"
                                className="shrink-0"
                              />
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {noLimite && (
                <p className="mt-3 text-label text-ink-muted">
                  O cardápio mostra até {LIMITE_DO_CARDAPIO} produtos. Desmarque
                  um para marcar outro.
                </p>
              )}
              <p className="mt-3 text-label text-ink-muted">
                Produtos vendidos por peso ainda não entram no cardápio.
              </p>
            </fieldset>

            {comPote.length > 0 && (
              <fieldset>
                <legend className="text-label font-medium text-ink">
                  Quantidade limitada
                </legend>
                <p className="mt-0.5 text-label text-ink-muted">
                  Mostre quantas restam e pare de receber pedido quando acabar.
                </p>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {comPote.map((ficha) => {
                    const limitada = limitados.includes(ficha.id);
                    const contagem = contagemDoPronto(ficha, hoje);
                    return (
                      <li key={ficha.id}>
                        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                          <input
                            type="checkbox"
                            checked={limitada}
                            onChange={(evento) =>
                              limitar(ficha.id, evento.target.checked)
                            }
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block wrap-break-word text-body text-ink">
                              {ficha.nome}
                            </span>
                            {contagem.quantidade !== null ? (
                              <span className="num block text-label text-ink-muted">
                                No pote: {contagem.quantidade},{" "}
                                {contadoHa(contagem.idadeEmDias ?? 0)}
                              </span>
                            ) : limitada ? (
                              <span className="flex items-start gap-1.5 text-label text-ink">
                                <TriangleAlert
                                  aria-hidden
                                  className="mt-0.5 size-3.5 shrink-0 text-attention"
                                  strokeWidth={1.75}
                                />
                                Sem contagem: o cardápio não mostra quantas
                                restam
                              </span>
                            ) : (
                              <span className="block text-label text-ink-muted">
                                Sem contagem
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {limitadoSemContagem && (
                  <Link
                    href="/fichas/contagem"
                    className={classesBotao({
                      variante: "secundaria",
                      className: "mt-3",
                    })}
                  >
                    Contar o que está pronto
                  </Link>
                )}
              </fieldset>
            )}

            {naLista.length > 0 && (
              <section aria-labelledby={idPromocoes}>
                <h3
                  id={idPromocoes}
                  className="text-label font-medium text-ink"
                >
                  Promoções
                </h3>
                <p className="mt-0.5 text-label text-ink-muted">
                  O preço riscado é o da ficha. Ele precisa ser o que você cobra
                  fora da promoção.
                </p>
                {promocoes.length > 0 && (
                  <ul className="mt-2 divide-y divide-line border-y border-line">
                    {promocoes.map(({ promocao, ficha }) => (
                      <li
                        key={promocao.fichaId}
                        className="flex min-h-11 items-center gap-3 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block wrap-break-word text-body text-ink">
                            {ficha.nome}
                          </span>
                          <span className="num block text-label text-ink-muted">
                            {formatarMoeda(promocao.preco)}{" "}
                            {promocao.ateISO === hoje
                              ? "até hoje"
                              : `até ${rotuloDiaPorExtenso(promocao.ateISO)}`}
                          </span>
                        </span>
                        <Botao
                          tamanho="sm"
                          variante="terciaria"
                          onClick={() => encerrar(promocao.fichaId)}
                          aria-label={`Encerrar a promoção de ${ficha.nome}`}
                        >
                          Encerrar
                        </Botao>
                      </li>
                    ))}
                  </ul>
                )}

                {nova ? (
                  <div className="mt-3 space-y-4 rounded-md border border-line p-4">
                    <Seletor
                      rotulo="Produto"
                      value={nova.fichaId}
                      onChange={(evento) => {
                        setErroNova(null);
                        setNova({ ...nova, fichaId: evento.target.value });
                      }}
                    >
                      {naLista.map((ficha) => (
                        <option key={ficha.id} value={ficha.id}>
                          {ficha.nome} ·{" "}
                          {formatarMoeda(ficha.precificacao.precoVenda)}
                        </option>
                      ))}
                    </Seletor>
                    {/* O erro mora no campo que o causa: `aria-invalid` e a
                        frase ligada a ele, como no resto dos formulários. */}
                    <CampoMoeda
                      rotulo="Preço na promoção"
                      valor={nova.preco}
                      erro={
                        erroNova === "sem-preco"
                          ? "Diga o preço na promoção."
                          : erroNova === "maior-que-o-preco" && fichaDaNova
                            ? `A promoção precisa ser menor que o preço de sempre, ${formatarMoeda(fichaDaNova.precificacao.precoVenda)}.`
                            : undefined
                      }
                      aoMudar={(preco) => {
                        setErroNova(null);
                        setNova({ ...nova, preco });
                      }}
                    />
                    <Campo
                      rotulo="Até quando"
                      type="date"
                      min={hoje}
                      max={diaVizinho(hoje, DIAS_DE_PROMOCAO)}
                      erro={
                        erroNova === "data"
                          ? `Escolha um dia entre hoje e ${rotuloDiaPorExtenso(diaVizinho(hoje, DIAS_DE_PROMOCAO))}.`
                          : undefined
                      }
                      value={nova.ateISO}
                      onChange={(evento) => {
                        setErroNova(null);
                        setNova({ ...nova, ateISO: evento.target.value });
                      }}
                    />
                    {fichaDaNova && nova.preco > 0 && (
                      <p aria-live="polite" className="num text-label">
                        {nova.preco >= fichaDaNova.custoUnitario ? (
                          <span className="text-ink">
                            Sobra pra você{" "}
                            {formatarMoeda(
                              nova.preco - fichaDaNova.custoUnitario,
                            )}{" "}
                            por unidade
                          </span>
                        ) : (
                          // Avisa e deixa gravar: pode ser a queima do fim do dia.
                          <span className="flex items-start gap-1.5 text-ink">
                            <TriangleAlert
                              aria-hidden
                              className="mt-0.5 size-3.5 shrink-0 text-attention"
                              strokeWidth={1.75}
                            />
                            Nesse preço você paga para vender.
                          </span>
                        )}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Botao variante="primaria" onClick={porEmPromocao}>
                        Pôr em promoção
                      </Botao>
                      <Botao
                        variante="terciaria"
                        onClick={() => {
                          setNova(null);
                          setErroNova(null);
                        }}
                      >
                        Cancelar
                      </Botao>
                    </div>
                  </div>
                ) : (
                  <Botao
                    className="mt-3"
                    iconeInicial={
                      <Tag aria-hidden className="size-4" strokeWidth={1.75} />
                    }
                    onClick={() =>
                      setNova({
                        fichaId: naLista[0]!.id,
                        preco: 0,
                        ateISO: diaVizinho(hoje, 7),
                      })
                    }
                  >
                    Nova promoção
                  </Botao>
                )}
              </section>
            )}
          </div>
        )}
      </Painel>
    </>
  );
}
