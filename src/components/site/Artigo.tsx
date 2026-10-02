import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PAGINAS_DO_PRECO } from "@/app/site";
import { classesBotao } from "@/components/ui/estilosBotao";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { ROTULO_PARCELA } from "@/lib/domain/custoFicha";
import type { ExemploDePagina } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { somaTaxas } from "@/lib/domain/precificacao";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * As peças das páginas do preço (spec 068, `DECISOES.md#d257`). Cada página
 * monta as suas na ordem dela; a do cookie (037) foi a primeira, e o HTML
 * dela saiu igual da extração.
 */

export const TITULO_H2 =
  "text-balance font-display text-title font-bold tracking-[-0.02em] text-ink lg:text-[1.75rem] lg:leading-[1.2]";

/** 40 → "0,40": a margem e a taxa como entram na divisão. */
export const fracao = (percentual: number) =>
  (percentual / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

/** Dinheiro no meio da frase: tabular, em peso de número. */
export function Valor({ centavos }: { centavos: Centavos }) {
  return (
    <span className="num font-semibold whitespace-nowrap text-ink">
      {formatarMoeda(centavos)}
    </span>
  );
}

/** O `h1`, a data e a resposta inteira, antes de qualquer conta ou botão. */
export function CabecalhoDoArtigo({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  /** `AAAA-MM-DD`: diz ao robô que a conta não é antiga. */
  atualizadoEm: string;
  /** O parágrafo da resposta. */
  children: React.ReactNode;
}) {
  const atualizado = new Date(`${atualizadoEm}T12:00:00Z`).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <header className="max-w-[68ch]">
      <h1 className="text-balance font-display text-[2.125rem] leading-[1.1] font-bold tracking-tight text-ink lg:text-[3rem] lg:leading-[1.05]">
        {titulo}
      </h1>
      <p className="mt-3 text-label text-ink-muted">
        Atualizado em <time dateTime={atualizadoEm}>{atualizado}</time>
      </p>
      <p className="mt-6 text-pretty text-body text-ink lg:text-heading lg:leading-normal lg:font-normal">
        {children}
      </p>
    </header>
  );
}

export type Passo = {
  parcela: keyof typeof ROTULO_PARCELA;
  titulo: string;
  texto: React.ReactNode[];
};

/** A parcela na unidade de venda do exemplo. */
const porLote = (exemplo: ExemploDePagina, parcela: Passo["parcela"]) =>
  Math.round(exemplo.custo[parcela] / exemplo.rende);

/** Os cinco passos, um por parcela, com a parcela do exemplo no fim de cada. */
export function Passos({
  passos,
  exemplo,
  sufixo,
}: {
  passos: Passo[];
  exemplo: ExemploDePagina;
  /** O que fecha a linha "No exemplo": " por cookie.", " no cento.". */
  sufixo: string;
}) {
  return (
    <ol className="flex flex-col gap-12">
      {passos.map((passo, i) => (
        <li key={passo.parcela}>
          <section aria-labelledby={`passo-${i + 1}`}>
            <p
              aria-hidden
              className="num font-display text-title font-bold text-ink-muted"
            >
              {i + 1}
            </p>
            <h2 id={`passo-${i + 1}`} className={cn(TITULO_H2, "mt-1")}>
              {passo.titulo}
            </h2>
            {passo.texto.map((t, j) => (
              <p key={j} className="mt-4 text-body text-ink">
                {t}
              </p>
            ))}
            <p className="mt-4 text-label text-ink-muted">
              No exemplo,{" "}
              <span
                className={cn(
                  "font-semibold",
                  passo.parcela === "custoMaoDeObra"
                    ? "text-accent-ink"
                    : "text-ink",
                )}
              >
                {ROTULO_PARCELA[passo.parcela]}
              </span>
              {/* ": " colado na `Valor`: o mesmo nó de texto que a 037 tinha. */}
              : <Valor centavos={porLote(exemplo, passo.parcela)} />
              {sufixo}
            </p>
          </section>
        </li>
      ))}
    </ol>
  );
}

/** A fórmula e a conta do exemplo, no bloco afundado. */
export function Formula({
  exemplo,
  preco,
  taxas = "maquininha",
}: {
  exemplo: ExemploDePagina;
  /** O preço antes do meio real, o que a divisão dá. */
  preco: Centavos;
  /** O nome do que sai do preço além da margem: "comissão e taxas" no aplicativo. */
  taxas?: string;
}) {
  const { custo, parametros } = exemplo;
  return (
    <div className="mt-6 rounded-lg bg-sunken px-5 py-5">
      <p className="text-heading font-semibold text-ink">
        {/* Um nó de texto só: o HTML das outras páginas sai igual. */}
        {`preço = custo ÷ (1 − margem − ${taxas})`}
      </p>
      <p className="num mt-3 text-body text-ink">
        <Valor centavos={custo.custoUnitario} /> ÷ (1 −{" "}
        {fracao(parametros.margemDesejada)} −{" "}
        {fracao(parametros.taxaCartaoConsiderada + parametros.outrasTaxas)}) ={" "}
        <Valor centavos={custo.custoUnitario} /> ÷{" "}
        {fracao(100 - parametros.margemDesejada - somaTaxas(parametros))} ={" "}
        <Valor centavos={preco} />
      </p>
    </div>
  );
}

export function Perguntas({
  perguntas,
}: {
  perguntas: { pergunta: string; resposta: React.ReactNode }[];
}) {
  return (
    <section aria-labelledby="perguntas" className="mt-16">
      <h2 id="perguntas" className={TITULO_H2}>
        Perguntas parecidas
      </h2>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {perguntas.map((p) => (
          <li key={p.pergunta} className="flex flex-col gap-2 py-6">
            <h3 className="text-subheading font-semibold text-ink">
              {p.pergunta}
            </h3>
            <p className="text-body text-ink">{p.resposta}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** As outras páginas do preço, pela lista (`#d257`). */
export function OutrosDoces({
  endereco,
}: {
  /** A página que mostra o bloco, e que fica fora dele. */
  endereco: (typeof PAGINAS_DO_PRECO)[number]["endereco"];
}) {
  return (
    <section aria-labelledby="outros-doces" className="mt-16">
      <h2 id="outros-doces" className={TITULO_H2}>
        Outros doces
      </h2>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {PAGINAS_DO_PRECO.filter((p) => p.endereco !== endereco).map((p) => (
          <li key={p.endereco}>
            <Link
              href={p.endereco}
              className="group flex min-h-11 flex-col gap-1 py-5"
            >
              <span className="inline-flex items-center gap-2 text-subheading font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-150 ease-quart group-hover:decoration-ink">
                {p.doce}
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-body text-ink-muted">{p.resumo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Depois da conta, fora do artigo. Sem barra fixa no celular: é leitura, e
 * ela cobriria o texto.
 */
export function Convite({
  children,
}: {
  /** A frase do convite, com o doce da página. */
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="convite"
      className="mx-auto max-w-6xl px-4 pb-16 lg:px-10 lg:pb-24"
    >
      <div className="max-w-[68ch] border-t border-line pt-10">
        <h2 id="convite" className={TITULO_H2}>
          {children}
        </h2>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/cadastro"
            className={classesBotao({
              variante: "primaria",
              tamanho: "lg",
              className: "w-full sm:w-auto lg:h-14 lg:px-6",
            })}
          >
            Começar o teste de {DIAS_DE_TESTE} dias
          </Link>
          <Link
            href="/conheca"
            className={classesBotao({
              variante: "terciaria",
              tamanho: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Ver como o Rende funciona
          </Link>
        </div>
      </div>
    </section>
  );
}
