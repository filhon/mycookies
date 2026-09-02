import { EditorFicha } from "@/components/fichas/EditorFicha";

export const metadata = { title: "Ficha técnica" };

/**
 * O id `nova` é a ficha que ainda não existe. Uma rota só para os dois casos
 * porque a tela é a mesma: o que muda é haver ou não documento por trás.
 */
export default async function PaginaFicha({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorFicha id={id} />;
}
