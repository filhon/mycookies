import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * A URL carrega o código de uso único: nem índice, nem link seguido. O raiz já
 * diz o mesmo; aqui fica escrito por quê (spec 042).
 */
export const metadata: Metadata = {
  title: "Senha nova",
  robots: { index: false, follow: false },
};

export default function LayoutRedefinirSenha({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
