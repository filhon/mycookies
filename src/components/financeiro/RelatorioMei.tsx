"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Info, Printer, TriangleAlert } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas } from "@/components/ui/Pilulas";
import {
  competenciaAtual,
  rotuloCompetencia,
  rotuloMes,
} from "@/lib/domain/datas";
import {
  LIMITE_MEI_ANUAL,
  LIMITE_MEI_POR_MES,
  limiteDoAno,
  relatorioMei,
  type AtividadeMei,
  type LimiteDoAno,
  type RelatorioMei as Relatorio,
} from "@/lib/domain/mei";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import {
  consultaAgregadosDoPeriodo,
  consultaTransacoesDoMes,
} from "@/lib/firebase/mutations/agregado";
import { useColecao } from "@/lib/hooks/useColecao";
import type {
  Centavos,
  CompetenciaMensal,
  ResumoMensal,
  Transacao,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";
import { SeletorMes } from "./SeletorMes";

/** 210 mm a 96 dpi, como em `TelaOrcamento`. */
const LARGURA_DA_FOLHA_PX = 794;

/**
 * As duas escolhas do papel moram no aparelho (`#d269`): a atividade uma vez
 * só, a nota por mês. Navegador que bloqueia armazenamento lança no acesso, e
 * aí a escolha vale só nesta visita.
 */
const CHAVE_ATIVIDADE = "rende:mei-atividade";
const chaveDaNota = (competencia: CompetenciaMensal) =>
  `rende:mei-nota:${competencia}`;

function lerDoAparelho(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function guardarNoAparelho(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento, vale só nesta visita.
  }
}

const semAssinatura = () => () => {};

const ATIVIDADES = [
  { valor: "INDUSTRIA", rotulo: "Indústria" },
  { valor: "COMERCIO", rotulo: "Comércio" },
] as const;

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
  const [mesCorrente] = useState(() => competenciaAtual());

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
  const lancamentos = useColecao<Transacao>(consultaDoMes);
  const agregados = useColecao<ResumoMensal>(consultaDoAno);

  const atividadeGuardada = useSyncExternalStore(
    semAssinatura,
    () => lerDoAparelho(CHAVE_ATIVIDADE),
    () => null,
  );
  const notaGuardada = useSyncExternalStore(
    semAssinatura,
    () => lerDoAparelho(chaveDaNota(competencia)),
    () => null,
  );
  const [atividadeEscolhida, setAtividade] = useState<AtividadeMei | null>(
    null,
  );
  const [notaEscolhida, setNota] = useState<Centavos | null>(null);
  const atividade: AtividadeMei =
    atividadeEscolhida ??
    (atividadeGuardada === "COMERCIO" ? "COMERCIO" : "INDUSTRIA");
  const comNota = notaEscolhida ?? (Number(notaGuardada) || 0);

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

  function mudarAtividade(nova: AtividadeMei) {
    setAtividade(nova);
    guardarNoAparelho(CHAVE_ATIVIDADE, nova);
  }

  function mudarNota(centavos: Centavos) {
    setNota(centavos);
    guardarNoAparelho(chaveDaNota(competencia), String(centavos));
  }

  const cabecalho = (
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
      />
    </CabecalhoPagina>
  );

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

  if (lancamentos.carregando || agregados.carregando) {
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

  return (
    <>
      {cabecalho}

      <div className="mt-4 flex flex-col gap-8 print:mt-0 print:block">
        <div className="print:hidden">
          <LimiteDoAnoMei
            limite={limiteDoAno(agregados.dados, competencia)}
            competencia={competencia}
            soVenda={relatorio.outrasEntradas === 0}
          />
        </div>

        <section aria-labelledby="o-papel" className="print:hidden">
          <h2 id="o-papel" className="text-subheading font-semibold text-ink">
            Antes de imprimir
          </h2>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <p id="atividade-mei" className="text-label font-medium text-ink">
                Minha atividade no MEI é
              </p>
              <Pilulas
                opcoes={ATIVIDADES}
                valor={atividade}
                aoMudar={mudarAtividade}
                rotulo="Minha atividade no MEI é"
              />
              <p className="text-label text-ink-muted">
                Indústria se você faz o doce; comércio se revende o de outra.
              </p>
            </div>

            <CampoMoeda
              rotulo={`Emiti nota fiscal em ${mes}, no total de`}
              valor={comNota}
              aoMudar={mudarNota}
              dica={`Sai da linha ${linhaSemNota} e vai para a ${linhaComNota}. Sem nota, deixe em zero.`}
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
            <p className="max-w-[60ch] text-label text-ink-muted">
              Confira os números antes de assinar. O relatório não é enviado a
              ninguém: você guarda, com as notas de compra do mês.
            </p>
          </div>
        </section>

        <div ref={medirFolha} style={{ "--folha-zoom": zoom } as CSSProperties}>
          <FolhaMei relatorio={relatorio} competencia={competencia} />
        </div>
      </div>
    </>
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
  compacto = false,
}: {
  limite: LimiteDoAno;
  competencia: CompetenciaMensal;
  /** Sem entrada fora de `VENDA` no mês aberto, o verbo é "faturou". */
  soVenda: boolean;
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
        de {formatarMoeda(LIMITE_MEI_ANUAL)}
        <span className="ml-auto font-semibold text-ink">
          {formatarPercentual(limite.percentual, 0)}
        </span>
      </p>

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
            Abriu o MEI este ano? O seu limite é{" "}
            <span className="num">{formatarMoeda(LIMITE_MEI_POR_MES)}</span> por
            mês desde a abertura.
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
 * classe `dark:` aqui dentro. CNPJ e nome ficam em branco para ela escrever.
 */
function FolhaMei({
  relatorio,
  competencia,
}: {
  relatorio: Relatorio;
  competencia: CompetenciaMensal;
}) {
  return (
    <article className="folha mx-auto flex flex-col text-[10.5pt] leading-[1.45] shadow-raised">
      <h2 className="border-b-2 border-line-strong pb-[8pt] text-center text-[13pt] font-bold tracking-[0.06em]">
        RELATÓRIO MENSAL DAS RECEITAS BRUTAS
      </h2>

      <div className="mt-[14pt] space-y-[10pt]">
        <EmBranco rotulo="CNPJ:" />
        <EmBranco rotulo="Empreendedor individual:" />
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

function EmBranco({ rotulo }: { rotulo: string }) {
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
