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
 *
 * Fora de `(coluna)` desde a 154 (`#d363`): abaixo de `2xl` a largura é a da
 * coluna, e a partir dele o mês põe a folha à esquerda e a coluna de 320px à
 * direita. O ano continua na coluna.
 */
export default async function PaginaRelatorioMei({ params }: Parametros) {
  const { competencia } = await params;
  if (/^\d{4}$/.test(competencia)) {
    return (
      <div className="mx-auto w-full max-w-5xl print:max-w-none">
        <AnoDoMei key={competencia} ano={competencia} />
      </div>
    );
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) notFound();
  return (
    <div className="mx-auto w-full max-w-5xl print:max-w-none 2xl:max-w-[calc(210mm+22rem)]">
      {/* `key`: trocar de mês recomeça as escolhas lidas do aparelho. */}
      <RelatorioMei key={competencia} competencia={competencia} />
    </div>
  );
}
