import { ModuloPendente } from "@/components/layout/ModuloPendente";

export const metadata = { title: "Fichas técnicas" };

export default function PaginaFichas() {
  return (
    <ModuloPendente
      titulo="Fichas técnicas"
      descricao="Receitas com custo real e preço de venda calculado."
      oQueVem="Aqui você monta a receita com os insumos já cadastrados, soma tempo de trabalho, gás e taxa de cartão, e o sistema devolve o preço que fecha a margem que você quer. É o próximo módulo."
      proximoPasso={{ href: "/insumos", rotulo: "Cadastrar insumos primeiro" }}
    />
  );
}
