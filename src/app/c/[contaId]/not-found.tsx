/**
 * A mesma página para os cinco "não está aberto" de `montarCardapio` e para a
 * conta que não existe: a um estranho, não se diz qual (spec 031). Sem
 * logotipo do Rende e sem link para o app: quem chega aqui é a cliente dela.
 */
export default function CardapioFechado() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-16">
      <h1 className="text-balance font-display text-title font-semibold text-ink">
        Este cardápio não está aberto agora.
      </h1>
      <p className="mt-3 max-w-[48ch] text-body text-ink-muted">
        Se você recebeu este link de alguém, fale com essa pessoa.
      </p>
    </main>
  );
}
