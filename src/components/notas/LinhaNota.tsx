"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { CircleAlert, Plus, RefreshCw, TriangleAlert, X } from "lucide-react";
import { formatarReferencia } from "@/components/insumos/FichaDoMaterial";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Selo } from "@/components/ui/Selo";
import {
  calcularCustoInsumo,
  CATEGORIAS_INSUMO,
} from "@/lib/domain/custoInsumo";
import {
  formatarCustoUnitario,
  formatarMoeda,
  parseParaNumero,
} from "@/lib/domain/money";
import {
  saltoDePreco,
  type CustoPorBase,
  type LinhaRascunho,
  type Pareamento,
} from "@/lib/domain/notaFiscal";
import {
  custoDeReferencia,
  GRUPOS_UNIDADE,
  ROTULO_UNIDADE_BASE,
  ROTULO_UNIDADE_COMPRA,
} from "@/lib/domain/unidades";
import type { CategoriaInsumo, UnidadeCompra } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A linha lida, do jeito que ela edita.
 *
 * `quantidadeTexto` existe porque "1," é estado legítimo de teclado, e o número
 * ao lado é o que o domínio consome. É a mesma separação do formulário de
 * insumo, e o motivo de `#d22` não ter virado biblioteca aqui: o que muda a
 * cada tecla é um campo só.
 */
export interface LinhaEditada extends LinhaRascunho {
  quantidadeTexto: string;
}

export function linhaEditada(linha: LinhaRascunho): LinhaEditada {
  return {
    ...linha,
    quantidadeTexto: String(linha.quantidadeCompra),
  };
}

/** Uma linha só vira documento com preço e com embalagem. */
export function linhaCompleta(linha: LinhaRascunho): boolean {
  return (
    linha.nome.trim().length >= 2 &&
    linha.precoCompra > 0 &&
    linha.quantidadeCompra > 0
  );
}

/** O custo como a nota diz, sem a perda: é a base do salto (`#d291`). */
function custoDaLinha(linha: LinhaRascunho) {
  return calcularCustoInsumo({
    precoCompra: linha.precoCompra,
    quantidadeCompra: linha.quantidadeCompra,
    unidadeCompra: linha.unidadeCompra,
    perdaPercentual: 0,
  });
}

/** Incompleta, ou com o preço por unidade dobrado ou pela metade. */
export function linhaParaConferir(
  linha: LinhaRascunho,
  anterior?: CustoPorBase,
): boolean {
  if (!linhaCompleta(linha)) return true;
  return !!anterior && !!saltoDePreco(anterior, custoDaLinha(linha));
}

/**
 * As seis colunas a partir de `xl` (`#d292`), no padrão da tabela de
 * Materiais (`#d225`): `minmax(0, …)` deixa a célula quebrar em vez de
 * empurrar a lista para fora da coluna.
 */
export const COLUNAS_NOTA =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,1.9fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)]";

/**
 * Uma linha da nota, fechada para ler e aberta para corrigir (`#d292`).
 *
 * O trabalho da conferência é confirmar, e corrigir é a exceção: fechada, a
 * linha se lê de relance contra o papel (o impresso, o nome, o preço pago e o
 * quanto sai o quilo); aberta, mostra os seis campos. Era um cartão por item,
 * com os campos sempre abertos, e vinte itens davam sete mil pixels de rolagem
 * para ela conferir que quinze estavam certos.
 *
 * Quem está com problema (incompleta, ou com salto) troca o detalhe pela frase
 * de atenção, e é isso que a faz saltar da lista. Quem decide qual está aberta é
 * a tela: uma por vez.
 */
export function LinhaNota({
  linha,
  par,
  anterior,
  aberta,
  aoAbrir,
  aoFechar,
  aoMudar,
  aoRemover,
}: {
  linha: LinhaEditada;
  /** O insumo que esta linha atualiza, quando o pareamento acertou. */
  par?: Pareamento;
  /** O custo gravado desse insumo, para desconfiar do salto (`#d291`). */
  anterior?: CustoPorBase;
  aberta: boolean;
  aoAbrir: () => void;
  aoFechar: () => void;
  aoMudar: (mudanca: Partial<LinhaEditada>) => void;
  aoRemover: () => void;
}) {
  const idPainel = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const custo = custoDaLinha(linha);
  const completa = linhaCompleta(linha);
  const salto = completa && anterior ? saltoDePreco(anterior, custo) : null;

  const nome = linha.nome.trim() || "Sem nome";
  const impresso = linha.descricao || "Linha sem descrição";
  const quantidade = `${formatarNumero(linha.quantidadeCompra)} ${linha.unidadeCompra}`;
  const referencia = custoDeReferencia(
    custo.custoUnidadeBase,
    custo.unidadeBase,
  );
  const valorReferencia = formatarReferencia(
    referencia.centavos,
    custo.unidadeBase,
  );
  const IconeDestino = par ? RefreshCw : Plus;
  const destino = par ? "Atualiza" : "Novo";

  const atencao = !completa ? (
    <Atencao icone={CircleAlert}>{faltaNaLinha(linha)}</Atencao>
  ) : salto && anterior ? (
    // Não bloqueia: preço dobra de verdade. Só troca o detalhe pela dúvida.
    <Atencao icone={TriangleAlert}>{fraseDoSalto(anterior, custo)}</Atencao>
  ) : null;

  function alternar() {
    const linhaNaTela = botao.current;
    const antes = linhaNaTela?.getBoundingClientRect().top ?? 0;
    flushSync(aberta ? aoFechar : aoAbrir);
    // Abrir esta fecha a que estava aberta acima, e a linha tocada subiria o
    // tamanho daquele painel. Ela fica sob o dedo.
    if (linhaNaTela) {
      window.scrollBy(0, linhaNaTela.getBoundingClientRect().top - antes);
    }
    painel.current?.querySelector<HTMLElement>("input, select")?.focus();
  }

  function fechar() {
    aoFechar();
    botao.current?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Escape") return;
    evento.preventDefault();
    fechar();
  }

  return (
    <li
      id={`linha-${linha.chave}`}
      className="scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
    >
      <div className="flex items-stretch">
        <button
          ref={botao}
          type="button"
          onClick={alternar}
          aria-expanded={aberta}
          aria-controls={aberta ? idPainel : undefined}
          className={cn(
            "min-h-14 min-w-0 flex-1 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
            aberta && "bg-sunken",
          )}
        >
          {/* ---- celular e tablet: o impresso em cima, nome e preço ---- */}
          <div className="py-3 pl-4 xl:hidden">
            {/* O que está impresso no papel, para conferir contra a nota que
                está na mão: o nome embaixo já é a tradução. */}
            <p className="num truncate text-micro text-ink-subtle">
              {impresso}
            </p>
            <div className="mt-1 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-ink">
                  {nome}
                </p>
                {!atencao && (
                  <p className="num truncate text-label text-ink-muted">
                    {[linha.marca.trim(), quantidade, destino]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="num shrink-0 text-right">
                <p className="text-body font-semibold text-ink">
                  {formatarMoeda(linha.precoCompra)}
                </p>
                {completa && (
                  <p className="text-label text-ink-muted">
                    {valorReferencia} {referencia.rotulo}
                  </p>
                )}
              </div>
            </div>
            {atencao && <div className="mt-1">{atencao}</div>}
          </div>

          {/* ---- computador: a linha da tabela (`#d292`) ---- */}
          <div
            className={cn(
              "hidden items-center gap-x-4 gap-y-1 py-3 pl-4 xl:grid",
              COLUNAS_NOTA,
            )}
          >
            <p className="num truncate text-label text-ink-muted">
              <span className="sr-only">Impresso: </span>
              {impresso}
            </p>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-ink">
                {nome}
              </p>
              {linha.marca.trim() && (
                <p className="truncate text-label text-ink-muted">
                  {linha.marca}
                </p>
              )}
            </div>
            <p className="num text-right text-body text-ink">
              <span className="sr-only">, </span>
              {quantidade}
            </p>
            <p className="num text-right text-body font-semibold text-ink">
              <span className="sr-only">, pago </span>
              {formatarMoeda(linha.precoCompra)}
            </p>
            <p className="num text-right text-body text-ink">
              {completa && (
                <>
                  <span className="sr-only">, </span>
                  {valorReferencia}
                  <span className="block text-micro font-medium text-ink-muted">
                    {referencia.rotulo}
                  </span>
                </>
              )}
            </p>
            <p className="flex items-center justify-end gap-1.5 text-label text-ink-muted">
              <span className="sr-only">, </span>
              <IconeDestino
                aria-hidden
                className="size-4 shrink-0"
                strokeWidth={1.75}
              />
              {destino}
            </p>
            {atencao && <div className="col-span-full">{atencao}</div>}
          </div>
        </button>

        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Tirar ${linha.nome || "esta linha"} da lista`}
          className="flex w-12 shrink-0 items-center justify-center text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink active:bg-sunken"
        >
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {aberta && (
        <div
          ref={painel}
          id={idPainel}
          role="group"
          aria-label={`Corrigir ${nome}`}
          onKeyDown={aoTeclar}
          className="border-t border-line px-4 pb-3 pt-4 lg:px-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo="Nome"
              value={linha.nome}
              onChange={(evento) => aoMudar({ nome: evento.target.value })}
            />
            <Campo
              rotulo="Marca"
              value={linha.marca}
              onChange={(evento) => aoMudar({ marca: evento.target.value })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CampoMoeda
              className="col-span-2 sm:col-span-1"
              rotulo="Preço pago"
              valor={linha.precoCompra}
              aoMudar={(centavos) => aoMudar({ precoCompra: centavos })}
            />

            <Campo
              rotulo="Quantidade"
              inputMode="decimal"
              value={linha.quantidadeTexto}
              onChange={(evento) =>
                aoMudar({
                  quantidadeTexto: evento.target.value,
                  quantidadeCompra: parseParaNumero(evento.target.value),
                })
              }
            />

            <Seletor
              rotulo="Unidade"
              value={linha.unidadeCompra}
              onChange={(evento) =>
                aoMudar({ unidadeCompra: evento.target.value as UnidadeCompra })
              }
            >
              {GRUPOS_UNIDADE.map((grupo) => (
                <optgroup key={grupo.grandeza} label={grupo.grandeza}>
                  {grupo.unidades.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade} · {ROTULO_UNIDADE_COMPRA[unidade]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Seletor>

            <Seletor
              className="col-span-2 sm:col-span-1"
              rotulo="Categoria"
              value={linha.categoria}
              onChange={(evento) =>
                aoMudar({ categoria: evento.target.value as CategoriaInsumo })
              }
            >
              {CATEGORIAS_INSUMO.map((categoria) => (
                <option key={categoria.valor} value={categoria.valor}>
                  {categoria.rotulo}
                </option>
              ))}
            </Seletor>
          </div>

          {/* A conta é o `ResumoCusto` do formulário de insumo em uma linha, e
              é o que denuncia unidade lida errada: R$ 12,50 divididos por 1
              grama saltam aos olhos. A dúvida já está na linha, acima. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {par ? (
              <Selo
                tom="info"
                icone={<RefreshCw aria-hidden className="size-3.5" />}
              >
                Atualiza · {par.nome} · era {formatarMoeda(par.precoAnterior)}
              </Selo>
            ) : (
              <Selo
                tom="marca"
                icone={<Plus aria-hidden className="size-3.5" />}
              >
                Novo
              </Selo>
            )}

            {completa && (
              <p className="num text-label text-ink-muted">
                {formatarMoeda(linha.precoCompra)}{" "}
                <span aria-label="dividido por">÷</span>{" "}
                {formatarNumero(linha.quantidadeCompra)} {linha.unidadeCompra} ={" "}
                <strong className="font-semibold text-ink">
                  {formatarCustoUnitario(custo.custoUnidadeBase)}
                </strong>{" "}
                por {ROTULO_UNIDADE_BASE[custo.unidadeBase]}
              </p>
            )}

            <Botao
              variante="terciaria"
              tamanho="sm"
              onClick={fechar}
              className="ml-auto -mr-3"
            >
              Pronto
            </Botao>
          </div>
        </div>
      )}
    </li>
  );
}

function Atencao({
  icone: Icone,
  children,
}: {
  icone: typeof CircleAlert;
  children: ReactNode;
}) {
  return (
    <p className="num flex items-start gap-1.5 text-label text-attention">
      <Icone
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      <span>{children}</span>
    </p>
  );
}

function faltaNaLinha(linha: LinhaRascunho): string {
  if (linha.nome.trim().length < 2) return "Falta o nome deste item.";
  if (linha.precoCompra <= 0) return "Falta o preço desta linha.";
  return "Falta dizer quanto vem na embalagem.";
}

/** "O quilo sai a R$ 54,90; era R$ 10,98. Confira a quantidade e a unidade." */
function fraseDoSalto(anterior: CustoPorBase, novo: CustoPorBase): string {
  const era = custoDeReferencia(
    anterior.custoUnidadeBase,
    anterior.unidadeBase,
  );
  const sai = custoDeReferencia(novo.custoUnidadeBase, novo.unidadeBase);
  const rotulo = sai.rotulo[0]!.toUpperCase() + sai.rotulo.slice(1);
  return `${rotulo} sai a ${formatarReferencia(sai.centavos, novo.unidadeBase)}; era ${formatarReferencia(era.centavos, anterior.unidadeBase)}. Confira a quantidade e a unidade.`;
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
