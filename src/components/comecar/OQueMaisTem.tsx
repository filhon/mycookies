import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Clock,
  ShoppingCart,
} from "lucide-react";

interface Funcionalidade {
  icone: LucideIcon;
  nome: string;
  /** O que faz. Uma frase, na voz dela. */
  frase: string;
  /** Em que momento da semana ela aparece. É o gatilho, e não o recurso. */
  momento: string;
  href: Route;
}

/**
 * As três que não estão na navegação inferior, e que por isso dependem de
 * descoberta acidental — que é o problema que esta página resolve. São
 * exatamente as três que mais economizam trabalho dela.
 */
const FUNCIONALIDADES: readonly Funcionalidade[] = [
  {
    icone: ShoppingCart,
    nome: "Lista de compras",
    frase:
      "As encomendas confirmadas viram o carrinho do mercado: quantos pacotes de cada coisa, agrupados por corredor, com o preço corrigível ali na frente da gôndola.",
    momento: "No dia de ir ao mercado.",
    href: "/compras",
  },
  {
    icone: Camera,
    nome: "Foto da nota",
    frase:
      "O cupom da compra vira uma lista que você confere antes de aprovar: os insumos entram todos de uma vez, já com o preço novo, e a compra ainda é lançada como saída no caixa.",
    momento: "Na volta do mercado, com o cupom ainda na mão.",
    href: "/insumos/nota",
  },
  {
    icone: ClipboardList,
    nome: "Contagem da despensa",
    frase:
      "Você abre o armário e diz o que tem, insumo por insumo, em uma tela só. Sem contar, o sistema prefere te mandar comprar farinha de novo a te deixar sem farinha no meio da fornada.",
    momento: "Domingo à noite, antes de montar a lista.",
    href: "/insumos/contagem",
  },
];

/**
 * O que existe fora dos cinco destinos da navegação.
 *
 * A página não repete o que o estado vazio de cada uma já diz — o estado vazio
 * ensina a tela em que ele está, e este guia ensina que a tela existe
 * (`DECISOES.md#d70`). Por isso cada uma aparece com o **momento da semana** em
 * que ela serve: é o gatilho, e é o que nenhuma tela pode dizer sobre si mesma.
 */
export function OQueMaisTem() {
  return (
    <>
      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        {FUNCIONALIDADES.map(({ icone: Icone, ...funcionalidade }, indice) => (
          <li
            key={funcionalidade.nome}
            className={indice > 0 ? "border-t border-line" : undefined}
          >
            <Link
              href={funcionalidade.href}
              className="flex items-start gap-3 px-4 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
            >
              <Icone
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-ink-muted"
                strokeWidth={1.75}
              />

              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">
                  {funcionalidade.nome}
                </span>
                <span className="mt-1 block max-w-[56ch] text-label text-ink-muted">
                  {funcionalidade.frase}
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-micro font-medium text-ink-subtle">
                  <Clock aria-hidden className="size-3.5" strokeWidth={1.75} />
                  {funcionalidade.momento}
                </span>
              </span>

              <ChevronRight
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-ink-subtle"
                strokeWidth={1.75}
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* A meta ganha um parágrafo aqui e não um passo (`DECISOES.md#d66`): ela
          é a única coisa do sistema que fica melhor depois, e não antes. */}
      <p className="mt-4 max-w-[62ch] text-label text-ink-muted">
        <span className="font-semibold text-ink">A meta do mês</span> não é um
        passo do começo, e é de propósito. Ela mora no{" "}
        <Link
          href="/financeiro"
          className="font-medium text-wine-700 underline decoration-line-strong underline-offset-4 hover:decoration-current dark:text-wine-300"
        >
          Caixa
        </Link>
        , e fica bem melhor depois de algumas fichas e algumas encomendas: o
        alvo em doces sai do preço médio das suas fichas, e o alvo em encomendas
        sai do que as suas clientes de fato gastam. Definida na primeira semana,
        seria um palpite; definida na segunda, é uma conta.
      </p>
    </>
  );
}
