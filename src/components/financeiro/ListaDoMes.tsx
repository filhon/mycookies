"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Pilulas } from "@/components/ui/Pilulas";
import {
  agruparPorDia,
  filtrarLancamentos,
  ROTULO_CATEGORIA_TRANSACAO,
  valorComSinal,
  type TipoNoFiltro,
} from "@/lib/domain/caixa";
import { rotuloDiaDaSemana, rotuloMes } from "@/lib/domain/datas";
import type {
  CategoriaTransacao,
  CompetenciaMensal,
  FormaPagamento,
  Transacao,
} from "@/lib/types";
import { LinhaTransacao } from "./LinhaTransacao";

/** O `id` da seção: "Para onde o dinheiro foi" rola até ela. */
export const ID_LISTA_DO_MES = "lancamentos-do-mes";

/**
 * Os lançamentos do mês por dia, com o jeito de achar um (`#d266`): Entrou ·
 * Saiu, a busca e a categoria vinda de "Para onde o dinheiro foi". Tudo em
 * memória sobre a lista que a tela já assina. O filtro é da visita: a tela
 * remonta a lista a cada mês, e a categoria é dela.
 */
export function ListaDoMes({
  lancamentos,
  competencia,
  formaPorId,
  categoria,
  aoTirarCategoria,
  aoAbrir,
}: {
  lancamentos: Transacao[];
  competencia: CompetenciaMensal;
  formaPorId: Map<string, FormaPagamento>;
  categoria: CategoriaTransacao | null;
  aoTirarCategoria: () => void;
  aoAbrir: (transacao: Transacao) => void;
}) {
  const [tipo, setTipo] = useState<TipoNoFiltro>("TUDO");
  const [texto, setTexto] = useState("");

  const nomeDaForma = (id: string) => formaPorId.get(id)?.nome;
  // A contagem das pílulas respeita a busca e a categoria, e não a pílula.
  const semTipo = filtrarLancamentos(
    lancamentos,
    { tipo: "TUDO", texto, categoria },
    nomeDaForma,
  );
  const visiveis =
    tipo === "TUDO" ? semTipo : semTipo.filter((l) => l.tipo === tipo);
  const filtrando = tipo !== "TUDO" || texto.trim() !== "" || !!categoria;

  const contar = (rotulo: string, quantos: number) =>
    quantos > 0 ? `${rotulo} ${quantos}` : rotulo;
  const pilulas = [
    { valor: "TUDO" as const, rotulo: "Tudo" },
    {
      valor: "ENTRADA" as const,
      rotulo: contar(
        "Entrou",
        semTipo.filter((l) => l.tipo === "ENTRADA").length,
      ),
    },
    {
      valor: "SAIDA" as const,
      rotulo: contar("Saiu", semTipo.filter((l) => l.tipo === "SAIDA").length),
    },
  ];

  function limpar() {
    setTipo("TUDO");
    setTexto("");
    aoTirarCategoria();
  }

  const mes = rotuloMes(competencia);
  const vazio = texto.trim()
    ? `Nada com “${texto.trim()}” em ${mes}.`
    : tipo === "ENTRADA"
      ? `Nenhuma entrada em ${mes}.`
      : `Nenhuma saída em ${mes}.`;

  return (
    <section
      id={ID_LISTA_DO_MES}
      aria-labelledby={`${ID_LISTA_DO_MES}-titulo`}
      // `clip`, e não `hidden`: corta o canto sem virar contêiner de rolagem,
      // e o dia continua grudando abaixo do cabeçalho.
      className="scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)] overflow-clip rounded-lg border border-line bg-surface"
    >
      <h2
        id={`${ID_LISTA_DO_MES}-titulo`}
        className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
      >
        Lançamentos do mês
        <span
          aria-live="polite"
          className="num ml-2 inline-flex flex-wrap items-baseline gap-x-1.5 text-label font-medium text-ink-muted"
        >
          {filtrando ? (
            <>
              <span aria-hidden>·</span>
              {visiveis.length} de {lancamentos.length}
              <span aria-hidden>·</span>
              <Dinheiro
                centavos={visiveis.reduce((s, l) => s + valorComSinal(l), 0)}
                tamanho="sm"
                comSinal
              />
            </>
          ) : (
            lancamentos.length
          )}
        </span>
      </h2>

      <div className="space-y-3 border-b border-line px-4 py-3 lg:px-5">
        <CampoBusca
          rotulo="Buscar no mês"
          placeholder="Buscar no mês"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Pilulas
            rotulo="Mostrar"
            opcoes={pilulas}
            valor={tipo}
            aoMudar={setTipo}
            numerico
            className="max-lg:mx-0 max-lg:px-0"
          />
          {categoria && (
            <button
              type="button"
              onClick={aoTirarCategoria}
              aria-label={`Tirar o filtro ${ROTULO_CATEGORIA_TRANSACAO[categoria]}`}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand-700 pl-4 pr-3 text-label font-medium text-on-brand transition-colors duration-150 ease-quart hover:bg-brand-800"
            >
              {ROTULO_CATEGORIA_TRANSACAO[categoria]}
              <X aria-hidden className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-4 text-body text-ink lg:px-5">
          {vazio}
          <Botao variante="terciaria" tamanho="sm" onClick={limpar}>
            {texto.trim() ? "Limpar a busca" : "Ver tudo"}
          </Botao>
        </p>
      ) : (
        <div className="divide-y divide-line">
          {agruparPorDia(visiveis).map((dia) => (
            <section key={dia.dataISO} aria-labelledby={`dia-${dia.dataISO}`}>
              {/* Gruda abaixo do cabeçalho da tela no celular. */}
              <h3
                id={`dia-${dia.dataISO}`}
                className="top-(--fundo-cabecalho,0px) z-10 flex items-baseline justify-between gap-3 border-b border-line bg-surface px-4 py-2 text-label font-semibold text-ink-muted max-lg:sticky lg:px-5"
              >
                {rotuloDiaDaSemana(dia.dataISO)}
                <Dinheiro centavos={dia.saldo} tamanho="sm" comSinal />
              </h3>
              <ul className="divide-y divide-line">
                {dia.lancamentos.map((transacao) => (
                  <LinhaTransacao
                    key={transacao.id}
                    transacao={transacao}
                    forma={
                      transacao.formaPagamentoId
                        ? formaPorId.get(transacao.formaPagamentoId)
                        : undefined
                    }
                    aoAbrir={aoAbrir}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
