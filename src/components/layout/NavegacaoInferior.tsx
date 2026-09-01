"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS, destinoAtivo } from "./navegacao";
import { cn } from "@/lib/utils/cn";

export function NavegacaoInferior() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="area-segura-inferior fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden"
    >
      <ul className="flex">
        {DESTINOS.map((destino) => {
          const ativo = destinoAtivo(caminho, destino.href);
          const Icone = destino.icone;

          return (
            <li key={destino.href} className="flex-1">
              <Link
                href={destino.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2",
                  "transition-colors duration-150 ease-quart",
                  ativo
                    ? "text-wine-700 dark:text-wine-300"
                    : "text-ink-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 ease-quart",
                    ativo && "bg-wine-100",
                  )}
                >
                  <Icone
                    aria-hidden
                    className="size-5.5"
                    strokeWidth={ativo ? 2 : 1.75}
                  />
                </span>
                <span
                  className={cn(
                    "text-micro leading-none",
                    ativo ? "font-semibold" : "font-medium",
                  )}
                >
                  {destino.curto}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
