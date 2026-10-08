"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  FileText,
  Flame,
  LogOut,
  Mail,
  Receipt,
  Tag,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { IndiceDaPagina } from "@/components/layout/IndiceDaPagina";
import { FaleComAGente } from "@/components/conta/FaleComAGente";
import { LinhaDaAssinatura } from "@/components/conta/LinhaDaAssinatura";
import { MeusDados } from "@/components/conta/MeusDados";
import { QuemTeAjuda } from "@/components/conta/QuemTeAjuda";
import { ANCORA_DO_CONTATO, SeuCardapio } from "@/components/conta/SeuCardapio";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilosBotao";
import { CampoImagem } from "@/components/ui/CampoImagem";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Realce } from "@/components/ui/Realce";
import { RodapeFixo } from "@/components/ui/RodapeFixo";
import { useGuardaDeSaida } from "@/components/ui/useGuardaDeSaida";
import { BlocoConfiguracao } from "./BlocoConfiguracao";
import { BlocoTema } from "./BlocoTema";
import { CustoPorHora } from "./CustoPorHora";
import { FormularioFormaPagamento } from "./FormularioFormaPagamento";
import { ListaFormasPagamento } from "./ListaFormasPagamento";
import {
  OQueMudaNosProdutos,
  type ReciboDosProdutos,
} from "./OQueMudaNosProdutos";
import { DespesasFixas } from "./DespesasFixas";
import { FazerAConta } from "./FazerAConta";
import { parametrosDePreco } from "@/lib/domain/configuracaoSugerida";
import { TAMANHO_MAXIMO_NOME } from "@/lib/domain/cadastro";
import {
  custoDeMinutos,
  custoIndiretoPorHora,
  despesasParaEditar,
  energiaPorHoraDaConta,
  FORNADA_EXEMPLO_MINUTOS,
  gasPorHoraDoBotijao,
  horaPelaRetirada,
  ROTULO_ARREDONDAMENTO,
  totalDasDespesas,
} from "@/lib/domain/custosOperacionais";
import { formatarMoeda, parseParaNumero } from "@/lib/domain/money";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "@/lib/domain/precificacao";
import {
  fraseDoTeste,
  paraSituar,
  situacaoDaConta,
} from "@/lib/domain/assinatura";
import {
  ASSINATURA_LADO_PX,
  ASSINATURA_MAX_BYTES,
  negocioDaFolha,
} from "@/lib/domain/orcamento";
import { PeDaFolha } from "@/components/pedidos/FolhaOrcamento";
import {
  errosDeLinha,
  errosPorCampo,
  esquemaConfiguracao,
} from "@/lib/domain/schemas";
import { docConfiguracao } from "@/lib/firebase/colecoes";
import {
  CONFIGURACAO_SUGERIDA,
  salvarConfiguracao,
  type DadosConfiguracao,
} from "@/lib/firebase/mutations/configuracao";
import {
  definirAvisosPorEmail,
  renomearNegocio,
} from "@/lib/firebase/mutations/conta";
import { refazerFichasPelaConfiguracao } from "@/lib/firebase/mutations/fichas";
import type { RateioOperacional } from "@/lib/domain/custoFicha";
import { useDocumento } from "@/lib/hooks/useColecao";
import type {
  Centavos,
  ConfiguracaoGeral,
  DespesaFixa,
  FormaPagamento,
  MetodoPrecificacao,
  RegraArredondamento,
  TipoPagamento,
} from "@/lib/types";
import {
  AVISO_SAIR_PENDENTE,
  useAuth,
  useContaId,
  usePapel,
} from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** O doce de exemplo da faixa do preço padrão (`#d286`). */
const CUSTO_EXEMPLO = 400;

/** "No crédito, sobram…": a forma que mais cobra, pelo tipo, e não pelo nome. */
const NA_FORMA: Record<TipoPagamento, string> = {
  PIX: "No Pix",
  DINHEIRO: "No dinheiro",
  DEBITO: "No débito",
  CREDITO: "No crédito",
  CREDITO_PARCELADO: "No crédito parcelado",
  TRANSFERENCIA: "Na transferência",
};

function textoHoras(horas: number): string {
  return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

/**
 * A faixa do preço padrão como um exemplo inteiro (`#d286`): o doce de R$ 4,00
 * pela mesma conta do editor (`calcularPrecoSugerido` e `verificarPreco` sobre
 * `parametrosDePreco`), com a sobra na forma de taxa mais alta.
 */
function fraseDoPrecoPadrao(
  precificacao: DadosConfiguracao["precificacao"],
  formas: FormaPagamento[],
): { tom: "neutro" | "atencao"; texto: ReactNode } {
  const parametros = parametrosDePreco(precificacao, formas);
  const resultado = calcularPrecoSugerido(CUSTO_EXEMPLO, parametros);

  if (!resultado.ok) {
    return {
      tom: "atencao",
      texto:
        resultado.motivo === "MARGEM_IMPOSSIVEL"
          ? "O que você quer que sobre mais as taxas passam de 100% do preço. Não existe preço que caiba nisso: diminua um dos dois."
          : "Multiplicar o custo por zero não dá preço nenhum. Escolha por quanto multiplicar.",
    };
  }

  const { precoSugerido, precoArredondado } = resultado;
  const { custoTaxas, lucroUnitario } = verificarPreco(
    precoArredondado,
    CUSTO_EXEMPLO,
    somaTaxas(parametros),
  );
  const maisCara = formas.find(
    (forma) =>
      forma.ativo &&
      forma.taxaPercentual > 0 &&
      forma.taxaPercentual === parametros.taxaCartaoConsiderada,
  );
  const inicio = (texto: string) =>
    maisCara
      ? `${NA_FORMA[maisCara.tipo]}, ${texto}`
      : texto.charAt(0).toUpperCase() + texto.slice(1);
  // Com markup, o que as taxas levam é o que o multiplicador não enxerga.
  const quemLeva = !maisCara
    ? "as outras taxas levam"
    : parametros.outrasTaxas > 0
      ? "a maquininha e as outras taxas levam"
      : "a maquininha leva";

  return {
    tom: lucroUnitario < 0 ? "atencao" : "neutro",
    texto: (
      <>
        Um doce que custa <Realce>{formatarMoeda(CUSTO_EXEMPLO)}</Realce> vai
        para a vitrine por{" "}
        {precoSugerido !== precoArredondado && (
          <>
            <Realce>{formatarMoeda(precoSugerido)}</Realce> arredondado
            para{" "}
          </>
        )}
        <Realce>{formatarMoeda(precoArredondado)}</Realce>.{" "}
        {lucroUnitario < 0 ? (
          <>
            {inicio("você perde")}{" "}
            <Realce>{formatarMoeda(-lucroUnitario)}</Realce> em cada um.
          </>
        ) : parametros.metodo === "MARKUP" && custoTaxas > 0 ? (
          <>
            {inicio(quemLeva)} <Realce>{formatarMoeda(custoTaxas)}</Realce> e
            sobram <Realce>{formatarMoeda(lucroUnitario)}</Realce> pra você.
          </>
        ) : (
          <>
            {inicio("sobram")} <Realce>{formatarMoeda(lucroUnitario)}</Realce>{" "}
            pra você.
          </>
        )}
      </>
    ),
  };
}

const DESCRICAO =
  "De onde sai o preço de todo produto, e o que é da sua conta.";

/**
 * As três partes da tela, na ordem em que uma coisa depende da outra
 * (`#d283`). As duas primeiras gravam com o "Salvar"; a terceira vale no toque
 * (`#d284`).
 */
const PARTES = [
  { id: "o-seu-preco", rotulo: "O seu preço" },
  { id: "a-sua-marca", rotulo: "A sua marca" },
  { id: "a-sua-conta", rotulo: "A sua conta" },
] as const;

type IdParte = (typeof PARTES)[number]["id"];

/** A lista com divisórias: cada linha traz o filete de cima, menos a primeira. */
const LISTA =
  "overflow-hidden rounded-lg border border-line bg-surface [&>:first-child]:border-t-0";

/** Uma linha da lista de "A sua conta", como as de `components/conta/`. */
const LINHA =
  "flex w-full items-center gap-3 border-t border-line px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5";

const REGRAS: RegraArredondamento[] = [
  "CENTAVO_90",
  "MEIO_REAL",
  "REAL_INTEIRO",
  "NENHUM",
];

/**
 * Números que a usuária digita ficam como texto enquanto ela digita: "1," é um
 * estado legítimo do teclado e não pode virar zero no meio da palavra.
 */
interface EstadoConfiguracao {
  nomeNegocio: string;
  valorHoraTrabalho: number;
  horasProdutivasMes: string;
  custoEnergiaHora: number;
  custoGasHora: number;
  /** A soma é o total; o total não se digita (`#d287`). */
  despesas: DespesaFixa[];
  metodoPadrao: MetodoPrecificacao;
  markupPadrao: string;
  margemPadrao: string;
  outrasTaxasPadrao: string;
  arredondamento: RegraArredondamento;
  formasPagamento: FormaPagamento[];
  categoriasProduto: string[];
  // A folha do orçamento (spec 017). Texto vazio e `null` são "sem".
  telefone: string;
  instagram: string;
  assinaturaDataUrl: string | null;
  frase: string;
  /** Tira o "feito com Rende" da folha (spec 028, `#d147`). */
  ocultarFeitoCom: boolean;
}

function texto(numero: number): string {
  return String(numero).replace(".", ",");
}

function estadoInicial(
  dado: ConfiguracaoGeral | null,
  nomeConta: string | undefined,
): EstadoConfiguracao {
  const operacional = dado?.operacional ?? CONFIGURACAO_SUGERIDA.operacional;
  const precificacao = dado?.precificacao ?? CONFIGURACAO_SUGERIDA.precificacao;

  return {
    // A conta é onde o nome mora (D14); o espelho só cobre a conta que ainda
    // não chegou do cache. Numa conta nova sem os dois, o campo nasce vazio e
    // o "Salvar" pede o nome (`#d288`).
    nomeNegocio: nomeConta ?? dado?.nomeNegocio ?? "",
    valorHoraTrabalho: operacional.valorHoraTrabalho,
    horasProdutivasMes: texto(operacional.horasProdutivasMes),
    custoEnergiaHora: operacional.custoEnergiaHora,
    custoGasHora: operacional.custoGasHora,
    despesas: despesasParaEditar(operacional),
    metodoPadrao: precificacao.metodoPadrao,
    markupPadrao: texto(precificacao.markupPadrao),
    margemPadrao: texto(precificacao.margemPadrao),
    outrasTaxasPadrao: texto(precificacao.outrasTaxasPadrao),
    arredondamento: precificacao.arredondamento,
    formasPagamento:
      dado?.formasPagamento ?? CONFIGURACAO_SUGERIDA.formasPagamento,
    categoriasProduto: dado?.categoriasProduto ?? [],
    telefone: dado?.contato?.telefone ?? "",
    instagram: dado?.contato?.instagram ?? "",
    assinaturaDataUrl: dado?.assinaturaDataUrl ?? null,
    frase: dado?.frase ?? "",
    ocultarFeitoCom: dado?.ocultarFeitoCom ?? false,
  };
}

/** A lista como vai gravada, e o total que ela soma. */
function despesasDoEstado(despesas: DespesaFixa[]) {
  const despesasFixasItens = despesas.map((despesa) => ({
    nome: despesa.nome.trim(),
    valor: despesa.valor,
  }));
  return {
    despesasFixasMensais: totalDasDespesas({
      despesasFixasMensais: 0,
      despesasFixasItens,
    }),
    despesasFixasItens,
  };
}

function paraDados(estado: EstadoConfiguracao): DadosConfiguracao {
  return {
    ...(estado.nomeNegocio ? { nomeNegocio: estado.nomeNegocio } : {}),
    contato: { telefone: estado.telefone, instagram: estado.instagram },
    frase: estado.frase,
    ...(estado.assinaturaDataUrl && {
      assinaturaDataUrl: estado.assinaturaDataUrl,
    }),
    ...(estado.ocultarFeitoCom && { ocultarFeitoCom: true as const }),
    operacional: {
      valorHoraTrabalho: estado.valorHoraTrabalho,
      horasProdutivasMes: parseParaNumero(estado.horasProdutivasMes),
      custoEnergiaHora: estado.custoEnergiaHora,
      custoGasHora: estado.custoGasHora,
      ...despesasDoEstado(estado.despesas),
    },
    precificacao: {
      metodoPadrao: estado.metodoPadrao,
      markupPadrao: parseParaNumero(estado.markupPadrao),
      margemPadrao: parseParaNumero(estado.margemPadrao),
      outrasTaxasPadrao: parseParaNumero(estado.outrasTaxasPadrao),
      arredondamento: estado.arredondamento,
    },
    formasPagamento: estado.formasPagamento,
    categoriasProduto: estado.categoriasProduto,
  };
}

/** Assinatura do que seria gravado. É o que diz se há alteração pendente. */
function assinatura(estado: EstadoConfiguracao): string {
  return JSON.stringify(paraDados(estado));
}

const METODOS: {
  valor: MetodoPrecificacao;
  titulo: string;
  explicacao: string;
}[] = [
  {
    valor: "MARGEM",
    titulo: "Decidir quanto sobra",
    explicacao:
      "Você diz quanto quer que sobre do preço, e o sistema acha o preço que devolve isso depois das taxas.",
  },
  {
    valor: "MARKUP",
    titulo: "Multiplicar o custo",
    explicacao:
      "Você multiplica o custo por um número. Rápido de fazer de cabeça, mas não enxerga a taxa da maquininha.",
  },
];

/**
 * A tela inteira é da dona: a ajudante lê a configuração (a ficha precisa dela
 * para calcular) e não a grava (`DECISOES.md#d154`). Mas é aqui que mora
 * "Sair", a única saída do app no celular (`#d118`), e por isso a rota não
 * fecha para ela: abre reduzida (spec 030, 3.B.3).
 */
export function TelaConfiguracao() {
  // Fora de `(coluna)` (`#d283`): a tela põe a própria largura, e só a da
  // dona alarga em `2xl` para a coluna do custo por hora.
  return usePapel() === "AJUDANTE" ? (
    <div className="mx-auto w-full max-w-5xl">
      <ConfiguracaoDaAjudante />
    </div>
  ) : (
    <div className="mx-auto w-full max-w-5xl 2xl:max-w-324">
      <ConfiguracaoDaDona />
    </div>
  );
}

/**
 * O cabeçalho, de quem é a configuração, e a lista só com o tema e "Sair". Sem
 * "Como funciona" (é o caminho dos primeiros passos, rota da dona), sem "Quem
 * te ajuda" e sem `MeusDados` — os dados não são dela para exportar nem a conta
 * dela para encerrar. Sem `useGuardaDeSaida`: não há formulário para sujar.
 */
function ConfiguracaoDaAjudante() {
  return (
    <>
      <CabecalhoPagina titulo="Configuração" />
      <p className="mt-4 max-w-[60ch] text-body text-ink-muted">
        O preço e os custos são de quem é dona do negócio.
      </p>
      <div className={cn(LISTA, "mt-4 lg:max-w-2xl")}>
        <BlocoTema />
        <LinhaSair />
      </div>
    </>
  );
}

/**
 * Uma parte da tela (`#d283`): seção no papel, sem caixa, com os blocos ou a
 * lista dentro. A margem de rolagem é a do cabeçalho, que leva o índice.
 */
function Parte({
  id,
  titulo,
  children,
  className,
}: {
  id: IdParte;
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={cn(
        "mt-12 scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)] first:mt-6",
        className,
      )}
    >
      <h2
        id={`${id}-titulo`}
        className="font-display text-heading font-semibold text-ink"
      >
        {titulo}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/**
 * "Sair", a última linha da lista. `pedir` é a guarda de saída da tela que tem
 * formulário; sem ela, sai direto.
 */
function LinhaSair({ pedir }: { pedir?: (acao: () => void) => void }) {
  const { usuario, sair } = useAuth();
  const [saindo, setSaindo] = useState(false);
  const [sairPendente, setSairPendente] = useState(false);

  async function aoSair() {
    setSairPendente(false);
    setSaindo(true);
    if (!(await sair())) {
      setSairPendente(true);
      setSaindo(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (pedir ? pedir(aoSair) : void aoSair())}
        disabled={saindo}
        aria-busy={saindo}
        className={cn(LINHA, "disabled:opacity-60")}
      >
        <LogOut
          aria-hidden
          className="size-5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">Sair</span>
          <span className="mt-0.5 block truncate text-label text-ink-muted">
            Você entrou como {usuario?.email}.
          </span>
        </span>
      </button>

      {sairPendente && (
        <p
          aria-live="polite"
          className="px-4 pb-3 text-label text-ink-muted lg:px-5"
        >
          {AVISO_SAIR_PENDENTE}
        </p>
      )}
    </>
  );
}

function ConfiguracaoDaDona() {
  const contaId = useContaId();
  const { conta } = useAuth();
  const idOcultarFeitoCom = useId();
  const idPeDaFolha = useId();

  const situacao = conta
    ? situacaoDaConta(paraSituar(conta), new Date().getTime())
    : null;

  const referencia = useMemo(() => docConfiguracao(contaId), [contaId]);
  const { dado, carregando, erro, pendente } =
    useDocumento<ConfiguracaoGeral>(referencia);

  const [estado, setEstado] = useState<EstadoConfiguracao | null>(null);
  // `base` é a assinatura do semeado ou do gravado; continua `null` só até
  // semear. `nuncaSalvou` é o que separa "salvo e igual à sugestão" de "nunca
  // salvo" — não dá para usar `base === null` para isso porque `base` deixa de
  // ser nulo assim que a tela semeia, mesmo sem gravação nenhuma ainda.
  const [base, setBase] = useState<string | null>(null);
  const [nuncaSalvou, setNuncaSalvou] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosDespesas, setErrosDespesas] = useState<Record<number, string>>(
    {},
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [recibo, setRecibo] = useState<ReciboDosProdutos | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [formaEmEdicao, setFormaEmEdicao] = useState<FormaPagamento>();
  const [painelAberto, setPainelAberto] = useState(false);

  // A primeira leitura semeia o formulário, e só ela: as leituras seguintes
  // são o eco da própria escrita, e sobrescrever o que a usuária está digitando
  // com a versão do servidor é a forma mais rápida de perder o trabalho dela.
  if (estado === null && !carregando && !erro) {
    const inicial = estadoInicial(dado, conta?.nome);
    setEstado(inicial);
    setBase(assinatura(inicial));
    setNuncaSalvou(!dado);
  }

  // A guarda de saída chamada sempre, antes de qualquer retorno condicional:
  // hook não pode nascer só depois que `estado` existir.
  const sujo = estado !== null && base !== null && assinatura(estado) !== base;
  const alterado = nuncaSalvou || sujo;
  const guarda = useGuardaDeSaida(sujo);

  // Só bloqueia a tela se a falha veio antes de haver o que editar. Um erro
  // que chega depois não pode desmontar um formulário já preenchido.
  if (erro && estado === null) {
    return (
      <>
        <CabecalhoPagina titulo="Configuração" />
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="Não deu para abrir sua configuração"
            descricao="Verifique a conexão e tente de novo. Nada foi perdido: o que já estava salvo continua no aparelho."
          />
        </div>
      </>
    );
  }

  if (!estado) {
    return (
      <>
        {/* A mesma frase da tela carregada: uma descrição mais curta aqui faz
            o cabeçalho mudar de altura quando os dados chegam. */}
        <CabecalhoPagina titulo="Configuração" descricao={DESCRICAO} />
        <div role="status" aria-label="Carregando" className="mt-4 space-y-4">
          {[0, 1, 2].map((indice) => (
            <Esqueleto key={indice} className="h-52 rounded-lg" />
          ))}
        </div>
      </>
    );
  }

  const definir = <C extends keyof EstadoConfiguracao>(
    campo: C,
    valor: EstadoConfiguracao[C],
  ) => {
    setSalvo(false);
    setEstado((anterior) =>
      anterior ? { ...anterior, [campo]: valor } : anterior,
    );
  };

  const dados = paraDados(estado);
  const operacional = dados.operacional;
  const horas = operacional.horasProdutivasMes;
  const precoPadrao = fraseDoPrecoPadrao(
    dados.precificacao,
    estado.formasPagamento,
  );

  // A frase do "Fazer a conta" que divide pelas horas do mês: sem elas, diz
  // onde pôr (`#d286`).
  const porHoraDoMes = (
    valor: Centavos,
    resultado: Centavos | null,
  ): ReactNode =>
    resultado === null ? (
      "Diga quantas horas você produz por mês, em Seu trabalho, e a conta sai."
    ) : valor > 0 ? (
      <>
        <Realce>{formatarMoeda(valor)}</Realce> em {textoHoras(horas)} dá{" "}
        <Realce>{formatarMoeda(resultado)}</Realce> por hora.
      </>
    ) : null;
  const indireto = custoIndiretoPorHora(
    operacional.despesasFixasMensais,
    horas,
  );
  const energiaGas = operacional.custoEnergiaHora + operacional.custoGasHora;

  // O que a ficha consome da configuração (`#d281`). Diz se o salvar refaz os
  // produtos e se a prévia aparece (`#d282`). A primeira gravação troca o
  // sugerido (`#d114`) pelo dela, e refaz mesmo sem diferença.
  const rateio: RateioOperacional = {
    valorHoraTrabalho: operacional.valorHoraTrabalho,
    custoEnergiaHora: operacional.custoEnergiaHora,
    custoGasHora: operacional.custoGasHora,
    custoIndiretoPorHora: indireto,
  };
  const gravado = dado?.operacional;
  const rateioMudou =
    !gravado ||
    (Object.keys(rateio) as (keyof RateioOperacional)[]).some(
      (chave) => rateio[chave] !== gravado[chave],
    );

  function trocarForma(forma: FormaPagamento) {
    setSalvo(false);
    setEstado((anterior) => {
      if (!anterior) return anterior;
      const existe = anterior.formasPagamento.some(
        (item) => item.id === forma.id,
      );
      return {
        ...anterior,
        formasPagamento: existe
          ? anterior.formasPagamento.map((item) =>
              item.id === forma.id ? forma : item,
            )
          : [...anterior.formasPagamento, forma],
      };
    });
  }

  async function salvar() {
    if (!estado) return;
    setFalha(null);

    const nome = estado.nomeNegocio.trim();
    const paraGravar: EstadoConfiguracao = { ...estado, nomeNegocio: nome };

    const dados = paraDados(paraGravar);
    const resultado = esquemaConfiguracao.safeParse({
      nomeNegocio: nome,
      ...dados.operacional,
      ...dados.precificacao,
      contato: dados.contato,
      assinaturaDataUrl: dados.assinaturaDataUrl,
      frase: dados.frase,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      setErrosDespesas(errosDeLinha(resultado.error, "despesasFixasItens"));
      return;
    }

    setErros({});
    setErrosDespesas({});
    setSalvando(true);
    try {
      await salvarConfiguracao(contaId, dados);
      // O nome mora na conta; a configuração leva o espelho (`#d288`).
      if (nome !== conta?.nome) renomearNegocio(contaId, nome);
      setRecibo(
        rateioMudou
          ? await refazerFichasPelaConfiguracao(contaId, rateio)
          : null,
      );
      // A base passa a ser o que foi gravado: o nome sem os espaços das pontas,
      // que o campo também perde.
      setEstado((anterior) =>
        anterior ? { ...anterior, nomeNegocio: nome } : anterior,
      );
      setBase(assinatura(paraGravar));
      setNuncaSalvou(false);
      setSalvo(true);
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
    } finally {
      setSalvando(false);
    }
  }

  // A soma que fecha a conta e a prévia da 082. Abaixo de `2xl`, logo depois
  // das despesas; a partir dele, a coluna presa à direita (`#d283`), como o
  // resumo do pedido (`#d274`). O recibo só enquanto "Tudo salvo": a primeira
  // alteração o tira.
  const custoDaHora = (
    <>
      <CustoPorHora operacional={operacional} />
      <OQueMudaNosProdutos
        rateio={rateioMudou ? rateio : null}
        recibo={salvo ? recibo : null}
      />
    </>
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Configuração"
        descricao={DESCRICAO}
        pendente={pendente}
        acao={
          <Botao
            variante="primaria"
            onClick={() => void salvar()}
            carregando={salvando}
            disabled={!alterado}
            className="hidden lg:inline-flex"
          >
            Salvar
          </Botao>
        }
      >
        <IndiceDaPagina
          ancoras={PARTES}
          rotulo="Partes da configuração"
          className="grid grid-cols-3 overflow-visible lg:flex [&>a]:px-2 lg:[&>a]:px-4"
        />
      </CabecalhoPagina>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        {/* Três estados, e não dois: dizer "você mudou" para quem só abriu a
            tela seria o sistema atribuindo a ela o que ele mesmo sugeriu. Só
            fala das duas primeiras partes: a terceira não espera o "Salvar"
            (`#d284`). */}
        <p className="text-label text-ink-muted" aria-live="polite">
          {nuncaSalvou
            ? "Estes são valores sugeridos. Confira e salve para começar."
            : alterado
              ? "Você mudou coisas que ainda não foram salvas."
              : salvo
                ? "Tudo salvo."
                : ""}
        </p>
      </div>

      {/* A grade só a partir de `2xl`: o formulário até 944px e a coluna de
          320px, como no editor de pedido (`#d274`). */}
      <div className="2xl:grid 2xl:grid-cols-[minmax(0,59rem)_20rem] 2xl:items-start 2xl:gap-8">
        <div
          className={cn(
            // Espaço para a barra de salvar não cobrir a última linha.
            alterado && "pb-20 lg:pb-0",
          )}
        >
          <Parte id="o-seu-preco" titulo="O seu preço">
            <BlocoConfiguracao
              icone={Clock}
              titulo="Seu trabalho"
              descricao="A hora que você passa na bancada tem preço. Ignorar isso é trabalhar de graça e chamar de lucro."
              consequencia={
                <>
                  Uma fornada de 1h30 leva{" "}
                  <Realce>
                    {formatarMoeda(
                      custoDeMinutos(
                        estado.valorHoraTrabalho,
                        FORNADA_EXEMPLO_MINUTOS,
                      ),
                    )}
                  </Realce>{" "}
                  só do seu tempo.
                  {horas > 0 && (
                    <>
                      {" "}
                      No mês cheio, seu trabalho vale{" "}
                      <Realce>
                        {formatarMoeda(
                          Math.round(estado.valorHoraTrabalho * horas),
                        )}
                      </Realce>
                      .
                    </>
                  )}
                </>
              }
            >
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <CampoMoeda
                    rotulo="Quanto vale a sua hora"
                    valor={estado.valorHoraTrabalho}
                    aoMudar={(centavos) =>
                      definir("valorHoraTrabalho", centavos)
                    }
                    erro={erros.valorHoraTrabalho}
                  />
                  <FazerAConta
                    campos={[
                      {
                        chave: "retirada",
                        rotulo: "Quanto você quer tirar por mês",
                        tipo: "moeda",
                      },
                    ]}
                    calcular={({ retirada }) =>
                      horaPelaRetirada(retirada, horas)
                    }
                    frase={({ retirada }, resultado) =>
                      porHoraDoMes(retirada, resultado)
                    }
                    aoUsar={(centavos) =>
                      definir("valorHoraTrabalho", centavos)
                    }
                  />
                </div>
                <Campo
                  rotulo="Horas que você produz por mês"
                  inputMode="decimal"
                  sufixo="h"
                  value={estado.horasProdutivasMes}
                  erro={erros.horasProdutivasMes}
                  dica="Não é o mês inteiro: é o tempo de bancada, forno e embalagem."
                  onChange={(evento) =>
                    definir("horasProdutivasMes", evento.target.value)
                  }
                />
              </div>
            </BlocoConfiguracao>

            <BlocoConfiguracao
              icone={Flame}
              titulo="Energia e gás"
              descricao="O que o forno e a luz custam em cada hora de produção. Chute alto é melhor que zero."
              consequencia={
                <>
                  Forno e luz somam <Realce>{formatarMoeda(energiaGas)}</Realce>{" "}
                  por hora ligada, ou{" "}
                  <Realce>
                    {formatarMoeda(
                      custoDeMinutos(energiaGas, FORNADA_EXEMPLO_MINUTOS),
                    )}
                  </Realce>{" "}
                  na fornada de 1h30.
                </>
              }
            >
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <CampoMoeda
                    rotulo="Energia por hora"
                    valor={estado.custoEnergiaHora}
                    aoMudar={(centavos) =>
                      definir("custoEnergiaHora", centavos)
                    }
                    erro={erros.custoEnergiaHora}
                  />
                  <FazerAConta
                    campos={[
                      {
                        chave: "luz",
                        rotulo:
                          "Quanto a confeitaria pesa na conta de luz do mês",
                        tipo: "moeda",
                        dica: "Se não sabe, compare a conta de um mês de muita encomenda com a de um mês parado.",
                      },
                    ]}
                    calcular={({ luz }) => energiaPorHoraDaConta(luz, horas)}
                    frase={({ luz }, resultado) => porHoraDoMes(luz, resultado)}
                    aoUsar={(centavos) => definir("custoEnergiaHora", centavos)}
                  />
                </div>
                <div className="space-y-1">
                  <CampoMoeda
                    rotulo="Gás por hora"
                    valor={estado.custoGasHora}
                    aoMudar={(centavos) => definir("custoGasHora", centavos)}
                    erro={erros.custoGasHora}
                  />
                  <FazerAConta
                    campos={[
                      {
                        chave: "botijao",
                        rotulo: "Quanto custa o botijão",
                        tipo: "moeda",
                      },
                      {
                        chave: "semanas",
                        rotulo: "Ele dura quantas semanas",
                        tipo: "numero",
                      },
                      {
                        chave: "horasForno",
                        rotulo: "Quantas horas o forno fica ligado por semana",
                        tipo: "numero",
                        sufixo: "h",
                      },
                    ]}
                    calcular={({ botijao, semanas, horasForno }) =>
                      gasPorHoraDoBotijao(botijao, semanas, horasForno)
                    }
                    frase={({ botijao, semanas, horasForno }, resultado) =>
                      resultado === null ? (
                        "Diga quantas semanas o botijão dura e quantas horas o forno fica ligado por semana."
                      ) : botijao > 0 ? (
                        <>
                          Um botijão de{" "}
                          <Realce>{formatarMoeda(botijao)}</Realce> em{" "}
                          {semanas.toLocaleString("pt-BR")}{" "}
                          {semanas === 1 ? "semana" : "semanas"} de{" "}
                          {textoHoras(horasForno)} dá{" "}
                          <Realce>{formatarMoeda(resultado)}</Realce> por hora
                          de forno.
                        </>
                      ) : null
                    }
                    aoUsar={(centavos) => definir("custoGasHora", centavos)}
                  />
                </div>
              </div>
            </BlocoConfiguracao>

            <BlocoConfiguracao
              icone={Receipt}
              titulo="Despesas fixas"
              descricao="O que você paga todo mês mesmo sem vender nada, uma por uma: a que você não lembra fica fora do preço. Conta de ano, como o alvará, entra dividida por 12."
              tom={
                horas > 0 && operacional.despesasFixasMensais > 0
                  ? "neutro"
                  : "atencao"
              }
              consequencia={
                !(horas > 0) ? (
                  <>
                    Sem horas produtivas no bloco acima, não há por onde ratear:
                    as despesas fixas não entram em preço nenhum.
                  </>
                ) : operacional.despesasFixasMensais > 0 ? (
                  <>
                    Suas despesas fixas custam{" "}
                    <Realce>{formatarMoeda(indireto)}</Realce> por hora
                    produzida. É essa fatia que entra em cada produto.
                  </>
                ) : (
                  <>
                    Suas despesas fixas custam{" "}
                    <Realce>{formatarMoeda(0)}</Realce> por hora produzida:
                    aluguel, internet e o resto não entram em preço nenhum.
                  </>
                )
              }
            >
              <DespesasFixas
                despesas={estado.despesas}
                aoMudar={(atualizar) => {
                  setSalvo(false);
                  setEstado((anterior) =>
                    anterior
                      ? { ...anterior, despesas: atualizar(anterior.despesas) }
                      : anterior,
                  );
                }}
                erros={errosDespesas}
                assinante={situacao?.tipo === "assinante"}
              />
            </BlocoConfiguracao>

            <div className="space-y-4 2xl:hidden">{custoDaHora}</div>

            {/* Logo depois do custo por hora: é a continuação dele (`#d283`). */}
            <BlocoConfiguracao
              icone={Tag}
              titulo="Preço padrão"
              descricao="Como todo produto novo começa. Cada produto pode fugir daqui depois."
              tom={precoPadrao.tom}
              consequencia={precoPadrao.texto}
            >
              <fieldset>
                <legend className="text-label font-medium text-ink">
                  Como você prefere calcular
                </legend>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {METODOS.map((metodo) => {
                    const ativo = estado.metodoPadrao === metodo.valor;
                    return (
                      <button
                        key={metodo.valor}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => definir("metodoPadrao", metodo.valor)}
                        className={cn(
                          "rounded-md border p-3 text-left transition-colors duration-150 ease-quart",
                          ativo
                            ? "border-brand-ink bg-brand-100"
                            : "border-line-strong hover:bg-sunken",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
                          {/* O ícone, e não só o fundo, diz qual está escolhido. */}
                          {ativo && (
                            <Check
                              aria-hidden
                              className="size-4 shrink-0 text-brand-ink"
                              strokeWidth={2}
                            />
                          )}
                          {metodo.titulo}
                        </span>
                        <span className="mt-1 block text-label text-ink-muted">
                          {metodo.explicacao}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                {estado.metodoPadrao === "MARGEM" ? (
                  <Campo
                    rotulo="Quero que sobre"
                    inputMode="decimal"
                    sufixo="%"
                    value={estado.margemPadrao}
                    erro={erros.margemPadrao}
                    dica="Do preço de venda, depois de descontar custo e taxas."
                    onChange={(evento) =>
                      definir("margemPadrao", evento.target.value)
                    }
                  />
                ) : (
                  <Campo
                    rotulo="Multiplico o custo por"
                    inputMode="decimal"
                    sufixo="×"
                    value={estado.markupPadrao}
                    erro={erros.markupPadrao}
                    dica="2,5 quer dizer que um doce de R$ 4,00 de custo sai por R$ 10,00."
                    onChange={(evento) =>
                      definir("markupPadrao", evento.target.value)
                    }
                  />
                )}

                <Campo
                  rotulo="Outras taxas sobre o preço"
                  inputMode="decimal"
                  sufixo="%"
                  value={estado.outrasTaxasPadrao}
                  erro={erros.outrasTaxasPadrao}
                  dica="Imposto ou comissão de aplicativo, fora a maquininha. Se não tem, deixe zero."
                  onChange={(evento) =>
                    definir("outrasTaxasPadrao", evento.target.value)
                  }
                />

                <Seletor
                  rotulo="Arredondamento"
                  value={estado.arredondamento}
                  onChange={(evento) =>
                    definir(
                      "arredondamento",
                      evento.target.value as RegraArredondamento,
                    )
                  }
                >
                  {REGRAS.map((regra) => (
                    <option key={regra} value={regra}>
                      {ROTULO_ARREDONDAMENTO[regra]}
                    </option>
                  ))}
                </Seletor>
              </div>
            </BlocoConfiguracao>

            <BlocoConfiguracao
              icone={CreditCard}
              titulo="Formas de pagamento"
              descricao="A maquininha cobra por venda, e essa taxa sai do seu lucro, não do preço da cliente."
              recuado={false}
            >
              <ListaFormasPagamento
                formas={estado.formasPagamento}
                aoAbrir={(forma) => {
                  setFormaEmEdicao(forma);
                  setPainelAberto(true);
                }}
                aoAdicionar={() => {
                  setFormaEmEdicao(undefined);
                  setPainelAberto(true);
                }}
              />
            </BlocoConfiguracao>
          </Parte>

          <Parte id="a-sua-marca" titulo="A sua marca">
            <BlocoConfiguracao
              id={ANCORA_DO_CONTATO}
              icone={FileText}
              titulo="Na folha do orçamento"
              descricao="O nome, o contato e a assinatura que a cliente vê."
            >
              <Campo
                rotulo="Nome do negócio"
                dica="Como a cliente vê: na folha, no cardápio e no topo do app."
                autoComplete="organization"
                maxLength={TAMANHO_MAXIMO_NOME}
                value={estado.nomeNegocio}
                onChange={(evento) =>
                  definir("nomeNegocio", evento.target.value)
                }
                erro={erros.nomeNegocio}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  rotulo="Telefone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 90000-0000"
                  value={estado.telefone}
                  onChange={(evento) =>
                    definir("telefone", evento.target.value)
                  }
                />
                <Campo
                  rotulo="Instagram"
                  prefixo="@"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="suaconfeitaria"
                  value={estado.instagram}
                  onChange={(evento) =>
                    definir("instagram", evento.target.value)
                  }
                />
              </div>

              <Campo
                rotulo="Frase do orçamento"
                dica="Aparece embaixo da folha, ao lado do seu contato."
                placeholder="Feito com amor em cada mordida."
                maxLength={80}
                value={estado.frase}
                onChange={(evento) => definir("frase", evento.target.value)}
                erro={erros.frase}
              />

              {/* Assinantes podem tirar a linha do Rende do rodapé; em teste,
                  só a explicação — a linha da assinatura mora em "A sua
                  conta", logo abaixo (spec 028, `#d147`). */}
              {situacao?.tipo === "teste" ? (
                <p className="text-label text-ink-muted">
                  Assinantes podem tirar esta linha da folha e do cardápio.
                </p>
              ) : (
                <div className="flex min-h-11 items-start gap-3 rounded-md border border-line-strong px-3 py-3">
                  <input
                    id={idOcultarFeitoCom}
                    type="checkbox"
                    checked={estado.ocultarFeitoCom}
                    onChange={(evento) =>
                      definir("ocultarFeitoCom", evento.target.checked)
                    }
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <label
                    htmlFor={idOcultarFeitoCom}
                    className="text-label text-ink"
                  >
                    Tirar a linha &ldquo;feito com Rende&rdquo; da folha e do
                    cardápio
                  </label>
                </div>
              )}

              <CampoImagem
                rotulo="Assinatura"
                dica="Assine com o dedo, ou escolha a foto de uma assinatura em papel branco."
                formato="largo"
                valor={estado.assinaturaDataUrl}
                aoMudar={(dataUrl) => definir("assinaturaDataUrl", dataUrl)}
                reducao={{
                  ladoMaximo: ASSINATURA_LADO_PX,
                  formato: "image/png",
                }}
                maxBytes={ASSINATURA_MAX_BYTES}
                rotuloEscolher="Escolher imagem"
                rotuloDesenhar="Assinar aqui"
                rotuloTirar="Tirar a assinatura"
              />

              {/* O pé da folha pelo mesmo componente da folha, com o que está
                  na tela, e não o gravado (`#d289`). Papel, nos dois temas. */}
              {conta && (
                <section
                  aria-labelledby={idPeDaFolha}
                  className="flex flex-col gap-2"
                >
                  <h4
                    id={idPeDaFolha}
                    className="text-label font-medium text-ink"
                  >
                    Assim fica o pé da folha
                  </h4>
                  <div className="folha w-full! min-h-0! rounded-md border border-line px-4! pt-0! pb-4! text-[10.5pt] leading-[1.45]">
                    <PeDaFolha negocio={negocioDaFolha(conta, dados)} />
                  </div>
                </section>
              )}
            </BlocoConfiguracao>

            {/* O cardápio público (spec 031) é vitrine, e não conta: saiu da
                prateleira para cá (`#d283`). Lê a configuração que a tela já
                assina, e vale no toque, no painel dele. */}
            <div className={LISTA}>
              <SeuCardapio configuracao={dado} carregando={carregando} />
            </div>

            {falha && (
              <p role="alert" className="text-label text-negative">
                {falha}
              </p>
            )}
          </Parte>

          {/* Fora do formulário (`#d284`): cada linha age na hora, e a posição
              diz isso. Lista com divisórias, nenhum cartão. */}
          <Parte id="a-sua-conta" titulo="A sua conta">
            <div className={LISTA}>
              {/* Só em teste e assinante: `livre` não tem o que ver aqui (spec
                  028). No teste, o prazo e "Assinar", secundário: o âmbar da
                  tela é o "Salvar" (`#d284`). A assinante abre o painel (`#d285`). */}
              {situacao?.tipo === "teste" && (
                <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 lg:px-5">
                  <CreditCard
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-ink">
                      Assinatura
                    </span>
                    <span className="mt-0.5 block text-label text-ink-muted">
                      {fraseDoTeste(situacao.diasRestantes)}
                    </span>
                  </span>
                  <Link
                    href="/assinatura"
                    className={classesBotao({ variante: "secundaria" })}
                  >
                    Assinar
                  </Link>
                </div>
              )}
              {situacao?.tipo === "assinante" && (
                <LinhaDaAssinatura
                  pacote={situacao.pacote}
                  renovaEmMs={situacao.renovaEmMs}
                />
              )}

              {/* O que se usa uma vez por ano (spec 030): a legenda é o
                  estado, "Só você" até alguém ser convidada. */}
              <QuemTeAjuda />

              {/* A caixa de marcar é a linha, como a conta que o AuthProvider
                  já assina (spec 044-B, `#d207`). A âncora é a do e-mail. */}
              <label
                id="avisos"
                className={cn(
                  LINHA,
                  "cursor-pointer scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)] has-disabled:cursor-not-allowed",
                )}
              >
                <Mail
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-ink">
                    Avisos por e-mail
                  </span>
                  <span className="mt-0.5 block text-label text-ink-muted">
                    Receber por e-mail o resumo do mês e o aviso de meta batida
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={conta?.avisosPorEmail !== false}
                  disabled={!conta}
                  onChange={(evento) =>
                    void definirAvisosPorEmail(contaId, evento.target.checked)
                  }
                  className="size-5 shrink-0"
                />
              </label>

              <BlocoTema />

              <FaleComAGente />

              {/* A entrada do guia no celular, onde não há barra lateral. É
                  para cá que a engrenagem do cabeçalho da tela Hoje já leva. */}
              <Link href="/comecar" className={LINHA}>
                <Compass
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-ink">
                    Como funciona
                  </span>
                  <span className="mt-0.5 block text-label text-ink-muted">
                    Os cinco passos do começo, na ordem em que uma coisa depende
                    da outra.
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-ink-subtle"
                  strokeWidth={1.75}
                />
              </Link>

              {/* Os dois direitos da LGPD (spec 029): baixar e encerrar.
                  Antes de sair, porque "Encerrar" não pode ser vizinha de
                  baixo de nada que se toque sem pensar. */}
              <MeusDados />

              {/* Onde o celular já busca o que não cabe no menu de baixo. No
                  desktop duplica a barra lateral: sair é raro, e não merece o
                  sexto destino nem um lugar visível na tela Hoje. */}
              <LinhaSair pedir={guarda.pedir} />
            </div>
          </Parte>
        </div>

        <aside
          aria-label="Cada hora de produção custa"
          className="sticky top-[calc(var(--fundo-cabecalho,0px)+1rem)] mt-6 hidden max-h-[calc(100dvh-var(--fundo-cabecalho,0px)-2rem)] space-y-4 overflow-y-auto 2xl:block"
        >
          {custoDaHora}
        </aside>
      </div>

      {/* Barra de salvar acima da navegação inferior: no celular a ação
          primária não pode depender de rolar até o fim da tela. */}
      {alterado && (
        /* Sem `apertado:hidden`: esta barra é a ação primária de uma tela que é
           toda de campos, e é com o teclado aberto que ela vale. */
        <RodapeFixo className="lg:hidden">
          <div className="flex items-center gap-3 p-3">
            <p className="min-w-0 flex-1 text-label text-ink-muted">
              {nuncaSalvou
                ? "Valores sugeridos, ainda não salvos"
                : "Alterações ainda não salvas"}
            </p>
            <Botao
              variante="primaria"
              tamanho="lg"
              onClick={() => void salvar()}
              carregando={salvando}
            >
              Salvar
            </Botao>
          </div>
        </RodapeFixo>
      )}

      <FormularioFormaPagamento
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        aoConfirmar={trocarForma}
        forma={formaEmEdicao}
      />

      {guarda.dialogo}
    </>
  );
}
