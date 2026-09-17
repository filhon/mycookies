import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * O caminho de volta no cabeçalho das telas que não estão no menu: o editor
 * de produto e de pedido, as duas contagens e a leitura de nota. Diz para onde
 * volta, e não "Voltar": a seta já é o verbo.
 */
export function LinkVoltar({
  href,
  children,
  className,
}: {
  href: Route;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink",
        className,
      )}
    >
      <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
      {children}
    </Link>
  );
}
