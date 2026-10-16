"use client";

import {
  Archive,
  CalendarX,
  Check,
  Circle,
  CircleCheck,
  CreditCard,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  AJUDA_DA_ASSINATURA,
  MolduraDeEntrada,
} from "@/components/auth/MolduraDeEntrada";
import {
  useOQueRendeu,
  type ParteDoQueRendeu,
} from "@/components/assinatura/useOQueRendeu";
import { MeusDados } from "@/components/conta/MeusDados";
import { OfertaDaPesquisa } from "@/components/pesquisa/OfertaDaPesquisa";
import { Simbolo } from "@/components/marca/Marca";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Pilulas } from "@/components/ui/Pilulas";
import {
  deveCobrarNoFimDoTeste,
  economiaAnual,
  fraseDaPrimeiraCobranca,
  fraseDaSobraQuePaga,
  fraseDeAssinar,
  MENSAGEM_FALHA_ASSINATURA,
  mensalDoAnual,
  NOME_DO_PACOTE,
  motivoDoCompleto,
  O_QUE_O_PACOTE_TEM,
  paraSituar,
  perdaNoEssencial,
  situacaoDaConta,
  sobraQuePagaOPlano,
  type FalhaAssinatura,
  type Periodo,
} from "@/lib/domain/assinatura";
import { formatarMoeda } from "@/lib/domain/money";
import { colMembros } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Membro, Pacote } from "@/lib/types";
import { AVISO_SAIR_PENDENTE, useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

type Precos = Record<Pacote, Record<Periodo, number>>;

/** O essencial primeiro, e escolhido: o produto que se vende é a frase do preço (spec 032, 3.5). */
const PACOTES: Pacote[] = ["ESSENCIAL", "COMPLETO"];

/** Embaixo do botão, o medo de assinar respondido em uma linha cada (spec 160). */
const GARANTIAS = [
  {
    Icone: CalendarX,
    // O portal cancela no fim do período (`subscription_cancel.mode=at_period_end`, DEPLOY.md).
    texto:
      "Cancela quando quiser, aqui no app. O que já foi pago vale até o fim.",
  },
  {
    Icone: Archive,
    // Sem assinatura a conta só deixa de escrever (`#d144`).
    texto: "Seus preços, pedidos e caixa ficam seus, assinando ou não.",
  },
  { Icone: CreditCard, texto: "Pagamento no cartão, pelo Stripe." },
];

/**
 * A tela de três estados (spec 028, 3.5): teste, teste vencido e assinatura
 * vencida. `livre` não tem o que ver — sai sozinha para `/`; a assinante vai
 * ao painel da Configuração (spec 159).
 *
 * Fora do shell, em `(auth)`, com `MolduraDeEntrada`: a terceira tela que o
 * comentário dela esperava.
 *
 * A ajudante não paga (`DECISOES.md#d156`): para ela a tela só existe vencida,
 * sem preço, sem portal e sem `MeusDados`. Antes de vencer, volta para `/`.
 */
export default function PaginaAssinatura() {
  const { usuario, contaId, papel, conta, carregando, sair } = useAuth();
  const ajudante = papel === "AJUDANTE";
  const router = useRouter();

  const [precos, setPrecos] = useState<Precos | null>(null);
  const [falhaPrecos, setFalhaPrecos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // O anual continua sendo a arma contra o churn (roadmap §1).
  const [periodo, setPeriodo] = useState<Periodo>("anual");
  // `null` até ela tocar: até lá vale o plano sugerido pelo uso (spec 161).
  const [escolhido, setEscolhido] = useState<Pacote | null>(null);
  const idPacote = useId();
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [sairPendente, setSairPendente] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  useEffect(() => {
    if (!carregando && usuario && !contaId) router.replace("/");
  }, [carregando, usuario, contaId, router]);

  useEffect(() => {
    if (!usuario || ajudante) return;
    let cancelado = false;

    async function carregar() {
      try {
        const token = await usuario!.getIdToken();
        const resposta = await fetch("/api/assinatura/precos", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) throw new Error();
        const dados = (await resposta.json()) as Precos;
        if (!cancelado) setPrecos(dados);
      } catch {
        if (!cancelado) setFalhaPrecos(true);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [usuario, ajudante]);

  // `new Date().getTime()`, e não `Date.now()`: o compilador do React recusa
  // uma função impura direto no corpo do componente.
  const agora = new Date().getTime();
  const situacao = conta ? situacaoDaConta(paraSituar(conta), agora) : null;

  // O que rendeu e quem ajuda, só para a dona: a ajudante não vê preço.
  // Leituras que a Hoje e a Configuração já fazem (`#d218`, `#d155`).
  const daDona = contaId && !ajudante ? contaId : null;
  const { partes, produtos } = useOQueRendeu(daDona);
  const consultaMembros = useMemo(
    () => (daDona ? colMembros(daDona) : null),
    [daDona],
  );
  const ajudantes = useColecao<Membro>(consultaMembros)
    .dados.filter((membro) => membro.papel === "AJUDANTE" && !membro.removidaEm)
    .map((membro) => membro.email);

  // Quem tem ajudante usa o que só o Completo tem: ele vem escolhido (spec 161).
  // O pedido do cardápio no teste ficou fora: só sairia com consulta nova (`#d375`).
  const pacote: Pacote =
    escolhido ?? (ajudantes.length > 0 ? "COMPLETO" : "ESSENCIAL");

  // Para a ajudante, prazo de cobrança não é assunto até vencer (spec 030, 3.B.4).
  const semNadaAVer =
    situacao?.tipo === "livre" || (ajudante && situacao?.tipo !== "vencida");

  // A assinante lê a assinatura num lugar só, o painel da Configuração (`#d372`).
  const paraOPainel = !semNadaAVer && situacao?.tipo === "assinante";

  useEffect(() => {
    if (semNadaAVer) router.replace("/");
    else if (paraOPainel) router.replace("/configuracao#assinatura");
  }, [semNadaAVer, paraOPainel, router]);

  async function aoSair() {
    setSairPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setSairPendente(true);
      setSaindo(false);
    }
  }

  async function abrirUrl(rota: string, corpo: Record<string, unknown>) {
    if (!usuario) return;
    setErro(null);
    setEnviando(true);
    try {
      const token = await usuario.getIdToken();
      const resposta = await fetch(rota, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        setErro(MENSAGEM_FALHA_ASSINATURA[await codigoDaFalha(resposta)]);
        setEnviando(false);
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.assign(url);
    } catch {
      // `TypeError` do `fetch`: sem rede, ou a rota bloqueada.
      setErro(MENSAGEM_FALHA_ASSINATURA["sem-rede"]);
      setEnviando(false);
    }
  }

  const assinar = () =>
    abrirUrl("/api/assinatura/checkout", { contaId, pacote, periodo });
  const gerenciar = () => abrirUrl("/api/assinatura/portal", { contaId });

  if (
    carregando ||
    !usuario ||
    !contaId ||
    !situacao ||
    semNadaAVer ||
    paraOPainel
  ) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center bg-canvas"
      >
        <Simbolo className="size-12 animate-pulse" />
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  const avisoDeErro = erro && (
    <p role="alert" className="mb-3 text-label text-negative">
      {erro}
    </p>
  );

  const economiaDoEssencial = precos
    ? economiaAnual(precos.ESSENCIAL.mensal, precos.ESSENCIAL.anual)
    : 0;

  // Com `trial_end` no checkout, a mesma conta da rota (`#d374`).
  const primeiraCobranca =
    situacao.tipo === "teste" &&
    deveCobrarNoFimDoTeste(situacao.acabaEmMs, agora)
      ? fraseDaPrimeiraCobranca(situacao.acabaEmMs)
      : null;

  // O `#d219` com o plano escolhido, pelo mês do período escolhido.
  const mensalEscolhido = precos
    ? periodo === "anual"
      ? mensalDoAnual(precos[pacote].anual)
      : precos[pacote].mensal
    : null;
  const pagaOPlano =
    mensalEscolhido != null
      ? sobraQuePagaOPlano(produtos, mensalEscolhido)
      : null;
  const sobra =
    pagaOPlano && mensalEscolhido != null
      ? fraseDaSobraQuePaga(pacote, mensalEscolhido, pagaOPlano)
      : null;

  // Escolher é de graça, pagar é um botão só, que repete a escolha (spec 160,
  // revendo o cartão-botão da 032, 3.5). O período vem primeiro por ser filtro;
  // os planos, empilhados em qualquer largura, comparam melhor que lado a lado.
  const escolha = (
    <>
      {/* A fundadora com a pesquisa aberta (spec 185): acima dos planos, e
          secundário; o âmbar da tela continua o de assinar (`#d373`). */}
      <OfertaDaPesquisa
        rotulo="Responder e ganhar 30%"
        className="mt-6 rounded-lg border border-line bg-surface px-4 py-4"
      />
      <Pilulas
        rotulo="Pagar"
        className="mt-8"
        valor={periodo}
        aoMudar={setPeriodo}
        opcoes={[
          {
            valor: "anual",
            rotulo: "Por ano",
            detalhe:
              economiaDoEssencial > 0
                ? `${formatarMoeda(economiaDoEssencial)} a menos`
                : undefined,
          },
          { valor: "mensal", rotulo: "Por mês" },
        ]}
      />

      {/* Rádio nativo: setas trocam a opção e o leitor de tela diz a
          escolhida, sem reimplementar o grupo. */}
      <fieldset disabled={enviando} className="mt-4 space-y-3">
        <legend className="sr-only">Plano</legend>
        {PACOTES.map((cada) => (
          <OpcaoDePlano
            key={cada}
            nome={idPacote}
            pacote={cada}
            precos={precos?.[cada]}
            periodo={periodo}
            escolhido={pacote === cada}
            aoEscolher={() => setEscolhido(cada)}
            motivo={cada === "COMPLETO" ? motivoDoCompleto(ajudantes) : null}
            aviso={
              cada === "ESSENCIAL" && pacote === cada
                ? perdaNoEssencial(ajudantes)
                : null
            }
          />
        ))}
      </fieldset>

      {/* No celular, preso ao pé com a lista rolando por cima; no desktop, logo
          abaixo das opções. O foco que desce para acima do pé, não atrás. */}
      <div className="rodape-seguro sticky bottom-0 -mx-6 mt-6 border-t border-line bg-canvas px-6 pt-3 lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pt-0 lg:pb-0 [html:has(&)]:scroll-pb-28">
        {avisoDeErro}
        <Botao
          variante="primaria"
          tamanho="lg"
          larguraTotal
          onClick={() => void assinar()}
          carregando={enviando}
        >
          {fraseDeAssinar(pacote, periodo, precos?.[pacote][periodo])}
        </Botao>
        {primeiraCobranca && (
          <p className="mt-2 text-center text-label text-ink-muted">
            {primeiraCobranca}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {GARANTIAS.map(({ Icone, texto }) => (
          <li key={texto} className="flex gap-2 text-label text-ink-muted">
            <Icone
              aria-hidden
              strokeWidth={1.75}
              className="mt-0.5 size-4 shrink-0 text-ink-subtle"
            />
            {texto}
          </li>
        ))}
      </ul>
    </>
  );

  let titulo: string;
  let descricao: string;
  let acoes: ReactNode;
  // No teste e no teste vencido, o que a conta já construiu (spec 161).
  let comOQueRendeu = false;

  if (ajudante) {
    // A conta é da dona; a conversa é entre as duas (`#d156`).
    titulo = "O acesso a este negócio está suspenso";
    descricao =
      "Fale com quem é dona do Rende aqui: a assinatura precisa ser renovada para vocês duas voltarem a usar.";
    acoes = (
      <div className="mt-8">
        <Botao
          tamanho="lg"
          larguraTotal
          onClick={() => void aoSair()}
          disabled={saindo}
          carregando={saindo}
        >
          Sair
        </Botao>
      </div>
    );
  } else if (situacao.tipo === "teste") {
    titulo = `Seu teste grátis acaba em ${situacao.diasRestantes} dias`;
    if (situacao.diasRestantes === 0) titulo = "Seu teste grátis acaba hoje";
    if (situacao.diasRestantes === 1) titulo = "Seu teste grátis acaba amanhã";
    descricao =
      "Depois disso, tudo o que você cadastrou continua aqui, mas só assinando dá para mexer.";
    comOQueRendeu = true;
    acoes = (
      <>
        {escolha}
        <Link
          href="/"
          className={cn(classesBotao({ variante: "terciaria" }), "mt-4 w-full")}
        >
          Voltar para Hoje
        </Link>
      </>
    );
  } else if (situacao.tipo === "vencida" && situacao.foi === "teste") {
    titulo = "Seu teste grátis acabou";
    descricao =
      "Tudo o que você cadastrou continua guardado. Assine para voltar a mexer.";
    comOQueRendeu = true;
    acoes = (
      <>
        {escolha}
        <div className="mt-6 space-y-3">
          {/* A vencida que não vai assinar tem os dois direitos da LGPD sem
              assinar (spec 029): levar o dado e encerrar. */}
          <MeusDados />
          <Botao
            tamanho="lg"
            larguraTotal
            onClick={() => void aoSair()}
            disabled={saindo}
            carregando={saindo}
          >
            Sair
          </Botao>
        </div>
      </>
    );
  } else {
    // A assinatura vencida: assinante e `livre` saíram acima, sem tela.
    titulo = "Não conseguimos renovar sua assinatura";
    descricao = "Atualize a forma de pagamento e o acesso volta sozinho.";
    acoes = (
      <div className="mt-8 space-y-3">
        {avisoDeErro}
        <Botao
          variante="primaria"
          tamanho="lg"
          larguraTotal
          onClick={() => void gerenciar()}
          carregando={enviando}
        >
          Atualizar pagamento
        </Botao>
        <MeusDados />
        <Botao
          tamanho="lg"
          larguraTotal
          onClick={() => void aoSair()}
          disabled={saindo}
          carregando={saindo}
        >
          Sair
        </Botao>
      </div>
    );
  }

  return (
    <MolduraDeEntrada
      titulo={titulo}
      descricao={descricao}
      ajuda={AJUDA_DA_ASSINATURA}
      painel={
        comOQueRendeu && <OQueRendeu partes={partes} sobra={sobra} painel />
      }
    >
      {comOQueRendeu && <OQueRendeu partes={partes} sobra={sobra} />}

      {falhaPrecos && !precos && !ajudante && (
        <p className="mt-4 text-label text-ink-muted">
          Não deu para carregar os preços agora, mas dá para continuar.
        </p>
      )}

      {acoes}

      {sairPendente && (
        <p aria-live="polite" className="mt-4 text-label text-ink-muted">
          {AVISO_SAIR_PENDENTE}
        </p>
      )}
    </MolduraDeEntrada>
  );
}

/**
 * O que a conta já construiu, uma linha por coisa, e o plano na sobra do que
 * ela mais vende (spec 161). Nada contado, nada aparece. No celular abaixo da
 * descrição; no desktop no painel de marca (`#d194`), que some em janela
 * baixa: ali a coluna o mostra de volta.
 */
function OQueRendeu({
  partes,
  sobra,
  painel = false,
}: {
  partes: ParteDoQueRendeu[];
  sobra: string | null;
  painel?: boolean;
}) {
  if (partes.length === 0) return null;
  return (
    <div
      className={
        painel
          ? "max-w-md text-on-brand"
          : "mt-6 text-ink lg:[@media(min-height:720px)]:hidden"
      }
    >
      <ul className={cn("space-y-1", painel ? "text-subheading" : "text-body")}>
        {partes.map((parte) => (
          <li key={parte.resto}>
            <span className="num font-semibold">{parte.numero}</span>{" "}
            {parte.resto}
          </li>
        ))}
      </ul>
      {sobra && (
        <p
          className={cn(
            "num mt-3 text-body",
            painel ? "text-on-brand-muted" : "text-ink-muted",
          )}
        >
          {sobra}
        </p>
      )}
    </div>
  );
}

/** Uma linha do grupo: escolher troca o botão e nunca sai do app (spec 160). */
function OpcaoDePlano({
  nome,
  pacote,
  precos,
  periodo,
  escolhido,
  aoEscolher,
  motivo,
  aviso,
}: {
  nome: string;
  pacote: Pacote;
  precos: Record<Periodo, number> | undefined;
  periodo: Periodo;
  escolhido: boolean;
  aoEscolher: () => void;
  /** Por que este plano vem escolhido (spec 161). */
  motivo: string | null;
  /** O que se perde com este plano, em atenção; nada bloqueia (spec 161). */
  aviso: string | null;
}) {
  const anual = periodo === "anual";
  const economia = precos ? economiaAnual(precos.mensal, precos.anual) : 0;
  const Marca = escolhido ? CircleCheck : Circle;
  const id = useId();

  // Um `div`, e não um `label`: a lista não cabe dentro de um. O rádio
  // nativo cobre a opção inteira, invisível, e o toque em qualquer ponto é dele.
  return (
    <div
      className={cn(
        "relative rounded-lg border px-4 py-4 transition-colors duration-150 ease-quart",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus)",
        "has-disabled:opacity-60",
        escolhido
          ? "border-brand-ink bg-brand-100"
          : "border-line-strong bg-surface hover:bg-sunken",
      )}
    >
      <input
        type="radio"
        name={nome}
        value={pacote}
        checked={escolhido}
        onChange={aoEscolher}
        aria-labelledby={`${id}-nome`}
        aria-describedby={[
          `${id}-preco`,
          motivo && `${id}-motivo`,
          aviso && `${id}-aviso`,
        ]
          .filter(Boolean)
          .join(" ")}
        className="absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-lg opacity-0 disabled:cursor-not-allowed"
      />
      <span className="flex items-center justify-between gap-3">
        <span
          id={`${id}-nome`}
          className="text-subheading font-semibold text-ink"
        >
          {NOME_DO_PACOTE[pacote]}
        </span>
        <Marca
          aria-hidden
          strokeWidth={1.75}
          className={cn(
            "size-5 shrink-0",
            escolhido ? "text-brand-ink" : "text-ink-subtle",
          )}
        />
      </span>

      {/* O anual pelo mês: o número que assusta é o do ano (spec 160). */}
      <div id={`${id}-preco`}>
        <span className="mt-1 flex items-baseline gap-1.5">
          {precos ? (
            <Dinheiro
              tamanho="lg"
              centavos={anual ? mensalDoAnual(precos.anual) : precos.mensal}
              className="text-ink"
            />
          ) : (
            <span className="num text-heading font-semibold text-ink">—</span>
          )}
          <span className="text-label text-ink-muted">por mês</span>
        </span>
        {precos && anual && (
          <span className="mt-0.5 block text-label text-ink-muted">
            <span className="num">{formatarMoeda(precos.anual)}</span> cobrados
            uma vez por ano
            {economia > 0 && (
              <>
                {" · "}
                <span className="num">{formatarMoeda(economia)}</span> a menos
                que mês a mês
              </>
            )}
          </span>
        )}
      </div>

      {motivo && (
        <p
          id={`${id}-motivo`}
          className="mt-2 text-label text-ink wrap-anywhere"
        >
          {motivo}
        </p>
      )}
      {aviso && (
        <p
          id={`${id}-aviso`}
          className="mt-2 flex gap-2 text-label text-attention wrap-anywhere"
        >
          <TriangleAlert
            aria-hidden
            strokeWidth={1.75}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="min-w-0">{aviso}</span>
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {O_QUE_O_PACOTE_TEM[pacote].map((linha) => (
          <li key={linha} className="flex gap-2 text-label text-ink">
            <Check
              aria-hidden
              strokeWidth={1.75}
              className="mt-0.5 size-4 shrink-0 text-ink-subtle"
            />
            {linha}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** O padrão de `TelaNota` e `PaginaCadastro`: o corpo diz o código; sem corpo, o status decide. */
async function codigoDaFalha(resposta: Response): Promise<FalhaAssinatura> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro && corpo.erro in MENSAGEM_FALHA_ASSINATURA) {
      return corpo.erro as FalhaAssinatura;
    }
  } catch {
    // Resposta sem corpo JSON. O status conta o resto.
  }

  if (resposta.status === 401) return "sem-acesso";
  if (resposta.status === 400) return "fora-de-forma";
  if (resposta.status === 409) return "sem-assinatura";
  return "sem-resposta";
}
