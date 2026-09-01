import { setDoc, Timestamp } from "firebase/firestore";
import { docConfiguracao } from "../colecoes";
import { custoIndiretoPorHora } from "@/lib/domain/custosOperacionais";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  CustosOperacionais,
  FormaPagamento,
  PrecificacaoPadrao,
} from "@/lib/types";

/**
 * O que a tela entrega. `custoIndiretoPorHora` fica de fora de propósito: é
 * derivado, e derivado é calculado na escrita, nunca digitado (`DECISOES.md#d04`).
 */
export interface DadosConfiguracao {
  /**
   * Espelho de `contas/{contaId}.nome`, que é onde o nome do negócio de fato
   * mora desde D14. Ausente quando a tela ainda não sabe o valor: espelho que
   * não conhece o original não escreve por cima dele.
   */
  nomeNegocio?: string;
  operacional: Omit<CustosOperacionais, "custoIndiretoPorHora">;
  precificacao: PrecificacaoPadrao;
  formasPagamento: FormaPagamento[];
  categoriasProduto: string[];
}

/**
 * O que a tela mostra numa conta que nunca salvou configuração.
 *
 * São sugestões, e não dados: só viram documento quando a Maynara salvar. Um
 * campo vazio e obrigatório trava o cadastro; um número plausível e editável
 * ensina a ordem de grandeza e sai da frente (`PRODUCT.md`, princípio 1).
 */
export const CONFIGURACAO_SUGERIDA: DadosConfiguracao = {
  operacional: {
    valorHoraTrabalho: 2500,
    horasProdutivasMes: 160,
    custoEnergiaHora: 100,
    custoGasHora: 200,
    despesasFixasMensais: 0,
  },
  precificacao: {
    metodoPadrao: "MARGEM",
    markupPadrao: 2.5,
    margemPadrao: 35,
    outrasTaxasPadrao: 0,
    arredondamento: "CENTAVO_90",
  },
  formasPagamento: [
    {
      id: "pix",
      nome: "Pix",
      tipo: "PIX",
      taxaPercentual: 0,
      taxaFixa: 0,
      prazoRecebimentoDias: 0,
      ativo: true,
    },
    {
      id: "dinheiro",
      nome: "Dinheiro",
      tipo: "DINHEIRO",
      taxaPercentual: 0,
      taxaFixa: 0,
      prazoRecebimentoDias: 0,
      ativo: true,
    },
    {
      id: "debito",
      nome: "Cartão de débito",
      tipo: "DEBITO",
      taxaPercentual: 1.99,
      taxaFixa: 0,
      prazoRecebimentoDias: 1,
      ativo: true,
    },
    {
      id: "credito",
      nome: "Cartão de crédito",
      tipo: "CREDITO",
      taxaPercentual: 4.99,
      taxaFixa: 0,
      prazoRecebimentoDias: 30,
      ativo: true,
    },
  ],
  categoriasProduto: [],
};

/**
 * Uma escrita só, no documento único `configuracao/geral`.
 *
 * `merge: true` porque esta tela não é dona do documento inteiro: as categorias
 * de produto e o que os módulos seguintes acrescentarem continuam de pé mesmo
 * que esta versão da tela não os conheça.
 */
export async function salvarConfiguracao(
  contaId: string,
  dados: DadosConfiguracao,
): Promise<void> {
  const { operacional } = dados;

  await setDoc(
    docConfiguracao(contaId),
    {
      v: VERSAO_SCHEMA,
      ...(dados.nomeNegocio ? { nomeNegocio: dados.nomeNegocio } : {}),
      operacional: {
        ...operacional,
        custoIndiretoPorHora: custoIndiretoPorHora(
          operacional.despesasFixasMensais,
          operacional.horasProdutivasMes,
        ),
      },
      precificacao: dados.precificacao,
      formasPagamento: dados.formasPagamento,
      categoriasProduto: dados.categoriasProduto,
      atualizadoEm: Timestamp.now(),
    },
    { merge: true },
  );
}
