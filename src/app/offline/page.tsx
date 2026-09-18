import { Simbolo } from "@/components/marca/Marca";

export const metadata = { title: "Sem conexão" };

export default function PaginaOffline() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
      <Simbolo className="size-16" />
      <h1 className="font-display text-title font-semibold text-ink">
        Sem internet, e tudo bem.
      </h1>
      <p className="max-w-[38ch] text-body text-ink-muted">
        Esta tela ainda não foi baixada. Volte para uma que você já abriu: dá
        pra consultar preço, anotar pedido e contar a despensa. Nada se perde.
      </p>
    </div>
  );
}
