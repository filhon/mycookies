import type { Route } from "next";
import {
  BookOpen,
  ClipboardList,
  Home,
  ShoppingBasket,
  Wallet,
  type LucideIcon,
} from "lucide-react";

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

export function destinoAtivo(caminho: string, href: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
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
