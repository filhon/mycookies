/**
 * Manda a escrita e não a espera (`DECISOES.md#d80`, `#d104`).
 *
 * A promessa de uma escrita do Firestore **não resolve enquanto não há rede** —
 * ela fica pendente até a reconexão. Esperá-la no meio de uma mutação para a
 * execução na primeira linha, e o que vem depois nunca é sequer enfileirado: o
 * cache offline enfileira escrita despachada, e não continuação de `async`. Foi
 * assim que o agregado do mês perdeu parcela sem ninguém ver.
 *
 * A regra vale para `mutations/` inteiro: nenhuma escrita é esperada dentro de
 * uma mutação. As exceções são duas, cada uma comentada no lugar —
 * `recalcularMes` (`agregado.ts`) e `importarNota` (`notas.ts`). Uma terceira
 * sem comentário dizendo por que espera é regressão.
 *
 * O `catch` está aqui, e não repetido em cada chamada, para que uma escrita
 * recusada de verdade — permissão, documento sumido — não vire
 * `unhandledrejection` numa aba que ninguém está olhando. Ausência de rede não
 * passa por aqui: ela não rejeita, ela espera.
 */
export function despachar(escrita: Promise<unknown>): void {
  escrita.catch((erro) => {
    console.error("Escrita do Firestore recusada", erro);
  });
}
