import { notFound } from "next/navigation";
import { RelatorioMei } from "@/components/financeiro/RelatorioMei";

export const metadata = { title: "Relatório do MEI" };

/**
 * O relatório mensal do MEI, pronto para o navegador imprimir (spec 074). Só a
 * dona: mora sob `/financeiro`, que o guarda de rota já recusa à ajudante.
 */
export default async function PaginaRelatorioMei({
  params,
}: {
  params: Promise<{ competencia: string }>;
}) {
  const { competencia } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) notFound();
  // `key`: trocar de mês recomeça as escolhas lidas do aparelho.
  return <RelatorioMei key={competencia} competencia={competencia} />;
}
