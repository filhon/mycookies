import {
  doc,
  getDocs,
  increment,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { obterDb } from "../client";
import { colFichas, colInsumos, docInsumo, docResumoGlobal } from "../colecoes";
import {
  corpoDeAtualizacao,
  corpoDeInsumoNovo,
  podarHistorico,
  precoMudou,
  type DadosInsumo,
} from "./insumos";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { Insumo } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

/**
 * Uma nota é um lote, e não N salvamentos.
 *
 * Vinte chamadas de `criarInsumo` em sequência seriam vinte idas ao servidor
 * numa tela que já depende de rede duas vezes — e, pior, deixariam a falha
 * parcial possível: metade cadastrada, e ela sem saber qual metade. Aqui os
 * documentos vão em um `writeBatch`, com o incremento de `totalInsumos` junto,
 * e só depois vem a passada que marca as fichas afetadas.
 *
 * O corpo dos documentos sai de `mutations/insumos.ts`: este arquivo decide
 * quantas escritas acontecem, e nunca o que é um insumo.
 */

export interface LinhaImportada {
  dados: DadosInsumo;
  /**
   * O insumo que esta linha atualiza. Ausente quando ela cria um novo.
   *
   * Quem decide o que a nota tem direito de mudar num insumo que já existe é
   * `atualizacaoDaLinha`, no domínio: perda, estoque, categoria e o nome
   * cadastrado chegam aqui já preservados dentro de `dados`.
   */
  anterior?: Insumo;
}

export interface ResultadoImportacao {
  criados: number;
  atualizados: number;
  fichasMarcadas: number;
}

/** O teto de `array-contains-any` numa consulta, com folga. */
const POR_CONSULTA = 10;

/** Um `writeBatch` aceita 500 operações. Fica bem abaixo disso. */
const POR_LOTE = 400;

export async function importarNota(
  contaId: string,
  linhas: LinhaImportada[],
): Promise<ResultadoImportacao> {
  if (linhas.length === 0) {
    return { criados: 0, atualizados: 0, fichasMarcadas: 0 };
  }

  const momento = Timestamp.now();
  const lote = writeBatch(obterDb());

  const novos = linhas.filter((linha) => !linha.anterior);
  const atualizados = linhas.filter(
    (linha): linha is LinhaImportada & { anterior: Insumo } =>
      linha.anterior !== undefined,
  );

  for (const linha of novos) {
    lote.set(
      doc(colInsumos(contaId)),
      corpoDeInsumoNovo(linha.dados, momento) as Insumo,
    );
  }

  for (const linha of atualizados) {
    lote.update(
      docInsumo(contaId, linha.anterior.id),
      corpoDeAtualizacao(linha.anterior, linha.dados, momento),
    );
  }

  if (novos.length > 0) {
    lote.set(
      docResumoGlobal(contaId),
      {
        v: VERSAO_SCHEMA,
        totalInsumos: increment(novos.length),
        atualizadoEm: momento,
      },
      { merge: true },
    );
  }

  await lote.commit();

  // As compras que de fato mudaram o preço. Só elas envelhecem ficha, e só
  // elas empurram uma entrada no histórico que pode precisar de poda.
  const comPrecoNovo = atualizados.filter((linha) =>
    precoMudou(linha.anterior, linha.dados),
  );

  const [fichasMarcadas] = await Promise.all([
    marcarFichasDeVarios(
      contaId,
      comPrecoNovo.map((linha) => linha.anterior.id),
    ),
    ...comPrecoNovo.map((linha) => podarHistorico(contaId, linha.anterior)),
  ]);

  return {
    criados: novos.length,
    atualizados: atualizados.length,
    fichasMarcadas,
  };
}

/**
 * Uma passada só para todos os insumos que mudaram de preço.
 *
 * `marcarFichasDesatualizadas` consulta um insumo por vez, o que numa nota de
 * vinte linhas seriam vinte consultas. `array-contains-any` responde por dez de
 * uma vez, e uma ficha que use dois insumos da mesma nota é marcada uma vez só.
 */
async function marcarFichasDeVarios(
  contaId: string,
  insumoIds: string[],
): Promise<number> {
  if (insumoIds.length === 0) return 0;

  const afetadas = new Set<string>();

  for (let i = 0; i < insumoIds.length; i += POR_CONSULTA) {
    const bloco = insumoIds.slice(i, i + POR_CONSULTA);
    const fichas = await getDocs(
      query(
        colFichas(contaId),
        where("insumoIds", "array-contains-any", bloco),
      ),
    );
    fichas.forEach((ficha) => afetadas.add(ficha.id));
  }

  const ids = [...afetadas];
  for (let i = 0; i < ids.length; i += POR_LOTE) {
    const lote = writeBatch(obterDb());
    for (const id of ids.slice(i, i + POR_LOTE)) {
      lote.update(doc(colFichas(contaId), id), { custoDesatualizado: true });
    }
    await lote.commit();
  }

  return ids.length;
}
