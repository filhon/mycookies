"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { usoDoMaterial, type CustoDeHoje } from "@/lib/domain/custoFicha";
import {
  basesQueNaoBatem,
  comprasDoInsumo,
  type CompraDoInsumo,
} from "@/lib/domain/custoInsumo";
import { dataISODe, rotuloDataCompleta, rotuloDia } from "@/lib/domain/datas";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import {
  custoDeReferencia,
  formatarQuantidade,
  paraBase,
  PLURAL_UNIDADE_BASE,
} from "@/lib/domain/unidades";
import {
  descartarCompra,
  restaurarCompra,
} from "@/lib/firebase/mutations/insumos";
import type {
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  OrigemCompra,
  UnidadeBase,
  UnidadeRendimento,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";

export const POR_UNIDADE: Record<UnidadeRendimento, string> = {
  un: "por unidade",
  porcao: "por porção",
  g: "por grama",
  ml: "por ml",
};

/** O quilo e o litro em centavos inteiros; a unidade, fracionária (`#d220`). */
export function formatarReferencia(centavos: number, unidadeBase: UnidadeBase) {
  return unidadeBase === "un"
    ? formatarCustoUnitario(centavos)
    : formatarMoeda(centavos);
}

function dia(ms: number): DataISO {
  return dataISODe(new Date(ms));
}

/** "subiu 9%" / "caiu 6%"; nada abaixo de 1%. */
function palavraVariacao(variacao: number | null): string | null {
  if (variacao === null || Math.abs(variacao) < 1) return null;
  return `${variacao > 0 ? "subiu" : "caiu"} ${Math.abs(variacao)}%`;
}

const PROCEDENCIA: Record<OrigemCompra, string> = {
  NOTA: "Nota",
  MANUAL: "À mão",
  MERCADO: "No mercado",
};

/** "Nota · Atacadão", "À mão", "No mercado"; nada nas antigas (spec 189). */
function procedenciaDe(compra: CompraDoInsumo): string | null {
  if (!compra.origem) return null;
  return compra.origem === "NOTA" && compra.estabelecimento
    ? `Nota · ${compra.estabelecimento}`
    : PROCEDENCIA[compra.origem];
}

function LinhaCompra({
  compra,
  insumo,
  vigente,
}: {
  compra: CompraDoInsumo;
  insumo: Insumo;
  /** É a compra que vale hoje: descartá-la faz o material voltar. */
  vigente: boolean;
}) {
  const contaId = useContaId();
  const [aberta, setAberta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  // Cada entrada na base dela: o açúcar já foi contado em `un` (spec 189).
  const embalagem = formatarQuantidade(
    paraBase(compra.quantidadeCompra, compra.unidadeCompra),
    compra.unidadeBase,
  );
  const referencia = formatarReferencia(compra.referencia, compra.unidadeBase);
  const variacao = palavraVariacao(compra.variacao);
  const Seta = (compra.variacao ?? 0) > 0 ? TrendingUp : TrendingDown;
  const procedencia = procedenciaDe(compra);
  // A nota já põe o nome da loja na procedência.
  const fornecedor =
    compra.fornecedor !== compra.estabelecimento ? compra.fornecedor : null;
  const detalhe = [fornecedor, procedencia].filter(Boolean).join(" · ");
  const descartadaMs = compra.descartadaMs;
  const quando = rotuloDataCompleta(dia(compra.dataMs));

  // O leitor de tela ouve uma frase por compra; a grade é para o olho.
  const frase = compra.daBiblioteca
    ? `Preço médio da biblioteca, ${referencia} ${compra.rotulo}.`
    : [
        descartadaMs !== null &&
          `Descartada em ${rotuloDataCompleta(dia(descartadaMs))}`,
        quando,
        `${formatarMoeda(compra.precoCompra)} por ${embalagem}`,
        `${referencia} ${compra.rotulo}`,
        variacao,
        detalhe,
      ]
        .filter(Boolean)
        .join(", ") + ".";

  async function trocar(acao: typeof descartarCompra) {
    setFalha(null);
    setGravando(true);
    try {
      await acao(contaId, insumo, compra.dataMs);
      setAberta(false);
      setConfirmando(false);
    } catch {
      setFalha("Não foi possível agora. Tente de novo em instantes.");
    } finally {
      setGravando(false);
    }
  }

  const riscado =
    descartadaMs !== null ? "text-ink-muted line-through" : "text-ink";
  // `span` e não `p`: a grade pode morar dentro de um `button`.
  const grade = (
    <span
      aria-hidden
      className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-3"
    >
      {compra.daBiblioteca ? (
        <span className="col-span-2 text-label text-ink-muted">
          preço médio da biblioteca
        </span>
      ) : (
        <>
          <span className="num text-label text-ink-muted">
            {rotuloDia(dia(compra.dataMs))}
          </span>
          <span className={cn("num min-w-0 truncate text-label", riscado)}>
            {formatarMoeda(compra.precoCompra)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            {embalagem}
          </span>
        </>
      )}
      <span className={cn("num text-right text-label font-semibold", riscado)}>
        {referencia}{" "}
        <span className="text-micro font-medium text-ink-muted">
          {compra.rotulo}
        </span>
      </span>

      {(variacao || detalhe) && (
        <span className="col-start-2 col-end-4 mt-0.5 flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
          {variacao && (
            <>
              <Seta className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="num">{variacao}</span>
            </>
          )}
          {variacao && detalhe && <span className="text-ink-subtle">·</span>}
          {detalhe && <span className="truncate">{detalhe}</span>}
        </span>
      )}
    </span>
  );

  return (
    <li className="py-2.5">
      {compra.descartavel ? (
        // Ao toque, e não sempre à vista: descartar é raro, e a lista é para ler.
        <button
          type="button"
          aria-expanded={aberta}
          onClick={() => {
            setAberta(!aberta);
            setConfirmando(false);
          }}
          className="-mx-2 block min-h-11 w-[calc(100%+1rem)] rounded-md px-2 py-1 text-left transition-colors duration-150 ease-quart hover:bg-sunken"
        >
          <span className="sr-only">{frase}</span>
          {grade}
        </button>
      ) : (
        <>
          <span className="sr-only">{frase}</span>
          {grade}
        </>
      )}

      {descartadaMs !== null && (
        <div className="mt-1 flex items-center justify-between gap-3 pl-[5.25rem]">
          <p className="text-label text-ink-muted">
            descartada em {rotuloDia(dia(descartadaMs))}
          </p>
          <Botao
            tamanho="sm"
            variante="terciaria"
            carregando={gravando}
            onClick={() => void trocar(restaurarCompra)}
          >
            Desfazer
          </Botao>
        </div>
      )}

      {aberta &&
        (confirmando ? (
          // Dois passos, como "Arquivar", e não modal: a pergunta fica onde a
          // ação está.
          <div className="mt-2 rounded-lg border border-negative/30 bg-negative-soft p-3">
            <p className="text-label text-ink">
              Descartar a compra de {quando}? Ela fica na lista, riscada, e
              deixa de contar no preço
              {vigente ? "; o material volta para a compra anterior" : ""}.
            </p>
            <div className="mt-3 flex gap-2">
              <Botao
                tamanho="sm"
                onClick={() => setConfirmando(false)}
                disabled={gravando}
              >
                Cancelar
              </Botao>
              <Botao
                tamanho="sm"
                variante="perigo"
                carregando={gravando}
                onClick={() => void trocar(descartarCompra)}
              >
                Descartar mesmo assim
              </Botao>
            </div>
          </div>
        ) : (
          <div className="mt-1 pl-[5.25rem]">
            <Botao
              tamanho="sm"
              variante="perigo"
              onClick={() => setConfirmando(true)}
            >
              Descartar esta compra
            </Botao>
          </div>
        ))}

      {falha && (
        <p role="alert" className="mt-2 text-label text-negative">
          {falha}
        </p>
      )}
    </li>
  );
}

/**
 * O material para ler (`#d222`): o que custa, o preço de cada compra, onde
 * entra e a despensa. Editar é o botão do rodapé do painel, e não esta tela.
 *
 * `fichas` nulo é "ainda não sei": carregando, ou negado pela regra. "Onde
 * entra" some, em vez de dizer "nenhum produto" por um instante.
 */
export function FichaDoMaterial({
  insumo,
  fichas,
  custos,
  fornadas,
  hoje,
  aoEditar,
}: {
  insumo: Insumo;
  fichas: FichaTecnica[] | null;
  custos: Map<string, CustoDeHoje>;
  fornadas: Fornada[];
  hoje: DataISO;
  /** Para a frase da unidade que não bate levar ao formulário. */
  aoEditar?: () => void;
}) {
  // Contado numa base que as receitas não usam (spec 188): o custo dos
  // produtos fica no gravado até ela corrigir a última compra.
  const baseDasReceitas = fichas
    ? basesQueNaoBatem([insumo], fichas).get(insumo.id)
    : undefined;
  const referencia = custoDeReferencia(
    insumo.custoUnidadeBaseCorrigido,
    insumo.unidadeBase,
  );
  const historico = comprasDoInsumo(insumo);
  const vigenteMs = historico.compras.find(
    (compra) => compra.descartadaMs === null,
  )?.dataMs;
  const primeira = historico.primeiraMs
    ? rotuloDataCompleta(dia(historico.primeiraMs))
    : null;
  const usos = fichas ? usoDoMaterial(fichas, insumo, custos) : null;

  const contagem = contagemDoInsumo(insumo, hoje);
  const projecao = projecaoDoInsumo(fornadas, insumo, hoje);
  const comForno = projecao.fornadas > 0 && contagem.quantidade !== null;

  return (
    <div className="space-y-7">
      {baseDasReceitas && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft px-3 py-2 text-label text-ink"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
          <div className="min-w-0 flex-1">
            <p>
              Os produtos medem {insumo.nome} em{" "}
              {PLURAL_UNIDADE_BASE[baseDasReceitas]}, e a última compra está em{" "}
              {PLURAL_UNIDADE_BASE[insumo.unidadeBase]}. Corrija a última compra
              para o custo voltar ao normal.
            </p>
            {aoEditar && (
              <button
                type="button"
                onClick={aoEditar}
                className="toque -mx-2 rounded-md px-2 font-semibold text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
              >
                Editar material
              </button>
            )}
          </div>
        </div>
      )}

      <section aria-label="O que custa">
        <p className="num text-label text-ink-muted">
          {formatarMoeda(insumo.precoCompra)} por{" "}
          {formatarQuantidade(insumo.quantidadeBase, insumo.unidadeBase)}
        </p>
        {/* Com a perda, como a linha e os produtos: é o custo que entra na conta. */}
        <p className="mt-1 text-heading text-ink">
          <span className="num font-semibold">
            {formatarReferencia(referencia.centavos, insumo.unidadeBase)}
          </span>{" "}
          <span className="text-body text-ink-muted">
            {referencia.rotulo},{" "}
            {insumo.perdaPercentual > 0
              ? `com ${insumo.perdaPercentual}% de perda`
              : "sem perda"}
          </span>
        </p>
      </section>

      <section aria-labelledby="compras-do-material">
        <h3
          id="compras-do-material"
          className="text-subheading font-semibold text-ink"
        >
          O preço de cada compra
        </h3>
        {/* A `key` do material: a linha aberta não passa para o próximo. */}
        <ul key={insumo.id} className="mt-1 divide-y divide-line">
          {historico.compras.map((compra, indice) => (
            <LinhaCompra
              key={`${compra.dataMs}-${indice}`}
              compra={compra}
              insumo={insumo}
              vigente={compra.dataMs === vigenteMs}
            />
          ))}
        </ul>
        <p className="mt-2 text-label text-ink-muted">
          {historico.quantas === 0
            ? "Nenhuma compra sua ainda. Quando você corrigir o preço, ela aparece aqui."
            : historico.quantas === 1
              ? `Uma compra registrada, em ${primeira}. As próximas aparecem aqui.`
              : historico.variacaoTotal === null
                ? `${historico.quantas} compras desde ${primeira}, em unidades diferentes.`
                : historico.variacaoTotal === 0
                  ? `O mesmo preço desde ${primeira}.`
                  : `${historico.variacaoTotal > 0 ? "Subiu" : "Caiu"} ${Math.abs(historico.variacaoTotal)}% desde a primeira compra, em ${primeira}.`}
        </p>
      </section>

      {usos && (
        <section aria-labelledby="onde-entra">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="onde-entra"
              className="text-subheading font-semibold text-ink"
            >
              Onde entra
            </h3>
            {usos.length > 0 && (
              <p className="text-label text-ink-muted">
                em {usos.length} {usos.length === 1 ? "produto" : "produtos"}
              </p>
            )}
          </div>
          {usos.length === 0 ? (
            <p className="mt-2 text-label text-ink-muted">
              Ainda não entra em nenhum produto.
            </p>
          ) : (
            <ul className="-mx-2 mt-1">
              {usos.map((uso) => {
                const parte = Math.round(uso.parte * 100);
                return (
                  <li key={uso.fichaId}>
                    <Link
                      href={`/fichas/${uso.fichaId}`}
                      className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-ink">
                          {uso.nome}
                        </span>
                        <span className="num block text-label text-ink-muted">
                          {formatarCustoUnitario(uso.custoPorUnidade)}{" "}
                          {POR_UNIDADE[uso.unidadeRendimento]}
                          <span aria-hidden className="mx-1.5 text-ink-subtle">
                            ·
                          </span>
                          <span className="sr-only">, </span>
                          {parte < 1 ? "menos de 1%" : `${parte}%`} do custo
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-5 shrink-0 text-ink-subtle"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* As frases da linha, com a idade sempre: aqui é o lugar dela (`#d87`). */}
      <section aria-labelledby="na-despensa">
        <h3 id="na-despensa" className="text-subheading font-semibold text-ink">
          Na despensa
        </h3>
        <p className="num mt-2 text-label text-ink-muted">
          {contagem.anotado === null
            ? "Nunca contada."
            : `${formatarQuantidade(contagem.anotado, insumo.unidadeBase)} · ${rotuloDeIdade(contagem)}`}
          {comForno && (
            <>
              {" · "}
              {projecao.fornadas === 1
                ? "1 fornada desde então"
                : `${projecao.fornadas} fornadas desde então`}
              , projetamos{" "}
              {formatarQuantidade(projecao.disponivel, insumo.unidadeBase)}
            </>
          )}
        </p>
      </section>
    </div>
  );
}
