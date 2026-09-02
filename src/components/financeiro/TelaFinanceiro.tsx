"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { BlocoMeta } from "@/components/metas/BlocoMeta";
import { FormularioMeta } from "@/components/metas/FormularioMeta";
import { Botao } from "@/components/ui/Botao";
import { EsqueletoLista, Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { parcelasDoResumo } from "@/lib/domain/caixa";
import {
  competenciaAtual,
  dataISODe,
  rotuloCompetencia,
} from "@/lib/domain/datas";
import {
  docConfiguracao,
  docMeta,
  docResumoMensal,
} from "@/lib/firebase/colecoes";
import type { ContextoMeta } from "@/lib/firebase/mutations/metas";
import {
  consultaTransacoesDoMes,
  recalcularMes,
} from "@/lib/firebase/mutations/transacoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  CompetenciaMensal,
  ConfiguracaoGeral,
  Meta,
  ResumoMensal,
  Transacao,
} from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { FormularioTransacao } from "./FormularioTransacao";
import { LinhaTransacao } from "./LinhaTransacao";
import { MovimentoPorDia } from "./MovimentoPorDia";
import { ResultadoDoMes } from "./ResultadoDoMes";
import { SaidasPorCategoria } from "./SaidasPorCategoria";
import { SeletorMes } from "./SeletorMes";

export function TelaFinanceiro() {
  const contaId = useContaId();

  // O mês corrente é lido uma vez, na montagem: recalculá-lo a cada render
  // faria a tela depender do relógio no meio do desenho.
  const [mesCorrente] = useState(() => competenciaAtual());
  const [competencia, setCompetencia] =
    useState<CompetenciaMensal>(mesCorrente);

  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState<Transacao | null>(
    null,
  );
  const [painelAberto, setPainelAberto] = useState(false);
  const [aberturas, setAberturas] = useState(0);

  const [painelMetaAberto, setPainelMetaAberto] = useState(false);
  const [aberturasMeta, setAberturasMeta] = useState(0);

  const [recalculando, setRecalculando] = useState(false);
  const [avisoRecalculo, setAvisoRecalculo] = useState<string | null>(null);

  const consulta = useMemo(
    () => consultaTransacoesDoMes(contaId, competencia),
    [contaId, competencia],
  );
  const referenciaResumo = useMemo(
    () => docResumoMensal(contaId, competencia),
    [contaId, competencia],
  );
  const referenciaMeta = useMemo(
    () => docMeta(contaId, competencia),
    [contaId, competencia],
  );
  const referenciaConfiguracao = useMemo(
    () => docConfiguracao(contaId),
    [contaId],
  );

  const lancamentos = useColecao<Transacao>(consulta);
  const resumo = useDocumento<ResumoMensal>(referenciaResumo);
  const meta = useDocumento<Meta>(referenciaMeta);
  const configuracao = useDocumento<ConfiguracaoGeral>(referenciaConfiguracao);

  const formas = useMemo(
    () => configuracao.dado?.formasPagamento ?? [],
    [configuracao.dado],
  );
  const formaPorId = useMemo(
    () => new Map(formas.map((forma) => [forma.id, forma])),
    [formas],
  );

  const parcelas = parcelasDoResumo(resumo.dado);
  const carregando =
    lancamentos.carregando || resumo.carregando || meta.carregando;

  // O mês existe se ele tem lançamento, e não se o documento de agregado
  // existe: um mês em que tudo foi arquivado não tem resultado a mostrar.
  const temMovimento = lancamentos.dados.length > 0;

  /**
   * O que a meta precisa saber para andar junto com o dinheiro.
   *
   * A tela já assina os dois documentos, então a mutação não precisa ler nada
   * para reescrever o espelho — e lançar continua funcionando sem rede.
   */
  const contextoMeta: ContextoMeta = {
    competencia,
    meta: meta.dado,
    entradas: parcelas.entradas,
  };

  function abrirPainel(transacao?: Transacao) {
    setTransacaoEmEdicao(transacao ?? null);
    setAberturas((anterior) => anterior + 1);
    setPainelAberto(true);
  }

  function abrirPainelMeta() {
    setAberturasMeta((anterior) => anterior + 1);
    setPainelMetaAberto(true);
  }

  async function recalcular() {
    setAvisoRecalculo(null);
    setRecalculando(true);
    try {
      await recalcularMes(contaId, competencia, meta.dado);
      setAvisoRecalculo(
        `Pronto: ${rotuloCompetencia(competencia)} foi refeito a partir dos ${lancamentos.dados.length} lançamentos da lista.`,
      );
    } catch {
      setAvisoRecalculo(
        "Não deu para recalcular agora. Isso precisa de internet: tente de novo quando houver conexão.",
      );
    } finally {
      setRecalculando(false);
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Caixa"
        descricao="O que entrou, o que saiu, e o que sobrou de verdade."
        acao={
          <Botao
            variante="primaria"
            onClick={() => abrirPainel()}
            className="hidden lg:inline-flex"
            iconeInicial={
              <Plus aria-hidden className="size-5" strokeWidth={2} />
            }
          >
            Lançar
          </Botao>
        }
      >
        <SeletorMes
          competencia={competencia}
          mesCorrente={mesCorrente}
          aoMudar={setCompetencia}
        />
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-end">
        <SeloSincronizacao
          pendente={lancamentos.pendente || resumo.pendente || meta.pendente}
        />
      </div>

      {lancamentos.erro ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para carregar este mês"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </div>
      ) : carregando ? (
        <div role="status" aria-label="Carregando" className="mt-2 space-y-4">
          <Esqueleto className="h-56 rounded-lg" />
          <Esqueleto className="h-48 rounded-lg" />
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EsqueletoLista linhas={4} />
          </div>
        </div>
      ) : !temMovimento ? (
        <div className="mt-2 space-y-4">
          {/* A meta vem antes do convite a lançar: começo de mês é exatamente
              quando ela define quanto quer faturar, e o mês ainda está vazio. */}
          <BlocoMeta
            competencia={competencia}
            meta={meta.dado}
            realizado={parcelas.entradas}
            aoAbrir={abrirPainelMeta}
          />

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo={`Nada lançado em ${rotuloCompetencia(competencia)}`}
              descricao="Por enquanto cada venda entra aqui na mão, junto das compras e das despesas. Quando o módulo de pedidos chegar, o pedido pago vira lançamento sozinho — e o que você digita aqui continua valendo para a venda de balcão que nunca virou pedido."
              acao={
                <Botao
                  variante="primaria"
                  tamanho="lg"
                  onClick={() => abrirPainel()}
                  iconeInicial={
                    <Plus aria-hidden className="size-5" strokeWidth={2} />
                  }
                >
                  Lançar o primeiro
                </Botao>
              }
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          <ResultadoDoMes parcelas={parcelas} />

          <BlocoMeta
            competencia={competencia}
            meta={meta.dado}
            realizado={parcelas.entradas}
            aoAbrir={abrirPainelMeta}
          />

          <MovimentoPorDia competencia={competencia} porDia={parcelas.porDia} />

          <SaidasPorCategoria
            porCategoriaSaida={parcelas.porCategoriaSaida}
            saidas={parcelas.saidas}
          />

          <section
            aria-labelledby="lancamentos-do-mes"
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <h2
              id="lancamentos-do-mes"
              className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
            >
              Lançamentos do mês
              <span className="num ml-2 text-label font-medium text-ink-muted">
                {lancamentos.dados.length}
              </span>
            </h2>

            <ul className="divide-y divide-line">
              {lancamentos.dados.map((transacao) => (
                <LinhaTransacao
                  key={transacao.id}
                  transacao={transacao}
                  forma={
                    transacao.formaPagamentoId
                      ? formaPorId.get(transacao.formaPagamentoId)
                      : undefined
                  }
                  aoAbrir={abrirPainel}
                />
              ))}
            </ul>
          </section>

          {/* A rede de segurança, e não o caminho normal: fica no pé da tela,
              onde não disputa atenção com o que ela veio ver. */}
          <div className="border-t border-line pt-5">
            <p className="max-w-[60ch] text-label text-ink-muted">
              Os números acima são somados a cada lançamento. Se algum deles
              parecer estranho, refazer o mês inteiro a partir da lista põe tudo
              no lugar.
            </p>
            <Botao
              tamanho="sm"
              className="mt-3"
              carregando={recalculando}
              onClick={() => void recalcular()}
              iconeInicial={
                <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Recalcular o mês
            </Botao>
            <p
              aria-live="polite"
              className="mt-2 min-h-5 max-w-[60ch] text-label text-ink-muted"
            >
              {avisoRecalculo}
            </p>
          </div>
        </div>
      )}

      {/* Ação primária ao alcance do polegar, acima da navegação inferior. */}
      <button
        type="button"
        onClick={() => abrirPainel()}
        aria-label="Novo lançamento"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-wine-700 text-on-wine shadow-overlay transition-colors duration-150 ease-quart hover:bg-wine-600 active:bg-wine-800 lg:hidden"
      >
        <Plus aria-hidden className="size-6" strokeWidth={2} />
      </button>

      <FormularioTransacao
        chave={String(aberturas)}
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        contaId={contaId}
        transacao={transacaoEmEdicao ?? undefined}
        formas={formas}
        contextoMeta={contextoMeta}
        dataPadrao={
          competencia === mesCorrente
            ? dataISODe(new Date())
            : `${competencia}-01`
        }
      />

      <FormularioMeta
        chave={String(aberturasMeta)}
        aberto={painelMetaAberto}
        aoFechar={() => setPainelMetaAberto(false)}
        contaId={contaId}
        competencia={competencia}
        meta={meta.dado}
        realizado={parcelas.entradas}
      />
    </>
  );
}
