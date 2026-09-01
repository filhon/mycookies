import { ModuloPendente } from "@/components/layout/ModuloPendente";

export const metadata = { title: "Configuração" };

export default function PaginaConfiguracao() {
  return (
    <ModuloPendente
      titulo="Configuração"
      descricao="Os custos que não aparecem na receita, mas saem do seu bolso."
      oQueVem="Valor da sua hora de trabalho, energia e gás, despesas fixas do mês e as taxas de cada forma de pagamento. Esses números entram no rateio de toda ficha técnica, e por isso esta tela sobe junto com o módulo de precificação."
      proximoPasso={{ href: "/insumos", rotulo: "Ir para insumos" }}
    />
  );
}
