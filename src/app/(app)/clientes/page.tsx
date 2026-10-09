import { Suspense } from "react";
import { ListaClientes } from "@/components/clientes/ListaClientes";

export const metadata = { title: "Clientes" };

// A vista mora na URL (`#d309`), e `useSearchParams` pede o limite de
// `Suspense` para a página continuar estática, como em `/pedidos`.
export default function PaginaClientes() {
  return (
    <Suspense>
      <ListaClientes />
    </Suspense>
  );
}
