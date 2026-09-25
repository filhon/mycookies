import { increment, Timestamp, writeBatch } from "firebase/firestore";
import { obterDb } from "../client";
import {
  docConfiguracao,
  docFicha,
  docInsumo,
  docResumoGlobal,
} from "../colecoes";
import { despachar } from "./despachar";
import {
  CONFIGURACAO_SUGERIDA,
  corpoDaConfiguracao,
  precificacaoPadraoDaConta,
  rateioDaConta,
} from "./configuracao";
import { corpoDaFicha } from "./fichas";
import { corpoDeInsumoNovo } from "./insumos";
import { montarBiblioteca, PREFIXO_BIBLIOTECA } from "@/lib/domain/biblioteca";
import type { EntradaDaPorta } from "@/lib/domain/calculadora";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { ConfiguracaoGeral, FichaTecnica, Insumo } from "@/lib/types";

/**
 * Grava a biblioteca de uma vez e devolve o id da ficha em que ela cai.
 *
 * Um `writeBatch` despachado (`DECISOES.md#d104`), não esperado: ela toca no
 * botão e a rota abre do cache, com ou sem rede. `instalarBiblioteca` reusa
 * `corpoDeInsumoNovo` e `corpoDaFicha` — o mesmo que o cadastro manual grava —
 * para que a ficha-modelo não seja uma segunda forma de documento.
 *
 * Com `conta` (a calculadora da porta, spec 040-B): a biblioteca sai com a
 * conta dela por cima (`#d189`, `#d190`), e ela cai na ficha que calculou. Se
 * a hora dela não é a sugerida, a configuração é gravada no mesmo lote, com a
 * hora dela, para o próximo "Salvar" da ficha não voltar para a sugerida
 * (`#d191`).
 */
export function instalarBiblioteca(
  contaId: string,
  configuracao: ConfiguracaoGeral | null,
  conta?: EntradaDaPorta,
): string {
  const momento = Timestamp.now();
  const lote = writeBatch(obterDb());

  let operacional = rateioDaConta(configuracao);
  if (
    conta &&
    conta.valorHoraTrabalho !==
      CONFIGURACAO_SUGERIDA.operacional.valorHoraTrabalho
  ) {
    const base = configuracao ?? CONFIGURACAO_SUGERIDA;
    const corpo = corpoDaConfiguracao({
      ...base,
      operacional: {
        ...base.operacional,
        valorHoraTrabalho: conta.valorHoraTrabalho,
      },
    });
    lote.set(docConfiguracao(contaId), corpo, { merge: true });
    operacional = corpo.operacional;
  }

  const { insumos, fichas } = montarBiblioteca(
    {
      operacional,
      precificacao: precificacaoPadraoDaConta(configuracao),
    },
    conta,
  );

  for (const insumo of insumos) {
    lote.set(
      docInsumo(contaId, insumo.id),
      corpoDeInsumoNovo(insumo, momento) as Insumo,
    );
  }

  for (const ficha of fichas) {
    lote.set(docFicha(contaId, ficha.id), {
      ...corpoDaFicha(ficha),
      ativo: true,
      criadoEm: momento,
      atualizadoEm: momento,
      arquivado: false,
    } as FichaTecnica);
  }

  lote.set(
    docResumoGlobal(contaId),
    {
      v: VERSAO_SCHEMA,
      totalInsumos: increment(insumos.length),
      totalFichas: increment(fichas.length),
      atualizadoEm: momento,
    },
    { merge: true },
  );

  despachar(lote.commit());

  return PREFIXO_BIBLIOTECA + (conta?.receita ?? "cookie-classico");
}
