import { EditorFicha } from "@/components/fichas/EditorFicha";

export const metadata = { title: "Produto" };

/**
 * O id `nova` é a ficha que ainda não existe. Uma rota só para os dois casos
 * porque a tela é a mesma: o que muda é haver ou não documento por trás.
 *
 * Fora de `(coluna)` desde a 134 (`#d339`), como o pedido (`#d274`): abaixo de
 * `2xl` a largura é a da coluna, e a partir dele o preço ganha a coluna à
 * direita.
 */
export default async function PaginaFicha({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl 2xl:max-w-324">
      <EditorFicha id={id} />
    </div>
  );
}
