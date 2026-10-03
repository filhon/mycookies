import type { Centavos, CompetenciaMensal, Transacao } from "@/lib/types";

/**
 * O limite de faturamento anual do MEI (`DECISOES.md#d270`).
 *
 * Conferido em 2026-10-02: R$ 81.000,00, LC 123/2006, art. 18-A, §1º; o
 * proporcional do ano de abertura é R$ 6.750,00 por mês (§2º). O PLP 186/2026,
 * que o sobe para R$ 110.000,00 em 2027, ainda não foi votado. Fonte:
 * https://www.gov.br/empresas-e-negocios/pt-br/empreendedor
 */
export const LIMITE_MEI_ANUAL: Centavos = 8_100_000;
export const LIMITE_MEI_POR_MES: Centavos = LIMITE_MEI_ANUAL / 12;

/** Indústria é produção própria; comércio é revenda (`#d269`). */
export type AtividadeMei = "INDUSTRIA" | "COMERCIO";

export interface EscolhasMei {
  atividade: AtividadeMei;
  /** Quanto das vendas do mês saiu com nota. Cortado no total. */
  comNota: Centavos;
}

/** As dez linhas do Relatório Mensal das Receitas Brutas, na ordem do portal. */
export interface RelatorioMei {
  I: Centavos;
  II: Centavos;
  III: Centavos;
  IV: Centavos;
  V: Centavos;
  VI: Centavos;
  VII: Centavos;
  VIII: Centavos;
  IX: Centavos;
  X: Centavos;
  /** Entradas fora de `VENDA`: não são receita, e a tela diz quanto ficou fora. */
  outrasEntradas: Centavos;
}

type Lancamento = Pick<Transacao, "tipo" | "categoria" | "valor">;

/**
 * O relatório do mês a partir dos lançamentos dele (`#d269`).
 *
 * Receita bruta é a soma das entradas `VENDA` pelo valor bruto, antes da
 * maquininha. Arquivado não chega: a consulta do mês já o deixa fora.
 * Prestação de serviço (VII a IX) fica sempre zerada: confeitaria vende produto.
 */
export function relatorioMei(
  lancamentos: Lancamento[],
  escolhas: EscolhasMei,
): RelatorioMei {
  let vendas = 0;
  let outrasEntradas = 0;
  for (const l of lancamentos) {
    if (l.tipo !== "ENTRADA") continue;
    if (l.categoria === "VENDA") vendas += l.valor;
    else outrasEntradas += l.valor;
  }
  const comNota = Math.min(Math.max(0, escolhas.comNota), vendas);
  const semNota = vendas - comNota;
  const comercio = escolhas.atividade === "COMERCIO";

  return {
    I: comercio ? semNota : 0,
    II: comercio ? comNota : 0,
    III: comercio ? vendas : 0,
    IV: comercio ? 0 : semNota,
    V: comercio ? 0 : comNota,
    VI: comercio ? 0 : vendas,
    VII: 0,
    VIII: 0,
    IX: 0,
    X: vendas,
    outrasEntradas,
  };
}

export type EstadoDoLimite = "dentro" | "perto" | "passou";

export interface LimiteDoAno {
  /** Entradas de janeiro até o mês, de todas as categorias: erra pra cima. */
  entradas: Centavos;
  /** 0 a 100 e além; só para mostrar. */
  percentual: number;
  /** A média dos meses com agregado vezes doze; `null` sem nenhum. */
  ritmo: Centavos | null;
  estado: EstadoDoLimite;
}

/**
 * Quanto do limite do ano já foi usado (`#d270`), pelos agregados de janeiro
 * até `ate`. Por id, como `noAno`: o `global` fica fora porque 'g' > '2'.
 */
export function limiteDoAno(
  agregados: { id: string; entradas?: Centavos }[],
  ate: CompetenciaMensal,
): LimiteDoAno {
  const doAno = agregados.filter(
    (a) => a.id >= `${ate.slice(0, 4)}-01` && a.id <= ate,
  );
  const entradas = doAno.reduce((soma, a) => soma + (a.entradas ?? 0), 0);
  return {
    entradas,
    percentual: (entradas / LIMITE_MEI_ANUAL) * 100,
    ritmo: doAno.length > 0 ? Math.round((entradas / doAno.length) * 12) : null,
    // Em centavos, e não pelo percentual: 80% de 81 mil é conta exata.
    estado:
      entradas > LIMITE_MEI_ANUAL
        ? "passou"
        : entradas * 10 >= LIMITE_MEI_ANUAL * 8
          ? "perto"
          : "dentro",
  };
}
