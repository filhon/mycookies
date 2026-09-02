"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import type { ZodError } from "zod";
import {
  Archive,
  ArrowLeft,
  Check,
  ChefHat,
  Clock,
  Package,
  Percent,
  Receipt,
  Settings,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { Botao } from "@/components/ui/Botao";
import { BuscaItem, type OpcaoBusca } from "@/components/ui/BuscaItem";
import { Campo, Seletor } from "@/components/ui/Campo";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { LinhaComponenteFicha, LinhaItemFicha } from "./LinhaItemFicha";
import { PainelPreco } from "./PainelPreco";
import {
  custoLinhaComponente,
  custoLinhaItem,
  derivarFicha,
  ehEmbalagem,
  podeSerComponente,
  ROTULO_UNIDADE_RENDIMENTO,
  SEM_RATEIO,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";
import { maiorTaxaAtiva } from "@/lib/domain/custosOperacionais";
import {
  formatarCustoUnitario,
  formatarMoeda,
  parseParaNumero,
} from "@/lib/domain/money";
import type { ParametrosPreco } from "@/lib/domain/precificacao";
import { esquemaFicha } from "@/lib/domain/schemas";
import { paraBase, unidadesCompativeis } from "@/lib/domain/unidades";
import { CONFIGURACAO_SUGERIDA } from "@/lib/firebase/mutations/configuracao";
import {
  arquivarFicha,
  atualizarFicha,
  criarFicha,
  type ComponenteDaFicha,
  type DadosFicha,
  type ItemDaFicha,
} from "@/lib/firebase/mutations/fichas";
import type {
  ConfiguracaoGeral,
  FichaTecnica,
  Insumo,
  MetodoPrecificacao,
  TipoFicha,
  UnidadeCompra,
  UnidadeRendimento,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface LinhaItemForm {
  insumoId: string;
  /** Texto: "1," é um estado legítimo do teclado, e não pode virar zero. */
  quantidade: string;
  unidade: UnidadeCompra;
}

interface LinhaComponenteForm {
  fichaId: string;
  quantidade: string;
}

interface ValoresFicha {
  nome: string;
  categoria: string;
  tipo: TipoFicha;
  rendimento: string;
  unidadeRendimento: UnidadeRendimento;
  tempoProducaoMinutos: string;
  itens: LinhaItemForm[];
  componentes: LinhaComponenteForm[];
  metodo: MetodoPrecificacao;
  markup: string;
  margemDesejada: string;
  taxaCartaoConsiderada: string;
  outrasTaxas: string;
  /** A usuária escreveu o próprio preço, e ele não segue mais o sugerido. */
  precoManual: boolean;
  precoVenda: number;
}

const UNIDADES_RENDIMENTO: UnidadeRendimento[] = ["un", "porcao", "g", "ml"];

const METODOS: { valor: MetodoPrecificacao; titulo: string }[] = [
  { valor: "MARGEM", titulo: "Decidir quanto sobra" },
  { valor: "MARKUP", titulo: "Multiplicar o custo" },
];

const TIPOS: { valor: TipoFicha; titulo: string; explicacao: string }[] = [
  {
    valor: "SIMPLES",
    titulo: "Receita",
    explicacao: "Uma fornada que consome ingredientes e rende N unidades.",
  },
  {
    valor: "KIT",
    titulo: "Kit",
    explicacao: "Uma caixa que junta fichas prontas, mais a embalagem dela.",
  },
];

function texto(numero: number): string {
  return String(numero).replace(".", ",");
}

function valoresIniciais(
  ficha: FichaTecnica | undefined,
  configuracao: ConfiguracaoGeral | null,
): ValoresFicha {
  const padrao =
    configuracao?.precificacao ?? CONFIGURACAO_SUGERIDA.precificacao;

  if (!ficha) {
    return {
      nome: "",
      categoria: "",
      tipo: "SIMPLES",
      // Rendimento e tempo nascem vazios porque não há de onde derivá-los:
      // um palpite aqui vira preço errado com cara de certo.
      rendimento: "",
      unidadeRendimento: "un",
      tempoProducaoMinutos: "",
      itens: [],
      componentes: [],
      metodo: padrao.metodoPadrao,
      markup: texto(padrao.markupPadrao),
      margemDesejada: texto(padrao.margemPadrao),
      taxaCartaoConsiderada: texto(
        maiorTaxaAtiva(configuracao?.formasPagamento ?? []),
      ),
      outrasTaxas: texto(padrao.outrasTaxasPadrao),
      precoManual: false,
      precoVenda: 0,
    };
  }

  return {
    nome: ficha.nome,
    categoria: ficha.categoria,
    tipo: ficha.tipo,
    rendimento: texto(ficha.rendimento),
    unidadeRendimento: ficha.unidadeRendimento,
    tempoProducaoMinutos: texto(ficha.invisiveis.tempoProducaoMinutos),
    itens: ficha.itens.map((item) => ({
      insumoId: item.insumoId,
      quantidade: texto(item.quantidade),
      // A ficha guarda a quantidade em unidade base, e não a unidade em que
      // ela foi digitada: 0,5 kg volta como 500 g. Mesmo peso, outra leitura.
      unidade: item.unidadeBase,
    })),
    componentes: ficha.componentes.map((componente) => ({
      fichaId: componente.fichaId,
      quantidade: texto(componente.quantidade),
    })),
    metodo: ficha.precificacao.metodo,
    markup: texto(ficha.precificacao.markup ?? padrao.markupPadrao),
    margemDesejada: texto(
      ficha.precificacao.margemDesejada ?? padrao.margemPadrao,
    ),
    taxaCartaoConsiderada: texto(ficha.precificacao.taxaCartaoConsiderada),
    outrasTaxas: texto(ficha.precificacao.outrasTaxas),
    // O preço salvo é decisão tomada: ele não se mexe sozinho quando o custo
    // de um insumo muda. O painel oferece o novo sugerido; ela escolhe.
    precoManual: true,
    precoVenda: ficha.precificacao.precoVenda,
  };
}

export function FormularioFicha({
  contaId,
  ficha,
  insumos,
  fichas,
  configuracao,
  pendente,
}: {
  contaId: string;
  ficha?: FichaTecnica;
  insumos: Insumo[];
  fichas: FichaTecnica[];
  configuracao: ConfiguracaoGeral | null;
  pendente: boolean;
}) {
  const router = useRouter();
  const form = useForm<ValoresFicha>({
    defaultValues: valoresIniciais(ficha, configuracao),
  });

  const listaItens = useFieldArray({ control: form.control, name: "itens" });
  const listaComponentes = useFieldArray({
    control: form.control,
    name: "componentes",
  });

  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);

  /**
   * `useWatch`, e não `form.watch()`: o compilador do React não consegue
   * memoizar com segurança o que `useForm()` devolve e desiste do componente
   * inteiro. O tipo vem parcial porque a biblioteca não sabe que todo campo
   * nasce com valor — e todos nascem, em `valoresIniciais`.
   */
  const valores = useWatch({ control: form.control }) as ValoresFicha;

  const mapaInsumos = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );
  const mapaFichas = useMemo(
    () => new Map(fichas.map((candidata) => [candidata.id, candidata])),
    [fichas],
  );
  // Um insumo arquivado depois de entrar na receita some da consulta. O nome
  // continua na própria ficha, e é dele que a linha vive até ela decidir.
  const snapshotItens = useMemo(
    () => new Map((ficha?.itens ?? []).map((item) => [item.insumoId, item])),
    [ficha],
  );
  const snapshotComponentes = useMemo(
    () =>
      new Map((ficha?.componentes ?? []).map((item) => [item.fichaId, item])),
    [ficha],
  );

  const categoriasConhecidas = useMemo(
    () =>
      [
        ...new Set(
          fichas.map((candidata) => candidata.categoria).filter(Boolean),
        ),
      ].sort(),
    [fichas],
  );

  const ehKit = valores.tipo === "KIT";

  /** A linha do formulário resolvida contra o insumo de agora. */
  function resolverItem(linha: LinhaItemForm): ItemDaFicha & {
    arquivado: boolean;
    unidades: UnidadeCompra[];
  } {
    const insumo = mapaInsumos.get(linha.insumoId);
    const guardado = snapshotItens.get(linha.insumoId);
    const unidadeBase = insumo?.unidadeBase ?? guardado?.unidadeBase ?? "un";
    const digitada = parseParaNumero(linha.quantidade);

    return {
      insumoId: linha.insumoId,
      nomeSnapshot: insumo?.nome ?? guardado?.nomeSnapshot ?? "Insumo removido",
      categoria: insumo?.categoria ?? guardado?.categoria ?? "OUTRO",
      quantidade: paraBase(digitada, linha.unidade),
      unidadeBase,
      custoUnidadeBaseCorrigido: insumo?.custoUnidadeBaseCorrigido ?? 0,
      arquivado: !insumo,
      unidades: unidadesCompativeis(unidadeBase),
    };
  }

  function resolverComponente(linha: LinhaComponenteForm): ComponenteDaFicha & {
    arquivado: boolean;
  } {
    const componente = mapaFichas.get(linha.fichaId);
    const guardado = snapshotComponentes.get(linha.fichaId);

    return {
      fichaId: linha.fichaId,
      nomeSnapshot:
        componente?.nome ?? guardado?.nomeSnapshot ?? "Ficha removida",
      quantidade: parseParaNumero(linha.quantidade),
      custoUnitarioSnapshot: componente?.custoUnitario ?? 0,
      arquivado: !componente,
    };
  }

  const itensResolvidos = valores.itens.map(resolverItem);
  const componentesResolvidos = ehKit
    ? valores.componentes.map(resolverComponente)
    : [];

  const operacional: RateioOperacional =
    configuracao?.operacional ?? SEM_RATEIO;
  const rateioZerado =
    operacional.valorHoraTrabalho +
      operacional.custoEnergiaHora +
      operacional.custoGasHora +
      operacional.custoIndiretoPorHora ===
    0;

  const precificacao: ParametrosPreco = {
    metodo: valores.metodo,
    markup: parseParaNumero(valores.markup),
    margemDesejada: parseParaNumero(valores.margemDesejada),
    taxaCartaoConsiderada: parseParaNumero(valores.taxaCartaoConsiderada),
    outrasTaxas: parseParaNumero(valores.outrasTaxas),
    arredondamento:
      configuracao?.precificacao.arredondamento ??
      CONFIGURACAO_SUGERIDA.precificacao.arredondamento,
  };

  const rendimento = parseParaNumero(valores.rendimento);

  const derivado = derivarFicha({
    itens: itensResolvidos,
    componentes: componentesResolvidos,
    tempoProducaoMinutos: parseParaNumero(valores.tempoProducaoMinutos),
    rendimento,
    operacional,
    precificacao,
    precoVenda: valores.precoManual ? valores.precoVenda : null,
  });

  // O tipo de `errors` para lista de campos é uma união de "erro da lista" e
  // "erros por linha". Uma leitura tipada, e o resto do arquivo fica limpo.
  const errosItens = form.formState.errors.itens as
    { quantidade?: { message?: string } }[] | { message?: string } | undefined;
  const errosComponentes = form.formState.errors.componentes as
    { quantidade?: { message?: string } }[] | { message?: string } | undefined;

  const erroDaLista = (erros: typeof errosItens): string | undefined =>
    Array.isArray(erros) ? undefined : erros?.message;

  const erroDaLinha = (
    erros: typeof errosItens,
    indice: number,
  ): string | undefined =>
    Array.isArray(erros) ? erros[indice]?.quantidade?.message : undefined;

  const opcoesInsumo: OpcaoBusca[] = insumos
    .filter((insumo) => !valores.itens.some((l) => l.insumoId === insumo.id))
    // Em um kit, o bloco de insumos aceita só a embalagem do próprio kit.
    .filter((insumo) => !ehKit || ehEmbalagem(insumo.categoria))
    .map((insumo) => ({
      id: insumo.id,
      nome: insumo.nome,
      nomeBusca: insumo.nomeBusca,
      detalhe: `${formatarCustoUnitario(insumo.custoUnidadeBaseCorrigido)} por ${insumo.unidadeBase}`,
    }));

  const opcoesComponente: OpcaoBusca[] = fichas
    .filter((candidata) => podeSerComponente(candidata, ficha?.id))
    .filter(
      (candidata) =>
        !valores.componentes.some((l) => l.fichaId === candidata.id),
    )
    .map((candidata) => ({
      id: candidata.id,
      nome: candidata.nome,
      nomeBusca: candidata.nomeBusca,
      detalhe: `${formatarMoeda(candidata.custoUnitario)} de custo por unidade`,
    }));

  function adicionarInsumo(insumoId: string) {
    const insumo = mapaInsumos.get(insumoId);
    if (!insumo) return;
    const unidades = unidadesCompativeis(insumo.unidadeBase);
    listaItens.append({
      insumoId,
      quantidade: "",
      unidade: unidades[0] ?? "un",
    });
  }

  function adicionarComponente(fichaId: string) {
    listaComponentes.append({ fichaId, quantidade: "1" });
  }

  /**
   * Trocar o tipo muda o que a ficha pode conter, e a tela diz o que saiu em
   * vez de descartar em silêncio. Nada disso toca o banco até ela salvar.
   */
  function trocarTipo(proximo: TipoFicha) {
    if (proximo === valores.tipo) return;
    form.setValue("tipo", proximo);

    if (proximo === "KIT") {
      const mantidos = valores.itens.filter((linha) => {
        const insumo = mapaInsumos.get(linha.insumoId);
        return insumo ? ehEmbalagem(insumo.categoria) : false;
      });
      const removidos = valores.itens.length - mantidos.length;
      form.setValue("itens", mantidos);
      if (!valores.rendimento) form.setValue("rendimento", "1");
      setAviso(
        removidos > 0
          ? `Um kit não leva ingrediente solto: ${removidos} ${removidos === 1 ? "item saiu" : "itens saíram"} da lista, e só a embalagem ficou.`
          : null,
      );
      return;
    }

    const tinhaComponentes = valores.componentes.length;
    form.setValue("componentes", []);
    setAviso(
      tinhaComponentes > 0
        ? `Uma receita não leva outras fichas dentro: ${tinhaComponentes === 1 ? "a ficha que estava" : `as ${tinhaComponentes} fichas que estavam`} no kit ${tinhaComponentes === 1 ? "saiu" : "saíram"} da lista.`
        : null,
    );
  }

  function aplicarErros(erro: ZodError) {
    for (const problema of erro.issues) {
      const caminho = problema.path.join(".");
      if (!caminho) continue;
      form.setError(caminho as FieldPath<ValoresFicha>, {
        message: problema.message,
      });
    }
  }

  async function salvar() {
    setFalha(null);
    form.clearErrors();

    const resultado = esquemaFicha.safeParse({
      nome: valores.nome,
      categoria: valores.categoria,
      tipo: valores.tipo,
      rendimento,
      unidadeRendimento: valores.unidadeRendimento,
      tempoProducaoMinutos: parseParaNumero(valores.tempoProducaoMinutos),
      // Validado na mesma ordem das linhas do formulário, para que a mensagem
      // caia na linha certa.
      itens: itensResolvidos.map((item) => ({
        insumoId: item.insumoId,
        quantidade: item.quantidade,
      })),
      componentes: componentesResolvidos.map((componente) => ({
        fichaId: componente.fichaId,
        quantidade: componente.quantidade,
      })),
      ...precificacao,
      precoVenda: derivado.precoVenda,
    });

    if (!resultado.success) {
      aplicarErros(resultado.error);
      return;
    }

    // Insumo arquivado não tem preço, e gravar assim publicaria um custo que
    // finge estar completo. A linha já diz qual é; aqui o salvamento para.
    if (
      itensResolvidos.some((item) => item.arquivado) ||
      componentesResolvidos.some((componente) => componente.arquivado)
    ) {
      setFalha(
        "Há um item arquivado nesta ficha. Tire-o da lista ou reative o cadastro dele: sem preço, ele entraria no custo como zero.",
      );
      return;
    }

    // A guarda do preço vem depois da validação de campo: primeiro o que está
    // errado no formulário, depois o que é impossível na conta.
    if (derivado.motivoSemPreco) {
      setFalha(
        "A margem que você pediu mais as taxas passam de 100% do preço. Ajuste no bloco de preço e salve de novo.",
      );
      return;
    }

    const dados: DadosFicha = {
      nome: valores.nome,
      categoria: valores.categoria,
      tipo: valores.tipo,
      rendimento,
      unidadeRendimento: valores.unidadeRendimento,
      tempoProducaoMinutos: parseParaNumero(valores.tempoProducaoMinutos),
      itens: itensResolvidos,
      componentes: componentesResolvidos,
      operacional,
      precificacao,
      precoVenda: derivado.precoVenda,
    };

    setSalvando(true);
    try {
      if (ficha) await atualizarFicha(contaId, ficha.id, dados);
      else await criarFicha(contaId, dados);
      router.push("/fichas");
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!ficha) return;
    setFalha(null);
    setSalvando(true);
    try {
      await arquivarFicha(contaId, ficha.id);
      router.push("/fichas");
    } catch {
      setFalha("Não foi possível arquivar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  const titulo = valores.nome.trim() || (ficha ? ficha.nome : "Nova ficha");

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 pb-3 pt-3 lg:-mx-8 lg:px-8 lg:pb-4 lg:pt-6">
        <Link
          href="/fichas"
          className="toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          Fichas técnicas
        </Link>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-display text-title font-semibold text-ink lg:text-display">
            {titulo}
          </h1>
          <div className="flex shrink-0 items-center gap-3">
            <SeloSincronizacao pendente={pendente} />
            <Botao
              variante="primaria"
              onClick={() => void salvar()}
              carregando={salvando}
            >
              Salvar
            </Botao>
          </div>
        </div>
      </header>

      {/* Espaço no pé para o painel de preço não cobrir o último bloco. */}
      <div className="mt-4 space-y-4 pb-44 lg:pb-40">
        {rateioZerado && (
          <Faixa tom="atencao">
            <p>
              Seu tempo de trabalho, o gás e as despesas fixas ainda não entram
              neste preço: o rateio está zerado. O custo abaixo é só o dos
              insumos.
            </p>
            <Link
              href="/configuracao"
              className="toque mt-2 inline-flex items-center gap-1.5 rounded-md text-label font-semibold text-wine-700 underline underline-offset-2 dark:text-wine-300"
            >
              <Settings aria-hidden className="size-4" strokeWidth={1.75} />
              Informar meus custos operacionais
            </Link>
          </Faixa>
        )}

        {ficha?.custoDesatualizado && (
          <Faixa tom="atencao">
            <p>
              O preço de um insumo desta ficha mudou depois do último cálculo.
              Os números aqui já são os de agora — salve para gravá-los e tirar
              o aviso.
            </p>
            <Botao
              tamanho="sm"
              className="mt-2"
              onClick={() => void salvar()}
              carregando={salvando}
            >
              Recalcular e salvar
            </Botao>
          </Faixa>
        )}

        <Bloco
          icone={Tag}
          titulo="O produto"
          descricao="Como ele aparece na hora de montar um pedido."
        >
          <fieldset>
            <legend className="text-label font-medium text-ink">
              O que você está montando
            </legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {TIPOS.map((opcao) => {
                const ativo = valores.tipo === opcao.valor;
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => trocarTipo(opcao.valor)}
                    className={cn(
                      "rounded-md border p-3 text-left transition-colors duration-150 ease-quart",
                      ativo
                        ? "border-wine-700 bg-wine-100"
                        : "border-line-strong hover:bg-sunken",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
                      {ativo && (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-wine-700 dark:text-wine-300"
                          strokeWidth={2}
                        />
                      )}
                      {opcao.titulo}
                    </span>
                    <span className="mt-1 block text-label text-ink-muted">
                      {opcao.explicacao}
                    </span>
                  </button>
                );
              })}
            </div>
            {aviso && (
              <p
                role="status"
                className="mt-2 text-label text-ink-muted"
                aria-live="polite"
              >
                {aviso}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome"
              required
              autoFocus={!ficha}
              placeholder="Cookie de chocolate meio amargo"
              erro={form.formState.errors.nome?.message}
              {...form.register("nome")}
            />

            <Campo
              rotulo="Categoria"
              list="categorias-de-ficha"
              placeholder="Cookie"
              dica="Serve para agrupar na lista e no relatório de vendas."
              erro={form.formState.errors.categoria?.message}
              {...form.register("categoria")}
            />
          </div>
          <datalist id="categorias-de-ficha">
            {categoriasConhecidas.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
        </Bloco>

        <Bloco
          icone={Clock}
          titulo="Rendimento e tempo"
          descricao="Quanto sai de um lote e quanto tempo ele toma do começo ao fim: forno, bancada e embalagem."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <Campo
                rotulo="Rende"
                required
                inputMode="decimal"
                placeholder="20"
                erro={form.formState.errors.rendimento?.message}
                {...form.register("rendimento")}
              />
              <Seletor rotulo="Em" {...form.register("unidadeRendimento")}>
                {UNIDADES_RENDIMENTO.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {ROTULO_UNIDADE_RENDIMENTO[unidade]}
                  </option>
                ))}
              </Seletor>
            </div>

            <Campo
              rotulo="Tempo de produção"
              inputMode="decimal"
              sufixo="min"
              placeholder="90"
              erro={form.formState.errors.tempoProducaoMinutos?.message}
              dica="É o que paga a sua hora, o gás e a luz."
              {...form.register("tempoProducaoMinutos")}
            />
          </div>
        </Bloco>

        {ehKit && (
          <Bloco
            icone={ChefHat}
            titulo="O que vai no kit"
            descricao="As fichas prontas que entram nesta caixa. Um kit não leva outro kit dentro."
            recuado={false}
          >
            <div className="lg:ml-8">
              <BuscaItem
                rotulo="Adicionar ficha ao kit"
                placeholder="Buscar receita"
                opcoes={opcoesComponente}
                aoEscolher={adicionarComponente}
                semResultado="Nenhuma receita com esse nome. Só fichas do tipo receita podem entrar em um kit."
              />
            </div>

            <ListaDeLinhas
              vazio="Nenhuma ficha no kit ainda. Busque acima e toque para adicionar."
              erro={erroDaLista(errosComponentes)}
              quantidade={listaComponentes.fields.length}
            >
              {listaComponentes.fields.map((campo, indice) => {
                const componente = componentesResolvidos[indice];
                if (!componente) return null;
                return (
                  <LinhaComponenteFicha
                    key={campo.id}
                    nome={componente.nomeSnapshot}
                    custoUnitario={componente.custoUnitarioSnapshot}
                    custoLinha={custoLinhaComponente(componente)}
                    campoQuantidade={form.register(
                      `componentes.${indice}.quantidade`,
                    )}
                    aoRemover={() => listaComponentes.remove(indice)}
                    erro={
                      componente.arquivado
                        ? "Esta ficha foi arquivada e não tem mais custo. Tire-a do kit ou reative o cadastro."
                        : erroDaLinha(errosComponentes, indice)
                    }
                  />
                );
              })}
            </ListaDeLinhas>
          </Bloco>
        )}

        <Bloco
          icone={ehKit ? Package : ChefHat}
          titulo={ehKit ? "Embalagem do kit" : "O que vai dentro"}
          descricao={
            ehKit
              ? "A caixa, o laço e a etiqueta do próprio kit."
              : "Ingredientes e embalagem, na quantidade que um lote consome."
          }
          recuado={false}
        >
          <div className="lg:ml-8">
            <BuscaItem
              rotulo={ehKit ? "Adicionar embalagem" : "Adicionar insumo"}
              placeholder={ehKit ? "Buscar embalagem" : "Buscar insumo"}
              opcoes={opcoesInsumo}
              aoEscolher={adicionarInsumo}
              semResultado={
                ehKit
                  ? "Nenhuma embalagem com esse nome. Cadastre-a em Insumos, na categoria Embalagem."
                  : "Nenhum insumo com esse nome. Cadastre-o em Insumos primeiro."
              }
            />
          </div>

          <ListaDeLinhas
            vazio={
              ehKit
                ? "Sem embalagem, o kit sai pelo custo das fichas de dentro."
                : "Nenhum insumo ainda. Busque acima e toque para adicionar."
            }
            erro={erroDaLista(errosItens)}
            quantidade={listaItens.fields.length}
          >
            {listaItens.fields.map((campo, indice) => {
              const item = itensResolvidos[indice];
              if (!item) return null;
              return (
                <LinhaItemFicha
                  key={campo.id}
                  nome={item.nomeSnapshot}
                  ehEmbalagem={ehEmbalagem(item.categoria)}
                  unidades={item.unidades}
                  custoLinha={custoLinhaItem(item)}
                  campoQuantidade={form.register(`itens.${indice}.quantidade`)}
                  campoUnidade={form.register(`itens.${indice}.unidade`)}
                  aoRemover={() => listaItens.remove(indice)}
                  erro={
                    item.arquivado
                      ? "Este insumo foi arquivado e não tem mais preço. Tire-o da ficha ou reative o cadastro."
                      : erroDaLinha(errosItens, indice)
                  }
                />
              );
            })}
          </ListaDeLinhas>
        </Bloco>

        <Bloco
          icone={Receipt}
          titulo="O custo do lote"
          descricao="A conta que a sua concorrente não fez."
        >
          {/* Recibo, não tabela: a coluna para antes da borda para o rótulo e o
              valor não ficarem em pontas opostas da tela. */}
          <dl className="max-w-xl space-y-2 text-label">
            <Parcela rotulo="Insumos" valor={derivado.custo.custoInsumos} />
            <Parcela rotulo="Embalagem" valor={derivado.custo.custoEmbalagem} />
            {ehKit && (
              <Parcela
                rotulo="Fichas de dentro"
                valor={derivado.custo.custoComponentes}
              />
            )}
            <Parcela
              rotulo="Seu trabalho"
              valor={derivado.custo.custoMaoDeObra}
            />
            <Parcela
              rotulo="Energia e gás"
              valor={derivado.custo.custoEnergiaGas}
            />
            <Parcela
              rotulo="Fatia das despesas fixas"
              valor={derivado.custo.custoIndireto}
            />

            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
              <dt className="font-medium text-ink">Custo do lote inteiro</dt>
              <dd>
                <Dinheiro centavos={derivado.custo.custoTotalLote} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">
                Dividido por {rendimento > 0 ? texto(rendimento) : "—"}{" "}
                {ROTULO_UNIDADE_RENDIMENTO[valores.unidadeRendimento]}
              </dt>
              <dd>
                <Dinheiro centavos={derivado.custo.custoUnitario} />
              </dd>
            </div>
          </dl>
        </Bloco>

        <Bloco
          icone={Percent}
          titulo="Como calcular o preço"
          descricao="A taxa entra aqui porque ela sai do seu lucro, não do bolso da cliente."
        >
          <fieldset>
            <legend className="text-label font-medium text-ink">Método</legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {METODOS.map((metodo) => {
                const ativo = valores.metodo === metodo.valor;
                return (
                  <button
                    key={metodo.valor}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => form.setValue("metodo", metodo.valor)}
                    className={cn(
                      "toque rounded-md border px-3 text-left text-label font-semibold transition-colors duration-150 ease-quart",
                      ativo
                        ? "border-wine-700 bg-wine-100 text-ink"
                        : "border-line-strong text-ink hover:bg-sunken",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {ativo && (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-wine-700 dark:text-wine-300"
                          strokeWidth={2}
                        />
                      )}
                      {metodo.titulo}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            {valores.metodo === "MARGEM" ? (
              <Campo
                rotulo="Quero que sobre"
                inputMode="decimal"
                sufixo="%"
                dica="Do preço de venda, depois de descontar custo e taxas."
                erro={form.formState.errors.margemDesejada?.message}
                {...form.register("margemDesejada")}
              />
            ) : (
              <Campo
                rotulo="Multiplico o custo por"
                inputMode="decimal"
                sufixo="×"
                erro={form.formState.errors.markup?.message}
                {...form.register("markup")}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Taxa de cartão"
              inputMode="decimal"
              sufixo="%"
              dica="A maior das suas formas de pagamento: o preço que fecha nela fecha em todas."
              erro={form.formState.errors.taxaCartaoConsiderada?.message}
              {...form.register("taxaCartaoConsiderada")}
            />
            <Campo
              rotulo="Outras taxas"
              inputMode="decimal"
              sufixo="%"
              dica="Imposto ou comissão de aplicativo. Se não tem, deixe zero."
              erro={form.formState.errors.outrasTaxas?.message}
              {...form.register("outrasTaxas")}
            />
          </div>
        </Bloco>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {ficha &&
          (confirmandoArquivo ? (
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
              <p className="text-label text-ink">
                Arquivar <strong className="font-semibold">{ficha.nome}</strong>
                ? Ela sai da lista e da busca, mas continua nos pedidos antigos
                e nos kits que a usam, para o histórico de custo não se perder.
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
                Arquivar ficha
              </Botao>
            </div>
          ))}
      </div>

      <PainelPreco
        derivado={derivado}
        precoManual={valores.precoManual}
        rendimentoValido={rendimento > 0}
        aoMudarPreco={(centavos) => {
          form.setValue("precoManual", true);
          form.setValue("precoVenda", centavos);
        }}
        aoUsarSugerido={() => form.setValue("precoManual", false)}
      />
    </>
  );
}

function Faixa({ tom, children }: { tom: "atencao"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-4 text-label",
        tom === "atencao" && "border-attention/30 bg-attention-soft text-ink",
      )}
    >
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-attention"
        strokeWidth={1.75}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A lista de itens sangra até a borda do bloco, como toda lista do app. */
function ListaDeLinhas({
  quantidade,
  vazio,
  erro,
  children,
}: {
  quantidade: number;
  vazio: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div className="-mx-4 lg:-mx-5">
      {quantidade === 0 ? (
        <p className="px-4 text-label text-ink-muted lg:px-5">{vazio}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {children}
        </ul>
      )}
      {erro && (
        <p role="alert" className="mt-3 px-4 text-label text-negative lg:px-5">
          {erro}
        </p>
      )}
    </div>
  );
}

function Parcela({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="num font-medium text-ink">{formatarMoeda(valor)}</dd>
    </div>
  );
}
