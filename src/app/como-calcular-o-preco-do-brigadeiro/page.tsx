import { TrendingDown } from "lucide-react";
import type { Metadata } from "next";
import {
  CabecalhoDoArtigo,
  Convite,
  Formula,
  fracao,
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
import { EXEMPLO_BRIGADEIRO, HORA_DO_BRIGADEIRO } from "@/lib/domain/exemplo";
import {
  formatarMoeda,
  formatarPercentual,
  percentualDe,
} from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";

/**
 * A resposta para "quanto cobrar o cento de brigadeiro" (spec 068, sessão A).
 * O formato é o da página do cookie (037); o que só esta tem é o cento como
 * unidade, a hora de enrolar e o avulso (`DECISOES.md#d256`). Toda quantia
 * sai das funções do app sobre `EXEMPLO_BRIGADEIRO`, e
 * `tests/domain/exemplo.test.ts` prende os números.
 */

const ATUALIZADO_EM = "2026-10-01";

const ENDERECO = "/como-calcular-o-preco-do-brigadeiro" as const;

const TITULO = "Como calcular o preço do brigadeiro: a unidade e o cento";

const { custo, parametros } = EXEMPLO_BRIGADEIRO;
const TAXAS = somaTaxas(parametros);

// Os resultados existem para o exemplo; o teste prende. `0` só satisfaz o tipo.
const SUGERIDO = calcularPrecoSugerido(custo.custoUnitario, parametros);
const PRECO_CERTO = SUGERIDO.ok ? SUGERIDO.precoSugerido : 0;
const PRECO_ETIQUETA = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;
const NA_CONTA_CERTA = verificarPreco(PRECO_CERTO, custo.custoUnitario, TAXAS);
const NA_ETIQUETA = verificarPreco(PRECO_ETIQUETA, custo.custoUnitario, TAXAS);

/** O erro: o cento sem as duas horas. */
const SEM_A_HORA = custo.custoUnitario - custo.custoMaoDeObra;
const ERRADO = calcularPrecoSugerido(SEM_A_HORA, parametros);
const PRECO_ERRADO = ERRADO.ok ? ERRADO.precoArredondado : 0;
/** O que ela vê sobrar fazendo a conta sem a hora. */
const PARECE = verificarPreco(PRECO_ERRADO, SEM_A_HORA, TAXAS);
/** O que sobra de verdade, com a hora no custo. */
const NO_ERRO = verificarPreco(PRECO_ERRADO, custo.custoUnitario, TAXAS);

/** Um brigadeiro sozinho, e o cento dividido por cem. */
const UM_BRIGADEIRO = Math.round(custo.custoUnitario / 100);
const AVULSO = calcularPrecoSugerido(UM_BRIGADEIRO, parametros);
const AVULSO_CONTA = AVULSO.ok ? AVULSO.precoSugerido : 0;
const AVULSO_ETIQUETA = AVULSO.ok ? AVULSO.precoArredondado : 0;
const CENTO_POR_CEM = Math.round(PRECO_ETIQUETA / 100);
const AVULSO_A_MAIS = Math.round(
  (AVULSO_ETIQUETA / (PRECO_ETIQUETA / 100) - 1) * 100,
);

/** O desconto de 10% no cento. */
const COM_DESCONTO = PRECO_ETIQUETA - percentualDe(PRECO_ETIQUETA, 10);
const NO_DESCONTO = verificarPreco(COM_DESCONTO, custo.custoUnitario, TAXAS);

const DESCRICAO_DA_PAGINA = `Some receita, forminhas, a hora de enrolar, gás e fixas; divida por 1 menos margem e maquininha. Um cento de ${formatarMoeda(custo.custoUnitario)} sai a ${formatarMoeda(PRECO_ETIQUETA)}.`;

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
    titulo: "Ingredientes: a receita pela lata",
    texto: [
      "Brigadeiro se conta pela lata. Cada receita leva uma lata de leite condensado, o chocolate, a manteiga e o granulado, e rende perto de 25 brigadeiros de 15 g. Um cento são quatro receitas.",
      "O leite condensado é a maior parte da receita e o que mais muda de preço. Refaça a conta sempre que pagar diferente pela lata.",
      "Conte pelo brigadeiro enrolado, e não pela massa: o que fica na panela e na mão não vira doce.",
    ],
  },
  {
    parcela: "custoEmbalagem",
    titulo: "Embalagem: a forminha que ninguém soma",
    texto: [
      "Cem brigadeiros são cem forminhas. Uma só custa centavos, e por isso fica de fora, mas o cento leva o pacote inteiro. Some também a caixa, a fita e a etiqueta, se o cento sai com elas.",
    ],
  },
  {
    parcela: "custoMaoDeObra",
    titulo: "Seu trabalho: a panela e a hora de enrolar",
    texto: [
      "No brigadeiro, o trabalho pesa quase o mesmo que a receita. Mexer a panela até desgrudar do fundo é a parte rápida. Enrolar cem bolinhas iguais, passar no granulado e pôr cada uma na forminha é a que leva a tarde.",
      "Para saber o seu tempo, cronometre dez e multiplique por dez. Some as panelas e, se você fica parada esperando a massa esfriar, a espera também.",
      <>
        O valor da hora sai do que você quer tirar no mês dividido pelas horas
        que passa na cozinha. O cento do exemplo leva {HORA_DO_BRIGADEIRO.horas}{" "}
        horas, a <Valor centavos={HORA_DO_BRIGADEIRO.valor} /> cada.
      </>,
    ],
  },
  {
    parcela: "custoEnergiaGas",
    titulo: "Gás: a panela, que é pouco",
    texto: [
      "Quatro panelas no fogo gastam pouco perto do resto, e é a parcela que menos mexe no preço. Conte pelo tempo de fogo de cada receita. Se a massa vai ao micro-ondas, é energia no lugar do gás, e a conta é a mesma.",
    ],
  },
  {
    parcela: "custoIndireto",
    titulo: "A fatia das despesas fixas",
    texto: [
      "Aluguel, internet, o MEI, o celular: chegam todo mês, faça você vinte centos ou dois. Some o mês e divida pelos centos que você faz nele.",
      "Mês de festa, com muita encomenda, baixa a fatia de cada cento; mês parado faz ela subir.",
    ],
  },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: "Quanto cobrar o cento de brigadeiro?",
    resposta: (
      <>
        Depende do que o seu custa: faça os cinco passos com os números da sua
        cozinha. No exemplo, um cento que custa{" "}
        <Valor centavos={custo.custoUnitario} /> sai a{" "}
        <Valor centavos={PRECO_ETIQUETA} />. Esse é o número do exemplo. O seu
        sai do que você paga pela lata e do tempo que você leva pra enrolar.
      </>
    ),
  },
  {
    pergunta: "Brigadeiro gourmet custa mais por quê?",
    resposta:
      "Porque leva chocolate nobre e confeito mais caro, e porque enrolar e decorar demora mais. A conta é a mesma; o que sobe é a receita e a sua hora.",
  },
  {
    pergunta: "Quanto cobrar o brigadeiro avulso?",
    resposta: (
      <>
        Faça a conta com o custo de um brigadeiro, e não com o cento dividido
        por cem. No exemplo, <Valor centavos={UM_BRIGADEIRO} /> de custo pede{" "}
        <Valor centavos={AVULSO_ETIQUETA} /> na etiqueta.
      </>
    ),
  },
  {
    pergunta: "Dar desconto no cento é prejuízo?",
    resposta: (
      <>
        Nem sempre, mas o desconto sai do que sobra pra você, porque o custo não
        baixa. No exemplo, 10% no cento de <Valor centavos={PRECO_ETIQUETA} />{" "}
        levam o preço a <Valor centavos={COM_DESCONTO} />, e o que sobra cai de{" "}
        <Valor centavos={NA_ETIQUETA.lucroUnitario} /> para{" "}
        <Valor centavos={NO_DESCONTO.lucroUnitario} />.
      </>
    ),
  },
  {
    pergunta: "E o docinho de festa, beijinho, cajuzinho?",
    resposta:
      "A mesma conta. Muda a receita, coco no beijinho e amendoim no cajuzinho, e o tempo de enrolar cada um. Num cento misto, some o custo de cada sabor pelo tanto que vai na caixa.",
  },
];

export default function PaginaPrecoDoBrigadeiro() {
  return (
    <>
      <Topo />

      <main id="conteudo">
        <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
          <CabecalhoDoArtigo
            titulo="Como calcular o preço do brigadeiro, do cento ao avulso"
            atualizadoEm={ATUALIZADO_EM}
          >
            Some o que o cento custa: ingredientes das quatro receitas, as
            forminhas, as horas de panela e de enrolar, o gás e uma fatia das
            despesas fixas. Divida por 1 menos a margem e menos a maquininha. Um
            cento que custa <Valor centavos={custo.custoUnitario} />, com{" "}
            {parametros.margemDesejada}% de margem e{" "}
            {parametros.taxaCartaoConsiderada}% de maquininha, sai a{" "}
            <Valor centavos={PRECO_ETIQUETA} />.
          </CabecalhoDoArtigo>

          {/* Como no cookie: a conta logo depois da resposta no celular, e
              grudada ao lado dos passos no desktop. */}
          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <ContaAberta
                parada
                exemplo={EXEMPLO_BRIGADEIRO}
                unidade={{ singular: "cento", plural: "centos" }}
                className="lg:sticky lg:top-8"
              />
            </div>

            <div className="max-w-[68ch] lg:col-start-1 lg:row-start-1">
              <Passos
                passos={PASSOS}
                exemplo={EXEMPLO_BRIGADEIRO}
                sufixo=" no cento."
              />

              <section aria-labelledby="margem" className="mt-16">
                <h2 id="margem" className={TITULO_H2}>
                  Margem e maquininha: a conta do cento
                </h2>
                <p className="mt-4 text-body text-ink">
                  Com o custo do cento na mão, falta decidir quanto você quer
                  que sobre. A maquininha tira a parte dela do preço, e não do
                  custo. As duas saem do preço de venda, então as duas entram na
                  divisão:
                </p>
                <Formula exemplo={EXEMPLO_BRIGADEIRO} preco={PRECO_CERTO} />
                <p className="mt-6 text-body text-ink">
                  Confira de volta: dos <Valor centavos={PRECO_CERTO} />, a
                  maquininha leva <Valor centavos={NA_CONTA_CERTA.custoTaxas} />{" "}
                  e o custo leva <Valor centavos={custo.custoUnitario} />.
                  Sobram <Valor centavos={NA_CONTA_CERTA.lucroUnitario} /> pra
                  você, {formatarPercentual(NA_CONTA_CERTA.margemReal, 0)} do
                  preço. Na etiqueta, o meio real leva o cento a{" "}
                  <Valor centavos={PRECO_ETIQUETA} />.
                </p>
              </section>
            </div>
          </div>

          <div className="mt-16 border-t border-line pt-16">
            <div className="max-w-[68ch]">
              <section aria-labelledby="erro">
                <h2 id="erro" className={TITULO_H2}>
                  O erro do brigadeiro: esquecer a hora de enrolar
                </h2>
                <p className="mt-4 text-body text-ink">
                  Quem faz a conta só com o que comprou deixa a própria hora de
                  fora. Sem as {HORA_DO_BRIGADEIRO.horas} horas, o cento do
                  exemplo custaria <Valor centavos={SEM_A_HORA} /> e sairia a{" "}
                  <Valor centavos={PRECO_ERRADO} />. Nesse preço, pagos a
                  receita, as forminhas, o gás, as fixas e a maquininha, sobram{" "}
                  <Valor centavos={PARECE.lucroUnitario} />, e a conta parece
                  dar os {parametros.margemDesejada}%.
                </p>
                <dl className="mt-6 grid divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="py-5 sm:pr-6">
                    <dt className="text-label font-medium text-ink-muted">
                      Sem a hora de enrolar
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_ERRADO} tamanho="xl" />
                      <p className="mt-2 flex items-start gap-1.5 text-label text-ink-muted">
                        <TrendingDown
                          aria-hidden
                          className="mt-px size-4 shrink-0 text-negative"
                          strokeWidth={1.75}
                        />
                        <span>
                          Sobram <Valor centavos={NO_ERRO.lucroUnitario} />{" "}
                          depois de pagar as {HORA_DO_BRIGADEIRO.horas} horas,{" "}
                          {formatarPercentual(NO_ERRO.margemReal, 0)} do preço.
                        </span>
                      </p>
                    </dd>
                  </div>
                  <div className="py-5 sm:pl-6">
                    <dt className="text-label font-medium text-ink-muted">
                      Com a hora na conta
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_ETIQUETA} tamanho="xl" />
                      <p className="mt-2 text-label text-ink-muted">
                        Sobram <Valor centavos={NA_ETIQUETA.lucroUnitario} />{" "}
                        depois de pagar as {HORA_DO_BRIGADEIRO.horas} horas,{" "}
                        {formatarPercentual(NA_ETIQUETA.margemReal, 0)} do
                        preço.
                      </p>
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 text-body text-ink">
                  Os <Valor centavos={PARECE.lucroUnitario} /> não eram lucro:{" "}
                  <Valor centavos={custo.custoMaoDeObra} /> deles são o seu
                  trabalho. O que aquele cento deixa de verdade é{" "}
                  <Valor centavos={NO_ERRO.lucroUnitario} />.
                </p>
              </section>

              <section aria-labelledby="avulso" className="mt-16">
                <h2 id="avulso" className={TITULO_H2}>
                  O brigadeiro avulso
                </h2>
                <p className="mt-4 text-body text-ink">
                  Quem vende o cento também vende brigadeiro solto, no balcão ou
                  na caixinha de quatro. A conta é a mesma, com o custo de um:{" "}
                  <Valor centavos={UM_BRIGADEIRO} /> ÷{" "}
                  {fracao(100 - parametros.margemDesejada - TAXAS)} ={" "}
                  <Valor centavos={AVULSO_CONTA} />, e o meio real leva a
                  etiqueta a <Valor centavos={AVULSO_ETIQUETA} />.
                </p>
                <p className="mt-4 text-body text-ink">
                  O cento de <Valor centavos={PRECO_ETIQUETA} /> sai a{" "}
                  <Valor centavos={CENTO_POR_CEM} /> cada, e o avulso fica{" "}
                  {AVULSO_A_MAIS}% acima. Antes de arredondar, os dois davam{" "}
                  <Valor centavos={AVULSO_CONTA} />: o meio real sobe{" "}
                  <Valor centavos={PRECO_ETIQUETA - PRECO_CERTO} /> num cento
                  inteiro e <Valor centavos={AVULSO_ETIQUETA - AVULSO_CONTA} />{" "}
                  num brigadeiro só. Está certo que suba: atender e cobrar um
                  brigadeiro leva o mesmo tempo que atender e cobrar um cento.
                </p>
              </section>

              <Perguntas perguntas={PERGUNTAS} />

              <OutrosDoces endereco={ENDERECO} />
            </div>
          </div>
        </article>

        <Convite>
          O Rende faz essa conta pra cada doce seu, e refaz quando a lata de
          leite condensado sobe.
        </Convite>
      </main>

      <Rodape />
    </>
  );
}
