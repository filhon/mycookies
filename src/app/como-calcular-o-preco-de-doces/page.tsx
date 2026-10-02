import { TrendingDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PAGINAS_DO_PRECO } from "@/app/site";
import {
  CabecalhoDoArtigo,
  Convite,
  Perguntas,
  TITULO_H2,
  Valor,
} from "@/components/site/Artigo";
import { Rodape, Topo } from "@/components/site/Moldura";
import {
  boloDe,
  ERRO_COMUM,
  EXEMPLO,
  EXEMPLO_BOLO_DE_POTE,
  EXEMPLO_BRIGADEIRO,
  NO_APLICATIVO,
  POR_BOLO,
} from "@/lib/domain/exemplo";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  type ParametrosPreco,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";
import type { Centavos } from "@/lib/types";

/**
 * A resposta para "como precificar doces" (spec 068, sessão D), a porta das
 * páginas de cada doce (`DECISOES.md#d259`). Não repete os cinco passos: diz
 * a conta em um parágrafo e mostra numa tabela o que muda de doce pra doce,
 * cada linha levando à página dele. Toda quantia sai das funções do app sobre
 * os quatro exemplos, e `tests/domain/exemplo.test.ts` prende os números.
 */

const ATUALIZADO_EM = "2026-10-02";

const ENDERECO = "/como-calcular-o-preco-de-doces" as const;

const TITULO = "Como calcular o preço de doces: a conta que serve pra todos";

const { parametros } = EXEMPLO;
const TAXAS = somaTaxas(parametros);

// Os resultados existem para os exemplos; o teste prende. `0` só satisfaz o tipo.
const etiqueta = (custo: Centavos, p: ParametrosPreco = parametros) => {
  const r = calcularPrecoSugerido(custo, p);
  return r.ok ? r.precoArredondado : 0;
};

/** O quanto uma parte pesa no custo, em %, sem casas. */
const parte = (valor: Centavos, total: Centavos) =>
  formatarPercentual((valor / total) * 100, 0);

const BOLO = boloDe(2);
const BRIGADEIRO_SEM_A_HORA =
  EXEMPLO_BRIGADEIRO.custo.custoUnitario -
  EXEMPLO_BRIGADEIRO.custo.custoMaoDeObra;

type Linha = {
  vendePor: string;
  /** A parcela que pesa, ou que engana, com o tanto que pesa. */
  pesa: string;
  erro: string;
  /** O que sobra do preço quando o erro acontece, em %. */
  sobraNoErro: number;
  preco: Centavos;
  /** De que preço se fala, quando o doce tem mais de um. */
  precoDe?: string;
};

type Endereco = (typeof PAGINAS_DO_PRECO)[number]["endereco"];

/** Uma linha por página da lista: página nova sem linha aqui não compila. */
const O_QUE_MUDA: Record<Exclude<Endereco, typeof ENDERECO>, Linha> = {
  "/como-calcular-o-preco-do-cookie": {
    vendePor: "unidade",
    pesa: `Ingredientes, ${parte(EXEMPLO.custo.custoInsumos, EXEMPLO.custo.custoTotalLote)} do custo`,
    erro: "Somar 45% em cima do custo",
    sobraNoErro: verificarPreco(
      etiqueta(EXEMPLO.custo.custoUnitario, ERRO_COMUM),
      EXEMPLO.custo.custoUnitario,
      TAXAS,
    ).margemReal,
    preco: etiqueta(EXEMPLO.custo.custoUnitario),
  },
  "/como-calcular-o-preco-do-brigadeiro": {
    vendePor: "cento",
    pesa: `Seu trabalho, ${parte(EXEMPLO_BRIGADEIRO.custo.custoMaoDeObra, EXEMPLO_BRIGADEIRO.custo.custoTotalLote)} do cento, quase o mesmo que a receita`,
    erro: "Esquecer a hora de enrolar",
    sobraNoErro: verificarPreco(
      etiqueta(BRIGADEIRO_SEM_A_HORA),
      EXEMPLO_BRIGADEIRO.custo.custoUnitario,
      TAXAS,
    ).margemReal,
    preco: etiqueta(EXEMPLO_BRIGADEIRO.custo.custoUnitario),
  },
  "/como-calcular-o-preco-do-bolo-por-quilo": {
    vendePor: "quilo",
    pesa: `Caixa, base e decoração, que vão uma vez por bolo: ${parte(POR_BOLO.custoEmbalagem + POR_BOLO.custoMaoDeObra + POR_BOLO.custoIndireto, BOLO.custo.custoTotalLote)} do bolo de 2 kg`,
    erro: "Um preço de quilo pra qualquer tamanho",
    // O quilo do bolo de 2 kg cobrado no bolo de 1 kg.
    sobraNoErro: verificarPreco(
      etiqueta(BOLO.custo.custoUnitario),
      boloDe(1).custo.custoUnitario,
      TAXAS,
    ).margemReal,
    preco: etiqueta(BOLO.custo.custoUnitario),
    precoDe: "no bolo de 2 kg",
  },
  "/como-calcular-o-preco-do-bolo-de-pote": {
    vendePor: "pote",
    pesa: `Embalagem, ${parte(EXEMPLO_BOLO_DE_POTE.custo.custoEmbalagem, EXEMPLO_BOLO_DE_POTE.custo.custoTotalLote)} do custo`,
    erro: "Pôr no aplicativo o preço do balcão",
    sobraNoErro: verificarPreco(
      etiqueta(EXEMPLO_BOLO_DE_POTE.custo.custoUnitario),
      EXEMPLO_BOLO_DE_POTE.custo.custoUnitario,
      somaTaxas(NO_APLICATIVO),
    ).margemReal,
    preco: etiqueta(EXEMPLO_BOLO_DE_POTE.custo.custoUnitario),
    precoDe: "no balcão",
  },
};

const LINHAS = PAGINAS_DO_PRECO.flatMap((p) =>
  p.endereco === ENDERECO ? [] : [{ ...p, ...O_QUE_MUDA[p.endereco] }],
);

const DESCRICAO_DA_PAGINA = `Some ingredientes, embalagem, sua hora, gás e fixas na unidade em que vende e divida por 1 menos margem e taxas. O cento de brigadeiro sai a ${formatarMoeda(O_QUE_MUDA["/como-calcular-o-preco-do-brigadeiro"].preco)}.`;

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

const PARCELAS: { nome: string; texto: string }[] = [
  {
    nome: "Ingredientes.",
    texto:
      "Tudo que a receita leva, pelo preço que você pagou, dividido pelo que ela rende na unidade em que você vende. A perda entra junto: a massa que fica na tigela e o doce que quebra também foram comprados.",
  },
  {
    nome: "Embalagem.",
    texto:
      "Forminha, saquinho, pote, tampa, colher, caixa, etiqueta, fita. Cada peça custa centavos, por isso fica de fora da conta, e no doce pequeno ela pesa mais do que parece.",
  },
  {
    nome: "Sua hora.",
    texto:
      "O tempo de fazer, enrolar, montar e embalar, vezes o valor da sua hora. O valor sai do que você quer tirar no mês dividido pelas horas que passa na cozinha. Quem não conta a própria hora trabalha de graça.",
  },
  {
    nome: "Gás e energia.",
    texto:
      "O forno, o fogão e a batedeira, pelo tempo que cada receita usa. É uma das parcelas menores, e entra mesmo assim.",
  },
  {
    nome: "Despesas fixas.",
    texto:
      "Aluguel, internet, o MEI, o celular: chegam todo mês, venda você muito ou pouco. Some o mês, divida pelo que você vende nele, e cada doce leva a fatia dele.",
  },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: "Como precificar doces para vender?",
    resposta:
      "Depende do que o seu custa. Some as cinco parcelas na unidade em que você vende e divida por 1 menos a margem e menos as taxas. A tabela acima mostra o resultado em quatro doces de exemplo; o seu preço sai dos números da sua cozinha.",
  },
  {
    pergunta: "Qual a margem de lucro de um doce?",
    resposta: `A que você escolher. Os exemplos destas páginas usam ${parametros.margemDesejada}%, e é só o número do exemplo: uma média de mercado não sabe quanto custa a sua cozinha nem quanto você quer tirar no mês. Escolha a sua e ponha na divisão.`,
  },
  {
    pergunta: "Preciso de planilha?",
    resposta: (
      <>
        Não. A{" "}
        <Link
          href="/como-calcular-o-preco-do-cookie#sua-conta"
          className="font-medium underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          calculadora na página do cookie
        </Link>{" "}
        faz a conta com os seus números, e o Rende guarda a conta de cada doce e
        refaz quando um ingrediente sobe.
      </>
    ),
  },
  {
    pergunta: "Doce de encomenda e doce de pronta entrega têm o mesmo preço?",
    resposta:
      "A conta é a mesma, e o que muda é a perda. O doce de encomenda sai vendido; o de pronta entrega que sobra no fim do dia foi feito e pago do mesmo jeito. Se de cada dez sobra um, divida o custo do lote por nove, e não por dez.",
  },
];

/** O nome do doce, que leva à página dele. */
function LinkDoDoce({ endereco, doce }: { endereco: Endereco; doce: string }) {
  return (
    <Link
      href={endereco}
      className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-150 ease-quart hover:decoration-ink"
    >
      {doce}
    </Link>
  );
}

function Erro({ linha }: { linha: Linha }) {
  return (
    <>
      {linha.erro}
      <span className="mt-1 flex items-start gap-1.5 text-label text-ink-muted">
        <TrendingDown
          aria-hidden
          className="mt-px size-4 shrink-0 text-negative"
          strokeWidth={1.75}
        />
        <span>Sobram {formatarPercentual(linha.sobraNoErro, 0)} do preço</span>
      </span>
    </>
  );
}

function Preco({ linha }: { linha: Linha }) {
  return (
    <>
      <Valor centavos={linha.preco} />
      {linha.precoDe && (
        <span className="block text-label text-ink-muted">{linha.precoDe}</span>
      )}
    </>
  );
}

export default function PaginaPrecoDeDoces() {
  return (
    <>
      <Topo />

      <main id="conteudo">
        <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
          <CabecalhoDoArtigo
            titulo="Como calcular o preço de doces"
            atualizadoEm={ATUALIZADO_EM}
          >
            Para qualquer doce, some ingredientes, embalagem, sua hora, gás e
            energia e uma fatia das despesas fixas, na unidade em que você
            vende: a unidade, o cento, o quilo ou o pote. Depois divida esse
            custo por 1 menos a margem e menos as taxas.
          </CabecalhoDoArtigo>

          <section aria-labelledby="o-que-muda" className="mt-16">
            <h2 id="o-que-muda" className={TITULO_H2}>
              O que muda de doce pra doce
            </h2>
            <p className="mt-4 max-w-[68ch] text-body text-ink">
              A conta é uma só. Muda a unidade em que o doce se vende, a parcela
              que mais pesa ou mais engana, e o erro que cada um costuma ter. Os
              preços são os dos exemplos de cada página, pedindo{" "}
              {parametros.margemDesejada}% de margem; o seu sai dos custos da
              sua cozinha. Toque no doce para ver a conta dele, passo a passo.
            </p>

            {/* Cinco colunas não cabem em 390px sem rolar de lado: no celular,
                uma lista de definições por doce. */}
            <ul className="mt-6 divide-y divide-line border-y border-line md:hidden">
              {LINHAS.map((l) => (
                <li key={l.endereco} className="py-4">
                  <p className="text-subheading">
                    <LinkDoDoce endereco={l.endereco} doce={l.doce} />
                  </p>
                  <dl className="mt-2 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-body text-ink">
                    <dt className="text-label font-medium text-ink-muted">
                      Vende por
                    </dt>
                    <dd>{l.vendePor}</dd>
                    <dt className="text-label font-medium text-ink-muted">
                      O que pesa
                    </dt>
                    <dd>{l.pesa}</dd>
                    <dt className="text-label font-medium text-ink-muted">
                      O erro
                    </dt>
                    <dd>
                      <Erro linha={l} />
                    </dd>
                    <dt className="text-label font-medium text-ink-muted">
                      Preço do exemplo
                    </dt>
                    <dd>
                      <Preco linha={l} />
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>

            <table className="mt-6 hidden w-full border-y border-line text-left md:table">
              <caption className="mb-3 text-left text-label text-ink-muted">
                {`Os quatro doces de exemplo, com ${parametros.margemDesejada}% de margem e ${parametros.taxaCartaoConsiderada}% de maquininha`}
              </caption>
              <thead>
                <tr className="border-b border-line text-label text-ink-muted">
                  <th scope="col" className="py-3 pr-3 font-medium">
                    Doce
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Vende por
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    O que pesa
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    O erro
                  </th>
                  <th scope="col" className="py-3 pl-3 text-right font-medium">
                    Preço do exemplo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {LINHAS.map((l) => (
                  <tr key={l.endereco} className="align-top text-body text-ink">
                    <th scope="row" className="py-3 pr-3 font-normal">
                      <LinkDoDoce endereco={l.endereco} doce={l.doce} />
                    </th>
                    <td className="px-3 py-5">{l.vendePor}</td>
                    <td className="px-3 py-5">{l.pesa}</td>
                    <td className="px-3 py-5">
                      <Erro linha={l} />
                    </td>
                    <td className="py-5 pl-3 text-right">
                      <Preco linha={l} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="max-w-[68ch]">
            <section aria-labelledby="parcelas" className="mt-16">
              <h2 id="parcelas" className={TITULO_H2}>
                As cinco parcelas
              </h2>
              {PARCELAS.map((p) => (
                <p key={p.nome} className="mt-4 text-body text-ink">
                  <span className="font-semibold">{p.nome}</span> {p.texto}
                </p>
              ))}
              <p className="mt-4 text-body text-ink">
                O passo a passo, com exemplo, está na página de cada doce.
              </p>
            </section>

            <section aria-labelledby="margem" className="mt-16">
              <h2 id="margem" className={TITULO_H2}>
                Margem e taxas
              </h2>
              <p className="mt-4 text-body text-ink">
                Com o custo na mão, o preço sai de uma divisão. A margem é o que
                você quer que sobre do preço. As taxas são o que sai dele antes
                de chegar em você: a maquininha, a comissão do aplicativo, o
                pagamento online. As duas são parte do preço, e por isso as duas
                entram na divisão:
              </p>
              <p className="mt-6 rounded-lg bg-sunken px-5 py-5 text-heading font-semibold text-ink">
                preço = custo ÷ (1 − margem − taxas)
              </p>
              <p className="mt-6 text-body text-ink">
                Margem é quanto do preço fica com você. Markup é por quanto você
                multiplica o custo. Os dois se escrevem em porcentagem, e quem
                soma {parametros.margemDesejada}% em cima do custo acha que tem{" "}
                {parametros.margemDesejada}% de margem e fica com bem menos:{" "}
                <Link
                  href="/como-calcular-o-preco-do-cookie#erro"
                  className="font-medium underline decoration-line underline-offset-4 hover:decoration-ink"
                >
                  a página do cookie mostra quanto
                </Link>
                .
              </p>
            </section>

            <Perguntas perguntas={PERGUNTAS} />
          </div>
        </article>

        <Convite>
          O Rende faz essa conta pra cada doce do seu cardápio, e refaz quando
          um ingrediente sobe.
        </Convite>
      </main>

      <Rodape />
    </>
  );
}
