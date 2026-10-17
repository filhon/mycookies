import type {
  CategoriaInsumo,
  Centavos,
  CentavosFracionados,
  HistoricoPreco,
  OrigemCompra,
  Percentual,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
// Ciclo com `biblioteca.ts`, que usa `calcularCustoInsumo` só dentro de função.
import { ehDaBiblioteca } from "./biblioteca";
import { custoDeReferencia, paraBase, unidadeBaseDe } from "./unidades";

/**
 * As cinco categorias, na ordem em que aparecem em toda tela que as oferece.
 *
 * Mora aqui, e não dentro do formulário de insumo, porque a leitura de nota é o
 * segundo lugar que precisa oferecer a mesma escolha — e duas listas seriam
 * duas ordens e dois rótulos esperando para divergir.
 */
export const CATEGORIAS_INSUMO: { valor: CategoriaInsumo; rotulo: string }[] = [
  { valor: "INGREDIENTE", rotulo: "Ingrediente" },
  { valor: "EMBALAGEM", rotulo: "Embalagem" },
  { valor: "ETIQUETA", rotulo: "Etiqueta" },
  { valor: "ARMAZENAMENTO", rotulo: "Armazenamento" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export interface EntradaCustoInsumo {
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  /** Quebra, casca, aparas, sobra na tigela. 0 a 99. */
  perdaPercentual: Percentual;
}

export interface CustoInsumoCalculado {
  unidadeBase: UnidadeBase;
  quantidadeBase: number;
  custoUnidadeBase: CentavosFracionados;
  custoUnidadeBaseCorrigido: CentavosFracionados;
  /** Quanto a perda custa por embalagem comprada. Serve para mostrar à usuária. */
  custoDaPerda: Centavos;
  /** Quantidade que sobra de fato para usar, depois da perda. */
  rendimentoLiquido: number;
}

export const PERDA_MAXIMA = 99;

/**
 * Converte "paguei R$ 12,50 em 1 kg de farinha e perco 5% na peneira" em
 * "cada grama aproveitada me custa 1,3158 centavo".
 *
 * O fator de correção divide, não multiplica: se 5% se perde, os 100% do preço
 * são pagos por 95% de produto útil. Multiplicar por 1,05 subestima o custo, e
 * é o erro mais comum em planilha de confeitaria.
 */
export function calcularCustoInsumo(
  entrada: EntradaCustoInsumo,
): CustoInsumoCalculado {
  const { precoCompra, quantidadeCompra, unidadeCompra } = entrada;
  const perdaPercentual = Math.min(
    Math.max(entrada.perdaPercentual || 0, 0),
    PERDA_MAXIMA,
  );

  const unidadeBase = unidadeBaseDe(unidadeCompra);
  const quantidadeBase = paraBase(quantidadeCompra, unidadeCompra);

  if (!quantidadeBase || quantidadeBase <= 0) {
    return {
      unidadeBase,
      quantidadeBase: 0,
      custoUnidadeBase: 0,
      custoUnidadeBaseCorrigido: 0,
      custoDaPerda: 0,
      rendimentoLiquido: 0,
    };
  }

  const custoUnidadeBase = precoCompra / quantidadeBase;
  const fatorAproveitamento = 1 - perdaPercentual / 100;
  const custoUnidadeBaseCorrigido = custoUnidadeBase / fatorAproveitamento;
  const rendimentoLiquido = quantidadeBase * fatorAproveitamento;

  return {
    unidadeBase,
    quantidadeBase,
    custoUnidadeBase,
    custoUnidadeBaseCorrigido,
    custoDaPerda: Math.round(
      precoCompra - rendimentoLiquido * custoUnidadeBase,
    ),
    rendimentoLiquido,
  };
}

/** Custo de usar `quantidade` (em unidade base) de um insumo já calculado. */
export function custoDeUso(
  custoUnidadeBaseCorrigido: CentavosFracionados,
  quantidade: number,
): Centavos {
  return Math.round(custoUnidadeBaseCorrigido * quantidade);
}

/** O que `comprasDoInsumo` chama num `Timestamp`: o domínio não o importa. */
interface Momento {
  toMillis(): number;
}

/** Uma entrada de `historicoPrecos`, com as datas sem Firebase. */
export type EntradaDoHistorico = Omit<
  HistoricoPreco,
  "data" | "descartadaEm"
> & { data: Momento; descartadaEm?: Momento };

/** O que a ficha do material lê do histórico. `Insumo` serve. */
export interface InsumoComHistorico<
  E extends EntradaDoHistorico = EntradaDoHistorico,
> {
  id: string;
  criadoEm: Momento;
  historicoPrecos: E[];
}

export interface CompraDoInsumo {
  dataMs: number;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  /** A base **da entrada**, e não a do material: o açúcar já foi contado em `un` (spec 189). */
  unidadeBase: UnidadeBase;
  /** O quilo, o litro ou a unidade, **sem** perda: perda mudar não é o preço mudar. */
  referencia: CentavosFracionados;
  rotulo: ReturnType<typeof custoDeReferencia>["rotulo"];
  fornecedor?: string;
  origem?: OrigemCompra;
  estabelecimento?: string;
  /** O preço médio com que o material nasceu, e não uma compra dela. */
  daBiblioteca: boolean;
  /** Quando ela a descartou; `null` na que conta. */
  descartadaMs: number | null;
  /**
   * Pode ser descartada: é dela, conta, e sobra outra que conta para o
   * material voltar. Sem outra, o que resta é corrigir.
   */
  descartavel: boolean;
  /**
   * Em %, contra a compra anterior dela que conta e está na mesma base. `null`
   * na primeira, na da biblioteca, na descartada e entre bases diferentes.
   */
  variacao: number | null;
}

export interface ComprasDoInsumo {
  /** Do mais novo ao mais velho. */
  compras: CompraDoInsumo[];
  /** Quantas são dela, sem a da biblioteca. */
  quantas: number;
  /** A primeira compra dela. `null` sem nenhuma. */
  primeiraMs: number | null;
  /** Em %, da primeira compra dela à última. `null` com menos de duas. */
  variacaoTotal: number | null;
}

/** 99,90 → 109,50 = 10. Inteiro, e sem "-0". */
export function variacaoEntre(antes: number, depois: number): number | null {
  if (antes <= 0) return null;
  return Math.round((depois / antes - 1) * 100) || 0;
}

/**
 * O histórico gravado, pronto para a ficha do material (`#d222`).
 *
 * A entrada da biblioteca é a que nasceu com o documento (`criadoEm`) num id da
 * biblioteca: a mais velha, até a poda das doze a levar embora. Fica fora de
 * toda variação; sem isso, a primeira compra real sairia "subiu 40%".
 */
export function comprasDoInsumo(insumo: InsumoComHistorico): ComprasDoInsumo {
  const ordenadas = [...(insumo.historicoPrecos ?? [])].sort(
    (a, b) => a.data.toMillis() - b.data.toMillis(),
  );

  const compras: CompraDoInsumo[] = [];
  let primeira: { dataMs: number; custo: number; base: UnidadeBase } | null =
    null;
  let anterior: { custo: number; base: UnidadeBase } | null = null;
  let quantas = 0;
  for (const entrada of ordenadas) {
    const dataMs = entrada.data.toMillis();
    const daBiblioteca = ehEntradaDaBiblioteca(insumo, entrada);
    const descartadaMs = entrada.descartadaEm?.toMillis() ?? null;
    const conta = !daBiblioteca && descartadaMs === null;
    const base = unidadeBaseDe(entrada.unidadeCompra);
    const custo = entrada.custoUnidadeBase;
    const referencia = custoDeReferencia(custo, base);
    compras.push({
      dataMs,
      precoCompra: entrada.precoCompra,
      quantidadeCompra: entrada.quantidadeCompra,
      unidadeCompra: entrada.unidadeCompra,
      unidadeBase: base,
      referencia: referencia.centavos,
      rotulo: referencia.rotulo,
      ...(entrada.fornecedor ? { fornecedor: entrada.fornecedor } : {}),
      ...(entrada.origem ? { origem: entrada.origem } : {}),
      ...(entrada.estabelecimento
        ? { estabelecimento: entrada.estabelecimento }
        : {}),
      daBiblioteca,
      descartadaMs,
      descartavel: false,
      variacao:
        conta && anterior?.base === base
          ? variacaoEntre(anterior.custo, custo)
          : null,
    });
    if (!conta) continue;
    quantas += 1;
    primeira ??= { dataMs, custo, base };
    anterior = { custo, base };
  }

  // A da biblioteca também é para onde o material volta: é um preço.
  const valem = compras.filter((compra) => compra.descartadaMs === null);
  for (const compra of valem) {
    compra.descartavel = !compra.daBiblioteca && valem.length > 1;
  }

  return {
    compras: compras.reverse(),
    quantas,
    primeiraMs: primeira?.dataMs ?? null,
    variacaoTotal:
      quantas < 2 || primeira!.base !== anterior!.base
        ? null
        : variacaoEntre(primeira!.custo, anterior!.custo),
  };
}

/**
 * A entrada que nasceu com o documento num id da biblioteca (`#d222`). Pela
 * data, e não por ser a mais velha: a poda das doze acaba levando-a embora.
 */
function ehEntradaDaBiblioteca(
  insumo: Pick<InsumoComHistorico, "id" | "criadoEm">,
  entrada: { data: Momento },
): boolean {
  return (
    ehDaBiblioteca(insumo.id) &&
    entrada.data.toMillis() === insumo.criadoEm?.toMillis()
  );
}

/** A última compra dela que conta; `null` sem nenhuma (a da biblioteca não conta). */
export function ultimaCompraDela(
  insumo: InsumoComHistorico,
): CompraDoInsumo | null {
  return (
    comprasDoInsumo(insumo).compras.find(
      (compra) => !compra.daBiblioteca && compra.descartadaMs === null,
    ) ?? null
  );
}

/**
 * A entrada que vale para o material: a mais nova que não foi descartada. Pode
 * ser a da biblioteca, que é um preço; `null` com todas descartadas.
 */
export function vigenteDoHistorico<E extends EntradaDoHistorico>(
  historico: E[],
): E | null {
  let vigente: E | null = null;
  for (const entrada of historico) {
    if (entrada.descartadaEm) continue;
    if (!vigente || entrada.data.toMillis() > vigente.data.toMillis())
      vigente = entrada;
  }
  return vigente;
}

/** O que uma correção troca numa compra: a data e a procedência ficam. */
export type CorrecaoDaCompra = Pick<
  HistoricoPreco,
  "precoCompra" | "quantidadeCompra" | "unidadeCompra" | "custoUnidadeBase"
>;

/**
 * O histórico com a última compra dela reescrita, e não uma compra a mais
 * (`DECISOES.md#d419`). Mantém a data: corrigir não rejuvenesce o preço.
 * `null` quando não há compra dela que conte (a da biblioteca não é dela).
 */
export function historicoCorrigido<E extends EntradaDoHistorico>(
  insumo: InsumoComHistorico<E>,
  correcao: CorrecaoDaCompra,
): E[] | null {
  const alvo = vigenteDoHistorico(insumo.historicoPrecos);
  if (!alvo || ehEntradaDaBiblioteca(insumo, alvo)) return null;
  return insumo.historicoPrecos.map((entrada) =>
    entrada === alvo ? { ...entrada, ...correcao } : entrada,
  );
}

/**
 * O histórico com a compra do dia `dataMs` descartada em `em`, ou de volta
 * (`em` nulo). Marca, e nunca tira do array (`DECISOES.md#d420`).
 */
export function historicoComDescarte<E extends EntradaDoHistorico>(
  historico: E[],
  dataMs: number,
  em: E["descartadaEm"] | null,
): E[] {
  return historico.map((entrada) => {
    if (entrada.data.toMillis() !== dataMs) return entrada;
    const copia = { ...entrada };
    if (em) copia.descartadaEm = em;
    else delete copia.descartadaEm;
    return copia;
  });
}

/**
 * Corta o histórico em `limite`. As descartadas saem primeiro, a mais velha
 * antes; depois, as mais velhas (`#d222`).
 */
export function historicoPodado<E extends EntradaDoHistorico>(
  historico: E[],
  limite: number,
): E[] {
  const sobra = historico.length - limite;
  if (sobra <= 0) return historico;
  const saem = new Set(
    [...historico]
      .sort(
        (a, b) =>
          Number(!a.descartadaEm) - Number(!b.descartadaEm) ||
          a.data.toMillis() - b.data.toMillis(),
      )
      .slice(0, sobra),
  );
  return historico.filter((entrada) => !saem.has(entrada));
}

/** O percentual da última compra dela contra a anterior dela; `null` com menos de duas. */
export function variacaoDaUltimaCompra(
  insumo: InsumoComHistorico,
): number | null {
  return ultimaCompraDela(insumo)?.variacao ?? null;
}

/** O que as bases leem de uma ficha. `FichaTecnica` serve. */
export interface FichaComItens {
  itens: { insumoId: string; unidadeBase: UnidadeBase }[];
}

/**
 * Em que unidade as receitas medem o material: das linhas de `ficha.itens`, as
 * mesmas fichas de "Onde entra". Vazio quando nenhuma o usa.
 */
export function basesDasReceitas(
  fichas: FichaComItens[],
  insumoId: string,
): Set<UnidadeBase> {
  const bases = new Set<UnidadeBase>();
  for (const ficha of fichas) {
    for (const item of ficha.itens) {
      if (item.insumoId === insumoId) bases.add(item.unidadeBase);
    }
  }
  return bases;
}

/**
 * A base nova serve ao material? (spec 188)
 *
 * As receitas guardam "200" com `unidadeBase: "g"`. Um material que passa a ser
 * contado em unidades multiplica 200 pelo preço da unidade, e o custo de todo
 * produto com ele dispara. Sem receita, qualquer base serve; com receita, só a
 * delas, o que também deixa **voltar** para a base certa um material que já
 * está quebrado. Mudar de base de verdade é converter as receitas junto (191).
 */
export function baseAceita(
  novaBase: UnidadeBase,
  basesDasReceitas: Set<UnidadeBase>,
): boolean {
  return basesDasReceitas.size === 0 || basesDasReceitas.has(novaBase);
}

/**
 * Os materiais contados numa base que as receitas não usam, com a base delas.
 * É o que já está quebrado na conta, e a tela o diz com nome (spec 188).
 */
export function basesQueNaoBatem(
  insumos: { id: string; unidadeBase: UnidadeBase }[],
  fichas: FichaComItens[],
): Map<string, UnidadeBase> {
  const porInsumo = new Map<string, Set<UnidadeBase>>();
  for (const ficha of fichas) {
    for (const item of ficha.itens) {
      const bases = porInsumo.get(item.insumoId) ?? new Set<UnidadeBase>();
      bases.add(item.unidadeBase);
      porInsumo.set(item.insumoId, bases);
    }
  }

  const resultado = new Map<string, UnidadeBase>();
  for (const insumo of insumos) {
    const bases = porInsumo.get(insumo.id);
    if (bases && !baseAceita(insumo.unidadeBase, bases)) {
      resultado.set(insumo.id, [...bases][0]!);
    }
  }
  return resultado;
}

/** As três ordens da lista de materiais (`#d226`). */
export type OrdemMateriais = "NOME" | "PRECO_MUDOU" | "PESO";

/**
 * A lista de materiais na ordem escolhida (`#d226`). `peso` é, por id, a soma
 * das partes do custo pelos produtos em que o material entra (`usoDoMaterial`):
 * uma ordem, e não um número para mostrar. Material sem compra dela, ou sem
 * uso, vai para o fim, por nome.
 */
export function ordenarMateriais<
  T extends InsumoComHistorico & { nomeBusca: string },
>(insumos: T[], ordem: OrdemMateriais, peso: Map<string, number>): T[] {
  const porNome = (a: T, b: T) =>
    a.nomeBusca < b.nomeBusca ? -1 : a.nomeBusca > b.nomeBusca ? 1 : 0;
  if (ordem === "NOME") return [...insumos].sort(porNome);

  const chave = new Map(
    insumos.map((insumo) => [
      insumo.id,
      ordem === "PESO"
        ? (peso.get(insumo.id) ?? 0)
        : (ultimaCompraDela(insumo)?.dataMs ?? 0),
    ]),
  );
  return [...insumos].sort(
    (a, b) => chave.get(b.id)! - chave.get(a.id)! || porNome(a, b),
  );
}

/** Normaliza nome para busca offline: minúsculo, sem acento, sem espaço duplo. */
export function chaveDeBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
