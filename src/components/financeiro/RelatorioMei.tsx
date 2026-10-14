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
  LIMITE_MEI_POR_MES,
  limiteDoAno,
  mudouDepoisDeGuardado,
  prazoDoRelatorio,
  relatorioMei,
  type LimiteDoAno,
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

/**
 * O Relatório Mensal das Receitas Brutas do MEI, montado das vendas do mês
 * (`DECISOES.md#d269`), com o limite do ano por cima (`#d270`).
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
  const atividade = mei.dado?.atividade ?? "INDUSTRIA";
  const comNota = notaEscolhida ?? mei.dado?.notas?.[competencia] ?? 0;

  // Mesmo `zoom` da folha do orçamento: a prévia encolhe para caber, e na
  // impressão volta a 1.
  const [zoom, setZoom] = useState(1);
  const medirFolha = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento) return;
    const observador = new ResizeObserver((entradas) => {
      const largura = entradas[0]?.contentRect.width ?? LARGURA_DA_FOLHA_PX;
      setZoom(Math.min(1, largura / LARGURA_DA_FOLHA_PX));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

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

  return (
    <>
      {cabecalhoCom(
        <EstadoDoMes
          prazo={prazo}
          hoje={hoje}
          aoDesfazer={desfazivel ? desfazer : undefined}
        />,
      )}

      <div className="mt-4 flex flex-col gap-8 print:mt-0 print:block">
        <div className="print:hidden">
          <LimiteDoAnoMei
            limite={limiteDoAno(
              agregados.dados,
              competencia,
              mei.dado?.abertura,
            )}
            competencia={competencia}
            soVenda={relatorio.outrasEntradas === 0}
            aberturaConhecida={!!mei.dado?.abertura}
          />
        </div>

        <section aria-labelledby="o-papel" className="print:hidden">
          <h2 id="o-papel" className="text-subheading font-semibold text-ink">
            Antes de imprimir
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
            <span className="num">
              {relatorio.vendasContadas === 0
                ? `Nenhuma venda lançada de 1 a ${ultimoDia} de ${mes}`
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

          <div className="mt-4 flex flex-col gap-6">
            <SeuMei mei={mei.dado} />

            <CampoMoeda
              rotulo={`Emiti nota fiscal em ${mes}, no total de`}
              valor={comNota}
              aoMudar={mudarNota}
              dica={`Sai da linha ${linhaSemNota} e vai para a ${linhaComNota}. Sem nota, deixe em zero.`}
              className="sm:max-w-[calc(50%-0.75rem)]"
            />
          </div>

          {relatorio.outrasEntradas > 0 && (
            <p className="mt-4 flex max-w-[60ch] items-start gap-2 text-label text-ink-muted">
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

          <div className="mt-6 flex flex-col items-start gap-2">
            <Botao
              variante="primaria"
              tamanho="lg"
              onClick={() => window.print()}
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
        </section>

        {mudou && guardado && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft p-4 text-label text-ink print:hidden"
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

        <div ref={medirFolha} style={{ "--folha-zoom": zoom } as CSSProperties}>
          <FolhaMei
            relatorio={relatorio}
            competencia={competencia}
            cnpj={mei.dado?.cnpj}
            nomeEmpresarial={mei.dado?.nomeEmpresarial}
          />
        </div>
      </div>
    </>
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
 * Quanto do limite do ano já entrou (`#d270`), na tela do relatório e no pé
 * de `/financeiro`. Aviso, nunca erro: o ocre leva o triângulo e a palavra, e
 * toda frase sobre consequência termina no contador.
 *
 * `compacto` é o pé do Caixa: sem o ritmo e sem a linha da abertura.
 */
export function LimiteDoAnoMei({
  limite,
  competencia,
  soVenda,
  aberturaConhecida = false,
  compacto = false,
}: {
  limite: LimiteDoAno;
  competencia: CompetenciaMensal;
  /** Sem entrada fora de `VENDA` no mês aberto, o verbo é "faturou". */
  soVenda: boolean;
  /** Com a abertura em `fiscal/mei`, "Abriu o MEI este ano?" some (`#d359`). */
  aberturaConhecida?: boolean;
  compacto?: boolean;
}) {
  const ano = competencia.slice(0, 4);
  const ate = competencia.endsWith("-12")
    ? ""
    : ` até ${rotuloMes(competencia)}`;
  const alerta = limite.estado !== "dentro";

  return (
    <section aria-labelledby={`limite-mei-${ano}`}>
      <h2
        id={`limite-mei-${ano}`}
        className={cn(
          "font-semibold text-ink",
          compacto ? "text-label" : "text-subheading",
        )}
      >
        Limite do MEI em {ano}
      </h2>

      <p className="mt-1 text-label text-ink-muted">
        {soVenda ? "Você faturou" : "Entrou"}
        {ate}
      </p>
      <p className="num flex flex-wrap items-baseline gap-x-2 text-body text-ink-muted">
        <span
          className={cn(
            "font-semibold text-ink",
            compacto ? "text-body" : "text-heading",
          )}
        >
          {formatarMoeda(limite.entradas)}
        </span>
        de {formatarMoeda(limite.teto)}
        <span className="ml-auto font-semibold text-ink">
          {formatarPercentual(limite.percentual, 0)}
        </span>
      </p>
      {limite.desde && (
        <p className="mt-1 max-w-[60ch] text-label text-ink">
          Somado desde {rotuloMes(limite.desde)}, quando você começou a lançar
          no Rende. O que entrou antes não está aqui.
        </p>
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(100, limite.percentual))}
        aria-valuetext={`${formatarPercentual(limite.percentual, 0)} do limite do MEI`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div
          style={{ width: `${Math.min(100, limite.percentual)}%` }}
          className={cn(
            "h-full rounded-full",
            alerta ? "bg-attention" : "bg-brand-ink",
          )}
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

      {!compacto && (
        <>
          {limite.ritmo !== null && !competencia.endsWith("-12") && (
            <p className="mt-3 max-w-[60ch] text-label text-ink">
              No ritmo deste ano, você fecha dezembro perto de{" "}
              <strong className="num font-semibold">
                {formatarMoeda(limite.ritmo)}
              </strong>
              .
            </p>
          )}
          <p className="mt-1.5 max-w-[60ch] text-label text-ink-muted">
            {limite.proporcional ? (
              <>
                O MEI abriu este ano: o seu limite é{" "}
                <span className="num">{formatarMoeda(LIMITE_MEI_POR_MES)}</span>{" "}
                por mês desde a abertura.
              </>
            ) : (
              !aberturaConhecida && (
                <>
                  Abriu o MEI este ano? O seu limite é{" "}
                  <span className="num">
                    {formatarMoeda(LIMITE_MEI_POR_MES)}
                  </span>{" "}
                  por mês desde a abertura.
                </>
              )
            )}
            {!soVenda &&
              " A conta soma tudo o que entrou, não só venda: erra pra cima, que é o lado seguro."}
          </p>
        </>
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
    <article className="folha mx-auto flex flex-col text-[10.5pt] leading-[1.45] shadow-raised">
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

function EmBranco({ rotulo, valor }: { rotulo: string; valor?: string }) {
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
