"use client";

import { useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import {
  IndiceDaPagina,
  type Ancora,
} from "@/components/layout/IndiceDaPagina";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { CATALOGO_DO_COMECO, type IdPasso } from "@/lib/domain/onboarding";
import { useCadeia } from "@/lib/hooks/useCadeia";
import { useComeco } from "@/lib/hooks/useComeco";
import { useDesktop } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";
import { BlocoPasso, LinhaPasso } from "./BlocoPasso";
import { CadeiaDoDinheiro } from "./CadeiaDoDinheiro";
import { InstalarNaTela, useInstalado } from "./InstalarNaTela";
import { OQueMaisTem } from "./OQueMaisTem";
import { QuandoNaoTemInternet } from "./QuandoNaoTemInternet";
import { SecaoGuia } from "./SecaoGuia";
import { Trilha } from "./Trilha";

/** `null` enquanto ela não abrir nem fechar nada com o dedo. */
type Abertura = { id: IdPasso | null } | null;

/** Os cinco, a cadeia e o resto, na lista com divisórias da página. */
const LISTA =
  "divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface";

const ANCORA_DOS_CINCO: Ancora = { id: "os-cinco", rotulo: "Os cinco" };

const ANCORAS_QUE_FICAM: readonly Ancora[] = [
  { id: "cadeia", rotulo: "O dinheiro" },
  { id: "mais", rotulo: "Outras telas" },
  { id: "offline", rotulo: "Sem internet" },
  { id: "instalar", rotulo: "Instalar" },
];

/**
 * O mapa dos cinco passos, na página que continua existindo depois deles.
 *
 * O cartão da tela Hoje mostra um passo por vez e acaba quando o caminho acaba.
 * Esta página mostra os cinco e **não acaba**: é onde as respostas ficam para a
 * pergunta que aparece na terceira semana (`DECISOES.md#d69`).
 *
 * **A ordem muda com a fase** (`DECISOES.md#d295`). Com o caminho aberto, "Onde
 * você está" e os cinco vêm primeiro, porque é o que ela veio fazer. Encerrado,
 * os cinco descem para o fim, uma linha cada, e o que ela volta para buscar (a
 * cadeia do dinheiro, as outras telas, o sem internet, o instalar) sobe. Nenhuma
 * dessas quatro espera as cinco assinaturas: a página nunca fica em branco. Os
 * números da cadeia chegam depois das frases (`#d296`).
 */
export function TelaComecar() {
  const desktop = useDesktop();
  const instalado = useInstalado();
  const { passos, progresso, proximo, carregando, encerrado } = useComeco();
  const [abertura, setAbertura] = useState<Abertura>(null);
  const cadeia = useCadeia(useContaId());

  // Sem abertura manual, o passo de agora é o que já vem aberto: no celular ela
  // chega aqui para fazer alguma coisa, e não para ler os cinco.
  const aberto = abertura ? abertura.id : (proximo?.id ?? null);

  const queFicam = ANCORAS_QUE_FICAM.filter(
    (ancora) => !instalado || ancora.id !== "instalar",
  );
  const ancoras = carregando
    ? queFicam
    : encerrado
      ? [...queFicam, ANCORA_DOS_CINCO]
      : [ANCORA_DOS_CINCO, ...queFicam];

  return (
    <>
      <CabecalhoPagina
        titulo="Como funciona"
        descricao={
          encerrado
            ? "O que cada tela faz por você, o que acontece sem internet, e onde mora cada coisa."
            : "Os cinco passos do começo, o que cada tela faz por você e o que acontece quando a internet cai. Esta página fica aqui: você pode voltar quando quiser."
        }
      >
        <IndiceDaPagina ancoras={ancoras} rotulo="Partes da página" />
      </CabecalhoPagina>

      {carregando ? (
        <div role="status" aria-label="Carregando" className="mt-4">
          <Esqueleto className="h-24 rounded-lg" />
        </div>
      ) : (
        !encerrado && (
          <section
            id={ANCORA_DOS_CINCO.id}
            aria-labelledby="os-cinco-titulo"
            className="mt-4 scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
          >
            <h2 id="os-cinco-titulo" className="sr-only">
              Os cinco passos
            </h2>

            <div className="rounded-lg border border-line bg-surface px-4 py-4 lg:px-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-label font-medium text-ink-muted">
                  Onde você está
                </h3>
                <span className="num shrink-0 text-label font-semibold text-ink">
                  {progresso.feitos} de {progresso.total}
                </span>
              </div>

              <Trilha
                className="mt-2.5"
                feitos={progresso.feitos}
                total={progresso.total}
              />

              <p className="mt-2.5 max-w-[62ch] text-label text-ink-muted">
                {progresso.concluido
                  ? "Os cinco estão feitos. O cartão da tela Hoje espera o seu Concluir."
                  : "Nenhum passo é obrigatório e nenhuma tela fica trancada. Esta é só a ordem que chega mais rápido a um preço."}
              </p>
            </div>

            <ol className={cn(LISTA, "mt-4")}>
              {passos.map((passo) => (
                <BlocoPasso
                  key={passo.id}
                  passo={passo}
                  estado={passo.estado}
                  // No desktop os cinco convivem abertos; no celular, um por vez.
                  aberto={desktop || aberto === passo.id}
                  dobravel={!desktop}
                  aoAlternar={() =>
                    setAbertura({ id: aberto === passo.id ? null : passo.id })
                  }
                />
              ))}
            </ol>
          </section>
        )
      )}

      <SecaoGuia
        id="cadeia"
        titulo={
          cadeia.ficha
            ? `A cadeia do dinheiro, no seu ${cadeia.ficha.nome}`
            : "A cadeia do dinheiro"
        }
        descricao={
          cadeia.ficha
            ? "De um pacote que você compra até o que entrou no caixa, com os números de hoje."
            : "Cada coisa que você cadastra é o que dá número à seguinte. É por isso que o sistema pede tudo isso, e nesta ordem."
        }
        className={encerrado ? "mt-6 lg:mt-8" : undefined}
      >
        <CadeiaDoDinheiro dados={cadeia} />
      </SecaoGuia>

      <SecaoGuia
        id="mais"
        titulo="O que mais tem aqui"
        descricao="Cinco telas fora do caminho de todo dia, e que são justamente as que mais poupam trabalho seu."
      >
        <OQueMaisTem />
      </SecaoGuia>

      <SecaoGuia
        id="offline"
        titulo="Quando não tem internet"
        descricao="Na cozinha e no mercado o sinal cai, e isso não é falha do sistema nem do seu aparelho."
      >
        <QuandoNaoTemInternet />
      </SecaoGuia>

      {/* Carrega o próprio título: instalado, a seção inteira some. */}
      <InstalarNaTela id="instalar" />

      {!carregando && encerrado && (
        <SecaoGuia
          id={ANCORA_DOS_CINCO.id}
          titulo="Os cinco passos do começo"
          descricao="A ordem que chega mais rápido a um preço, se você for mostrar o sistema para alguém."
        >
          <ol className={LISTA}>
            {CATALOGO_DO_COMECO.map((passo) => (
              <LinhaPasso key={passo.id} passo={passo} />
            ))}
          </ol>
        </SecaoGuia>
      )}
    </>
  );
}
