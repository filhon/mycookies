import type {
  CategoriaInsumo,
  Centavos,
  Insumo,
  Percentual,
  UnidadeCompra,
  UnidadeRendimento,
} from "@/lib/types";
import { calcularCustoInsumo } from "./custoInsumo";
import type { RateioOperacional } from "./custoFicha";
import type { ParametrosPreco } from "./precificacao";

/** Todo documento da biblioteca nasce com este prefixo no id (`DECISOES.md#d114`). */
export const PREFIXO_BIBLIOTECA = "biblioteca-";

export function ehDaBiblioteca(id: string): boolean {
  return id.startsWith(PREFIXO_BIBLIOTECA);
}

/** Insumo da biblioteca que ela ainda não corrigiu: uma compra só no histórico. */
export function temPrecoMedio(
  insumo: Pick<Insumo, "id" | "historicoPrecos">,
): boolean {
  return (
    ehDaBiblioteca(insumo.id) && (insumo.historicoPrecos?.length ?? 0) <= 1
  );
}

/** Os nomes, na ordem dos itens da ficha, dos insumos dela que ainda estão com preço médio. */
export function insumosComPrecoMedio(
  itens: { insumoId: string }[],
  insumos: Insumo[],
): string[] {
  const mapa = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const vistos = new Set<string>();
  const nomes: string[] = [];

  for (const item of itens) {
    if (vistos.has(item.insumoId)) continue;
    vistos.add(item.insumoId);
    const insumo = mapa.get(item.insumoId);
    if (insumo && temPrecoMedio(insumo)) nomes.push(insumo.nome);
  }

  return nomes;
}

interface InsumoDaBiblioteca {
  /** O id sem o prefixo — `montarBiblioteca` monta o final. */
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  precoCompra: Centavos;
  perdaPercentual: Percentual;
}

interface ItemDaFichaBiblioteca {
  /** Aponta para o `id` (sem prefixo) de um `InsumoDaBiblioteca`. */
  insumoId: string;
  /** Já na unidade base do insumo referido — a tabela da spec já está nela. */
  quantidade: number;
}

interface FichaDaBiblioteca {
  id: string;
  nome: string;
  categoria: string;
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  tempoProducaoMinutos: number;
  itens: ItemDaFichaBiblioteca[];
}

/** O documento de insumo que `montarBiblioteca` devolve — casa com `DadosInsumo`. */
export interface DadosInsumoDaBiblioteca {
  nome: string;
  categoria: CategoriaInsumo;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  perdaPercentual: Percentual;
}

/** A linha de item que `montarBiblioteca` devolve — casa com `ItemDaFicha`. */
export interface ItemDaFichaDaBiblioteca {
  insumoId: string;
  nomeSnapshot: string;
  categoria: CategoriaInsumo;
  quantidade: number;
  unidadeBase: "g" | "ml" | "un";
  custoUnidadeBaseCorrigido: number;
}

/** O documento de ficha que `montarBiblioteca` devolve — casa com `DadosFicha`. */
export interface DadosFichaDaBiblioteca {
  nome: string;
  categoria: string;
  tipo: "SIMPLES";
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  fornadasMinimas: 0;
  tempoProducaoMinutos: number;
  itens: ItemDaFichaDaBiblioteca[];
  /** Ficha simples: sempre vazio. `never[]` casa com qualquer array de destino. */
  componentes: never[];
  escolhas: never[];
  custoEscolhas: 0;
  operacional: RateioOperacional;
  precificacao: ParametrosPreco;
  precoVenda: null;
}

/**
 * Preços de setembro de 2026, redondos de propósito — média com centavos
 * parece medida. Todos editáveis; nenhum é dado até ela corrigir (`#d114`).
 */
export const INSUMOS_DA_BIBLIOTECA: readonly InsumoDaBiblioteca[] = [
  {
    id: "farinha-de-trigo",
    nome: "Farinha de trigo",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 550,
    perdaPercentual: 2,
  },
  {
    id: "acucar-refinado",
    nome: "Açúcar refinado",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 500,
    perdaPercentual: 0,
  },
  {
    id: "acucar-mascavo",
    nome: "Açúcar mascavo",
    categoria: "INGREDIENTE",
    quantidadeCompra: 500,
    unidadeCompra: "g",
    precoCompra: 800,
    perdaPercentual: 0,
  },
  {
    id: "acucar-de-confeiteiro",
    nome: "Açúcar de confeiteiro",
    categoria: "INGREDIENTE",
    quantidadeCompra: 500,
    unidadeCompra: "g",
    precoCompra: 700,
    perdaPercentual: 0,
  },
  {
    id: "manteiga-sem-sal",
    nome: "Manteiga sem sal",
    categoria: "INGREDIENTE",
    quantidadeCompra: 200,
    unidadeCompra: "g",
    precoCompra: 1200,
    perdaPercentual: 0,
  },
  {
    id: "ovos",
    nome: "Ovos",
    categoria: "INGREDIENTE",
    quantidadeCompra: 12,
    unidadeCompra: "un",
    precoCompra: 1200,
    perdaPercentual: 0,
  },
  {
    id: "chocolate-meio-amargo",
    nome: "Chocolate meio amargo em barra",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 4500,
    perdaPercentual: 1,
  },
  {
    id: "gotas-de-chocolate",
    nome: "Gotas de chocolate",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 4200,
    perdaPercentual: 0,
  },
  {
    id: "chocolate-branco",
    nome: "Chocolate branco em barra",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 4800,
    perdaPercentual: 1,
  },
  {
    id: "cacau-em-po",
    nome: "Cacau em pó",
    categoria: "INGREDIENTE",
    quantidadeCompra: 200,
    unidadeCompra: "g",
    precoCompra: 1800,
    perdaPercentual: 0,
  },
  {
    id: "fermento-em-po",
    nome: "Fermento químico em pó",
    categoria: "INGREDIENTE",
    quantidadeCompra: 100,
    unidadeCompra: "g",
    precoCompra: 500,
    perdaPercentual: 0,
  },
  {
    id: "bicarbonato-de-sodio",
    nome: "Bicarbonato de sódio",
    categoria: "INGREDIENTE",
    quantidadeCompra: 100,
    unidadeCompra: "g",
    precoCompra: 350,
    perdaPercentual: 0,
  },
  {
    id: "essencia-de-baunilha",
    nome: "Essência de baunilha",
    categoria: "INGREDIENTE",
    quantidadeCompra: 30,
    unidadeCompra: "ml",
    precoCompra: 800,
    perdaPercentual: 0,
  },
  {
    id: "sal",
    nome: "Sal",
    categoria: "INGREDIENTE",
    quantidadeCompra: 1,
    unidadeCompra: "kg",
    precoCompra: 300,
    perdaPercentual: 0,
  },
  {
    id: "leite-condensado",
    nome: "Leite condensado",
    categoria: "INGREDIENTE",
    quantidadeCompra: 395,
    unidadeCompra: "g",
    precoCompra: 750,
    perdaPercentual: 3,
  },
  {
    id: "creme-de-leite",
    nome: "Creme de leite",
    categoria: "INGREDIENTE",
    quantidadeCompra: 200,
    unidadeCompra: "g",
    precoCompra: 400,
    perdaPercentual: 3,
  },
  {
    id: "leite-em-po",
    nome: "Leite em pó",
    categoria: "INGREDIENTE",
    quantidadeCompra: 400,
    unidadeCompra: "g",
    precoCompra: 1800,
    perdaPercentual: 0,
  },
  {
    id: "creme-de-avela",
    nome: "Creme de avelã",
    categoria: "INGREDIENTE",
    quantidadeCompra: 650,
    unidadeCompra: "g",
    precoCompra: 3500,
    perdaPercentual: 3,
  },
  {
    id: "doce-de-leite",
    nome: "Doce de leite",
    categoria: "INGREDIENTE",
    quantidadeCompra: 400,
    unidadeCompra: "g",
    precoCompra: 1200,
    perdaPercentual: 3,
  },
  {
    id: "saquinho",
    nome: "Saquinho transparente",
    categoria: "EMBALAGEM",
    quantidadeCompra: 100,
    unidadeCompra: "un",
    precoCompra: 1500,
    perdaPercentual: 0,
  },
  {
    id: "caixa-para-cookies",
    nome: "Caixa para cookies",
    categoria: "EMBALAGEM",
    quantidadeCompra: 25,
    unidadeCompra: "un",
    precoCompra: 5000,
    perdaPercentual: 0,
  },
  {
    id: "lacre-adesivo",
    nome: "Lacre adesivo",
    categoria: "EMBALAGEM",
    quantidadeCompra: 100,
    unidadeCompra: "un",
    precoCompra: 1000,
    perdaPercentual: 0,
  },
  {
    id: "etiqueta-adesiva",
    nome: "Etiqueta adesiva",
    categoria: "ETIQUETA",
    quantidadeCompra: 100,
    unidadeCompra: "un",
    precoCompra: 2000,
    perdaPercentual: 0,
  },
  {
    id: "tag-de-agradecimento",
    nome: "Tag de agradecimento",
    categoria: "ETIQUETA",
    quantidadeCompra: 100,
    unidadeCompra: "un",
    precoCompra: 2500,
    perdaPercentual: 0,
  },
  {
    id: "pote-com-tampa",
    nome: "Pote com tampa",
    categoria: "ARMAZENAMENTO",
    quantidadeCompra: 10,
    unidadeCompra: "un",
    precoCompra: 3000,
    perdaPercentual: 0,
  },
];

/** Categoria "Cookies", unidade `un`, sem marca, fornecedor ou estoque. */
export const FICHAS_DA_BIBLIOTECA: readonly FichaDaBiblioteca[] = [
  {
    id: "cookie-classico",
    nome: "Cookie clássico",
    categoria: "Cookies",
    rendimento: 20,
    unidadeRendimento: "un",
    tempoProducaoMinutos: 60,
    itens: [
      { insumoId: "manteiga-sem-sal", quantidade: 200 },
      { insumoId: "acucar-mascavo", quantidade: 150 },
      { insumoId: "acucar-refinado", quantidade: 100 },
      { insumoId: "ovos", quantidade: 2 },
      { insumoId: "essencia-de-baunilha", quantidade: 5 },
      { insumoId: "farinha-de-trigo", quantidade: 320 },
      { insumoId: "fermento-em-po", quantidade: 5 },
      { insumoId: "bicarbonato-de-sodio", quantidade: 3 },
      { insumoId: "sal", quantidade: 3 },
      { insumoId: "gotas-de-chocolate", quantidade: 250 },
      { insumoId: "saquinho", quantidade: 20 },
      { insumoId: "etiqueta-adesiva", quantidade: 20 },
    ],
  },
  {
    id: "cookie-recheado",
    nome: "Cookie recheado",
    categoria: "Cookies",
    rendimento: 12,
    unidadeRendimento: "un",
    tempoProducaoMinutos: 90,
    itens: [
      { insumoId: "manteiga-sem-sal", quantidade: 200 },
      { insumoId: "acucar-mascavo", quantidade: 150 },
      { insumoId: "acucar-refinado", quantidade: 100 },
      { insumoId: "ovos", quantidade: 2 },
      { insumoId: "essencia-de-baunilha", quantidade: 5 },
      { insumoId: "farinha-de-trigo", quantidade: 350 },
      { insumoId: "cacau-em-po", quantidade: 30 },
      { insumoId: "fermento-em-po", quantidade: 5 },
      { insumoId: "bicarbonato-de-sodio", quantidade: 3 },
      { insumoId: "sal", quantidade: 3 },
      { insumoId: "chocolate-meio-amargo", quantidade: 150 },
      { insumoId: "creme-de-avela", quantidade: 180 },
      { insumoId: "saquinho", quantidade: 12 },
      { insumoId: "etiqueta-adesiva", quantidade: 12 },
    ],
  },
];

/**
 * Os documentos prontos para `corpoDeInsumoNovo` e `corpoDaFicha`, com o id de
 * cada um já carregando o prefixo (`#d114`).
 *
 * Cada item de ficha é resolvido contra o insumo da própria biblioteca —
 * `calcularCustoInsumo` para o custo corrigido — para que a ficha-modelo grave
 * exatamente o custo que o editor mostraria se ela tivesse acabado de montar a
 * mesma receita.
 */
export function montarBiblioteca(parametros: {
  operacional: RateioOperacional;
  precificacao: ParametrosPreco;
}): {
  insumos: (DadosInsumoDaBiblioteca & { id: string })[];
  fichas: (DadosFichaDaBiblioteca & { id: string })[];
} {
  const mapaInsumos = new Map(
    INSUMOS_DA_BIBLIOTECA.map((insumo) => [insumo.id, insumo]),
  );

  const insumos = INSUMOS_DA_BIBLIOTECA.map((insumo) => ({
    id: PREFIXO_BIBLIOTECA + insumo.id,
    nome: insumo.nome,
    categoria: insumo.categoria,
    precoCompra: insumo.precoCompra,
    quantidadeCompra: insumo.quantidadeCompra,
    unidadeCompra: insumo.unidadeCompra,
    perdaPercentual: insumo.perdaPercentual,
  }));

  const fichas = FICHAS_DA_BIBLIOTECA.map((ficha) => ({
    id: PREFIXO_BIBLIOTECA + ficha.id,
    nome: ficha.nome,
    categoria: ficha.categoria,
    tipo: "SIMPLES" as const,
    rendimento: ficha.rendimento,
    unidadeRendimento: ficha.unidadeRendimento,
    fornadasMinimas: 0 as const,
    tempoProducaoMinutos: ficha.tempoProducaoMinutos,
    itens: ficha.itens.map((item) => {
      const insumo = mapaInsumos.get(item.insumoId);
      if (!insumo)
        throw new Error(
          `Insumo da biblioteca não encontrado: ${item.insumoId}`,
        );
      const custo = calcularCustoInsumo(insumo);
      return {
        insumoId: PREFIXO_BIBLIOTECA + insumo.id,
        nomeSnapshot: insumo.nome,
        categoria: insumo.categoria,
        quantidade: item.quantidade,
        unidadeBase: custo.unidadeBase,
        custoUnidadeBaseCorrigido: custo.custoUnidadeBaseCorrigido,
      };
    }),
    componentes: [] as never[],
    escolhas: [] as never[],
    custoEscolhas: 0 as const,
    operacional: parametros.operacional,
    precificacao: parametros.precificacao,
    precoVenda: null,
  }));

  return { insumos, fichas };
}
