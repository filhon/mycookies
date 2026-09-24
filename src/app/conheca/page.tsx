import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logotipo } from "@/components/marca/Marca";
import { ContaAberta } from "@/components/site/ContaAberta";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  economiaAnual,
  NOME_DO_PACOTE,
  O_QUE_O_PACOTE_TEM,
  RECURSOS_DO_PACOTE,
} from "@/lib/domain/assinatura";
import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { EXEMPLO } from "@/lib/domain/exemplo";
import { formatarMoeda } from "@/lib/domain/money";
import { calcularPrecoSugerido } from "@/lib/domain/precificacao";
import { lerPrecos, stripeDisponivel } from "@/lib/server/stripe";
import type { Pacote } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { RESPONSAVEL } from "../(auth)/responsavel";
import { DESCRICAO } from "../descricao";

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
  // Sobrepõe o `noindex` do layout raiz: esta é a única rota que quer busca.
  robots: { index: true, follow: true },
};

/**
 * As palavras dela, com autorização por escrito, ou a seção não vai ao ar
 * (`DECISOES.md#d175`). `cidade` e `foto` só entram se ela autorizar; a foto
 * mora em `public/site/`.
 */
const DEPOIMENTO: {
  texto: string;
  nome: string;
  cidade?: string;
  foto?: string;
} = {
  texto:
    "Eu sabia fazer um cookie muito gostoso, mas não sabia como precificar. O Rende me ajudou nisso e em muito mais. Agora tenho tudo organizado e a certeza de que estou cobrando o valor certo.",
  nome: "Maynara",
};

const DUVIDAS = [
  {
    pergunta: "Preciso saber de contabilidade?",
    resposta:
      "Não. O Rende faz a conta e explica em uma frase, do lado do número: quanto custa, quanto cobrar e quanto sobra pra você. O preço quem decide é você.",
  },
  {
    pergunta: "E se não tiver internet na cozinha?",
    resposta:
      "Funciona do mesmo jeito. O que você anota fica salvo no aparelho e sobe sozinho quando o sinal voltar.",
  },
  {
    pergunta: "Serve pra bolo, salgado, pão?",
    resposta:
      "Serve pra tudo que tem receita e rende um tanto de unidades. O doce muda, a conta é a mesma: material, embalagem, seu trabalho, gás e as despesas fixas.",
  },
  {
    pergunta: "Preciso cadastrar tudo pra começar?",
    resposta:
      "Não. Um toque traz os materiais que toda cozinha tem, com preço médio, e dois cookies já com preço. Você corrige o que for diferente do seu.",
  },
  {
    pergunta: "Minha cliente vai ver a marca de vocês?",
    resposta:
      "Não no resumo de WhatsApp nem na etiqueta. No orçamento em A4 e no cardápio fica uma linha discreta, “feito com Rende”, que quem assina pode desligar.",
  },
];

const ANCORAS = [
  { href: "#conta", rotulo: "A conta" },
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

const ALVO_LINK =
  "toque inline-flex items-center rounded-md px-3 text-label font-medium";

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
        <Topo />

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
            <Link
              href="/cadastro"
              className={classesBotao({
                variante: "primaria",
                tamanho: "lg",
                className: "mt-8 w-full sm:w-auto lg:h-14 lg:px-6",
              })}
            >
              Começar o teste de {DIAS_DE_TESTE} dias
            </Link>
            <p className="mt-3 text-label text-ink-muted">
              Sem cartão · funciona offline, na bancada
            </p>
          </section>

          <ContaAberta />
        </div>

        {temDepoimento && <QuemJaUsa />}

        {/* A barra do celular é o último filho deste bloco, `sticky` no pé:
            só aparece depois que ele entra na tela e descansa acima do rodapé.
            O bloco começa depois do depoimento, e não logo depois da conta:
            no celular a conta termina perto demais do botão da frase, e os
            dois âmbar apareceriam juntos (ver `ESTADO.md`, spec 036). */}
        <div>
          <Preco precos={precos} />
          <Duvidas />
          <BarraDoCelular />
        </div>
      </main>

      <Rodape />
    </>
  );
}

function Topo() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 lg:px-10 lg:pt-7">
      <Logotipo />
      <nav aria-label="Página" className="flex items-center gap-1">
        <ul className="hidden items-center gap-1 lg:flex">
          {ANCORAS.map((a) => (
            <li key={a.href}>
              <a
                href={a.href}
                className={cn(
                  ALVO_LINK,
                  "text-ink-muted transition-colors duration-150 ease-quart hover:text-ink",
                )}
              >
                {a.rotulo}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className={classesBotao({
            variante: "terciaria",
            tamanho: "sm",
            className: "lg:ml-3",
          })}
        >
          Entrar
        </Link>
        {/* Secundário: o primário da tela é o da frase (seção 4, item 8). */}
        <Link
          href="/cadastro"
          className={classesBotao({
            tamanho: "sm",
            className: "hidden lg:inline-flex",
          })}
        >
          Testar {DIAS_DE_TESTE} dias
        </Link>
      </nav>
    </header>
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
        </div>
      </div>
    </section>
  );
}

function Preco({ precos }: { precos: Precos | null }) {
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

function Rodape() {
  const links = [
    { href: "#duvidas", rotulo: "Dúvidas" },
    { href: `mailto:${RESPONSAVEL.email}`, rotulo: "Contato" },
    { href: "/termos", rotulo: "Termos" },
    { href: "/privacidade", rotulo: "Privacidade" },
  ];

  return (
    <footer className="sobre-marca border-t border-line bg-brand-900 text-on-brand">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <Logotipo tom="negativa" />
          <p className="mt-2 text-label text-ink-muted">
            Precificação para quem faz à mão.
          </p>
        </div>
        <ul className="-mx-3 flex flex-wrap gap-x-2">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  ALVO_LINK,
                  "text-ink-muted transition-colors duration-150 ease-quart hover:text-ink",
                )}
              >
                {l.rotulo}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
