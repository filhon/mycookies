import type { Route } from "next";
import Link from "next/link";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { IndiceDaPagina } from "@/components/layout/IndiceDaPagina";
import { Logotipo } from "@/components/marca/Marca";
import { classesBotao } from "@/components/ui/estilosBotao";
import { rotuloDataCompleta } from "@/lib/domain/datas";
import {
  fatiarReferencias,
  versaoAtual,
  type TrechoComLink,
  type Versao,
} from "@/lib/domain/textoLegal";

/**
 * A página de texto para ler deslogada: os termos e a privacidade (spec 027).
 * Sem a moldura de entrada, porque é leitura e não formulário. Server
 * component; só o índice é client. A 165 deu o resumo no topo, o índice que
 * acompanha a leitura, as referências como link e o pé com saída
 * (`DECISOES.md#d379`). A 166 deu a versão: a data do topo e "O que mudou"
 * saem de `versoes` (`#d380`).
 */
export interface SecaoDeTexto {
  titulo: string;
  /** O rótulo da pílula no índice, até uns 22 caracteres. */
  curto: string;
  /**
   * `{ destaque }` sai em negrito, numa caixa: é a cláusula que limita
   * direito, que o CDC (art. 54, § 4º) manda redigir com destaque.
   */
  paragrafos: (string | { destaque: string })[];
}

/**
 * Uma linha do "Em resumo": a mesma promessa da seção com outras palavras,
 * nunca uma promessa nova. O link vai à primeira seção citada.
 */
export interface LinhaDoResumo {
  texto: string;
  secoes: [number, ...number[]];
}

const OUTRO = {
  termos: {
    rotulo: "Política de privacidade",
    href: "/privacidade",
    trecho: "política de privacidade",
  },
  privacidade: {
    rotulo: "Termos de uso",
    href: "/termos",
    trecho: "termos de uso",
  },
} as const;

const LINK_NO_TEXTO =
  "font-medium text-brand-ink underline decoration-line-strong underline-offset-4 hover:decoration-current";

function rotuloDasSecoes(secoes: number[]): string {
  if (secoes.length === 1) return `seção ${secoes[0]}`;
  return `seções ${secoes.slice(0, -1).join(", ")} e ${secoes.at(-1)}`;
}

function TextoComLinks({
  texto,
  trechos,
}: {
  texto: string;
  trechos: TrechoComLink[];
}) {
  return fatiarReferencias(texto, trechos).map((pedaco, i) => {
    if (pedaco.tipo === "texto") return pedaco.texto;
    if (pedaco.href.startsWith("/")) {
      return (
        <Link key={i} href={pedaco.href as Route} className={LINK_NO_TEXTO}>
          {pedaco.texto}
        </Link>
      );
    }
    return (
      <a
        key={i}
        href={pedaco.href}
        className={LINK_NO_TEXTO}
        {...(pedaco.novaAba && {
          target: "_blank",
          rel: "noopener noreferrer",
        })}
      >
        {pedaco.texto}
        {pedaco.novaAba && (
          <span className="sr-only"> (abre em outra aba)</span>
        )}
      </a>
    );
  });
}

/**
 * O texto das duas páginas foi redigido em 2026-09-24 e espera revisão de um
 * advogado antes do deploy (`DECISOES.md#d171`). O que falta preencher ainda
 * carrega `[texto`, e o portão continua `rg -n "\[texto" src/app` vazio.
 */
export function PaginaDeTexto({
  documento,
  titulo,
  versoes,
  resumo,
  secoes,
}: {
  /** Diz qual é o outro documento, no pé e nas referências do texto. */
  documento: keyof typeof OUTRO;
  titulo: string;
  /** `VERSOES_TERMOS` ou `VERSOES_PRIVACIDADE`: o topo e "O que mudou". */
  versoes: readonly Versao[];
  resumo: LinhaDoResumo[];
  secoes: SecaoDeTexto[];
}) {
  const outro = OUTRO[documento];
  const mailto = `mailto:${RESPONSAVEL.email}`;
  const trechos: TrechoComLink[] = [
    { trecho: RESPONSAVEL.email, href: mailto },
    {
      trecho: "consumidor.gov.br",
      href: "https://consumidor.gov.br",
      novaAba: true,
    },
    { trecho: "gov.br/anpd", href: "https://www.gov.br/anpd", novaAba: true },
    { trecho: outro.trecho, href: outro.href },
  ];
  const ancoras = secoes.map((secao, indice) => ({
    id: `secao-${indice + 1}`,
    rotulo: secao.curto,
  }));

  return (
    <div
      id="topo"
      className="min-h-dvh bg-canvas px-6 py-12 xl:grid xl:grid-cols-[13rem_minmax(0,68ch)] xl:justify-center xl:gap-x-16"
    >
      {/* No desktop o índice mora na margem que sobrava, parado enquanto o
          texto rola. No celular ele está no cabeçalho grudento, mais abaixo. */}
      <aside className="hidden xl:block print:hidden">
        <IndiceDaPagina
          ancoras={ancoras}
          rotulo="Seções"
          className="sticky top-6 flex-col items-start overflow-visible"
        />
      </aside>

      <main className="mx-auto w-full max-w-[68ch] xl:mx-0">
        {/* Chega-se aqui do cadastro, do login e do rodapé de `/conheca`: `/`
            leva cada um ao seu lugar (o app, ou a página de venda). */}
        <Link
          href="/"
          aria-label="Rende, ir para o início"
          className="-mx-1 inline-flex min-h-11 items-center rounded-sm px-1"
        >
          <Logotipo tamanho="md" />
        </Link>

        <h1 className="mt-8 font-display text-title font-semibold text-ink">
          {titulo}
        </h1>
        <p className="mt-1.5 text-label text-ink-muted">
          Vigente desde {rotuloDataCompleta(versaoAtual(versoes))}.
        </p>

        <section aria-labelledby="em-resumo" className="mt-8">
          <h2 id="em-resumo" className="text-subheading font-semibold text-ink">
            Em resumo
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {resumo.map((linha) => (
              <li key={linha.texto}>
                <a
                  href={`#secao-${linha.secoes[0]}`}
                  className="flex min-h-11 items-baseline justify-between gap-4 px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
                >
                  <span className="text-body text-ink">{linha.texto}</span>
                  <span className="shrink-0 text-label font-medium text-brand-ink">
                    {rotuloDasSecoes(linha.secoes)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-label text-ink-muted">
            O resumo ajuda a achar. O que vale é o texto de cada seção.
          </p>
        </section>

        {/* Só depois do resumo: antes dele, o resumo é a orientação. */}
        <header className="sticky top-0 z-10 -mx-6 mt-10 border-b border-line bg-canvas px-6 py-3 xl:hidden print:hidden">
          <IndiceDaPagina ancoras={ancoras} rotulo="Seções" />
        </header>

        <div className="mt-8 space-y-8 xl:mt-12">
          {secoes.map((secao, indice) => (
            // O texto remete à "seção 1": o número é lido, e a seção tem endereço.
            <section
              key={secao.titulo}
              id={`secao-${indice + 1}`}
              className="scroll-mt-24 xl:scroll-mt-6"
            >
              <h2 className="text-heading font-semibold text-ink">
                <span className="num mr-2 text-ink-muted">{indice + 1}.</span>
                {secao.titulo}
              </h2>
              <div className="mt-3 space-y-3 text-body text-ink">
                {secao.paragrafos.map((paragrafo, i) =>
                  typeof paragrafo === "string" ? (
                    <p key={i}>
                      <TextoComLinks texto={paragrafo} trechos={trechos} />
                    </p>
                  ) : (
                    <p
                      key={i}
                      className="rounded-md border border-line bg-sunken p-4 font-semibold"
                    >
                      <TextoComLinks
                        texto={paragrafo.destaque}
                        trechos={trechos}
                      />
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Sem número: não é cláusula. A mais recente em cima. */}
        <section
          id="o-que-mudou"
          aria-labelledby="o-que-mudou-titulo"
          className="mt-12 scroll-mt-24 xl:scroll-mt-6"
        >
          <h2
            id="o-que-mudou-titulo"
            className="text-subheading font-semibold text-ink"
          >
            O que mudou
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {[...versoes].reverse().map((versao) => (
              <li key={versao.em} className="px-4 py-3">
                <p className="num text-label text-ink-muted">
                  {rotuloDataCompleta(versao.em)}
                </p>
                <p className="mt-0.5 text-body text-ink">
                  <TextoComLinks texto={versao.mudou} trechos={trechos} />
                </p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 -ml-4 flex flex-wrap print:hidden">
          <a href="#topo" className={classesBotao({ variante: "terciaria" })}>
            Voltar ao topo
          </a>
          <Link
            href={outro.href}
            className={classesBotao({ variante: "terciaria" })}
          >
            {outro.rotulo}
          </Link>
          <a href={mailto} className={classesBotao({ variante: "terciaria" })}>
            Falar com o Rende
          </a>
        </footer>
      </main>
    </div>
  );
}
