"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Archive, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo, EnvelopeCampo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Painel } from "@/components/ui/Painel";
import {
  categoriasDoTipo,
  DICA_CATEGORIA,
  ROTULO_CATEGORIA_TRANSACAO,
  taxaDaEntrada,
} from "@/lib/domain/caixa";
import { formatarMoeda } from "@/lib/domain/money";
import { errosPorCampo, esquemaTransacao } from "@/lib/domain/schemas";
import type { ContextoMeta } from "@/lib/firebase/mutations/metas";
import {
  arquivarTransacao,
  atualizarTransacao,
  criarTransacao,
} from "@/lib/firebase/mutations/transacoes";
import type {
  CategoriaTransacao,
  Centavos,
  DataISO,
  FormaPagamento,
  TipoTransacao,
  Transacao,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CATEGORIA_PADRAO: Record<TipoTransacao, CategoriaTransacao> = {
  ENTRADA: "VENDA",
  SAIDA: "COMPRA_INSUMO",
};

const TIPOS: {
  valor: TipoTransacao;
  rotulo: string;
  descricao: string;
  icone: typeof ArrowDownLeft;
}[] = [
  {
    valor: "ENTRADA",
    rotulo: "Entrou",
    descricao: "Dinheiro que você recebeu",
    icone: ArrowDownLeft,
  },
  {
    valor: "SAIDA",
    rotulo: "Saiu",
    descricao: "Dinheiro que você gastou",
    icone: ArrowUpRight,
  },
];

interface EstadoLancamento {
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  descricao: string;
  valor: Centavos;
  dataISO: DataISO;
  formaPagamentoId: string;
  recorrente: boolean;
  observacoes: string;
}

function novoLancamento(
  dataPadrao: DataISO,
  formas: FormaPagamento[],
): EstadoLancamento {
  return {
    tipo: "ENTRADA",
    categoria: "VENDA",
    descricao: "",
    valor: 0,
    dataISO: dataPadrao,
    // Vem preenchido com a primeira forma ativa: campo que pode ser sugerido
    // não nasce vazio (`PRODUCT.md`, princípio 1), e uma venda sem forma
    // esconderia a taxa que este módulo existe para mostrar.
    formaPagamentoId: formas.find((forma) => forma.ativo)?.id ?? "",
    recorrente: false,
    observacoes: "",
  };
}

function daTransacao(transacao: Transacao): EstadoLancamento {
  return {
    tipo: transacao.tipo,
    categoria: transacao.categoria,
    descricao: transacao.descricao,
    valor: transacao.valor,
    dataISO: transacao.dataISO,
    formaPagamentoId: transacao.formaPagamentoId ?? "",
    recorrente: transacao.recorrente,
    observacoes: transacao.observacoes ?? "",
  };
}

export function FormularioTransacao({
  aberto,
  aoFechar,
  contaId,
  transacao,
  formas,
  contextoMeta,
  dataPadrao,
  chave: chaveAtual,
}: {
  aberto: boolean;
  aoFechar: () => void;
  contaId: string;
  /** Ausente = lançamento novo. */
  transacao?: Transacao;
  formas: FormaPagamento[];
  /**
   * O que a meta do mês exibido precisa para andar junto com o dinheiro. Vem
   * da tela porque ela já assina a meta e o agregado: assim a escrita não
   * depende de uma leitura, e lançar continua funcionando sem rede.
   */
  contextoMeta: ContextoMeta;
  dataPadrao: DataISO;
  /**
   * Muda a cada abertura. O painel fica montado para poder animar a saída, e
   * sem isto abrir "novo" duas vezes seguidas traria de volta o que ela acabou
   * de lançar.
   */
  chave: string;
}) {
  const idRecorrente = useId();
  const idObservacoes = useId();

  const [estado, setEstado] = useState<EstadoLancamento>(() =>
    transacao ? daTransacao(transacao) : novoLancamento(dataPadrao, formas),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);

  // Reinicia quando o painel abre em outro lançamento, sem efeito e sem
  // reescrever o que ela já começou a digitar no lançamento atual.
  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(
      transacao ? daTransacao(transacao) : novoLancamento(dataPadrao, formas),
    );
    setErros({});
    setFalha(null);
    setConfirmandoArquivo(false);
  }

  const definir = <C extends keyof EstadoLancamento>(
    campo: C,
    valor: EstadoLancamento[C],
  ) => setEstado((anterior) => ({ ...anterior, [campo]: valor }));

  /** Trocar o lado do caixa troca as categorias possíveis junto. */
  function trocarTipo(proximo: TipoTransacao) {
    setEstado((anterior) => {
      if (anterior.tipo === proximo) return anterior;
      const permitidas = categoriasDoTipo(proximo);
      return {
        ...anterior,
        tipo: proximo,
        categoria: permitidas.includes(anterior.categoria)
          ? anterior.categoria
          : CATEGORIA_PADRAO[proximo],
      };
    });
  }

  const ehEntrada = estado.tipo === "ENTRADA";
  const formasAtivas = formas.filter(
    (forma) => forma.ativo || forma.id === estado.formaPagamentoId,
  );

  const taxa = taxaDaEntrada(
    {
      tipo: estado.tipo,
      valor: estado.valor,
      formaPagamentoId: estado.formaPagamentoId || undefined,
    },
    formas,
  );

  function dados() {
    return {
      tipo: estado.tipo,
      categoria: estado.categoria,
      descricao: estado.descricao,
      valor: estado.valor,
      dataISO: estado.dataISO,
      formaPagamentoId: estado.formaPagamentoId || undefined,
      recorrente: estado.recorrente,
      observacoes: estado.observacoes.trim() || undefined,
    };
  }

  async function salvar() {
    const resultado = esquemaTransacao.safeParse(dados());
    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setFalha(null);
    setSalvando(true);
    try {
      if (transacao) {
        await atualizarTransacao(
          contaId,
          transacao,
          resultado.data,
          formas,
          contextoMeta,
        );
      } else {
        await criarTransacao(contaId, resultado.data, formas, contextoMeta);
      }
      setSalvando(false);
      aoFechar();
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!transacao) return;
    setFalha(null);
    setSalvando(true);
    try {
      await arquivarTransacao(contaId, transacao, contextoMeta);
      setSalvando(false);
      aoFechar();
    } catch {
      setFalha("Não foi possível arquivar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={transacao ? "Editar lançamento" : "Novo lançamento"}
      descricao={
        transacao
          ? "Corrigir aqui refaz o resultado do mês na hora."
          : "O que entrou ou saiu do caixa do negócio."
      }
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1" disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={() => void salvar()}
            carregando={salvando}
            className="flex-[1.6]"
          >
            {transacao ? "Salvar" : "Lançar"}
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="text-label font-medium text-ink">
            De que lado do caixa
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {TIPOS.map((opcao) => {
              const ativo = estado.tipo === opcao.valor;
              const Icone = opcao.icone;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => trocarTipo(opcao.valor)}
                  aria-pressed={ativo}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left",
                    "transition-colors duration-150 ease-quart",
                    ativo
                      ? "border-wine-700 bg-wine-100 dark:border-wine-300"
                      : "border-line-strong hover:bg-sunken",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-body font-medium text-ink">
                    <Icone
                      aria-hidden
                      className={cn(
                        "size-4",
                        opcao.valor === "ENTRADA"
                          ? "text-positive"
                          : "text-negative",
                      )}
                      strokeWidth={2}
                    />
                    {opcao.rotulo}
                  </span>
                  <span className="text-micro text-ink-muted">
                    {opcao.descricao}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <CampoMoeda
          rotulo="Valor"
          obrigatorio
          valor={estado.valor}
          aoMudar={(centavos) => definir("valor", centavos)}
          erro={erros.valor}
        />

        <Campo
          rotulo="O que foi"
          required
          value={estado.descricao}
          erro={erros.descricao}
          placeholder={ehEntrada ? "Encomenda da Ana" : "Compra no atacado"}
          onChange={(evento) => definir("descricao", evento.target.value)}
        />

        <Seletor
          rotulo="Categoria"
          value={estado.categoria}
          erro={erros.categoria}
          dica={DICA_CATEGORIA[estado.categoria]}
          onChange={(evento) =>
            definir("categoria", evento.target.value as CategoriaTransacao)
          }
        >
          {categoriasDoTipo(estado.tipo).map((categoria) => (
            <option key={categoria} value={categoria}>
              {ROTULO_CATEGORIA_TRANSACAO[categoria]}
            </option>
          ))}
        </Seletor>

        <Campo
          rotulo="Quando"
          type="date"
          required
          value={estado.dataISO}
          erro={erros.dataISO}
          dica="Mudar para outro mês move o lançamento de mês no painel."
          onChange={(evento) => definir("dataISO", evento.target.value)}
        />

        {/* Só entrada tem forma de pagamento: saída não passa pela maquininha. */}
        {ehEntrada && (
          <div>
            <Seletor
              rotulo="Como você recebeu"
              value={estado.formaPagamentoId}
              onChange={(evento) =>
                definir("formaPagamentoId", evento.target.value)
              }
            >
              <option value="">Não informar</option>
              {formasAtivas.map((forma) => (
                <option key={forma.id} value={forma.id}>
                  {forma.nome}
                </option>
              ))}
            </Seletor>

            {/* Todo número mostra a consequência: aqui, o que de fato cai na
                conta dela depois da taxa (`PRODUCT.md`, princípio 3). */}
            {estado.valor > 0 && estado.formaPagamentoId && (
              <p className="num mt-1.5 text-label text-ink-muted">
                {taxa > 0
                  ? `A maquininha fica com ${formatarMoeda(taxa)}, e sobram ${formatarMoeda(estado.valor - taxa)} para você.`
                  : "Essa forma não cobra taxa: você recebe o valor inteiro."}
              </p>
            )}

            {formasAtivas.length === 0 && (
              <p className="mt-1.5 text-label text-ink-muted">
                Você ainda não cadastrou formas de pagamento.{" "}
                <Link
                  href="/configuracao"
                  className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
                >
                  Cadastrar agora
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-md border border-line-strong px-3 py-3">
          <input
            id={idRecorrente}
            type="checkbox"
            checked={estado.recorrente}
            onChange={(evento) => definir("recorrente", evento.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-wine-700"
          />
          <label htmlFor={idRecorrente} className="text-label text-ink">
            <span className="font-medium">Isso se repete todo mês</span>
            <span className="mt-0.5 block text-ink-muted">
              Fica marcado para você reconhecer o gasto fixo. O lançamento do
              mês que vem continua sendo seu, não do sistema.
            </span>
          </label>
        </div>

        <EnvelopeCampo
          id={idObservacoes}
          rotulo="Observações"
          dica="Opcional. O detalhe que você vai querer lembrar daqui a três meses."
        >
          <textarea
            id={idObservacoes}
            rows={3}
            value={estado.observacoes}
            onChange={(evento) => definir("observacoes", evento.target.value)}
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-body text-ink transition-colors duration-150 ease-quart placeholder:text-ink-subtle"
          />
        </EnvelopeCampo>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {transacao &&
          (confirmandoArquivo ? (
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
              <p className="text-label text-ink">
                Arquivar este lançamento? Ele sai do resultado do mês na hora,
                mas continua guardado — nada é apagado de verdade no caixa.
              </p>
              <div className="mt-3 flex gap-2">
                <Botao
                  tamanho="sm"
                  onClick={() => setConfirmandoArquivo(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="perigo"
                  carregando={salvando}
                  onClick={() => void arquivar()}
                >
                  Arquivar mesmo assim
                </Botao>
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-5">
              <Botao
                variante="perigo"
                tamanho="sm"
                onClick={() => setConfirmandoArquivo(true)}
                iconeInicial={
                  <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Arquivar lançamento
              </Botao>
            </div>
          ))}
      </div>
    </Painel>
  );
}
