"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Painel } from "@/components/ui/Painel";
import { usePapel } from "@/providers/AuthProvider";
import { GradeAdicionar } from "./GradeAdicionar";
import {
  DESTINOS_DO_CELULAR,
  DESTINOS_DO_MAIS,
  destinoAtivo,
  destinosDo,
  numeroDaEspera,
  rotuloDoDestino,
  semNavegacaoInferior,
  useEsperaDoCardapio,
  type Destino,
} from "./navegacao";
import { cn } from "@/lib/utils/cn";

const CLASSES_ITEM =
  "flex min-h-14 w-full items-center justify-center px-1 transition-colors duration-150 ease-quart";

/** A pílula atrás do ícone: é ela que diz "você está aqui". */
function Pilula({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-quart",
        ativo && "bg-brand-100",
      )}
    >
      {children}
    </span>
  );
}

function ItemDestino({
  destino,
  caminho,
  espera,
}: {
  destino: Destino;
  caminho: string;
  espera: number;
}) {
  const ativo = destinoAtivo(caminho, destino.href);
  const Icone = destino.icone;
  const rotulo = rotuloDoDestino(destino, espera);

  return (
    // Só o ícone (`DECISOES.md#d150`): o rótulo fica para o leitor de tela e
    // para o `title`.
    <Link
      href={destino.href}
      aria-label={rotulo}
      title={rotulo}
      aria-current={ativo ? "page" : undefined}
      // A aba em que ela já está volta ao topo, o gesto de todo aplicativo
      // (`DECISOES.md#d237`). Só no caminho exato: em `/fichas/contagem`,
      // Produtos continua indo a `/fichas`.
      onClick={(evento) => {
        if (caminho !== destino.href) return;
        evento.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      }}
      className={cn(
        CLASSES_ITEM,
        // `accent-ink`, e não `accent-500`: o âmbar sobre a superfície
        // reprova AA (~2,3:1). Inativo em `ink-muted`.
        ativo ? "text-accent-ink" : "text-ink-muted",
      )}
    >
      <Pilula ativo={ativo}>
        <Icone aria-hidden className="size-6" strokeWidth={ativo ? 2 : 1.75} />
        {/* Começa onde o ícone de 24px termina (16 + 24 = 40px) e não o cobre
            (`#d235`). */}
        {espera > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 left-10 flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-700 px-1 text-micro font-semibold leading-none tabular-nums text-on-brand"
          >
            {numeroDaEspera(espera)}
          </span>
        )}
      </Pilula>
    </Link>
  );
}

/**
 * O ⋯ e a folha com as páginas que não cabem na barra (`DECISOES.md#d240`).
 * Menor que os destinos: é a saída para o resto, e não um lugar. Leva a pílula
 * quando ela está numa dessas páginas.
 */
function MaisPaginas({
  destinos,
  caminho,
}: {
  destinos: Destino[];
  caminho: string;
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = () => setAberta(false);
  const ativo = destinos.some((destino) => destinoAtivo(caminho, destino.href));

  return (
    <>
      <button
        type="button"
        aria-label="Mais"
        title="Mais"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
        className={cn(
          CLASSES_ITEM,
          ativo ? "text-accent-ink" : "text-ink-muted",
        )}
      >
        <Pilula ativo={ativo}>
          <Ellipsis
            aria-hidden
            className="size-5"
            strokeWidth={ativo ? 2 : 1.75}
          />
        </Pilula>
      </button>

      <Painel aberto={aberta} aoFechar={fechar} titulo="Mais">
        <ul className="-mx-3 -my-3 divide-y divide-line">
          {destinos.map((destino) => {
            const Icone = destino.icone;
            const aqui = destinoAtivo(caminho, destino.href);
            return (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  onClick={fechar}
                  aria-current={aqui ? "page" : undefined}
                  className={cn(
                    "toque flex min-h-13 w-full items-center gap-3 rounded-md px-3 py-2 text-body font-medium transition-colors duration-150 ease-quart",
                    aqui
                      ? "bg-brand-100 text-accent-ink"
                      : "text-ink hover:bg-sunken",
                  )}
                >
                  <Icone
                    aria-hidden
                    className={cn("size-5 shrink-0", !aqui && "text-ink-muted")}
                    strokeWidth={1.75}
                  />
                  {destino.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </Painel>
    </>
  );
}

export function NavegacaoInferior() {
  const caminho = usePathname();
  const papel = usePapel();
  const esperaDoCardapio = useEsperaDoCardapio();

  if (semNavegacaoInferior(caminho)) return null;

  const [primeiro, segundo, terceiro] = destinosDo(papel, DESTINOS_DO_CELULAR);
  const espera = (destino: Destino) =>
    destino.href === "/pedidos" ? esperaDoCardapio : 0;
  const destino = (d: Destino | undefined) =>
    d && (
      <li className="flex-1">
        <ItemDestino destino={d} caminho={caminho} espera={espera(d)} />
      </li>
    );

  return (
    /* `apertado:hidden`: com o teclado aberto ninguém troca de módulo no meio
       de um campo, e o teclado já cobre metade dela com sugestões de texto.
       Ver `DECISOES.md#d74`. */
    <nav
      aria-label="Navegação principal"
      className="area-segura-inferior fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface apertado:hidden lg:hidden print:hidden"
    >
      {/* Cinco espaços iguais, o "+" no do meio (`DECISOES.md#d240`). */}
      <ul className="flex">
        {destino(primeiro)}
        {destino(segundo)}
        <li className="flex min-h-14 flex-1 items-center justify-center">
          <GradeAdicionar />
        </li>
        {destino(terceiro)}
        <li className="flex-1">
          <MaisPaginas
            destinos={destinosDo(papel, DESTINOS_DO_MAIS)}
            caminho={caminho}
          />
        </li>
      </ul>
    </nav>
  );
}
