"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { PainelEntregas } from "./PainelEntregas";
import {
  entregasAPagar,
  entregasEsquecidas,
  repassesFeitos,
  resumoDoRepasse,
} from "@/lib/domain/pedido";
import { pedidoParaEntrega } from "@/lib/firebase/mutations/pedidos";
import type { DataISO, Pedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/**
 * O outro lado da entrega: quanto ela deve ao entregador.
 *
 * A taxa que a cliente paga já entra no caixa quando o pedido é pago. O que
 * sai, uma vez por semana, não passava por lugar nenhum — e o resultado do mês
 * ficava alto por causa disso (`DECISOES.md#d82`).
 *
 * Faixa rebaixada logo abaixo de "A receber", com o mesmo peso visual: a agenda
 * continua sendo o que ela veio ver. Tudo aqui é soma em memória sobre os
 * pedidos que a tela já carregou — nenhuma consulta nova (`#d84`).
 */
export function EntregasAPagar({
  pedidos,
  hoje,
}: {
  pedidos: Pedido[];
  hoje: DataISO;
}) {
  const contaId = useContaId();
  const [aberto, setAberto] = useState(false);

  const paraEntrega = useMemo(() => pedidos.map(pedidoParaEntrega), [pedidos]);
  const entregas = useMemo(() => entregasAPagar(paraEntrega), [paraEntrega]);
  const acertos = useMemo(() => repassesFeitos(paraEntrega), [paraEntrega]);
  const esquecidas = entregasEsquecidas(paraEntrega, hoje);

  const { total, quantidade } = resumoDoRepasse(entregas);

  // Sem entrega a pagar e sem acerto recente não há assunto, e a faixa some.
  // Com acerto recente ela fica, calada: é o único caminho até "Desfazer", e um
  // acerto lançado por engano precisa ter volta.
  if (quantidade === 0 && acertos.length === 0) return null;

  return (
    <>
      <section
        aria-labelledby="entregas-a-pagar"
        className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-sunken px-4 py-3"
      >
        <h2
          id="entregas-a-pagar"
          className="flex items-center gap-2 text-label font-medium text-ink-muted"
        >
          <Truck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          <span>Entregas a pagar</span>
        </h2>

        {quantidade > 0 && <Dinheiro centavos={total} />}

        <p className="w-full max-w-[64ch] text-label text-ink-muted">
          {quantidade === 0
            ? "Nenhuma entrega esperando acerto agora."
            : `${quantidade} ${quantidade === 1 ? "entrega já feita" : "entregas já feitas"} que você ainda não acertou com o entregador. O que você cobrou é o que você paga.`}
        </p>

        <Botao tamanho="sm" onClick={() => setAberto(true)}>
          {quantidade === 0 ? "Ver os últimos acertos" : "Acertar entregas"}
        </Botao>
      </section>

      <PainelEntregas
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        contaId={contaId}
        entregas={entregas}
        esquecidas={esquecidas}
        acertos={acertos}
      />
    </>
  );
}
