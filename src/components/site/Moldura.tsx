import Link from "next/link";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { Logotipo } from "@/components/marca/Marca";
import { classesBotao } from "@/components/ui/estilosBotao";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { cn } from "@/lib/utils/cn";

/**
 * O topo e o rodapé das páginas públicas do Rende: `/conheca` (spec 036) e
 * `/como-calcular-o-preco-do-cookie` (spec 037).
 */

const ALVO_LINK =
  "toque inline-flex items-center rounded-md px-3 text-label font-medium";

const COR_LINK =
  "text-ink-muted transition-colors duration-150 ease-quart hover:text-ink";

export function Topo({
  ancoras = [],
  convite = false,
}: {
  /** Os atalhos da página, só no desktop. */
  ancoras?: { href: string; rotulo: string }[];
  /** O "Testar" secundário do desktop. Só onde a página vende primeiro. */
  convite?: boolean;
}) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 lg:px-10 lg:pt-7">
      <Link
        href="/conheca"
        className="toque -mx-1 inline-flex items-center px-1"
      >
        <Logotipo />
      </Link>
      <nav aria-label="Página" className="flex items-center gap-1">
        {ancoras.length > 0 && (
          <ul className="hidden items-center gap-1 lg:flex">
            {ancoras.map((a) => (
              <li key={a.href}>
                <a href={a.href} className={cn(ALVO_LINK, COR_LINK)}>
                  {a.rotulo}
                </a>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/login"
          className={classesBotao({
            variante: "terciaria",
            tamanho: "sm",
            className: "lg:ml-3",
          })}
        >
          Entrar
        </Link>
        {/* Secundário: o primário da tela é o da frase (036, seção 4, item 8). */}
        {convite && (
          <Link
            href="/cadastro"
            className={classesBotao({
              tamanho: "sm",
              className: "hidden lg:inline-flex",
            })}
          >
            Testar {DIAS_DE_TESTE} dias
          </Link>
        )}
      </nav>
    </header>
  );
}

export function Rodape() {
  const links = [
    // Sem este link o robô que entra por `/conheca` não acha a página do
    // preço (spec 037, 3.3).
    {
      href: "/como-calcular-o-preco-do-cookie",
      rotulo: "Como calcular o preço",
    },
    { href: "/conheca#duvidas", rotulo: "Dúvidas" },
    { href: `mailto:${RESPONSAVEL.email}`, rotulo: "Contato" },
    { href: "/termos", rotulo: "Termos" },
    { href: "/privacidade", rotulo: "Privacidade" },
  ];

  return (
    <footer className="sobre-marca border-t border-line bg-brand-900 text-on-brand">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <Logotipo tom="negativa" />
          <p className="mt-2 text-label text-ink-muted">
            Precificação para quem faz à mão.
          </p>
        </div>
        <ul className="-mx-3 flex flex-wrap gap-x-2">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={cn(ALVO_LINK, COR_LINK)}>
                {l.rotulo}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
