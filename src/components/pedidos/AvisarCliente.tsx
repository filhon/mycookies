"use client";

import { useMemo, useState } from "react";
import { Info, MessageCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { pixDoPedido } from "@/lib/domain/acompanhamento";
import { dataISODe } from "@/lib/domain/datas";
import { faltaPagar } from "@/lib/domain/pedido";
import {
  linkDoWhatsApp,
  mensagemDoPasso,
  primeiroNome,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import { docConfiguracao } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { ConfiguracaoGeral, Pedido, StatusPedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { ParaQuemVai } from "./BlocoWhatsApp";
import { useLinkDoAcompanhamento } from "./useLinkDoAcompanhamento";

/**
 * O aviso que sai com o passo (spec 173, `#d390`): logo depois de o pedido ir
 * para confirmado ou pronto, o WhatsApp da cliente com a frase do passo e o
 * link. Ela toca e manda do número dela; nada sai sozinho. Some no toque de
 * qualquer dos dois e não volta: é o momento do passo, não um lembrete.
 *
 * Sem rede, igual: o status já está na fila do aparelho, e o link e a chave
 * saem do mesmo caminho do "Mandar o resumo" (`useLinkDoAcompanhamento`).
 */
export function AvisarCliente({
  pedido,
  status,
  aoFechar,
}: {
  pedido: Pedido;
  /** O passo para onde acabou de ir: o documento pode ainda não ter chegado. */
  status: StatusPedido;
  aoFechar: () => void;
}) {
  const contaId = useContaId();
  const acompanhamento = useLinkDoAcompanhamento(pedido);
  const referencia = useMemo(() => docConfiguracao(contaId), [contaId]);
  const configuracao = useDocumento<ConfiguracaoGeral>(referencia).dado;
  const [hoje] = useState(() => dataISODe(new Date()));

  const falta = faltaPagar(pedido);
  const pix = pixDoPedido(
    { ...pedido, status },
    configuracao?.formasPagamento ?? [],
    falta,
  );
  const mensagem = mensagemDoPasso(status, pedido, hoje, {
    link: acompanhamento.link,
    retirada: configuracao?.retirada?.endereco,
    pix: pix ? falta : undefined,
  });
  if (!mensagem) return null;

  const nome = primeiroNome(pedido.clienteNome);

  return (
    <div role="status" className="rounded-lg bg-info-soft p-4">
      <p className="flex items-start gap-2 text-body font-medium text-ink">
        <Info
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-info"
          strokeWidth={1.75}
        />
        {status === "PRONTO" ? "Pedido pronto." : "Pedido confirmado."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={linkDoWhatsApp(
            telefoneParaWhatsApp(pedido.clienteTelefone),
            mensagem,
          )}
          target="_blank"
          rel="noopener noreferrer"
          // Depois de o link abrir, como na `FaixaAnotado`: tirar o `<a>` no
          // meio do clique é pedir para o aparelho desistir dele.
          onClick={() => {
            acompanhamento.garantir();
            setTimeout(aoFechar);
          }}
          className={classesBotao({ variante: "secundaria", tamanho: "lg" })}
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          {nome ? `Avisar a ${nome}` : "Avisar a cliente"}
        </a>
        <Botao variante="terciaria" onClick={aoFechar}>
          Agora não
        </Botao>
      </div>
      <ParaQuemVai telefone={pedido.clienteTelefone} />
    </div>
  );
}
