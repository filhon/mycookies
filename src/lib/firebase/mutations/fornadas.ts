import {
  doc,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { colFornadas, docFornada } from "../colecoes";
import { despachar } from "./despachar";
import { diaVizinho } from "@/lib/domain/datas";
import { IDADE_VENCE_DIAS } from "@/lib/domain/estoque";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { ConsumoDaFornada, DataISO, Fornada } from "@/lib/types";

/**
 * A fornada no banco: um documento por fornada, e nada mais.
 *
 * **Uma escrita por fornada, e não uma por insumo.** Um campo
 * `consumoDesdeContagem` no insumo custaria dez `increment()` numa fornada de
 * dez ingredientes, e o `#d80` já ensinou o que acontece com escrita em fila
 * sem rede. A fornada não escreve `Insumo.estoqueAtual`; quem desconta é a
 * leitura (`DECISOES.md#d87`).
 */

/**
 * As fornadas que ainda contam: as vivas, dos últimos trinta dias.
 *
 * Trinta porque é `IDADE_VENCE_DIAS`: uma contagem mais velha que isso já vale
 * "não sei", e nenhuma fornada anterior a ela desconta coisa nenhuma. O índice
 * é `arquivado ASC + dataISO DESC`.
 */
// ponytail: fornada com `pedidoId` mais velha que 30 dias sai do abate do
// pedido; se um dia houver massa feita com mais de um mês de antecedência,
// a janela passa a ser a maior data de entrega da lista.
export function consultaFornadas(contaId: string, hojeISO: DataISO) {
  return query(
    colFornadas(contaId),
    where("arquivado", "==", false),
    where("dataISO", ">=", diaVizinho(hojeISO, -IDADE_VENCE_DIAS)),
    orderBy("dataISO", "desc"),
  );
}

export interface DadosFornada {
  fichaId: string;
  nomeSnapshot: string;
  lotes: number;
  unidadesProduzidas: number;
  unidadeRendimento: Fornada["unidadeRendimento"];
  dataISO: DataISO;
  consumo: ConsumoDaFornada[];
  pedidoId?: string;
  observacao?: string;
}

/**
 * Grava a fornada e **não espera o servidor** (`#d62`, `#d80`): a cozinha é o
 * pior sinal da casa depois da despensa, e um botão preso em "salvando" no meio
 * da fornada é a tela falhando onde ela existe para funcionar. O id nasce no
 * aparelho; o cache local já aplicou quando a função devolve.
 */
export function registrarFornada(contaId: string, dados: DadosFornada): string {
  const referencia = doc(colFornadas(contaId));
  const momento = Timestamp.now();
  const { pedidoId, observacao, ...resto } = dados;

  despachar(
    setDoc(referencia, {
      id: referencia.id,
      v: VERSAO_SCHEMA,
      ...resto,
      // Spread condicional: `undefined` não é valor que o Firestore aceite.
      ...(pedidoId ? { pedidoId } : {}),
      ...(observacao ? { observacao } : {}),
      criadoEm: momento,
      atualizadoEm: momento,
      arquivado: false,
    } satisfies Fornada),
  );

  return referencia.id;
}

/** Arquivar tira a fornada da projeção. Nenhuma fornada é apagada. */
export function arquivarFornada(contaId: string, id: string): void {
  despachar(
    updateDoc(docFornada(contaId, id), {
      v: VERSAO_SCHEMA,
      arquivado: true,
      atualizadoEm: Timestamp.now(),
    }),
  );
}

/**
 * A quebra é dita depois: a massa é do dia em que ela foi feita (`#d93`), e o
 * que não deu para vender só se sabe no forno (`DECISOES.md#d139`). Uma escrita,
 * um campo, e não espera o servidor — é a mesma cozinha do `registrarFornada`.
 */
export function anotarQuebra(
  contaId: string,
  id: string,
  perdidas: number,
): void {
  despachar(
    updateDoc(docFornada(contaId, id), {
      v: VERSAO_SCHEMA,
      perdidas,
      atualizadoEm: Timestamp.now(),
    }),
  );
}
