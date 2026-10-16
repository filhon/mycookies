import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { FaixaDoCusto } from "@/components/site/FaixaDoCusto";
import { ListaDeEspera } from "@/components/site/ListaDeEspera";
import { Rodape, Topo } from "@/components/site/Moldura";
import { classesBotao } from "@/components/ui/estilosBotao";
import { FRASE_DO_PRECO_DE_FUNDADORA } from "@/lib/domain/assinatura";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { fraseDaVaga } from "@/lib/domain/convite";
import { EXEMPLO, faixaDoExemplo } from "@/lib/domain/exemplo";
import { lerOConvite, textoDaPrevia } from "./dados";
import { GuardarConvite } from "./GuardarConvite";

/**
 * A página do convite (spec 183): a primeira impressão do Rende para quem
 * chega pela amiga. A fundadora nomeada antes do produto, e um primário só.
 * Fora do `sitemap`, `noindex`, e lida a cada requisição: o convite muda de
 * estado quando é usado ou cancelado.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { titulo, descricao } = textoDaPrevia(
    await lerOConvite((await params).codigo),
  );
  return {
    title: { absolute: titulo },
    description: descricao,
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descricao,
      locale: "pt_BR",
      type: "website",
      siteName: "Rende",
    },
  };
}

const O_QUE_FAZ = [
  "Soma o custo de cada doce com o saquinho, o gás e a sua hora.",
  "Sugere o preço e diz quanto sobra pra você depois da maquininha.",
  "Guarda os pedidos e mostra o caixa do mês.",
];

const TITULO =
  "text-balance font-display text-[2rem] leading-[1.1] font-bold tracking-tight text-ink lg:text-[3rem] lg:leading-[1.05]";

export default async function PaginaDoConvite({ params }: Props) {
  const lido = await lerOConvite((await params).codigo);
  const { estado, codigo, convite, conta, beta } = lido;
  // Depois do lançamento o convite não é mais porta: o cadastro abre, e o
  // código vai junto no endereço.
  if (estado === "publico") {
    redirect(codigo ? `/cadastro?convite=${codigo}` : "/cadastro");
  }

  const restam = Math.max(0, beta.vagas - beta.ocupadas);
  const faixa = estado === "aberto" ? faixaDoExemplo(EXEMPLO) : null;

  return (
    <>
      <Topo />
      <main id="conteudo" className="overflow-x-clip">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 lg:px-10 lg:pt-20 lg:pb-24">
          {estado === "aberto" && conta ? (
            <section aria-labelledby="frase">
              <GuardarConvite codigo={codigo} />
              <p className="text-label font-semibold text-ink-muted">
                Beta fechado · por convite
              </p>
              <h1 id="frase" className={`mt-3 ${TITULO}`}>
                {fraseDaVaga({
                  paraQuem: convite?.paraQuem,
                  proprietaria: conta.proprietaria,
                  negocio: conta.nome,
                })}
              </h1>
              <p className="mt-5 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
                O Rende está em beta fechado: {beta.vagas} vagas, por convite.{" "}
                {restam === 1 ? "Resta 1." : `Restam ${restam}.`}
              </p>

              <ul className="mt-8 space-y-3">
                {O_QUE_FAZ.map((linha) => (
                  <li
                    key={linha}
                    className="flex max-w-[52ch] items-start gap-3 text-body text-ink"
                  >
                    <Check
                      aria-hidden
                      strokeWidth={1.75}
                      className="mt-0.5 size-5 shrink-0 text-brand-ink"
                    />
                    {linha}
                  </li>
                ))}
              </ul>

              <Link
                href={`/cadastro?convite=${codigo}`}
                className={classesBotao({
                  variante: "primaria",
                  tamanho: "lg",
                  className: "mt-10 w-full sm:w-auto lg:h-14 lg:px-6",
                })}
              >
                Aceitar o convite
              </Link>
              <p className="mt-3 text-label text-ink-muted">
                {DIAS_DE_TESTE} dias grátis, sem cartão.
              </p>
              {/* Sem valor em reais: o desconto depende da pesquisa (spec 187). */}
              <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
                {FRASE_DO_PRECO_DE_FUNDADORA}
              </p>
            </section>
          ) : (
            <section aria-labelledby="frase">
              <h1 id="frase" className={TITULO}>
                {estado === "sem-vaga"
                  ? `As ${beta.vagas} vagas do beta acabaram antes do seu convite chegar.`
                  : "Este convite não vale mais."}
              </h1>
              <p className="mt-5 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
                {estado === "sem-vaga"
                  ? "Entre na lista: quando abrirem mais vagas, quem está nela fica sabendo primeiro."
                  : "Peça outro a quem te mandou, ou entre na lista."}
              </p>
              <ListaDeEspera origem="convite" className="mt-8 max-w-md" />
            </section>
          )}

          <Link
            href="/login"
            className={classesBotao({
              variante: "terciaria",
              tamanho: "sm",
              className: "mt-6 -ml-3",
            })}
          >
            Já tenho conta
          </Link>
        </div>

        {/* A conta do exemplo se montando, como na `/conheca` (`#d382`). */}
        {faixa && <FaixaDoCusto {...faixa} />}
      </main>
      <Rodape />
    </>
  );
}
