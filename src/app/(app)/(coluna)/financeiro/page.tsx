import { Suspense } from "react";
import { TelaFinanceiro } from "@/components/financeiro/TelaFinanceiro";

export const metadata = { title: "Caixa" };

// `?mes=` abre o Caixa num mês (`#d360`), e `useSearchParams` pede o limite
// de `Suspense` para a página continuar estática, como em `/clientes`.
export default function PaginaFinanceiro() {
  return (
    <Suspense>
      <TelaFinanceiro />
    </Suspense>
  );
}
