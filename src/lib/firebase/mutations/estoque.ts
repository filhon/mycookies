import { Timestamp, writeBatch } from "firebase/firestore";
import { obterDb } from "../client";
import { docInsumo } from "../colecoes";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { DataISO, Insumo } from "@/lib/types";

/**
 * A contagem da despensa: dois campos por insumo, e uma escrita só.
 *
 * **Uma contagem é um lote, e não N salvamentos**, pelo mesmo motivo de
 * `importarNota`: vinte `updateDoc` em sequência seriam vinte idas ao servidor e
 * uma falha parcial possível no meio — metade da despensa datada, e ela sem
 * saber qual metade.
 *
 * Duas coisas que esta mutação **não** faz, e as duas importam:
 *
 * - **Não passa por `corpoDeAtualizacao`.** Aquele corpo reescreve o documento
 *   inteiro a partir de um `DadosInsumo`, e uma contagem toca dois campos. O que
 *   ela não contou não pode ser sobrescrito por um caminho que não estava
 *   falando daquilo.
 * - **Não marca ficha nenhuma.** Quem envelhece ficha é preço, embalagem e perda
 *   (`precoMudou`). Contar a despensa não muda o custo de um cookie, e não
 *   empurra entrada em `historicoPrecos`.
 */

export interface ContagemGravavel {
  insumo: Insumo;
  /** O que ela digitou, em unidade base. Nunca `null`: a tela já filtrou. */
  quantidade: number;
}

/** Um `writeBatch` aceita 500 operações. Uma despensa tem dezenas de itens. */
const POR_LOTE = 400;

/**
 * Grava **só as linhas tocadas**, com a data de hoje em cada uma.
 *
 * Zero é contagem: `0` grava `estoqueAtual: 0` **e** a data, que é o único jeito
 * de a lista saber que não há chocolate em vez de não saber nada. E encontrar o
 * mesmo número da semana passada também é contagem — a data vira hoje mesmo
 * quando o número não mudou, porque a data **não** sai de um diff.
 *
 * Devolve quantos documentos foram escritos.
 */
export async function salvarContagem(
  contaId: string,
  contagens: ContagemGravavel[],
  hojeISO: DataISO,
): Promise<number> {
  if (contagens.length === 0) return 0;

  for (let i = 0; i < contagens.length; i += POR_LOTE) {
    const momento = Timestamp.now();
    const lote = writeBatch(obterDb());

    for (const contagem of contagens.slice(i, i + POR_LOTE)) {
      lote.update(docInsumo(contaId, contagem.insumo.id), {
        v: VERSAO_SCHEMA,
        estoqueAtual: contagem.quantidade,
        estoqueContadoEmISO: hojeISO,
        atualizadoEm: momento,
      });
    }

    await lote.commit();
  }

  return contagens.length;
}
