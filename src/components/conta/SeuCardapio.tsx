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
  TriangleAlert,
} from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { Painel } from "@/components/ui/Painel";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  entraNoCardapio,
  LIMITE_DO_CARDAPIO,
  porCategoria,
} from "@/lib/domain/cardapio";
import { colFichas } from "@/lib/firebase/colecoes";
import { salvarCardapio } from "@/lib/firebase/mutations/configuracao";
import { useColecao } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral, FichaTecnica } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** O endereço e o `share` não mudam enquanto a tela está aberta. */
const SEM_MUDANCA = () => () => {};

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
  const noLimite = fichaIds.length >= LIMITE_DO_CARDAPIO;

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

  function gravar(mudanca: { aberto?: boolean; fichaIds?: string[] }) {
    salvarCardapio(contaId, {
      aberto: mudanca.aberto ?? aberto,
      fichaIds: mudanca.fichaIds ?? fichaIds,
    });
  }

  function marcar(fichaId: string, marcada: boolean) {
    gravar({
      fichaIds: marcada
        ? [...fichaIds, fichaId]
        : fichaIds.filter((id) => id !== fichaId),
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
                    link vê os produtos e fala com você.
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
                Combos à escolha e produtos vendidos por peso ainda não entram
                no cardápio.
              </p>
            </fieldset>
          </div>
        )}
      </Painel>
    </>
  );
}
