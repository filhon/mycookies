import type {
  ConsumoDaFornada,
  DataISO,
  Percentual,
  UnidadeRendimento,
} from "@/lib/types";
import { estoqueParaLista, type InsumoContado } from "./estoque";
import {
  insumosPorLote,
  quantidadeFisica,
  type FichaParaExplodir,
} from "./listaCompras";

/**
 * A fornada é a unidade de tudo: quanto saiu da despensa, quantos doces dá para
 * vender, se um pedido cabe, se precisa comprar. Uma unidade só, um módulo só.
 *
 * **Fornada é a massa feita, e não o cookie assado.** A operação real mistura
 * os ingredientes, congela a massa e assa sob demanda; o insumo sai da despensa
 * na tigela, e é esse o dia que a fornada grava (`DECISOES.md#d93`).
 *
 * O que este módulo **não** faz: escrever estoque. A contagem é a verdade; a
 * fornada é um fato datado, e o que a tela mostra é uma projeção —
 * `disponível = medido − fornadas registradas depois daquela contagem`. Contar
 * de novo apaga o efeito sozinho, porque a janela é "depois da contagem"
 * (`DECISOES.md#d87`).
 *
 * Nada aqui toca o Firestore: a tela chama para desenhar, a mutação chama para
 * gravar, e o teste cobre os dois com os mesmos números.
 */

/** O que a fornada precisa saber de uma ficha: a explosão, mais a unidade. */
export interface FichaParaProduzir extends FichaParaExplodir {
  unidadeRendimento: UnidadeRendimento;
}

/** O que a projeção precisa saber de uma fornada. Nada além disso. */
export interface FornadaRegistrada {
  arquivado: boolean;
  dataISO: DataISO;
  consumo: ConsumoDaFornada[];
  pedidoId?: string;
}

// ---------------------------------------------------------------------------
// O que um lote tira da despensa
// ---------------------------------------------------------------------------

/**
 * Os insumos de UM lote, físicos, com a perda de cada insumo aplicada.
 *
 * É `insumosPorLote` — a mesma regra do kit de um nível que a lista de compras
 * usa — passado por `quantidadeFisica`: o que sai do armário é o que sai do
 * armário, e a perda faz parte dele. Insumo que sumiu do cadastro entra sem
 * perda: não há de onde tirá-la, e zero é a leitura honesta.
 *
 * O componente que não dá para seguir (arquivado, sumido, sem rendimento) é
 * pulado em silêncio: a fornada de um kit sem uma das fichas de dentro ainda é
 * uma fornada, e a lista de compras já diz o que ficou de fora.
 */
export function consumoPorLote(
  ficha: FichaParaProduzir,
  fichas: FichaParaExplodir[],
  insumos: { id: string; perdaPercentual: Percentual }[],
): ConsumoDaFornada[] {
  const porFicha = new Map(fichas.map((atual) => [atual.id, atual]));
  const perdaDe = new Map(
    insumos.map((insumo) => [insumo.id, insumo.perdaPercentual]),
  );

  return [...insumosPorLote(ficha, porFicha).values()]
    .map((linha) => ({
      insumoId: linha.insumoId,
      nomeSnapshot: linha.nome,
      quantidade: quantidadeFisica(
        linha.quantidade,
        perdaDe.get(linha.insumoId) ?? 0,
      ),
    }))
    .sort((a, b) => a.nomeSnapshot.localeCompare(b.nomeSnapshot));
}

/**
 * O que a fornada grava a partir do que ela digitou: as unidades, os lotes que
 * elas valem e o que saiu da despensa.
 *
 * O campo é **unidades**, e não lotes: ela decide fazer massa para 15 cookies
 * porque a despensa não dá para 25, e a receita é quem sabe quanto de lote isso
 * é. `lotes = unidades / rendimento`, fracionário de propósito — massa se faz
 * do tamanho que quiser. Em `un` as unidades arredondam para baixo antes da
 * conta: 12,5 cookies não existem, e os lotes saem dos 12 que existem. Em
 * grama, mililitro e porção a fração é real.
 */
export function fornadaGravavel(
  ficha: FichaParaProduzir,
  unidades: number,
  consumoDeUmLote: ConsumoDaFornada[],
): { lotes: number; unidadesProduzidas: number; consumo: ConsumoDaFornada[] } {
  const unidadesProduzidas =
    ficha.unidadeRendimento === "un" ? Math.floor(unidades) : unidades;
  const lotes =
    ficha.rendimento > 0 ? unidadesProduzidas / ficha.rendimento : 0;

  return {
    lotes,
    unidadesProduzidas,
    consumo: consumoDeUmLote.map((linha) => ({
      ...linha,
      quantidade: linha.quantidade * lotes,
    })),
  };
}

// ---------------------------------------------------------------------------
// A projeção: o que a contagem disse, menos o que a massa levou
// ---------------------------------------------------------------------------

/**
 * As fornadas que descontam de UM insumo: as vivas, datadas **depois** da
 * contagem dele, que o levaram.
 *
 * A janela é `dataISO > contadoEmISO`, estritamente maior: **o dia da contagem
 * é opaco** (`DECISOES.md#d89`). Ela faz a massa de manhã, conta à tarde e
 * digita 800 g — com `>=` a tela mostraria 400 g, contradizendo um número
 * que ela acabou de digitar. É a mesma regra que `sugestaoDaContagem` já toma
 * do outro lado: contagem de hoje não recebe soma.
 *
 * Insumo sem data de contagem não desconta nada: não há medição de que
 * descontar.
 */
export function fornadasDesdeAContagem<T extends FornadaRegistrada>(
  fornadas: T[],
  insumo: { id: string; estoqueContadoEmISO?: DataISO | null },
): T[] {
  const contadoEm = insumo.estoqueContadoEmISO;
  if (!contadoEm) return [];

  return fornadas.filter(
    (fornada) =>
      !fornada.arquivado &&
      fornada.dataISO > contadoEm &&
      fornada.consumo.some((linha) => linha.insumoId === insumo.id),
  );
}

/**
 * Quanto cada insumo perdeu para a massa **depois da própria contagem**.
 *
 * A data é por insumo: cada um tem a sua, e a janela é a dele. A mesma fornada
 * conta contra a farinha contada dia 1 e não conta contra o chocolate contado
 * dia 7. Somar o consumo congelado não lê ficha nenhuma (`#d88`).
 */
export function consumoDesdeAContagem(
  fornadas: FornadaRegistrada[],
  insumos: { id: string; estoqueContadoEmISO?: DataISO | null }[],
): Map<string, number> {
  const consumo = new Map<string, number>();

  for (const insumo of insumos) {
    const total = fornadasDesdeAContagem(fornadas, insumo).reduce(
      (soma, fornada) =>
        soma +
        fornada.consumo
          .filter((linha) => linha.insumoId === insumo.id)
          .reduce((parcial, linha) => parcial + linha.quantidade, 0),
      0,
    );
    if (total > 0) consumo.set(insumo.id, total);
  }

  return consumo;
}

/**
 * A projeção: o que a contagem disse, menos o que a massa levou. Nunca
 * negativa, e zero quando a contagem não vale — uma fornada não torna uma
 * contagem vencida mais confiável.
 */
export function disponivelParaProducao(
  insumo: InsumoContado,
  consumo: number,
  hojeISO: DataISO,
): number {
  return Math.max(0, estoqueParaLista(insumo, hojeISO) - consumo);
}

/** O que a linha de um insumo diz sobre a massa, nas duas telas da despensa. */
export interface ProjecaoDoInsumo {
  /** Quantas fornadas entraram na conta desde a contagem. */
  fornadas: number;
  /** Quanto elas levaram, em unidade base física. */
  consumo: number;
  /** O que sobra, pela projeção. */
  disponivel: number;
}

/** A projeção de um insumo, pronta para a tela dizer. */
export function projecaoDoInsumo(
  fornadas: FornadaRegistrada[],
  insumo: InsumoContado & { id: string },
  hojeISO: DataISO,
): ProjecaoDoInsumo {
  const desde = fornadasDesdeAContagem(fornadas, insumo);
  const consumo = consumoDesdeAContagem(desde, [insumo]).get(insumo.id) ?? 0;

  return {
    fornadas: desde.length,
    consumo,
    disponivel: disponivelParaProducao(insumo, consumo, hojeISO),
  };
}

// ---------------------------------------------------------------------------
// O que já virou massa para um pedido
// ---------------------------------------------------------------------------

/**
 * O que já virou massa para pedidos que ainda estão na lista, por insumo.
 *
 * É o abate da decisão `#d91`: a fornada tira o insumo da despensa **e** o
 * pedido continuaria pedindo o mesmo insumo, então a lista mandaria comprar de
 * novo o que ela acabou de gastar. Abater pelo que foi registrado aceita
 * produção parcial de graça, e não muda nada para quem nunca registrar.
 */
export function produzidoParaPedidos(
  fornadas: FornadaRegistrada[],
  pedidoIds: string[],
): Map<string, number> {
  const naLista = new Set(pedidoIds);
  const produzido = new Map<string, number>();

  for (const fornada of fornadas) {
    if (fornada.arquivado || !fornada.pedidoId) continue;
    if (!naLista.has(fornada.pedidoId)) continue;

    for (const linha of fornada.consumo) {
      produzido.set(
        linha.insumoId,
        (produzido.get(linha.insumoId) ?? 0) + linha.quantidade,
      );
    }
  }

  return produzido;
}
