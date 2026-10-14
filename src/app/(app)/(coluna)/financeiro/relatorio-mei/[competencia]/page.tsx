import { notFound } from "next/navigation";
import { AnoDoMei } from "@/components/financeiro/AnoDoMei";
import { RelatorioMei } from "@/components/financeiro/RelatorioMei";

type Parametros = { params: Promise<{ competencia: string }> };

export async function generateMetadata({ params }: Parametros) {
  const { competencia } = await params;
  return {
    title: /^\d{4}$/.test(competencia) ? "Ano do MEI" : "Relatório do MEI",
  };
}

/**
 * O relatório mensal do MEI, pronto para o navegador imprimir (spec 074), e o
 * ano dele em `AAAA` (`DECISOES.md#d362`). Só a dona: mora sob `/financeiro`,
 * que o guarda de rota já recusa à ajudante.
 */
export default async function PaginaRelatorioMei({ params }: Parametros) {
  const { competencia } = await params;
  if (/^\d{4}$/.test(competencia)) {
    return <AnoDoMei key={competencia} ano={competencia} />;
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) notFound();
  // `key`: trocar de mês recomeça as escolhas lidas do aparelho.
  return <RelatorioMei key={competencia} competencia={competencia} />;
}
