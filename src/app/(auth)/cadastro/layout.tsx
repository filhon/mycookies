import type { ReactNode } from "react";
import { Medicao } from "@/components/site/Medicao";

/**
 * Só para a medição (spec 038). A página é client component, e lá
 * `process.env.VERCEL_ENV` não existe: o `Medicao` precisa de um pai servidor.
 */
export default function LayoutCadastro({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Medicao />
    </>
  );
}
