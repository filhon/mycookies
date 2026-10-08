"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Clock,
  PackageOpen,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";
import { useTelasAbertas, type TelaComFato } from "@/lib/hooks/useTelasAbertas";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";
import { SecaoGuia } from "./SecaoGuia";

interface Funcionalidade {
  icone: LucideIcon;
  nome: string;
  /** O que faz. Uma frase, na voz dela. */
  frase: string;
  /** Em que momento da semana ela aparece. É o gatilho, e não o recurso. */
  momento: string;
  href: Route;
  /** Uma frase a mais, só no Android. */
  noAndroid?: string;
  /** O que diz que ela já usa. Sem fato, nunca é dita como usada nem não usada. */
  fato?: TelaComFato;
}

/** Sem assinatura: o aparelho não muda no meio da leitura. */
const SEM_MUDANCA = () => () => undefined;

/**
 * Pelo user-agent, ao contrário do `InstalarNaTela`: aqui a pergunta é mesmo
 * o sistema, porque o `share_target` só existe no Android (`#d294`).
 */
export function useAndroid(): boolean {
  return useSyncExternalStore(
    SEM_MUDANCA,
    () => /Android/i.test(navigator.userAgent),
    () => false,
  );
}

/**
 * As cinco que não estão na navegação inferior. Cada uma tem a porta na
 * tela do menu de que é consequência (13B, 13D, 3C, 6A); o que só esta
 * página sabe dizer é o momento. A quarta nasceu na 13D
 * (`DECISOES.md#d97`): o pote é a irmã da despensa, um nível acima. A
 * quinta, clientes, tem a porta em `/pedidos` (025).
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
    noAndroid: "No Android, compartilhe o PDF da nota com o Rende.",
    fato: "nota",
  },
  {
    icone: ClipboardList,
    nome: "Contagem da despensa",
    frase:
      "Você abre o armário e diz o que tem, material por material, em uma tela só. Sem contar, o sistema prefere te mandar comprar farinha de novo a te deixar sem farinha no meio da fornada.",
    momento: "Domingo à noite, antes de montar a lista.",
    href: "/insumos/contagem",
    fato: "despensa",
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
    fato: "pronto",
  },
  {
    icone: Users,
    nome: "Clientes",
    frase:
      "Quem compra de você, ordenada por quem mais deixou dinheiro no caixa: quantos pedidos pagou, a média por pedido e quando foi o último. É de lá que se corrige o telefone e se arquiva quem parou de comprar.",
    momento: "Quando for mandar a novidade do mês, ou quiser saber quem sumiu.",
    href: "/clientes",
    fato: "clientes",
  },
];

/**
 * O que existe fora dos cinco destinos da navegação.
 *
 * A página não repete o que o estado vazio de cada uma já diz — o estado vazio
 * ensina a tela em que ele está, e este guia ensina que a tela existe
 * (`DECISOES.md#d70`). Por isso cada uma aparece com o **momento da semana** em
 * que ela serve: é o gatilho, e é o que nenhuma tela pode dizer sobre si mesma.
 *
 * **Em dois grupos pelo fato de cada tela** (`DECISOES.md#d299`): em cima, com a
 * linha inteira, as que ela ainda não abriu e a que não tem fato; embaixo,
 * compactas, as que já usa. Sem os fatos (carregando, ou sem rede e sem cache),
 * a lista inteira e sem grupo. Carrega o próprio título, porque a descrição
 * muda quando as cinco já são dela.
 */
export function OQueMaisTem({ id }: { id: string }) {
  const android = useAndroid();
  const { fatos, temMeta } = useTelasAbertas(useContaId());

  const usa = (funcionalidade: Funcionalidade) =>
    fatos !== null &&
    funcionalidade.fato !== undefined &&
    fatos[funcionalidade.fato];
  // As cinco: nenhuma tela com fato ficou de fora. A lista de compras, sem
  // fato, acompanha as outras quatro.
  const todas =
    fatos !== null &&
    FUNCIONALIDADES.every(
      (funcionalidade) => !funcionalidade.fato || usa(funcionalidade),
    );
  const acima = todas ? [] : FUNCIONALIDADES.filter((f) => !usa(f));
  const abaixo = todas ? FUNCIONALIDADES : FUNCIONALIDADES.filter(usa);
  const metaCompacta = fatos !== null && temMeta;
  // Um grupo só não ganha título: a conta nova vê a lista de hoje.
  const doisGrupos = acima.length > 0 && (abaixo.length > 0 || metaCompacta);

  return (
    <SecaoGuia
      id={id}
      titulo="O que mais tem aqui"
      descricao={
        todas
          ? "As cinco já fazem parte da sua semana."
          : "Cinco telas fora do caminho de todo dia, e que são justamente as que mais poupam trabalho seu."
      }
    >
      {acima.length > 0 && (
        <>
          {doisGrupos && (
            <h3 className={TITULO_DO_GRUPO}>Que você ainda não abriu</h3>
          )}
          <ul className={cn(LISTA, doisGrupos && "mt-2")}>
            {acima.map((funcionalidade) => (
              <LinhaInteira
                key={funcionalidade.nome}
                funcionalidade={funcionalidade}
                android={android}
              />
            ))}
          </ul>
        </>
      )}

      {(abaixo.length > 0 || metaCompacta) && (
        <div className={acima.length > 0 ? "mt-6" : undefined}>
          {doisGrupos && (
            <h3 className={TITULO_DO_GRUPO}>Já fazem parte da sua semana</h3>
          )}
          <ul className={cn(LISTA, doisGrupos && "mt-2")}>
            {abaixo.map(({ icone, nome, href }) => (
              <LinhaCompacta key={nome} icone={icone} nome={nome} href={href} />
            ))}
            {metaCompacta && (
              <LinhaCompacta
                icone={Target}
                nome="A meta do mês"
                href="/financeiro"
              />
            )}
          </ul>
        </div>
      )}

      {!metaCompacta && <NotaDaMeta />}
    </SecaoGuia>
  );
}

const LISTA =
  "divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface";

const TITULO_DO_GRUPO = "text-label font-medium text-ink-muted";

const LINHA =
  "flex gap-3 px-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5";

/** A linha de hoje: ícone, nome, frase e momento. */
function LinhaInteira({
  funcionalidade: { icone: Icone, ...funcionalidade },
  android,
}: {
  funcionalidade: Funcionalidade;
  android: boolean;
}) {
  return (
    <li>
      <Link
        href={funcionalidade.href}
        className={cn(LINHA, "items-start py-4")}
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
            {android &&
              funcionalidade.noAndroid &&
              ` ${funcionalidade.noAndroid}`}
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
  );
}

/** A tela que ela já usa: o nome basta para achar a porta (`#d299`). */
function LinhaCompacta({
  icone: Icone,
  nome,
  href,
}: {
  icone: LucideIcon;
  nome: string;
  href: Route;
}) {
  return (
    <li>
      <Link href={href} className={cn(LINHA, "items-center py-3")}>
        <Icone
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1 text-body font-semibold text-ink">
          {nome}
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </Link>
    </li>
  );
}

/**
 * A meta ganha uma nota aqui e não um passo (`DECISOES.md#d66`): ela é a única
 * coisa do sistema que fica melhor depois, e não antes. A faixa rebaixada é a
 * mesma do convite de instalar, e o ícone alinha com os da lista acima: solta,
 * a frase parecia sobra da seção. Com a meta do mês já feita, vira linha
 * compacta (`#d299`).
 */
function NotaDaMeta() {
  return (
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
        alvo em doces sai do preço médio das suas fichas, e o alvo em encomendas
        sai do que as suas clientes de fato gastam. Definida na primeira semana,
        seria um palpite; definida na segunda, é uma conta.
      </p>
    </div>
  );
}
