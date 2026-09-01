"use client";

import { useMemo, useState } from "react";
import { Check, Clock, CreditCard, Flame, Receipt, Tag } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BlocoConfiguracao, Realce } from "./BlocoConfiguracao";
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
import { errosPorCampo, esquemaConfiguracao } from "@/lib/domain/schemas";
import { docConfiguracao } from "@/lib/firebase/colecoes";
import {
  CONFIGURACAO_SUGERIDA,
  salvarConfiguracao,
  type DadosConfiguracao,
} from "@/lib/firebase/mutations/configuracao";
import { useDocumento } from "@/lib/hooks/useColecao";
import type {
  ConfiguracaoGeral,
  FormaPagamento,
  MetodoPrecificacao,
  RegraArredondamento,
} from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** Preço de exemplo para mostrar o que a regra de arredondamento faz. */
const PRECO_EXEMPLO = 1237;

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
  };
}

function paraDados(estado: EstadoConfiguracao): DadosConfiguracao {
  return {
    ...(estado.nomeNegocio ? { nomeNegocio: estado.nomeNegocio } : {}),
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

export function TelaConfiguracao() {
  const contaId = useContaId();
  const { conta } = useAuth();

  const referencia = useMemo(() => docConfiguracao(contaId), [contaId]);
  const { dado, carregando, erro, pendente } =
    useDocumento<ConfiguracaoGeral>(referencia);

  const [estado, setEstado] = useState<EstadoConfiguracao | null>(null);
  const [base, setBase] = useState("");
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
  }

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
        <CabecalhoPagina
          titulo="Configuração"
          descricao="Os custos que não aparecem na receita, mas saem do seu bolso."
        />
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
  const alterado = assinatura(estado) !== base;

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

    const dados = paraDados(estado);
    const resultado = esquemaConfiguracao.safeParse({
      ...dados.operacional,
      ...dados.precificacao,
    });

    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setSalvando(true);
    try {
      await salvarConfiguracao(contaId, dados);
      setBase(assinatura(estado));
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
        descricao="Os custos que não aparecem na receita, mas saem do seu bolso. É daqui que sai o rateio de toda ficha técnica."
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
        <p className="text-label text-ink-muted" aria-live="polite">
          {alterado
            ? "Você mudou coisas que ainda não foram salvas."
            : salvo
              ? "Tudo salvo."
              : ""}
        </p>
        <SeloSincronizacao pendente={pendente} />
      </div>

      {/* Coluna estreita de propósito: isto é leitura e digitação, não tabela. */}
      <div
        className={cn(
          "mt-2 max-w-2xl space-y-4",
          // Espaço para a barra de salvar não cobrir o último bloco.
          alterado && "pb-20 lg:pb-0",
        )}
      >
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
                essa fatia que entra em cada ficha técnica.
              </>
            ) : (
              <>
                Sem horas produtivas no bloco acima, não há por onde ratear: as
                despesas fixas não entram em preço nenhum.
              </>
            )
          }
        >
          <CampoMoeda
            rotulo="Despesas fixas do mês"
            valor={estado.despesasFixasMensais}
            aoMudar={(centavos) => definir("despesasFixasMensais", centavos)}
            erro={erros.despesasFixasMensais}
          />
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

        <BlocoConfiguracao
          icone={Tag}
          titulo="Preço padrão"
          descricao="Como toda ficha nova começa. Cada produto pode fugir daqui depois."
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
                        ? "border-wine-700 bg-wine-100"
                        : "border-line-strong hover:bg-sunken",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
                      {/* O ícone, e não só o fundo, diz qual está escolhido. */}
                      {ativo && (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-wine-700 dark:text-wine-300"
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
        </BlocoConfiguracao>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}
      </div>

      {/* Barra de salvar acima da navegação inferior: no celular a ação
          primária não pode depender de rolar até o fim da tela. */}
      {alterado && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:hidden">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-overlay">
            <p className="min-w-0 flex-1 text-label text-ink-muted">
              Alterações ainda não salvas
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
        </div>
      )}

      <FormularioFormaPagamento
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        aoConfirmar={trocarForma}
        forma={formaEmEdicao}
      />
    </>
  );
}
