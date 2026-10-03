import { Check, MessageCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { rotuloAgenda, rotuloDiaPorExtenso } from "@/lib/domain/datas";
import {
  linkDoWhatsApp,
  mensagemDoPedido,
  telefoneParaWhatsApp,
  type ResumoParaCliente,
} from "@/lib/domain/whatsapp";
import type { DataISO, Pedido } from "@/lib/types";
import { ParaQuemVai } from "./BlocoWhatsApp";

/**
 * O pedido novo acabou de ser salvo, e o próximo passo de quase todo pedido
 * novo é mandar o resumo para a cliente conferir (`#d273`). A ação é o mesmo
 * `<a>` do `BlocoWhatsApp`, e é o âmbar da tela enquanto a faixa existe.
 */
export function FaixaAnotado({
  pedido,
  resumo,
  telefone,
  hoje,
  aoFechar,
}: {
  pedido: Pedido;
  resumo: ResumoParaCliente;
  telefone?: string;
  hoje: DataISO;
  aoFechar: () => void;
}) {
  const dia = rotuloAgenda(pedido.dataEntregaISO, hoje).toLocaleLowerCase(
    "pt-BR",
  );
  const frase =
    pedido.status === "ORCAMENTO"
      ? pedido.validoAteISO
        ? `Orçamento anotado. Válido até ${rotuloDiaPorExtenso(pedido.validoAteISO)}.`
        : `Orçamento anotado. ${pedido.codigo} é para ${dia}.`
      : `Pedido anotado. ${pedido.codigo} está na agenda de ${dia}.`;

  return (
    <div role="status" className="rounded-lg bg-positive-soft p-4">
      <p className="flex items-start gap-2 text-body font-medium text-ink">
        <Check
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-positive"
          strokeWidth={2}
        />
        <span className="num">{frase}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={linkDoWhatsApp(
            telefoneParaWhatsApp(telefone),
            mensagemDoPedido(resumo),
          )}
          target="_blank"
          rel="noopener noreferrer"
          // Depois de o link abrir: tirar o `<a>` no meio do clique é pedir
          // para o aparelho desistir dele.
          onClick={() => setTimeout(aoFechar)}
          className={classesBotao({ variante: "primaria", tamanho: "lg" })}
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          Mandar o resumo pra ela
        </a>
        <Botao variante="terciaria" onClick={aoFechar}>
          Agora não
        </Botao>
      </div>
      <ParaQuemVai telefone={telefone} />
    </div>
  );
}
