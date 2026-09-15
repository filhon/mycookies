import { deleteField, setDoc, Timestamp } from "firebase/firestore";
import { docConfiguracao } from "../colecoes";
import { despachar } from "./despachar";
import type { RateioOperacional } from "@/lib/domain/custoFicha";
import {
  custoIndiretoPorHora,
  maiorTaxaAtiva,
} from "@/lib/domain/custosOperacionais";
import type { ParametrosPreco } from "@/lib/domain/precificacao";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  ConfiguracaoGeral,
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
  /** O rodapé e a assinatura da folha do orçamento (spec 017). */
  contato?: ConfiguracaoGeral["contato"];
  assinaturaDataUrl?: string;
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
 * O rateio que uma ficha usa: o salvo, senão o sugerido (`DECISOES.md#d114`).
 *
 * Zero era o que `custoFicha.ts` usava enquanto a conta não salvava nada — e
 * zero também é um número que o sistema inventou, o mesmo erro da planilha
 * dela. A sugestão inteira está mais perto da verdade, e a faixa na tela
 * continua dizendo de onde o número veio.
 */
export function rateioDaConta(
  configuracao: ConfiguracaoGeral | null,
): RateioOperacional {
  if (configuracao) return configuracao.operacional;
  const { operacional } = CONFIGURACAO_SUGERIDA;
  return {
    ...operacional,
    custoIndiretoPorHora: custoIndiretoPorHora(
      operacional.despesasFixasMensais,
      operacional.horasProdutivasMes,
    ),
  };
}

/** Método, margem, markup, arredondamento e a maior taxa ativa — salvos, senão sugeridos. */
export function precificacaoPadraoDaConta(
  configuracao: ConfiguracaoGeral | null,
): ParametrosPreco {
  const precificacao =
    configuracao?.precificacao ?? CONFIGURACAO_SUGERIDA.precificacao;
  const formasPagamento =
    configuracao?.formasPagamento ?? CONFIGURACAO_SUGERIDA.formasPagamento;

  return {
    metodo: precificacao.metodoPadrao,
    markup: precificacao.markupPadrao,
    margemDesejada: precificacao.margemPadrao,
    taxaCartaoConsiderada: maiorTaxaAtiva(formasPagamento),
    outrasTaxas: precificacao.outrasTaxasPadrao,
    arredondamento: precificacao.arredondamento,
  };
}

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

  despachar(
    setDoc(
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
        // Vazio apaga, e não esconde: com `merge`, uma chave ausente deixaria
        // o telefone velho e a assinatura que ela acabou de tirar no documento.
        ...(dados.contato && {
          contato: {
            telefone: dados.contato.telefone?.trim() || deleteField(),
            instagram: dados.contato.instagram?.trim() || deleteField(),
          },
        }),
        assinaturaDataUrl: dados.assinaturaDataUrl || deleteField(),
        atualizadoEm: Timestamp.now(),
      },
      { merge: true },
    ),
  );
}
