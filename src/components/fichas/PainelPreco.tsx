"use client";

import { CornerDownRight, TriangleAlert, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Realce } from "@/components/ui/Realce";
import { RodapeFixo } from "@/components/ui/RodapeFixo";
import type { DerivadosFicha } from "@/lib/domain/custoFicha";
import {
  formatarMoeda,
  formatarMultiplicador,
  formatarPercentual,
} from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Tom = "neutro" | "positivo" | "atencao";

const TONS: Record<Tom, string> = {
  neutro: "border-line bg-sunken text-ink-muted",
  positivo: "border-line bg-sunken text-ink-muted",
  atencao: "border-attention/30 bg-attention-soft text-ink",
};

function Metrica({
  rotulo,
  valor,
  acao,
}: {
  /** Nó, e não texto: em espaço apertado parte do rótulo some. */
  rotulo: ReactNode;
  valor: Centavos | null;
  acao?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-subtle">
        {rotulo}
      </p>
      <p className="mt-0.5 flex items-center gap-2">
        {valor === null ? (
          <span className="text-body font-semibold text-ink-subtle">—</span>
        ) : (
          <Dinheiro centavos={valor} />
        )}
        {acao}
      </p>
    </div>
  );
}

/**
 * O painel que fica preso ao pé da tela enquanto ela monta a receita.
 *
 * Preso porque a pergunta que trouxe a Maynara até aqui — "quanto sobra pra
 * mim?" — não pode depender de rolar até o fim de uma lista de ingredientes.
 * Custo, preço e sobra ficam juntos: preço sozinho não informa nada.
 */
export function PainelPreco({
  derivado,
  precoManual,
  rendimentoValido,
  aoMudarPreco,
  aoUsarSugerido,
}: {
  derivado: DerivadosFicha;
  /** A usuária sobrescreveu o preço sugerido. */
  precoManual: boolean;
  rendimentoValido: boolean;
  aoMudarPreco: (centavos: Centavos) => void;
  aoUsarSugerido: () => void;
}) {
  const { custo, verificacao } = derivado;
  const lucro = verificacao.lucroUnitario;

  const podeVoltarAoSugerido =
    precoManual &&
    derivado.precoArredondado !== null &&
    derivado.precoArredondado !== derivado.precoVenda;

  /**
   * `correcao` separa veredito de pendência, e é o que decide quem sobrevive ao
   * teclado aberto. Um número que ela digitou e está errado é correção e fica;
   * "ainda falta preencher o rendimento" fala de um campo que está no
   * formulário logo acima — o mesmo que a frase estaria cobrindo. Ver
   * `DECISOES.md#d75`.
   */
  function explicar(): {
    tom: Tom;
    correcao: boolean;
    icone: ReactNode;
    mensagem: ReactNode;
  } {
    const alerta = (
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
    );

    if (!rendimentoValido) {
      return {
        tom: "atencao",
        // Pendência, e não veredito: pede um campo que está logo acima.
        correcao: false,
        icone: alerta,
        mensagem:
          "Diga quantas unidades saem de um lote e o preço por unidade aparece aqui.",
      };
    }

    if (derivado.motivoSemPreco === "MARGEM_IMPOSSIVEL") {
      return {
        tom: "atencao",
        correcao: true,
        icone: alerta,
        mensagem:
          "A margem que você pediu mais as taxas passam de 100% do preço. Não existe preço que caiba nisso: diminua a margem ou a taxa.",
      };
    }

    if (derivado.motivoSemPreco === "MARKUP_INVALIDO") {
      return {
        tom: "atencao",
        correcao: true,
        icone: alerta,
        mensagem:
          "Multiplicar o custo por zero não dá preço nenhum. Escolha por quanto multiplicar.",
      };
    }

    // O prejuízo carrega ícone e a palavra: a cor sozinha nunca decide.
    if (lucro < 0) {
      return {
        tom: "atencao",
        correcao: true,
        icone: alerta,
        mensagem: (
          <>
            Neste preço você <strong className="font-semibold">perde</strong>{" "}
            <Realce>{formatarMoeda(Math.abs(lucro))}</Realce> por unidade,
            depois do custo e das taxas.
          </>
        ),
      };
    }

    return {
      tom: "positivo",
      correcao: false,
      icone: (
        <CornerDownRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      ),
      mensagem: (
        <>
          Sobram <Realce>{formatarMoeda(lucro)}</Realce> por unidade depois da
          maquininha. É{" "}
          <Realce>{formatarPercentual(verificacao.margemReal)}</Realce> do
          preço, ou{" "}
          <Realce>{formatarMultiplicador(verificacao.markupReal)}</Realce> o
          custo.
        </>
      ),
    };
  }

  const { tom, correcao, icone, mensagem } = explicar();

  return (
    <RodapeFixo>
      {/* Em espaço apertado os três cabem numa linha só: o rótulo encurta, os
          vãos fecham e o campo estreita. O `flex-wrap` fica de rede — num
          aparelho estreito com preço de três dígitos ele quebra em duas linhas
          em vez de o número ser cortado pelo `overflow-hidden` do cartão. */}
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-4 py-3 apertado:gap-x-3 lg:px-5">
        <div className="flex gap-5 apertado:gap-3">
          <Metrica
            rotulo={
              <>
                Custo<span className="apertado:hidden"> da unidade</span>
              </>
            }
            valor={custo.custoUnitario}
          />
          <Metrica
            rotulo="Sugerido"
            valor={derivado.precoArredondado}
            acao={
              podeVoltarAoSugerido ? (
                <button
                  type="button"
                  onClick={aoUsarSugerido}
                  className="toque -my-2 inline-flex items-center gap-1 rounded-md px-2 text-label font-medium text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100"
                >
                  <Wand2 aria-hidden className="size-4" strokeWidth={1.75} />
                  Usar
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Único campo do painel, com "R$" dentro e "Custo" e "Sugerido" do
            lado: com o teclado aberto o rótulo é o que menos se paga, e ele
            continua sendo o nome do campo para o leitor de tela. */}
        <CampoMoeda
          rotulo="Preço de venda"
          valor={derivado.precoVenda}
          aoMudar={aoMudarPreco}
          rotuloSomeApertado
          className="w-36 shrink-0 apertado:w-32"
        />
      </div>

      {/* Com o teclado aberto sobra só a correção: um número que ela digitou e
          está errado. Confirmação repete o que os três números acima já dizem,
          e pendência pede um campo que está no formulário logo acima — as duas
          esperam ele fechar. Ver `DECISOES.md#d75`. */}
      <div
        className={cn(
          "flex items-start gap-2.5 border-t px-4 py-2.5 text-label lg:px-5",
          TONS[tom],
          !correcao && "apertado:hidden",
        )}
      >
        {icone}
        <p className="max-w-[64ch]">{mensagem}</p>
      </div>
    </RodapeFixo>
  );
}
