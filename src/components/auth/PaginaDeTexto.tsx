import Link from "next/link";
import { Logotipo } from "@/components/marca/Marca";
import { classesBotao } from "@/components/ui/estilosBotao";

/**
 * A página de texto para ler deslogada: os termos e a privacidade (spec 027).
 * Sem a moldura de entrada, porque é leitura e não formulário. Server
 * component: nada aqui precisa de estado.
 */
export interface SecaoDeTexto {
  titulo: string;
  /**
   * `{ destaque }` sai em negrito: é a cláusula que limita direito, que o CDC
   * (art. 54, § 4º) manda redigir com destaque.
   */
  paragrafos: (string | { destaque: string })[];
}

/**
 * O texto das duas páginas foi redigido em 2026-09-24 e espera revisão de um
 * advogado antes do deploy (`DECISOES.md#d171`). O que falta preencher ainda
 * carrega `[texto`, e o portão continua `rg -n "\[texto" src/app` vazio.
 */
export function PaginaDeTexto({
  titulo,
  vigenteDesde,
  secoes,
}: {
  titulo: string;
  /** "Vigente desde …", por extenso, escrito por quem publica o texto. */
  vigenteDesde: string;
  secoes: SecaoDeTexto[];
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[64ch] bg-canvas px-6 py-12">
      <Logotipo tamanho="md" />

      <h1 className="mt-10 font-display text-title font-semibold text-ink">
        {titulo}
      </h1>
      <p className="mt-1.5 text-label text-ink-muted">
        Vigente desde {vigenteDesde}.
      </p>

      <div className="mt-8 space-y-8">
        {secoes.map((secao, indice) => (
          <section key={secao.titulo}>
            <h2 className="text-heading font-semibold text-ink">
              <span className="num mr-2 text-ink-subtle" aria-hidden>
                {indice + 1}.
              </span>
              {secao.titulo}
            </h2>
            <div className="mt-3 space-y-3 text-body text-ink">
              {secao.paragrafos.map((paragrafo, i) =>
                typeof paragrafo === "string" ? (
                  <p key={i}>{paragrafo}</p>
                ) : (
                  <p key={i} className="font-semibold">
                    {paragrafo.destaque}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12">
        <Link
          href="/login"
          className={classesBotao({
            variante: "terciaria",
            className: "-ml-4",
          })}
        >
          Voltar
        </Link>
      </div>
    </main>
  );
}
