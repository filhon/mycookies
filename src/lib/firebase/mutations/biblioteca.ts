import { increment, Timestamp, writeBatch } from "firebase/firestore";
import { obterDb } from "../client";
import { docFicha, docInsumo, docResumoGlobal } from "../colecoes";
import { despachar } from "./despachar";
import { precificacaoPadraoDaConta, rateioDaConta } from "./configuracao";
import { corpoDaFicha } from "./fichas";
import { corpoDeInsumoNovo } from "./insumos";
import { montarBiblioteca, PREFIXO_BIBLIOTECA } from "@/lib/domain/biblioteca";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { ConfiguracaoGeral, FichaTecnica, Insumo } from "@/lib/types";

/**
 * Grava a biblioteca de uma vez e devolve o id da ficha em que ela cai.
 *
 * Um `writeBatch` despachado (`DECISOES.md#d104`), não esperado: ela toca no
 * botão e a rota abre do cache, com ou sem rede. `instalarBiblioteca` reusa
 * `corpoDeInsumoNovo` e `corpoDaFicha` — o mesmo que o cadastro manual grava —
 * para que a ficha-modelo não seja uma segunda forma de documento.
 */
export function instalarBiblioteca(
  contaId: string,
  configuracao: ConfiguracaoGeral | null,
): string {
  const momento = Timestamp.now();
  const { insumos, fichas } = montarBiblioteca({
    operacional: rateioDaConta(configuracao),
    precificacao: precificacaoPadraoDaConta(configuracao),
  });

  const lote = writeBatch(obterDb());

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

  return PREFIXO_BIBLIOTECA + "cookie-classico";
}
