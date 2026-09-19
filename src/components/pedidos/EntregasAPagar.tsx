"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { FaixaResumo } from "./FaixaResumo";
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
 * A mesma `FaixaResumo` de "A receber", logo abaixo dela: a agenda continua
 * sendo o que ela veio ver. Tudo aqui é soma em memória sobre os pedidos que
 * a tela já carregou — nenhuma consulta nova (`#d84`).
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
      <FaixaResumo
        id="entregas-a-pagar"
        icone={Truck}
        titulo="Entregas a pagar"
        valor={quantidade > 0 ? total : undefined}
        acao={
          <Botao tamanho="sm" onClick={() => setAberto(true)}>
            {quantidade === 0 ? "Ver os últimos acertos" : "Acertar entregas"}
          </Botao>
        }
      >
        {quantidade === 0
          ? "Nenhuma entrega esperando acerto agora."
          : `${quantidade} ${quantidade === 1 ? "entrega já feita" : "entregas já feitas"} que você ainda não acertou com o entregador. O que você cobrou é o que você paga.`}
      </FaixaResumo>

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
