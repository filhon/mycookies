import { cn } from "@/lib/utils/cn";

export interface OpcaoPilula<V extends string | number | boolean> {
  valor: V;
  rotulo: string;
}

/**
 * Uma escolha entre poucas, em pílulas: o filtro de categoria, o status do
 * pedido, o período da lista de compras, o recorte da contagem.
 *
 * Rola de lado no celular, sangrando até a borda da página (sem barra: no
 * toque nenhuma rolagem tem, ver `globals.css`), e quebra linha no desktop.
 * Era o mesmo botão copiado em seis telas; a única variação de verdade é o
 * `num` de quem escreve um número no rótulo.
 */
export function Pilulas<V extends string | number | boolean>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  numerico = false,
  className,
}: {
  opcoes: readonly OpcaoPilula<V>[];
  valor: V;
  aoMudar: (valor: V) => void;
  /** O nome do grupo para o leitor de tela. */
  rotulo: string;
  /** Rótulos com número usam numerais tabulares. */
  numerico?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0",
        className,
      )}
    >
      {opcoes.map((opcao) => {
        const ativo = valor === opcao.valor;
        return (
          <button
            key={String(opcao.valor)}
            type="button"
            onClick={() => aoMudar(opcao.valor)}
            aria-pressed={ativo}
            className={cn(
              "h-11 shrink-0 rounded-full px-4 text-label font-medium",
              "transition-colors duration-150 ease-quart",
              numerico && "num",
              ativo
                ? "bg-brand-700 text-on-brand"
                : "border border-line-strong text-ink-muted hover:bg-sunken active:bg-sunken",
            )}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
