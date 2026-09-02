import { setDoc, Timestamp } from "firebase/firestore";
import { docMeta, docResumoMensal } from "../colecoes";
import {
  espelhoDaMeta,
  medirMeta,
  pedidosNecessariosDe,
  planejarMeta,
  type EspelhoMeta,
} from "@/lib/domain/metas";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { Centavos, CompetenciaMensal, Meta } from "@/lib/types";

/** O que o formulário entrega. O resto da meta é derivado na escrita. */
export interface DadosMeta {
  faturamentoAlvo: Centavos;
  /** Preço médio de um doce, sugerido pelas fichas e editável. */
  precoMedioUnitario: Centavos;
}

/**
 * O que o espelho da meta precisa saber para ser reescrito junto do agregado.
 *
 * Vem da tela, que já assina os dois documentos. A alternativa seria a mutação
 * ler a meta e o agregado antes de gravar um lançamento — e leitura exige rede,
 * enquanto lançar precisa funcionar na feira, sem sinal.
 */
export interface ContextoMeta {
  competencia: CompetenciaMensal;
  /** `null` em mês sem meta definida: aí não há espelho a mover. */
  meta: Meta | null;
  /** `entradas` do agregado antes deste delta. */
  entradas: Centavos;
}

/** Os parâmetros da conta, tirados do documento da meta. */
function parametros(competencia: CompetenciaMensal, meta: Meta) {
  return {
    competencia,
    faturamentoAlvo: meta.faturamentoAlvo,
    precoMedioUnitario: meta.ticketMedioReferencia,
  };
}

/**
 * O espelho como fica depois de um delta de entradas.
 *
 * `realizado` é a mesma coisa que `entradas`, e é a segunda fonte de verdade
 * deste módulo: ela se move nos mesmos quatro pontos em que `entradas` se move
 * — criar, editar, arquivar e recalcular.
 *
 * Devolve `null` quando não há meta, e também quando o contexto é de outro mês:
 * editar um lançamento de setembro para outubro escreve nos dois agregados, e a
 * tela só conhece o mês que está mostrando. O agregado do outro mês recebe o
 * dinheiro e fica com o espelho de antes até a próxima escrita naquele mês ou
 * até "Recalcular o mês" — que é a mesma rede de segurança de `#d23`.
 */
export function espelhoAposDelta(
  competencia: CompetenciaMensal,
  deltaEntradas: Centavos,
  contexto: ContextoMeta | null,
): EspelhoMeta | null {
  if (!contexto || contexto.competencia !== competencia || !contexto.meta) {
    return null;
  }

  return espelhoDaMeta(
    medirMeta(
      parametros(competencia, contexto.meta),
      contexto.entradas + deltaEntradas,
    ),
  );
}

/**
 * Grava a meta do mês e o espelho dela no agregado.
 *
 * A meta tem a competência como id, então salvar duas vezes o mesmo mês corrige
 * a meta em vez de criar uma segunda. `merge` preserva o que esta tela não
 * conhece — `lucroAlvo` hoje, o que os módulos seguintes acrescentarem depois.
 *
 * `pedidosNecessarios` é dividido pelo ticket médio **real** do mês, e não pelo
 * preço médio de um doce: são duas perguntas diferentes, e a segunda faria o
 * campo dizer "cada pedido tem um doce" (`DECISOES.md#d36`). Fica em zero
 * enquanto não houver pedido pago, e zero não aparece em tela.
 */
export async function salvarMeta(
  contaId: string,
  competencia: CompetenciaMensal,
  dados: DadosMeta,
  /** `entradas` do mês, que é o realizado da meta. */
  realizado: Centavos,
  /** O valor médio de um pedido pago no mês, ou zero se não houver nenhum. */
  ticketMedio: Centavos,
  /** A meta que já existia, se existia: preserva a data de criação. */
  existente: Meta | null,
): Promise<void> {
  const momento = Timestamp.now();
  const plano = planejarMeta({ competencia, ...dados });

  await setDoc(
    docMeta(contaId, competencia),
    {
      v: VERSAO_SCHEMA,
      competencia,
      faturamentoAlvo: dados.faturamentoAlvo,
      ticketMedioReferencia: dados.precoMedioUnitario,

      pedidosNecessarios: pedidosNecessariosDe(
        dados.faturamentoAlvo,
        ticketMedio,
      ),
      unidadesNecessarias: plano.unidadesNecessarias,
      semanasNoMes: plano.semanasNoMes,
      unidadesPorSemana: plano.unidadesPorSemana,

      ativo: true,
      criadoEm: existente?.criadoEm ?? momento,
      atualizadoEm: momento,
      arquivado: false,
    },
    { merge: true },
  );

  // O espelho nasce junto: sem ele, o cartão da tela Hoje só veria a meta no
  // dia em que a Maynara lançasse a próxima venda.
  await setDoc(
    docResumoMensal(contaId, competencia),
    {
      v: VERSAO_SCHEMA,
      competencia,
      meta: espelhoDaMeta(medirMeta({ competencia, ...dados }, realizado)),
      atualizadoEm: momento,
    },
    { merge: true },
  );
}
