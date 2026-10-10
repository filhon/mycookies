/**
 * A mesma página para chave errada, pedido arquivado, conta encerrada ou sem o
 * cardápio no pacote, e o pedido que não existe: não diz qual (spec 117,
 * `#d320`). Sem nada do Rende: quem chega aqui é a cliente dela.
 */
export default function PedidoNaoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-16">
      <h1 className="text-balance font-display text-title font-semibold text-ink">
        Não encontramos este pedido.
      </h1>
      <p className="mt-3 max-w-[48ch] text-body text-ink-muted">
        Confira o link com quem mandou para você.
      </p>
    </main>
  );
}
