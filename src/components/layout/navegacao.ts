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
  /** Rótulo curto para a navegação inferior, onde cabem poucos caracteres. */
  curto: string;
  icone: LucideIcon;
}

/**
 * Cinco destinos, o teto do que cabe numa navegação inferior sem virar alvo
 * pequeno demais. Configuração não é um destino: é ajuste, e mora no cabeçalho.
 */
export const DESTINOS: Destino[] = [
  { href: "/", rotulo: "Hoje", curto: "Hoje", icone: Home },
  {
    href: "/insumos",
    rotulo: "Insumos",
    curto: "Insumos",
    icone: ShoppingBasket,
  },
  {
    href: "/fichas",
    rotulo: "Fichas técnicas",
    curto: "Fichas",
    icone: BookOpen,
  },
  {
    href: "/pedidos",
    rotulo: "Pedidos",
    curto: "Pedidos",
    icone: ClipboardList,
  },
  { href: "/financeiro", rotulo: "Caixa", curto: "Caixa", icone: Wallet },
];

export function destinoAtivo(caminho: string, href: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
}
