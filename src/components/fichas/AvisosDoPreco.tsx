"use client";

import { TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { formatarMoeda } from "@/lib/domain/money";
import {
  sobraNoSugerido,
  type AvisoPrecificacao,
  type ParametrosPreco,
} from "@/lib/domain/precificacao";
import type { Centavos } from "@/lib/types";

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * Os avisos de `conferirPrecificacao` de um campo, logo embaixo dele
 * (`#d341`): atenção, e não negativo, porque pode ser a decisão dela. A saída
 * é um toque; nada aqui bloqueia o salvar, e não há "ignorar" gravado.
 */
export function AvisosDoPreco({
  avisos,
  campo,
  custoUnitario,
  parametros,
  porUnidade,
  aoAceitar,
}: {
  avisos: AvisoPrecificacao[];
  campo: AvisoPrecificacao["campo"];
  custoUnitario: Centavos;
  parametros: ParametrosPreco;
  /** "por unidade" no produto; "no doce de R$ 4,00" no padrão da conta. */
  porUnidade: string;
  aoAceitar: (aviso: AvisoPrecificacao) => void;
}) {
  return avisos
    .filter((aviso) => aviso.campo === campo)
    .map((aviso) => {
      const conteudo = textoDoAviso(
        aviso,
        custoUnitario,
        parametros,
        porUnidade,
      );
      if (!conteudo) return null;
      return (
        <div
          key={aviso.tipo}
          className="flex items-start gap-2 text-label text-attention"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <p>{conteudo.texto}</p>
            {conteudo.acao && (
              <Botao
                type="button"
                variante="terciaria"
                tamanho="sm"
                className="-ml-3"
                onClick={() => aoAceitar(aviso)}
              >
                {conteudo.acao}
              </Botao>
            )}
          </div>
        </div>
      );
    });
}

function textoDoAviso(
  aviso: AvisoPrecificacao,
  custoUnitario: Centavos,
  parametros: ParametrosPreco,
  porUnidade: string,
): { texto: string; acao?: string } | null {
  if (aviso.tipo === "TAXA_ZERADA") {
    const taxa = numero(aviso.sugestao.taxaCartaoConsiderada);
    return {
      texto: `Seu ${aviso.sugestao.nome} cobra ${taxa}%. Com zero aqui, o preço não fecha no cartão.`,
      acao: `Usar ${taxa}%`,
    };
  }

  // Sem custo ainda não há consequência em reais, e aviso sem consequência
  // não diz nada que o campo já não diga.
  const sobra =
    custoUnitario > 0 ? sobraNoSugerido(custoUnitario, parametros) : null;
  if (sobra === null) return null;
  const margem = numero(parametros.margemDesejada);
  const inicio = `Sobrar ${margem}% do preço é ${formatarMoeda(sobra)} ${porUnidade}.`;

  if (aviso.tipo === "MARGEM_BAIXA") return { texto: inicio };

  const multiplicando = sobraNoSugerido(custoUnitario, {
    ...parametros,
    ...aviso.sugestao,
  });
  if (multiplicando === null) return { texto: inicio };
  return {
    texto: `${inicio} Se você quis multiplicar o custo por ${margem}, sobram ${formatarMoeda(multiplicando)}.`,
    acao: `Era multiplicar por ${margem}`,
  };
}
