"use client";

import Link from "next/link";
import { CloudOff, ScanLine } from "lucide-react";
import { classesBotao, type TamanhoBotao } from "@/components/ui/estilosBotao";
import { MENSAGEM_FALHA } from "@/lib/domain/notaFiscal";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";

/**
 * A entrada para a leitura de nota.
 *
 * É a única tela do sistema que exige rede: não há como ler uma nota sem falar
 * com o modelo. A saída não é fingir — é **dizer**. Sem conexão a entrada
 * aparece desabilitada, `AvisoLeituraSemRede` explica por quê, e o cadastro à
 * mão continua onde sempre esteve, a um toque de distância. Nenhuma outra tela
 * muda de comportamento por causa desta.
 *
 * O aviso é componente separado porque no cabeçalho de `/insumos` ele não cabe
 * embaixo do botão: em 360px uma frase de trinta caracteres ao lado do título
 * espremeria os dois. Ele vai onde há largura, e o botão fica onde a ação está.
 *
 * Não nasce um segundo botão flutuante no celular: um já existe, e dois
 * disputam o mesmo polegar.
 */
export function EntradaLeitura({ tamanho = "md" }: { tamanho?: TamanhoBotao }) {
  const online = useConexao();

  if (!online) {
    return (
      <span
        aria-disabled
        title={MENSAGEM_FALHA["sem-rede"]}
        className={classesBotao({
          tamanho,
          className: "cursor-not-allowed opacity-45",
        })}
      >
        <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
        Ler uma nota
      </span>
    );
  }

  return (
    <Link href="/insumos/nota" className={classesBotao({ tamanho })}>
      <ScanLine aria-hidden className="size-5" strokeWidth={1.75} />
      Ler uma nota
    </Link>
  );
}

/** A frase que acompanha a entrada desabilitada. Nada, quando há rede. */
export function AvisoLeituraSemRede({
  centralizado = false,
}: {
  centralizado?: boolean;
}) {
  const online = useConexao();
  if (online) return null;

  return (
    <p
      className={cn(
        "flex items-start gap-2 text-label text-ink-muted",
        centralizado && "max-w-[38ch] justify-center text-center",
      )}
    >
      <CloudOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
      <span className="max-w-[60ch]">{MENSAGEM_FALHA["sem-rede"]}</span>
    </p>
  );
}
