"use client";

import { useState } from "react";
import { Check, TriangleAlert, Undo2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Painel } from "@/components/ui/Painel";
import { dataISODe, rotuloDia } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  resumoDoRepasse,
  type EntregaAPagar,
  type RepasseFeito,
} from "@/lib/domain/pedido";
import {
  desfazerRepasse,
  pagarEntregas,
} from "@/lib/firebase/mutations/pedidos";
import { cn } from "@/lib/utils/cn";

/** Não é histórico, é conserto do que acabou de acontecer. */
const ACERTOS_VISIVEIS = 3;

/**
 * O acerto da semana com o entregador.
 *
 * As linhas nascem **marcadas**. Um painel que nascesse vazio faria ela tocar
 * sete vezes para fazer o que faz toda semana; desmarcar é a exceção, e é o que
 * ela faz com a entrega que ela mesma levou.
 *
 * Por isso o estado guarda o que foi **desmarcado**, e não o que foi marcado:
 * uma entrega nova que apareça enquanto o painel está aberto já nasce dentro da
 * conta, sem ninguém precisar reabrir nada.
 */
export function PainelEntregas({
  aberto,
  aoFechar,
  contaId,
  entregas,
  esquecidas,
  acertos,
}: {
  aberto: boolean;
  aoFechar: () => void;
  contaId: string;
  entregas: EntregaAPagar[];
  /** Entregas vencidas que ainda não foram marcadas como entregues (`#d83`). */
  esquecidas: number;
  acertos: RepasseFeito[];
}) {
  const [desmarcados, setDesmarcados] = useState<string[]>([]);
  const [dataISO, setDataISO] = useState(() => dataISODe(new Date()));
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  // O painel fica montado o tempo todo para poder animar, então abrir de novo
  // não recomeça nada sozinho: quem recomeça é isto. Sem ele, a linha que ela
  // desmarcou semana passada continuaria desmarcada, e o dia do pagamento
  // continuaria sendo o de então.
  const [estavaAberto, setEstavaAberto] = useState(aberto);
  if (estavaAberto !== aberto) {
    setEstavaAberto(aberto);
    if (aberto) {
      setDesmarcados([]);
      setDataISO(dataISODe(new Date()));
      setConfirmando(null);
      setFalha(null);
    }
  }

  const escolhidas = entregas.filter(
    (entrega) => !desmarcados.includes(entrega.pedidoId),
  );
  const { total } = resumoDoRepasse(escolhidas);

  function alternar(pedidoId: string) {
    setDesmarcados((anterior) =>
      anterior.includes(pedidoId)
        ? anterior.filter((id) => id !== pedidoId)
        : [...anterior, pedidoId],
    );
  }

  async function pagar() {
    if (escolhidas.length === 0) return;
    setOcupado(true);
    setFalha(null);
    try {
      await pagarEntregas(contaId, escolhidas, dataISO);
      setOcupado(false);
      aoFechar();
    } catch {
      setFalha("Não deu para lançar o acerto agora. Tente de novo.");
      setOcupado(false);
    }
  }

  async function desfazer(repasse: RepasseFeito) {
    setOcupado(true);
    setFalha(null);
    try {
      await desfazerRepasse(contaId, repasse);
      setConfirmando(null);
      setOcupado(false);
    } catch {
      setFalha("Não deu para desfazer agora. Tente de novo.");
      setOcupado(false);
    }
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Acertar as entregas"
      descricao="O que você cobrou de entrega é o que você paga ao entregador. Desmarque a que você mesma levou."
      rodape={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-label text-ink-muted">
            {escolhidas.length === 1
              ? "1 entrega escolhida"
              : `${escolhidas.length} entregas escolhidas`}
          </p>
          <Botao
            variante="primaria"
            tamanho="lg"
            carregando={ocupado}
            disabled={escolhidas.length === 0}
            onClick={() => void pagar()}
          >
            Pagar {formatarMoeda(total)}
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        {entregas.length === 0 ? (
          <p className="max-w-[60ch] text-body text-ink-muted">
            Nenhuma entrega esperando acerto. As que você marcar como entregues
            aparecem aqui.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {entregas.map((entrega) => (
              <LinhaEntrega
                key={entrega.pedidoId}
                entrega={entrega}
                marcada={!desmarcados.includes(entrega.pedidoId)}
                aoAlternar={() => alternar(entrega.pedidoId)}
              />
            ))}
          </ul>
        )}

        {entregas.length > 0 && (
          <Campo
            rotulo="Dia em que você pagou"
            type="date"
            value={dataISO}
            onChange={(evento) => setDataISO(evento.target.value)}
            dica="É esta data que manda no caixa, e não a das entregas: pago em outubro conta em outubro."
          />
        )}

        {esquecidas > 0 && (
          <p className="flex max-w-[60ch] items-start gap-2 text-label text-attention">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={2}
            />
            <span>
              {esquecidas === 1
                ? "1 entrega com data vencida ainda não está marcada como entregue, e por isso não entra nesta conta."
                : `${esquecidas} entregas com data vencida ainda não estão marcadas como entregues, e por isso não entram nesta conta.`}
            </span>
          </p>
        )}

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {acertos.length > 0 && (
          <section aria-labelledby="ultimos-acertos" className="pt-1">
            <h3
              id="ultimos-acertos"
              className="text-label font-medium text-ink-muted"
            >
              Últimos acertos
            </h3>

            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {acertos.slice(0, ACERTOS_VISIVEIS).map((repasse) => (
                <LinhaAcerto
                  key={repasse.transacaoId}
                  repasse={repasse}
                  confirmando={confirmando === repasse.transacaoId}
                  ocupado={ocupado}
                  aoPedirConfirmacao={() => setConfirmando(repasse.transacaoId)}
                  aoCancelar={() => setConfirmando(null)}
                  aoDesfazer={() => void desfazer(repasse)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </Painel>
  );
}

/**
 * Uma entrega da conta.
 *
 * A linha inteira é o alvo, como em `LinhaCompra`: a mão que usa isto está
 * conferindo a semana no domingo à noite, e mirar num quadradinho de 20px é o
 * jeito de errar. O quadro marcado carrega o traço do visto — a cor sozinha
 * nunca decide.
 */
function LinhaEntrega({
  entrega,
  marcada,
  aoAlternar,
}: {
  entrega: EntregaAPagar;
  marcada: boolean;
  aoAlternar: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={marcada}
        onClick={aoAlternar}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
            "transition-colors duration-150 ease-quart",
            marcada
              ? "border-wine-700 bg-wine-700 text-on-wine"
              : "border-line-strong",
          )}
        >
          {marcada && <Check className="size-4" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-body font-medium",
              marcada ? "text-ink" : "text-ink-muted",
            )}
          >
            {entrega.clienteNome}
          </span>
          <span className="num mt-0.5 block truncate text-label text-ink-muted">
            {entrega.codigo}
            <span className="mx-1.5 text-ink-subtle">·</span>
            {rotuloDia(entrega.dataEntregaISO)}
          </span>
        </span>

        <span
          className={cn(
            "num shrink-0 text-body font-semibold",
            marcada ? "text-ink" : "text-ink-muted line-through",
          )}
        >
          {formatarMoeda(entrega.valor)}
        </span>
      </button>
    </li>
  );
}

/**
 * Um acerto já feito, com o desfazer em duas etapas: a primeira toca, a segunda
 * confirma. Mesmo arranjo de `BlocoPagamento`, e a frase diz quanto volta e que
 * o lançamento é arquivado, nunca apagado.
 */
function LinhaAcerto({
  repasse,
  confirmando,
  ocupado,
  aoPedirConfirmacao,
  aoCancelar,
  aoDesfazer,
}: {
  repasse: RepasseFeito;
  confirmando: boolean;
  ocupado: boolean;
  aoPedirConfirmacao: () => void;
  aoCancelar: () => void;
  aoDesfazer: () => void;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-body text-ink">
          <span className="num">{rotuloDia(repasse.repassadoEmISO)}</span>
          <span className="mx-1.5 text-ink-subtle">·</span>
          <span className="num text-label text-ink-muted">
            {repasse.quantidade}{" "}
            {repasse.quantidade === 1 ? "entrega" : "entregas"}
          </span>
        </p>
        <p className="num shrink-0 text-body font-semibold text-ink">
          {formatarMoeda(repasse.total)}
        </p>
      </div>

      {confirmando ? (
        <div className="mt-2 rounded-md border border-line-strong bg-sunken p-3">
          <p className="max-w-[60ch] text-label text-ink">
            Desfazer devolve {formatarMoeda(repasse.total)} ao resultado do mês
            e arquiva o lançamento, sem apagar nada. As entregas voltam para a
            conta da semana.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao tamanho="sm" disabled={ocupado} onClick={aoCancelar}>
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
          onClick={aoPedirConfirmacao}
          className="mt-1 -ml-3"
          variante="terciaria"
          iconeInicial={
            <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
          }
        >
          Desfazer
        </Botao>
      )}
    </li>
  );
}
