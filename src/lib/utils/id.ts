/**
 * Id gerado no aparelho, para item que mora dentro de um documento e não ganha
 * id do Firestore, como uma forma de pagamento.
 *
 * Precisa nascer offline, e por isso não pode depender de ida ao servidor. O
 * `randomUUID` existe em todo navegador atual em contexto seguro; a alternativa
 * cobre o resto sem prometer unicidade global, que aqui não é necessária: basta
 * ser único dentro do próprio documento.
 */
export function novoId(): string {
  const cripto = globalThis.crypto;
  if (typeof cripto?.randomUUID === "function") return cripto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
