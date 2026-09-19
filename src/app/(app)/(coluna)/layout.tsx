import type { ReactNode } from "react";

/**
 * A coluna de leitura é escolha da tela, e não do shell (`DECISOES.md#d129`).
 * Formulário e prosa param em 1024px, e `RodapeFixo` mede a mesma coluna por
 * dentro, então os editores continuam alinhados com o rodapé de preço. A
 * tabela de `/fichas` fica fora deste grupo e ocupa a largura que tem; quando
 * `/insumos` e `/pedidos` virarem tabela, saem daqui também.
 *
 * Na impressão a folha do orçamento é a página inteira (`#d106`).
 */
export default function LayoutColuna({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl print:max-w-none">{children}</div>
  );
}
