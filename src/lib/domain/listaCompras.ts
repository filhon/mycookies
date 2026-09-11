import type {
  CategoriaInsumo,
  Centavos,
  DataISO,
  Percentual,
  StatusPedido,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
import { compararParaOMercado } from "./corredores";
import { PERDA_MAXIMA } from "./custoInsumo";
import { estoqueParaLista } from "./estoque";

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
    /** O que foi escolhido num combo, por unidade do kit (`DECISOES.md#d103`). */
    escolhas?: {
      fichaTecnicaId: string;
      nomeSnapshot: string;
      quantidade: number;
    }[];
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
  itens: Iterable<LinhaDeDemanda>,
  lotes: number,
  destino: Map<string, LinhaDeDemanda>,
): void {
  for (const item of itens) {
    const linha = destino.get(item.insumoId);
    if (linha) linha.quantidade += item.quantidade * lotes;
    else
      destino.set(item.insumoId, {
        insumoId: item.insumoId,
        nome: item.nome,
        quantidade: item.quantidade * lotes,
      });
  }
}

/** Quantidade negativa é dedo errado, e não devolução: vale zero. */
function quantidadeUtil(quantidade: number): number {
  return Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
}

/** Os itens de uma ficha, na forma que `somarInsumos` lê. */
function linhasDosItens(ficha: FichaParaExplodir): LinhaDeDemanda[] {
  return ficha.itens.map((item) => ({
    insumoId: item.insumoId,
    nome: item.nomeSnapshot,
    quantidade: item.quantidade,
  }));
}

/**
 * Os insumos de **um** lote da ficha, em unidade base e sem perda.
 *
 * É aqui que mora a regra do kit de um nível (`DECISOES.md#d11`): os `itens` da
 * própria ficha entram inteiros, e cada componente entra pelos itens dele,
 * multiplicados por `quantidade / rendimento` do componente. O componente de um
 * componente não existe — são dois laços, e não uma chamada recursiva.
 *
 * `explodirDemanda` e `consumoPorLote` (a fornada, em `producao.ts`) chamam a
 * mesma função: se a regra do kit ficasse duplicada, a primeira mudança nela
 * sairia errada em um dos dois.
 *
 * `aoPular` é chamado para o componente que não dá para seguir — arquivado,
 * sumido ou sem rendimento —, com o nome congelado e o motivo. A lista anota a
 * pendência; a fornada segue sem ele.
 */
export function insumosPorLote(
  ficha: FichaParaExplodir,
  porId: Map<string, FichaParaExplodir>,
  aoPular?: (nome: string, motivo: MotivoPendencia) => void,
): Map<string, LinhaDeDemanda> {
  const destino = new Map<string, LinhaDeDemanda>();

  somarInsumos(linhasDosItens(ficha), 1, destino);

  // Um nível, e só um: o componente de um componente não existe.
  for (const componente of ficha.componentes) {
    const dentro = porId.get(componente.fichaId);
    // Sumida ou arquivada, o nome é o congelado no kit; sem rendimento, a
    // ficha existe e tem nome próprio.
    if (!dentro || dentro.arquivado) {
      aoPular?.(componente.nomeSnapshot, "SEM_FICHA");
      continue;
    }
    if (!(dentro.rendimento > 0)) {
      aoPular?.(dentro.nome, "SEM_RENDIMENTO");
      continue;
    }

    const unidades = quantidadeUtil(componente.quantidade);
    somarInsumos(linhasDosItens(dentro), unidades / dentro.rendimento, destino);
  }

  return destino;
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
 * A recursão para no primeiro nível por construção, em `insumosPorLote`. É o
 * que `DECISOES.md#d11` garante, e é por isso que esta função vive sem detecção
 * de ciclo.
 *
 * **Um combo explode o que foi escolhido** (`#d103`): cada escolha entra pelos
 * itens da receita escolhida, em `quantidade × pedida ÷ rendimento`, e a
 * receita escolhida é `SIMPLES` por construção, então são os `itens` dela e
 * nada abaixo. Sem isto a lista compraria só o saquinho do combo, e deixar de
 * comprar é o erro caro (`#d63`). Pedido sem `escolhas` explode como sempre.
 */
export function explodirDemanda(
  pedidos: PedidoParaExplodir[],
  fichas: FichaParaExplodir[],
): Demanda {
  const porId = new Map(fichas.map((ficha) => [ficha.id, ficha]));
  const destino = new Map<string, LinhaDeDemanda>();
  const pendencias: Pendencia[] = [];
  const pedidoIds: string[] = [];

  const anotar = (nome: string, motivo: MotivoPendencia) =>
    anotarPendencia(pendencias, nome, motivo);

  for (const pedido of pedidos) {
    pedidoIds.push(pedido.id);

    for (const item of pedido.itens) {
      const pedida = quantidadeUtil(item.quantidade);
      if (pedida === 0) continue;

      const ficha = porId.get(item.fichaTecnicaId);
      if (!ficha || ficha.arquivado) {
        anotar(item.nomeSnapshot, "SEM_FICHA");
        continue;
      }
      if (!(ficha.rendimento > 0)) {
        anotar(ficha.nome, "SEM_RENDIMENTO");
        continue;
      }

      const lotes = pedida / ficha.rendimento;
      somarInsumos(
        insumosPorLote(ficha, porId, anotar).values(),
        lotes,
        destino,
      );

      for (const escolha of item.escolhas ?? []) {
        const receita = porId.get(escolha.fichaTecnicaId);
        if (!receita || receita.arquivado) {
          anotar(escolha.nomeSnapshot, "SEM_FICHA");
          continue;
        }
        if (!(receita.rendimento > 0)) {
          anotar(receita.nome, "SEM_RENDIMENTO");
          continue;
        }
        const unidades = quantidadeUtil(escolha.quantidade) * pedida;
        somarInsumos(
          linhasDosItens(receita),
          unidades / receita.rendimento,
          destino,
        );
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
  /**
   * O dia em que ela contou.
   *
   * É o campo que decide **se** `estoqueAtual` entra na conta. Ausente, ou
   * velho demais, o número não é descontado: um número sem data não é uma
   * medida, é um palpite antigo tratado como verdade.
   */
  estoqueContadoEmISO?: DataISO;
}

export interface LinhaDaLista {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidadeBase: UnidadeBase;
  /** O que a receita pede, sem perda: os pedidos mais a reserva. */
  quantidadeNecessaria: number;
  /**
   * A parte de `quantidadeNecessaria` que é piso, e não pedido (`#d96`). É o
   * que permite à linha dizer de onde veio um número sem pedido atrás.
   */
  quantidadeDeReserva: number;
  /** O que precisa sair do mercado para sobrar o necessário depois da perda. */
  quantidadeFisica: number;
  /**
   * O que a contagem disse, quando ela ainda vale — e não o que está gravado
   * no insumo.
   *
   * Zero quando a contagem venceu ou nunca existiu: a linha guarda o número que
   * entrou na conta, e o **motivo** fica no insumo vivo, que a tela tem na mão.
   * Gravar o frescor aqui seria congelar uma idade que envelhece sozinha dentro
   * de um documento que ninguém reescreve.
   *
   * O que foi de fato descontado é `max(0, estoqueAtual − consumoDeFornadas)`.
   */
  estoqueAtual: number;
  /** O que saiu para o forno desde a contagem deste insumo (`#d87`). */
  consumoDeFornadas: number;
  /** O que já foi assado para os pedidos desta lista, físico (`#d91`). */
  quantidadeJaProduzida: number;
  /** max(0, física − produzida − disponível). É o que falta de fato. */
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
 * O que o forno já fez, por `insumoId`, para a lista descontar.
 *
 * Os dois mapas saem de `producao.ts` — `consumoDesdeAContagem` e
 * `produzidoParaPedidos` — e chegam aqui prontos: a montagem não lê fornada
 * nenhuma, só subtrai.
 */
export interface ContextoDaProducao {
  /** Por insumoId, o que saiu para o forno desde a contagem de cada um. */
  consumo: Map<string, number>;
  /** Por insumoId, o que já foi assado para os pedidos desta lista. */
  produzido: Map<string, number>;
  /**
   * Por insumoId, o que as fichas com piso querem sempre poder fazer, em
   * unidade base e **sem perda** — sai de `reservaDeProducao` (`#d96`). Entra
   * como demanda ao lado dos pedidos; insumo que só a reserva pede ganha
   * linha própria. Opcional porque a 13A não o conhecia.
   */
  piso?: Map<string, LinhaDeDemanda>;
}

/** Sem fornada registrada a lista é exatamente a de antes da spec 013. */
export const SEM_PRODUCAO: ContextoDaProducao = {
  consumo: new Map(),
  produzido: new Map(),
};

/**
 * Demanda → o que comprar, em pacote e em reais.
 *
 * A ordem das operações é onde esta conta costuma ser feita errado:
 *
 * ```
 * útil       = pedidos + piso[insumo]               ← a reserva é demanda (#d96)
 * física     = útil / (1 − perda/100)
 * física    −= produzido[insumo]                    ← o que já foi assado (#d91)
 * disponível = max(0, estoque − consumo[insumo])    ← a projeção (#d87)
 * comprar    = max(0, física − disponível)
 * pacotes    = ceil(comprar / quantidadeBase)
 * custo      = pacotes × precoCompra
 * ```
 *
 * **O estoque é descontado depois da perda**, porque estoque é físico: os 500 g
 * de farinha no armário também vão perder 5% quando forem usados. Descontar
 * antes misturaria uma grandeza com a outra. **E o abate da fornada acontece do
 * lado físico pelo mesmo motivo**: `Fornada.consumo` já está em quantidade
 * física, e subtrair físico de útil somaria duas grandezas diferentes. O abate
 * é só da parte dos pedidos — a massa feita para um pedido não é reserva, e a
 * reserva não encolhe porque ela fez massa a mais para alguém.
 *
 * **E o estoque só entra na conta se a contagem ainda valer.** Quem responde
 * isso é `estoqueParaLista`, contra `hojeISO`: contagem vencida e contagem
 * inexistente valem zero, e a lista compra a quantidade física inteira. A
 * escolha é entre dois erros e eles não custam o mesmo — descontar número velho
 * erra para baixo e produz a compra faltando, e é este mesmo arquivo que
 * registra qual dos dois é o inaceitável, no comentário de `MotivoPendencia`.
 *
 * `producao` é opcional **de propósito**: sem ele a função é exatamente a de
 * antes, e os testes da 7B continuam passando sem uma linha alterada. É a prova
 * de que a spec 013 é aditiva.
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
  hojeISO: DataISO,
  producao: ContextoDaProducao = SEM_PRODUCAO,
): ListaMontada {
  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const pendencias: Pendencia[] = [...demanda.pendencias];
  const linhas: LinhaDaLista[] = [];

  // Os pedidos primeiro, e depois o que só a reserva pede: a ordem final é a
  // do mercado, então aqui ela não importa.
  const pedidas = new Map(
    demanda.linhas.map((linha) => [linha.insumoId, linha]),
  );
  const piso = producao.piso ?? new Map<string, LinhaDeDemanda>();
  const insumoIds = new Set([...pedidas.keys(), ...piso.keys()]);

  for (const insumoId of insumoIds) {
    const pedido = pedidas.get(insumoId);
    const reserva = piso.get(insumoId);
    const insumo = porId.get(insumoId);
    if (!insumo || insumo.arquivado) {
      anotarPendencia(
        pendencias,
        (pedido ?? reserva)?.nome ?? insumoId,
        "SEM_INSUMO",
      );
      continue;
    }

    const deReserva = reserva?.quantidade ?? 0;
    const necessaria = (pedido?.quantidade ?? 0) + deReserva;
    const fisicaPedida = quantidadeFisica(
      pedido?.quantidade ?? 0,
      insumo.perdaPercentual,
    );
    const fisicaDaReserva = quantidadeFisica(deReserva, insumo.perdaPercentual);
    const fisica = fisicaPedida + fisicaDaReserva;
    const produzida = producao.produzido.get(insumo.id) ?? 0;
    const estoque = estoqueParaLista(insumo, hojeISO);
    const consumo = producao.consumo.get(insumo.id) ?? 0;
    const disponivel = Math.max(0, estoque - consumo);

    const falta =
      Math.max(0, fisicaPedida - produzida) + fisicaDaReserva - disponivel;
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
      quantidadeDeReserva: deReserva,
      quantidadeFisica: fisica,
      estoqueAtual: estoque,
      consumoDeFornadas: consumo,
      quantidadeJaProduzida: produzida,
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
// O estado da lista
// ---------------------------------------------------------------------------

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
 *
 * `PRONTO` **fica**, mesmo que pronto queira dizer assado: "pronto" é o que ela
 * clicou, e a fornada é o que ela registrou. Quem abate o que já foi assado é
 * `Fornada.pedidoId`, na montagem — o que de fato aconteceu, e não o status
 * (`DECISOES.md#d91`).
 */
export const STATUS_NA_LISTA: StatusPedido[] = [
  "CONFIRMADO",
  "EM_PRODUCAO",
  "PRONTO",
];

/**
 * Por quantos dias adiante, no máximo, a lista olha. É o recorte da consulta de
 * pedidos, em `/compras` e onde a capacidade desconta o que já está prometido.
 */
export const HORIZONTE_MAXIMO = 30;

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
