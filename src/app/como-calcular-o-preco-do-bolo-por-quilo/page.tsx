import type { Metadata } from "next";
import {
  CabecalhoDoArtigo,
  Convite,
  Formula,
  OutrosDoces,
  type Passo,
  Passos,
  Perguntas,
  TITULO_H2,
  Valor,
} from "@/components/site/Artigo";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Rodape, Topo } from "@/components/site/Moldura";
import { boloDe, POR_BOLO, POR_QUILO } from "@/lib/domain/exemplo";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";

/**
 * A resposta para "como calcular o preço do bolo por kg" (spec 068, sessão B).
 * O formato é o da página do cookie (037); o que só esta tem é o quilo que
 * muda com o tamanho do bolo, porque caixa, base e decoração entram uma vez
 * por bolo (`DECISOES.md#d256`). Toda quantia sai das funções do app sobre
 * `boloDe`, e `tests/domain/exemplo.test.ts` prende os números.
 */

const ATUALIZADO_EM = "2026-10-02";

const ENDERECO = "/como-calcular-o-preco-do-bolo-por-quilo" as const;

const TITULO = "Como calcular o preço do bolo por quilo, passo a passo";

/** O exemplo da página é o bolo de 2 kg. */
const EXEMPLO_BOLO = boloDe(2);
const { custo, parametros } = EXEMPLO_BOLO;
const TAXAS = somaTaxas(parametros);

// Os resultados existem para o exemplo; o teste prende. `0` só satisfaz o tipo.
const precoDe = (custoDoQuilo: number) => {
  const r = calcularPrecoSugerido(custoDoQuilo, parametros);
  return r.ok
    ? { conta: r.precoSugerido, etiqueta: r.precoArredondado }
    : { conta: 0, etiqueta: 0 };
};

const { conta: PRECO_CERTO, etiqueta: PRECO_ETIQUETA } = precoDe(
  custo.custoUnitario,
);
const NA_CONTA_CERTA = verificarPreco(PRECO_CERTO, custo.custoUnitario, TAXAS);

/** Os três tamanhos da seção do erro. */
const tamanho = (quilos: number) => {
  const bolo = boloDe(quilos);
  return {
    quilos,
    custoDoBolo: bolo.custo.custoTotalLote,
    custoDoQuilo: bolo.custo.custoUnitario,
    precoDoQuilo: precoDe(bolo.custo.custoUnitario).etiqueta,
    /** O que sobra por quilo cobrando o quilo do bolo de 2 kg. */
    noPrecoUnico: verificarPreco(
      PRECO_ETIQUETA,
      bolo.custo.custoUnitario,
      TAXAS,
    ),
  };
};
const TAMANHOS = [tamanho(1), tamanho(2), tamanho(3)] as const;
const [PEQUENO, , GRANDE] = TAMANHOS;

/** A fatia de 100 g: um décimo do quilo. */
const FATIA = Math.round(custo.custoUnitario / 10);

const DESCRICAO_DA_PAGINA = `Some ingredientes, caixa, sua hora, forno e fixas e divida pelos quilos. No bolo de 2 kg, o quilo que custa ${formatarMoeda(custo.custoUnitario)} sai a ${formatarMoeda(PRECO_ETIQUETA)}.`;

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO_DA_PAGINA,
  // Sobrepõe o `noindex` do layout raiz, como `/conheca`.
  robots: { index: true, follow: true },
  alternates: { canonical: ENDERECO },
  openGraph: {
    title: TITULO,
    description: DESCRICAO_DA_PAGINA,
    url: ENDERECO,
    locale: "pt_BR",
    type: "article",
    siteName: "Rende",
  },
};

const PASSOS: Passo[] = [
  {
    parcela: "custoInsumos",
    titulo: "Ingredientes: pese o bolo pronto",
    texto: [
      "Bolo por quilo se vende pelo que vai pra mesa: massa, recheio e cobertura juntos, e não pelo peso da farinha. Some o que a receita inteira leva e pese o bolo montado.",
      "O recheio costuma ser a parte cara. Leite condensado, leite em pó e chocolate pesam mais no custo do que a massa, e um bolo com mais recheio por camada é outro custo por quilo.",
      "Pesou uma vez, anote: o mesmo bolo na mesma forma pesa sempre perto disso.",
    ],
  },
  {
    parcela: "custoEmbalagem",
    titulo: "Embalagem: a caixa e a base, uma por bolo",
    texto: [
      "A caixa, a base de papelão, a fita e o topo. O bolo de 1 kg leva uma caixa, e o de 3 kg também. É a primeira parcela que não cresce com o peso: conte por bolo, e não por quilo.",
    ],
  },
  {
    parcela: "custoMaoDeObra",
    titulo: "Seu trabalho: o que é por camada e o que é por bolo",
    texto: [
      "Bater a massa, assar, cortar e rechear cresce com o bolo: cada camada a mais é mais tempo. Alisar a cobertura, decorar, pôr o topo e fechar a caixa leva quase o mesmo num bolo de 1 kg e num de 3.",
      "Meça as duas partes separadas. O tempo de decorar entra uma vez por bolo; o de fazer as camadas entra por quilo.",
      <>
        O valor da hora sai do que você quer tirar no mês dividido pelas horas
        que passa na cozinha. O exemplo conta{" "}
        <Valor centavos={POR_BOLO.custoMaoDeObra} /> por bolo, o tempo de
        decorar, e <Valor centavos={POR_QUILO.custoMaoDeObra} /> por quilo, o de
        fazer as camadas.
      </>,
    ],
  },
  {
    parcela: "custoEnergiaGas",
    titulo: "O forno",
    texto: [
      "No bolo, o gasto de energia é quase todo do forno. Conte pelo tempo que cada camada fica lá dentro: bolo maior assa mais tempo ou em mais formas, e essa parcela cresce com o peso.",
    ],
  },
  {
    parcela: "custoIndireto",
    titulo: "A fatia das despesas fixas",
    texto: [
      "Aluguel, internet, o MEI, o celular: chegam todo mês, venda você dez bolos ou quarenta. Some o mês e divida pelo que você vende nele.",
      "Uma encomenda pede a mesma conversa no WhatsApp, seja o bolo pequeno ou grande. Por isso o exemplo põe uma parte da fatia por bolo e o resto por quilo.",
    ],
  },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: "Quanto cobrar o quilo do bolo?",
    resposta: (
      <>
        Depende do que o seu custa e do tamanho do bolo: faça os cinco passos
        com os números da sua cozinha. No exemplo, o quilo do bolo de 2 kg custa{" "}
        <Valor centavos={custo.custoUnitario} /> e sai a{" "}
        <Valor centavos={PRECO_ETIQUETA} />. Esse é o número do exemplo. O seu
        sai do que você paga nos ingredientes e do tempo que leva pra decorar.
      </>
    ),
  },
  {
    pergunta: "Bolo de festa com topo e decoração: soma como?",
    resposta:
      "O topo, as flores e as velas são do bolo inteiro, como a caixa: some por bolo, e não por quilo. O tempo de decorar também. Somados ao quilo, eles saem baratos no bolo pequeno e caros no grande.",
  },
  {
    pergunta: "Recheio de morango custa mais: muda o quilo?",
    resposta:
      "Muda. Fruta fresca custa mais e perde mais que recheio de brigadeiro. Faça a conta uma vez por recheio e tenha um preço de quilo pra cada um, ou junte os recheios em dois ou três grupos de preço.",
  },
  {
    pergunta: "Como saber quanto o bolo pesa antes de fazer?",
    resposta:
      "Pese uma vez o bolo pronto, montado e coberto, e anote quanto cada forma rende com cada recheio. Da próxima vez a receita já diz o peso. Quem vende por aro, 15 ou 20, faz o mesmo: pesa uma vez o bolo de cada aro.",
  },
  {
    pergunta: "Quanto cobrar uma fatia?",
    resposta: (
      <>
        A fatia de 100 g é um décimo do quilo: no exemplo,{" "}
        <Valor centavos={FATIA} /> de custo. Some a embalagem da fatia, o
        pratinho, o garfo e a caixinha, e faça a mesma divisão por 1 menos a
        margem e menos a maquininha.
      </>
    ),
  },
];

export default function PaginaPrecoDoBoloPorQuilo() {
  return (
    <>
      <Topo />

      <main id="conteudo">
        <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
          <CabecalhoDoArtigo
            titulo="Como calcular o preço do bolo por quilo"
            atualizadoEm={ATUALIZADO_EM}
          >
            Some o que o bolo inteiro custa (ingredientes, a caixa e a base, as
            horas de assar e decorar, o forno e uma fatia das despesas fixas),
            divida pelos quilos do bolo pronto e depois por 1 menos a margem e
            menos a maquininha. Um bolo de 2 kg que custa{" "}
            <Valor centavos={custo.custoTotalLote} /> tem o quilo a{" "}
            <Valor centavos={custo.custoUnitario} /> de custo; com{" "}
            {parametros.margemDesejada}% de margem e{" "}
            {parametros.taxaCartaoConsiderada}% de maquininha, o quilo sai a{" "}
            <Valor centavos={PRECO_ETIQUETA} />.
          </CabecalhoDoArtigo>

          {/* Como no cookie: a conta logo depois da resposta no celular, e
              grudada ao lado dos passos no desktop. */}
          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <ContaAberta
                parada
                exemplo={EXEMPLO_BOLO}
                unidade={{ singular: "quilo", plural: "quilos" }}
                className="lg:sticky lg:top-8"
              />
            </div>

            <div className="max-w-[68ch] lg:col-start-1 lg:row-start-1">
              <Passos
                passos={PASSOS}
                exemplo={EXEMPLO_BOLO}
                sufixo=" por quilo, no bolo de 2 kg."
              />

              <section aria-labelledby="margem" className="mt-16">
                <h2 id="margem" className={TITULO_H2}>
                  Margem e maquininha: a conta do quilo
                </h2>
                <p className="mt-4 text-body text-ink">
                  Com o custo do quilo na mão, falta decidir quanto você quer
                  que sobre. A maquininha tira a parte dela do preço, e não do
                  custo. As duas saem do preço de venda, então as duas entram na
                  divisão:
                </p>
                <Formula exemplo={EXEMPLO_BOLO} preco={PRECO_CERTO} />
                <p className="mt-6 text-body text-ink">
                  Confira de volta: dos <Valor centavos={PRECO_CERTO} /> do
                  quilo, a maquininha leva{" "}
                  <Valor centavos={NA_CONTA_CERTA.custoTaxas} /> e o custo leva{" "}
                  <Valor centavos={custo.custoUnitario} />. Sobram{" "}
                  <Valor centavos={NA_CONTA_CERTA.lucroUnitario} /> pra você,{" "}
                  {formatarPercentual(NA_CONTA_CERTA.margemReal, 0)} do preço.
                  Na etiqueta, o meio real leva o quilo a{" "}
                  <Valor centavos={PRECO_ETIQUETA} />.
                </p>
              </section>
            </div>
          </div>

          <div className="mt-16 border-t border-line pt-16">
            <div className="max-w-[68ch]">
              <section aria-labelledby="erro">
                <h2 id="erro" className={TITULO_H2}>
                  O erro do bolo: um preço de quilo pra qualquer tamanho
                </h2>
                <p className="mt-4 text-body text-ink">
                  A caixa, a base e a decoração entram uma vez em cada bolo. No
                  bolo de 1 kg, elas pesam inteiras num quilo; no de 3 kg, se
                  dividem por três. Por isso o quilo do bolo pequeno custa mais,
                  com a mesma receita:
                </p>

                <table className="mt-6 w-full border-y border-line text-left">
                  <caption className="mb-3 text-left text-label text-ink-muted">
                    {`O mesmo bolo em três tamanhos, com ${parametros.margemDesejada}% de margem e ${parametros.taxaCartaoConsiderada}% de maquininha`}
                  </caption>
                  <thead>
                    <tr className="border-b border-line text-label text-ink-muted">
                      <th scope="col" className="py-3 pr-2 font-medium">
                        Bolo
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-right font-medium"
                      >
                        Custo do bolo
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-right font-medium"
                      >
                        Custo do quilo
                      </th>
                      <th
                        scope="col"
                        className="py-3 pl-2 text-right font-medium"
                      >
                        Preço do quilo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TAMANHOS.map((t) => (
                      <tr key={t.quilos} className="text-body text-ink">
                        <th
                          scope="row"
                          className="num py-4 pr-2 font-medium whitespace-nowrap"
                        >
                          {t.quilos} kg
                        </th>
                        <td className="num px-2 py-4 text-right whitespace-nowrap">
                          {formatarMoeda(t.custoDoBolo)}
                        </td>
                        <td className="num px-2 py-4 text-right whitespace-nowrap">
                          {formatarMoeda(t.custoDoQuilo)}
                        </td>
                        <td className="num py-4 pl-2 text-right font-semibold whitespace-nowrap">
                          {formatarMoeda(t.precoDoQuilo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="mt-6 text-body text-ink">
                  Quem cobra o quilo do bolo de 2 kg em qualquer tamanho vende o
                  de 1 kg a <Valor centavos={PRECO_ETIQUETA} />. A maquininha
                  leva <Valor centavos={PEQUENO.noPrecoUnico.custoTaxas} />, o
                  custo leva <Valor centavos={PEQUENO.custoDoQuilo} /> e sobram{" "}
                  <Valor centavos={PEQUENO.noPrecoUnico.lucroUnitario} />,{" "}
                  {formatarPercentual(PEQUENO.noPrecoUnico.margemReal, 0)} do
                  preço em vez de {parametros.margemDesejada}%. No de 3 kg, o
                  mesmo quilo deixa{" "}
                  {formatarPercentual(GRANDE.noPrecoUnico.margemReal, 0)}, mais
                  do que você pediu, e o bolo grande fica caro pra cliente.
                </p>
                <p className="mt-4 text-body text-ink">
                  Há duas saídas, e a escolha é sua. Uma é ter um preço de quilo
                  por faixa de tamanho, mais alto no bolo pequeno. A outra é
                  cobrar um valor fixo por bolo, que paga a caixa, a base e a
                  decoração, mais o quilo, que paga o resto.
                </p>
              </section>

              <Perguntas perguntas={PERGUNTAS} />

              <OutrosDoces endereco={ENDERECO} />
            </div>
          </div>
        </article>

        <Convite>
          O Rende guarda a conta de cada bolo e de cada recheio, e refaz quando
          um ingrediente sobe.
        </Convite>
      </main>

      <Rodape />
    </>
  );
}
