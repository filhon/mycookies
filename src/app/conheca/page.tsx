import type { Metadata } from "next";
import { Check, Lock, Mail, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { linkDaAjuda } from "@/components/auth/MolduraDeEntrada";
import { FAQ } from "@/components/site/Artigo";
import { CalculadoraDaPorta } from "@/components/site/CalculadoraDaPorta";
import { ContaAberta } from "@/components/site/ContaAberta";
import { FaixaDoCusto } from "@/components/site/FaixaDoCusto";
import { LuzDaJanela } from "@/components/site/LuzDaJanela";
import { DUVIDA_DO_SITE, Rodape, Topo } from "@/components/site/Moldura";
import { OrigemDoLink } from "@/components/site/OrigemDoLink";
import { PortaDoBeta } from "@/components/site/PortaDoBeta";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  economiaAnual,
  FRASE_DO_PRECO_DE_FUNDADORA,
  fraseDosMesesDeGraca,
  mesesDeGraca,
  NOME_DO_PACOTE,
  O_QUE_O_PACOTE_TEM,
  PRA_QUEM_E,
  RECURSOS_DO_PACOTE,
  unidadesQuePagam,
} from "@/lib/domain/assinatura";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { EXEMPLO, faixaDoExemplo } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";
import { lerBeta } from "@/lib/server/beta";
import { lerPrecos, stripeDisponivel } from "@/lib/server/stripe";
import type { Centavos, Pacote } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { DESCRICAO } from "../descricao";
import { jsonLd, ORGANIZACAO, URL_DO_SITE } from "../site";

/**
 * A página de venda (spec 036). Pública e indexável, fora de `(app)` e de
 * `(auth)`, como `/c/[contaId]`. `/` continua sendo o app: o visitante sem
 * login no navegador é levado para cá pelo guarda do `(app)/layout.tsx`
 * (`DECISOES.md#d172`). Todo número de dinheiro sai das funções do app sobre
 * `EXEMPLO` (`#d173`) ou do Stripe (`#d174`).
 */

// O preço muda no Stripe e as vagas do beta em `plataforma/beta`; a página
// alcança os dois em até cinco minutos (spec 184, `#d407`).
export const revalidate = 300;

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
    "@type": "SoftwareApplication",
    name: "Rende",
    url: `${URL_DO_SITE}/conheca`,
    description: DESCRICAO,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    inLanguage: "pt-BR",
    image: `${URL_DO_SITE}/icons/icone-512.png`,
    publisher: ORGANIZACAO,
    ...(ofertas.length > 0 && { offers: ofertas }),
  };
}

/**
 * As palavras de quem usa, até três, cada uma com autorização por escrito de
 * quem falou, ou a seção não vai ao ar (`DECISOES.md#d175`, `#d386`). Cada
 * opcional só entra se ela autorizar; a foto mora em `public/site/`, e o
 * `numero` tem que ser o dela.
 */
type Depoimento = {
  texto: string;
  nome: string;
  negocio: string;
  cidade?: string;
  foto?: string;
  /** Sem `@`: vira o link para o perfil. */
  instagram?: string;
  /** Uma linha curta, "De R$ 6,00 para R$ 8,50 no cookie". Nunca em rosa. */
  numero?: string;
};

const DEPOIMENTOS: Depoimento[] = [
  {
    texto:
      "Eu tinha um produto muito gostoso, mas não sabia como precificar. O Rende me ajudou nisso e em muito mais. Agora tenho tudo organizado e a certeza de que estou cobrando o valor certo.",
    nome: "Maynara",
    negocio: "MyCookie’s",
    cidade: "Olinda",
    instagram: "mycookiesartesanais",
    numero: "De R$ 10,00 para R$ 15,00 no cookie",
  },
];

/**
 * Quem está por trás do Rende (`#d386`, que absorve a `origem` da `#d184`),
 * sob a mesma autorização por escrito. Sem `foto`, o texto ocupa a faixa.
 */
const QUEM_FAZ: { texto: string; foto?: string } = {
  texto:
    "O Rende nasceu para resolver um problema real de quem faz doce: o preço certo. Eu sou o Filipe, minha esposa, a Maynara, produz cookies e os vende pelo preço certo.",
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
    // Segunda, e não quinta: a página parece de cookie (spec 168).
    pergunta: "Serve pra bolo, salgado, pão?",
    resposta:
      "Serve pra tudo que tem receita e rende um tanto de unidades. O doce muda, a conta é a mesma: material, embalagem, seu trabalho, gás e as despesas fixas.",
  },
  {
    pergunta: "Por que pagar todo mês, se o preço eu calculo uma vez?",
    // O aviso da 024 olha material, e não a configuração: a taxa da
    // maquininha não entra na frase.
    resposta:
      "Porque o preço não fica parado. A manteiga sobe, o saquinho muda de preço. Quando um material sobe, o Rende refaz a conta de todos os doces que usam ele e avisa qual ficou no vermelho. E cuida das encomendas e do caixa, que são de toda semana.",
  },
  {
    // Terceira (spec 170): o arrependimento é o da seção 5 dos termos, e o que
    // fica depois de cancelar é o `fraseDoQueFica` (spec 162). Cancelar passa
    // pelo passo "Antes de cancelar" e pelo portal: não são dois toques.
    pergunta: "E se eu desistir?",
    resposta:
      "No teste, é só não assinar: nada é cobrado, e seus dados ficam pra ver. Assinou e desistiu em até 7 dias, devolvemos tudo. Depois disso, cancela pelo app quando quiser, usa até o fim do que já pagou, e seus preços, pedidos e caixa ficam guardados pra ler e baixar.",
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

/**
 * O que os dois planos têm (spec 170), conferido contra o app. O orçamento sai
 * sem "que a cliente aprova pelo link": o link do pedido é do cardápio, só do
 * Completo (`useLinkDoAcompanhamento`).
 */
const OS_DOIS_TEM = [
  "Funciona sem internet, na bancada e no mercado",
  "Lê a nota do mercado e atualiza o preço dos materiais",
  "A receita aberta na bancada, passo a passo",
  "O orçamento em folha, com o seu Pix",
  "A lista do mercado com o que falta na despensa",
  "Suas clientes, e quem está te devendo",
  "O relatório do MEI, pronto pra declarar",
  "Seus dados num arquivo, quando você quiser",
];

const ANCORAS = [
  { href: "#conta", rotulo: "O exemplo" },
  { href: "#sua-conta", rotulo: "Calcule o seu" },
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
  const [precos, beta] = await Promise.all([precosOuNada(), lerBeta()]);
  const noBeta = beta.fase === "BETA";
  const sugerido = calcularPrecoSugerido(
    EXEMPLO.custo.custoUnitario,
    EXEMPLO.parametros,
  );
  const faixa = faixaDoExemplo(EXEMPLO);
  const temChute =
    sugerido.ok && EXEMPLO.precoPraticado !== sugerido.precoArredondado;

  return (
    <>
      <Topo ancoras={ANCORAS} convite />
      <OrigemDoLink />

      {/* `clip` corta a luz da janela na borda da tela sem virar contêiner de
          rolagem: a barra `sticky` do celular continua presa ao viewport. */}
      <main id="conteudo" className="overflow-x-clip">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 lg:grid-cols-[1fr_28rem] lg:items-center lg:gap-16 lg:px-10 lg:pt-16 lg:pb-24">
          <section aria-labelledby="frase">
            {noBeta && (
              <p className="mb-2 flex items-center gap-1.5 text-label text-ink-muted">
                <Lock
                  aria-hidden
                  strokeWidth={1.75}
                  className="size-4 shrink-0"
                />
                Em beta fechado, para {beta.vagas} confeiteiras.
              </p>
            )}
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
              <span className="whitespace-nowrap">
                {/* O preço que ela cobra hoje, corrigido à caneta (`#d255`).
                    Fora da leitura: no desktop o cartão diz o preço praticado,
                    no celular a frase escondida logo depois (`#d385`). */}
                {temChute && (
                  <>
                    <span aria-hidden className="num relative text-ink-muted">
                      {formatarMoeda(EXEMPLO.precoPraticado)}
                      <svg
                        viewBox="0 0 100 10"
                        preserveAspectRatio="none"
                        className="chute-riscado absolute top-1/2 left-[-0.08em] h-[0.3em] w-[calc(100%+0.16em)] -translate-y-1/2 overflow-visible fill-none stroke-ink"
                      >
                        <path d="M2 7 C 22 5.5, 42 6.8, 62 4.6 S 88 3.2, 98 3.6" />
                      </svg>
                    </span>{" "}
                  </>
                )}
                <span className="num">
                  {sugerido.ok && formatarMoeda(sugerido.precoArredondado)}
                </span>
              </span>
              {temChute && (
                <span className="sr-only lg:hidden">
                  , e não {formatarMoeda(EXEMPLO.precoPraticado)}
                </span>
              )}
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

          {/* Só no desktop (`#d385`): no celular a faixa, logo abaixo, faz o
              papel dele, e as duas sobras ficariam a uma rolagem. */}
          <div className="hidden lg:block">
            <LuzDaJanela>
              <ContaAberta />
            </LuzDaJanela>
          </div>
        </div>

        {/* A conta do topo se montando, no lugar da foto da bancada
            (`DECISOES.md#d382`). Os números são os do `h1` e da `ContaAberta`. */}
        {faixa && <FaixaDoCusto {...faixa} />}

        <SuaConta mensalDoPlano={precos?.ESSENCIAL.mensal} />

        {temTelasDoMes && <DepoisDoPreco />}

        <QuemJaUsa />

        <Preco
          noBeta={noBeta}
          precos={precos}
          precoDoCookie={sugerido.ok ? sugerido.precoArredondado : 0}
        />

        {/* A barra do celular é o último filho deste bloco, `sticky` no pé:
            só aparece depois que ele entra na tela e descansa acima do rodapé.
            O bloco começa nas dúvidas: a barra entra quando elas chegam ao pé
            da tela, com os cartões de preço ainda à vista. Começando no preço,
            ela aparecia junto com o botão do fim da calculadora (spec 040,
            medido a 390 × 844; ver `ESTADO.md`), e dois primários juntos é erro. */}
        <div>
          <Duvidas />
          <BarraDoCelular />
        </div>

        <ConviteDoFim />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(dadosEstruturados(precos)),
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
function SuaConta({ mensalDoPlano }: { mensalDoPlano?: Centavos }) {
  return (
    <section
      id="sua-conta"
      aria-labelledby="sua-conta-titulo"
      className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-16 lg:px-10 lg:pb-24"
    >
      {/* Sem filete: a faixa do custo, logo acima, já separa. */}
      <div className="pt-16 lg:pt-24">
        <h2
          id="sua-conta-titulo"
          className="max-w-[24ch] text-balance font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink lg:text-[2.375rem]"
        >
          Agora a conta do seu cookie
        </h2>
        <p className="mt-4 max-w-[52ch] text-body text-ink-muted lg:text-subheading">
          Troque o que for diferente na sua cozinha e ponha o preço que você
          cobra hoje. Aqui a conta é de cookie; no app, de bolo, brigadeiro,
          salgado e o que mais render unidades.
        </p>

        <CalculadoraDaPorta
          className="mt-10 lg:mt-14"
          mensalDoPlano={mensalDoPlano}
        >
          {/* No beta, a porta inteira, a `#lista` dos botões compactos. */}
          <PortaDoBeta origem="conheca">
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
          </PortaDoBeta>
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

/**
 * A conversa que a página oferece (`#d386`): WhatsApp quando há número, e o
 * e-mail sem ele. Aba nova, como o "Fale com a gente" das telas de acesso.
 */
function LinkDaConversa({ className }: { className: string }) {
  const temWhatsApp = !!RESPONSAVEL.whatsapp;
  const Icone = temWhatsApp ? MessageCircle : Mail;
  return (
    <a
      href={linkDaAjuda(DUVIDA_DO_SITE)}
      target="_blank"
      rel="noopener"
      className={cn(
        "toque inline-flex items-center gap-2 font-semibold underline underline-offset-4",
        className,
      )}
    >
      <Icone aria-hidden strokeWidth={1.75} className="size-5 shrink-0" />
      {temWhatsApp ? "Falar com a gente no WhatsApp" : "Escrever pra gente"}
    </a>
  );
}

/** Quem falou, o negócio, a cidade e o @, na ordem em que ela autorizou. */
function Legenda({ d }: { d: Depoimento }) {
  return (
    <figcaption className="mt-4 text-body text-on-brand-muted">
      <span className="font-semibold text-on-brand">{d.nome}</span>, {d.negocio}
      {d.cidade && ` · ${d.cidade}`}
      {d.instagram && (
        <>
          {" · "}
          <a
            href={`https://instagram.com/${encodeURIComponent(d.instagram)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="toque inline-flex items-center text-on-brand underline underline-offset-4"
          >
            <span translate="no">@{d.instagram}</span>
            <span className="sr-only"> no Instagram</span>
          </a>
        </>
      )}
    </figcaption>
  );
}

/** O dado antes do adjetivo: Familjen, `title`, e nunca rosa (`#d386`). */
function Numero({ d }: { d: Depoimento }) {
  return d.numero ? (
    <p className="num mb-3 font-display text-title font-bold text-on-brand">
      {d.numero}
    </p>
  ) : null;
}

/**
 * A faixa cobalto da prova (`#d175`, `#d386`): o primeiro depoimento grande, os
 * outros abaixo, e quem faz o Rende com o canal de conversa. Sem cartão, sem
 * aspas gigantes, sem estrela.
 */
function QuemJaUsa() {
  const [primeiro, ...outros] = DEPOIMENTOS;
  // Sem depoimento autorizado a seção sai (`#d175`).
  if (!primeiro) return null;
  return (
    <section
      id="quem"
      aria-labelledby="quem-titulo"
      className="sobre-marca bg-brand-800 text-on-brand"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-10 lg:py-24">
        <div
          className={cn(
            primeiro.foto &&
              "lg:grid lg:grid-cols-[25rem_1fr] lg:items-center lg:gap-16",
          )}
        >
          {primeiro.foto && (
            <Image
              src={primeiro.foto}
              alt={`${primeiro.nome}, ${primeiro.negocio}`}
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
              <Numero d={primeiro} />
              <blockquote className="max-w-[34ch] text-pretty font-display text-[1.375rem] leading-[1.3] font-semibold lg:text-[2rem] lg:leading-[1.2]">
                <p>{primeiro.texto}</p>
              </blockquote>
              <Legenda d={primeiro} />
            </figure>
          </div>
        </div>

        {outros.length > 0 && (
          <div className="mt-12 divide-y divide-on-brand-muted/20 border-t border-on-brand-muted/20 lg:mt-16 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {outros.map((d) => (
              <figure
                key={d.nome}
                className="py-8 lg:py-10 lg:pr-10 lg:even:pl-10"
              >
                <Numero d={d} />
                <blockquote className="max-w-[48ch] text-pretty text-subheading font-semibold text-on-brand">
                  <p>{d.texto}</p>
                </blockquote>
                <Legenda d={d} />
              </figure>
            ))}
          </div>
        )}

        <div
          className={cn(
            "mt-12 border-t border-on-brand-muted/20 pt-12 lg:mt-16 lg:pt-16",
            QUEM_FAZ.foto &&
              "lg:grid lg:grid-cols-[1fr_25rem] lg:items-center lg:gap-16",
          )}
        >
          {/* No celular acima do texto; no desktop, o lado que ficava vazio. */}
          {QUEM_FAZ.foto && (
            <Image
              src={QUEM_FAZ.foto}
              alt="Filipe e Maynara, que fazem o Rende"
              width={400}
              height={300}
              className="mb-8 h-60 w-full rounded-lg object-cover lg:order-last lg:mb-0 lg:h-80"
            />
          )}
          <div>
            <h3 className="text-heading font-semibold text-on-brand">
              Quem faz o Rende
            </h3>
            <p className="mt-3 max-w-[52ch] text-body text-on-brand-muted">
              {QUEM_FAZ.texto}
            </p>
            <LinkDaConversa className="mt-4 text-on-brand" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Preco({
  noBeta,
  precos,
  precoDoCookie,
}: {
  /** A fase `BETA`: o teste é de quem entra por convite (spec 184). */
  noBeta: boolean;
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
        {noBeta
          ? `No beta, quem entra por convite testa ${DIAS_DE_TESTE} dias grátis, sem cartão. Depois, assina se quiser.`
          : `${DIAS_DE_TESTE} dias grátis, sem cartão, com tudo aberto. No fim do teste você escolhe. Se não escolher, seus dados ficam guardados e você continua vendo tudo; só não edita.`}
      </p>

      {noBeta && (
        <>
          <h3 className="mt-10 text-heading font-semibold text-ink">
            Depois do beta
          </h3>
          {/* Sem valor em reais: o desconto depende da pesquisa (spec 187). */}
          <p className="mt-2 max-w-[60ch] text-body text-ink-muted">
            {FRASE_DO_PRECO_DE_FUNDADORA}
          </p>
        </>
      )}
      <div
        className={cn("grid gap-4 md:grid-cols-2", noBeta ? "mt-4" : "mt-10")}
      >
        {pacotes.map((pacote) => {
          const preco = precos?.[pacote];
          const economia = preco ? economiaAnual(preco.mensal, preco.anual) : 0;
          const meses = preco ? mesesDeGraca(preco.mensal, preco.anual) : 0;
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
              <p className="mt-1 text-body text-ink-muted">
                {PRA_QUEM_E[pacote]}
              </p>
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
                      {meses > 0 ? (
                        <span className="font-semibold text-ink">
                          {fraseDosMesesDeGraca(meses)}
                        </span>
                      ) : (
                        <>
                          <span className="num font-semibold text-ink">
                            {formatarMoeda(economia)}
                          </span>{" "}
                          a menos
                        </>
                      )}
                      .
                    </p>
                  )}
                </>
              )}
              <ul className="mt-4 space-y-2">
                {O_QUE_O_PACOTE_TEM[pacote].map((linha) => (
                  <li
                    key={linha}
                    className="flex gap-2 text-body text-ink-muted"
                  >
                    <Check
                      aria-hidden
                      strokeWidth={1.75}
                      className="mt-1 size-4 shrink-0 text-ink-subtle"
                    />
                    {linha}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {/* A amplitude do app, que os cartões não dizem (spec 170). */}
      <h3 className="mt-12 text-heading font-semibold text-ink">Os dois têm</h3>
      <ul className="mt-4 grid gap-x-10 gap-y-2 md:grid-cols-2">
        {OS_DOIS_TEM.map((linha) => (
          <li key={linha} className="flex gap-2 text-body text-ink-muted">
            <Check
              aria-hidden
              strokeWidth={1.75}
              className="mt-1 size-4 shrink-0 text-ink-subtle"
            />
            {linha}
          </li>
        ))}
      </ul>

      {/* No celular quem faz este papel é a barra do pé, que já está na tela
          aqui: dois primários juntos é erro. */}
      <div className="mt-10 hidden flex-col items-start gap-3 lg:flex">
        <BotaoDoTeste />
        <Risco />
      </div>
    </section>
  );
}

/** No beta, a porta compacta: o formulário mora na `#lista` (spec 184). */
function BotaoDoTeste() {
  return (
    <PortaDoBeta
      compacta
      botao={classesBotao({
        variante: "primaria",
        tamanho: "lg",
        className: "h-14 px-6",
      })}
      className="flex-col items-start"
    >
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
    </PortaDoBeta>
  );
}

/** O risco tirado ao lado do botão (spec 170): o arrependimento da seção 5 dos termos. */
function Risco() {
  return (
    <div className="text-label text-ink-muted">
      <p>Sem cartão no teste. Depois, cancela quando quiser.</p>
      <p className="mt-1">
        Assinou e desistiu em até 7 dias?{" "}
        <Link
          href="/termos#secao-5"
          className="font-medium text-brand-ink underline underline-offset-4"
        >
          Devolvemos tudo
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * O fim do desktop (spec 170): quem leu até as dúvidas tem um botão à vista, e
 * é o único primário nessa altura. No celular a barra do pé já é o convite.
 */
function ConviteDoFim() {
  return (
    <section
      aria-labelledby="fim-titulo"
      className="mx-auto hidden max-w-6xl px-10 pb-24 lg:block"
    >
      <div className="flex flex-col items-start gap-3 border-t border-line pt-24">
        <h2
          id="fim-titulo"
          className="mb-5 max-w-[24ch] text-balance font-display text-[2.375rem] leading-[1.15] font-bold tracking-[-0.02em] text-ink"
        >
          O preço do seu próximo doce, com a conta feita.
        </h2>
        <BotaoDoTeste />
        <Risco />
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
      {...FAQ.pagina}
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
            {...FAQ.pergunta}
          >
            <h3
              itemProp="name"
              className="text-subheading font-semibold text-ink"
            >
              {d.pergunta}
            </h3>
            <div {...FAQ.resposta}>
              <p
                itemProp="text"
                className="max-w-[60ch] text-body text-ink-muted"
              >
                {d.resposta}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {/* A dúvida que a lista não respondeu tem saída (`#d386`). */}
      <p className="mt-6 flex flex-wrap items-center gap-x-2 text-body text-ink-muted">
        Ficou alguma dúvida?
        <LinkDaConversa className="text-brand-ink" />
      </p>
    </section>
  );
}

/** Só no celular, só CSS (`sticky`); ver o comentário do bloco que a contém. */
function BarraDoCelular() {
  return (
    // O foco que desce pela página para acima da barra, e não atrás dela.
    <div className="rodape-seguro sticky bottom-0 border-t border-line bg-surface px-4 pt-3 lg:hidden [html:has(&)]:scroll-pb-28">
      {/* No beta, a porta compacta no lugar das duas linhas (spec 184). */}
      <PortaDoBeta
        compacta
        botao={classesBotao({
          variante: "primaria",
          tamanho: "lg",
          larguraTotal: true,
        })}
        className="flex-col items-center gap-2"
      >
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
      </PortaDoBeta>
    </div>
  );
}
