"use client";

import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { BASE_CONTROLE } from "./Campo";
import { cn } from "@/lib/utils/cn";

/**
 * O campo de busca com a lupa dentro: a lista de materiais, a de produtos e a
 * busca por toque dos editores. O rótulo vai no `aria-label` porque a lupa e o
 * placeholder já dizem o que ele é, e um rótulo em cima roubaria uma linha do
 * cabeçalho preso ao topo.
 */
export function CampoBusca({
  rotulo,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  rotulo: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle"
        strokeWidth={1.75}
      />
      <input
        type="search"
        autoComplete="off"
        aria-label={rotulo}
        className={cn(BASE_CONTROLE, "border-line-strong pl-10")}
        {...props}
      />
    </div>
  );
}
