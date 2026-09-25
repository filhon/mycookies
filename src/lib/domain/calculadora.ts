import { z } from "zod";
import type { Centavos } from "@/lib/types";
import { FICHAS_DA_BIBLIOTECA, INSUMOS_DA_BIBLIOTECA } from "./biblioteca";
import {
  CONFIGURACAO_SUGERIDA,
  precificacaoSugerida,
  rateioSugerido,
} from "./configuracaoSugerida";
import {
  composicaoDoLote,
  derivarFicha,
  type DerivadosFicha,
  type Segmento,
} from "./custoFicha";
import { calcularCustoInsumo } from "./custoInsumo";
import { verificarPreco, type VerificacaoPreco } from "./precificacao";
import { formatarQuantidade, paraBase, unidadeBaseDe } from "./unidades";

/**
 * A calculadora pública (spec 040, `DECISOES.md#d185`): as duas receitas de
 * cookie da biblioteca, com o que muda de cozinha para cozinha editável, pelas
 * mesmas funções do app e com a configuração da conta nova (`#d186`). Nenhuma
 * aritmética nova além de `aMaisNoMes`: o resto é chamada ao que já existe, e
 * `tests/domain/calculadora.test.ts` prende que a página e o app batem.
 */

export type ReceitaDaPorta = "cookie-classico" | "cookie-recheado";

export const RECEITAS_DA_PORTA: { valor: ReceitaDaPorta; rotulo: string }[] = [
  { valor: "cookie-classico", rotulo: fichaDa("cookie-classico").nome },
  { valor: "cookie-recheado", rotulo: fichaDa("cookie-recheado").nome },
];

/** "Quantos você vende por mês" começa aqui: uma ordem de grandeza, que ela troca. */
export const VENDAS_MES_PADRAO = 100;

export interface EntradaDaPorta {
  receita: ReceitaDaPorta;
  rendimento: number;
  tempoProducaoMinutos: number;
  valorHoraTrabalho: Centavos;
  /** Preço do pacote por id de material da biblioteca, só os que ela trocou. */
  precos: Record<string, Centavos>;
  precoHoje: Centavos | null;
  vendasMes: number;
}

export interface MaterialDaPorta {
  /** O id da biblioteca, sem o prefixo. */
  id: string;
  nome: string;
  /** "200 g", "12 un": o pacote de que o preço fala. */
  embalagem: string;
  /** O preço que a conta usou: o dela, ou o médio quando ela deixou vazio. */
  preco: Centavos;
  /** O preço médio da biblioteca. */
  padrao: Centavos;
}

export interface ContaDaPorta {
  derivados: DerivadosFicha;
  segmentos: Segmento[];
  materiais: MaterialDaPorta[];
  /** O preço de hoje, pela `verificarPreco`. `null` sem preço de hoje ou sem rendimento. */
  hoje: VerificacaoPreco | null;
  /** O preço arredondado, pela mesma função. `null` sem rendimento. */
  sugerido: VerificacaoPreco | null;
  /** (sobra no sugerido − sobra hoje) × vendas; 0 quando hoje ≥ sugerido. */
  aMaisNoMes: Centavos;
}

/**
 * O rascunho no aparelho (spec 040-B, `#d189`): a entrada da calculadora,
 * guardada a cada mudança, para o botão da biblioteca levar para a conta nova.
 * Um só; calcular de novo sobrescreve.
 */
export const CHAVE_DO_RASCUNHO = "rende:conta-da-porta";
export const VALIDADE_DO_RASCUNHO_MS = 30 * 24 * 60 * 60 * 1000;

export interface RascunhoDaPorta extends EntradaDaPorta {
  v: 1;
  salvoEm: number;
}

const centavos = z.number().int().nonnegative();
const esquemaRascunho = z.object({
  v: z.literal(1),
  salvoEm: z.number(),
  receita: z.enum(["cookie-classico", "cookie-recheado"]),
  rendimento: z.number().int().nonnegative(),
  tempoProducaoMinutos: z.number().int().nonnegative(),
  valorHoraTrabalho: centavos,
  precos: z.record(z.string(), centavos),
  precoHoje: centavos.nullable(),
  vendasMes: z.number().int().nonnegative(),
});

/** O rascunho, ou `null` em qualquer dúvida: vazio, quebrado, de outra versão ou velho. */
export function lerRascunho(
  texto: string | null,
  agora: number,
): RascunhoDaPorta | null {
  if (!texto) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  const lido = esquemaRascunho.safeParse(bruto);
  if (!lido.success) return null;
  if (agora - lido.data.salvoEm > VALIDADE_DO_RASCUNHO_MS) return null;
  return lido.data;
}

function fichaDa(receita: ReceitaDaPorta) {
  const ficha = FICHAS_DA_BIBLIOTECA.find((f) => f.id === receita);
  if (!ficha)
    throw new Error(`Receita da biblioteca não encontrada: ${receita}`);
  return ficha;
}

const INSUMOS = new Map(INSUMOS_DA_BIBLIOTECA.map((i) => [i.id, i]));

function insumoDa(id: string) {
  const insumo = INSUMOS.get(id);
  if (!insumo) throw new Error(`Insumo da biblioteca não encontrado: ${id}`);
  return insumo;
}

/** Número que a tela pode ter deixado vazio ou torto vira zero, nunca `NaN`. */
function naoNegativo(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/** A receita como a biblioteca a traz, com a hora sugerida e sem preço de hoje. */
export function entradaPadrao(receita: ReceitaDaPorta): EntradaDaPorta {
  const ficha = fichaDa(receita);
  return {
    receita,
    rendimento: ficha.rendimento,
    tempoProducaoMinutos: ficha.tempoProducaoMinutos,
    valorHoraTrabalho: CONFIGURACAO_SUGERIDA.operacional.valorHoraTrabalho,
    precos: {},
    precoHoje: null,
    vendasMes: VENDAS_MES_PADRAO,
  };
}

/**
 * Outra receita: rendimento, tempo e preços voltam ao padrão dela; a hora, o
 * preço de hoje e as vendas são da cozinha, e ficam.
 */
export function trocarReceita(
  entrada: EntradaDaPorta,
  receita: ReceitaDaPorta,
): EntradaDaPorta {
  return {
    ...entradaPadrao(receita),
    valorHoraTrabalho: entrada.valorHoraTrabalho,
    precoHoje: entrada.precoHoje,
    vendasMes: entrada.vendasMes,
  };
}

/**
 * A conta do cookie dela. Os itens são montados como `montarBiblioteca` os
 * monta, com o preço dela onde houver, e passam por `derivarFicha` com a
 * configuração sugerida e a hora dela.
 */
export function contaDaPorta(entrada: EntradaDaPorta): ContaDaPorta {
  const ficha = fichaDa(entrada.receita);

  const materiais: MaterialDaPorta[] = [];
  const vistos = new Set<string>();
  const itens = ficha.itens.map((item) => {
    const insumo = insumoDa(item.insumoId);
    const dela = entrada.precos[insumo.id];
    // Preço de pacote vazio vale o médio (spec 040, 3.2).
    const preco = dela && dela > 0 ? dela : insumo.precoCompra;
    if (!vistos.has(insumo.id)) {
      vistos.add(insumo.id);
      materiais.push({
        id: insumo.id,
        nome: insumo.nome,
        embalagem: formatarQuantidade(
          paraBase(insumo.quantidadeCompra, insumo.unidadeCompra),
          unidadeBaseDe(insumo.unidadeCompra),
        ),
        preco,
        padrao: insumo.precoCompra,
      });
    }
    return {
      categoria: insumo.categoria,
      quantidade: item.quantidade,
      custoUnidadeBaseCorrigido: calcularCustoInsumo({
        ...insumo,
        precoCompra: preco,
      }).custoUnidadeBaseCorrigido,
    };
  });

  const rendimento = naoNegativo(entrada.rendimento);
  const derivados = derivarFicha({
    itens,
    componentes: [],
    tempoProducaoMinutos: naoNegativo(entrada.tempoProducaoMinutos),
    rendimento,
    operacional: {
      ...rateioSugerido(),
      valorHoraTrabalho: naoNegativo(entrada.valorHoraTrabalho),
    },
    precificacao: precificacaoSugerida(),
    precoVenda: null,
  });

  const { custoUnitario } = derivados.custo;
  const sugerido =
    rendimento > 0 && derivados.precoArredondado !== null
      ? verificarPreco(
          derivados.precoArredondado,
          custoUnitario,
          derivados.taxas,
        )
      : null;
  const precoHoje = naoNegativo(entrada.precoHoje ?? 0);
  const hoje =
    rendimento > 0 && precoHoje > 0
      ? verificarPreco(precoHoje, custoUnitario, derivados.taxas)
      : null;

  const aMaisNoMes =
    hoje && sugerido
      ? Math.max(0, sugerido.lucroUnitario - hoje.lucroUnitario) *
        Math.round(naoNegativo(entrada.vendasMes))
      : 0;

  return {
    derivados,
    segmentos: composicaoDoLote(derivados.custo),
    materiais,
    hoje,
    sugerido,
    aMaisNoMes,
  };
}
