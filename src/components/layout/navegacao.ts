import type { Route } from "next";
import {
  BookOpen,
  ClipboardList,
  Home,
  ShoppingBasket,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { rotaSoDaDona } from "@/lib/domain/ajudante";
import { esperaDoCardapio } from "@/lib/domain/pedido";
import { consultaAgenda } from "@/lib/firebase/mutations/pedidos";
import { useColecao } from "@/lib/hooks/useColecao";
import type { PapelNaConta, Pedido } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

export interface Destino {
  href: Route;
  rotulo: string;
  icone: LucideIcon;
}

/**
 * Cinco destinos, o teto do que cabe numa navegação inferior sem virar alvo
 * pequeno demais. Configuração não é um destino: é ajuste, e mora no cabeçalho.
 */
export const DESTINOS: Destino[] = [
  { href: "/", rotulo: "Hoje", icone: Home },
  { href: "/insumos", rotulo: "Materiais", icone: ShoppingBasket },
  { href: "/fichas", rotulo: "Produtos", icone: BookOpen },
  { href: "/pedidos", rotulo: "Pedidos", icone: ClipboardList },
  { href: "/financeiro", rotulo: "Caixa", icone: Wallet },
];

/**
 * O segundo grupo da barra lateral (`DECISOES.md#d236`). O teto de cinco é da
 * navegação inferior, onde cada alvo precisa de 56px; a barra tem a altura da
 * tela. No celular estes dois seguem pelos atalhos e pelos cartões da Hoje.
 */
export const DESTINOS_DA_BARRA: Destino[] = [
  { href: "/compras", rotulo: "Compras", icone: ShoppingCart },
  { href: "/clientes", rotulo: "Clientes", icone: Users },
];

/** Os destinos de quem entrou: a ajudante fica sem "Caixa" (`DECISOES.md#d157`). */
export function destinosDo(
  papel: PapelNaConta,
  destinos: Destino[] = DESTINOS,
): Destino[] {
  return papel === "DONA"
    ? destinos
    : destinos.filter((destino) => !rotaSoDaDona(destino.href));
}

export function destinoAtivo(caminho: string, href: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
}

/**
 * Quantos pedidos do cardápio esperam resposta (`DECISOES.md#d235`). A mesma
 * `consultaAgenda` de `/pedidos` e da Hoje: o SDK junta os ouvintes da mesma
 * consulta num alvo só, e nenhuma leitura nova sai. Sem conta, zero.
 */
export function useEsperaDoCardapio(): number {
  const { contaId } = useAuth();
  const consulta = useMemo(
    () => (contaId ? consultaAgenda(contaId) : null),
    [contaId],
  );
  return useColecao<Pedido>(consulta).dados.filter(esperaDoCardapio).length;
}

/** O que o destino diz ao leitor de tela e no `title`, com a espera em "Pedidos". */
export function rotuloDoDestino(destino: Destino, espera: number): string {
  if (destino.href !== "/pedidos" || espera === 0) return destino.rotulo;
  return `${destino.rotulo}, ${espera} ${espera === 1 ? "pedido do cardápio esperando" : "pedidos do cardápio esperando"}`;
}

/** O número da marca: acima de 9, "9+". */
export function numeroDaEspera(espera: number): string {
  return espera > 9 ? "9+" : String(espera);
}

/**
 * Os dois editores não têm navegação inferior no celular: o cabeçalho tem o
 * voltar e o aparelho volta por gesto (`DECISOES.md#d152`). `/fichas/contagem`
 * e a folha do orçamento ficam de fora — a contagem tem a navegação, e a folha
 * é impressão.
 */
export function semNavegacaoInferior(caminho: string): boolean {
  return (
    /^\/fichas\/(?!contagem$)[^/]+$/.test(caminho) ||
    /^\/pedidos\/[^/]+$/.test(caminho)
  );
}
