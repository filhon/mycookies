import type {
  Centavos,
  CompetenciaMensal,
  Percentual,
  ResumoMensal,
} from "@/lib/types";
import { competenciaDe, diasNoMes } from "./datas";

/**
 * A meta do mês virada número que se persegue na segunda-feira.
 *
 * O módulo inteiro existe para transformar "quero faturar R$ 3.000,00" em
 * "preciso vender 102 doces por semana", que é a única forma da meta caber em
 * uma decisão de produção. Puro, sem Firebase e sem React, como todo
 * `src/lib/domain/`.
 *
 * Enquanto o Módulo 3 não existe não há histórico de venda, então o preço médio
 * de um doce vem do cardápio — a média das fichas ativas — e é editável. Ele
 * mora em `Meta.ticketMedioReferencia`, que é o campo que existe para isso.
 */

/** O que impede a conta de existir. Cada um vira uma frase na tela. */
export type MotivoSemMeta = "ALVO_ZERO" | "SEM_PRECO_MEDIO";

export interface ParametrosMeta {
  competencia: CompetenciaMensal;
  faturamentoAlvo: Centavos;
  /**
   * Quanto sai um doce, em média. Sem pedido cadastrado, é preço de cardápio e
   * não ticket médio de verdade — a diferença importa e está em `#d28`.
   */
  precoMedioUnitario: Centavos;
}

/** O espelho gravado em `ResumoMensal.meta`, e lido pela tela Hoje. */
export type EspelhoMeta = NonNullable<ResumoMensal["meta"]>;

export interface PlanoMeta {
  diasNoMes: number;
  /**
   * Fracionário de propósito. Arredondar 30 dias para 5 semanas espalharia a
   * meta por uma semana que não existe e a faria parecer mais fácil do que é.
   * O número que a usuária vê é o de doces por semana, já arredondado para
   * cima; as semanas nunca aparecem cruas.
   */
  semanasNoMes: number;
  unidadesNecessarias: number;
  unidadesPorSemana: number;
  motivo: MotivoSemMeta | null;
}

/**
 * Onde o mês está em relação a hoje.
 *
 * Existe porque o painel tem seletor de mês: a meta de agosto é olhada em
 * setembro, e a de outubro pode ser definida antes de outubro começar. Mês
 * fechado não tem dia restante, e mês que não começou não tem dia corrido —
 * sem isso, `diasRestantes` viraria zero em uma divisão ou negativo em uma
 * comparação.
 */
export interface PosicaoNoMes {
  diaAtual: number;
  diasNoMes: number;
  /** Inclui o dia de hoje: quem olha a meta no dia 30 ainda tem o dia 30. */
  diasRestantes: number;
}

export function posicaoNoMes(
  competencia: CompetenciaMensal,
  agora: Date = new Date(),
): PosicaoNoMes {
  const dias = diasNoMes(competencia);
  const mesDeHoje = competenciaDe(agora);

  // 'YYYY-MM' compara como texto na mesma ordem em que compara como calendário.
  if (mesDeHoje < competencia) {
    return { diaAtual: 0, diasNoMes: dias, diasRestantes: dias };
  }
  if (mesDeHoje > competencia) {
    return { diaAtual: dias, diasNoMes: dias, diasRestantes: 0 };
  }

  const diaAtual = agora.getDate();
  return { diaAtual, diasNoMes: dias, diasRestantes: dias - diaAtual + 1 };
}

function motivoSemMeta(parametros: ParametrosMeta): MotivoSemMeta | null {
  if (parametros.faturamentoAlvo <= 0) return "ALVO_ZERO";
  if (parametros.precoMedioUnitario <= 0) return "SEM_PRECO_MEDIO";
  return null;
}

/**
 * A meta traduzida em doces, antes de qualquer venda acontecer.
 *
 * As guardas seguem o mesmo espírito do rendimento zero da spec 002: alvo zero,
 * preço médio zero e conta sem ficha nenhuma devolvem zero e um motivo, nunca
 * `Infinity` nem `NaN`. Uma conta sem ficha cadastrada não tem preço médio, e a
 * interface diz isso e aponta para `/fichas`.
 */
export function planejarMeta(parametros: ParametrosMeta): PlanoMeta {
  const dias = diasNoMes(parametros.competencia);
  const semanas = dias / 7;
  const motivo = motivoSemMeta(parametros);

  if (motivo) {
    return {
      diasNoMes: dias,
      semanasNoMes: semanas,
      unidadesNecessarias: 0,
      unidadesPorSemana: 0,
      motivo,
    };
  }

  // Para cima nos dois arredondamentos: vender 434,8 doces não existe, e o
  // número que falta arredondado para baixo é o número que não bate a meta.
  const unidadesNecessarias = Math.ceil(
    parametros.faturamentoAlvo / parametros.precoMedioUnitario,
  );

  return {
    diasNoMes: dias,
    semanasNoMes: semanas,
    unidadesNecessarias,
    unidadesPorSemana: Math.ceil(unidadesNecessarias / semanas),
    motivo: null,
  };
}

export interface MedidaMeta extends EspelhoMeta {
  diaAtual: number;
  diasNoMes: number;
  diasRestantes: number;
  /** O que falta em dinheiro. Zero quando a meta já foi batida. */
  faltaEmDinheiro: Centavos;
  batida: boolean;
  motivo: MotivoSemMeta | null;
}

/**
 * Onde a meta está agora: o que já entrou, o que falta e se o ritmo dá conta.
 *
 * `realizado` é `entradas` do agregado da competência, e não uma segunda
 * contagem: é a mesma verdade guardada duas vezes para que o cartão da tela
 * Hoje saia de uma leitura só (`DECISOES.md#d09`).
 */
export function medirMeta(
  parametros: ParametrosMeta,
  realizado: Centavos,
  agora: Date = new Date(),
): MedidaMeta {
  const { faturamentoAlvo, precoMedioUnitario } = parametros;
  const {
    diaAtual,
    diasNoMes: dias,
    diasRestantes,
  } = posicaoNoMes(parametros.competencia, agora);

  const faltaEmDinheiro = Math.max(0, faturamentoAlvo - realizado);
  const semanasRestantes = diasRestantes / 7;

  const unidadesRestantes =
    precoMedioUnitario > 0
      ? Math.ceil(faltaEmDinheiro / precoMedioUnitario)
      : 0;

  return {
    faturamentoAlvo,
    realizado,
    // Sem alvo não há percentual de alvo: zero, e nunca uma divisão por zero
    // virando `Infinity` no painel.
    progresso:
      faturamentoAlvo > 0 ? duasCasas((realizado / faturamentoAlvo) * 100) : 0,
    unidadesRestantes,
    // Mês fechado não tem semana pela frente. Zero aqui é ausência de prazo, e
    // a tela diz isso com a frase do mês que já acabou.
    unidadesPorSemanaRestante:
      semanasRestantes > 0
        ? Math.ceil(unidadesRestantes / semanasRestantes)
        : 0,
    // O ritmo é o alvo rateado pelos dias já corridos. No dia 12 de 30, estar
    // no ritmo é ter 12/30 do alvo — e não 12/30 de nada, quando não há alvo.
    noRitmo: realizado >= faturamentoAlvo * (diaAtual / dias),

    diaAtual,
    diasNoMes: dias,
    diasRestantes,
    faltaEmDinheiro,
    batida: faturamentoAlvo > 0 && realizado >= faturamentoAlvo,
    motivo: motivoSemMeta(parametros),
  };
}

/** Só o que o agregado guarda. O resto da medida é da tela que a pediu. */
export function espelhoDaMeta(medida: MedidaMeta): EspelhoMeta {
  return {
    faturamentoAlvo: medida.faturamentoAlvo,
    realizado: medida.realizado,
    progresso: medida.progresso,
    unidadesRestantes: medida.unidadesRestantes,
    unidadesPorSemanaRestante: medida.unidadesPorSemanaRestante,
    noRitmo: medida.noRitmo,
  };
}

export interface RitmoDoEspelho {
  diaAtual: number;
  diasNoMes: number;
  diasRestantes: number;
  unidadesPorSemanaRestante: number;
  noRitmo: boolean;
  batida: boolean;
}

/**
 * Refaz, na leitura, o que no espelho depende do dia de hoje.
 *
 * O espelho é gravado quando o dinheiro se move, e duas das suas linhas
 * dependem também do calendário: no dia 5 faltavam 97 doces por semana; no dia
 * 20, com a mesma venda, faltam muito mais. Mostrar o número congelado do dia 5
 * subestimaria o esforço, e número financeiro subestimado é o pior defeito que
 * este painel pode ter.
 *
 * Não custa leitura nenhuma: `unidadesRestantes` e `realizado` vêm do dinheiro,
 * que o espelho já traz certo, e o resto é calendário.
 */
export function ritmoDoEspelho(
  espelho: EspelhoMeta,
  competencia: CompetenciaMensal,
  agora: Date = new Date(),
): RitmoDoEspelho {
  const {
    diaAtual,
    diasNoMes: dias,
    diasRestantes,
  } = posicaoNoMes(competencia, agora);
  const semanasRestantes = diasRestantes / 7;

  return {
    diaAtual,
    diasNoMes: dias,
    diasRestantes,
    unidadesPorSemanaRestante:
      semanasRestantes > 0
        ? Math.ceil(espelho.unidadesRestantes / semanasRestantes)
        : 0,
    noRitmo: espelho.realizado >= espelho.faturamentoAlvo * (diaAtual / dias),
    batida:
      espelho.faturamentoAlvo > 0 &&
      espelho.realizado >= espelho.faturamentoAlvo,
  };
}

/** Em que prazo o número que falta faz sentido. */
export type PrazoDoEsforco = "SEMANA" | "FIM_DO_MES";

export interface EsforcoRestante {
  unidades: number;
  prazo: PrazoDoEsforco;
}

/**
 * O número que a Maynara persegue, no prazo em que ele ainda quer dizer algo.
 *
 * "Por semana" é a unidade da meta, mas no dia 29 não existe semana: repartir
 * 261 doces por dois sétimos de semana devolve 914 doces por semana, que é uma
 * conta correta e uma informação inútil. Faltando menos de sete dias, o número
 * honesto é o total que falta até o fim do mês.
 */
export function esforcoRestante(
  unidadesRestantes: number,
  unidadesPorSemanaRestante: number,
  diasRestantes: number,
): EsforcoRestante {
  return diasRestantes >= 7
    ? { unidades: unidadesPorSemanaRestante, prazo: "SEMANA" }
    : { unidades: unidadesRestantes, prazo: "FIM_DO_MES" };
}

/**
 * Quantos pedidos fecham a meta, pelo valor médio de um pedido do mês.
 *
 * O divisor é `ResumoMensal.ticketMedio` — o ticket médio **real**, que existe
 * desde que o pedido pago virou dado — e não `Meta.ticketMedioReferencia`, que
 * continua guardando o preço médio de um *doce*. São duas perguntas diferentes,
 * e dividir o alvo pelo preço de um doce faria o campo afirmar "cada pedido tem
 * um doce", que é justamente o que `DECISOES.md#d28` recusou.
 *
 * Zero enquanto não houver pedido pago no mês, e zero é ausência: a linha não
 * aparece, em vez de aparecer dizendo que zero pedidos bastam.
 */
export function pedidosNecessariosDe(
  faturamentoAlvo: Centavos,
  ticketMedio: Centavos,
): number {
  if (faturamentoAlvo <= 0 || ticketMedio <= 0) return 0;
  // Para cima: 12,5 pedidos não existe, e 12 não fecham a meta.
  return Math.ceil(faturamentoAlvo / ticketMedio);
}

/** O que o preço médio precisa saber de uma ficha. Nada além disso. */
export interface FichaComPreco {
  ativo: boolean;
  precificacao: { precoVenda: Centavos };
}

/**
 * O preço médio de um doce, sugerido a partir do cardápio.
 *
 * Não há histórico de venda para tirar ticket médio de verdade: o Módulo 3 é
 * que traz isso. A única fonte que existe hoje é o preço das fichas ativas, e
 * por isso o campo é sugerido e editável, nunca vazio e obrigatório
 * (`PRODUCT.md`, princípio 1).
 *
 * Ficha sem preço fica de fora da média: preço zero é ficha que ela ainda não
 * precificou, e contá-lo como R$ 0,00 puxaria a média para baixo e inflaria a
 * quantidade de doces da meta.
 */
export function precoMedioDasFichas(fichas: FichaComPreco[]): Centavos {
  const precos = fichas
    .filter((ficha) => ficha.ativo && ficha.precificacao.precoVenda > 0)
    .map((ficha) => ficha.precificacao.precoVenda);

  if (precos.length === 0) return 0;

  const soma = precos.reduce((total, preco) => total + preco, 0);
  return Math.round(soma / precos.length);
}

/** Percentual é número de exibição: duas casas bastam e não sujam o documento. */
function duasCasas(valor: number): Percentual {
  return Math.round(valor * 100) / 100;
}
