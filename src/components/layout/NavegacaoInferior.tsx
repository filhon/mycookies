"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS, destinoAtivo, semNavegacaoInferior } from "./navegacao";
import { cn } from "@/lib/utils/cn";

export function NavegacaoInferior() {
  const caminho = usePathname();

  if (semNavegacaoInferior(caminho)) return null;

  return (
    /* `apertado:hidden`: com o teclado aberto ninguém troca de módulo no meio
       de um campo, e o teclado já cobre metade dela com sugestões de texto.
       Ver `DECISOES.md#d74`. */
    <nav
      aria-label="Navegação principal"
      className="area-segura-inferior fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface apertado:hidden lg:hidden print:hidden"
    >
      <ul className="flex">
        {DESTINOS.map((destino) => {
          const ativo = destinoAtivo(caminho, destino.href);
          const Icone = destino.icone;

          return (
            <li key={destino.href} className="flex-1">
              {/* Só o ícone (`DECISOES.md#d150`): o rótulo fica para o leitor
                  de tela e para o `title`, e a pílula atrás do ícone é o que
                  diz "você está aqui". */}
              <Link
                href={destino.href}
                aria-label={destino.rotulo}
                title={destino.rotulo}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center justify-center px-1",
                  "transition-colors duration-150 ease-quart",
                  // `accent-ink`, e não `accent-500`: o âmbar sobre a
                  // superfície reprova AA (~2,3:1). Inativo em `ink-muted`.
                  ativo ? "text-accent-ink" : "text-ink-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-quart",
                    ativo && "bg-brand-100",
                  )}
                >
                  <Icone
                    aria-hidden
                    className="size-6"
                    strokeWidth={ativo ? 2 : 1.75}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
