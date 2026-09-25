import type {
  Centavos,
  DataISO,
  PlanoDaConta,
  ResumoDia,
  StatusDaConta,
} from "@/lib/types";
import { diaDeISO, diasEntre, diaVizinho, hojeEmBrasilia } from "./datas";

/**
 * O dia de cada aviso por e-mail (spec 044-B, `DECISOES.md#d205` a `#d207`).
 *
 * Nenhum campo "avisado em": cada condição é verdadeira em um dia só, e o cron
 * roda uma vez por dia. O "hoje" é o de São Paulo, `hojeEmBrasilia`: o servidor
 * roda em UTC.
 */

export type Aviso = "teste-acabando" | "meta-batida" | "mes-fechado";

/** Um aviso só, três dias antes: o segundo vira cobrança (spec 044, §6). */
export const DIAS_ANTES_DO_FIM_DO_TESTE = 3;

/** Dias de calendário de São Paulo entre hoje e o dia em que o teste acaba. */
export function diasAteOFimDoTeste(trialAte: Date, hoje: DataISO): number {
  return diasEntre(hoje, hojeEmBrasilia(trialAte));
}

/**
 * O dia do mês em que a soma corrida das entradas alcançou o alvo, ou `null`.
 * Alvo zero não é meta: sem ele, o dia 1 sem venda nenhuma "bateria".
 */
export function diaEmQueBateu(
  porDia: Record<string, Pick<ResumoDia, "entradas">>,
  alvo: Centavos,
): number | null {
  if (!(alvo > 0)) return null;
  let soma = 0;
  const dias = Object.keys(porDia).sort((a, b) => Number(a) - Number(b));
  for (const dia of dias) {
    soma += porDia[dia]!.entradas;
    if (soma >= alvo) return Number(dia);
  }
  return null;
}

/** O que o dia precisa de um agregado mensal. `ResumoMensal` serve. */
export interface ResumoParaAvisar {
  entradas: Centavos;
  qtdPedidos: number;
  porDia: Record<string, Pick<ResumoDia, "entradas">>;
  meta?: { faturamentoAlvo: Centavos };
}

export interface EntradaAvisos {
  conta: {
    plano?: PlanoDaConta;
    status?: StatusDaConta;
    trialAte?: Date;
    avisosPorEmail?: boolean;
  };
  hoje: DataISO;
  /** O agregado do mês de ontem: a meta batida no dia 30 sai no dia 1. */
  resumoDeOntem?: ResumoParaAvisar;
  /** O agregado do mês que fechou. Só é lido no dia 2. */
  resumoDoMesAnterior?: ResumoParaAvisar;
}

export function avisosDoDia({
  conta,
  hoje,
  resumoDeOntem,
  resumoDoMesAnterior,
}: EntradaAvisos): Aviso[] {
  if (conta.status === "ENCERRADA") return [];
  const avisos: Aviso[] = [];

  // Liberada à mão não tem `plano` nem `trialAte`, e não vence (`#d206`).
  if (
    conta.plano === "TRIAL" &&
    conta.trialAte &&
    diasAteOFimDoTeste(conta.trialAte, hoje) === DIAS_ANTES_DO_FIM_DO_TESTE
  ) {
    avisos.push("teste-acabando");
  }

  // Meta e mês são notícia, e se desligam (`#d207`).
  if (conta.avisosPorEmail === false) return avisos;

  const ontem = diaVizinho(hoje, -1);
  if (
    resumoDeOntem?.meta &&
    diaEmQueBateu(resumoDeOntem.porDia, resumoDeOntem.meta.faturamentoAlvo) ===
      Number(diaDeISO(ontem))
  ) {
    avisos.push("meta-batida");
  }

  if (
    diaDeISO(hoje) === "02" &&
    resumoDoMesAnterior &&
    (resumoDoMesAnterior.entradas > 0 || resumoDoMesAnterior.qtdPedidos > 0)
  ) {
    avisos.push("mes-fechado");
  }

  return avisos;
}
