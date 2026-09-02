"use client";
import Link from "next/link";
import { useState } from "react";
import { BanknoteArrowUp, Check, Undo2, Wallet } from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { dataISODe, rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { Pedido } from "@/lib/types";

/**
 * Onde a encomenda vira dinheiro no caixa.
 *
 * É uma ação com verbo próprio, como as de status, e por isso fica fora do
 * "Salvar" (`DECISOES.md#d34`): marcar como pago escreve na hora, cria o
 * lançamento e move o resultado do mês.
 *
 * A data que ela escolhe é a do **pagamento**, e não a da entrega. É a
 * diferença que a frase precisa dizer em voz alta, porque é contraintuitiva:
 * uma encomenda entregue em setembro e paga em outubro conta em outubro.
 */
export function BlocoPagamento({
  pedido,
  pagoEmISO,
  aoMudarData,
  aoPagar,
  aoDesfazer,
  ocupado,
  semAgregado,
}: {
  pedido: Pedido;
  /** O dia escolhido enquanto o pedido ainda não foi pago. */
  pagoEmISO: string;
  aoMudarData: (iso: string) => void;
  aoPagar: () => void;
  aoDesfazer: () => void;
  ocupado: boolean;
  /** O agregado do mês do pagamento ainda não chegou: pagar agora torceria. */
  semAgregado: boolean;
}) {
  const [confirmandoDesfazer, setConfirmandoDesfazer] = useState(false);
  const liquido = pedido.total - pedido.custoTaxaPagamento;

  if (pedido.pago) {
    const dia = pedido.pagoEm ? dataISODe(pedido.pagoEm.toDate()) : undefined;

    return (
      <Bloco
        icone={Wallet}
        titulo="Já foi pago"
        descricao="Este pedido virou uma entrada no seu caixa. Desfazer tira o dinheiro de lá e arquiva o lançamento, sem apagar nada."
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Selo
            tom="positivo"
            icone={<Check aria-hidden className="size-3.5" strokeWidth={2} />}
          >
            Pago{dia ? ` em ${rotuloDia(dia)}` : ""}
          </Selo>
          <p className="num text-label text-ink-muted">
            {formatarMoeda(pedido.total)}
            {pedido.custoTaxaPagamento > 0 && (
              <>
                <span className="mx-1.5 text-ink-subtle">·</span>
                {formatarMoeda(liquido)} depois da maquininha
              </>
            )}
          </p>
        </div>

        <p className="text-label text-ink-muted">
          O lançamento está no{" "}
          <Link
            href="/financeiro"
            className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
          >
            caixa
          </Link>
          , no mês em que o dinheiro entrou. Mudar os itens daqui corrige os
          dois de uma vez.
        </p>

        {confirmandoDesfazer ? (
          <div className="rounded-md border border-line-strong bg-sunken p-4">
            <p className="max-w-[60ch] text-label text-ink">
              Desfazer o pagamento tira {formatarMoeda(pedido.total)} do
              resultado do mês e arquiva o lançamento. O pedido continua na
              agenda, no mesmo pé em que está.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                disabled={ocupado}
                onClick={() => setConfirmandoDesfazer(false)}
              >
                Deixar como está
              </Botao>
              <Botao
                tamanho="sm"
                variante="perigo"
                carregando={ocupado}
                onClick={aoDesfazer}
              >
                Desfazer mesmo assim
              </Botao>
            </div>
          </div>
        ) : (
          <Botao
            tamanho="sm"
            disabled={ocupado}
            onClick={() => setConfirmandoDesfazer(true)}
            iconeInicial={
              <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Desfazer o pagamento
          </Botao>
        )}
      </Bloco>
    );
  }

  return (
    <Bloco
      icone={Wallet}
      titulo="Ela já pagou?"
      descricao="Marcar como pago lança a venda no caixa sozinho, com a taxa da maquininha já descontada."
    >
      <Campo
        rotulo="Dia em que o dinheiro entrou"
        type="date"
        value={pagoEmISO}
        onChange={(evento) => aoMudarData(evento.target.value)}
        dica="É esta data que manda no caixa, e não a da entrega: pago em outubro conta em outubro."
      />

      <p className="num text-label text-ink-muted">
        Entra como {formatarMoeda(pedido.total)}
        {pedido.custoTaxaPagamento > 0 ? (
          <>
            , e a maquininha fica com {formatarMoeda(pedido.custoTaxaPagamento)}
            : sobram {formatarMoeda(liquido)} para você.
          </>
        ) : (
          <>, sem taxa de maquininha.</>
        )}
      </p>

      <div>
        <Botao
          variante="primaria"
          tamanho="lg"
          carregando={ocupado}
          disabled={semAgregado}
          onClick={aoPagar}
          iconeInicial={
            <BanknoteArrowUp
              aria-hidden
              className="size-5"
              strokeWidth={1.75}
            />
          }
        >
          Marcar como pago
        </Botao>

        {semAgregado && (
          <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
            Carregando o mês do pagamento. Um instante e o botão libera.
          </p>
        )}
      </div>
    </Bloco>
  );
}
