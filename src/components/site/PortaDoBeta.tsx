import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ListaDeEspera } from "@/components/site/ListaDeEspera";
import { classesBotao } from "@/components/ui/estilosBotao";
import { fraseDasVagas } from "@/lib/domain/convite";
import { BETA_PADRAO, lerBeta } from "@/lib/server/beta";
import type { OrigemDaEspera } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A porta das páginas públicas (spec 184, `DECISOES.md#d406`): na fase
 * `PUBLICO`, o `children` (o botão do teste, intocado); na `BETA`, o selo, o
 * número das vagas, a lista de espera e o "Tenho um convite". No lançamento
 * nenhuma página se reescreve.
 *
 * `compacta` é para onde o formulário não cabe (o topo, a barra do celular, o
 * fim do desktop): o selo e "Entrar na lista" para a `#lista` da página, que
 * é a porta inteira. O `botao` é a classe do botão que ela substitui, para a
 * hierarquia da tela não mudar.
 */
type Props = { children: ReactNode; className?: string } & (
  | { compacta: true; botao: string; origem?: never }
  | { compacta?: false; origem: OrigemDaEspera; botao?: never }
);

export async function PortaDoBeta(props: Props) {
  const beta = await lerBeta();
  if (beta.fase === "PUBLICO") return props.children;

  // O padrão por referência: ninguém leu a contagem (`lerBeta`).
  const ocupadas = beta === BETA_PADRAO ? undefined : beta.ocupadas;
  const esgotadas = ocupadas !== undefined && ocupadas >= beta.vagas;
  const selo = (
    <p className="flex items-center gap-1.5 text-label font-semibold text-ink-muted">
      <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
      {esgotadas ? "Vagas do beta esgotadas" : "Beta fechado · por convite"}
    </p>
  );

  if (props.compacta) {
    return (
      <div className={cn("flex gap-3", props.className)}>
        {selo}
        <a href="#lista" className={props.botao}>
          Entrar na lista
        </a>
      </div>
    );
  }

  return (
    <div id="lista" className={cn("max-w-md scroll-mt-4", props.className)}>
      {selo}
      <p className="num mt-2 text-subheading font-semibold text-ink">
        {fraseDasVagas({ vagas: beta.vagas, ocupadas })}
      </p>
      {esgotadas && (
        <p className="mt-1 text-body text-ink-muted">
          Você é avisada quando abrirem mais.
        </p>
      )}
      <ListaDeEspera origem={props.origem} className="mt-6" />
      <Link
        href="/cadastro"
        className={classesBotao({
          variante: "terciaria",
          tamanho: "lg",
          larguraTotal: true,
          className: "mt-3",
        })}
      >
        Tenho um convite
      </Link>
    </div>
  );
}
