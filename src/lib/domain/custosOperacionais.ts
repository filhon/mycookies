import type {
  Centavos,
  FormaPagamento,
  Percentual,
  RegraArredondamento,
  TipoPagamento,
} from "@/lib/types";

/**
 * Fornada usada só para ilustrar consequência na tela: 1h30 é o tempo de um
 * lote de cookies do começo ao fim, e é o mesmo número do caso de aceite da
 * spec. Nada de cálculo real depende dele.
 */
export const FORNADA_EXEMPLO_MINUTOS = 90;

/** Venda de referência para mostrar o que a maquininha come. */
export const VENDA_EXEMPLO: Centavos = 10000;

export interface EntradaCustosOperacionais {
  valorHoraTrabalho: Centavos;
  horasProdutivasMes: number;
  custoEnergiaHora: Centavos;
  custoGasHora: Centavos;
  despesasFixasMensais: Centavos;
}

/**
 * Rateia a despesa fixa do mês pelas horas que a Maynara de fato produz.
 *
 * Sem horas produtivas não existe por onde ratear, e o resultado é zero em vez
 * de `Infinity`: aluguel e internet simplesmente não entram no preço até ela
 * dizer quantas horas trabalha. A tela explica isso; a conta não inventa.
 */
export function custoIndiretoPorHora(
  despesasFixasMensais: Centavos,
  horasProdutivasMes: number,
): Centavos {
  if (!(horasProdutivasMes > 0)) return 0;
  return Math.round(despesasFixasMensais / horasProdutivasMes);
}

/**
 * O que uma hora de produção custa antes do primeiro grama de farinha:
 * trabalho, forno, gás e a fatia da despesa fixa.
 */
export function custoHoraProducao(
  entrada: EntradaCustosOperacionais,
): Centavos {
  return (
    entrada.valorHoraTrabalho +
    entrada.custoEnergiaHora +
    entrada.custoGasHora +
    custoIndiretoPorHora(
      entrada.despesasFixasMensais,
      entrada.horasProdutivasMes,
    )
  );
}

/** Converte um custo por hora no custo de um trecho medido em minutos. */
export function custoDeMinutos(
  custoPorHora: Centavos,
  minutos: number,
): Centavos {
  if (!(minutos > 0)) return 0;
  return Math.round((custoPorHora * minutos) / 60);
}

type TaxasDaForma = Pick<FormaPagamento, "taxaPercentual" | "taxaFixa">;

/** O que a maquininha (ou o gateway) fica de uma venda. */
export function taxaCobrada(valor: Centavos, forma: TaxasDaForma): Centavos {
  if (valor <= 0) return 0;
  const percentual = Math.round((valor * forma.taxaPercentual) / 100);
  return Math.min(valor, percentual + forma.taxaFixa);
}

/** O que sobra da venda depois da taxa. É o número que a tela mostra. */
export function liquidoRecebido(
  valor: Centavos,
  forma: TaxasDaForma,
): Centavos {
  return valor - taxaCobrada(valor, forma);
}

/**
 * A maior taxa entre as formas ativas.
 *
 * É o palpite certo para embutir no preço: um preço que fecha a margem na
 * forma mais cara fecha em todas as outras. O contrário — usar o Pix, que não
 * cobra nada — faria toda venda no crédito comer a margem em silêncio.
 */
export function maiorTaxaAtiva(formas: FormaPagamento[]): Percentual {
  return formas.reduce(
    (maior, forma) =>
      forma.ativo && forma.taxaPercentual > maior
        ? forma.taxaPercentual
        : maior,
    0,
  );
}

export const ROTULO_TIPO_PAGAMENTO: Record<TipoPagamento, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  CREDITO_PARCELADO: "Crédito parcelado",
  TRANSFERENCIA: "Transferência",
};

export const ROTULO_ARREDONDAMENTO: Record<RegraArredondamento, string> = {
  NENHUM: "Não arredondar",
  CENTAVO_90: "Terminar em 90 centavos",
  MEIO_REAL: "Meio real mais próximo",
  REAL_INTEIRO: "Real inteiro",
};

/** Prazo de recebimento em palavras. Zero dia é "na hora", não "em 0 dias". */
export function textoPrazo(dias: number): string {
  if (dias <= 0) return "cai na hora";
  if (dias === 1) return "cai em 1 dia";
  return `cai em ${dias} dias`;
}
