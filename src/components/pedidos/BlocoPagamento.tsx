"use client";
import Link from "next/link";
import { useState } from "react";
import { BanknoteArrowUp, Check, HandCoins, Undo2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Selo } from "@/components/ui/Selo";
import { dataISODe, rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { erroDoSinal, quitacao, sinalSugerido } from "@/lib/domain/pedido";
import type { Centavos, Pedido } from "@/lib/types";

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
 *
 * O sinal (`#d279`) mora aqui também: entra no caixa no dia dele, e "marcar
 * como pago" passa a receber o resto. A data do sinal é o mesmo campo do dia
 * em que o dinheiro entrou.
 */
export function BlocoPagamento({
  pedido,
  pagoEmISO,
  aoMudarData,
  aoPagar,
  aoDesfazer,
  aoRegistrarSinal,
  aoDesfazerSinal,
  ocupado,
  semAgregado,
  semAgregadoDoSinal,
  primario,
}: {
  pedido: Pedido;
  /** O dia escolhido enquanto o pedido ainda não foi pago. */
  pagoEmISO: string;
  aoMudarData: (iso: string) => void;
  aoPagar: () => void;
  aoDesfazer: () => void;
  /** Resolve quando o sinal foi gravado; rejeita e o formulário fica aberto. */
  aoRegistrarSinal: (valor: Centavos) => Promise<void>;
  aoDesfazerSinal: () => void;
  ocupado: boolean;
  /** O agregado do mês do pagamento ainda não chegou: pagar agora torceria. */
  semAgregado: boolean;
  /** O mesmo, do mês do sinal: desfazer o sinal espera por ele. */
  semAgregadoDoSinal: boolean;
  /** O âmbar é dele quando receber é o próximo passo e não há o que salvar (`#d271`). */
  primario: boolean;
}) {
  const [confirmandoDesfazer, setConfirmandoDesfazer] = useState(false);
  const [confirmandoSinal, setConfirmandoSinal] = useState(false);
  /** O valor do sinal enquanto ela o escreve; `null` é o formulário fechado. */
  const [valorSinal, setValorSinal] = useState<Centavos | null>(null);
  const [erroSinal, setErroSinal] = useState<string | undefined>();
  const liquido = pedido.total - pedido.custoTaxaPagamento;
  const resto = quitacao(pedido);
  const sinal = pedido.sinal;
  const diaSinal = sinal && rotuloDia(dataISODe(sinal.pagoEm.toDate()));

  async function registrarSinal() {
    if (valorSinal === null) return;
    const erro = erroDoSinal(valorSinal, pedido.total);
    setErroSinal(erro ?? undefined);
    if (erro) return;
    try {
      await aoRegistrarSinal(valorSinal);
      setValorSinal(null);
    } catch {
      // A falha é dita pelo editor; o valor fica para ela tentar de novo.
    }
  }

  if (pedido.pago) {
    const dia = pedido.pagoEm ? dataISODe(pedido.pagoEm.toDate()) : undefined;

    return (
      <div className="space-y-4 border-t border-line pt-4">
        <h3 className="text-label font-semibold text-ink">Já foi pago</h3>
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

        {sinal && (
          <p className="num text-label text-ink-muted">
            O sinal de {formatarMoeda(sinal.valor)} entrou em {diaSinal}, e o
            resto, {formatarMoeda(resto.valor)}, no dia do pagamento.
          </p>
        )}

        <p className="text-label text-ink-muted">
          O lançamento está no{" "}
          <Link
            href="/financeiro"
            className="font-medium text-brand-ink underline underline-offset-2"
          >
            caixa
          </Link>
          , no mês em que o dinheiro entrou. Mudar os itens daqui corrige os
          dois de uma vez.
        </p>

        {confirmandoDesfazer ? (
          <div className="rounded-md border border-line-strong bg-sunken p-4">
            <p className="max-w-[60ch] text-label text-ink">
              {sinal
                ? `Desfazer o pagamento tira o resto, ${formatarMoeda(resto.valor)}, do caixa e o pedido do resultado do mês, e arquiva o lançamento. O sinal de ${formatarMoeda(sinal.valor)} fica.`
                : `Desfazer o pagamento tira ${formatarMoeda(pedido.total)} do resultado do mês e arquiva o lançamento.`}{" "}
              O pedido continua na agenda, no mesmo pé em que está.
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
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <h3 className="text-label font-semibold text-ink">Ela já pagou?</h3>
        <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
          Marcar como pago lança a venda no caixa sozinho, com a taxa da
          maquininha já descontada.
        </p>
      </div>
      <Campo
        rotulo="Dia em que o dinheiro entrou"
        type="date"
        value={pagoEmISO}
        onChange={(evento) => aoMudarData(evento.target.value)}
        dica="É esta data que manda no caixa, e não a da entrega: pago em outubro conta em outubro."
      />

      {sinal ? (
        <p className="num text-label text-ink-muted">
          Entra o resto, {formatarMoeda(resto.valor)}. O sinal de{" "}
          {formatarMoeda(sinal.valor)} entrou em {diaSinal}.
          {resto.custoTaxa > 0 &&
            ` A maquininha fica com ${formatarMoeda(resto.custoTaxa)} deste resto.`}
        </p>
      ) : (
        <p className="num text-label text-ink-muted">
          Entra como {formatarMoeda(pedido.total)}
          {pedido.custoTaxaPagamento > 0 ? (
            <>
              , e a maquininha fica com{" "}
              {formatarMoeda(pedido.custoTaxaPagamento)}: sobram{" "}
              {formatarMoeda(liquido)} para você.
            </>
          ) : (
            <>, sem taxa de maquininha.</>
          )}
        </p>
      )}

      <div>
        {valorSinal === null ? (
          <div className="flex flex-wrap items-center gap-2">
            <Botao
              variante={primario ? "primaria" : "secundaria"}
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
            {/* Um sinal só (`#d279`), e cancelado não recebe. */}
            {!sinal && pedido.status !== "CANCELADO" && (
              <Botao
                variante="terciaria"
                disabled={ocupado}
                onClick={() => {
                  setErroSinal(undefined);
                  setValorSinal(sinalSugerido(pedido.total));
                }}
                iconeInicial={
                  <HandCoins
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                }
              >
                Recebi um sinal
              </Botao>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-line-strong bg-sunken p-4">
            <CampoMoeda
              rotulo="Quanto ela pagou de sinal"
              valor={valorSinal}
              aoMudar={(centavos) => {
                setValorSinal(centavos);
                setErroSinal(undefined);
              }}
              erro={erroSinal}
              dica={`Entra no caixa no dia escolhido acima. O resto, ${formatarMoeda(Math.max(0, pedido.total - valorSinal))}, entra quando você marcar como pago.`}
              className="max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                disabled={ocupado}
                onClick={() => setValorSinal(null)}
              >
                Deixar pra depois
              </Botao>
              <Botao
                tamanho="sm"
                variante={primario ? "primaria" : "secundaria"}
                carregando={ocupado}
                disabled={semAgregado}
                onClick={() => void registrarSinal()}
              >
                Registrar o sinal
              </Botao>
            </div>
          </div>
        )}

        {semAgregado && (
          <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
            Carregando o mês do pagamento. Um instante e o botão libera.
          </p>
        )}
      </div>

      {/* Só sem quitação: quitado, desfazer o pagamento vem antes (`#d279`). */}
      {sinal &&
        (confirmandoSinal ? (
          <div className="rounded-md border border-line-strong bg-sunken p-4">
            <p className="max-w-[60ch] text-label text-ink">
              Desfazer o sinal tira {formatarMoeda(sinal.valor)} do caixa do dia{" "}
              {diaSinal} e arquiva o lançamento. O pedido volta a dever{" "}
              {formatarMoeda(pedido.total)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                disabled={ocupado}
                onClick={() => setConfirmandoSinal(false)}
              >
                Deixar como está
              </Botao>
              <Botao
                tamanho="sm"
                variante="perigo"
                carregando={ocupado}
                disabled={semAgregadoDoSinal}
                onClick={() => {
                  setConfirmandoSinal(false);
                  aoDesfazerSinal();
                }}
              >
                Desfazer mesmo assim
              </Botao>
            </div>
          </div>
        ) : (
          <Botao
            tamanho="sm"
            variante="terciaria"
            disabled={ocupado}
            onClick={() => setConfirmandoSinal(true)}
            iconeInicial={
              <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
            }
          >
            Desfazer o sinal
          </Botao>
        ))}
    </div>
  );
}
