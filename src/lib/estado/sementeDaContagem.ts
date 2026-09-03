import type { OrigemDaEntrada } from "@/lib/domain/estoque";

/**
 * A semente que a compra deixa para a contagem, entre uma tela e outra.
 *
 * **Ela viaja como estado de navegação, e não na URL.** São de seis a vinte
 * pares `insumoId → quantidade`, e uma querystring com isso dentro é um lugar
 * novo onde número de negócio pode ser reescrito à mão — por quem não é ela, num
 * link colado. Custa um pouco mais de código do que uma querystring e fecha essa
 * porta.
 *
 * É um módulo com estado, e não um contexto de React, porque o que ele guarda
 * não pertence a nenhuma árvore: quem escreve são `/insumos/nota` e `/compras`,
 * quem lê é `/insumos/contagem`, e as três são páginas irmãs. Um provider no
 * layout de `(app)` daria o mesmo resultado com uma indireção a mais.
 *
 * **Morrer no recarregamento é a intenção**, e não um efeito colateral: uma
 * semente que sobrevivesse ao F5 semearia campos de uma compra que ela já
 * guardou. A tela sem semente é a mesma tela, com os campos vazios — é o caminho
 * de quem chega por `/compras`.
 */

export interface SementeDaContagem {
  origem: OrigemDaEntrada;
  /** Por `insumoId`, o que a compra trouxe em unidade base. */
  entradas: Map<string, number>;
}

let guardada: SementeDaContagem | null = null;

export function guardarSemente(semente: SementeDaContagem): void {
  guardada = semente;
}

/** Não consome: quem consome é `limparSemente`, depois de os campos nascerem. */
export function lerSemente(): SementeDaContagem | null {
  return guardada;
}

export function limparSemente(): void {
  guardada = null;
}
