"use client";

import type { Route } from "next";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import type { ZodError } from "zod";
import {
  Archive,
  Check,
  ChefHat,
  ChevronDown,
  CookingPot,
  Copy,
  Hand,
  ListOrdered,
  Package,
  Percent,
  Plus,
  Receipt,
  Settings,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { Bloco } from "@/components/ui/Bloco";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { AvisosDoPreco } from "./AvisosDoPreco";
import { BuscaItem, type OpcaoBusca } from "@/components/ui/BuscaItem";
import {
  AreaTexto,
  Campo,
  focarPrimeiroErro,
  Seletor,
} from "@/components/ui/Campo";
import { CampoImagem } from "@/components/ui/CampoImagem";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { useGuardaDeSaida } from "@/components/ui/useGuardaDeSaida";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { EntradaContagemPronto } from "@/components/producao/EntradaContagemPronto";
import { FornadasRecentes } from "@/components/producao/FornadasRecentes";
import { FraseDoPronto } from "@/components/producao/FraseDaCapacidade";
import { FraseDaQuebra } from "@/components/producao/FraseDaQuebra";
import { PainelFornada } from "@/components/producao/PainelFornada";
import {
  CabecalhoItensFicha,
  LinhaComponenteFicha,
  LinhaEscolhaFicha,
  LinhaItemFicha,
} from "./LinhaItemFicha";
import { FaixaDeComposicao, Parcela } from "./FaixaDeComposicao";
import { palavraSobra } from "./LinhaFicha";
import { PainelPreco } from "./PainelPreco";
import { insumosComPrecoMedio } from "@/lib/domain/biblioteca";
import {
  composicaoDoLote,
  custoDasEscolhas,
  custoLinhaComponente,
  custoLinhaItem,
  custoParaComponente,
  derivarFicha,
  ehEmbalagem,
  ehPreparo,
  fraseDaMassa,
  opcoesDaEscolha,
  osQueMaisPesam,
  parteDoCusto,
  podeSerComponente,
  ROTULO_PARCELA,
  ROTULO_PREPAROS,
  ROTULO_UNIDADE_RENDIMENTO,
  rotuloDaQuantidade,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";
import {
  formatarCustoUnitario,
  formatarMoeda,
  parseParaNumero,
} from "@/lib/domain/money";
import {
  FOTO_COM_ALPHA_MAX_BYTES,
  FOTO_LADO_PX,
  FOTO_MAX_BYTES,
} from "@/lib/domain/orcamento";
import {
  conferirPrecificacao,
  verificarPreco,
  type AvisoPrecificacao,
  type ParametrosPreco,
} from "@/lib/domain/precificacao";
import {
  projecaoDoPronto,
  quebraDaFicha,
  temPronto,
} from "@/lib/domain/producao";
import { DESCRICAO_MAX, esquemaFicha, PREPARO_MAX } from "@/lib/domain/schemas";
import { basesQueNaoBatem } from "@/lib/domain/custoInsumo";
import {
  paraBase,
  PLURAL_UNIDADE_BASE,
  unidadesCompativeis,
} from "@/lib/domain/unidades";
import {
  CONFIGURACAO_SUGERIDA,
  precificacaoPadraoDaConta,
  rateioDaConta,
} from "@/lib/firebase/mutations/configuracao";
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
  DataISO,
  EscolhaDoKit,
  FichaTecnica,
  Fornada,
  Insumo,
  MetodoPrecificacao,
  TipoFicha,
  UnidadeCompra,
  UnidadeRendimento,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { novoId } from "@/lib/utils/id";

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

interface LinhaEscolhaForm {
  quantidade: string;
  categoria: string;
}

interface ValoresFicha {
  nome: string;
  categoria: string;
  descricao: string;
  modoPreparo: string;
  /** O `data:` URL já reduzido, ou `null` sem foto (`DECISOES.md#d109`). */
  fotoUrl: string | null;
  tipo: TipoFicha;
  rendimento: string;
  unidadeRendimento: UnidadeRendimento;
  fornadasMinimas: string;
  tempoProducaoMinutos: string;
  itens: LinhaItemForm[];
  componentes: LinhaComponenteForm[];
  escolhas: LinhaEscolhaForm[];
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
    explicacao:
      "Uma caixa que junta produtos prontos, ou um combo em que a cliente escolhe os sabores. Mais a embalagem dela.",
  },
];

function texto(numero: number): string {
  return String(numero).replace(".", ",");
}

function valoresIniciais(
  ficha: FichaTecnica | undefined,
  configuracao: ConfiguracaoGeral | null,
  origem?: FichaTecnica,
): ValoresFicha {
  const padrao =
    configuracao?.precificacao ?? CONFIGURACAO_SUGERIDA.precificacao;

  // A variação é a origem com outro nome (`#d344`). Sem reserva, porque ligada
  // ela faz a lista de compras crescer sem pedido (`#d96`), e sem o preço
  // manual: o preço da origem não vale para outra receita.
  if (!ficha && origem) {
    return {
      ...valoresIniciais(origem, configuracao),
      nome: `${origem.nome} (variação)`,
      fornadasMinimas: "0",
      precoManual: false,
      precoVenda: 0,
    };
  }

  if (!ficha) {
    // A mesma função que a biblioteca usa para montar a ficha-modelo
    // (`DECISOES.md#d114`): salvo, senão sugerido, número por número.
    const precificacao = precificacaoPadraoDaConta(configuracao);
    return {
      nome: "",
      categoria: "",
      descricao: "",
      modoPreparo: "",
      fotoUrl: null,
      tipo: "SIMPLES",
      // Rendimento e tempo nascem vazios porque não há de onde derivá-los:
      // um palpite aqui vira preço errado com cara de certo.
      rendimento: "",
      unidadeRendimento: "un",
      // Zero de propósito: piso ligado é a única coisa que faz a lista de
      // compras crescer sem pedido atrás, e nada deve mudar até ela pedir.
      fornadasMinimas: "0",
      tempoProducaoMinutos: "",
      itens: [],
      componentes: [],
      escolhas: [],
      metodo: precificacao.metodo,
      markup: texto(precificacao.markup),
      margemDesejada: texto(precificacao.margemDesejada),
      taxaCartaoConsiderada: texto(precificacao.taxaCartaoConsiderada),
      outrasTaxas: texto(precificacao.outrasTaxas),
      precoManual: false,
      precoVenda: 0,
    };
  }

  return {
    nome: ficha.nome,
    categoria: ficha.categoria,
    descricao: ficha.descricao ?? "",
    modoPreparo: ficha.modoPreparo ?? "",
    fotoUrl: ficha.fotoUrl ?? null,
    tipo: ficha.tipo,
    rendimento: texto(ficha.rendimento),
    unidadeRendimento: ficha.unidadeRendimento,
    fornadasMinimas: texto(ficha.fornadasMinimas ?? 0),
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
    escolhas: (ficha.escolhas ?? []).map((escolha) => ({
      quantidade: texto(escolha.quantidade),
      categoria: escolha.categoria,
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
  origem,
  insumos,
  fichas,
  fornadas,
  hoje,
  configuracao,
  pendente,
}: {
  contaId: string;
  ficha?: FichaTecnica;
  /** A ficha de que esta nova é variação: só preenche, nada mais (`#d344`). */
  origem?: FichaTecnica;
  insumos: Insumo[];
  fichas: FichaTecnica[];
  /** As fornadas recentes, para a folha de registrar projetar a despensa. */
  fornadas: Fornada[];
  hoje: DataISO;
  configuracao: ConfiguracaoGeral | null;
  pendente: boolean;
}) {
  const [iniciais] = useState(() =>
    valoresIniciais(ficha, configuracao, origem),
  );
  const form = useForm<ValoresFicha>({ defaultValues: iniciais });

  // A bancada sem preparo manda para `#como-se-faz` (`#d347`): o bloco no
  // alto da tela e o cursor no campo, e não o topo do editor.
  useEffect(() => {
    if (location.hash !== "#como-se-faz") return;
    document.getElementById("como-se-faz")?.scrollIntoView({ block: "start" });
    form.setFocus("modoPreparo");
  }, [form]);

  const listaItens = useFieldArray({ control: form.control, name: "itens" });
  const listaComponentes = useFieldArray({
    control: form.control,
    name: "componentes",
  });
  const listaEscolhas = useFieldArray({
    control: form.control,
    name: "escolhas",
  });

  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  const [fornada, setFornada] = useState<{ aberto: boolean; chave: string }>({
    aberto: false,
    chave: "fechado",
  });

  // A fornada é da ficha **gravada**, e não do que está sendo digitado: o que
  // sai da despensa é o que a receita salva diz, e uma receita pela metade não
  // vira massa. Sem rendimento não há lote a contar.
  const podeAssar =
    !!ficha &&
    ficha.rendimento > 0 &&
    ficha.itens.length + ficha.componentes.length > 0;
  // A bancada é da receita com o que pesar (`#d343`): kit não tem receita.
  const temBancada =
    !!ficha &&
    ficha.tipo === "SIMPLES" &&
    ficha.itens.length + ficha.componentes.length > 0;
  const fornadasDaFicha = useMemo(
    () => fornadas.filter((atual) => atual.fichaId === ficha?.id),
    [fornadas, ficha],
  );
  // O que está pronto desta ficha, sem tirar pedido: a tela do produto diz o
  // que há no pote; quem desconta pedido é `/fichas` e o editor de pedido.
  const pronto = useMemo(
    () =>
      ficha && temPronto(ficha)
        ? projecaoDoPronto(fornadas, ficha, hoje)
        : null,
    [fornadas, ficha, hoje],
  );
  const quebra = useMemo(
    () => (ficha ? quebraDaFicha(fornadas, ficha.id) : null),
    [fornadas, ficha],
  );

  /**
   * `useWatch`, e não `form.watch()`: o compilador do React não consegue
   * memoizar com segurança o que `useForm()` devolve e desiste do componente
   * inteiro. O tipo vem parcial porque a biblioteca não sabe que todo campo
   * nasce com valor — e todos nascem, em `valoresIniciais`.
   */
  const valores = useWatch({ control: form.control }) as ValoresFicha;
  // A variação nasce suja: preenchida não é gravada, e sair sem salvar perde.
  const sujo = !!origem || JSON.stringify(valores) !== JSON.stringify(iniciais);
  const guarda = useGuardaDeSaida(sujo);

  const mapaInsumos = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );
  const mapaFichas = useMemo(
    () => new Map(fichas.map((candidata) => [candidata.id, candidata])),
    [fichas],
  );
  // Um insumo arquivado depois de entrar na receita some da consulta. O nome
  // continua na própria ficha (ou na origem da variação), e é dele que a linha
  // vive até ela decidir.
  const guardada = ficha ?? origem;
  const snapshotItens = useMemo(
    () => new Map((guardada?.itens ?? []).map((item) => [item.insumoId, item])),
    [guardada],
  );
  const snapshotComponentes = useMemo(
    () =>
      new Map(
        (guardada?.componentes ?? []).map((item) => [item.fichaId, item]),
      ),
    [guardada],
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
  // A receita leva preparo; o preparo, não (`#d345`).
  const levaPreparo = !ehKit && !ehPreparo(valores);

  // Abre sobre o que é dela. A categoria fica de fora de propósito: a
  // ficha-modelo da biblioteca vem com "Cookies" e é a primeira tela que
  // ela vê (`DECISOES.md#d116`).
  const temMaisDetalhes =
    !!guardada &&
    (guardada.tipo === "KIT" ||
      (!!ficha && (ficha.fornadasMinimas ?? 0) > 0) ||
      !!guardada.descricao ||
      !!guardada.fotoUrl);
  const erroNosDetalhes = !!(
    form.formState.errors.tipo ||
    form.formState.errors.categoria ||
    form.formState.errors.fornadasMinimas ||
    form.formState.errors.descricao
  );

  /** As categorias que uma escolha pode apontar: as das receitas que servem. */
  const categoriasDeEscolha = useMemo(
    () =>
      [
        ...new Set(
          fichas
            .filter((candidata) => podeSerComponente(candidata, ficha?.id))
            .map((candidata) => candidata.categoria)
            .filter(Boolean),
        ),
      ].sort(),
    [fichas, ficha],
  );

  // O material contado numa base que as receitas não usam (spec 188), com a
  // base delas: a linha fica nela, e não na do material.
  const naoBatem = useMemo(
    () => basesQueNaoBatem(insumos, fichas),
    [insumos, fichas],
  );

  /** A linha do formulário resolvida contra o insumo de agora. */
  function resolverItem(linha: LinhaItemForm): ItemDaFicha & {
    arquivado: boolean;
    unidades: UnidadeCompra[];
    /** A frase quando o material está noutra base que a da receita. */
    baseNaoBate: string | null;
  } {
    const insumo = mapaInsumos.get(linha.insumoId);
    const guardado = snapshotItens.get(linha.insumoId);
    const esperada = naoBatem.get(linha.insumoId);
    // Salvar com a base do material gravaria "200 un" na receita: a linha fica
    // na base gravada, e o custo dela no gravado, como em `custoDeHoje`.
    const unidadeBase =
      esperada ?? insumo?.unidadeBase ?? guardado?.unidadeBase ?? "un";
    const custoGravado =
      guardado && guardado.unidadeBase === esperada && guardado.quantidade > 0
        ? guardado.custoLinha / guardado.quantidade
        : 0;
    const digitada = parseParaNumero(linha.quantidade);

    return {
      insumoId: linha.insumoId,
      nomeSnapshot:
        insumo?.nome ?? guardado?.nomeSnapshot ?? "Material removido",
      categoria: insumo?.categoria ?? guardado?.categoria ?? "OUTRO",
      quantidade: paraBase(digitada, linha.unidade),
      unidadeBase,
      custoUnidadeBaseCorrigido: esperada
        ? custoGravado
        : (insumo?.custoUnidadeBaseCorrigido ?? 0),
      arquivado: !insumo,
      unidades: unidadesCompativeis(unidadeBase),
      baseNaoBate:
        esperada && insumo
          ? `Os produtos medem ${insumo.nome} em ${PLURAL_UNIDADE_BASE[esperada]}, e a última compra está em ${PLURAL_UNIDADE_BASE[insumo.unidadeBase]}. Corrija a última compra em Materiais para o custo voltar ao normal.`
          : null,
    };
  }

  function resolverComponente(linha: LinhaComponenteForm): ComponenteDaFicha & {
    arquivado: boolean;
    /** Na receita, a unidade do preparo; ausente no kit. */
    preparo?: UnidadeRendimento;
    /** Entrou como preparo e deixou de render em g ou ml depois. */
    deixouDeSerPreparo: boolean;
  } {
    const componente = mapaFichas.get(linha.fichaId);
    const guardado = snapshotComponentes.get(linha.fichaId);

    return {
      fichaId: linha.fichaId,
      nomeSnapshot:
        componente?.nome ?? guardado?.nomeSnapshot ?? "Produto removido",
      quantidade: parseParaNumero(linha.quantidade),
      custoUnitarioSnapshot: componente ? custoParaComponente(componente) : 0,
      arquivado: !componente,
      preparo: ehKit ? undefined : (componente?.unidadeRendimento ?? "g"),
      deixouDeSerPreparo: !ehKit && !!componente && !ehPreparo(componente),
    };
  }

  const itensResolvidos = valores.itens.map(resolverItem);
  const componentesResolvidos = valores.componentes.map(resolverComponente);
  const escolhasResolvidas: EscolhaDoKit[] = ehKit
    ? valores.escolhas.map((linha) => ({
        quantidade: parseParaNumero(linha.quantidade),
        categoria: linha.categoria,
      }))
    : [];
  // Pela opção mais cara (`#d101`): o preço fixo do combo fecha na pior
  // combinação, ou não fecha em todas.
  const custoEscolhas = custoDasEscolhas(escolhasResolvidas, fichas, ficha?.id);
  const kitComEscolhas = ehKit && escolhasResolvidas.length > 0;

  // Salvo, senão sugerido — a mesma regra que a biblioteca usa para montar a
  // ficha-modelo (`DECISOES.md#d114`). Zero também é um número que o sistema
  // inventou, e é o pior deles: é o erro da planilha dela, não se pagar.
  const operacional: RateioOperacional = rateioDaConta(configuracao);
  // Ela salvou e escolheu zero: decisão dela, e a faixa de hoje está certa.
  const rateioZerado =
    operacional.valorHoraTrabalho +
      operacional.custoEnergiaHora +
      operacional.custoGasHora +
      operacional.custoIndiretoPorHora ===
    0;
  const nomesComPrecoMedio = insumosComPrecoMedio(valores.itens, insumos);

  const precificacao: ParametrosPreco = {
    metodo: valores.metodo,
    markup: parseParaNumero(valores.markup),
    margemDesejada: parseParaNumero(valores.margemDesejada),
    taxaCartaoConsiderada: parseParaNumero(valores.taxaCartaoConsiderada),
    outrasTaxas: parseParaNumero(valores.outrasTaxas),
    arredondamento: precificacaoPadraoDaConta(configuracao).arredondamento,
  };

  const rendimento = parseParaNumero(valores.rendimento);

  const derivado = derivarFicha({
    itens: itensResolvidos,
    componentes: componentesResolvidos,
    custoEscolhas: custoEscolhas.referencia,
    tempoProducaoMinutos: parseParaNumero(valores.tempoProducaoMinutos),
    rendimento,
    operacional,
    precificacao,
    precoVenda: valores.precoManual ? valores.precoVenda : null,
  });

  // Os números que quase sempre são engano (`#d341`). Só avisam.
  const avisosDoPreco = conferirPrecificacao(
    precificacao,
    configuracao?.formasPagamento ?? [],
  );
  const avisosDe = (campo: AvisoPrecificacao["campo"]) => (
    <AvisosDoPreco
      avisos={avisosDoPreco}
      campo={campo}
      custoUnitario={derivado.custo.custoUnitario}
      parametros={precificacao}
      porUnidade="por unidade"
      aoAceitar={(aviso) => {
        if (aviso.tipo === "MARGEM_PARECE_MULTIPLICADOR") {
          form.setValue("metodo", "MARKUP");
          form.setValue("markup", texto(aviso.sugestao.markup));
        } else if (aviso.tipo === "TAXA_ZERADA") {
          form.setValue(
            "taxaCartaoConsiderada",
            texto(aviso.sugestao.taxaCartaoConsiderada),
          );
        }
      }}
    />
  );

  // A parte de cada linha no custo dos materiais (`#d340`). No kit, o todo
  // são as três listas: produtos de dentro, escolhas e embalagem.
  // Na receita, o preparo é material entre os materiais (`#d345`).
  const linhasDeComponente = componentesResolvidos.map((componente) => ({
    id: componente.fichaId,
    nome: componente.nomeSnapshot,
    custo: custoLinhaComponente(componente),
  }));
  const linhasDeMaterial = [
    ...itensResolvidos.map((item) => ({
      id: item.insumoId,
      nome: item.nomeSnapshot,
      custo: custoLinhaItem(item),
    })),
    ...(ehKit ? [] : linhasDeComponente),
  ];
  const partes = parteDoCusto([
    ...linhasDeMaterial,
    ...(ehKit ? linhasDeComponente : []),
    ...escolhasResolvidas.map((escolha, indice) => ({
      id: `escolha-${indice}`,
      custo: custoDasEscolhas([escolha], fichas, ficha?.id).maximo,
    })),
  ]);
  const maisPesam = ehKit ? null : osQueMaisPesam(linhasDeMaterial);

  const massa = ehKit
    ? null
    : fraseDaMassa(
        [
          ...itensResolvidos,
          ...componentesResolvidos.flatMap((componente) =>
            componente.preparo
              ? [
                  {
                    nomeSnapshot: componente.nomeSnapshot,
                    categoria: "INGREDIENTE",
                    unidadeBase: componente.preparo === "ml" ? "ml" : "g",
                    quantidade: componente.quantidade,
                  } as const,
                ]
              : [],
          ),
        ],
        rendimento,
        valores.unidadeRendimento,
      );

  // O kit gravado dividido pelo que vai dentro (`#d227`): a caixa inteira
  // custa o lote, e a faixa diz o que sobra dela ao preço de hoje.
  const kitDividido = ehKit && rendimento !== 1;
  const sobraDaCaixa = verificarPreco(
    derivado.precoVenda,
    derivado.custo.custoTotalLote,
    derivado.taxas,
  ).lucroUnitario;

  // O tipo de `errors` para lista de campos é uma união de "erro da lista" e
  // "erros por linha". Uma leitura tipada, e o resto do arquivo fica limpo.
  const errosItens = form.formState.errors.itens as
    { quantidade?: { message?: string } }[] | { message?: string } | undefined;
  const errosComponentes = form.formState.errors.componentes as
    { quantidade?: { message?: string } }[] | { message?: string } | undefined;
  const errosEscolhas = form.formState.errors.escolhas as
    | {
        quantidade?: { message?: string };
        categoria?: { message?: string };
      }[]
    | { message?: string }
    | undefined;

  const erroDaLista = (erros: typeof errosItens): string | undefined =>
    Array.isArray(erros) ? undefined : erros?.message;

  const erroDaLinha = (
    erros: typeof errosEscolhas,
    indice: number,
  ): string | undefined =>
    Array.isArray(erros)
      ? (erros[indice]?.quantidade?.message ??
        erros[indice]?.categoria?.message)
      : undefined;

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
  // O preparo entra pela mesma busca dos materiais, com o selo (`#d345`).
  const opcoesPreparo: OpcaoBusca[] = levaPreparo
    ? fichas
        .filter((candidata) =>
          podeSerComponente(candidata, ficha?.id, "RECEITA"),
        )
        .filter(
          (candidata) =>
            !valores.componentes.some((l) => l.fichaId === candidata.id),
        )
        .map((candidata) => ({
          id: candidata.id,
          nome: candidata.nome,
          nomeBusca: candidata.nomeBusca,
          detalhe: `${formatarCustoUnitario(custoParaComponente(candidata))} por ${candidata.unidadeRendimento}`,
          selo: "Preparo",
        }))
    : [];

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
    const unidades = unidadesCompativeis(
      naoBatem.get(insumoId) ?? insumo.unidadeBase,
    );
    listaItens.append({
      insumoId,
      quantidade: "",
      unidade: unidades[0] ?? "un",
    });
  }

  function adicionarComponente(fichaId: string) {
    // No kit, uma caixa leva unidades, e 1 é o começo certo; o grama do
    // preparo nasce vazio, como o do material.
    listaComponentes.append({ fichaId, quantidade: ehKit ? "1" : "" });
  }

  /** A primeira categoria que ainda não tem escolha, para não nascer repetida. */
  function adicionarEscolha() {
    const usadas = new Set(valores.escolhas.map((linha) => linha.categoria));
    const categoria =
      categoriasDeEscolha.find((candidata) => !usadas.has(candidata)) ??
      categoriasDeEscolha[0] ??
      "";
    listaEscolhas.append({ quantidade: "1", categoria });
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
      // O preparo sai junto: no kit, a lista de dentro é de produtos.
      const removidos =
        valores.itens.length - mantidos.length + valores.componentes.length;
      form.setValue("itens", mantidos);
      form.setValue("componentes", []);
      // Kit rende um: o lote é uma caixa (`#d227`), e o campo nem aparece.
      form.setValue("rendimento", "1");
      form.setValue("unidadeRendimento", "un");
      setAviso(
        removidos > 0
          ? `Um kit não leva ingrediente solto nem preparo: ${removidos} ${removidos === 1 ? "item saiu" : "itens saíram"} da lista, e só a embalagem ficou.`
          : null,
      );
      return;
    }

    const tinhaComponentes = valores.componentes.length;
    const tinhaEscolhas = valores.escolhas.length;
    form.setValue("componentes", []);
    form.setValue("escolhas", []);
    setAviso(
      tinhaComponentes > 0
        ? `Uma receita não leva outros produtos dentro: ${tinhaComponentes === 1 ? "o produto que estava" : `os ${tinhaComponentes} produtos que estavam`} no kit ${tinhaComponentes === 1 ? "saiu" : "saíram"} da lista.`
        : tinhaEscolhas > 0
          ? "Uma receita não tem escolha da cliente: a escolha saiu do kit."
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
    focarPrimeiroErro();
  }

  async function salvar() {
    setFalha(null);
    form.clearErrors();

    const resultado = esquemaFicha.safeParse({
      nome: valores.nome,
      categoria: valores.categoria,
      descricao: valores.descricao,
      modoPreparo: valores.modoPreparo,
      tipo: valores.tipo,
      rendimento,
      unidadeRendimento: valores.unidadeRendimento,
      fornadasMinimas: parseParaNumero(valores.fornadasMinimas),
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
      escolhas: escolhasResolvidas,
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
        "Há um item arquivado neste produto. Tire-o da lista ou reative o cadastro dele: sem preço, ele entraria no custo como zero.",
      );
      return;
    }

    // Um bloqueio raro com a frase que diz o que fazer é mais barato que um
    // custo errado gravado na receita (spec 188).
    if (itensResolvidos.some((item) => item.baseNaoBate)) {
      setFalha(
        "Um material deste produto está numa unidade diferente da que o produto usa. Corrija a última compra dele em Materiais e salve de novo.",
      );
      return;
    }

    if (componentesResolvidos.some((c) => c.deixouDeSerPreparo)) {
      setFalha(
        "Um preparo desta receita não rende mais em gramas nem mililitros. Tire-o da lista ou volte o rendimento dele: em unidades, o custo por grama não existe.",
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
      descricao: valores.descricao,
      modoPreparo: valores.modoPreparo,
      fotoUrl: valores.fotoUrl,
      tipo: valores.tipo,
      rendimento,
      unidadeRendimento: valores.unidadeRendimento,
      fornadasMinimas: parseParaNumero(valores.fornadasMinimas),
      tempoProducaoMinutos: parseParaNumero(valores.tempoProducaoMinutos),
      itens: itensResolvidos,
      componentes: componentesResolvidos,
      escolhas: escolhasResolvidas,
      custoEscolhas: custoEscolhas.referencia,
      operacional,
      precificacao,
      precoVenda: derivado.precoVenda,
    };

    setSalvando(true);
    try {
      // O custo de antes diz se quem leva esta ficha dentro envelheceu (`#d345`).
      if (ficha)
        await atualizarFicha(
          contaId,
          ficha.id,
          dados,
          custoParaComponente(ficha),
        );
      else await criarFicha(contaId, dados);
      void guarda.navegar("/fichas");
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
      void guarda.navegar("/fichas");
    } catch {
      setFalha("Não foi possível arquivar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  const titulo = valores.nome.trim() || (ficha ? ficha.nome : "Novo produto");

  // Desenhado duas vezes, como o resumo do pedido (`#d274`): no bloco da
  // coluna da esquerda abaixo de `2xl`, e embaixo do preço a partir dele.
  // Só leitura, sem campo: o DOM dobrado não pesa na ordem do Tab.
  const custoDoLote = (
    <>
      {/* A faixa de composição (`#d126`): as linhas abaixo são a legenda,
        e a de "Seu trabalho" é a única colorida, para casar com o
        segmento cobalto. Custo zero, faixa nenhuma. */}
      <FaixaDeComposicao
        segmentos={composicaoDoLote(derivado.custo, valores.tipo)}
        className="mb-4 max-w-xl"
      />
      {/* Recibo, não tabela: a coluna para antes da borda para o rótulo e o
        valor não ficarem em pontas opostas da tela. */}
      <dl className="max-w-xl space-y-2 text-label">
        <Parcela
          rotulo={ROTULO_PARCELA.custoInsumos}
          valor={derivado.custo.custoInsumos}
        />
        <Parcela
          rotulo={ROTULO_PARCELA.custoEmbalagem}
          valor={derivado.custo.custoEmbalagem}
        />
        {(ehKit || derivado.custo.custoComponentes > 0) && (
          <Parcela
            rotulo={ehKit ? ROTULO_PARCELA.custoComponentes : ROTULO_PREPAROS}
            valor={derivado.custo.custoComponentes}
          />
        )}
        {kitComEscolhas && (
          <Parcela
            rotulo={ROTULO_PARCELA.custoEscolhas}
            valor={derivado.custo.custoEscolhas}
          />
        )}
        <Parcela
          rotulo={ROTULO_PARCELA.custoMaoDeObra}
          valor={derivado.custo.custoMaoDeObra}
          destaque
        />
        <Parcela
          rotulo={ROTULO_PARCELA.custoEnergiaGas}
          valor={derivado.custo.custoEnergiaGas}
        />
        <Parcela
          rotulo={ROTULO_PARCELA.custoIndireto}
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
            Dividido por{" "}
            {rendimento > 0
              ? rotuloDaQuantidade(rendimento, valores.unidadeRendimento)
              : `— ${ROTULO_UNIDADE_RENDIMENTO[valores.unidadeRendimento]}`}
          </dt>
          <dd>
            <Dinheiro centavos={derivado.custo.custoUnitario} />
          </dd>
        </div>
      </dl>

      {/* O custo de referência sem a faixa é um número que ela não tem
        como conferir: a mais barata e a mais cara, por unidade. */}
      {kitComEscolhas &&
        rendimento > 0 &&
        custoEscolhas.minimo !== custoEscolhas.maximo && (
          <p className="num text-label text-ink-muted">
            Custa de{" "}
            {formatarMoeda(
              Math.round(
                (derivado.custo.custoTotalLote -
                  custoEscolhas.maximo +
                  custoEscolhas.minimo) /
                  rendimento,
              ),
            )}{" "}
            a {formatarMoeda(derivado.custo.custoUnitario)} conforme a escolha.
            O preço fecha na mais cara, e por isso fecha em todas.
          </p>
        )}
      {custoEscolhas.semOpcao.length > 0 && (
        <p className="flex items-start gap-2 text-label text-attention">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          <span>
            Nenhuma receita serve em {custoEscolhas.semOpcao.join(", ")}: essa
            parte do custo está zerada até haver uma.
          </span>
        </p>
      )}
    </>
  );

  return (
    <>
      <CabecalhoPagina
        titulo={titulo}
        descricao={origem && `Variação de ${origem.nome}`}
        descricaoSempreVisivel
        voltar={{ href: "/fichas", rotulo: "Produtos" }}
        pendente={pendente}
        acao={
          <Botao
            variante="primaria"
            onClick={() => void salvar()}
            carregando={salvando}
          >
            Salvar
          </Botao>
        }
      />

      {/* Logo abaixo do Salvar, que é onde ela está olhando quando o
          salvamento para: no pé de um formulário longo a falha ficava fora da
          tela, e "não salva" era a leitura. */}
      {falha && (
        <p role="alert" className="mt-3 text-label text-negative">
          {falha}
        </p>
      )}

      {/* A partir de `2xl` o preço é a coluna à direita, presa (`#d339`). */}
      <div className="2xl:grid 2xl:grid-cols-[minmax(0,59rem)_20rem] 2xl:items-start 2xl:gap-8">
        {/* Espaço no pé para o painel de preço não cobrir o último bloco. */}
        <div className="mt-4 space-y-4 pb-32 lg:pb-40 2xl:pb-8">
          {/* Sem configuração salva, a ficha calcula com a sugerida inteira e
            diz isso (`DECISOES.md#d114`): zero também é um número inventado,
            e o pior deles. */}
          {configuracao === null && (
            <Faixa tom="atencao">
              <p>
                Seu tempo está a{" "}
                {formatarMoeda(
                  CONFIGURACAO_SUGERIDA.operacional.valorHoraTrabalho,
                )}{" "}
                a hora, e o gás e a energia no valor sugerido. Ajuste em
                Configuração e veja o preço mudar.
              </p>
              <Link
                href="/configuracao"
                className="toque mt-2 inline-flex items-center gap-1.5 rounded-md text-label font-semibold text-brand-ink underline underline-offset-2"
              >
                <Settings aria-hidden className="size-4" strokeWidth={1.75} />
                Informar meus custos operacionais
              </Link>
            </Faixa>
          )}

          {/* Ela salvou e escolheu zero: decisão dela, e não ausência de
            configuração. */}
          {configuracao !== null && rateioZerado && (
            <Faixa tom="atencao">
              <p>
                Seu tempo de trabalho, o gás e as despesas fixas ainda não
                entram neste preço: o rateio está zerado. O custo abaixo é só o
                dos materiais.
              </p>
              <Link
                href="/configuracao"
                className="toque mt-2 inline-flex items-center gap-1.5 rounded-md text-label font-semibold text-brand-ink underline underline-offset-2"
              >
                <Settings aria-hidden className="size-4" strokeWidth={1.75} />
                Informar meus custos operacionais
              </Link>
            </Faixa>
          )}

          {/* O insumo da biblioteca que ela ainda não conferiu (`#d114`). Some
            sozinha conforme ela corrige o preço em Insumos. */}
          {nomesComPrecoMedio.length > 0 && (
            <Faixa tom="atencao">
              <p>
                {fraseDosPrecoMedio(nomesComPrecoMedio)} O seu chocolate custa
                isso mesmo? Corrija em Materiais e o preço se refaz.
              </p>
              <Link
                href="/insumos"
                className="toque mt-2 inline-flex items-center gap-1.5 rounded-md text-label font-semibold text-brand-ink underline underline-offset-2"
              >
                Ir para Materiais
              </Link>
            </Faixa>
          )}

          {ficha?.custoDesatualizado && (
            <Faixa tom="atencao">
              <p>
                O preço de um material deste produto mudou depois do último
                cálculo. Os números aqui já são os de agora: salve para
                gravá-los e tirar o aviso.
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

          {/* É a tela do produto, e é onde ela está quando acabou de fazer a
            massa daquele produto. Vem antes da receita porque a receita ela já
            sabe. */}
          {podeAssar && (
            <div className="rounded-lg border border-line bg-surface px-4 py-3 lg:px-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <p className="flex min-w-0 items-start gap-2.5 text-label text-ink-muted">
                  <CookingPot
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <span className="max-w-[48ch]">
                    {temBancada
                      ? "Vai fazer a massa? A bancada mostra a receita em letra grande e desconta a despensa no fim."
                      : "Fez a massa? Registrar a fornada desconta a despensa até a próxima contagem."}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Link: a guarda de saída (`#d132`) precisa ver um `<a>`. */}
                  {temBancada && (
                    <Link
                      href={`/fichas/${ficha.id}/bancada` as Route}
                      className={classesBotao({ tamanho: "sm" })}
                    >
                      Abrir na bancada
                    </Link>
                  )}
                  <Botao
                    tamanho="sm"
                    onClick={() =>
                      setFornada({ aberto: true, chave: `fornada-${novoId()}` })
                    }
                  >
                    Fiz a massa
                  </Botao>
                </div>
              </div>

              {/* O que está pronto: a contagem do pote, um nível acima da
                despensa (13D). Sem contagem que valha a frase some, e o
                atalho fica. */}
              {ficha && pronto && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
                  {pronto.prontos === null ? (
                    <p className="max-w-[48ch] text-label text-ink-muted">
                      {pronto.contagem.frescor === "VENCIDA"
                        ? "A contagem do que está pronto venceu."
                        : "Você ainda não contou o que está pronto deste produto."}
                    </p>
                  ) : (
                    <FraseDoPronto
                      projecao={pronto}
                      unidade={ficha.unidadeRendimento}
                    />
                  )}
                  <EntradaContagemPronto tamanho="sm" />
                </div>
              )}

              {/* O custo real por unidade vendável, com a quebra das últimas
                massas anotadas (026). Some sem nenhuma anotação: nada muda
                para quem nunca tocar no botão "Quebrou". */}
              {ficha && quebra && (
                <div className="mt-3 border-t border-line pt-3">
                  <FraseDaQuebra quebra={quebra} ficha={ficha} />
                </div>
              )}

              {/* As desta ficha, com o desfazer: a massa registrada por engano
                precisa sair da projeção, e arquivar é o único caminho. */}
              {fornadasDaFicha.length > 0 && (
                <div className="mt-4">
                  <FornadasRecentes
                    contaId={contaId}
                    fornadas={fornadasDaFicha}
                  />
                </div>
              )}
            </div>
          )}

          <Bloco
            icone={Tag}
            titulo={ehKit ? "O kit" : "A receita"}
            descricao={
              ehKit
                ? "O nome e quanto tempo a montagem toma do começo ao fim: bancada e embalagem."
                : "O nome, quanto sai de um lote e quanto tempo ele toma do começo ao fim: forno, bancada e embalagem."
            }
          >
            {kitDividido && (
              <Faixa tom="atencao">
                <p className="num">
                  Este kit está dividido por {texto(rendimento)}. Se{" "}
                  {formatarMoeda(derivado.precoVenda)} é o preço da caixa
                  inteira, ela custa{" "}
                  {formatarMoeda(derivado.custo.custoTotalLote)} e{" "}
                  {palavraSobra(sobraDaCaixa)}{" "}
                  {formatarMoeda(Math.abs(sobraDaCaixa))}, já com a maquininha.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("rendimento", "1");
                    form.setValue("unidadeRendimento", "un");
                  }}
                  className="toque mt-2 inline-flex items-center rounded-md text-label font-semibold text-brand-ink underline underline-offset-2"
                >
                  É o preço da caixa inteira
                </button>
              </Faixa>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Nome"
                required
                autoFocus={!ficha}
                placeholder="Cookie de chocolate meio amargo"
                erro={form.formState.errors.nome?.message}
                // O nome da variação é provisório: selecionado, ela digita
                // por cima. Depois que ela mexeu, o foco não apaga nada.
                onFocus={(evento) => {
                  if (origem && evento.currentTarget.value === iniciais.nome) {
                    evento.currentTarget.select();
                  }
                }}
                {...form.register("nome")}
              />

              {!ehKit && (
                <div className="grid grid-cols-[1fr_8rem] gap-x-3 gap-y-1.5">
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
                  {/* O peso da massa (`#d340`), embaixo do par "Rende · Em" e
                      não só do campo: em 360px a coluna do "Rende" tem 190px. */}
                  {massa && (
                    <p className="num col-span-2 text-label text-ink-muted first-letter:uppercase">
                      {massa}
                    </p>
                  )}
                </div>
              )}

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

          <details
            open={temMaisDetalhes || erroNosDetalhes}
            className="group rounded-lg border border-line bg-surface"
          >
            <summary className="toque flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-subheading font-semibold text-ink">
              Mais detalhes
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="truncate text-label font-normal text-ink-muted group-open:hidden"
                >
                  receita ou kit, categoria, reserva, descrição, foto
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted transition-transform duration-150 ease-quart group-open:rotate-180"
                  strokeWidth={1.75}
                />
              </span>
            </summary>

            <div className="space-y-4 border-t border-line px-4 py-4">
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
                            ? "border-brand-ink bg-brand-100"
                            : "border-line-strong hover:bg-sunken",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
                          {ativo && (
                            <Check
                              aria-hidden
                              className="size-4 shrink-0 text-brand-ink"
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

              <Campo
                rotulo="Categoria"
                list="categorias-de-ficha"
                placeholder="Cookie"
                dica="Serve para agrupar na lista e no relatório de vendas."
                erro={form.formState.errors.categoria?.message}
                {...form.register("categoria")}
              />
              <datalist id="categorias-de-ficha">
                {categoriasConhecidas.map((categoria) => (
                  <option key={categoria} value={categoria} />
                ))}
              </datalist>

              {/* O piso é por ficha, e mora na tela onde ela já pensa neste
                produto (`#d96`). Nasce em zero: ligado, é a única coisa que faz a
                lista de compras crescer sem pedido nenhum atrás. Some no kit com
                escolhas: reservar "1 combo" não diz de que sabor, e a reserva é
                das receitas. */}
              {!kitComEscolhas && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    rotulo="Fornadas de reserva"
                    inputMode="numeric"
                    sufixo={
                      parseParaNumero(valores.fornadasMinimas) === 1
                        ? "fornada"
                        : "fornadas"
                    }
                    erro={form.formState.errors.fornadasMinimas?.message}
                    dica="Sempre poder fazer esta quantidade. Quando a despensa não der mais isso, o que falta entra na lista de compras. Zero desliga."
                    {...form.register("fornadasMinimas")}
                  />
                </div>
              )}

              {/* Os dois vão na folha do orçamento (spec 017), e só nela: a lista
                de fichas continua lista, sem miniatura. */}
              <AreaTexto
                rotulo="Como você apresenta"
                rows={2}
                placeholder="Massa amanteigada com gotas de chocolate, crocante por fora e macia por dentro, recheada com brigadeiro."
                dica={
                  <span className="flex justify-between gap-3">
                    <span>
                      Vai na folha do orçamento. Duas frases: o que é, o que tem
                      dentro.
                    </span>
                    {valores.descricao.length > 200 && (
                      <span className="num shrink-0 text-micro">
                        {valores.descricao.length}/{DESCRICAO_MAX}
                      </span>
                    )}
                  </span>
                }
                erro={form.formState.errors.descricao?.message}
                {...form.register("descricao")}
              />

              <CampoImagem
                rotulo="Foto"
                dica="A miniatura ao lado do produto na folha. Um PNG com fundo transparente sai solto sobre o papel, como no cardápio; uma foto comum sai num quadrado."
                valor={valores.fotoUrl}
                aoMudar={(dataUrl) => form.setValue("fotoUrl", dataUrl)}
                reducao={{
                  ladoMaximo: FOTO_LADO_PX,
                  formato: "image/jpeg",
                  qualidade: 0.8,
                }}
                maxBytes={FOTO_MAX_BYTES}
                comAlpha={{ maxBytes: FOTO_COM_ALPHA_MAX_BYTES }}
                rotuloEscolher="Escolher foto"
                rotuloTirar="Tirar a foto"
              />
            </div>
          </details>

          {ehKit && (
            <Bloco
              icone={ChefHat}
              titulo="O que vai no kit"
              descricao="Os produtos prontos que entram nesta caixa. Um kit não leva outro kit dentro."
              recuado={false}
            >
              <div className="lg:ml-8">
                <BuscaItem
                  rotulo="Adicionar produto ao kit"
                  placeholder="Buscar receita"
                  opcoes={opcoesComponente}
                  aoEscolher={adicionarComponente}
                  semResultado="Nenhuma receita com esse nome. Só produtos do tipo receita podem entrar em um kit."
                />
              </div>

              <ListaDeLinhas
                vazio="Nenhum produto no kit ainda. Busque acima e toque para adicionar."
                cabecalho={<CabecalhoItensFicha primeira="Produto" />}
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
                      parte={partes.get(componente.fichaId) ?? 0}
                      campoQuantidade={form.register(
                        `componentes.${indice}.quantidade`,
                      )}
                      aoRemover={() => listaComponentes.remove(indice)}
                      erro={
                        componente.arquivado
                          ? "Este produto foi arquivado e não tem mais custo. Tire-o do kit ou reative o cadastro."
                          : erroDaLinha(errosComponentes, indice)
                      }
                    />
                  );
                })}
              </ListaDeLinhas>
            </Bloco>
          )}

          {ehKit && (
            <Bloco
              icone={Hand}
              titulo="O que a cliente escolhe"
              descricao="O preço é fixo e ela escolhe os sabores. Por categoria: um sabor novo entra no combo no dia em que nasce."
              recuado={false}
            >
              <div className="lg:ml-8">
                <Botao
                  tamanho="sm"
                  onClick={adicionarEscolha}
                  disabled={categoriasDeEscolha.length === 0}
                  iconeInicial={
                    <Plus aria-hidden className="size-4" strokeWidth={1.75} />
                  }
                >
                  Adicionar uma escolha
                </Botao>
                {categoriasDeEscolha.length === 0 && (
                  <p className="mt-2 text-label text-ink-muted">
                    Cadastre pelo menos uma receita com categoria para a cliente
                    ter o que escolher.
                  </p>
                )}
              </div>

              <ListaDeLinhas
                vazio="Sem escolha, o kit é uma caixa de conteúdo fixo: o que vai nele está na lista de cima."
                erro={erroDaLista(errosEscolhas)}
                quantidade={listaEscolhas.fields.length}
              >
                {listaEscolhas.fields.map((campo, indice) => {
                  const escolha = escolhasResolvidas[indice];
                  if (!escolha) return null;
                  const opcoes = opcoesDaEscolha(escolha, fichas, ficha?.id);
                  const maisCara = Math.max(
                    0,
                    ...opcoes.map((opcao) => opcao.custoUnitario),
                  );
                  return (
                    <LinhaEscolhaFicha
                      key={campo.id}
                      categorias={categoriasDeEscolha}
                      opcoes={opcoes.map((opcao) => opcao.nome)}
                      maisCara={maisCara}
                      custoLinha={Math.round(maisCara * escolha.quantidade)}
                      parte={partes.get(`escolha-${indice}`) ?? 0}
                      campoQuantidade={form.register(
                        `escolhas.${indice}.quantidade`,
                      )}
                      campoCategoria={form.register(
                        `escolhas.${indice}.categoria`,
                      )}
                      aoRemover={() => listaEscolhas.remove(indice)}
                      erro={erroDaLinha(errosEscolhas, indice)}
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
                : levaPreparo
                  ? "Ingredientes, preparos e embalagem, na quantidade que um lote consome."
                  : "Ingredientes e embalagem, na quantidade que um lote consome."
            }
            recuado={false}
          >
            <div className="lg:ml-8">
              <BuscaItem
                rotulo={ehKit ? "Adicionar embalagem" : "Adicionar material"}
                placeholder={
                  ehKit
                    ? "Buscar embalagem"
                    : levaPreparo
                      ? "Buscar material ou preparo"
                      : "Buscar material"
                }
                opcoes={[...opcoesInsumo, ...opcoesPreparo]}
                aoEscolher={(id) =>
                  mapaFichas.has(id)
                    ? adicionarComponente(id)
                    : adicionarInsumo(id)
                }
                semResultado={
                  ehKit
                    ? "Nenhuma embalagem com esse nome. Cadastre-a em Materiais, na categoria Embalagem."
                    : "Nenhum material com esse nome. Cadastre-o em Materiais primeiro."
                }
              />
            </div>

            {/* Informação, e não aviso: sem ícone e sem tom. O nome não é link,
                o caminho para Materiais já está na faixa do preço médio. */}
            {maisPesam && (
              <p className="text-body text-ink lg:ml-8">
                {maisPesam.nomes.map((nome, i) => (
                  <Fragment key={i}>
                    {i > 0 && (i === maisPesam.nomes.length - 1 ? " e " : ", ")}
                    <strong className="font-semibold">{nome}</strong>
                  </Fragment>
                ))}{" "}
                {maisPesam.nomes.length === 1 ? "é" : "são"}{" "}
                <span className="num">{maisPesam.parte}%</span> dos materiais.
              </p>
            )}

            <ListaDeLinhas
              vazio={
                ehKit
                  ? "Sem embalagem, o kit sai pelo custo dos produtos de dentro."
                  : "Nenhum material ainda. Busque acima e toque para adicionar."
              }
              cabecalho={<CabecalhoItensFicha primeira="Material" />}
              erro={
                erroDaLista(errosItens) ??
                (ehKit ? undefined : erroDaLista(errosComponentes))
              }
              quantidade={
                listaItens.fields.length +
                (ehKit ? 0 : listaComponentes.fields.length)
              }
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
                    parte={partes.get(item.insumoId) ?? 0}
                    campoQuantidade={form.register(
                      `itens.${indice}.quantidade`,
                    )}
                    campoUnidade={form.register(`itens.${indice}.unidade`)}
                    aoRemover={() => listaItens.remove(indice)}
                    erro={
                      item.arquivado
                        ? "Este material foi arquivado e não tem mais preço. Tire-o do produto ou reative o cadastro."
                        : (item.baseNaoBate ?? erroDaLinha(errosItens, indice))
                    }
                  />
                );
              })}
              {/* O preparo, depois dos materiais (`#d345`). Fica visível
                  também no preparo que passou a render em gramas: é por aqui
                  que ela o tira. */}
              {!ehKit &&
                listaComponentes.fields.map((campo, indice) => {
                  const componente = componentesResolvidos[indice];
                  if (!componente) return null;
                  return (
                    <LinhaComponenteFicha
                      key={campo.id}
                      nome={componente.nomeSnapshot}
                      preparo={componente.preparo}
                      custoUnitario={componente.custoUnitarioSnapshot}
                      custoLinha={custoLinhaComponente(componente)}
                      parte={partes.get(componente.fichaId) ?? 0}
                      campoQuantidade={form.register(
                        `componentes.${indice}.quantidade`,
                      )}
                      aoRemover={() => listaComponentes.remove(indice)}
                      erro={
                        componente.arquivado
                          ? "Este preparo foi arquivado e não tem mais custo. Tire-o do produto ou reative o cadastro."
                          : componente.deixouDeSerPreparo
                            ? "Este produto não rende mais em gramas nem mililitros, e só preparo entra numa receita. Tire-o da lista."
                            : erroDaLinha(errosComponentes, indice)
                      }
                    />
                  );
                })}
            </ListaDeLinhas>
          </Bloco>

          {/* Texto, e não lista de campos (`#d342`): cola do caderno e do
              WhatsApp, e a bancada só precisa das linhas. */}
          {!ehKit && (
            <Bloco
              id="como-se-faz"
              className="scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)]"
              icone={ListOrdered}
              titulo="Como se faz"
              descricao="Um passo por linha. Na bancada, cada linha vira um passo."
            >
              <AreaTexto
                rotulo="Modo de preparo"
                rows={6}
                // Cresce com o texto onde o navegador sabe; onde não sabe, as
                // 6 linhas rolam. O piso é o das 6 linhas mais o respiro.
                style={{
                  fieldSizing: "content",
                  minHeight: "calc(6lh + 1.25rem + 2px)",
                }}
                placeholder={
                  "Bata a manteiga com os açúcares até clarear.\nJunte o ovo e a baunilha, depois a farinha peneirada.\nAsse a 180 °C por 12 minutos."
                }
                dica={
                  valores.modoPreparo.length > 3500 && (
                    <span className="num text-micro">
                      {valores.modoPreparo.length}/{PREPARO_MAX}
                    </span>
                  )
                }
                erro={form.formState.errors.modoPreparo?.message}
                {...form.register("modoPreparo")}
              />
            </Bloco>
          )}

          <Bloco
            icone={Receipt}
            titulo="O custo do lote"
            descricao="A conta que a sua concorrente não fez."
            className="2xl:hidden"
          >
            {custoDoLote}
          </Bloco>

          <Bloco
            icone={Percent}
            titulo="Como calcular o preço"
            descricao="A taxa entra aqui porque ela sai do seu lucro, não do bolso da cliente."
          >
            <fieldset>
              <legend className="text-label font-medium text-ink">
                Método
              </legend>
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
                          ? "border-brand-ink bg-brand-100 text-ink"
                          : "border-line-strong text-ink hover:bg-sunken",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {ativo && (
                          <Check
                            aria-hidden
                            className="size-4 shrink-0 text-brand-ink"
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
                <div className="space-y-3">
                  <Campo
                    rotulo="Quero que sobre"
                    inputMode="decimal"
                    sufixo="%"
                    dica="Do preço de venda, depois de descontar custo e taxas."
                    erro={form.formState.errors.margemDesejada?.message}
                    {...form.register("margemDesejada")}
                  />
                  {avisosDe("margemDesejada")}
                </div>
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
              <div className="space-y-3">
                <Campo
                  rotulo="Taxa de cartão"
                  inputMode="decimal"
                  sufixo="%"
                  dica="A maior das suas formas de pagamento: o preço que fecha nela fecha em todas."
                  erro={form.formState.errors.taxaCartaoConsiderada?.message}
                  {...form.register("taxaCartaoConsiderada")}
                />
                {avisosDe("taxaCartaoConsiderada")}
              </div>
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

          {ficha &&
            (confirmandoArquivo ? (
              <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
                <p className="text-label text-ink">
                  Arquivar{" "}
                  <strong className="font-semibold">{ficha.nome}</strong>? Ele
                  sai da lista e da busca, mas continua nos pedidos antigos e
                  nos kits que o usam, para o histórico de custo não se perder.
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
              <div className="flex flex-wrap gap-2 border-t border-line pt-5">
                {/* Link: a guarda de saída (`#d132`) precisa ver um `<a>`. A
                    variação copia a ficha gravada, não o que está na tela. */}
                <Link
                  href={`/fichas/nova?de=${ficha.id}` as Route}
                  className={classesBotao({ tamanho: "sm" })}
                >
                  <Copy aria-hidden className="size-4" strokeWidth={1.75} />
                  Fazer uma variação
                </Link>
                <Botao
                  variante="perigo"
                  tamanho="sm"
                  onClick={() => setConfirmandoArquivo(true)}
                  iconeInicial={
                    <Archive
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Arquivar produto
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
          custoDoLote={custoDoLote}
        />
      </div>

      {ficha && podeAssar && (
        <PainelFornada
          aberto={fornada.aberto}
          chave={fornada.chave}
          aoFechar={() => setFornada({ aberto: false, chave: fornada.chave })}
          contaId={contaId}
          opcoes={[{ ficha, unidades: ficha.rendimento }]}
          fichas={fichas}
          insumos={insumos}
          fornadas={fornadas}
          hoje={hoje}
        />
      )}

      {guarda.dialogo}
    </>
  );
}

/** "Farinha de trigo, manteiga sem sal e mais 8 estão com o preço que a biblioteca sugeriu." */
function fraseDosPrecoMedio(nomes: string[]): string {
  if (nomes.length === 1) {
    return `${nomes[0]} está com o preço que a biblioteca sugeriu.`;
  }
  if (nomes.length === 2) {
    return `${nomes[0]} e ${nomes[1]} estão com o preço que a biblioteca sugeriu.`;
  }
  const resto = nomes.length - 2;
  return `${nomes[0]}, ${nomes[1]} e mais ${resto} ${resto === 1 ? "está" : "estão"} com o preço que a biblioteca sugeriu.`;
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
  cabecalho,
  erro,
  children,
}: {
  quantidade: number;
  vazio: string;
  /** Os nomes das colunas do desktop (`#d339`), só com linha na lista. */
  cabecalho?: ReactNode;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div className="-mx-4 lg:-mx-5">
      {quantidade === 0 ? (
        <p className="px-4 text-label text-ink-muted lg:px-5">{vazio}</p>
      ) : (
        <>
          {cabecalho}
          <ul className="divide-y divide-line border-y border-line">
            {children}
          </ul>
        </>
      )}
      {erro && (
        <p role="alert" className="mt-3 px-4 text-label text-negative lg:px-5">
          {erro}
        </p>
      )}
    </div>
  );
}
