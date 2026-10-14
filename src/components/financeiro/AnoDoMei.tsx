"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Botao } from "@/components/ui/Botao";
import { BotaoCopiar } from "@/components/ui/BotaoCopiar";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  competenciaDeISO,
  dataISODe,
  rotuloCompetencia,
  rotuloDataCompleta,
  rotuloDiaNoAno,
  rotuloMes,
} from "@/lib/domain/datas";
import {
  anoDoMei,
  formatarCnpj,
  type AnoDoMei as Ano,
  type MesDoAno,
} from "@/lib/domain/mei";
import { formatarMoeda } from "@/lib/domain/money";
import { docMei } from "@/lib/firebase/colecoes";
import {
  consultaAgregadosDoPeriodo,
  consultaVendasDoAno,
} from "@/lib/firebase/mutations/agregado";
import { salvarMei } from "@/lib/firebase/mutations/fiscal";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  Centavos,
  CompetenciaMensal,
  DadosMei,
  DataISO,
  ResumoMensal,
  Transacao,
} from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { EmBranco } from "./RelatorioMei";

/**
 * Os campos da DASN-SIMEI, com os rótulos do portal: é de lá que ela copia
 * (`DECISOES.md#d362`). O total o portal calcula; a tela mostra para conferir.
 */
const CAMPO_COMERCIO =
  "Receita bruta total de comércio, indústria e serviço de transporte intermunicipal e interestadual";
const CAMPO_SERVICOS = "Receita bruta total de prestação de serviços";
const CAMPO_TOTAL = "Receita bruta total";

/** "janeiro a julho", ou só "julho" quando o "antes" é um mês. */
function periodo(de: CompetenciaMensal, ate: CompetenciaMensal): string {
  return de === ate ? rotuloMes(de) : `${rotuloMes(de)} a ${rotuloMes(ate)}`;
}

/**
 * O ano do MEI (`DECISOES.md#d362`): os doze meses com o estado de cada
 * relatório, os números que a declaração anual pede, prontos para copiar, e
 * o campo do que entrou antes do Rende. Lê as vendas do ano; nada é enviado.
 */
export function AnoDoMei({ ano }: { ano: string }) {
  const contaId = useContaId();
  const router = useRouter();
  const [hoje] = useState(() => dataISODe(new Date()));
  const anoCorrente = hoje.slice(0, 4);
  const mesCorrente = competenciaDeISO(hoje);
  const passado = ano < anoCorrente;

  const consultaVendas = useMemo(
    () => consultaVendasDoAno(contaId, ano),
    [contaId, ano],
  );
  // Só num ano que passou: o estado vazio diz quando o Rende começou a somar.
  const consultaDepois = useMemo(
    () =>
      passado
        ? consultaAgregadosDoPeriodo(
            contaId,
            `${Number(ano) + 1}-01`,
            mesCorrente,
          )
        : null,
    [contaId, ano, passado, mesCorrente],
  );
  const referenciaMei = useMemo(() => docMei(contaId), [contaId]);
  const vendas = useColecao<Transacao>(consultaVendas);
  const depois = useColecao<ResumoMensal>(consultaDepois);
  const mei = useDocumento<DadosMei>(referenciaMei);

  const vendasPorMes = useMemo(() => {
    const porMes: Record<CompetenciaMensal, Centavos> = {};
    for (const t of vendas.dados) {
      if (t.tipo === "ENTRADA") {
        porMes[t.competencia] = (porMes[t.competencia] ?? 0) + t.valor;
      }
    }
    return porMes;
  }, [vendas.dados]);

  const atividade = mei.dado?.atividade ?? "INDUSTRIA";

  const irPara = (outro: number) =>
    router.replace(`/financeiro/relatorio-mei/${outro}`);
  const cabecalho = (
    <CabecalhoPagina
      titulo="Ano do MEI"
      descricao="Os doze relatórios do ano e os números da declaração anual."
      voltar={{ href: "/financeiro", rotulo: "Caixa" }}
      pendente={vendas.pendente}
      className="print:hidden"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => irPara(Number(ano) - 1)}
          aria-label={`Ver ${Number(ano) - 1}`}
          className="toque flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
        <p
          aria-live="polite"
          className="num flex-1 text-center font-display text-heading font-semibold text-ink lg:text-title"
        >
          {ano}
        </p>
        {/* O ano que não começou não tem o que mostrar. */}
        {passado ? (
          <button
            type="button"
            onClick={() => irPara(Number(ano) + 1)}
            aria-label={`Ver ${Number(ano) + 1}`}
            className="toque flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
          >
            <ChevronRight aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        ) : (
          <span aria-hidden className="toque" />
        )}
      </div>
    </CabecalhoPagina>
  );

  if (vendas.erro) {
    return (
      <>
        {cabecalho}
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para carregar este ano"
            descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
          />
        </div>
      </>
    );
  }

  if (vendas.carregando || mei.carregando) {
    return (
      <>
        {cabecalho}
        <div role="status" aria-label="Carregando" className="mt-4 space-y-6">
          <Esqueleto className="h-40 rounded-lg" />
          <Esqueleto className="h-96 rounded-lg" />
        </div>
      </>
    );
  }

  const guardados = Object.fromEntries(
    Object.entries(mei.dado?.guardados ?? {}).map(([competencia, g]) => [
      competencia,
      { ...g, em: dataISODe(g.em.toDate()) },
    ]),
  );
  const doAno = anoDoMei(
    ano,
    vendasPorMes,
    {
      atividade,
      abertura: mei.dado?.abertura,
      antes: mei.dado?.antes,
      notas: mei.dado?.notas,
      guardados,
    },
    hoje,
  );

  if (doAno.vazio) {
    const comecou = depois.dados.find((a) => (a.entradas ?? 0) > 0)?.id;
    return (
      <>
        {cabecalho}
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo={
              passado
                ? `${ano} ficou antes do Rende.`
                : "As vendas do ano aparecem aqui."
            }
            descricao={
              !passado
                ? "Cada venda lançada no Caixa entra no mês dela e na soma do ano."
                : comecou
                  ? `O Rende começou a somar em ${rotuloCompetencia(comecou)}.`
                  : "O Rende ainda não tem vendas lançadas."
            }
            acao={
              comecou && (
                <Link
                  href={`/financeiro/relatorio-mei/${comecou.slice(0, 4)}`}
                  className={classesBotao({ variante: "secundaria" })}
                >
                  Ver {comecou.slice(0, 4)}
                </Link>
              )
            }
          />
        </div>
      </>
    );
  }

  const antes = doAno.antes;
  const texto = [
    `${CAMPO_COMERCIO}: ${formatarMoeda(doAno.comercioEIndustria)}`,
    `${CAMPO_SERVICOS}: ${formatarMoeda(doAno.servicos)}`,
    `${CAMPO_TOTAL}: ${formatarMoeda(doAno.total)}`,
  ].join("\n");

  return (
    <>
      {cabecalho}

      <div className="mt-4 flex flex-col gap-8 print:hidden">
        <section aria-labelledby="declaracao">
          <h2
            id="declaracao"
            className="text-subheading font-semibold text-ink"
          >
            {doAno.terminado
              ? `Para a declaração (DASN-SIMEI), até ${rotuloDataCompleta(doAno.prazo)}`
              : `Até agora em ${ano}`}
          </h2>
          <dl className="mt-3 max-w-xl">
            <dt className="text-label text-ink-muted">{CAMPO_TOTAL}</dt>
            <dd className="num font-display text-display font-semibold text-ink">
              {formatarMoeda(doAno.total)}
            </dd>
            <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-2">
              <dt className="max-w-[44ch] text-label text-ink-muted">
                {CAMPO_COMERCIO}
              </dt>
              <dd className="num shrink-0 font-semibold text-ink">
                {formatarMoeda(doAno.comercioEIndustria)}
              </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-2">
              <dt className="text-label text-ink-muted">{CAMPO_SERVICOS}</dt>
              <dd className="num shrink-0 font-semibold text-ink">
                {formatarMoeda(doAno.servicos)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-start gap-2">
            <BotaoCopiar
              variante="primaria"
              tamanho="lg"
              rotulo="Copiar os números"
              texto={texto}
            />
            <Botao
              variante="secundaria"
              tamanho="lg"
              onClick={() => window.print()}
              iconeInicial={
                <Printer aria-hidden className="size-5" strokeWidth={1.75} />
              }
            >
              Imprimir o ano
            </Botao>
          </div>
          <p className="mt-2 max-w-[60ch] text-label text-ink-muted">
            Nada é enviado: você cola no portal do Simples Nacional, que pede o
            login gov.br.
          </p>
        </section>

        <section aria-labelledby="os-meses">
          <h2 id="os-meses" className="text-subheading font-semibold text-ink">
            Os meses
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {antes && (
              <LinhaAntes
                // Recomeça o rascunho quando o valor gravado muda.
                key={antes.valor ?? "vazio"}
                antes={antes}
                aoGuardar={(valor) =>
                  salvarMei(contaId, {
                    atividade,
                    antes: { [ano]: { ate: antes.ate, valor } },
                  })
                }
              />
            )}
            {doAno.meses.map((mes) => (
              <li key={mes.competencia}>
                <Link
                  href={`/financeiro/relatorio-mei/${mes.competencia}`}
                  className="toque flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken"
                >
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-ink first-letter:uppercase">
                      {rotuloMes(mes.competencia)}
                    </span>
                    <EstadoNoAno mes={mes} hoje={hoje} />
                  </span>
                  {mes.vendas > 0 && (
                    <span className="num shrink-0 font-semibold text-ink">
                      {formatarMoeda(mes.vendas)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <FolhaDoAno
        ano={ano}
        doAno={doAno}
        cnpj={mei.dado?.cnpj}
        nomeEmpresarial={mei.dado?.nomeEmpresarial}
      />
    </>
  );
}

/**
 * O estado do relatório na linha do mês, com o vocabulário e os ícones da 151
 * (`#d360`). Mês fechado sem venda diz só isso.
 */
function EstadoNoAno({ mes, hoje }: { mes: MesDoAno; hoje: DataISO }) {
  const { prazo } = mes;
  if (mes.mudou) {
    return (
      <span className="flex items-center gap-1.5 text-label text-ink">
        <TriangleAlert
          aria-hidden
          className="size-4 shrink-0 text-attention"
          strokeWidth={1.75}
        />
        mudou depois de guardado
      </span>
    );
  }
  if (prazo.estado === "guardado") {
    return (
      <span className="flex items-center gap-1.5 text-label text-ink">
        <CheckCheck
          aria-hidden
          className="size-4 shrink-0 text-positive"
          strokeWidth={1.75}
        />
        guardado
      </span>
    );
  }
  if (prazo.estado === "aberto") {
    return (
      <span className="block text-label text-ink-muted">ainda aberto</span>
    );
  }
  if (mes.vendas === 0) {
    return <span className="block text-label text-ink-muted">sem venda</span>;
  }
  if (prazo.estado === "vence") {
    return (
      <span className="flex items-center gap-1.5 text-label text-ink">
        {prazo.atencao && (
          <TriangleAlert
            aria-hidden
            className="size-4 shrink-0 text-attention"
            strokeWidth={1.75}
          />
        )}
        vence {rotuloDiaNoAno(prazo.data, hoje)}
      </span>
    );
  }
  return <span className="block text-label text-ink">não guardado</span>;
}

/**
 * "Janeiro a julho · antes do Rende": o que entrou antes de ela lançar,
 * informado uma vez (`#d362`). Grava no "Guardar", e não a cada dígito: a
 * linha fecha quando o valor chega.
 */
function LinhaAntes({
  antes,
  aoGuardar,
}: {
  antes: NonNullable<Ano["antes"]>;
  aoGuardar: (valor: Centavos) => void;
}) {
  const [editando, setEditando] = useState(antes.valor === null);
  const [valor, setValor] = useState<Centavos>(antes.valor ?? 0);
  const linha = useRef<HTMLLIElement>(null);
  const meses = periodo(antes.de, antes.ate);

  // O link da tela do mês chega com `#antes` antes de a lista existir.
  useEffect(() => {
    if (window.location.hash === "#antes") {
      linha.current?.scrollIntoView({ block: "center" });
    }
  }, []);

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    aoGuardar(valor);
    setEditando(false);
  }

  if (!editando && antes.valor !== null) {
    return (
      <li
        id="antes"
        ref={linha}
        className="flex items-center justify-between gap-4 px-4 py-3"
      >
        <span className="min-w-0">
          <span className="block text-body font-medium text-ink first-letter:uppercase">
            {meses}
          </span>
          <span className="block text-label text-ink-muted">
            antes do Rende
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="num font-semibold text-ink">
            {formatarMoeda(antes.valor)}
          </span>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
          >
            Mudar
          </button>
        </span>
      </li>
    );
  }

  return (
    <li id="antes" ref={linha} className="px-4 py-4">
      <p className="text-body font-medium text-ink">
        <span className="inline-block first-letter:uppercase">{meses}</span> ·
        antes do Rende
      </p>
      <form onSubmit={guardar} className="mt-3 flex flex-col gap-3">
        <CampoMoeda
          rotulo={`Quanto você vendeu de ${meses}?`}
          valor={valor}
          aoMudar={setValor}
          dica="Some pelos seus relatórios em papel ou pelo extrato. Uma vez só."
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" variante="secundaria">
            Guardar
          </Botao>
          {antes.valor !== null && (
            <Botao
              variante="terciaria"
              onClick={() => {
                setValor(antes.valor ?? 0);
                setEditando(false);
              }}
            >
              Cancelar
            </Botao>
          )}
        </div>
      </form>
    </li>
  );
}

/** "14/10": o dia em que ela guardou, na coluna do papel. */
function diaEMes(iso: DataISO): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/**
 * O ano numa folha A4, para levar ao contador (`#d362`): os meses e os
 * números da declaração. Só existe no papel; na tela, a lista já diz o mesmo.
 * Mesma classe `.folha` e a mesma tipografia do relatório do mês.
 */
function FolhaDoAno({
  ano,
  doAno,
  cnpj,
  nomeEmpresarial,
}: {
  ano: string;
  doAno: Ano;
  cnpj?: string;
  nomeEmpresarial?: string;
}) {
  return (
    <article className="folha mx-auto hidden flex-col text-[10.5pt] leading-[1.45] print:flex">
      <h2 className="border-b-2 border-line-strong pb-[8pt] text-center text-[13pt] font-bold tracking-[0.06em]">
        RECEITA BRUTA DO MEI EM {ano}
      </h2>

      <div className="mt-[14pt] space-y-[10pt]">
        <EmBranco rotulo="CNPJ:" valor={cnpj && formatarCnpj(cnpj)} />
        <EmBranco rotulo="Empreendedor individual:" valor={nomeEmpresarial} />
        <p>
          Ano-calendário: <span className="num font-semibold">{ano}</span>
        </p>
      </div>

      <table className="mt-[16pt] w-full border-collapse">
        <thead>
          <tr className="border-b border-line-strong text-left text-[8.5pt] font-bold tracking-[0.04em]">
            <th scope="col" className="pb-[4pt]">
              MÊS
            </th>
            <th scope="col" className="pb-[4pt]">
              RELATÓRIO MENSAL
            </th>
            <th scope="col" className="w-[34mm] pb-[4pt] text-right">
              RECEITA BRUTA
            </th>
          </tr>
        </thead>
        <tbody>
          {doAno.antes && (
            <tr className="border-b border-line">
              <th
                scope="row"
                className="py-[4pt] text-left font-normal first-letter:uppercase"
              >
                {periodo(doAno.antes.de, doAno.antes.ate)}
              </th>
              <td className="py-[4pt]">antes do Rende, informado</td>
              <td className="num py-[4pt] text-right font-medium whitespace-nowrap">
                {doAno.antes.valor === null
                  ? "não informado"
                  : formatarMoeda(doAno.antes.valor)}
              </td>
            </tr>
          )}
          {doAno.meses.map((mes) => (
            <tr key={mes.competencia} className="border-b border-line">
              <th
                scope="row"
                className="py-[4pt] text-left font-normal first-letter:uppercase"
              >
                {rotuloMes(mes.competencia)}
              </th>
              <td className="num py-[4pt]">
                {mes.mudou
                  ? "mudou depois de guardado"
                  : mes.prazo.estado === "guardado"
                    ? `guardado em ${diaEMes(mes.prazo.data)}`
                    : mes.prazo.estado === "aberto"
                      ? "aberto"
                      : ""}
              </td>
              <td className="num py-[4pt] text-right font-medium whitespace-nowrap">
                {mes.prazo.estado === "aberto" && mes.vendas === 0
                  ? ""
                  : formatarMoeda(mes.vendas)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-6 border-b border-line-strong pb-[4pt] text-[8.5pt] font-bold tracking-[0.04em]">
        {doAno.terminado
          ? `PARA A DECLARAÇÃO ANUAL (DASN-SIMEI), ATÉ ${rotuloDataCompleta(doAno.prazo).toUpperCase()}`
          : `ATÉ AGORA EM ${ano}`}
      </h3>
      <table className="w-full border-collapse">
        <tbody>
          {[
            [CAMPO_COMERCIO, doAno.comercioEIndustria],
            [CAMPO_SERVICOS, doAno.servicos],
          ].map(([rotulo, valor]) => (
            <tr key={rotulo} className="border-b border-line">
              <th
                scope="row"
                className="py-[5pt] pr-[8pt] text-left font-normal"
              >
                {rotulo}
              </th>
              <td className="num w-[34mm] py-[5pt] text-right font-medium whitespace-nowrap">
                {formatarMoeda(valor as Centavos)}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-[5pt] text-left font-bold">
              {CAMPO_TOTAL}
            </th>
            <td className="num py-[5pt] text-right text-[12pt] font-bold whitespace-nowrap">
              {formatarMoeda(doAno.total)}
            </td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-auto pt-4 text-[7.5pt] font-medium text-ink-subtle">
        Somado das vendas lançadas no Rende em {ano}, pelo valor bruto
        {doAno.antes?.valor != null &&
          `; ${periodo(doAno.antes.de, doAno.antes.ate)} informado à mão`}
        .
      </footer>
    </article>
  );
}
