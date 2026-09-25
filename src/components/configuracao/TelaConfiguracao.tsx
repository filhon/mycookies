"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
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
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
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
import { CustoPorHora } from "./CustoPorHora";
import { FormularioFormaPagamento } from "./FormularioFormaPagamento";
import { ListaFormasPagamento } from "./ListaFormasPagamento";
import {
  custoDeMinutos,
  custoIndiretoPorHora,
  FORNADA_EXEMPLO_MINUTOS,
  ROTULO_ARREDONDAMENTO,
} from "@/lib/domain/custosOperacionais";
import {
  arredondarPreco,
  formatarMoeda,
  parseParaNumero,
} from "@/lib/domain/money";
import {
  fraseDoTeste,
  MENSAGEM_FALHA_ASSINATURA,
  NOME_DO_PACOTE,
  paraSituar,
  situacaoDaConta,
} from "@/lib/domain/assinatura";
import {
  ASSINATURA_LADO_PX,
  ASSINATURA_MAX_BYTES,
} from "@/lib/domain/orcamento";
import { errosPorCampo, esquemaConfiguracao } from "@/lib/domain/schemas";
import { docConfiguracao } from "@/lib/firebase/colecoes";
import {
  CONFIGURACAO_SUGERIDA,
  salvarConfiguracao,
  type DadosConfiguracao,
} from "@/lib/firebase/mutations/configuracao";
import { definirAvisosPorEmail } from "@/lib/firebase/mutations/conta";
import { useDocumento } from "@/lib/hooks/useColecao";
import type {
  ConfiguracaoGeral,
  FormaPagamento,
  MetodoPrecificacao,
  RegraArredondamento,
} from "@/lib/types";
import {
  AVISO_SAIR_PENDENTE,
  useAuth,
  useContaId,
  usePapel,
} from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** Preço de exemplo para mostrar o que a regra de arredondamento faz. */
const PRECO_EXEMPLO = 1237;

const DESCRICAO =
  "Os custos que não aparecem no produto, mas saem do seu bolso. É daqui que sai o rateio de todo produto.";

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
  despesasFixasMensais: number;
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
    nomeNegocio: dado?.nomeNegocio ?? nomeConta ?? "",
    valorHoraTrabalho: operacional.valorHoraTrabalho,
    horasProdutivasMes: texto(operacional.horasProdutivasMes),
    custoEnergiaHora: operacional.custoEnergiaHora,
    custoGasHora: operacional.custoGasHora,
    despesasFixasMensais: operacional.despesasFixasMensais,
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
      despesasFixasMensais: estado.despesasFixasMensais,
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
  return usePapel() === "AJUDANTE" ? (
    <ConfiguracaoDaAjudante />
  ) : (
    <ConfiguracaoDaDona />
  );
}

/**
 * O cabeçalho, de quem é a configuração, e a prateleira só com "Sair". Sem
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
      <div className="mt-8 flex flex-col gap-2 lg:mt-12 lg:max-w-md">
        <LinhaSair />
      </div>
    </>
  );
}

/**
 * "Sair", na prateleira. `pedir` é a guarda de saída da tela que tem
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
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken disabled:opacity-60 lg:px-5"
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
        <p aria-live="polite" className="text-label text-ink-muted">
          {AVISO_SAIR_PENDENTE}
        </p>
      )}
    </>
  );
}

function ConfiguracaoDaDona() {
  const contaId = useContaId();
  const { conta, usuario } = useAuth();
  const [portalEnviando, setPortalEnviando] = useState(false);
  const [portalErro, setPortalErro] = useState<string | null>(null);
  const idOcultarFeitoCom = useId();
  const idAvisos = useId();

  const situacao = conta
    ? situacaoDaConta(paraSituar(conta), new Date().getTime())
    : null;

  async function abrirPortalAssinatura() {
    setPortalErro(null);
    setPortalEnviando(true);
    try {
      const token = await usuario!.getIdToken();
      const resposta = await fetch("/api/assinatura/portal", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ contaId }),
      });
      if (!resposta.ok) {
        setPortalErro(MENSAGEM_FALHA_ASSINATURA["sem-resposta"]);
        setPortalEnviando(false);
        return;
      }
      const { url } = (await resposta.json()) as { url: string };
      window.location.assign(url);
    } catch {
      setPortalErro(MENSAGEM_FALHA_ASSINATURA["sem-rede"]);
      setPortalEnviando(false);
    }
  }

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
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
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

  const operacional = paraDados(estado).operacional;
  const horas = operacional.horasProdutivasMes;
  const indireto = custoIndiretoPorHora(
    operacional.despesasFixasMensais,
    horas,
  );
  const energiaGas = operacional.custoEnergiaHora + operacional.custoGasHora;

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

    // O documento da conta é outra assinatura, e pode não ter chegado na hora
    // em que a configuração semeou o formulário. O nome é relido aqui porque é
    // o único campo desta tela que não sai do teclado: numa conta nova ele
    // nasceria vazio e o espelho de `contas/{id}.nome` iria embora da escrita.
    const paraGravar: EstadoConfiguracao = {
      ...estado,
      nomeNegocio: estado.nomeNegocio || (conta?.nome ?? ""),
    };

    const dados = paraDados(paraGravar);
    const resultado = esquemaConfiguracao.safeParse({
      ...dados.operacional,
      ...dados.precificacao,
      contato: dados.contato,
      assinaturaDataUrl: dados.assinaturaDataUrl,
      frase: dados.frase,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setSalvando(true);
    try {
      await salvarConfiguracao(contaId, dados);
      // A base passa a ser o que foi gravado. O nome entra por atualização
      // funcional para não desfazer o que ela tenha digitado durante a escrita.
      setEstado((anterior) =>
        anterior
          ? { ...anterior, nomeNegocio: paraGravar.nomeNegocio }
          : anterior,
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

  return (
    <>
      <CabecalhoPagina
        titulo="Configuração"
        descricao={DESCRICAO}
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
      />

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        {/* Três estados, e não dois: dizer "você mudou" para quem só abriu a
            tela seria o sistema atribuindo a ela o que ele mesmo sugeriu. */}
        <p className="text-label text-ink-muted" aria-live="polite">
          {nuncaSalvou
            ? "Estes são valores sugeridos. Confira e salve para começar."
            : alterado
              ? "Você mudou coisas que ainda não foram salvas."
              : salvo
                ? "Tudo salvo."
                : ""}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      {/* Mesma coluna de todas as telas: quem estreita é o campo dentro do
          bloco, nunca a página, senão o cabeçalho fica mais largo que o corpo. */}
      <div className="mt-2 space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMoeda
              rotulo="Quanto vale a sua hora"
              valor={estado.valorHoraTrabalho}
              aoMudar={(centavos) => definir("valorHoraTrabalho", centavos)}
              erro={erros.valorHoraTrabalho}
            />
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
          descricao="Some a conta de luz e o botijão do mês e divida pelas horas que o forno fica ligado. Chute alto é melhor que zero."
          consequencia={
            <>
              Forno e luz somam <Realce>{formatarMoeda(energiaGas)}</Realce> por
              hora ligada, ou{" "}
              <Realce>
                {formatarMoeda(
                  custoDeMinutos(energiaGas, FORNADA_EXEMPLO_MINUTOS),
                )}
              </Realce>{" "}
              na fornada de 1h30.
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMoeda
              rotulo="Energia por hora"
              valor={estado.custoEnergiaHora}
              aoMudar={(centavos) => definir("custoEnergiaHora", centavos)}
              erro={erros.custoEnergiaHora}
            />
            <CampoMoeda
              rotulo="Gás por hora"
              valor={estado.custoGasHora}
              aoMudar={(centavos) => definir("custoGasHora", centavos)}
              erro={erros.custoGasHora}
            />
          </div>
        </BlocoConfiguracao>

        <BlocoConfiguracao
          icone={Receipt}
          titulo="Despesas fixas"
          descricao="Aluguel, internet, contador, assinaturas. O que você paga todo mês mesmo sem vender nada."
          tom={horas > 0 ? "neutro" : "atencao"}
          consequencia={
            horas > 0 ? (
              <>
                Suas despesas fixas custam{" "}
                <Realce>{formatarMoeda(indireto)}</Realce> por hora produzida. É
                essa fatia que entra em cada produto.
              </>
            ) : (
              <>
                Sem horas produtivas no bloco acima, não há por onde ratear: as
                despesas fixas não entram em preço nenhum.
              </>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMoeda
              rotulo="Despesas fixas do mês"
              valor={estado.despesasFixasMensais}
              aoMudar={(centavos) => definir("despesasFixasMensais", centavos)}
              erro={erros.despesasFixasMensais}
            />
          </div>
        </BlocoConfiguracao>

        <CustoPorHora operacional={operacional} />

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

        {/* Só em teste e assinante: `livre` não tem o que ver aqui (spec 028). */}
        {(situacao?.tipo === "teste" || situacao?.tipo === "assinante") && (
          <BlocoConfiguracao icone={CreditCard} titulo="Assinatura">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-label text-ink-muted">
                {situacao.tipo === "teste"
                  ? fraseDoTeste(situacao.diasRestantes)
                  : `Você está no plano ${NOME_DO_PACOTE[situacao.pacote]}.`}
              </p>
              {situacao.tipo === "teste" ? (
                <Link
                  href="/assinatura"
                  className={classesBotao({ variante: "primaria" })}
                >
                  Assinar
                </Link>
              ) : (
                <Botao
                  variante="primaria"
                  onClick={() => void abrirPortalAssinatura()}
                  carregando={portalEnviando}
                >
                  Gerenciar assinatura
                </Botao>
              )}
            </div>
            {portalErro && (
              <p role="alert" className="text-label text-negative">
                {portalErro}
              </p>
            )}
          </BlocoConfiguracao>
        )}

        <BlocoConfiguracao
          id={ANCORA_DO_CONTATO}
          icone={FileText}
          titulo="Na folha do orçamento"
          descricao="O que a empresa vê no rodapé e na assinatura da folha."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Telefone"
              type="tel"
              autoComplete="tel"
              placeholder="81 98696-6176"
              value={estado.telefone}
              onChange={(evento) => definir("telefone", evento.target.value)}
            />
            <Campo
              rotulo="Instagram"
              prefixo="@"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="suaconfeitaria"
              value={estado.instagram}
              onChange={(evento) => definir("instagram", evento.target.value)}
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

          {/* Assinantes podem tirar a linha do Rende do rodapé; em teste, só a
              explicação — o bloco de assinatura já está duas dobras acima
              (spec 028, `#d147`). */}
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
            dica="Uma imagem PNG com fundo transparente fica melhor. Uma foto da assinatura em papel branco também serve."
            formato="largo"
            valor={estado.assinaturaDataUrl}
            aoMudar={(dataUrl) => definir("assinaturaDataUrl", dataUrl)}
            reducao={{ ladoMaximo: ASSINATURA_LADO_PX, formato: "image/png" }}
            maxBytes={ASSINATURA_MAX_BYTES}
            rotuloEscolher="Escolher imagem"
            rotuloTirar="Tirar"
          />
        </BlocoConfiguracao>

        <BlocoConfiguracao
          icone={Tag}
          titulo="Preço padrão"
          descricao="Como todo produto novo começa. Cada produto pode fugir daqui depois."
          consequencia={
            estado.arredondamento === "NENHUM" ? (
              <>
                Um preço calculado em{" "}
                <Realce>{formatarMoeda(PRECO_EXEMPLO)}</Realce> vai para a
                vitrine exatamente assim, com centavo quebrado e tudo.
              </>
            ) : (
              <>
                Um preço calculado em{" "}
                <Realce>{formatarMoeda(PRECO_EXEMPLO)}</Realce> chega à vitrine
                como{" "}
                <Realce>
                  {formatarMoeda(
                    arredondarPreco(PRECO_EXEMPLO, estado.arredondamento),
                  )}
                </Realce>
                .
              </>
            )
          }
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

        {/* Fora do formulário: vale no toque, como a conta que o AuthProvider
            já assina, e não espera o "Salvar" (spec 044-B, `#d207`). */}
        <BlocoConfiguracao
          id="avisos"
          icone={Mail}
          titulo="Avisos por e-mail"
          descricao="O aviso do fim do teste chega sempre. Estes dois são notícia, e você escolhe. Vale no toque, sem salvar."
        >
          <div className="flex min-h-11 items-start gap-3 rounded-md border border-line-strong px-3 py-3">
            <input
              id={idAvisos}
              type="checkbox"
              checked={conta?.avisosPorEmail !== false}
              disabled={!conta}
              onChange={(evento) =>
                void definirAvisosPorEmail(contaId, evento.target.checked)
              }
              className="mt-0.5 size-5 shrink-0"
            />
            <label htmlFor={idAvisos} className="text-label text-ink">
              Receber por e-mail o resumo do mês e o aviso de meta batida
            </label>
          </div>
        </BlocoConfiguracao>
      </div>

      {falha && (
        <p role="alert" className="mt-4 text-label text-negative">
          {falha}
        </p>
      )}

      {/* A prateleira do que se usa uma vez ou raramente: o guia, os dois
          direitos da LGPD e sair. Um respiro maior a separa das configurações
          acima — não é mais um campo para editar, é outra categoria de coisa —
          e no desktop ela é um menu compacto, não uma fileira de campos: por
          isso a coluna encolhe e as linhas ficam mais próximas umas das
          outras do que os blocos de configuração ficam entre si. */}
      <div
        className={cn(
          "mt-8 flex flex-col gap-2 lg:mt-12 lg:max-w-md",
          // Espaço para a barra de salvar não cobrir o último bloco.
          alterado && "pb-20 lg:pb-0",
        )}
      >
        {/* A entrada do guia no celular, onde não há barra lateral. É para cá
            que a engrenagem do cabeçalho da tela Hoje já leva: são três toques
            para uma coisa que se consulta raramente, e é o preço de não gastar
            o sexto destino de uma navegação que tem cinco. */}
        <Link
          href="/comecar"
          className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5"
        >
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
              Os cinco passos do começo, na ordem em que uma coisa depende da
              outra.
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </Link>

        {/* O cardápio público (spec 031): acima de "Quem te ajuda", fechado até
            ela abrir. Lê a configuração que a tela já assina. */}
        <SeuCardapio configuracao={dado} carregando={carregando} />

        {/* O que se usa uma vez por ano, como o guia (spec 030): a legenda é o
            estado, "Só você" até alguém ser convidada. */}
        <QuemTeAjuda />

        {/* Os dois direitos da LGPD (spec 029): baixar e encerrar. Depois do
            guia e antes de sair, porque "Encerrar" não pode ser vizinha de
            baixo de nada que se toque sem pensar. */}
        <MeusDados />

        {/* Onde o celular já busca o que não cabe no menu de baixo — a mesma
            prateleira do guia acima. No desktop duplica a barra lateral, e é
            assim que "Como funciona" já é: sair é raro, e não merece o sexto
            destino nem um lugar visível na tela Hoje. */}
        <LinhaSair pedir={guarda.pedir} />
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
