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
import { criarTransacao } from "./transacoes";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { LancamentoDaNota } from "@/lib/domain/notaFiscal";
import type { Centavos, Insumo } from "@/lib/types";
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
  /** O que foi para o caixa, ou `null` quando o bloco estava desligado. */
  lancado: Centavos | null;
}

/** O teto de `array-contains-any` numa consulta, com folga. */
const POR_CONSULTA = 10;

/** Um `writeBatch` aceita 500 operações. Fica bem abaixo disso. */
const POR_LOTE = 400;

export async function importarNota(
  contaId: string,
  linhas: LinhaImportada[],
  /**
   * A saída no caixa, ou `null` quando ela desligou o bloco.
   *
   * Vem depois dos insumos de propósito, e a ordem é o que decide o estado
   * ruim: falhando o lote, não há lançamento de uma compra que não foi
   * cadastrada; falhando o lançamento, os insumos ficam e ler a nota de novo
   * conserta — reimportar insumo é atualizar preço, que é idempotente por
   * natureza, e a guarda de duplicidade cuida do resto.
   */
  lancamento: LancamentoDaNota | null = null,
): Promise<ResultadoImportacao> {
  if (linhas.length === 0) {
    return { criados: 0, atualizados: 0, fichasMarcadas: 0, lancado: null };
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
    lancado: lancamento ? await lancarNoCaixa(contaId, lancamento) : null,
  };
}

/**
 * A compra vira uma saída, pelo mesmo caminho de `/financeiro`.
 *
 * `ContextoMeta` vai `null` porque saída não move o espelho da meta: `realizado`
 * espelha `entradas`, e `deltaDaTransacao` de uma saída tem `entradas` zerado
 * (`DECISOES.md#d29`). E `custoTaxa` vai zero explícito para que a lista de
 * formas de pagamento não precise ser lida numa tela que não fala de
 * maquininha — saída não passa por uma.
 */
async function lancarNoCaixa(
  contaId: string,
  lancamento: LancamentoDaNota,
): Promise<Centavos> {
  await criarTransacao(
    contaId,
    {
      tipo: "SAIDA",
      categoria: lancamento.categoria,
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      dataISO: lancamento.dataISO,
      custoTaxa: 0,
      recorrente: false,
      ...(lancamento.notaChave ? { notaChave: lancamento.notaChave } : {}),
    },
    [],
    null,
  );

  return lancamento.valor;
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
