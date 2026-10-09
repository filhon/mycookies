"use client";

import { ChevronRight, MessageCircle } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import { resumoDaCliente } from "@/lib/domain/clientes";
import { dataISODe, rotuloDia } from "@/lib/domain/datas";
import {
  linkDoWhatsApp,
  mensagemDeVolta,
  primeiroNome,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import type { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * As cinco colunas da tabela (`#d310`): Cliente · Pedidos · Média · Último ·
 * Total. `minmax(0, …)` deixa a célula quebrar em vez de empurrar a tabela.
 */
export const COLUNAS_CLIENTE =
  "grid-cols-[minmax(0,2.4fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)]";

/**
 * Onde a tabela começa (`#d310`): sem a ficha, em `xl`; com a ficha acoplada
 * ao lado, em `2xl`, como a mesa de Pedidos (`#d253`). Antes disso, a linha do
 * celular. Classes inteiras, e não um prefixo montado, para o Tailwind achá-las.
 */
export function arranjoDaTabela(comFicha: boolean) {
  return comFicha
    ? {
        celular: "2xl:hidden",
        grade: "2xl:grid",
        cabecalho: "2xl:flex",
        vaga: "2xl:block 2xl:w-32",
      }
    : {
        celular: "xl:hidden",
        grade: "xl:grid",
        cabecalho: "xl:flex",
        vaga: "xl:block xl:w-32",
      };
}

/** A célula sem número: um traço para quem vê, a frase para quem ouve. */
function SemValor({ frase }: { frase: string }) {
  return (
    <>
      <span aria-hidden className="text-ink-subtle">
        —
      </span>
      <span className="sr-only">{frase}</span>
    </>
  );
}

/**
 * A linha da cliente (`#d310`). Dois arranjos no mesmo `<li>`, como
 * `LinhaFicha`, e o `display: none` tira o oculto da árvore de acessibilidade.
 *
 * **No celular**, dois andares: nome e o que ela deixou no caixa em cima, o
 * resumo do que ela pagou embaixo. O contato mora na ficha, formatado.
 *
 * **Na tabela**, as cinco colunas, com o traço da parte dela sob o total, na
 * proporção da que mais gastou: a medida de linha do `DESIGN.md`.
 *
 * Em Sumiram e Uma vez só (`#d309`), `parada` troca "último em …" por "há N
 * dias" e põe "Chamar" ao lado do botão da linha, nunca dentro dele, só com
 * telefone que disca. Na tabela, a vaga dele existe em toda linha, para as
 * colunas não andarem.
 */
export function LinhaCliente({
  cliente,
  aoAbrir,
  parada,
  maiorGasto,
  selecionada = false,
  comFicha = false,
}: {
  cliente: Cliente;
  aoAbrir: (cliente: Cliente) => void;
  parada?: { dias: number | null; negocio: string };
  /** O maior `totalGasto` da lista: o traço é a parte dela nele. */
  maiorGasto: number;
  /** A linha cuja cliente está na ficha ao lado. Só no desktop. */
  selecionada?: boolean;
  /** A ficha acoplada divide a largura: a tabela espera o `2xl`. */
  comFicha?: boolean;
}) {
  const arranjo = arranjoDaTabela(comFicha);
  const pagou = cliente.totalPedidos > 0;
  const ultimoISO =
    pagou && cliente.ultimoPedidoEm
      ? dataISODe(cliente.ultimoPedidoEm.toDate())
      : null;
  const resumo = parada
    ? [
        resumoDaCliente(cliente, null),
        ...(parada.dias != null ? [`há ${parada.dias} dias`] : []),
      ].join(" · ")
    : resumoDaCliente(cliente, ultimoISO);
  const ultimo = parada
    ? parada.dias != null
      ? `há ${parada.dias} dias`
      : null
    : ultimoISO && rotuloDia(ultimoISO);
  const numero = parada ? telefoneParaWhatsApp(cliente.telefone) : null;
  const parte =
    maiorGasto > 0 ? Math.max(0, cliente.totalGasto) / maiorGasto : 0;

  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={() => aoAbrir(cliente)}
        aria-current={selecionada ? "true" : undefined}
        className={cn(
          "block min-w-0 flex-1 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
          selecionada && "bg-sunken",
        )}
      >
        {/* ---- celular, e o desktop estreito ---- */}
        <div className={cn("px-4 py-3", arranjo.celular)}>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
              {cliente.nome}
            </p>
            <Dinheiro centavos={cliente.totalGasto} className="text-ink" />
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          </div>
          <p className="num mt-0.5 pr-8 text-label text-ink-muted">{resumo}</p>
        </div>

        {/* ---- desktop: a linha da tabela ---- */}
        <div
          className={cn(
            "hidden items-center gap-x-4 px-4 py-3",
            arranjo.grade,
            COLUNAS_CLIENTE,
          )}
        >
          <p className="min-w-0 truncate text-body font-semibold text-ink">
            {cliente.nome}
          </p>
          <p className="num text-right text-body text-ink">
            {pagou ? (
              <>
                {cliente.totalPedidos}
                <span className="sr-only">
                  {cliente.totalPedidos === 1
                    ? " pedido pago"
                    : " pedidos pagos"}
                </span>
              </>
            ) : (
              <SemValor frase="ainda sem pedido pago" />
            )}
          </p>
          <p className="text-right text-ink">
            {pagou ? (
              <>
                <span className="sr-only">média </span>
                <Dinheiro centavos={cliente.ticketMedio} />
              </>
            ) : (
              <SemValor frase="sem média" />
            )}
          </p>
          <p className="num text-right text-body text-ink">
            {ultimo ? (
              <>
                <span className="sr-only">último pedido </span>
                {ultimo}
              </>
            ) : (
              <SemValor frase="sem último pedido" />
            )}
          </p>
          <div className="flex flex-col items-end">
            <span className="sr-only">total </span>
            <Dinheiro centavos={cliente.totalGasto} />
            {parte > 0 && (
              <span aria-hidden className="mt-1.5 flex h-1 w-full max-w-28">
                <span
                  style={{ width: `${parte * 100}%` }}
                  className="ml-auto h-full rounded-full bg-brand-ink"
                />
              </span>
            )}
          </div>
        </div>
      </button>
      {parada && (
        <div className={cn("shrink-0 pr-4", !numero && "hidden", arranjo.vaga)}>
          {numero && (
            // Um `<a>`, e não `window.open` (`#d77`): o texto vai pronto e não
            // é enviado.
            <a
              href={linkDoWhatsApp(
                numero,
                mensagemDeVolta({
                  primeiroNome: primeiroNome(cliente.nome),
                  negocio: parada.negocio,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chamar ${cliente.nome} no WhatsApp`}
              className={classesBotao({ tamanho: "sm" })}
            >
              <MessageCircle
                aria-hidden
                className="size-4"
                strokeWidth={1.75}
              />
              Chamar
            </a>
          )}
        </div>
      )}
    </li>
  );
}
