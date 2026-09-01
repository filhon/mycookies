import { ModuloPendente } from "@/components/layout/ModuloPendente";

export const metadata = { title: "Pedidos" };

export default function PaginaPedidos() {
  return (
    <ModuloPendente
      titulo="Pedidos"
      descricao="Encomendas, clientes e datas de entrega."
      oQueVem="Os pedidos agendados viram a agenda da semana e a lista de compras: o sistema soma a demanda de insumo de tudo que está para produzir e desconta o que você já tem em estoque."
      proximoPasso={{ href: "/insumos", rotulo: "Ir para insumos" }}
    />
  );
}
