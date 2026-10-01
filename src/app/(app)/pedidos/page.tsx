import { Suspense } from "react";
import { ListaPedidos } from "@/components/pedidos/ListaPedidos";

export const metadata = { title: "Pedidos" };

// A vista mora na URL (`#d246`), e `useSearchParams` pede o limite de
// `Suspense` para a página continuar estática.
export default function PaginaPedidos() {
  return (
    <Suspense>
      <ListaPedidos />
    </Suspense>
  );
}
