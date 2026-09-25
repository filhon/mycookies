import { TrendingDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalculadoraDaPorta } from "@/components/site/CalculadoraDaPorta";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Rodape, Topo } from "@/components/site/Moldura";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { ROTULO_PARCELA } from "@/lib/domain/custoFicha";
import { ERRO_COMUM, EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A resposta para "como calcular o preço do meu cookie" (spec 037,
 * `DECISOES.md#d176`). Pública, estática e indexável. Responde primeiro e
 * vende depois: o primeiro parágrafo é a resposta inteira, e o botão vem
 * depois da conta. Toda quantia sai das funções do app sobre `EXEMPLO`
 * (`#d173`); `tests/domain/exemplo.test.ts` prende os números.
 */

/** A data que a página mostra, e que diz ao robô que a conta não é antiga. */
const ATUALIZADO_EM = "2026-09-24";

const ENDERECO = "/como-calcular-o-preco-do-cookie";

const { custo, parametros, rende } = EXEMPLO;
const TAXAS = somaTaxas(parametros);
const SUGERIDO = calcularPrecoSugerido(custo.custoUnitario, parametros);
const ERRADO = calcularPrecoSugerido(custo.custoUnitario, ERRO_COMUM);
// Os dois resultados existem para o `EXEMPLO`; o teste prende. `0` só
// satisfaz o tipo.
const PRECO_CERTO = SUGERIDO.ok ? SUGERIDO.precoSugerido : 0;
const PRECO_ETIQUETA = SUGERIDO.ok ? SUGERIDO.precoArredondado : 0;
const PRECO_ERRADO = ERRADO.ok ? ERRADO.precoSugerido : 0;
const NA_CONTA_CERTA = verificarPreco(PRECO_CERTO, custo.custoUnitario, TAXAS);
const NO_ERRO = verificarPreco(PRECO_ERRADO, custo.custoUnitario, TAXAS);

const porUnidade = (chave: keyof typeof ROTULO_PARCELA) =>
  Math.round(custo[chave] / rende);

const fracao = (percentual: number) =>
  (percentual / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const DESCRICAO_DA_PAGINA = `Some ingredientes, embalagem, sua hora, gás e despesas fixas; divida por 1 menos margem e maquininha. Um cookie de ${formatarMoeda(custo.custoUnitario)} sai a ${formatarMoeda(PRECO_ETIQUETA)}.`;

export const metadata: Metadata = {
  title: {
    absolute: "Como calcular o preço do cookie: a conta, passo a passo",
  },
  description: DESCRICAO_DA_PAGINA,
  // Sobrepõe o `noindex` do layout raiz, como `/conheca`.
  robots: { index: true, follow: true },
  alternates: { canonical: ENDERECO },
  openGraph: {
    title: "Como calcular o preço do cookie: a conta, passo a passo",
    description: DESCRICAO_DA_PAGINA,
    url: ENDERECO,
    locale: "pt_BR",
    type: "article",
    siteName: "Rende",
  },
};

/** Dinheiro no meio da frase: tabular, em peso de número. */
function Valor({ centavos }: { centavos: Centavos }) {
  return (
    <span className="num font-semibold whitespace-nowrap text-ink">
      {formatarMoeda(centavos)}
    </span>
  );
}

const PASSOS: {
  parcela: keyof typeof ROTULO_PARCELA;
  titulo: string;
  texto: React.ReactNode[];
}[] = [
  {
    parcela: "custoInsumos",
    titulo: "Ingredientes: o custo da receita dividido pelo que ela rende",
    texto: [
      "Para cada ingrediente, divida o preço do pacote pelas gramas do pacote e multiplique pelas gramas que vão na receita. Um quilo de farinha usado em 300 g entra com 30% do preço do pacote.",
      "Some todos e divida pelo que a receita rende. Depois some a perda: a massa que fica na tigela, o cookie que quebra na assadeira. Se de cada 100 g de massa 5 g não viram cookie, você paga por 100 e vende 95.",
    ],
  },
  {
    parcela: "custoEmbalagem",
    titulo: "Embalagem: o saquinho, a etiqueta, a fita",
    texto: [
      "É a parcela que quase ninguém soma, porque ela não está na receita. Saquinho, etiqueta, fita, caixinha, o adesivo com o seu nome: tudo que sai com o cookie é custo dele.",
      "Conte por unidade. Um saquinho por cookie é um saquinho inteiro; uma caixa que leva seis é um sexto da caixa em cada um.",
    ],
  },
  {
    parcela: "custoMaoDeObra",
    titulo: "Seu trabalho: quanto vale a sua hora",
    texto: [
      "Sua hora entra no custo como entra a farinha. Quem não soma o próprio trabalho trabalha de graça e chama o que sobra de lucro.",
      "Para chegar num valor, pense em quanto você quer tirar no mês e divida pelas horas que passa na cozinha. Quem fica 80 horas por mês no fogão divide o que quer tirar por 80.",
      "Depois, o tempo da receita inteira, da massa até o último saquinho fechado, vezes o valor da hora, dividido pelo que ela rende.",
    ],
  },
  {
    parcela: "custoEnergiaGas",
    titulo: "Gás e energia",
    texto: [
      "O forno ligado custa. Conte o tempo que ele fica aceso na fornada, do preaquecimento ao último tabuleiro, mais a batedeira, e divida pelo que a fornada rende.",
    ],
  },
  {
    parcela: "custoIndireto",
    titulo: "A fatia das despesas fixas",
    texto: [
      "Aluguel, internet, o MEI, o celular: contas que chegam todo mês, faça você dez cookies ou mil. Some o mês e divida pelo que você produz nele. Cada cookie carrega a sua fatia.",
      "É por isso que produzir mais baixa o custo de cada um: a mesma conta, dividida por mais unidades.",
    ],
  },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: "Quanto cobrar por um cookie?",
    resposta: (
      <>
        Depende do que o seu custa: faça os cinco passos com os seus números. No
        exemplo, um cookie de <Valor centavos={custo.custoUnitario} /> sai a{" "}
        <Valor centavos={PRECO_ETIQUETA} />. Abaixo de{" "}
        <Valor centavos={custo.custoUnitario} />, cada venda tira dinheiro do
        seu bolso.
      </>
    ),
  },
  {
    pergunta: "A taxa da maquininha entra no preço?",
    resposta:
      "Entra, e dentro da divisão, não somada no fim. A maquininha cobra sobre o preço, e não sobre o custo: somada depois, ela leva a parte dela de um número maior do que o que você contou.",
  },
  {
    pergunta: "Qual a diferença entre margem e markup?",
    resposta:
      "Margem é quanto do preço sobra pra você. Markup é por quanto se multiplica o custo. 40% de margem não é custo × 1,4: é custo ÷ 0,6.",
  },
  {
    pergunta: "Quanto cobrar pela minha hora?",
    resposta:
      "Pense no que você quer tirar no mês e divida pelas horas de cozinha. É o valor da sua hora, e ele entra em cada receita pelo tempo que ela leva, dividido pelo que ela rende.",
  },
  {
    pergunta: "Serve pra brigadeiro, bolo de pote, pão de mel?",
    resposta:
      "Serve. A conta é a mesma para tudo que tem receita e rende um tanto de unidades: muda o doce, não a conta.",
  },
];

const TITULO_H2 =
  "text-balance font-display text-title font-bold tracking-[-0.02em] text-ink lg:text-[1.75rem] lg:leading-[1.2]";

export default function PaginaComoCalcular() {
  const atualizado = new Date(`${ATUALIZADO_EM}T12:00:00Z`).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <>
      <Topo />

      <main>
        <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
          <header className="max-w-[68ch]">
            <h1 className="text-balance font-display text-[2.125rem] leading-[1.1] font-bold tracking-tight text-ink lg:text-[3rem] lg:leading-[1.05]">
              Como calcular o preço do seu cookie
            </h1>
            <p className="mt-3 text-label text-ink-muted">
              Atualizado em <time dateTime={ATUALIZADO_EM}>{atualizado}</time>
            </p>
            <p className="mt-6 text-pretty text-body text-ink lg:text-heading lg:leading-normal lg:font-normal">
              Some o que cada cookie custa: ingredientes, embalagem, sua hora de
              trabalho, gás e energia e uma fatia das despesas fixas. Depois
              divida esse custo por 1 menos a margem que você quer e menos a
              taxa da maquininha. Um cookie que custa{" "}
              <Valor centavos={custo.custoUnitario} />, com{" "}
              {parametros.margemDesejada}% de margem e{" "}
              {parametros.taxaCartaoConsiderada}% de maquininha, sai a{" "}
              <Valor centavos={PRECO_ETIQUETA} />.
            </p>
          </header>

          {/* A conta vem logo depois da resposta no celular; no desktop ela
              acompanha a leitura, grudada ao lado dos passos que a explicam. */}
          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <ContaAberta parada className="lg:sticky lg:top-8" />
            </div>

            <div className="max-w-[68ch] lg:col-start-1 lg:row-start-1">
              <ol className="flex flex-col gap-12">
                {PASSOS.map((passo, i) => (
                  <li key={passo.parcela}>
                    <section aria-labelledby={`passo-${i + 1}`}>
                      <p
                        aria-hidden
                        className="num font-display text-title font-bold text-ink-muted"
                      >
                        {i + 1}
                      </p>
                      <h2
                        id={`passo-${i + 1}`}
                        className={cn(TITULO_H2, "mt-1")}
                      >
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
                        : <Valor centavos={porUnidade(passo.parcela)} /> por
                        cookie.
                      </p>
                    </section>
                  </li>
                ))}
              </ol>

              <section aria-labelledby="margem" className="mt-16">
                <h2 id="margem" className={TITULO_H2}>
                  Margem e maquininha: a conta do preço
                </h2>
                <p className="mt-4 text-body text-ink">
                  Com o custo na mão, falta decidir quanto você quer que sobre.
                  E a maquininha tira a parte dela do preço, não do custo. As
                  duas saem do preço de venda, então as duas entram na divisão:
                </p>
                <div className="mt-6 rounded-lg bg-sunken px-5 py-5">
                  <p className="text-heading font-semibold text-ink">
                    preço = custo ÷ (1 − margem − maquininha)
                  </p>
                  <p className="num mt-3 text-body text-ink">
                    <Valor centavos={custo.custoUnitario} /> ÷ (1 −{" "}
                    {fracao(parametros.margemDesejada)} −{" "}
                    {fracao(parametros.taxaCartaoConsiderada)}) ={" "}
                    <Valor centavos={custo.custoUnitario} /> ÷{" "}
                    {fracao(100 - parametros.margemDesejada - TAXAS)} ={" "}
                    <Valor centavos={PRECO_CERTO} />
                  </p>
                </div>
                <p className="mt-6 text-body text-ink">
                  Confira de volta: dos <Valor centavos={PRECO_CERTO} />, a
                  maquininha leva <Valor centavos={NA_CONTA_CERTA.custoTaxas} />{" "}
                  e o custo leva <Valor centavos={custo.custoUnitario} />.
                  Sobram <Valor centavos={NA_CONTA_CERTA.lucroUnitario} /> pra
                  você, {formatarPercentual(NA_CONTA_CERTA.margemReal, 0)} do
                  preço.
                </p>
                <p className="mt-4 text-body text-ink">
                  Na etiqueta, arredonde pra cima até o meio real:{" "}
                  <Valor centavos={PRECO_CERTO} /> vira{" "}
                  <Valor centavos={PRECO_ETIQUETA} />, e a diferença fica do seu
                  lado.
                </p>
              </section>
            </div>
          </div>

          {/* A calculadora sai da coluna de leitura: tem a sua própria conta
              ao lado, e a do exemplo, grudada até aqui, fica para trás (spec
              040, `#d187`). Sem JavaScript ela é o HTML do padrão, parada, e
              o texto em volta continua inteiro. */}
          <section
            id="sua-conta"
            aria-labelledby="sua-conta-titulo"
            className="mt-16 scroll-mt-4 border-t border-line pt-16"
          >
            <h2 id="sua-conta-titulo" className={TITULO_H2}>
              Faça a conta do seu cookie
            </h2>
            <p className="mt-4 max-w-[68ch] text-body text-ink">
              O cookie do exemplo custa <Valor centavos={custo.custoUnitario} />
              . O seu é outro: troque o que for diferente na sua cozinha, e a
              conta refaz na hora, do mesmo jeito que o Rende faz.
            </p>
            <CalculadoraDaPorta className="mt-10" />
          </section>

          <div className="mt-16 border-t border-line pt-16">
            <div className="max-w-[68ch]">
              <section aria-labelledby="erro">
                <h2 id="erro" className={TITULO_H2}>
                  O erro mais comum: somar a porcentagem em cima do custo
                </h2>
                <p className="mt-4 text-body text-ink">
                  Muita gente junta a margem e a maquininha e põe em cima do
                  custo: custo + {parametros.margemDesejada + TAXAS}%. Parece a
                  mesma conta, e não é. A porcentagem somada ao custo é tirada
                  de um número menor do que o preço, e sobra menos.
                </p>
                <dl className="mt-6 grid divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="py-5 sm:pr-6">
                    <dt className="text-label font-medium text-ink-muted">
                      Custo + {parametros.margemDesejada + TAXAS}%
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
                          Sobram <Valor centavos={NO_ERRO.lucroUnitario} />,{" "}
                          {formatarPercentual(NO_ERRO.margemReal, 0)} do preço,
                          e não {parametros.margemDesejada}%.
                        </span>
                      </p>
                    </dd>
                  </div>
                  <div className="py-5 sm:pl-6">
                    <dt className="text-label font-medium text-ink-muted">
                      Custo ÷ {fracao(100 - parametros.margemDesejada - TAXAS)}
                    </dt>
                    <dd className="mt-1">
                      <Dinheiro centavos={PRECO_CERTO} tamanho="xl" />
                      <p className="mt-2 text-label text-ink-muted">
                        Sobram <Valor centavos={NA_CONTA_CERTA.lucroUnitario} />
                        , {formatarPercentual(NA_CONTA_CERTA.margemReal, 0)} do
                        preço.
                      </p>
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 text-body text-ink">
                  A diferença,{" "}
                  <Valor
                    centavos={
                      NA_CONTA_CERTA.lucroUnitario - NO_ERRO.lucroUnitario
                    }
                  />{" "}
                  por cookie, vai embora em cada venda sem ninguém ver. É a
                  conta que a calculadora que só multiplica não faz.
                </p>
              </section>

              <section aria-labelledby="perguntas" className="mt-16">
                <h2 id="perguntas" className={TITULO_H2}>
                  Perguntas parecidas
                </h2>
                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {PERGUNTAS.map((p) => (
                    <li key={p.pergunta} className="flex flex-col gap-2 py-6">
                      <h3 className="text-subheading font-semibold text-ink">
                        {p.pergunta}
                      </h3>
                      <p className="text-body text-ink">{p.resposta}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </article>

        {/* Depois da conta, fora do artigo. Sem barra fixa no celular: é
            leitura, e ela cobriria o texto. */}
        <section
          aria-labelledby="convite"
          className="mx-auto max-w-6xl px-4 pb-16 lg:px-10 lg:pb-24"
        >
          <div className="max-w-[68ch] border-t border-line pt-10">
            <h2 id="convite" className={TITULO_H2}>
              O Rende faz essa conta pra cada doce seu, e refaz quando o preço
              da farinha muda.
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
      </main>

      <Rodape />
    </>
  );
}
