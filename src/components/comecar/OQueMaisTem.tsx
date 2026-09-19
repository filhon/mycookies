import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Clock,
  PackageOpen,
  ShoppingCart,
  Target,
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
 * As quatro que não estão na navegação inferior. Cada uma tem a porta na
 * tela do menu de que é consequência (13B, 13D, 3C, 6A); o que só esta
 * página sabe dizer é o momento. A quarta nasceu na 13D
 * (`DECISOES.md#d97`): o pote é a irmã da despensa, um nível acima.
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
      "O cupom da compra vira uma lista que você confere antes de aprovar: os materiais entram todos de uma vez, já com o preço novo, e a compra ainda é lançada como saída no caixa.",
    momento: "Na volta do mercado, com o cupom ainda na mão.",
    href: "/insumos/nota",
  },
  {
    icone: ClipboardList,
    nome: "Contagem da despensa",
    frase:
      "Você abre o armário e diz o que tem, material por material, em uma tela só. Sem contar, o sistema prefere te mandar comprar farinha de novo a te deixar sem farinha no meio da fornada.",
    momento: "Domingo à noite, antes de montar a lista.",
    href: "/insumos/contagem",
  },
  {
    // O pote aberto, e não o biscoito: para quem faz bolo o biscoito é o
    // ícone errado, e o pacote pede "nada de biscoito" (spec 033, 3.B.7).
    icone: PackageOpen,
    nome: "O que está pronto",
    frase:
      "O que já assou e a massa que está no congelador, produto por produto. Com isso, o produto e a encomenda dizem se dá para atender com o que já está feito, antes de contar a despensa. A fornada que você registra já deixa esse número proposto.",
    momento:
      "No fim do dia de fornada, ou antes de dizer sim a uma encomenda grande.",
    href: "/fichas/contagem",
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

      {/* A meta ganha uma nota aqui e não um passo (`DECISOES.md#d66`): ela é
          a única coisa do sistema que fica melhor depois, e não antes. A faixa
          rebaixada é a mesma do convite de instalar, e o ícone alinha com os
          da lista acima: solta, a frase parecia sobra da seção. */}
      <div className="mt-3 flex gap-3 rounded-lg bg-sunken px-4 py-4 lg:px-5">
        <Target
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <p className="min-w-0 max-w-[62ch] text-label text-ink-muted">
          <span className="font-semibold text-ink">A meta do mês</span> não é um
          passo do começo, e é de propósito. Ela mora no{" "}
          <Link
            href="/financeiro"
            className="font-medium text-brand-ink underline decoration-line-strong underline-offset-4 hover:decoration-current"
          >
            Caixa
          </Link>
          , e fica bem melhor depois de algumas fichas e algumas encomendas: o
          alvo em doces sai do preço médio das suas fichas, e o alvo em
          encomendas sai do que as suas clientes de fato gastam. Definida na
          primeira semana, seria um palpite; definida na segunda, é uma conta.
        </p>
      </div>
    </>
  );
}
