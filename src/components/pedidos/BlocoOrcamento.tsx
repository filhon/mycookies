import Link from "next/link";
import { FileText, TriangleAlert } from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { Campo } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { diasEntre, rotuloDataCompleta } from "@/lib/domain/datas";
import { situacaoDaValidade } from "@/lib/domain/orcamento";
import type { DataISO } from "@/lib/types";

/**
 * O orçamento em papel: a validade, e o caminho até a folha.
 *
 * A ação é um `Link` para a prévia, e não abre em nova aba: a prévia é uma
 * tela do app, e "Voltar ao pedido" é o caminho de volta. A folha lê o que
 * está gravado (`DECISOES.md#d107`), e a linha embaixo diz isso em vez de
 * travar.
 */
export function BlocoOrcamento({
  pedidoId,
  validoAteISO,
  aoMudarValidade,
  hoje,
  temItens,
}: {
  pedidoId: string;
  /** O que está no campo. Vazio é "sem prazo". */
  validoAteISO: string;
  aoMudarValidade: (iso: string) => void;
  hoje: DataISO;
  temItens: boolean;
}) {
  const situacao = situacaoDaValidade(validoAteISO || undefined, hoje);

  return (
    <Bloco
      icone={FileText}
      titulo="Orçamento para empresa"
      descricao="Uma folha com o logotipo, o que está incluído e a assinatura, pronta para virar PDF."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Válido até"
          type="date"
          min={hoje}
          value={validoAteISO}
          onChange={(evento) => aoMudarValidade(evento.target.value)}
          dica={
            situacao === "valido" ? (
              <>Vale por mais {fraseDosDias(diasEntre(hoje, validoAteISO))}.</>
            ) : situacao === "sem-prazo" ? undefined : (
              // Ícone junto da cor: laranja sozinho não diz "vencido".
              <span className="flex items-start gap-1.5 text-attention">
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  {situacao === "vencido"
                    ? `Venceu em ${rotuloDataCompleta(validoAteISO)}.`
                    : "Vence hoje."}{" "}
                  Escolha uma data nova antes de mandar.
                </span>
              </span>
            )
          }
        />
      </div>

      {temItens ? (
        <div>
          <Link
            href={`/pedidos/${pedidoId}/orcamento`}
            className={classesBotao({ variante: "primaria", tamanho: "lg" })}
          >
            <FileText aria-hidden className="size-5" strokeWidth={1.75} />
            Abrir a folha do orçamento
          </Link>
          <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
            A folha mostra o que está salvo. Salve o pedido antes de abrir.
          </p>
        </div>
      ) : (
        <p className="max-w-[60ch] text-label text-ink-muted">
          Adicione o que a empresa pediu. A folha precisa ter o que orçar.
        </p>
      )}
    </Bloco>
  );
}

function fraseDosDias(dias: number): string {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}
