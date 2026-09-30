"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePapel } from "@/providers/AuthProvider";
import {
  destinoAtivo,
  destinosDo,
  numeroDaEspera,
  rotuloDoDestino,
  semNavegacaoInferior,
  useEsperaDoCardapio,
} from "./navegacao";
import { cn } from "@/lib/utils/cn";

export function NavegacaoInferior() {
  const caminho = usePathname();
  const papel = usePapel();
  const esperaDoCardapio = useEsperaDoCardapio();

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
        {destinosDo(papel).map((destino) => {
          const ativo = destinoAtivo(caminho, destino.href);
          const Icone = destino.icone;
          const espera = destino.href === "/pedidos" ? esperaDoCardapio : 0;
          const rotulo = rotuloDoDestino(destino, espera);

          return (
            <li key={destino.href} className="flex-1">
              {/* Só o ícone (`DECISOES.md#d150`): o rótulo fica para o leitor
                  de tela e para o `title`, e a pílula atrás do ícone é o que
                  diz "você está aqui". */}
              <Link
                href={destino.href}
                aria-label={rotulo}
                title={rotulo}
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
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-quart",
                    ativo && "bg-brand-100",
                  )}
                >
                  <Icone
                    aria-hidden
                    className="size-6"
                    strokeWidth={ativo ? 2 : 1.75}
                  />
                  {/* Começa onde o ícone de 24px termina (16 + 24 = 40px) e
                      não o cobre; o "9+" cabe na coluna mesmo com cinco
                      destinos em 360px (`#d235`). */}
                  {espera > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-1 left-10 flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-700 px-1 text-micro font-semibold leading-none tabular-nums text-on-brand"
                    >
                      {numeroDaEspera(espera)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
