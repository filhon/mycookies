import type { DadosConfiguracao } from "@/lib/types";
import type { RateioOperacional } from "./custoFicha";
import { custoIndiretoPorHora, maiorTaxaAtiva } from "./custosOperacionais";
import type { ParametrosPreco } from "./precificacao";

/**
 * O que a tela mostra numa conta que nunca salvou configuração.
 *
 * São sugestões, e não dados: só viram documento quando a Maynara salvar. Um
 * campo vazio e obrigatório trava o cadastro; um número plausível e editável
 * ensina a ordem de grandeza e sai da frente (`PRODUCT.md`, princípio 1).
 *
 * Mora no domínio desde a 040 (`DECISOES.md#d186`): a calculadora pública faz
 * a conta com a configuração da conta nova, e o domínio não importa Firebase.
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

/** O rateio de uma conta que nunca salvou configuração. */
export function rateioSugerido(): RateioOperacional {
  const { operacional } = CONFIGURACAO_SUGERIDA;
  return {
    ...operacional,
    custoIndiretoPorHora: custoIndiretoPorHora(
      operacional.despesasFixasMensais,
      operacional.horasProdutivasMes,
    ),
  };
}

/** Método, margem, markup, arredondamento e a maior taxa ativa, sugeridos. */
export function precificacaoSugerida(): ParametrosPreco {
  return parametrosDePreco(
    CONFIGURACAO_SUGERIDA.precificacao,
    CONFIGURACAO_SUGERIDA.formasPagamento,
  );
}

/**
 * A configuração em parâmetros de preço. Um lugar só para as duas origens, a
 * salva e a sugerida: são o mesmo mapa, e dois mapas divergiriam.
 */
export function parametrosDePreco(
  precificacao: DadosConfiguracao["precificacao"],
  formasPagamento: DadosConfiguracao["formasPagamento"],
): ParametrosPreco {
  return {
    metodo: precificacao.metodoPadrao,
    markup: precificacao.markupPadrao,
    margemDesejada: precificacao.margemPadrao,
    taxaCartaoConsiderada: maiorTaxaAtiva(formasPagamento),
    outrasTaxas: precificacao.outrasTaxasPadrao,
    arredondamento: precificacao.arredondamento,
  };
}
