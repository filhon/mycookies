/**
 * A semente que a fornada deixa para a contagem do que está pronto, entre uma
 * tela e outra: o `#d64` de novo, um nível acima. A massa que ela acabou de
 * registrar é um fato exato ("fiz massa para 25"), e o campo daquela ficha
 * nasce com `contagem anterior + 25` para ela conferir no pote.
 *
 * Viaja como estado de módulo, e não na URL, pelo mesmo motivo da semente da
 * despensa; e morre no recarregamento de propósito.
 */

export interface SementeDoPronto {
  fichaId: string;
  /** As unidades da fornada recém-registrada, na unidade de rendimento. */
  unidades: number;
}

let guardada: SementeDoPronto | null = null;

export function guardarSementeDoPronto(semente: SementeDoPronto): void {
  guardada = semente;
}

/** Não consome: quem consome é `limparSementeDoPronto`, depois de o campo nascer. */
export function lerSementeDoPronto(): SementeDoPronto | null {
  return guardada;
}

export function limparSementeDoPronto(): void {
  guardada = null;
}
