"use client";

import { useState } from "react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Esqueleto } from "@/components/ui/Esqueleto";
import {
  CATALOGO_DO_COMECO,
  type IdPasso,
  type PassoBase,
  type EstadoPasso,
} from "@/lib/domain/onboarding";
import { useComeco } from "@/lib/hooks/useComeco";
import { useDesktop } from "@/lib/hooks/useDispositivo";
import { BlocoPasso } from "./BlocoPasso";
import { CadeiaDoDinheiro } from "./CadeiaDoDinheiro";
import { InstalarNaTela } from "./InstalarNaTela";
import { OQueMaisTem } from "./OQueMaisTem";
import { QuandoNaoTemInternet } from "./QuandoNaoTemInternet";
import { SecaoGuia } from "./SecaoGuia";
import { Trilha } from "./Trilha";

/** `null` enquanto ela não abrir nem fechar nada com o dedo. */
type Abertura = { id: IdPasso | null } | null;

/**
 * O mapa dos cinco passos, na página que continua existindo depois deles.
 *
 * O cartão da tela Hoje mostra um passo por vez e acaba quando o caminho acaba.
 * Esta página mostra os cinco e **não acaba**: é onde as respostas ficam para a
 * pergunta que aparece na terceira semana (`DECISOES.md#d69`). Com o caminho já
 * encerrado, ela vira referência — os cinco passos sem estado, porque as cinco
 * perguntas deixam de ser feitas no dia em que ele termina.
 *
 * **Os cinco passos acabam; o resto da página não.** Abaixo deles vêm as quatro
 * seções que continuam valendo na terceira semana e na trigésima: a cadeia do
 * dinheiro, o que existe fora da navegação, o que acontece sem internet e o
 * convite para instalar. Nenhuma delas depende da conta, e por isso nenhuma
 * espera as cinco assinaturas: a página nunca fica em branco.
 */
export function TelaComecar() {
  const desktop = useDesktop();
  const { passos, progresso, proximo, carregando, encerrado } = useComeco();
  const [abertura, setAbertura] = useState<Abertura>(null);

  // Sem abertura manual, o passo de agora é o que já vem aberto: no celular ela
  // chega aqui para fazer alguma coisa, e não para ler os cinco.
  const aberto = abertura ? abertura.id : (proximo?.id ?? null);

  const lista: { passo: PassoBase; estado: EstadoPasso | null }[] = encerrado
    ? CATALOGO_DO_COMECO.map((passo) => ({ passo, estado: null }))
    : passos.map((passo) => ({ passo, estado: passo.estado }));

  return (
    <>
      <CabecalhoPagina
        titulo="Como funciona"
        descricao="Os cinco passos do começo, o que cada tela faz por você e o que acontece quando a internet cai. Esta página fica aqui: você pode voltar quando quiser."
      />

      {carregando ? (
        <div role="status" aria-label="Carregando" className="mt-4">
          <Esqueleto className="h-24 rounded-lg" />
        </div>
      ) : encerrado ? (
        <p className="mt-4 max-w-[62ch] text-body text-ink-muted">
          Você já encerrou o caminho do começo. Os cinco passos ficam aqui como
          referência, na ordem em que uma coisa depende da outra.
        </p>
      ) : (
        <section className="mt-4 rounded-lg border border-line bg-surface px-4 py-4 lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-label font-medium text-ink-muted">
              Onde você está
            </h2>
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
              : "Nenhum passo é obrigatório e nenhuma tela fica trancada. Esta é só a ordem que evita refazer trabalho."}
          </p>
        </section>
      )}

      {!carregando && (
        <section aria-labelledby="os-cinco" className="mt-4">
          <h2 id="os-cinco" className="sr-only">
            Os cinco passos
          </h2>
          <ol className="space-y-3">
            {lista.map(({ passo, estado }) => (
              <BlocoPasso
                key={passo.id}
                passo={passo}
                estado={estado}
                // No desktop os cinco convivem abertos; no celular, um por vez.
                aberto={desktop || encerrado || aberto === passo.id}
                dobravel={!desktop && !encerrado}
                aoAlternar={() =>
                  setAbertura({ id: aberto === passo.id ? null : passo.id })
                }
              />
            ))}
          </ol>
        </section>
      )}

      {/* Daqui para baixo nada depende da conta, e é isto que "o guia que fica"
          quer dizer: o cartão da tela Hoje acaba, os cinco passos viram
          referência, e estas quatro seções continuam respondendo. */}
      <SecaoGuia
        id="cadeia"
        titulo="A cadeia do dinheiro"
        descricao="Cada coisa que você cadastra é o que dá número à seguinte. É por isso que o sistema pede tudo isso, e nesta ordem."
      >
        <CadeiaDoDinheiro />
      </SecaoGuia>

      <SecaoGuia
        id="mais"
        titulo="O que mais tem aqui"
        descricao="Três telas que não estão no menu, e que são justamente as que mais poupam trabalho seu."
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
      <InstalarNaTela />
    </>
  );
}
