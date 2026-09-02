import type {
  CategoriaInsumo,
  Centavos,
  DataISO,
  Percentual,
  StatusPedido,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
import { PERDA_MAXIMA } from "./custoInsumo";

/**
 * O motor da lista de compras: do pedido combinado até o carrinho no mercado.
 *
 * Duas funções, e a ordem entre elas importa. `explodirDemanda` traduz pedido em
 * insumo, em unidade base e **sem perda** — é o que entra na receita.
 * `montarLista` traduz isso em pacote e em reais, e é onde a perda e o estoque
 * entram, nessa ordem e não na inversa.
 *
 * Nada aqui toca o Firestore: a tela chama para desenhar, a mutação chama para
 * gravar, e o teste cobre os dois com os mesmos números.
 */

// ---------------------------------------------------------------------------
// O que não deu para explodir
// ---------------------------------------------------------------------------

/**
 * Por que uma linha do pedido não virou demanda.
 *
 * As três nascem do mesmo risco: a explosão depende de dados que podem ter
 * sumido depois que o pedido foi anotado. Devolver zero com explicação é melhor
 * do que devolver `NaN`, e é muito melhor do que omitir a linha em silêncio —
 * uma lista que some com um item faz a Maynara chegar em casa sem chocolate.
 */
export type MotivoPendencia = "SEM_FICHA" | "SEM_RENDIMENTO" | "SEM_INSUMO";

export interface Pendencia {
  /** O nome congelado no pedido ou na ficha: é o que permite dizer o que faltou. */
  nome: string;
  motivo: MotivoPendencia;
}

export const EXPLICACAO_PENDENCIA: Record<MotivoPendencia, string> = {
  SEM_FICHA: "a ficha não está mais no seu caderno de receitas",
  SEM_RENDIMENTO: "a ficha não diz quantas unidades saem de um lote",
  SEM_INSUMO: "o insumo não está mais cadastrado",
};

/** A mesma falta em três pedidos é uma falta, e não três linhas de aviso. */
function anotarPendencia(
  pendencias: Pendencia[],
  nome: string,
  motivo: MotivoPendencia,
): void {
  const repetida = pendencias.some(
    (anterior) => anterior.nome === nome && anterior.motivo === motivo,
  );
  if (!repetida) pendencias.push({ nome, motivo });
}

// ---------------------------------------------------------------------------
// Explosão: pedido → insumo
// ---------------------------------------------------------------------------

/** O que a explosão precisa saber de uma ficha. Nada além disso. */
export interface FichaParaExplodir {
  id: string;
  nome: string;
  arquivado: boolean;
  /** Quantas unidades saem de UM lote. Zero é ficha pela metade, e não zero doces. */
  rendimento: number;
  itens: { insumoId: string; nomeSnapshot: string; quantidade: number }[];
  /** Sempre vazio em ficha simples. Em um kit, as fichas que ele leva dentro. */
  componentes: { fichaId: string; nomeSnapshot: string; quantidade: number }[];
}

/** O que a explosão precisa saber de um pedido. */
export interface PedidoParaExplodir {
  id: string;
  itens: {
    fichaTecnicaId: string;
    /** Congelado no pedido — é o nome do que não explodiu, quando não explodir. */
    nomeSnapshot: string;
    quantidade: number;
  }[];
}

export interface LinhaDeDemanda {
  insumoId: string;
  /** `nomeSnapshot` do item da ficha, para nomear o insumo que sumiu do cadastro. */
  nome: string;
  /** Em unidade base e **sem perda**: é o que entra na receita. */
  quantidade: number;
}

export interface Demanda {
  linhas: LinhaDeDemanda[];
  pendencias: Pendencia[];
  /** Os pedidos que de fato entraram. É o que permite regerar e auditar. */
  pedidoIds: string[];
}

/** Os insumos de uma ficha, multiplicados pelos lotes que ela vai render. */
function somarInsumos(
  ficha: FichaParaExplodir,
  lotes: number,
  destino: Map<string, LinhaDeDemanda>,
): void {
  for (const item of ficha.itens) {
    const linha = destino.get(item.insumoId);
    if (linha) linha.quantidade += item.quantidade * lotes;
    else
      destino.set(item.insumoId, {
        insumoId: item.insumoId,
        nome: item.nomeSnapshot,
        quantidade: item.quantidade * lotes,
      });
  }
}

/** Quantidade negativa é dedo errado, e não devolução: vale zero. */
function quantidadeUtil(quantidade: number): number {
  return Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
}

/**
 * Pedido → insumo, em unidade base.
 *
 * A demanda de um insumo por unidade vendida é a quantidade da linha da ficha
 * dividida pelo rendimento do lote:
 *
 * ```
 * lotes      = quantidade pedida / ficha.rendimento
 * demanda   += item.quantidade × lotes
 * ```
 *
 * **A demanda é proporcional, e não arredondada para lotes inteiros.** 32
 * cookies são 1,6 lote, e a lista pede insumo para 1,6 lote. Arredondar para 2
 * inflaria a compra em 25% para resolver um problema que a Maynara resolve
 * sozinha na bancada: ela faz a fornada do tamanho que quiser.
 *
 * Em um kit, `itens` é a embalagem do próprio kit e `componentes` são fichas
 * simples. O componente é contado **por lote do kit**, como no motor de custo
 * (`custoFicha.ts` soma os componentes em `custoTotalLote` e só então divide
 * pelo rendimento): assim demanda e custo do mesmo pedido não podem divergir.
 *
 * A recursão para no primeiro nível por construção — são dois laços, e não uma
 * chamada recursiva. É o que `DECISOES.md#d11` garante, e é por isso que esta
 * função vive sem detecção de ciclo.
 */
export function explodirDemanda(
  pedidos: PedidoParaExplodir[],
  fichas: FichaParaExplodir[],
): Demanda {
  const porId = new Map(fichas.map((ficha) => [ficha.id, ficha]));
  const destino = new Map<string, LinhaDeDemanda>();
  const pendencias: Pendencia[] = [];
  const pedidoIds: string[] = [];

  /** A ficha existe, está viva e rende alguma coisa? Senão, diz o porquê. */
  function utilizavel(
    ficha: FichaParaExplodir | undefined,
    nomeDeReserva: string,
  ): ficha is FichaParaExplodir {
    if (!ficha || ficha.arquivado) {
      anotarPendencia(pendencias, nomeDeReserva, "SEM_FICHA");
      return false;
    }
    if (!(ficha.rendimento > 0)) {
      anotarPendencia(pendencias, ficha.nome, "SEM_RENDIMENTO");
      return false;
    }
    return true;
  }

  for (const pedido of pedidos) {
    pedidoIds.push(pedido.id);

    for (const item of pedido.itens) {
      const pedida = quantidadeUtil(item.quantidade);
      if (pedida === 0) continue;

      const ficha = porId.get(item.fichaTecnicaId);
      if (!utilizavel(ficha, item.nomeSnapshot)) continue;

      const lotes = pedida / ficha.rendimento;
      somarInsumos(ficha, lotes, destino);

      // Um nível, e só um: o componente de um componente não existe.
      for (const componente of ficha.componentes) {
        const dentro = porId.get(componente.fichaId);
        if (!utilizavel(dentro, componente.nomeSnapshot)) continue;

        const unidades = quantidadeUtil(componente.quantidade) * lotes;
        somarInsumos(dentro, unidades / dentro.rendimento, destino);
      }
    }
  }

  return {
    linhas: [...destino.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    pendencias,
    pedidoIds,
  };
}

// ---------------------------------------------------------------------------
// Montagem: demanda → o que comprar
// ---------------------------------------------------------------------------

/** O que a montagem precisa saber de um insumo. */
export interface InsumoParaLista {
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  arquivado: boolean;
  unidadeBase: UnidadeBase;
  /** O que vem em uma embalagem, já em unidade base. Ex.: 1 kg → 1000. */
  quantidadeBase: number;
  /** O mesmo número na unidade em que ela compra. Ex.: 1, em kg. */
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  precoCompra: Centavos;
  perdaPercentual: Percentual;
  estoqueAtual?: number;
}

export interface LinhaDaLista {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidadeBase: UnidadeBase;
  /** O que a receita pede, sem perda. */
  quantidadeNecessaria: number;
  /** O que precisa sair do mercado para sobrar o necessário depois da perda. */
  quantidadeFisica: number;
  estoqueAtual: number;
  /** max(0, física − estoque). É o que falta de fato. */
  quantidadeComprar: number;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  precoCompra: Centavos;
  /** Pacotes inteiros: ninguém compra 342 g de farinha. */
  quantidadePacotes: number;
  custoEstimado: Centavos;
}

export interface ListaMontada {
  /** Na ordem em que se anda no mercado, e por nome dentro de cada corredor. */
  linhas: LinhaDaLista[];
  pendencias: Pendencia[];
  custoEstimado: Centavos;
}

/**
 * Folga de arredondamento, em unidade base e em fração de pacote.
 *
 * 800 ÷ 0,95 × 0,95 não volta exatamente a 800 em ponto flutuante, e sem esta
 * folga um resto de 1e-13 g de farinha viraria um pacote de 1 kg no carrinho.
 */
const FOLGA = 1e-6;

/**
 * Do útil ao físico: o que precisa sair do mercado para sobrar o que a receita
 * pede.
 *
 * **A perda divide, e não multiplica.** Se 5% se perde na peneira, os 100% do
 * preço são pagos por 95% de produto útil. É a mesma conta de
 * `calcularCustoInsumo`, e o erro inverso é o mais comum em planilha de
 * confeitaria: multiplicar por 1,05 compra de menos.
 */
export function quantidadeFisica(
  util: number,
  perdaPercentual: Percentual,
): number {
  const perda = Math.min(Math.max(perdaPercentual || 0, 0), PERDA_MAXIMA);
  return util / (1 - perda / 100);
}

/**
 * Quantos pacotes fecham o que falta.
 *
 * Sempre para cima, e no mínimo um quando falta qualquer coisa: a gôndola não
 * vende fração de embalagem, e é o pacote inteiro que sai do caixa do mercado.
 */
function pacotesPara(comprar: number, quantidadeBase: number): number {
  if (comprar <= 0 || quantidadeBase <= 0) return 0;
  return Math.max(1, Math.ceil(comprar / quantidadeBase - FOLGA));
}

/**
 * Demanda → o que comprar, em pacote e em reais.
 *
 * A ordem das operações é onde esta conta costuma ser feita errado:
 *
 * ```
 * física  = útil / (1 − perda/100)
 * comprar = max(0, física − estoque)
 * pacotes = ceil(comprar / quantidadeBase)
 * custo   = pacotes × precoCompra
 * ```
 *
 * **O estoque é descontado depois da perda**, porque estoque é físico: os 500 g
 * de farinha no armário também vão perder 5% quando forem usados. Descontar
 * antes misturaria uma grandeza com a outra.
 *
 * `custoEstimado` conta pacotes inteiros, e não a fração necessária: é o número
 * que ela vai gastar de fato, que é a única versão desse número que serve para
 * alguma coisa.
 *
 * O insumo com estoque de sobra **continua na lista**, com zero pacotes: sumir
 * com ele seria pedir que ela confira de cabeça se esqueceu alguma coisa.
 */
export function montarLista(
  demanda: Demanda,
  insumos: InsumoParaLista[],
): ListaMontada {
  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const pendencias: Pendencia[] = [...demanda.pendencias];
  const linhas: LinhaDaLista[] = [];

  for (const pedido of demanda.linhas) {
    const insumo = porId.get(pedido.insumoId);
    if (!insumo || insumo.arquivado) {
      anotarPendencia(pendencias, pedido.nome, "SEM_INSUMO");
      continue;
    }

    const necessaria = pedido.quantidade;
    const fisica = quantidadeFisica(necessaria, insumo.perdaPercentual);
    const estoque = Math.max(0, insumo.estoqueAtual ?? 0);

    const falta = fisica - estoque;
    const comprar = falta > FOLGA ? falta : 0;
    const pacotes = pacotesPara(comprar, insumo.quantidadeBase);

    linhas.push({
      insumoId: insumo.id,
      // O nome vem do cadastro, e não do snapshot da ficha: é o nome que ela vai
      // procurar na prateleira hoje.
      nome: insumo.nome,
      categoria: insumo.categoria,
      unidadeBase: insumo.unidadeBase,
      quantidadeNecessaria: necessaria,
      quantidadeFisica: fisica,
      estoqueAtual: estoque,
      quantidadeComprar: comprar,
      quantidadeCompra: insumo.quantidadeCompra,
      unidadeCompra: insumo.unidadeCompra,
      precoCompra: insumo.precoCompra,
      quantidadePacotes: pacotes,
      custoEstimado: pacotes * insumo.precoCompra,
    });
  }

  linhas.sort(compararParaOMercado);

  return {
    linhas,
    pendencias,
    custoEstimado: linhas.reduce(
      (soma, linha) => soma + linha.custoEstimado,
      0,
    ),
  };
}

// ---------------------------------------------------------------------------
// A ordem do mercado, e o estado da lista
// ---------------------------------------------------------------------------

/**
 * A ordem em que se anda no mercado, e não a ordem alfabética das categorias.
 *
 * Ingrediente primeiro porque é o grosso do carrinho; embalagem e etiqueta
 * depois, que é onde elas ficam; o resto no fim.
 */
export const ORDEM_CATEGORIA_COMPRA: CategoriaInsumo[] = [
  "INGREDIENTE",
  "EMBALAGEM",
  "ETIQUETA",
  "ARMAZENAMENTO",
  "OUTRO",
];

export const ROTULO_CORREDOR: Record<CategoriaInsumo, string> = {
  INGREDIENTE: "Ingredientes",
  EMBALAGEM: "Embalagens",
  ETIQUETA: "Etiquetas",
  ARMAZENAMENTO: "Armazenamento",
  OUTRO: "Outros",
};

function posicaoNoMercado(categoria: CategoriaInsumo): number {
  const posicao = ORDEM_CATEGORIA_COMPRA.indexOf(categoria);
  return posicao === -1 ? ORDEM_CATEGORIA_COMPRA.length : posicao;
}

function compararParaOMercado(
  a: { categoria: CategoriaInsumo; nome: string },
  b: { categoria: CategoriaInsumo; nome: string },
): number {
  const corredor =
    posicaoNoMercado(a.categoria) - posicaoNoMercado(b.categoria);
  return corredor !== 0 ? corredor : a.nome.localeCompare(b.nome);
}

export interface CorredorDoMercado<T> {
  categoria: CategoriaInsumo;
  itens: T[];
}

/** Os itens reunidos por corredor, na ordem em que ela passa por eles. */
export function agruparPorCorredor<
  T extends { categoria: CategoriaInsumo; nome: string },
>(itens: T[]): CorredorDoMercado<T>[] {
  const grupos = new Map<CategoriaInsumo, T[]>();

  for (const item of [...itens].sort(compararParaOMercado)) {
    const corredor = grupos.get(item.categoria);
    if (corredor) corredor.push(item);
    else grupos.set(item.categoria, [item]);
  }

  return [...grupos.entries()].map(([categoria, lista]) => ({
    categoria,
    itens: lista,
  }));
}

/** Uma linha da lista já gravada, do ponto de vista de quem empurra o carrinho. */
export interface ItemNoCarrinho {
  insumoId: string;
  quantidadePacotes: number;
  custoEstimado: Centavos;
  comprado: boolean;
}

/** O que precisa entrar no carrinho. O resto ela já tem em casa. */
export function precisaComprar(item: { quantidadePacotes: number }): boolean {
  return item.quantidadePacotes > 0;
}

export interface ResumoDaLista {
  /** Quanto a lista inteira custa, se ela levar tudo. */
  total: Centavos;
  /** Quanto ainda falta pagar: o que já foi marcado sai da conta. */
  restante: Centavos;
  aComprar: number;
  comprados: number;
  /** Insumos que a demanda pede e que o estoque já cobre. */
  jaTem: number;
}

/**
 * O rodapé da tela, somado ao vivo enquanto ela marca.
 *
 * `restante` é o número que decide se dá para levar tudo hoje, e por isso ele
 * desce a cada item marcado em vez de ficar parado no total.
 */
export function resumoDaLista(itens: ItemNoCarrinho[]): ResumoDaLista {
  const noCarrinho = itens.filter(precisaComprar);
  const faltando = noCarrinho.filter((item) => !item.comprado);

  return {
    total: noCarrinho.reduce((soma, item) => soma + item.custoEstimado, 0),
    restante: faltando.reduce((soma, item) => soma + item.custoEstimado, 0),
    aComprar: noCarrinho.length,
    comprados: noCarrinho.length - faltando.length,
    jaTem: itens.length - noCarrinho.length,
  };
}

export type StatusListaCompras = "ABERTA" | "PARCIAL" | "COMPRADA";

/**
 * Em que pé a lista está, contando só o que há para comprar.
 *
 * O insumo que o estoque já cobre não conta de nenhum lado: ele não está por
 * comprar, e marcar como comprado o que ela não comprou seria mentira.
 */
export function statusDaLista(itens: ItemNoCarrinho[]): StatusListaCompras {
  const { aComprar, comprados } = resumoDaLista(itens);
  if (aComprar === 0 || comprados === 0) return "ABERTA";
  return comprados === aComprar ? "COMPRADA" : "PARCIAL";
}

/**
 * Regerar preserva o que já foi marcado, casando por `insumoId`.
 *
 * Sem isso, confirmar um pedido novo no meio da feira apagaria meia hora de
 * carrinho. O que sumiu da lista nova simplesmente não volta, e o que entrou
 * nasce por comprar.
 */
export function preservarComprados<T extends { insumoId: string }>(
  itens: T[],
  anteriores: { insumoId: string; comprado: boolean }[],
): (T & { comprado: boolean })[] {
  const marcados = new Set(
    anteriores.filter((item) => item.comprado).map((item) => item.insumoId),
  );

  return itens.map((item) => ({
    ...item,
    comprado: marcados.has(item.insumoId),
  }));
}

// ---------------------------------------------------------------------------
// Quais pedidos entram
// ---------------------------------------------------------------------------

/**
 * Os pedidos que viram compra: os que já foram fechados e ainda não saíram.
 *
 * `ORCAMENTO` fica de fora porque comprar insumo para uma proposta que talvez
 * não feche é dinheiro parado na despensa. `ENTREGUE` e `CANCELADO` também,
 * pelo motivo oposto — um já foi produzido, o outro não vai ser.
 */
export const STATUS_NA_LISTA: StatusPedido[] = [
  "CONFIRMADO",
  "EM_PRODUCAO",
  "PRONTO",
];

/**
 * A data que manda é a da **entrega**, e não a do pagamento: a lista fala de
 * produção, e produção acontece antes de entregar (`DECISOES.md#d36`).
 */
export function entraNaLista(
  pedido: { status: StatusPedido; dataEntregaISO: DataISO },
  periodoInicio: DataISO,
  periodoFim: DataISO,
): boolean {
  return (
    STATUS_NA_LISTA.includes(pedido.status) &&
    pedido.dataEntregaISO >= periodoInicio &&
    pedido.dataEntregaISO <= periodoFim
  );
}

/**
 * Os orçamentos do período, que a lista deixou de fora.
 *
 * A tela precisa dizer quantos são e oferecer o atalho para confirmá-los: uma
 * lista que some com um pedido sem explicar por quê é uma lista em que ela para
 * de confiar na primeira compra errada.
 */
export function orcamentosDeFora<
  T extends { status: StatusPedido; dataEntregaISO: DataISO },
>(pedidos: T[], periodoInicio: DataISO, periodoFim: DataISO): T[] {
  return pedidos.filter(
    (pedido) =>
      pedido.status === "ORCAMENTO" &&
      pedido.dataEntregaISO >= periodoInicio &&
      pedido.dataEntregaISO <= periodoFim,
  );
}

/** "2 pacotes de 500 g" — a verdade da gôndola, ao lado da verdade da receita. */
export function rotuloDeCompra(
  pacotes: number,
  quantidadeCompra: number,
  unidadeCompra: UnidadeCompra,
): string {
  const embalagem = quantidadeCompra.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
  return `${pacotes} ${pacotes === 1 ? "pacote" : "pacotes"} de ${embalagem} ${unidadeCompra}`;
}
