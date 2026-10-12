import { ReceitaNaBancada } from "@/components/fichas/ReceitaNaBancada";

export const metadata = { title: "Na bancada" };

/**
 * A receita para ler durante a produção (`DECISOES.md#d343`). Rota, e não
 * folha: ela fica aqui vinte minutos e volta pelo gesto. Fora de `(coluna)` e
 * sem navegação inferior, como o editor (`#d152`).
 */
export default async function PaginaBancada({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ReceitaNaBancada id={id} />
    </div>
  );
}
