import { TrendingDown } from "lucide-react";
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
import { Dinheiro } from "@/components/ui/Dinheiro";
import {
  EXEMPLO_BOLO_DE_POTE,
  HORA_DO_BOLO_DE_POTE,
  NO_APLICATIVO,
} from "@/lib/domain/exemplo";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  type ParametrosPreco,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";

/**
 * A resposta para "como precificar bolo de pote" (spec 068, sessão C). O
 * formato é o da página do cookie (037); o que só esta tem é a embalagem que
 * pesa e o aplicativo de entrega, cuja comissão entra na mesma divisão da
 * maquininha (`DECISOES.md#d256`). Toda quantia sai das funções do app sobre
 * `EXEMPLO_BOLO_DE_POTE` e `NO_APLICATIVO`, e `tests/domain/exemplo.test.ts`
 * prende os números.
 */

const ATUALIZADO_EM = "2026-10-02";

const ENDERECO = "/como-calcular-o-preco-do-bolo-de-pote" as const;

const TITULO = "Como calcular o preço do bolo de pote, passo a passo";

const { custo, parametros } = EXEMPLO_BOLO_DE_POTE;
const TAXAS = somaTaxas(parametros);
const TAXAS_DO_APLICATIVO = somaTaxas(NO_APLICATIVO);

// Os resultados existem para o exemplo; o teste prende. `0` só satisfaz o tipo.
const precoDe = (p: ParametrosPreco) => {
  const r = calcularPrecoSugerido(custo.custoUnitario, p);
  return r.ok
    ? { conta: r.precoSugerido, etiqueta: r.precoArredondado }
    : { conta: 0, etiqueta: 0 };
};

const { conta: PRECO_CERTO, etiqueta: PRECO_BALCAO } = precoDe(parametros);
const NA_CONTA_CERTA = verificarPreco(PRECO_CERTO, custo.custoUnitario, TAXAS);
const NO_BALCAO = verificarPreco(PRECO_BALCAO, custo.custoUnitario, TAXAS);

const { conta: PRECO_APP_CONTA, etiqueta: PRECO_APP } = precoDe(NO_APLICATIVO);
const NO_APP = verificarPreco(
  PRECO_APP,
  custo.custoUnitario,
  TAXAS_DO_APLICATIVO,
);
/** O erro: o pote do balcão, no mesmo preço, vendido pelo aplicativo. */
const BALCAO_NO_APP = verificarPreco(
  PRECO_BALCAO,
  custo.custoUnitario,
  TAXAS_DO_APLICATIVO,
);

/** O quanto a embalagem pesa no custo do pote, em %. */
const PARTE_DA_EMBALAGEM = (custo.custoEmbalagem / custo.custoTotalLote) * 100;

const DESCRICAO_DA_PAGINA = `Some massa, creme, pote, sua hora, forno e fixas, e divida por 1 menos margem e taxas. O pote de ${formatarMoeda(custo.custoUnitario)} sai a ${formatarMoeda(PRECO_BALCAO)} no balcão e ${formatarMoeda(PRECO_APP)} no app.`;

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
    titulo: "Ingredientes: o recheio pesado por pote",
    texto: [
      `Faça a conta pelo lote: a massa, o creme, a fruta e a calda que você prepara de uma vez, divididos pelos potes que saem dele. O exemplo é um lote de ${EXEMPLO_BOLO_DE_POTE.rende} potes.`,
      "Quem decide o custo é o quanto vai em cada pote. O mesmo pote com 20 g a mais de creme já é outro custo, e quem monta no olho monta cada pote de um jeito. Pese a massa e o creme de um pote, anote, e monte todos com esse peso.",
      "A fruta entra pelo que você comprou, e não pelo que foi pro pote: o morango que saiu feio na limpeza também foi pago.",
    ],
  },
  {
    parcela: "custoEmbalagem",
    titulo: "Embalagem: a parcela que mais engana",
    texto: [
      "Junto com o pote vão a tampa, a colher, a etiqueta e, se vai pra entrega, o saquinho. Cada peça custa centavos, e por isso costuma ficar de fora da conta.",
      <>
        No exemplo, pote, tampa, colher e etiqueta somam{" "}
        <Valor
          centavos={Math.round(
            custo.custoEmbalagem / EXEMPLO_BOLO_DE_POTE.rende,
          )}
        />{" "}
        por pote, {formatarPercentual(PARTE_DA_EMBALAGEM, 0)} do custo: mais que
        o forno e as despesas fixas juntos. Conte cada peça pelo preço do pacote
        dividido pelas unidades que vêm nele.
      </>,
    ],
  },
  {
    parcela: "custoMaoDeObra",
    titulo: "Seu trabalho: montar camada por camada",
    texto: [
      "A massa assa uma vez pro lote inteiro. A montagem é pote por pote: massa, creme, fruta, de novo massa e creme, tampa e etiqueta. Dez potes são dez montagens, e a maior parte do tempo do lote fica nelas.",
      "Para saber o seu tempo, marque o lote inteiro, do começo da massa até o último pote etiquetado. Some o tempo de esperar a massa esfriar se você fica parada nele.",
      <>
        O valor da hora sai do que você quer tirar no mês dividido pelas horas
        que passa na cozinha. O lote do exemplo leva uma hora e meia, a{" "}
        <Valor centavos={HORA_DO_BOLO_DE_POTE.valor} /> a hora.
      </>,
    ],
  },
  {
    parcela: "custoEnergiaGas",
    titulo: "O forno da massa",
    texto: [
      "No bolo de pote o forno trabalha uma vez: a massa do lote assa numa forma grande, e o creme vai ao fogão por poucos minutos. Dividido pelos potes, fica entre as parcelas menores. Conte pelo tempo de forno e de fogão de cada lote.",
    ],
  },
  {
    parcela: "custoIndireto",
    titulo: "A fatia das despesas fixas",
    texto: [
      "Aluguel, internet, o MEI, o celular: chegam todo mês, venda você cem potes ou quinhentos. Some o mês e divida pelos potes que você vende nele.",
      "Se o aplicativo de entrega cobra mensalidade, ela entra aqui, e não na comissão: a mensalidade é a mesma com um pedido ou com cem.",
    ],
  },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: "Quanto cobrar por um bolo de pote?",
    resposta: (
      <>
        Depende do que o seu custa: faça os cinco passos com os números da sua
        cozinha. No exemplo, um pote que custa{" "}
        <Valor centavos={custo.custoUnitario} /> sai a{" "}
        <Valor centavos={PRECO_BALCAO} /> no balcão e a{" "}
        <Valor centavos={PRECO_APP} /> no aplicativo. Esses são os números do
        exemplo. Os seus saem do creme que vai em cada pote e do que você paga
        pelo pote vazio.
      </>
    ),
  },
  {
    pergunta: "Bolo de pote no iFood: o preço tem que ser outro?",
    resposta: (
      <>
        Tem. A comissão e a taxa do pagamento online saem do preço, e o pote que
        deixa <Valor centavos={NO_BALCAO.lucroUnitario} /> no balcão deixa{" "}
        <Valor centavos={BALCAO_NO_APP.lucroUnitario} /> no aplicativo, se o
        preço for o mesmo. Ponha o percentual do seu contrato na divisão, no
        lugar da maquininha, e você tem o preço de lá.
      </>
    ),
  },
  {
    pergunta: "Pote de 250 ml ou de 350 ml: como muda?",
    resposta:
      "Muda o recheio e o pote, e a conta é a mesma. O pote maior leva mais massa e mais creme, custa mais vazio e demora um pouco mais pra montar, mas a tampa, a colher e a etiqueta são as mesmas. Por isso o de 350 ml não custa 40% a mais que o de 250 ml: pese o recheio de cada tamanho uma vez e faça uma conta pra cada um.",
  },
  {
    pergunta: "Dá pra cobrar a entrega à parte?",
    resposta:
      "Dá. A entrega não entra no custo do pote: o combustível ou o motoboy mudam com a distância, e não com o bolo. Cobre como taxa de entrega, separada do preço do pote. Assim o pote tem um preço só, entregue perto ou longe.",
  },
];

export default function PaginaPrecoDoBoloDePote() {
  return (
    <>
      <Topo />

      <main id="conteudo">
        <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
          <CabecalhoDoArtigo
            titulo="Como calcular o preço do bolo de pote"
            atualizadoEm={ATUALIZADO_EM}
          >
            Some o que o lote custa (a massa, o creme e a fruta, os potes com
            tampa, colher e etiqueta, o tempo de montar, o forno e uma fatia das
            despesas fixas) e divida pelos potes que ele rende. Depois divida
            por 1 menos a margem e menos a maquininha. Um bolo de pote que custa{" "}
            <Valor centavos={custo.custoUnitario} />, com{" "}
            {parametros.margemDesejada}% de margem e{" "}
            {parametros.taxaCartaoConsiderada}% de maquininha, sai a{" "}
            <Valor centavos={PRECO_BALCAO} /> no balcão. No aplicativo de
            entrega, a comissão entra na mesma divisão, e o mesmo pote sai a{" "}
            <Valor centavos={PRECO_APP} />.
          </CabecalhoDoArtigo>

          {/* Como no cookie: a conta logo depois da resposta no celular, e
              grudada ao lado dos passos no desktop. */}
          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <ContaAberta
                parada
                exemplo={EXEMPLO_BOLO_DE_POTE}
                unidade={{ singular: "pote", plural: "potes" }}
                className="lg:sticky lg:top-8"
              />
            </div>

            <div className="max-w-[68ch] lg:col-start-1 lg:row-start-1">
              <Passos
                passos={PASSOS}
                exemplo={EXEMPLO_BOLO_DE_POTE}
                sufixo=" por pote."
              />

              <section aria-labelledby="margem" className="mt-16">
                <h2 id="margem" className={TITULO_H2}>
                  Margem e maquininha: a conta do pote
                </h2>
                <p className="mt-4 text-body text-ink">
                  Com o custo do pote na mão, falta decidir quanto você quer que
                  sobre. A maquininha tira a parte dela do preço, e não do
                  custo. As duas saem do preço de venda, então as duas entram na
                  divisão:
                </p>
                <Formula exemplo={EXEMPLO_BOLO_DE_POTE} preco={PRECO_CERTO} />
                <p className="mt-6 text-body text-ink">
                  Confira de volta: dos <Valor centavos={PRECO_CERTO} />, a
                  maquininha leva <Valor centavos={NA_CONTA_CERTA.custoTaxas} />{" "}
                  e o custo leva <Valor centavos={custo.custoUnitario} />.
                  Sobram <Valor centavos={NA_CONTA_CERTA.lucroUnitario} /> pra
                  você, {formatarPercentual(NA_CONTA_CERTA.margemReal, 0)} do
                  preço. Na etiqueta, o meio real leva o pote a{" "}
                  <Valor centavos={PRECO_BALCAO} />.
                </p>
              </section>
            </div>
          </div>

          <div className="mt-16 border-t border-line pt-16">
            <div className="max-w-[68ch]">
              <section aria-labelledby="aplicativo">
                <h2 id="aplicativo" className={TITULO_H2}>
                  Vendendo por aplicativo: a comissão entra na conta
                </h2>
                <p className="mt-4 text-body text-ink">
                  O aplicativo de entrega cobra uma comissão sobre cada pedido
                  e, quando a cliente paga por ele, mais uma taxa pelo pagamento
                  online. As duas saem do preço, como a maquininha, e por isso
                  entram na mesma divisão. A maquininha sai da conta, porque
                  quem cobra a cliente é o aplicativo.
                </p>
                <p className="mt-4 text-body text-ink">
                  O exemplo usa {NO_APLICATIVO.outrasTaxas}% pras duas somadas.
                  É um número de exemplo: o seu está no contrato com o
                  aplicativo, e muda com o plano e com quem faz a entrega.
                </p>
                <Formula
                  exemplo={{
                    ...EXEMPLO_BOLO_DE_POTE,
                    parametros: NO_APLICATIVO,
                  }}
                  preco={PRECO_APP_CONTA}
                  taxas="comissão e taxas"
                />
                <dl className="mt-6 grid divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="py-5 sm:pr-5">
                    <dt className="text-label font-medium text-ink-muted">
                      No balcão
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_BALCAO} tamanho="xl" />
                      <p className="mt-2 text-label text-ink-muted">
                        Sobram <Valor centavos={NO_BALCAO.lucroUnitario} />,{" "}
                        {formatarPercentual(NO_BALCAO.margemReal, 0)} do preço,
                        depois da maquininha.
                      </p>
                    </dd>
                  </div>
                  <div className="py-5 sm:px-5">
                    <dt className="text-label font-medium text-ink-muted">
                      No aplicativo
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_APP} tamanho="xl" />
                      <p className="mt-2 text-label text-ink-muted">
                        Sobram <Valor centavos={NO_APP.lucroUnitario} />,{" "}
                        {formatarPercentual(NO_APP.margemReal, 0)} do preço,
                        depois da comissão e das taxas.
                      </p>
                    </dd>
                  </div>
                  <div className="py-5 sm:pl-5">
                    <dt className="text-label font-medium text-ink-muted">
                      O preço do balcão no aplicativo
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_BALCAO} tamanho="xl" />
                      <p className="mt-2 flex items-start gap-1.5 text-label text-ink-muted">
                        <TrendingDown
                          aria-hidden
                          className="mt-px size-4 shrink-0 text-negative"
                          strokeWidth={1.75}
                        />
                        <span>
                          Sobram{" "}
                          <Valor centavos={BALCAO_NO_APP.lucroUnitario} />,{" "}
                          {formatarPercentual(BALCAO_NO_APP.margemReal, 0)} do
                          preço, depois da comissão e das taxas.
                        </span>
                      </p>
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 text-body text-ink">
                  Pôr no aplicativo o preço do balcão parece justo com a
                  cliente, mas quem paga a comissão é você. Dos{" "}
                  <Valor centavos={PRECO_BALCAO} />, o aplicativo leva{" "}
                  <Valor centavos={BALCAO_NO_APP.custoTaxas} />, e o pote que
                  deixava <Valor centavos={NO_BALCAO.lucroUnitario} /> passa a
                  deixar <Valor centavos={BALCAO_NO_APP.lucroUnitario} />.
                </p>
              </section>

              <Perguntas perguntas={PERGUNTAS} />

              <OutrosDoces endereco={ENDERECO} />
            </div>
          </div>
        </article>

        <Convite>
          O Rende faz a conta de cada pote seu, e refaz quando o leite em pó ou
          o morango sobem.
        </Convite>
      </main>

      <Rodape />
    </>
  );
}
