"use client";

import { CircleAlert, Plus, RefreshCw, X } from "lucide-react";
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
import type { LinhaRascunho, Pareamento } from "@/lib/domain/notaFiscal";
import {
  GRUPOS_UNIDADE,
  ROTULO_UNIDADE_BASE,
  ROTULO_UNIDADE_COMPRA,
} from "@/lib/domain/unidades";
import type { CategoriaInsumo, UnidadeCompra } from "@/lib/types";

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

/**
 * Um cartão por item, e não uma linha de tabela: planilha é a primeira
 * anti-referência do `PRODUCT.md`, e aqui cada objeto tem seis campos.
 *
 * A frase embaixo é o `ResumoCusto` do formulário de insumo em uma linha, e é
 * o que denuncia unidade lida errada antes de a leitura virar documento —
 * R$ 12,50 divididos por 1 grama saltam aos olhos.
 */
export function CartaoLinhaNota({
  linha,
  par,
  aoMudar,
  aoRemover,
}: {
  linha: LinhaEditada;
  /** O insumo que esta linha atualiza, quando o pareamento acertou. */
  par?: Pareamento;
  aoMudar: (mudanca: Partial<LinhaEditada>) => void;
  aoRemover: () => void;
}) {
  const custo = calcularCustoInsumo({
    precoCompra: linha.precoCompra,
    quantidadeCompra: linha.quantidadeCompra,
    unidadeCompra: linha.unidadeCompra,
    perdaPercentual: 0,
  });

  const completa = linhaCompleta(linha);

  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="px-4 pb-4 pt-3 lg:px-5">
        <div className="flex items-start justify-between gap-2">
          {/* O que está impresso no papel, guardado para ela conferir contra a
              nota que está na mão — o nome ao lado já é a tradução. */}
          <p className="num min-w-0 flex-1 truncate pt-2 text-micro text-ink-subtle">
            {linha.descricao || "Linha sem descrição"}
          </p>
          <button
            type="button"
            onClick={aoRemover}
            aria-label={`Tirar ${linha.nome || "esta linha"} da lista`}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink active:bg-sunken"
          >
            <X aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-sunken px-4 py-2.5 lg:px-5">
        {par ? (
          <Selo
            tom="info"
            icone={<RefreshCw aria-hidden className="size-3.5" />}
          >
            Atualiza · {par.nome} · era {formatarMoeda(par.precoAnterior)}
          </Selo>
        ) : (
          <Selo tom="marca" icone={<Plus aria-hidden className="size-3.5" />}>
            Novo
          </Selo>
        )}

        {completa ? (
          <p className="num text-label text-ink-muted">
            {formatarMoeda(linha.precoCompra)}{" "}
            <span aria-label="dividido por">÷</span>{" "}
            {formatarNumero(linha.quantidadeCompra)} {linha.unidadeCompra} ={" "}
            <strong className="font-semibold text-ink">
              {formatarCustoUnitario(custo.custoUnidadeBase)}
            </strong>{" "}
            por {ROTULO_UNIDADE_BASE[custo.unidadeBase]}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-label text-attention">
            <CircleAlert
              aria-hidden
              className="size-4 shrink-0"
              strokeWidth={1.75}
            />
            {faltaNaLinha(linha)}
          </p>
        )}
      </div>
    </li>
  );
}

function faltaNaLinha(linha: LinhaRascunho): string {
  if (linha.nome.trim().length < 2) return "Falta o nome deste item.";
  if (linha.precoCompra <= 0) return "Falta o preço desta linha.";
  return "Falta dizer quanto vem na embalagem.";
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
