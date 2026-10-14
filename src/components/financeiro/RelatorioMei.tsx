"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Timestamp } from "firebase/firestore";
import { CheckCheck, Info, Printer, TriangleAlert, Undo2 } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Painel } from "@/components/ui/Painel";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  competenciaDeISO,
  dataISODe,
  diasNoMes,
  rotuloCompetencia,
  rotuloDiaNoAno,
  rotuloMes,
} from "@/lib/domain/datas";
import {
  comNotaDoRelatorio,
  ehCompetencia,
  formatarCnpj,
  limiteDoAno,
  mudouDepoisDeGuardado,
  notasDoMes,
  prazoDoRelatorio,
  relatorioMei,
  type LimiteDoAno,
  type NotasDoMes,
  type PrazoDoRelatorio,
  type RelatorioMei as Relatorio,
} from "@/lib/domain/mei";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import { docMei } from "@/lib/firebase/colecoes";
import {
  consultaAgregadosDoPeriodo,
  consultaTransacoesDoMes,
} from "@/lib/firebase/mutations/agregado";
import {
  guardarRelatorioMei,
  salvarMei,
} from "@/lib/firebase/mutations/fiscal";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  Centavos,
  CompetenciaMensal,
  DadosMei,
  DataISO,
  GuardadoMei,
  ResumoMensal,
  Transacao,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";
import { SeletorMes } from "./SeletorMes";
import { ROTULO_ATIVIDADE, SeuMei } from "./SeuMei";

/** O "Desfazer" do "Guardei" vive na linha de estado por este tempo (`#d360`). */
const JANELA_DESFAZER_MS = 10_000;
const ID_GUARDAR = "guardar-relatorio-mei";

/** 210 mm a 96 dpi, como em `TelaOrcamento`. */
const LARGURA_DA_FOLHA_PX = 794;

/**
 * As duas escolhas do papel moravam no aparelho até a 150 (`#d269`). Na
 * primeira abertura com o servidor dizendo que `fiscal/mei` não existe, o que
 * houver aqui vai para a conta e sai do aparelho (`#d359`). Navegador que
 * bloqueia armazenamento lança no acesso, e aí não há o que levar.
 */
const CHAVE_ATIVIDADE = "rende:mei-atividade";
const PREFIXO_DA_NOTA = "rende:mei-nota:";

function levarDoAparelho(contaId: string) {
  try {
    const chaves = Object.keys(localStorage).filter(
      (chave) => chave === CHAVE_ATIVIDADE || chave.startsWith(PREFIXO_DA_NOTA),
    );
    if (chaves.length === 0) return;

    const notas: Record<CompetenciaMensal, Centavos> = {};
    for (const chave of chaves) {
      const competencia = chave.slice(PREFIXO_DA_NOTA.length);
      const valor = Math.round(Number(localStorage.getItem(chave)));
      if (ehCompetencia(competencia) && valor > 0) notas[competencia] = valor;
    }
    salvarMei(contaId, {
      atividade:
        localStorage.getItem(CHAVE_ATIVIDADE) === "COMERCIO"
          ? "COMERCIO"
          : "INDUSTRIA",
      ...(Object.keys(notas).length > 0 && { notas }),
    });
    for (const chave of chaves) localStorage.removeItem(chave);
  } catch {
    // Sem armazenamento, não há o que levar.
  }
}

/** O rótulo do portal encurtado, para a lista do celular (`#d363`). */
const LINHAS_DO_PAPEL = [
  ["I", "Revenda sem nota fiscal"],
  ["II", "Revenda com nota fiscal"],
  ["III", "Total do comércio"],
  ["IV", "Venda sem nota fiscal"],
  ["V", "Venda com nota fiscal"],
  ["VI", "Total da indústria"],
  ["VII", "Serviço sem nota fiscal"],
  ["VIII", "Serviço com nota fiscal"],
  ["IX", "Total dos serviços"],
] as const satisfies readonly (readonly [keyof Relatorio, string])[];

const POR_EXTENSO = [
  "",
  "uma",
  "duas",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
];

/**
 * O Relatório Mensal das Receitas Brutas do MEI, montado das vendas do mês
 * (`DECISOES.md#d269`). A folha é o produto da tela (`#d363`): ao lado da
 * coluna em `2xl`, logo depois do botão abaixo dele, e no celular as linhas
 * que têm valor no lugar dela. O limite do ano vem por último, de apoio.
 *
 * O papel é o PDF do navegador, como o orçamento (`#d106`): nada aqui exige
 * rede além das duas leituras, e nada é enviado a ninguém.
 */
export function RelatorioMei({
  competencia,
}: {
  competencia: CompetenciaMensal;
}) {
  const contaId = useContaId();
  const router = useRouter();
  // Lido uma vez, na montagem, como no Caixa: o prazo não muda no meio do desenho.
  const [hoje] = useState(() => dataISODe(new Date()));
  const mesCorrente = competenciaDeISO(hoje);

  const consultaDoMes = useMemo(
    () => consultaTransacoesDoMes(contaId, competencia),
    [contaId, competencia],
  );
  const consultaDoAno = useMemo(
    () =>
      consultaAgregadosDoPeriodo(
        contaId,
        `${competencia.slice(0, 4)}-01`,
        competencia,
      ),
    [contaId, competencia],
  );
  const referenciaMei = useMemo(() => docMei(contaId), [contaId]);
  const lancamentos = useColecao<Transacao>(consultaDoMes);
  const agregados = useColecao<ResumoMensal>(consultaDoAno);
  const mei = useDocumento<DadosMei>(referenciaMei);

  // Só com a ausência dita pelo servidor: o cache de um aparelho novo também
  // diz "não existe", e levar o do aparelho por cima da conta seria perder.
  const semDocumentoNoServidor = !mei.carregando && !mei.doCache && !mei.dado;
  useEffect(() => {
    if (semDocumentoNoServidor) levarDoAparelho(contaId);
  }, [semDocumentoNoServidor, contaId]);

  const [notaEscolhida, setNota] = useState<Centavos | null>(null);
  // Estado da tela, não da conta: desmarcar é exceção (`#d361`).
  const [comAnexo, setComAnexo] = useState(true);
  const atividade = mei.dado?.atividade ?? "INDUSTRIA";
  const comNota = notaEscolhida ?? mei.dado?.notas?.[competencia] ?? 0;

  const [verFolha, setVerFolha] = useState(false);

  function mudarNota(centavos: Centavos) {
    setNota(centavos);
    salvarMei(contaId, { atividade, notas: { [competencia]: centavos } });
  }

  // Depois do diálogo de impressão, o foco vai ao "Já imprimi e guardei": é o
  // passo seguinte, e quem cancelou só não toca.
  useEffect(() => {
    const focar = () => document.getElementById(ID_GUARDAR)?.focus();
    window.addEventListener("afterprint", focar);
    return () => window.removeEventListener("afterprint", focar);
  }, []);

  // O retrato de antes do toque, para o "Desfazer" devolvê-lo (`#d360`).
  const [desfazivel, setDesfazivel] = useState<{
    anterior: GuardadoMei | null;
  } | null>(null);
  useEffect(() => {
    if (!desfazivel) return;
    const fim = setTimeout(() => setDesfazivel(null), JANELA_DESFAZER_MS);
    return () => clearTimeout(fim);
  }, [desfazivel]);

  const guardado = mei.dado?.guardados?.[competencia];

  const cabecalhoCom = (rodape: ReactNode) => (
    <CabecalhoPagina
      titulo="Relatório do MEI"
      descricao="O que você vendeu no mês, no modelo do Portal do Empreendedor."
      voltar={{ href: "/financeiro", rotulo: "Caixa" }}
      pendente={lancamentos.pendente}
      className="print:hidden"
    >
      {/* O mês é a URL: `replace`, para o voltar do aparelho ir ao Caixa. */}
      <SeletorMes
        competencia={competencia}
        mesCorrente={mesCorrente}
        aoMudar={(nova) => router.replace(`/financeiro/relatorio-mei/${nova}`)}
        rodape={rodape}
        className="max-w-md"
      />
    </CabecalhoPagina>
  );
  // Enquanto carrega, a linha do estado guarda o lugar: o mês não pula.
  const cabecalho = cabecalhoCom(null);

  if (lancamentos.erro) {
    return (
      <>
        {cabecalho}
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para carregar este mês"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </div>
      </>
    );
  }

  if (lancamentos.carregando || agregados.carregando || mei.carregando) {
    return (
      <>
        {cabecalho}
        <div role="status" aria-label="Carregando" className="mt-4 space-y-4">
          <Esqueleto className="h-32 rounded-lg" />
          <Esqueleto className="mx-auto h-105 w-full max-w-198.5 rounded-lg" />
        </div>
      </>
    );
  }

  const relatorio = relatorioMei(lancamentos.dados, { atividade, comNota });
  const notas = notasDoMes(lancamentos.dados);
  const anexo = comAnexo && notas.linhas.length > 0;
  const linhaSemNota = atividade === "COMERCIO" ? "I" : "IV";
  const linhaComNota = atividade === "COMERCIO" ? "II" : "V";
  const mes = rotuloMes(competencia);

  const mudou =
    !!guardado && mudouDepoisDeGuardado(guardado, relatorio, atividade);
  const prazo = prazoDoRelatorio(
    competencia,
    hoje,
    guardado && { em: dataISODe(guardado.em.toDate()), mudou },
  );

  function guardar() {
    setDesfazivel({ anterior: guardado ?? null });
    guardarRelatorioMei(contaId, atividade, competencia, {
      em: Timestamp.now(),
      total: relatorio.X,
      comNota: comNotaDoRelatorio(relatorio, atividade),
      atividade,
    });
  }

  function desfazer() {
    if (!desfazivel) return;
    guardarRelatorioMei(contaId, atividade, competencia, desfazivel.anterior);
    setDesfazivel(null);
  }

  // No mês corrente, a contagem vai até hoje.
  const ultimoDia =
    competencia === mesCorrente
      ? Number(hoje.slice(8, 10))
      : diasNoMes(competencia);

  // O número que ela veio conferir: a linha que recebeu o dinheiro, quando é
  // uma só; com nota e sem nota no mesmo mês, o total.
  const comDinheiro = (["I", "II", "IV", "V", "VII", "VIII"] as const).filter(
    (linha) => relatorio[linha] > 0,
  );
  const linhaDoNumero = comDinheiro.length === 1 ? comDinheiro[0] : "X";

  const folhas = (
    <>
      <FolhaMei
        relatorio={relatorio}
        competencia={competencia}
        cnpj={mei.dado?.cnpj}
        nomeEmpresarial={mei.dado?.nomeEmpresarial}
      />
      {anexo && (
        <FolhaNotas
          notas={notas}
          competencia={competencia}
          cnpj={mei.dado?.cnpj}
        />
      )}
    </>
  );

  return (
    <>
      {cabecalhoCom(
        <EstadoDoMes
          prazo={prazo}
          hoje={hoje}
          aoDesfazer={desfazivel ? desfazer : undefined}
        />,
      )}

      {/* A folha à esquerda e a coluna à direita em `2xl` (`#d363`). Abaixo
          dele a coluna é `contents`, e a `order` põe a folha entre as duas
          metades: depois do botão, nunca depois do limite. O DOM segue a
          coluna, então o foco também. */}
      <div className="mt-4 flex flex-col gap-8 print:mt-0 print:block 2xl:grid 2xl:grid-cols-[210mm_20rem] 2xl:items-start">
        <div className="contents print:hidden 2xl:sticky 2xl:top-[calc(var(--fundo-cabecalho,0px)+1rem)] 2xl:col-start-2 2xl:row-start-1 2xl:-m-1 2xl:flex 2xl:max-h-[calc(100dvh-var(--fundo-cabecalho,0px)-2rem)] 2xl:flex-col 2xl:gap-8 2xl:overflow-y-auto 2xl:p-1">
          <section aria-labelledby="o-papel" className="order-1">
            <h2 id="o-papel" className="sr-only">
              Antes de imprimir
            </h2>
            <p className="num font-display text-title font-semibold text-ink">
              {relatorio.vendasContadas === 0 ? (
                `Sem venda em ${mes}.`
              ) : (
                <>
                  {formatarMoeda(relatorio.X)}{" "}
                  <span className="font-sans text-body font-normal text-ink-muted">
                    · linha {linhaDoNumero}
                  </span>
                </>
              )}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
              <span className="num">
                {relatorio.vendasContadas === 0
                  ? "O relatório sai zerado, e ainda vale imprimir e guardar."
                  : `Somado de ${relatorio.vendasContadas} ${relatorio.vendasContadas === 1 ? "venda" : "vendas"} de 1 a ${ultimoDia} de ${mes}`}
              </span>
              <span aria-hidden>·</span>
              <Link
                href={`/financeiro?mes=${competencia}`}
                className="toque inline-flex items-center font-medium text-brand-ink underline underline-offset-2"
              >
                Ver no Caixa
              </Link>
            </p>

            {relatorio.outrasEntradas > 0 && (
              <p className="mt-3 flex max-w-[60ch] items-start gap-2 text-label text-ink-muted">
                <Info
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  <strong className="num font-semibold text-ink">
                    {formatarMoeda(relatorio.outrasEntradas)}
                  </strong>{" "}
                  de outras entradas ficaram fora: só venda é receita. Se alguma
                  era venda, mude a categoria no Caixa.
                </span>
              </p>
            )}

            <div className="mt-6 flex flex-col gap-6">
              <SeuMei mei={mei.dado} />

              <CampoMoeda
                rotulo={`Emiti nota fiscal em ${mes}, no total de`}
                valor={comNota}
                aoMudar={mudarNota}
                dica={`Sai da linha ${linhaSemNota} e vai para a ${linhaComNota}. Sem nota, deixe em zero.`}
                className="sm:max-w-[calc(50%-0.75rem)] 2xl:max-w-none"
              />
            </div>

            {mudou && guardado && (
              <div
                role="status"
                className="mt-6 flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft p-4 text-label text-ink"
              >
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-attention"
                  strokeWidth={1.75}
                />
                <p className="max-w-[60ch]">
                  Mudou depois que você guardou:{" "}
                  {guardado.total !== relatorio.X ? (
                    <EraAgora
                      era={formatarMoeda(guardado.total)}
                      agora={formatarMoeda(relatorio.X)}
                    />
                  ) : guardado.atividade !== atividade ? (
                    <>
                      a atividade{" "}
                      <EraAgora
                        era={ROTULO_ATIVIDADE[guardado.atividade].toLowerCase()}
                        agora={ROTULO_ATIVIDADE[atividade].toLowerCase()}
                      />
                    </>
                  ) : (
                    <>
                      com nota{" "}
                      <EraAgora
                        era={formatarMoeda(guardado.comNota)}
                        agora={formatarMoeda(
                          comNotaDoRelatorio(relatorio, atividade),
                        )}
                      />
                    </>
                  )}{" "}
                  Imprima de novo e troque a folha.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col items-start gap-2">
              {notas.linhas.length > 0 && (
                <label className="toque flex cursor-pointer items-center gap-3 text-body text-ink">
                  <input
                    type="checkbox"
                    checked={comAnexo}
                    onChange={(evento) => setComAnexo(evento.target.checked)}
                    className="size-5 shrink-0"
                  />
                  Imprimir a lista de notas junto
                </label>
              )}
              <Botao
                variante="primaria"
                tamanho="lg"
                onClick={() => window.print()}
                className="w-full md:w-auto 2xl:w-full"
                iconeInicial={
                  <Printer aria-hidden className="size-5" strokeWidth={1.75} />
                }
              >
                Imprimir ou salvar em PDF
              </Botao>
              {/* Mês aberto não se guarda: ainda vai mudar (`#d360`). */}
              {prazo.estado !== "aberto" && (
                <Botao
                  id={ID_GUARDAR}
                  variante="secundaria"
                  tamanho="lg"
                  onClick={guardar}
                  className="w-full md:w-auto 2xl:w-full"
                  iconeInicial={
                    <CheckCheck
                      aria-hidden
                      className="size-5"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Já imprimi e guardei
                </Botao>
              )}
              <p className="max-w-[60ch] text-label text-ink-muted">
                Confira os números antes de assinar. O relatório não é enviado a
                ninguém: você guarda, com as notas de compra do mês.
              </p>
            </div>

            <LinhasComValor
              relatorio={relatorio}
              aoVerFolha={() => setVerFolha(true)}
            />
          </section>

          <div className="order-3 flex flex-col gap-6">
            <NotasDeCompra notas={notas} competencia={competencia} />
            <div>
              <LimiteDoAnoMei
                limite={limiteDoAno(
                  agregados.dados,
                  competencia,
                  mei.dado?.abertura,
                  mei.dado?.antes?.[competencia.slice(0, 4)],
                )}
                competencia={competencia}
                soVenda={relatorio.outrasEntradas === 0}
              />
              <Link
                href={`/financeiro/relatorio-mei/${competencia.slice(0, 4)}`}
                className={classesBotao({
                  variante: "terciaria",
                  tamanho: "sm",
                  className: "mt-2 -ml-3",
                })}
              >
                Ver o ano
              </Link>
            </div>
          </div>
        </div>

        {/* No celular a tela mostra as linhas, e a folha fica só para o papel. */}
        <PreviaDaFolha className="order-2 flex flex-col gap-6 max-md:not-print:hidden print:block 2xl:col-start-1 2xl:row-start-1">
          {folhas}
        </PreviaDaFolha>
      </div>

      <Painel
        aberto={verFolha}
        aoFechar={() => setVerFolha(false)}
        titulo="A folha inteira"
        descricao="Como sai na impressão."
      >
        <PreviaDaFolha className="flex flex-col gap-6">{folhas}</PreviaDaFolha>
      </Painel>
    </>
  );
}

/**
 * A prévia da folha com o mesmo `zoom` do orçamento: encolhe para caber, e na
 * impressão volta a 1. Cada prévia mede a própria largura; escondida, mede
 * zero e fica como estava.
 */
function PreviaDaFolha({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [zoom, setZoom] = useState(1);
  const medir = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento) return;
    const observador = new ResizeObserver((entradas) => {
      const largura = entradas[0]?.contentRect.width ?? 0;
      if (largura > 0) setZoom(Math.min(1, largura / LARGURA_DA_FOLHA_PX));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={medir}
      style={{ "--folha-zoom": zoom } as CSSProperties}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * No celular, no lugar da folha: as linhas com valor e a X, em tipo de ler
 * (`#d363`). A folha inteira continua a um toque, e a impressão é sempre ela.
 */
function LinhasComValor({
  relatorio,
  aoVerFolha,
}: {
  relatorio: Relatorio;
  aoVerFolha: () => void;
}) {
  const comValor = LINHAS_DO_PAPEL.filter(([linha]) => relatorio[linha] > 0);
  const zeradas = LINHAS_DO_PAPEL.length - comValor.length;

  return (
    <div className="mt-6 md:hidden">
      <ul className="divide-y divide-line border-y border-line">
        {[...comValor, ["X", "Total do mês"] as const].map(
          ([linha, rotulo]) => (
            <li key={linha} className="flex items-baseline gap-3 py-3">
              <span className="w-9 shrink-0 text-label text-ink-muted">
                {linha}
              </span>
              <span className="min-w-0 flex-1 text-body text-ink">
                {rotulo}
              </span>
              <span className="num text-body font-semibold whitespace-nowrap text-ink">
                {formatarMoeda(relatorio[linha])}
              </span>
            </li>
          ),
        )}
      </ul>
      {zeradas > 0 && (
        <p className="mt-2 text-label text-ink-muted">
          {zeradas === 1
            ? "A outra linha sai zerada na folha."
            : `As outras ${POR_EXTENSO[zeradas]} linhas saem zeradas na folha.`}
        </p>
      )}
      <Botao variante="terciaria" onClick={aoVerFolha} className="mt-2 -ml-3">
        Ver a folha inteira
      </Botao>
    </div>
  );
}

/** "era R$ 2.201,50, agora R$ 2.251,50." na faixa de mudou depois (`#d360`). */
function EraAgora({ era, agora }: { era: string; agora: string }) {
  return (
    <>
      era <strong className="num font-semibold">{era}</strong>, agora{" "}
      <strong className="num font-semibold">{agora}</strong>.
    </>
  );
}

/** "1º de novembro", "20 de outubro", "14 de outubro de 2025". */
function rotuloDoDia(iso: DataISO, hoje: DataISO): string {
  return rotuloDiaNoAno(iso, hoje).replace(/^1 /, "1º ");
}

/**
 * O estado do mês sob o seletor, no lugar do "Voltar para" (`#d360`). Atraso
 * não leva ícone: o relatório entregue depois do 20 não tem multa, e a marca
 * não é alarmista.
 */
function EstadoDoMes({
  prazo,
  hoje,
  aoDesfazer,
}: {
  prazo: PrazoDoRelatorio;
  hoje: DataISO;
  aoDesfazer?: () => void;
}) {
  const dia = rotuloDoDia(prazo.data, hoje);
  if (prazo.estado === "guardado") {
    return (
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-label text-ink">
        <CheckCheck
          aria-hidden
          className="size-4 shrink-0 text-positive"
          strokeWidth={1.75}
        />
        {aoDesfazer ? (
          <>
            Guardado
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={aoDesfazer}
              className="toque inline-flex items-center gap-1 rounded-md px-2 font-medium text-brand-ink underline underline-offset-2 transition-colors duration-150 ease-quart hover:bg-brand-100"
            >
              <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
              Desfazer
            </button>
          </>
        ) : (
          `Guardado em ${dia}`
        )}
      </p>
    );
  }
  if (prazo.estado === "aberto") {
    return (
      <p className="text-label text-ink-muted">
        Ainda aberto. Fica pronto em {dia}.
      </p>
    );
  }
  if (prazo.estado === "atrasado") {
    return (
      <p className="text-label text-ink">
        Era até {dia}. Ainda vale fazer e guardar.
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-1.5 text-label text-ink">
      {prazo.atencao && (
        <TriangleAlert
          aria-hidden
          className="size-4 shrink-0 text-attention"
          strokeWidth={1.75}
        />
      )}
      <span className="num">
        {prazo.faltam === 0
          ? `Vence hoje, ${dia}`
          : `Vence em ${dia} · ${prazo.faltam === 1 ? "falta 1 dia" : `faltam ${prazo.faltam} dias`}`}
      </span>
    </p>
  );
}

/**
 * Quanto do limite do ano já entrou (`#d270`), no pé do relatório e no pé de
 * `/financeiro`. Aviso, nunca erro: o ocre leva o triângulo e a palavra, e
 * toda frase sobre consequência termina no contador.
 *
 * Apoio, e não hero (`#d363`): uma linha com o percentual junto do valor, a
 * barra até `max-w-md` e o traço dos 80%, onde o aviso começa.
 */
export function LimiteDoAnoMei({
  limite,
  competencia,
  soVenda,
}: {
  limite: LimiteDoAno;
  competencia: CompetenciaMensal;
  /** Sem entrada fora de `VENDA` no mês aberto, o verbo é "faturou". */
  soVenda: boolean;
}) {
  const ano = competencia.slice(0, 4);
  const ate = competencia.endsWith("-12")
    ? ""
    : ` até ${rotuloMes(competencia)}`;
  const alerta = limite.estado !== "dentro";
  const percentual = formatarPercentual(limite.percentual, 0);

  return (
    <section aria-labelledby={`limite-mei-${ano}`}>
      <h2
        id={`limite-mei-${ano}`}
        className="text-label font-semibold text-ink"
      >
        Limite do MEI em {ano}
      </h2>

      <p className="mt-1 text-label text-ink-muted">
        {soVenda ? "Você faturou" : "Entrou"}
        {ate}
      </p>
      <p className="num text-body text-ink-muted">
        <span className="font-semibold text-ink">
          {formatarMoeda(limite.entradas)}
        </span>{" "}
        de {formatarMoeda(limite.teto)} ·{" "}
        <span className="font-semibold text-ink">{percentual}</span>
      </p>
      {/* O campo do "antes" mora no ano: daqui, um link para ele (`#d362`). */}
      {limite.antes ? (
        <p className="mt-1 max-w-[60ch] text-label text-ink">
          Inclui{" "}
          <span className="num font-semibold">
            {formatarMoeda(limite.antes.valor)}
          </span>{" "}
          que você informou de {rotuloMes(limite.antes.de)} a{" "}
          {rotuloMes(limite.antes.ate)}.{" "}
          <Link
            href={`/financeiro/relatorio-mei/${ano}#antes`}
            className="toque inline-flex items-center font-medium text-brand-ink underline underline-offset-2"
          >
            Mudar
          </Link>
        </p>
      ) : (
        limite.desde && (
          <p className="mt-1 max-w-[60ch] text-label text-ink">
            Somado desde {rotuloMes(limite.desde)}, quando você começou a lançar
            no Rende.{" "}
            <Link
              href={`/financeiro/relatorio-mei/${ano}#antes`}
              className="toque inline-flex items-center font-medium text-brand-ink underline underline-offset-2"
            >
              Informar o que entrou antes
            </Link>
          </p>
        )
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(100, limite.percentual))}
        aria-valuetext={`${percentual} do limite do MEI; o aviso começa em 80%`}
        className="relative mt-2 h-2 max-w-md overflow-hidden rounded-full bg-sunken"
      >
        <div
          style={{ width: `${Math.min(100, limite.percentual)}%` }}
          className={cn(
            "h-full rounded-full",
            limite.entradas > 0 && "min-w-1",
            alerta ? "bg-attention" : "bg-brand-ink",
          )}
        />
        <div
          aria-hidden
          className="absolute inset-y-0 left-[80%] w-px bg-line-strong"
        />
      </div>

      {alerta && (
        <p className="mt-3 flex max-w-[60ch] items-start gap-2 text-label text-ink">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
          <span>
            {limite.estado === "perto"
              ? "Perto do limite do MEI. Vale conversar com um contador antes de dezembro."
              : "Você passou o limite do MEI neste ano. Até 20% acima, o desenquadramento vale a partir de janeiro; acima disso, ele volta ao começo do ano. Fale com um contador."}
          </span>
        </p>
      )}
    </section>
  );
}

/**
 * O papel, linha por linha como o modelo do Portal do Empreendedor, conferido
 * em 2026-10-02 (`#d269`). Só apresentação.
 *
 * A folha é dela, como a do orçamento (`#d127`): nenhum logotipo, uma linha
 * apagada no rodapé. Tinta sobre branco, pela classe `.folha`, e nenhuma
 * classe `dark:` aqui dentro. CNPJ e nome saem de `fiscal/mei`; sem eles, a
 * linha para ela escrever (`#d359`).
 */
function FolhaMei({
  relatorio,
  competencia,
  cnpj,
  nomeEmpresarial,
}: {
  relatorio: Relatorio;
  competencia: CompetenciaMensal;
  cnpj?: string;
  nomeEmpresarial?: string;
}) {
  return (
    <article className="folha flex flex-col text-[10.5pt] leading-[1.45] shadow-raised">
      <h2 className="border-b-2 border-line-strong pb-[8pt] text-center text-[13pt] font-bold tracking-[0.06em]">
        RELATÓRIO MENSAL DAS RECEITAS BRUTAS
      </h2>

      <div className="mt-[14pt] space-y-[10pt]">
        <EmBranco rotulo="CNPJ:" valor={cnpj && formatarCnpj(cnpj)} />
        <EmBranco rotulo="Empreendedor individual:" valor={nomeEmpresarial} />
        <p>
          Período de apuração:{" "}
          <span className="font-semibold">
            {rotuloCompetencia(competencia)}
          </span>
        </p>
      </div>

      <table className="mt-[16pt] w-full border-collapse">
        <Secao titulo="RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)">
          <Linha numero="I" valor={relatorio.I}>
            Revenda de mercadorias com dispensa de emissão de documento fiscal
          </Linha>
          <Linha numero="II" valor={relatorio.II}>
            Revenda de mercadorias com documento fiscal emitido
          </Linha>
          <Linha numero="III" valor={relatorio.III}>
            Total das receitas com revenda de mercadorias (I + II)
          </Linha>
        </Secao>
        <Secao titulo="RECEITA BRUTA MENSAL – VENDA DE PRODUTOS INDUSTRIALIZADOS (INDÚSTRIA)">
          <Linha numero="IV" valor={relatorio.IV}>
            Venda de produtos industrializados com dispensa de emissão de
            documento fiscal
          </Linha>
          <Linha numero="V" valor={relatorio.V}>
            Venda de produtos industrializados com documento fiscal emitido
          </Linha>
          <Linha numero="VI" valor={relatorio.VI}>
            Total das receitas com venda de produtos industrializados (IV + V)
          </Linha>
        </Secao>
        <Secao titulo="RECEITA BRUTA MENSAL – PRESTAÇÃO DE SERVIÇOS">
          <Linha numero="VII" valor={relatorio.VII}>
            Receita com prestação de serviços com dispensa de emissão de
            documento fiscal
          </Linha>
          <Linha numero="VIII" valor={relatorio.VIII}>
            Receita com prestação de serviços com documento fiscal emitido
          </Linha>
          <Linha numero="IX" valor={relatorio.IX}>
            Total das receitas com prestação de serviços (VII + VIII)
          </Linha>
        </Secao>
        <tbody className="border-t-2 border-line-strong">
          <Linha numero="X" valor={relatorio.X} total>
            Total geral das receitas brutas no mês (III + VI + IX)
          </Linha>
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-2 gap-[12mm] break-inside-avoid">
        <Assinatura rotulo="LOCAL E DATA" />
        <Assinatura rotulo="ASSINATURA DO EMPRESÁRIO" />
      </div>

      <div className="mt-[20pt] text-[8.5pt] break-inside-avoid">
        <p className="font-semibold">ENCONTRAM-SE ANEXADOS A ESTE RELATÓRIO:</p>
        <ul className="mt-[2pt] list-['–_'] pl-[10pt]">
          <li>
            Os documentos fiscais comprobatórios das entradas de mercadorias e
            serviços tomados referentes ao período;
          </li>
          <li>
            As notas fiscais relativas às operações ou prestações realizadas
            eventualmente emitidas.
          </li>
        </ul>
      </div>

      <footer className="mt-auto pt-4 text-[7.5pt] font-medium text-ink-subtle">
        Somado das vendas lançadas no Rende em {rotuloCompetencia(competencia)},
        pelo valor bruto.
      </footer>
    </article>
  );
}

/** "2/set": o dia da compra dentro de uma frase. */
function diaCurto(iso: DataISO, competencia: CompetenciaMensal): string {
  return `${Number(iso.slice(8, 10))}/${rotuloMes(competencia).slice(0, 3)}`;
}

/**
 * Quantas compras do mês têm nota lida, e quais ela precisa achar (`#d361`).
 * As sem nota são aviso e não erro: compra de feira não tem nota, e está certo.
 */
function NotasDeCompra({
  notas,
  competencia,
}: {
  notas: NotasDoMes;
  competencia: CompetenciaMensal;
}) {
  const total = notas.linhas.length;
  if (total === 0) return null;
  const compras = `${total} ${total === 1 ? "compra" : "compras"}`;

  if (notas.semNota === 0) {
    return (
      <p className="mt-1 flex items-start gap-1.5 text-label text-ink">
        <CheckCheck
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-positive"
          strokeWidth={1.75}
        />
        <span>
          Notas de compra: <span className="num">{compras}</span>,{" "}
          {total === 1 ? "com nota lida." : "todas com nota lida."}
        </span>
      </p>
    );
  }

  const faltam = notas.linhas
    .filter((l) => !l.comNota)
    .map((l) => `${l.descricao} (${diaCurto(l.dataISO, competencia)})`)
    .join(", ");
  return (
    <p className="mt-1 max-w-[68ch] text-label text-ink">
      <span className="num">
        Notas de compra: {compras},{" "}
        {notas.comNota === 0
          ? "nenhuma com nota lida no Rende."
          : `${notas.comNota} com nota lida no Rende.`}
      </span>
      <br />
      <span className="num">{notas.semNota} sem nota:</span> {faltam}. Guarde o
      cupom.
    </p>
  );
}

/**
 * O anexo: as compras do mês numa segunda página A4 (`#d361`). O cabeçalho é o
 * da folha, reduzido ao CNPJ e ao período; a tipografia, a mesma.
 */
function FolhaNotas({
  notas,
  competencia,
  cnpj,
}: {
  notas: NotasDoMes;
  competencia: CompetenciaMensal;
  cnpj?: string;
}) {
  return (
    // ponytail: lista que passa de uma página continua sem a margem de cima na
    // seguinte (a margem é o padding da folha); repartir em folhas se acontecer.
    <article className="folha flex break-before-page flex-col text-[10.5pt] leading-[1.45] shadow-raised [page-break-before:always]">
      <div className="space-y-[4pt] border-b-2 border-line-strong pb-[8pt] text-[9pt]">
        <EmBranco rotulo="CNPJ:" valor={cnpj && formatarCnpj(cnpj)} />
        <p>
          Período de apuração:{" "}
          <span className="font-semibold">
            {rotuloCompetencia(competencia)}
          </span>
        </p>
      </div>

      <h2 className="mt-[14pt] text-center text-[13pt] font-bold tracking-[0.06em]">
        NOTAS DE COMPRA DE {rotuloCompetencia(competencia).toUpperCase()}{" "}
        (ANEXO)
      </h2>

      <table className="mt-[14pt] w-full border-collapse">
        <thead>
          <tr className="border-b border-line-strong text-left text-[8.5pt] font-bold tracking-[0.04em]">
            <th scope="col" className="w-[16mm] pb-[4pt]">
              DATA
            </th>
            <th scope="col" className="pb-[4pt]">
              ONDE
            </th>
            <th scope="col" className="w-[44mm] pb-[4pt]">
              CNPJ
            </th>
            <th scope="col" className="w-[30mm] pb-[4pt] text-right">
              VALOR
            </th>
          </tr>
        </thead>
        <tbody>
          {notas.linhas.map((linha, i) => (
            <tr key={i} className="break-inside-avoid border-b border-line">
              <td className="num py-[4pt] align-top">
                {linha.dataISO.slice(8, 10)}/{linha.dataISO.slice(5, 7)}
              </td>
              <td className="py-[4pt] pr-[8pt] align-top">{linha.descricao}</td>
              <td className="num py-[4pt] align-top whitespace-nowrap">
                {linha.cnpj ? (
                  formatarCnpj(linha.cnpj)
                ) : (
                  <span className="italic">sem nota lida</span>
                )}
              </td>
              <td className="num py-[4pt] text-right align-top font-medium whitespace-nowrap">
                {formatarMoeda(linha.valor)}
              </td>
            </tr>
          ))}
        </tbody>
        {/* `tbody`, e não `tfoot`: o total não se repete em cada página. */}
        <tbody className="border-t-2 border-line-strong">
          <tr className="break-inside-avoid">
            <th
              scope="row"
              colSpan={3}
              className="py-[5pt] text-left font-bold"
            >
              Total das compras
            </th>
            <td className="num py-[5pt] text-right text-[12pt] font-bold whitespace-nowrap">
              {formatarMoeda(notas.total)}
            </td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-auto pt-4 text-[7.5pt] font-medium text-ink-subtle">
        Lista das saídas lançadas no Rende. Os documentos seguem anexos.
      </footer>
    </article>
  );
}

export function EmBranco({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor?: string;
}) {
  if (valor) {
    return (
      <p>
        {rotulo} <span className="font-semibold">{valor}</span>
      </p>
    );
  }
  return (
    <p className="flex items-end gap-2">
      <span className="shrink-0">{rotulo}</span>
      <span
        aria-hidden
        className="h-[14pt] flex-1 border-b-[0.5pt] border-ink"
      />
    </p>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <tbody>
      <tr>
        <th
          scope="colgroup"
          colSpan={3}
          className="border-b border-line-strong pt-4 pb-[4pt] text-left text-[8.5pt] font-bold tracking-[0.04em]"
        >
          {titulo}
        </th>
      </tr>
      {children}
    </tbody>
  );
}

function Linha({
  numero,
  valor,
  total = false,
  children,
}: {
  numero: string;
  valor: Centavos;
  total?: boolean;
  children: ReactNode;
}) {
  return (
    <tr className={cn("break-inside-avoid", !total && "border-b border-line")}>
      <td
        className={cn(
          "w-[11mm] py-[5pt] align-top",
          total ? "font-bold" : "font-medium",
        )}
      >
        {numero}
      </td>
      <th
        scope="row"
        className={cn(
          "py-[5pt] pr-[8pt] text-left align-top",
          total ? "font-bold" : "font-normal",
        )}
      >
        {children}
      </th>
      <td
        className={cn(
          "num w-[34mm] py-[5pt] text-right align-top whitespace-nowrap",
          total ? "text-[12pt] font-bold" : "font-medium",
        )}
      >
        {formatarMoeda(valor)}
      </td>
    </tr>
  );
}

function Assinatura({ rotulo }: { rotulo: string }) {
  return (
    <div>
      <div className="h-[14mm]" />
      <p className="border-t-[0.5pt] border-ink pt-[4pt] text-[8.5pt] font-medium">
        {rotulo}
      </p>
    </div>
  );
}
