import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalculadoraDaPorta } from "@/components/site/CalculadoraDaPorta";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Rodape, Topo } from "@/components/site/Moldura";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  economiaAnual,
  NOME_DO_PACOTE,
  O_QUE_O_PACOTE_TEM,
  RECURSOS_DO_PACOTE,
  unidadesQuePagam,
} from "@/lib/domain/assinatura";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";
import { lerPrecos, stripeDisponivel } from "@/lib/server/stripe";
import type { Centavos, Pacote } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { DESCRICAO } from "../descricao";
import { URL_DO_SITE } from "../site";

/**
 * A página de venda (spec 036). Pública e indexável, fora de `(app)` e de
 * `(auth)`, como `/c/[contaId]`. `/` continua sendo o app: o visitante sem
 * login no navegador é levado para cá pelo guarda do `(app)/layout.tsx`
 * (`DECISOES.md#d172`). Todo número de dinheiro sai das funções do app sobre
 * `EXEMPLO` (`#d173`) ou do Stripe (`#d174`).
 */

// O preço muda no Stripe, e a página alcança em até uma hora.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Rende · o preço certo de cada doce" },
  description: DESCRICAO,
  // Sobrepõe o `noindex` do layout raiz, como `/como-calcular-o-preco-do-cookie`.
  robots: { index: true, follow: true },
  alternates: { canonical: "/conheca" },
  openGraph: {
    title: "Rende · o preço certo de cada doce",
    description: DESCRICAO,
    url: "/conheca",
    locale: "pt_BR",
    type: "website",
    siteName: "Rende",
  },
};

/**
 * O Rende como aplicativo, para a busca (`DECISOES.md#d179`). Uma `Offer` por
 * pacote só quando o Stripe respondeu (`#d174`); nenhuma avaliação, porque
 * ninguém avaliou.
 */
function dadosEstruturados(precos: Precos | null) {
  const pacotes = Object.keys(RECURSOS_DO_PACOTE) as Pacote[];
  const ofertas = precos
    ? pacotes.flatMap((pacote) => {
        const preco = precos[pacote];
        return preco
          ? [
              {
                "@type": "Offer",
                name: NOME_DO_PACOTE[pacote],
                // Reais na borda: o schema.org pede o número decimal.
                price: (preco.mensal / 100).toFixed(2),
                priceCurrency: "BRL",
              },
            ]
          : [];
      })
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Rende",
    url: `${URL_DO_SITE}/conheca`,
    description: DESCRICAO,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    inLanguage: "pt-BR",
    ...(ofertas.length > 0 && { offers: ofertas }),
  };
}

/**
 * As palavras dela, com autorização por escrito, ou a seção não vai ao ar
 * (`DECISOES.md#d175`). `cidade` e `foto` só entram se ela autorizar; a foto
 * mora em `public/site/`.
 */
const DEPOIMENTO: {
  texto: string;
  nome: string;
  /** De onde o Rende veio, sob a mesma autorização (`#d184`): sai junto com o resto. */
  origem?: string;
  cidade?: string;
  foto?: string;
} = {
  texto:
    "Eu tinha um produto muito gostoso, mas não sabia como precificar. O Rende me ajudou nisso e em muito mais. Agora tenho tudo organizado e a certeza de que estou cobrando o valor certo.",
  nome: "Maynara",
  origem:
    "O Rende nasceu na cozinha da MyCookie's. Tudo o que ele sabe sobre a bancada veio de ver a Maynara trabalhar.",
};

/**
 * Os três momentos do mês depois do preço (`DECISOES.md#d181`), cada um com a
 * captura da tela que o resolve, tirada de uma conta de demonstração e nunca da
 * MyCookie's. Sem as três capturas em `public/site/` a seção não vai ao ar:
 * `src` vazio a esconde, e o `alt` por escrever o portão do deploy pega
 * (`rg -n "\[texto" src/app`). O `alt` diz os números da tela.
 *
 * **As capturas envelhecem**: spec que mudar a tela Hoje, o editor de pedido ou
 * o painel do mês refaz a imagem correspondente.
 */
const TELAS_DO_MES: {
  titulo: string;
  texto: string;
  src: string;
  alt: string;
  largura: number;
  altura: number;
}[] = [
  {
    titulo: "A manteiga subiu.",
    texto:
      "Você corrige o preço do pacote uma vez. O Rende refaz o custo de todo doce que usa manteiga e mostra qual ficou no vermelho, e por quê.",
    src: "",
    alt: "[texto de quem conduz o projeto: o aviso da tela Hoje, com o doce e o quanto a manteiga subiu]",
    largura: 0,
    altura: 0,
  },
  {
    titulo: "Chegou uma encomenda.",
    texto:
      "O total, quanto sobra pra você e o resumo pronto pro WhatsApp. Confirmado, o pedido entra na lista do mercado, só com o que falta na despensa.",
    src: "",
    alt: "[texto de quem conduz o projeto: o pedido, com o total e quanto sobra]",
    largura: 0,
    altura: 0,
  },
  {
    titulo: "Fechou o mês.",
    texto:
      "Quanto entrou, quanto saiu e quantos doces faltam pra bater a sua meta.",
    src: "",
    alt: "[texto de quem conduz o projeto: o caixa do mês, com entradas, saídas e os doces que faltam]",
    largura: 0,
    altura: 0,
  },
];

const temTelasDoMes = TELAS_DO_MES.every((t) => t.src);

// A ordem é a das objeções mais fortes primeiro (spec 039).
const DUVIDAS = [
  {
    pergunta: "Preciso saber de contabilidade?",
    resposta:
      "Não. O Rende faz a conta e explica em uma frase, do lado do número: quanto custa, quanto cobrar e quanto sobra pra você. O preço quem decide é você.",
  },
  {
    pergunta: "Por que pagar todo mês, se o preço eu calculo uma vez?",
    // O aviso da 024 olha material, e não a configuração: a taxa da
    // maquininha não entra na frase.
    resposta:
      "Porque o preço não fica parado. A manteiga sobe, o saquinho muda de preço. Quando um material sobe, o Rende refaz a conta de todos os doces que usam ele e avisa qual ficou no vermelho. E cuida das encomendas e do caixa, que são de toda semana.",
  },
  {
    pergunta: "Já uso uma planilha. O que muda?",
    resposta:
      "A planilha faz a conta que você montou. O Rende já vem com a conta montada, soma o que a planilha costuma esquecer (embalagem, sua hora, gás, maquininha) e funciona no celular, na bancada, sem internet.",
  },
  {
    pergunta: "Preciso cadastrar tudo pra começar?",
    resposta:
      "Não. Um toque traz os materiais que toda cozinha tem, com preço médio, e dois cookies já com preço. Você corrige o que for diferente do seu.",
  },
  {
    pergunta: "Serve pra bolo, salgado, pão?",
    resposta:
      "Serve pra tudo que tem receita e rende um tanto de unidades. O doce muda, a conta é a mesma: material, embalagem, seu trabalho, gás e as despesas fixas.",
  },
  {
    pergunta: "E se não tiver internet na cozinha?",
    resposta:
      "Funciona do mesmo jeito. O que você anota fica salvo no aparelho e sobe sozinho quando o sinal voltar.",
  },
  {
    pergunta: "Precisa instalar? Funciona no iPhone?",
    resposta:
      "Abre no navegador de qualquer celular ou computador. Se quiser, você põe na tela de início e ele vira um ícone, como um aplicativo. No iPhone e no Android.",
  },
  {
    pergunta: "Meus dados são meus?",
    resposta:
      "São. Você baixa tudo num arquivo quando quiser, assinando ou não, e pode encerrar a conta quando decidir.",
  },
  {
    pergunta: "Minha cliente vai ver a marca de vocês?",
    resposta:
      "Não no resumo de WhatsApp nem na etiqueta. No orçamento em A4 e no cardápio fica uma linha discreta, “feito com Rende”, que quem assina pode desligar.",
  },
];

const ANCORAS = [
  { href: "#conta", rotulo: "A conta" },
  { href: "#sua-conta", rotulo: "Sua conta" },
  ...(temTelasDoMes ? [{ href: "#depois", rotulo: "Depois do preço" }] : []),
  { href: "#quem", rotulo: "Quem usa" },
  { href: "#preco", rotulo: "Preço" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

type Precos = Awaited<ReturnType<typeof lerPrecos>>;

/** Sem Stripe, ou com ele fora do ar, a página fica de pé sem número (`#d174`). */
async function precosOuNada(): Promise<Precos | null> {
  if (!stripeDisponivel()) return null;
  try {
    return await lerPrecos();
  } catch {
    return null;
  }
}

export default async function PaginaConheca() {
  const precos = await precosOuNada();
  const sugerido = calcularPrecoSugerido(
    EXEMPLO.custo.custoUnitario,
    EXEMPLO.parametros,
  );
  const temDepoimento = !!DEPOIMENTO.texto;

  return (
    <>
      <main>
        <Topo ancoras={ANCORAS} convite />

        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 lg:grid-cols-[1fr_28rem] lg:items-center lg:gap-16 lg:px-10 lg:pt-16 lg:pb-24">
          <section aria-labelledby="frase">
            <p className="text-label font-semibold text-ink-muted">
              Você sabe fazer doce. Isso nunca foi o problema.
            </p>
            <h1
              id="frase"
              className="mt-3 text-balance font-display text-[2.125rem] leading-[1.1] font-bold tracking-tight text-ink lg:text-[3.5rem] lg:leading-[1.05]"
            >
              Este cookie te custa{" "}
              <span className="num">
                {formatarMoeda(EXEMPLO.custo.custoUnitario)}
              </span>
              . Você deveria cobrar{" "}
              <span className="num">
                {sugerido.ok && formatarMoeda(sugerido.precoArredondado)}
              </span>
              .
            </h1>
            <p className="mt-5 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
              O saquinho que ninguém soma, o gás que ninguém conta, a sua hora e
              a maquininha que chega depois. O Rende soma tudo antes de você dar
              o preço, sugere quanto cobrar e diz, em reais, quanto sobra pra
              você.
            </p>
            {/* O convite do teste passou para o fim da calculadora, onde ele
                faz sentido (`#d187`). */}
            <a
              href="#sua-conta"
              className={classesBotao({
                variante: "primaria",
                tamanho: "lg",
                className: "mt-8 w-full sm:w-auto lg:h-14 lg:px-6",
              })}
            >
              Fazer a conta do meu cookie
            </a>
            <p className="mt-3 text-label text-ink-muted">
              Leva um minuto, sem cadastro
            </p>
          </section>

          <ContaAberta />
        </div>

        <SuaConta />

        {temTelasDoMes && <DepoisDoPreco />}

        {temDepoimento && <QuemJaUsa />}

        <Preco
          precos={precos}
          precoDoCookie={sugerido.ok ? sugerido.precoArredondado : 0}
        />

        {/* A barra do celular é o último filho deste bloco, `sticky` no pé:
            só aparece depois que ele entra na tela e descansa acima do rodapé.
            O bloco começa nas dúvidas: a barra entra quando elas chegam ao pé
            da tela, com os cartões de preço ainda à vista. Começando no preço,
            ela aparecia junto com o botão do fim da calculadora (spec 040,
            medido a 390 × 844; ver `ESTADO.md`), e dois âmbar juntos é erro. */}
        <div>
          <Duvidas />
          <BarraDoCelular />
        </div>

        <script
          type="application/ld+json"
          // `<` escapado: nenhum texto do objeto fecha a tag `script`.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(dadosEstruturados(precos)).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
      </main>

      <Rodape />
    </>
  );
}

/**
 * A conta do cookie dela (spec 040, `#d187`): logo depois do topo, com o
 * convite do teste no fim, onde ele faz sentido. O exemplo do topo continua
 * parado, com os 40% + 5% dele; a calculadora diz a margem que usa (`#d186`).
 */
function SuaConta() {
  return (
    <section
      id="sua-conta"
      aria-labelledby="sua-conta-titulo"
      className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-16 lg:px-10 lg:pb-24"
    >
      <div className="border-t border-line pt-16 lg:pt-24">
        <h2
          id="sua-conta-titulo"
          className="max-w-[24ch] text-balance font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink lg:text-[2.375rem]"
        >
          Agora a conta do seu cookie
        </h2>
        <p className="mt-4 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
          Troque o que for diferente na sua cozinha e ponha o preço que você
          cobra hoje. É a mesma conta que o Rende faz depois que você entra.
        </p>

        <CalculadoraDaPorta className="mt-10 lg:mt-14">
          <div className="flex flex-col gap-3">
            <Link
              href="/cadastro"
              className={classesBotao({
                variante: "primaria",
                tamanho: "lg",
                larguraTotal: true,
                className: "lg:h-14",
              })}
            >
              Começar o teste de {DIAS_DE_TESTE} dias
            </Link>
            <p className="text-center text-label text-ink-muted">
              {temTelasDoMes ? (
                <>
                  Sem cartão.{" "}
                  <a
                    href="#depois"
                    className="font-medium text-brand-ink underline underline-offset-4"
                  >
                    Veja o que acontece depois do preço
                  </a>
                </>
              ) : (
                "Sem cartão · funciona offline, na bancada"
              )}
            </p>
          </div>
        </CalculadoraDaPorta>
      </div>
    </section>
  );
}

/**
 * O que o Rende faz depois do preço (`#d181`): uma linha por momento, texto e
 * tela lado a lado no desktop, alternando o lado; empilhados no celular. Nada
 * de grade de cartões iguais, nada de moldura de aparelho.
 */
function DepoisDoPreco() {
  return (
    <section
      id="depois"
      aria-labelledby="depois-titulo"
      className="mx-auto max-w-6xl px-4 pb-16 lg:px-10 lg:pb-24"
    >
      <div className="border-t border-line pt-16 lg:pt-24">
        <h2
          id="depois-titulo"
          className="max-w-[24ch] text-balance font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink lg:text-[2.375rem]"
        >
          O preço certo de hoje fica errado quando a manteiga sobe
        </h2>
        <p className="mt-4 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
          Por isso o Rende não é uma conta que se faz uma vez. Ele fica de olho
          no preço e cuida do resto da semana.
        </p>

        <ol className="mt-12 flex flex-col gap-14 lg:mt-16 lg:gap-20">
          {TELAS_DO_MES.map((tela, i) => (
            <li
              key={tela.titulo}
              className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16"
            >
              <div
                className={cn(i % 2 === 1 && "lg:col-start-2 lg:row-start-1")}
              >
                <h3 className="font-display text-title font-bold text-ink lg:text-[1.75rem] lg:leading-[1.2]">
                  {tela.titulo}
                </h3>
                <p className="mt-3 max-w-[40ch] text-body text-ink-muted">
                  {tela.texto}
                </p>
              </div>
              <Image
                src={tela.src}
                alt={tela.alt}
                width={tela.largura}
                height={tela.altura}
                sizes="18rem"
                className={cn(
                  "h-auto w-full max-w-[18rem] rounded-lg border border-line shadow-raised",
                  i % 2 === 1
                    ? "lg:col-start-1 lg:row-start-1 lg:justify-self-end"
                    : "lg:justify-self-start",
                )}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function QuemJaUsa() {
  return (
    <section
      id="quem"
      aria-labelledby="quem-titulo"
      className="bg-brand-800 text-on-brand"
    >
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 py-16 lg:px-10 lg:py-24",
          DEPOIMENTO.foto &&
            "lg:grid lg:grid-cols-[25rem_1fr] lg:items-center lg:gap-16",
        )}
      >
        {DEPOIMENTO.foto && (
          <Image
            src={DEPOIMENTO.foto}
            alt="Maynara na bancada da MyCookie's"
            width={400}
            height={440}
            className="mb-8 h-60 w-full rounded-lg object-cover lg:mb-0 lg:h-110"
          />
        )}
        <div>
          <h2
            id="quem-titulo"
            className="text-label font-semibold text-on-brand-muted"
          >
            Quem já usa
          </h2>
          <figure className="mt-4">
            <blockquote className="max-w-[34ch] text-pretty font-display text-[1.375rem] leading-[1.3] font-semibold lg:text-[2rem] lg:leading-[1.2]">
              <p>{DEPOIMENTO.texto}</p>
            </blockquote>
            <figcaption className="mt-6 text-body text-on-brand-muted">
              <span className="font-semibold text-on-brand">
                {DEPOIMENTO.nome}
              </span>
              , MyCookie&apos;s
              {DEPOIMENTO.cidade && ` · ${DEPOIMENTO.cidade}`}
            </figcaption>
          </figure>
          {DEPOIMENTO.origem && (
            <p className="mt-6 max-w-[52ch] text-body text-on-brand-muted">
              {DEPOIMENTO.origem}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Preco({
  precos,
  precoDoCookie,
}: {
  precos: Precos | null;
  /** O `precoArredondado` do `EXEMPLO`: o mês em cookies (`#d182`). */
  precoDoCookie: Centavos;
}) {
  const pacotes = Object.keys(RECURSOS_DO_PACOTE) as Pacote[];

  return (
    <section
      id="preco"
      aria-labelledby="preco-titulo"
      className="mx-auto max-w-6xl px-4 py-16 lg:px-10 lg:py-24"
    >
      <h2
        id="preco-titulo"
        className="text-balance font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink lg:text-[2.375rem]"
      >
        Dois planos. O teste tem tudo.
      </h2>
      <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
        Catorze dias grátis, sem cartão, com tudo aberto. No fim do teste você
        escolhe. Se não escolher, seus dados ficam guardados e você continua
        vendo tudo; só não edita.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {pacotes.map((pacote) => {
          const preco = precos?.[pacote];
          const economia = preco ? economiaAnual(preco.mensal, preco.anual) : 0;
          const cookies = preco
            ? unidadesQuePagam(preco.mensal, precoDoCookie)
            : 0;
          return (
            <article
              key={pacote}
              aria-labelledby={`pacote-${pacote}`}
              className="flex flex-col rounded-lg border border-line bg-surface p-6"
            >
              <h3
                id={`pacote-${pacote}`}
                className="text-heading font-semibold text-ink"
              >
                {NOME_DO_PACOTE[pacote]}
              </h3>
              {preco && (
                <>
                  <p className="mt-4 flex items-baseline gap-2">
                    <Dinheiro centavos={preco.mensal} tamanho="xl" />
                    <span className="text-label text-ink-muted">por mês</span>
                  </p>
                  {cookies > 0 && (
                    <p className="mt-1 text-label text-ink-muted">
                      O mês sai por{" "}
                      <span className="num font-semibold text-ink">
                        {cookies}
                      </span>{" "}
                      {cookies === 1 ? "cookie" : "cookies"} como o do exemplo.
                    </p>
                  )}
                  {economia > 0 && (
                    <p className="mt-1 text-label text-ink-muted">
                      ou{" "}
                      <span className="num font-semibold text-ink">
                        {formatarMoeda(preco.anual)}
                      </span>{" "}
                      no ano:{" "}
                      <span className="num font-semibold text-ink">
                        {formatarMoeda(economia)}
                      </span>{" "}
                      a menos.
                    </p>
                  )}
                </>
              )}
              <p className="mt-4 text-body text-ink-muted">
                {O_QUE_O_PACOTE_TEM[pacote]}
              </p>
            </article>
          );
        })}
      </div>

      {/* No celular quem faz este papel é a barra do pé, que já está na tela
          aqui: dois âmbar juntos é erro. */}
      <div className="mt-10 hidden flex-col items-start gap-3 lg:flex">
        <Link
          href="/cadastro"
          className={classesBotao({
            variante: "primaria",
            tamanho: "lg",
            className: "h-14 px-6",
          })}
        >
          Começar o teste de {DIAS_DE_TESTE} dias
        </Link>
        <p className="text-label text-ink-muted">
          Você só informa pagamento se decidir continuar.
        </p>
      </div>
    </section>
  );
}

function Duvidas() {
  return (
    <section
      id="duvidas"
      aria-labelledby="duvidas-titulo"
      className="mx-auto max-w-6xl px-4 pb-16 lg:px-10 lg:pb-24"
    >
      <h2
        id="duvidas-titulo"
        className="text-balance font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink lg:text-[2.375rem]"
      >
        Perguntas que sempre chegam
      </h2>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {DUVIDAS.map((d) => (
          <li
            key={d.pergunta}
            className="flex flex-col gap-2 py-6 lg:grid lg:grid-cols-[17.5rem_1fr] lg:gap-10"
          >
            <h3 className="text-subheading font-semibold text-ink">
              {d.pergunta}
            </h3>
            <p className="max-w-[60ch] text-body text-ink-muted">
              {d.resposta}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Só no celular, só CSS (`sticky`); ver o comentário do bloco que a contém. */
function BarraDoCelular() {
  return (
    <div className="rodape-seguro sticky bottom-0 border-t border-line bg-surface px-4 pt-3 lg:hidden">
      <Link
        href="/cadastro"
        className={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          larguraTotal: true,
        })}
      >
        Testar {DIAS_DE_TESTE} dias grátis
      </Link>
      <p className="mt-2 text-center text-label text-ink-muted">
        Sem cartão · cancela quando quiser
      </p>
    </div>
  );
}
