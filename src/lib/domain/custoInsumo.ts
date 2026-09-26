import type {
  CategoriaInsumo,
  Centavos,
  CentavosFracionados,
  HistoricoPreco,
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

/** O que a ficha do material lê do histórico. `Insumo` serve. */
export interface InsumoComHistorico {
  id: string;
  unidadeBase: UnidadeBase;
  criadoEm: Momento;
  historicoPrecos: (Omit<HistoricoPreco, "data"> & { data: Momento })[];
}

export interface CompraDoInsumo {
  dataMs: number;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  /** O quilo, o litro ou a unidade, **sem** perda: perda mudar não é o preço mudar. */
  referencia: CentavosFracionados;
  fornecedor?: string;
  /** O preço médio com que o material nasceu, e não uma compra dela. */
  daBiblioteca: boolean;
  /** Em %, contra a compra anterior dela. `null` na primeira e na da biblioteca. */
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
  const criadoMs = insumo.criadoEm?.toMillis();
  const ordenadas = [...(insumo.historicoPrecos ?? [])].sort(
    (a, b) => a.data.toMillis() - b.data.toMillis(),
  );

  const compras: CompraDoInsumo[] = [];
  let primeiraMs: number | null = null;
  let primeira: number | null = null;
  let anterior: number | null = null;
  let quantas = 0;
  for (const [indice, entrada] of ordenadas.entries()) {
    const dataMs = entrada.data.toMillis();
    const daBiblioteca =
      indice === 0 && ehDaBiblioteca(insumo.id) && dataMs === criadoMs;
    compras.push({
      dataMs,
      precoCompra: entrada.precoCompra,
      quantidadeCompra: entrada.quantidadeCompra,
      unidadeCompra: entrada.unidadeCompra,
      referencia: custoDeReferencia(
        entrada.custoUnidadeBase,
        insumo.unidadeBase,
      ).centavos,
      ...(entrada.fornecedor ? { fornecedor: entrada.fornecedor } : {}),
      daBiblioteca,
      variacao:
        daBiblioteca || anterior === null
          ? null
          : variacaoEntre(anterior, entrada.custoUnidadeBase),
    });
    if (daBiblioteca) continue;
    quantas += 1;
    primeiraMs ??= dataMs;
    primeira ??= entrada.custoUnidadeBase;
    anterior = entrada.custoUnidadeBase;
  }

  return {
    compras: compras.reverse(),
    quantas,
    primeiraMs,
    variacaoTotal: quantas < 2 ? null : variacaoEntre(primeira!, anterior!),
  };
}

/** A última compra dela; `null` sem nenhuma (a entrada da biblioteca não conta). */
export function ultimaCompraDela(
  insumo: InsumoComHistorico,
): CompraDoInsumo | null {
  const ultima = comprasDoInsumo(insumo).compras[0];
  return ultima && !ultima.daBiblioteca ? ultima : null;
}

/** O percentual da última compra dela contra a anterior dela; `null` com menos de duas. */
export function variacaoDaUltimaCompra(
  insumo: InsumoComHistorico,
): number | null {
  return ultimaCompraDela(insumo)?.variacao ?? null;
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
