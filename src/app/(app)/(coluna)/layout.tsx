import type { ReactNode } from "react";

/**
 * A coluna de leitura é escolha da tela, e não do shell (`DECISOES.md#d129`).
 * Formulário e prosa param em 1024px, e `RodapeFixo` mede a mesma coluna por
 * dentro, então os editores continuam alinhados com o rodapé de preço. As
 * tabelas de `/fichas`, `/insumos` e `/pedidos` ficam fora deste grupo e ocupam
 * a largura que têm (`#d225`, `#d253`); os editores delas continuam aqui.
 *
 * Na impressão a folha do orçamento é a página inteira (`#d106`).
 */
export default function LayoutColuna({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl print:max-w-none">{children}</div>
  );
}
