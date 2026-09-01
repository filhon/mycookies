import { ModuloPendente } from "@/components/layout/ModuloPendente";

export const metadata = { title: "Caixa" };

export default function PaginaFinanceiro() {
  return (
    <ModuloPendente
      titulo="Caixa"
      descricao="Entradas, saídas, lucro do mês e progresso da meta."
      oQueVem="Vendas efetivadas entram, compras e despesas saem, e o painel mostra lucro, ticket médio e quantos doces por semana faltam para bater a meta do mês."
      proximoPasso={{ href: "/insumos", rotulo: "Ir para insumos" }}
    />
  );
}
