import { TelaConfiguracao } from "@/components/configuracao/TelaConfiguracao";

export const metadata = { title: "Configuração" };

/**
 * Fora de `(coluna)` desde a 083 (`#d283`), como o editor de pedido (`#d274`):
 * abaixo de `2xl` a largura é a da coluna, e a partir dele o custo por hora
 * ganha a coluna à direita. A tela põe a própria largura.
 */
export default function PaginaConfiguracao() {
  return <TelaConfiguracao />;
}
