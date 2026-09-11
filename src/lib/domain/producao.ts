import type {
  ConsumoDaFornada,
  DataISO,
  Percentual,
  TipoFicha,
  UnidadeBase,
  UnidadeRendimento,
} from "@/lib/types";
import {
  contagemDoInsumo,
  estoqueParaLista,
  type ContagemDoInsumo,
  type InsumoContado,
} from "./estoque";
import {
  explodirDemanda,
  insumosPorLote,
  quantidadeFisica,
  type FichaParaExplodir,
  type LinhaDeDemanda,
  type PedidoParaExplodir,
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
  /** O piso: quantas fornadas ela quer sempre poder fazer. Ausente vale 0. */
  fornadasMinimas?: number;
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

// ---------------------------------------------------------------------------
// Quantas fornadas dá
// ---------------------------------------------------------------------------

/**
 * O que os pedidos abertos ainda vão levar da despensa, por insumo e físico.
 *
 * É a demanda dos pedidos passada pela perda, menos o que já virou massa para
 * eles: a capacidade que ignorasse isso mandaria ela prometer duas vezes a
 * mesma farinha. Quem escolhe os pedidos é quem chama — os do horizonte, nos
 * status da lista, sem o pedido que está sendo perguntado.
 */
export function prometidoParaPedidos(
  pedidos: PedidoParaExplodir[],
  fichas: FichaParaExplodir[],
  insumos: { id: string; perdaPercentual: Percentual }[],
  fornadas: FornadaRegistrada[],
): Map<string, number> {
  const demanda = explodirDemanda(pedidos, fichas);
  const produzido = produzidoParaPedidos(fornadas, demanda.pedidoIds);
  const perdaDe = new Map(
    insumos.map((insumo) => [insumo.id, insumo.perdaPercentual]),
  );
  const prometido = new Map<string, number>();

  for (const linha of demanda.linhas) {
    const resta =
      quantidadeFisica(linha.quantidade, perdaDe.get(linha.insumoId) ?? 0) -
      (produzido.get(linha.insumoId) ?? 0);
    if (resta > 0) prometido.set(linha.insumoId, resta);
  }

  return prometido;
}

/** O que a capacidade precisa saber de um insumo. `Insumo` serve inteiro. */
export interface InsumoParaCapacidade extends InsumoContado {
  id: string;
  nome: string;
  arquivado: boolean;
  unidadeBase: UnidadeBase;
  perdaPercentual: Percentual;
}

/**
 * As três leituras da decisão 7 da spec 013: contagem vencida vale "não sei",
 * e a capacidade herda o "não sei" — nunca o zero.
 */
export type LeituraDaCapacidade = "MEDIDA" | "PISO" | "DESCONHECIDA";

export interface InsumoDaCapacidade {
  insumoId: string;
  nome: string;
  unidadeBase: UnidadeBase;
  /** Físico, com a perda, por lote. */
  precisaPorLote: number;
  /** A projeção menos o prometido a outros pedidos. `null` sem contagem que valha. */
  tem: number | null;
}

export interface CapacidadeDaFicha {
  fichaId: string;
  nome: string;
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  leitura: LeituraDaCapacidade;
  /** Fornadas inteiras. `null` em `DESCONHECIDA`. */
  fornadas: number | null;
  /**
   * O que dá para fazer na unidade de rendimento. A massa se faz do tamanho
   * que quiser (`#d93`), então é `lotes × rendimento` **antes** do `floor`
   * das fornadas: 2,4 lotes de uma receita de 25 são 60 cookies, e não 50.
   */
  unidades: number | null;
  /** O insumo que trava primeiro, entre os contados. É o que ela precisa comprar. */
  gargalo: InsumoDaCapacidade | null;
  /** Os insumos da ficha sem contagem que valha, por nome. */
  semContagem: string[];
  /** Algum insumo desta ficha já está prometido a outro pedido. */
  descontaPedidos: boolean;
  insumos: InsumoDaCapacidade[];
}

/** 3 × 300 ÷ 300 não volta exatamente a 3 em ponto flutuante. */
const FOLGA = 1e-6;

/**
 * Quantas fornadas cabem no que a despensa tem hoje.
 *
 * `lotes = min sobre os insumos contados de tem ÷ precisaPorLote`; `fornadas`
 * é o `floor` disso, para baixo sempre — arredondar para cima seria prometer o
 * que não dá. A leitura diz o quanto o número vale:
 *
 * - `MEDIDA`: todo insumo tem contagem que vale. O número é o número.
 * - `PISO`: há insumo sem contagem, e o número sai só dos contados. A tela diz
 *   "pelo menos N" e nomeia o que falta contar: é o que ela conta que decide,
 *   e o que ela nunca contou é o que nunca faltou.
 * - `DESCONHECIDA`: nenhum insumo contado. Não é zero, é ausência de
 *   informação, e o atalho é contar.
 *
 * Devolve `null` quando não há pergunta: ficha arquivada, sem rendimento ou
 * sem insumo nenhum. Essas não quebram e não aparecem.
 */
export function capacidadeDaFicha(
  ficha: FichaParaProduzir,
  fichas: FichaParaExplodir[],
  insumos: InsumoParaCapacidade[],
  consumo: Map<string, number>,
  hojeISO: DataISO,
  prometido: Map<string, number> = new Map(),
): CapacidadeDaFicha | null {
  if (ficha.arquivado || !(ficha.rendimento > 0)) return null;

  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const semContagem: string[] = [];
  const linhas: InsumoDaCapacidade[] = [];
  let descontaPedidos = false;

  for (const lote of consumoPorLote(ficha, fichas, insumos)) {
    if (!(lote.quantidade > 0)) continue;
    const insumo = porId.get(lote.insumoId);
    const contado =
      insumo && !insumo.arquivado
        ? contagemDoInsumo(insumo, hojeISO).quantidade !== null
        : false;

    if (!contado) semContagem.push(lote.nomeSnapshot);
    if (prometido.has(lote.insumoId)) descontaPedidos = true;

    linhas.push({
      insumoId: lote.insumoId,
      nome: insumo?.nome ?? lote.nomeSnapshot,
      unidadeBase: insumo?.unidadeBase ?? "un",
      precisaPorLote: lote.quantidade,
      tem:
        contado && insumo
          ? Math.max(
              0,
              disponivelParaProducao(
                insumo,
                consumo.get(insumo.id) ?? 0,
                hojeISO,
              ) - (prometido.get(insumo.id) ?? 0),
            )
          : null,
    });
  }

  if (linhas.length === 0) return null;

  let gargalo: InsumoDaCapacidade | null = null;
  let lotes = Infinity;
  for (const linha of linhas) {
    if (linha.tem === null) continue;
    const cabe = linha.tem / linha.precisaPorLote;
    if (cabe < lotes) {
      lotes = cabe;
      gargalo = linha;
    }
  }

  const leitura: LeituraDaCapacidade =
    gargalo === null
      ? "DESCONHECIDA"
      : semContagem.length === 0
        ? "MEDIDA"
        : "PISO";

  const unidades =
    gargalo === null
      ? null
      : ficha.unidadeRendimento === "un"
        ? Math.floor(lotes * ficha.rendimento + FOLGA)
        : lotes * ficha.rendimento;

  return {
    fichaId: ficha.id,
    nome: ficha.nome,
    rendimento: ficha.rendimento,
    unidadeRendimento: ficha.unidadeRendimento,
    leitura,
    fornadas: gargalo === null ? null : Math.floor(lotes + FOLGA),
    unidades,
    gargalo,
    semContagem,
    descontaPedidos,
    insumos: linhas,
  };
}

// ---------------------------------------------------------------------------
// O piso: o que ela quer sempre poder fazer
// ---------------------------------------------------------------------------

/** O piso inteiro de uma ficha; fração é dedo errado e vale para baixo. */
function pisoDaFicha(ficha: FichaParaProduzir): number {
  const piso = Math.floor(ficha.fornadasMinimas ?? 0);
  return Number.isFinite(piso) && piso > 0 ? piso : 0;
}

/** O que a reserva de fornadas pede de UM insumo, e quem pede. */
export interface ReservaDoInsumo extends LinhaDeDemanda {
  /** As fichas com piso que levam este insumo: "1 fornada de Cookie". */
  fichas: { fichaId: string; nome: string; fornadas: number }[];
}

/**
 * O piso como demanda: `Σ fornadasMinimas × insumosPorLote`, por insumo, em
 * unidade base e **sem perda** — é o terceiro mapa de `ContextoDaProducao`, e
 * `montarLista` aplica a perda a ele junto com a demanda dos pedidos, na mesma
 * conta (`DECISOES.md#d96`).
 *
 * Útil, e não físico como `consumoPorLote`, de propósito: o piso entra em
 * `necessária`, que é útil, e a perda divide uma vez só, do lado de lá. Ficha
 * arquivada ou com piso zero não pede nada, e o kit respeita o nível único
 * porque é `insumosPorLote` quem explode.
 */
export function reservaDeProducao(
  fichas: FichaParaProduzir[],
): Map<string, ReservaDoInsumo> {
  const porId = new Map<string, FichaParaExplodir>(
    fichas.map((ficha) => [ficha.id, ficha]),
  );
  const reserva = new Map<string, ReservaDoInsumo>();

  for (const ficha of fichas) {
    const piso = pisoDaFicha(ficha);
    if (ficha.arquivado || piso === 0) continue;

    for (const linha of insumosPorLote(ficha, porId).values()) {
      if (!(linha.quantidade > 0)) continue;
      const atual = reserva.get(linha.insumoId) ?? {
        insumoId: linha.insumoId,
        nome: linha.nome,
        quantidade: 0,
        fichas: [],
      };
      atual.quantidade += linha.quantidade * piso;
      atual.fichas.push({
        fichaId: ficha.id,
        nome: ficha.nome,
        fornadas: piso,
      });
      reserva.set(linha.insumoId, atual);
    }
  }

  return reserva;
}

/**
 * As fichas com piso que a despensa de hoje não sustenta: o número de
 * fornadas que dá ficou abaixo do que ela quer sempre poder fazer.
 *
 * `DESCONHECIDA` fica de fora: não saber quantas dá não é estar abaixo, e
 * alarmar por falta de informação é o erro que a decisão 7 da spec proíbe. O
 * atalho para esse caso é contar, e ele já mora em `/fichas`.
 */
export function fichasAbaixoDoPiso(
  fichas: FichaParaProduzir[],
  insumos: InsumoParaCapacidade[],
  consumo: Map<string, number>,
  hojeISO: DataISO,
  prometido: Map<string, number> = new Map(),
): { capacidade: CapacidadeDaFicha; fornadasMinimas: number }[] {
  const abaixo: { capacidade: CapacidadeDaFicha; fornadasMinimas: number }[] =
    [];

  for (const ficha of fichas) {
    const piso = pisoDaFicha(ficha);
    if (piso === 0) continue;

    const capacidade = capacidadeDaFicha(
      ficha,
      fichas,
      insumos,
      consumo,
      hojeISO,
      prometido,
    );
    if (capacidade?.fornadas != null && capacidade.fornadas < piso) {
      abaixo.push({ capacidade, fornadasMinimas: piso });
    }
  }

  return abaixo;
}

// ---------------------------------------------------------------------------
// O que está pronto: a 007 aplicada um nível acima
// ---------------------------------------------------------------------------

/** O que a projeção do pronto precisa saber de uma fornada. `Fornada` serve. */
export interface FornadaDaFicha {
  arquivado: boolean;
  dataISO: DataISO;
  fichaId: string;
  unidadesProduzidas: number;
  pedidoId?: string;
}

/** O que a contagem do pronto precisa saber de uma ficha. `FichaTecnica` serve. */
export interface FichaComPronto {
  id: string;
  /** Kit não se conta: é preço, e não pote (`#d97`). Ausente vale receita. */
  tipo?: TipoFicha;
  estoqueProntoAtual?: number | null;
  estoqueProntoContadoEmISO?: DataISO | null;
}

/** Só a receita tem pote: o kit é o agregado das receitas de dentro, e contar
 * a caixa montada contaria os mesmos cookies duas vezes. */
export function temPronto(ficha: { tipo?: TipoFicha }): boolean {
  return ficha.tipo !== "KIT";
}

/**
 * A contagem do que está pronto, lida como a do insumo: `contagemDoInsumo` é
 * estrutural sobre `{ estoqueAtual, estoqueContadoEmISO }`, e vencida vale
 * "não sei" aqui também (`#d63`). Kit entra como `NUNCA`.
 */
export function contagemDoPronto(
  ficha: FichaComPronto,
  hojeISO: DataISO,
): ContagemDoInsumo {
  return contagemDoInsumo(
    temPronto(ficha)
      ? {
          estoqueAtual: ficha.estoqueProntoAtual,
          estoqueContadoEmISO: ficha.estoqueProntoContadoEmISO,
        }
      : {},
    hojeISO,
  );
}

export interface ProjecaoDoPronto {
  contagem: ContagemDoInsumo;
  /** Quantas fornadas desta ficha entraram na conta desde a contagem. */
  fornadas: number;
  /** Para quantas unidades elas fizeram massa. */
  feitas: number;
  /** O que a contagem disse, mais a massa feita depois dela. `null` sem contagem que valha. */
  prontos: number | null;
}

/**
 * A projeção do pronto: o que a contagem disse, **mais** a massa feita depois
 * dela. É o `#d87` de cabeça para baixo, a mesma janela do `#d89`: o dia da
 * contagem é opaco, e a fornada do mesmo dia já está dentro do número que ela
 * contou. O que saiu do pote (vendido, entregue) o sistema não vê, e é a
 * contagem seguinte quem conserta, como na despensa.
 */
export function projecaoDoPronto(
  fornadas: FornadaDaFicha[],
  ficha: FichaComPronto,
  hojeISO: DataISO,
): ProjecaoDoPronto {
  const contagem = contagemDoPronto(ficha, hojeISO);
  const contadoEm = ficha.estoqueProntoContadoEmISO;
  const desde =
    contagem.quantidade === null || !contadoEm
      ? []
      : fornadas.filter(
          (fornada) =>
            !fornada.arquivado &&
            fornada.fichaId === ficha.id &&
            fornada.dataISO > contadoEm,
        );
  const feitas = desde.reduce(
    (soma, fornada) => soma + fornada.unidadesProduzidas,
    0,
  );

  return {
    contagem,
    fornadas: desde.length,
    feitas,
    prontos: contagem.quantidade === null ? null : contagem.quantidade + feitas,
  };
}

/**
 * O que está no pote mas tem dono, por ficha: a massa já feita para os pedidos
 * abertos, até o que eles pedem.
 *
 * É `min(pedido, feito)` porque a capacidade (`prometidoParaPedidos`) já tira
 * da despensa só o que **falta** fazer para esses pedidos: o que já foi feito
 * está nos prontos, e sem este abate a mesma massa seria vendida duas vezes.
 * Com ele, `prontos livres + capacidade` fecha em `prontos + despensa −
 * prometido`, que é a resposta da spec.
 */
// ponytail: agregado por ficha, como o prometido é por insumo. Massa de uma
// ficha de dentro feita para um pedido de kit não é reconhecida como do
// pedido; se isso aparecer na operação, o abate passa a explodir o kit.
export function reservadoNoPronto(
  pedidos: PedidoParaExplodir[],
  fornadas: FornadaDaFicha[],
): Map<string, number> {
  const naLista = new Set(pedidos.map((pedido) => pedido.id));
  const pedido = new Map<string, number>();
  const feito = new Map<string, number>();

  for (const atual of pedidos) {
    for (const item of atual.itens) {
      pedido.set(
        item.fichaTecnicaId,
        (pedido.get(item.fichaTecnicaId) ?? 0) + item.quantidade,
      );
    }
  }
  for (const fornada of fornadas) {
    if (fornada.arquivado || !fornada.pedidoId) continue;
    if (!naLista.has(fornada.pedidoId)) continue;
    feito.set(
      fornada.fichaId,
      (feito.get(fornada.fichaId) ?? 0) + fornada.unidadesProduzidas,
    );
  }

  const reservado = new Map<string, number>();
  for (const [fichaId, quantidade] of feito) {
    const dono = Math.min(quantidade, pedido.get(fichaId) ?? 0);
    if (dono > 0) reservado.set(fichaId, dono);
  }
  return reservado;
}

/** Os prontos sem dono: a projeção menos o reservado. Nunca negativo, `null` sem contagem. */
export function prontosLivres(
  projecao: ProjecaoDoPronto,
  reservado: number,
): number | null {
  return projecao.prontos === null
    ? null
    : Math.max(0, projecao.prontos - reservado);
}

/** O que falta comprar, por insumo contado, para fazer massa para `unidades`. */
export function faltaPara(
  capacidade: CapacidadeDaFicha,
  unidades: number,
): {
  insumoId: string;
  nome: string;
  unidadeBase: UnidadeBase;
  falta: number;
}[] {
  const lotes = unidades / capacidade.rendimento;

  return capacidade.insumos.flatMap((linha) => {
    if (linha.tem === null) return [];
    const falta = lotes * linha.precisaPorLote - linha.tem;
    if (falta <= FOLGA) return [];
    return [
      {
        insumoId: linha.insumoId,
        nome: linha.nome,
        unidadeBase: linha.unidadeBase,
        falta,
      },
    ];
  });
}
