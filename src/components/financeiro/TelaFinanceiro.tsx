"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleAlert, FileText, Plus, RotateCcw } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { BlocoMeta } from "@/components/metas/BlocoMeta";
import { FormularioMeta } from "@/components/metas/FormularioMeta";
import { Botao } from "@/components/ui/Botao";
import { EsqueletoLista, Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import { limiteDoAno } from "@/lib/domain/mei";
import {
  conferirAgregado,
  contasQueRepetemPendentes,
  entradasAteODia,
  mesesDaFaixa,
  noAno,
  parcelasDoResumo,
  pedidosQueEntramNoMes,
  previsaoDoMes,
  ticketMedioDe,
} from "@/lib/domain/caixa";
import { aReceber } from "@/lib/domain/pedido";
import { formatarMoeda } from "@/lib/domain/money";
import {
  competenciaAtual,
  competenciaVizinha,
  dataISODe,
  rotuloCompetencia,
  rotuloMes,
} from "@/lib/domain/datas";
import {
  docConfiguracao,
  docMeta,
  docResumoMensal,
} from "@/lib/firebase/colecoes";
import type { ContextoMeta } from "@/lib/firebase/mutations/metas";
import {
  consultaAgregadosDoPeriodo,
  consultaTransacoesDoMes,
  recalcularMes,
} from "@/lib/firebase/mutations/agregado";
import {
  consultaAgenda,
  consultaEntreguesEmAberto,
} from "@/lib/firebase/mutations/pedidos";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  CategoriaTransacao,
  CompetenciaMensal,
  ConfiguracaoGeral,
  DataISO,
  Meta,
  Pedido,
  ResumoMensal,
  Transacao,
} from "@/lib/types";
import { useAcaoPedida } from "@/lib/acaoPedida";
import { useContaId } from "@/providers/AuthProvider";
import { AteOFimDoMes } from "./AteOFimDoMes";
import { ContasQueRepetem } from "./ContasQueRepetem";
import { DozeMeses } from "./DozeMeses";
import { FormularioTransacao } from "./FormularioTransacao";
import { ID_LISTA_DO_MES, ListaDoMes } from "./ListaDoMes";
import { MovimentoPorDia } from "./MovimentoPorDia";
import { ProdutosDoMes } from "./ProdutosDoMes";
import { LimiteDoAnoMei } from "./RelatorioMei";
import { ResultadoDoMes } from "./ResultadoDoMes";
import { SaidasPorCategoria } from "./SaidasPorCategoria";
import { SeletorMes } from "./SeletorMes";

export function TelaFinanceiro() {
  const contaId = useContaId();

  // O mês corrente é lido uma vez, na montagem: recalculá-lo a cada render
  // faria a tela depender do relógio no meio do desenho.
  const [hoje] = useState(() => new Date());
  const mesCorrente = competenciaAtual(hoje);
  const [competencia, setCompetencia] =
    useState<CompetenciaMensal>(mesCorrente);

  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState<Transacao | null>(
    null,
  );
  const [modelo, setModelo] = useState<Transacao | null>(null);
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

  // O que vem até o fim do mês só existe no mês corrente (`#d262`): fora
  // dele, as três assinaturas ficam desligadas.
  const ehMesCorrente = competencia === mesCorrente;
  const consultaDaAgenda = useMemo(
    () => (ehMesCorrente ? consultaAgenda(contaId) : null),
    [contaId, ehMesCorrente],
  );
  const consultaDosQueDevem = useMemo(
    () => (ehMesCorrente ? consultaEntreguesEmAberto(contaId) : null),
    [contaId, ehMesCorrente],
  );
  const consultaDoMesAnterior = useMemo(
    () =>
      ehMesCorrente
        ? consultaTransacoesDoMes(contaId, competenciaVizinha(mesCorrente, -1))
        : null,
    [contaId, ehMesCorrente, mesCorrente],
  );

  // Uma assinatura para a faixa dos doze meses, o ano do mês aberto e o mês
  // anterior da comparação (`#d264`, `#d265`). A faixa termina no corrente;
  // abrir março não a encolhe.
  const anoAberto = `${competencia.slice(0, 4)}-01`;
  const deAgregado = [
    competenciaVizinha(mesCorrente, -11),
    competenciaVizinha(anoAberto, -1),
  ].sort()[0]!;
  const ateAgregado = competencia > mesCorrente ? competencia : mesCorrente;
  const consultaDosAgregados = useMemo(
    () => consultaAgregadosDoPeriodo(contaId, deAgregado, ateAgregado),
    [contaId, deAgregado, ateAgregado],
  );

  const lancamentos = useColecao<Transacao>(consulta);
  const agregados = useColecao<ResumoMensal>(consultaDosAgregados);
  const agenda = useColecao<Pedido>(consultaDaAgenda);
  const devem = useColecao<Pedido>(consultaDosQueDevem);
  const mesAnterior = useColecao<Transacao>(consultaDoMesAnterior);
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
  // A razão é refeita na leitura, e não lida do documento: quem é exato são
  // `receitaPedidos` e `qtdPedidos`, porque são incrementos (`#d36`).
  const ticketMedio = ticketMedioDe(
    parcelas.receitaPedidos,
    parcelas.qtdPedidos,
  );
  const carregando =
    lancamentos.carregando || resumo.carregando || meta.carregando;

  // Acréscimo, não resposta: nenhuma das três segura a tela, e enquanto
  // carregam (ou se falham) o bloco não aparece, sem esqueleto.
  const previsaoPronta =
    ehMesCorrente &&
    ![agenda, devem, mesAnterior].some((c) => c.carregando || c.erro);
  const contasPendentes = previsaoPronta
    ? contasQueRepetemPendentes(mesAnterior.dados, lancamentos.dados)
    : [];
  const receber = aReceber(
    previsaoPronta
      ? pedidosQueEntramNoMes([...agenda.dados, ...devem.dados], competencia)
      : [],
  );
  const previsao = previsaoDoMes({
    noCaixa: parcelasDoResumo(resumo.dado).lucro,
    aReceber: receber,
    contasQueRepetem: contasPendentes.map((p) => p.conta),
  });
  const temPrevisao = receber.quantidade > 0 || contasPendentes.length > 0;

  // No corrente, até o dia de hoje; no fechado, o mês inteiro (`#d264`).
  const anterior = agregados.dados.find(
    (a) => a.id === competenciaVizinha(competencia, -1),
  );
  const comparacao = anterior && {
    diferenca: ehMesCorrente
      ? entradasAteODia(parcelas.porDia, hoje.getDate()) -
        entradasAteODia(anterior.porDia ?? {}, hoje.getDate())
      : parcelas.entradas - (anterior.entradas ?? 0),
    mesAnterior: rotuloMes(competenciaVizinha(competencia, -1)),
    dia: ehMesCorrente ? hoje.getDate() : undefined,
  };
  const dozeMeses = (
    <DozeMeses
      meses={mesesDaFaixa(agregados.dados, mesCorrente).meses}
      aberto={competencia}
      ano={noAno(agregados.dados, competencia)}
      aoAbrir={setCompetencia}
    />
  );
  const pendente = lancamentos.pendente || resumo.pendente || meta.pendente;

  // Do dia 1 ao 20 do mês corrente, o relatório que ela precisa preencher é o
  // do mês anterior (`#d269`). O limite lê os agregados que a tela já assina.
  const relatorioDoAnterior = ehMesCorrente && hoje.getDate() <= 20;
  const mesDoRelatorio = relatorioDoAnterior
    ? competenciaVizinha(competencia, -1)
    : competencia;
  const peDoMei = (
    <div className="flex flex-col gap-4">
      <Link
        href={`/financeiro/relatorio-mei/${mesDoRelatorio}`}
        className={classesBotao({
          variante: "terciaria",
          tamanho: "sm",
          className: "self-start",
        })}
      >
        <FileText aria-hidden className="size-4" strokeWidth={1.75} />
        Relatório do MEI de {rotuloMes(mesDoRelatorio)}
        {relatorioDoAnterior && ", até o dia 20"}
      </Link>
      <div className="max-w-md">
        <LimiteDoAnoMei
          compacto
          limite={limiteDoAno(agregados.dados, competencia)}
          competencia={competencia}
          soVenda={lancamentos.dados.every(
            (l) => l.tipo !== "ENTRADA" || l.categoria === "VENDA",
          )}
        />
      </div>
    </div>
  );

  // O mês existe se ele tem lançamento, e não se o documento de agregado
  // existe: um mês em que tudo foi arquivado não tem resultado a mostrar.
  const temMovimento = lancamentos.dados.length > 0;
  // Um botão primário por tela: enquanto o estado vazio ensina a tela, a ação
  // é dele, e o botão do cabeçalho e o "+" saem.
  const estadoVazioNaTela = !carregando && !lancamentos.erro && !temMovimento;

  /**
   * A lista confere o agregado, porque a tela já assina os dois (`#d81`).
   *
   * Fica calada enquanto há escrita pendente: as duas assinaturas não
   * redesenham no mesmo tique, e o agregado pode chegar um quadro depois do
   * lançamento. Um alarme piscando a cada lançamento seria pior do que o
   * silêncio que ele veio quebrar.
   */
  const conferencia = conferirAgregado(lancamentos.dados, parcelas);
  const divergente = !pendente && !conferencia.confere;

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
    setModelo(null);
    setAberturas((anterior) => anterior + 1);
    setPainelAberto(true);
  }

  // "Lançar no caixa" na grade do "+", vindo de outra tela ou desta (`#d241`).
  useAcaoPedida("lancar", () => abrirPainel());

  /** A conta que repete com outro valor: lançamento novo já preenchido. */
  function abrirModelo({
    conta,
    dataISO,
  }: {
    conta: Transacao;
    dataISO: string;
  }) {
    setTransacaoEmEdicao(null);
    setModelo({ ...conta, dataISO });
    setAberturas((anterior) => anterior + 1);
    setPainelAberto(true);
  }

  const aoFimDoMes = temPrevisao && (
    <div className="flex flex-col gap-4">
      <AteOFimDoMes
        competencia={competencia}
        previsao={previsao}
        receber={receber}
        qtdContas={contasPendentes.length}
      />
      <ContasQueRepetem
        pendentes={contasPendentes}
        contaId={contaId}
        formas={formas}
        contextoMeta={contextoMeta}
        aoAbrir={abrirModelo}
      />
    </div>
  );

  // A categoria de "Para onde o dinheiro foi" e o dia de "Movimento por dia"
  // filtrando a lista, presos ao mês em que foram tocados: trocar de mês os
  // solta sem efeito (`#d266`, `#d268`).
  const [filtroDeFora, setFiltroDeFora] = useState<{
    competencia: CompetenciaMensal;
    categoria: CategoriaTransacao | null;
    dia: DataISO | null;
  } | null>(null);
  const deFora =
    filtroDeFora?.competencia === competencia
      ? filtroDeFora
      : { competencia, categoria: null, dia: null };

  function filtrarDeFora(
    mudanca: Partial<Pick<typeof deFora, "categoria" | "dia">>,
  ) {
    setFiltroDeFora({ ...deFora, ...mudanca });
  }

  function filtrarPorCategoria(categoria: CategoriaTransacao) {
    filtrarDeFora({ categoria });
    rolarAteALista();
  }

  function filtrarPorDia(dia: DataISO) {
    filtrarDeFora({ dia });
    rolarAteALista();
  }

  function rolarAteALista() {
    document.getElementById(ID_LISTA_DO_MES)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
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
        pendente={pendente}
        recolhe
        descricao="O que o mês rendeu, e o que passou pelo caixa."
        acao={
          // Só no desktop: no celular, "Lançar no caixa" mora na grade do "+"
          // da navegação inferior (`DECISOES.md#d240`).
          !estadoVazioNaTela && (
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
          )
        }
      >
        <SeletorMes
          competencia={competencia}
          mesCorrente={mesCorrente}
          aoMudar={setCompetencia}
        />
      </CabecalhoPagina>

      {lancamentos.erro ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para carregar este mês"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </div>
      ) : carregando ? (
        <div role="status" aria-label="Carregando" className="mt-4 space-y-4">
          <Esqueleto className="h-56 rounded-lg" />
          <Esqueleto className="h-48 rounded-lg" />
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EsqueletoLista linhas={4} />
          </div>
        </div>
      ) : !temMovimento ? (
        <div className="mt-4 flex flex-col gap-8">
          {aoFimDoMes}

          {/* A meta vem antes do convite a lançar: começo de mês é exatamente
              quando ela define quanto quer faturar, e o mês ainda está vazio. */}
          <BlocoMeta
            competencia={competencia}
            meta={meta.dado}
            realizado={parcelas.entradas}
            ticketMedio={ticketMedio}
            deveEntrar={previsao.deveEntrar}
            aoAbrir={abrirPainelMeta}
          />

          {/* Um buraco aberto pela faixa precisa da faixa para voltar. */}
          {dozeMeses}

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="O mês está em branco."
              descricao="Lance o que entrou e o que saiu. No fim do mês você vê o que sobrou de verdade, já sem a maquininha. A encomenda paga entra sozinha."
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

          {peDoMei}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {/* Uma estrutura só, dois arranjos (`#d267`, como a Hoje no `#d212`):
              na pilha, o mês, até o fim do mês, a meta, os lançamentos, o
              movimento, o ranking e os doze meses; a partir de `xl`, o mês em
              movimento à esquerda e em perspectiva à direita, sem `sticky`. As
              duas seções são `contents` na pilha, e o `order` intercala os
              filhos; o leitor de tela e o teclado seguem o DOM, coluna por
              coluna. */}
          <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-6">
            <section
              aria-labelledby="caixa-o-mes"
              className="contents xl:col-start-1 xl:row-start-1 xl:flex xl:flex-col xl:gap-8"
            >
              <h2 id="caixa-o-mes" className="sr-only">
                O mês
              </h2>

              {divergente && (
                <AgregadoAtrasado
                  entradasDaLista={conferencia.entradas}
                  saidasDaLista={conferencia.saidas}
                  parcelas={parcelas}
                  recalculando={recalculando}
                  aoRecalcular={() => void recalcular()}
                />
              )}

              <div className="order-1 xl:order-0">
                <ResultadoDoMes parcelas={parcelas} comparacao={comparacao} />
              </div>

              <div className="order-2 empty:hidden xl:order-0">
                {aoFimDoMes}
              </div>

              <div className="order-4 xl:order-0">
                {/* Remonta a cada mês: trocar de mês limpa o filtro (`#d266`). */}
                <ListaDoMes
                  key={competencia}
                  lancamentos={lancamentos.dados}
                  competencia={competencia}
                  formaPorId={formaPorId}
                  categoria={deFora.categoria}
                  aoTirarCategoria={() => filtrarDeFora({ categoria: null })}
                  dia={deFora.dia}
                  aoTirarDia={() => filtrarDeFora({ dia: null })}
                  aoAbrir={abrirPainel}
                />
              </div>
            </section>

            <section
              aria-labelledby="caixa-em-perspectiva"
              className="contents xl:col-start-2 xl:row-start-1 xl:flex xl:flex-col xl:gap-8"
            >
              <h2 id="caixa-em-perspectiva" className="sr-only">
                Em perspectiva
              </h2>

              <div className="order-3 xl:order-0">
                <BlocoMeta
                  competencia={competencia}
                  meta={meta.dado}
                  realizado={parcelas.entradas}
                  ticketMedio={ticketMedio}
                  deveEntrar={previsao.deveEntrar}
                  aoAbrir={abrirPainelMeta}
                />
              </div>

              <div className="order-7 empty:hidden xl:order-0">{dozeMeses}</div>

              <div className="order-5 empty:hidden xl:order-0">
                <MovimentoPorDia
                  competencia={competencia}
                  porDia={parcelas.porDia}
                  hoje={ehMesCorrente ? hoje.getDate() : undefined}
                  diaEscolhido={deFora.dia}
                  aoEscolherDia={filtrarPorDia}
                />
              </div>

              {/* O ranking some sozinho em mês sem pedido pago: zero ali é
                  ausência, e ausência não vira linha de R$ 0,00. */}
              <div className="order-6 flex flex-col gap-8 empty:hidden xl:order-0">
                <ProdutosDoMes produtos={parcelas.produtos} />
                <SaidasPorCategoria
                  porCategoriaSaida={parcelas.porCategoriaSaida}
                  saidas={parcelas.saidas}
                  aoFiltrar={filtrarPorCategoria}
                />
              </div>
            </section>
          </div>

          {/* A rede de segurança, e não o caminho normal: no pé, onde não
              disputa atenção. Quem fala quando o número está errado de fato é
              o `AgregadoAtrasado` (`#d81`). */}
          {peDoMei}
          <div>
            <Botao
              variante="terciaria"
              tamanho="sm"
              carregando={recalculando}
              onClick={() => void recalcular()}
              iconeInicial={
                <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
              }
            >
              Refazer as contas do mês
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

      <FormularioTransacao
        chave={String(aberturas)}
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        contaId={contaId}
        transacao={transacaoEmEdicao ?? undefined}
        modelo={modelo ?? undefined}
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
        ticketMedio={ticketMedio}
      />
    </>
  );
}

/**
 * O agregado sendo desmentido pela lista que está logo abaixo (`#d81`).
 *
 * Ícone e texto carregam o aviso, e não só a cor. Diz os dois números em vez de
 * só avisar que há um errado — e traz o botão do recálculo junto, porque quem
 * precisa dele agora não deveria ter de rolar até o pé da tela para achá-lo.
 */
function AgregadoAtrasado({
  entradasDaLista,
  saidasDaLista,
  parcelas,
  recalculando,
  aoRecalcular,
}: {
  entradasDaLista: number;
  saidasDaLista: number;
  parcelas: { entradas: number; saidas: number };
  recalculando: boolean;
  aoRecalcular: () => void;
}) {
  const divergencias = [
    { rotulo: "entraram", lista: entradasDaLista, resumo: parcelas.entradas },
    { rotulo: "saíram", lista: saidasDaLista, resumo: parcelas.saidas },
  ].filter((linha) => linha.lista !== linha.resumo);

  return (
    <section
      aria-labelledby="agregado-atrasado"
      className="rounded-lg border border-attention/30 bg-attention-soft p-4 lg:p-5"
    >
      <h2
        id="agregado-atrasado"
        className="flex items-center gap-2 text-subheading font-semibold text-ink"
      >
        <CircleAlert
          aria-hidden
          className="size-5 shrink-0 text-attention"
          strokeWidth={1.75}
        />
        Estes números estão atrasados
      </h2>

      <ul className="mt-2 space-y-1">
        {divergencias.map((linha) => (
          <li key={linha.rotulo} className="max-w-[60ch] text-label text-ink">
            A lista deste mês soma{" "}
            <strong className="num font-semibold">
              {formatarMoeda(linha.lista)}
            </strong>{" "}
            que {linha.rotulo}, e o resumo está contando{" "}
            <strong className="num font-semibold">
              {formatarMoeda(linha.resumo)}
            </strong>
            .
          </li>
        ))}
      </ul>

      <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
        Os lançamentos abaixo estão todos salvos. Refazer o mês a partir deles
        põe o resumo no lugar. Isso precisa de internet.
      </p>

      <Botao
        tamanho="sm"
        className="mt-3"
        carregando={recalculando}
        onClick={aoRecalcular}
        iconeInicial={
          <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
        }
      >
        Recalcular o mês
      </Botao>
    </section>
  );
}
