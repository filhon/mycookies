"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Painel } from "@/components/ui/Painel";
import {
  liquidoRecebido,
  ROTULO_TIPO_PAGAMENTO,
  taxaCobrada,
  textoPrazo,
  VENDA_EXEMPLO,
} from "@/lib/domain/custosOperacionais";
import { formatarMoeda, parseParaNumero } from "@/lib/domain/money";
import { errosPorCampo, esquemaFormaPagamento } from "@/lib/domain/schemas";
import type { FormaPagamento, TipoPagamento } from "@/lib/types";
import { novoId } from "@/lib/utils/id";

/** O que cada tipo costuma cobrar. Sugestão editável, nunca imposição. */
const SUGESTAO_POR_TIPO: Record<
  TipoPagamento,
  { taxaPercentual: number; prazoRecebimentoDias: number }
> = {
  PIX: { taxaPercentual: 0, prazoRecebimentoDias: 0 },
  DINHEIRO: { taxaPercentual: 0, prazoRecebimentoDias: 0 },
  DEBITO: { taxaPercentual: 1.99, prazoRecebimentoDias: 1 },
  CREDITO: { taxaPercentual: 4.99, prazoRecebimentoDias: 30 },
  CREDITO_PARCELADO: { taxaPercentual: 7.99, prazoRecebimentoDias: 30 },
  TRANSFERENCIA: { taxaPercentual: 0, prazoRecebimentoDias: 1 },
};

const TIPOS = Object.keys(ROTULO_TIPO_PAGAMENTO) as TipoPagamento[];

interface EstadoForma {
  nome: string;
  tipo: TipoPagamento;
  taxaPercentual: string;
  taxaFixa: number;
  prazoRecebimentoDias: string;
  ativo: boolean;
}

function nova(tipo: TipoPagamento = "PIX"): EstadoForma {
  const sugestao = SUGESTAO_POR_TIPO[tipo];
  return {
    nome: ROTULO_TIPO_PAGAMENTO[tipo],
    tipo,
    taxaPercentual: String(sugestao.taxaPercentual).replace(".", ","),
    taxaFixa: 0,
    prazoRecebimentoDias: String(sugestao.prazoRecebimentoDias),
    ativo: true,
  };
}

function daForma(forma: FormaPagamento): EstadoForma {
  return {
    nome: forma.nome,
    tipo: forma.tipo,
    taxaPercentual: String(forma.taxaPercentual).replace(".", ","),
    taxaFixa: forma.taxaFixa,
    prazoRecebimentoDias: String(forma.prazoRecebimentoDias),
    ativo: forma.ativo,
  };
}

export function FormularioFormaPagamento({
  aberto,
  aoFechar,
  aoConfirmar,
  forma,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: (forma: FormaPagamento) => void;
  /** Ausente = nova forma. */
  forma?: FormaPagamento;
}) {
  const [estado, setEstado] = useState<EstadoForma>(
    forma ? daForma(forma) : nova(),
  );
  const [erros, setErros] = useState<Record<string, string>>({});

  // Reinicia quando o painel abre em outra forma.
  const chaveAtual = forma?.id ?? "nova";
  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(forma ? daForma(forma) : nova());
    setErros({});
  }

  const definir = <C extends keyof EstadoForma>(
    campo: C,
    valor: EstadoForma[C],
  ) => setEstado((anterior) => ({ ...anterior, [campo]: valor }));

  /**
   * Trocar o tipo traz a taxa e o prazo típicos daquele tipo, e renomeia só
   * enquanto o nome ainda for o padrão: nome escolhido pela usuária não se
   * perde por causa de um seletor.
   */
  function trocarTipo(proximo: TipoPagamento) {
    const sugestao = SUGESTAO_POR_TIPO[proximo];
    setEstado((anterior) => ({
      ...anterior,
      tipo: proximo,
      nome:
        anterior.nome.trim() === "" ||
        anterior.nome === ROTULO_TIPO_PAGAMENTO[anterior.tipo]
          ? ROTULO_TIPO_PAGAMENTO[proximo]
          : anterior.nome,
      taxaPercentual: String(sugestao.taxaPercentual).replace(".", ","),
      prazoRecebimentoDias: String(sugestao.prazoRecebimentoDias),
    }));
  }

  const taxas = {
    taxaPercentual: parseParaNumero(estado.taxaPercentual),
    taxaFixa: estado.taxaFixa,
  };
  const liquido = liquidoRecebido(VENDA_EXEMPLO, taxas);
  const cobrado = taxaCobrada(VENDA_EXEMPLO, taxas);
  const prazo = Math.trunc(parseParaNumero(estado.prazoRecebimentoDias));

  function confirmar() {
    const resultado = esquemaFormaPagamento.safeParse({
      nome: estado.nome,
      tipo: estado.tipo,
      taxaPercentual: taxas.taxaPercentual,
      taxaFixa: estado.taxaFixa,
      prazoRecebimentoDias: prazo,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    aoConfirmar({
      id: forma?.id ?? novoId(),
      ...resultado.data,
      ativo: estado.ativo,
    });
    aoFechar();
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={forma ? "Editar forma de pagamento" : "Nova forma de pagamento"}
      descricao="A taxa daqui entra em todo preço que o sistema sugerir."
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1">
            Cancelar
          </Botao>
          <Botao variante="primaria" onClick={confirmar} className="flex-[1.6]">
            {forma ? "Salvar forma" : "Adicionar forma"}
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        <Seletor
          rotulo="Tipo"
          value={estado.tipo}
          onChange={(evento) =>
            trocarTipo(evento.target.value as TipoPagamento)
          }
        >
          {TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULO_TIPO_PAGAMENTO[tipo]}
            </option>
          ))}
        </Seletor>

        <Campo
          rotulo="Como você chama"
          required
          value={estado.nome}
          erro={erros.nome}
          dica="O nome que aparece na hora de registrar a venda."
          onChange={(evento) => definir("nome", evento.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Taxa"
            inputMode="decimal"
            sufixo="%"
            value={estado.taxaPercentual}
            erro={erros.taxaPercentual}
            onChange={(evento) =>
              definir("taxaPercentual", evento.target.value)
            }
          />
          <Campo
            rotulo="Prazo"
            inputMode="numeric"
            sufixo="dias"
            value={estado.prazoRecebimentoDias}
            erro={erros.prazoRecebimentoDias}
            onChange={(evento) =>
              definir("prazoRecebimentoDias", evento.target.value)
            }
          />
        </div>

        <CampoMoeda
          rotulo="Taxa fixa por venda"
          valor={estado.taxaFixa}
          aoMudar={(centavos) => definir("taxaFixa", centavos)}
          erro={erros.taxaFixa}
          dica="Algumas maquininhas cobram um valor por transação, além do percentual."
        />

        <div className="rounded-lg bg-sunken px-4 py-4">
          <p className="text-label font-medium text-ink-muted">
            Numa venda de R$ 100,00 você recebe
          </p>
          <p className="num mt-1 font-display text-title font-semibold text-ink">
            {formatarMoeda(liquido)}
          </p>
          <p className="mt-1 text-label text-ink-muted">
            {cobrado > 0
              ? `A taxa fica com ${formatarMoeda(cobrado)}, e o dinheiro ${textoPrazo(prazo)}.`
              : `Sem desconto nenhum, e o dinheiro ${textoPrazo(prazo)}.`}
          </p>
        </div>

        {/* Desativar, nunca apagar: pedidos antigos apontam para esta forma. */}
        {forma && (
          <div className="border-t border-line pt-5">
            <p className="text-label text-ink-muted">
              {estado.ativo
                ? "Desativar tira esta forma da hora de vender. Os pedidos antigos continuam registrados com ela."
                : "Esta forma está desativada e não aparece na hora de vender."}
            </p>
            <Botao
              tamanho="sm"
              className="mt-3"
              onClick={() => definir("ativo", !estado.ativo)}
              iconeInicial={
                estado.ativo ? (
                  <EyeOff aria-hidden className="size-4" strokeWidth={1.75} />
                ) : (
                  <Eye aria-hidden className="size-4" strokeWidth={1.75} />
                )
              }
            >
              {estado.ativo ? "Desativar forma" : "Reativar forma"}
            </Botao>
          </div>
        )}
      </div>
    </Painel>
  );
}
