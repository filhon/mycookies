"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { dataISODe, diaVizinho } from "@/lib/domain/datas";
import { entraNaLista } from "@/lib/domain/listaCompras";
import { colPedidos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Pedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/** A mesma semana da agenda: o que vai para o forno nos próximos dias. */
const DIAS_ADIANTE = 7;

/**
 * O atalho para o mercado, na tela que ela abre de manhã.
 *
 * Só aparece quando há pedido para produzir: um cartão de compras em uma semana
 * sem encomenda seria uma linha permanente dizendo que não há nada a fazer.
 * `/compras` não entra na navegação inferior porque cinco destinos é o teto
 * (`src/components/layout/navegacao.ts`) — chega-se por aqui e por `/pedidos`.
 */
export function CartaoComprasHoje() {
  const contaId = useContaId();
  const [hoje] = useState(() => dataISODe(new Date()));
  const limite = useMemo(() => diaVizinho(hoje, DIAS_ADIANTE), [hoje]);

  const consulta = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        where("dataEntregaISO", ">=", hoje),
        where("dataEntregaISO", "<=", limite),
        orderBy("dataEntregaISO"),
      ),
    [contaId, hoje, limite],
  );

  const { dados, carregando } = useColecao<Pedido>(consulta);

  const paraProduzir = dados.filter((pedido) =>
    entraNaLista(pedido, hoje, limite),
  );

  // Carregando não vira esqueleto: este cartão pode simplesmente não existir, e
  // um bloco cinza que some depois mexeria com a tela embaixo dele.
  if (carregando || paraProduzir.length === 0) return null;

  return (
    <Link
      href="/compras"
      className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      <ShoppingCart
        aria-hidden
        className="size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">
          Ver o que comprar
        </span>
        <span className="num mt-0.5 block text-label text-ink-muted">
          {paraProduzir.length}{" "}
          {paraProduzir.length === 1
            ? "pedido confirmado"
            : "pedidos confirmados"}{" "}
          para os próximos dias
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
    </Link>
  );
}
