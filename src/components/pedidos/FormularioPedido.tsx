"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  CookingPot,
  NotebookPen,
  Receipt,
  Store,
  Truck,
  Unlink,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { FornadasRecentes } from "@/components/producao/FornadasRecentes";
import { FraseCabeNoPedido } from "@/components/producao/FraseDaCapacidade";
import {
  PainelFornada,
  type OpcaoDeFornada,
} from "@/components/producao/PainelFornada";
import { Bloco } from "@/components/ui/Bloco";
import { Botao } from "@/components/ui/Botao";
import { BuscaItem, type OpcaoBusca } from "@/components/ui/BuscaItem";
import { Campo, EnvelopeCampo, Seletor } from "@/components/ui/Campo";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Selo } from "@/components/ui/Selo";
import { EscolhaDoCombo } from "./EscolhaDoCombo";
import { LinhaItemPedido } from "./LinhaItemPedido";
import { PainelCliente } from "./PainelCliente";
import { PainelPedido } from "./PainelPedido";
import { SeloStatus } from "./SeloStatus";
import { podeSerComponente, temEscolhas } from "@/lib/domain/custoFicha";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { formatarMoeda, parseParaNumero } from "@/lib/domain/money";
import {
  ACAO_STATUS_PEDIDO,
  custoDoComboMontado,
  derivarPedido,
  escolhasCompletas,
  ofereceOPrecoDeHoje,
  resumoDasEscolhas,
  transicoesPermitidas,
} from "@/lib/domain/pedido";
import {
  errosDeLinha,
  errosPorCampo,
  esquemaPedido,
} from "@/lib/domain/schemas";
import {
  arquivarPedido,
  atualizarPedido,
  criarPedido,
  desfazerPagamento,
  marcarPedidoPago,
  mudarStatusPedido,
  type ContextoPagamento,
  type DadosPedido,
  type ItemDoPedido,
} from "@/lib/firebase/mutations/pedidos";
import { parcelasDoResumo } from "@/lib/domain/caixa";
import { competenciaDeISO } from "@/lib/domain/datas";
import {
  capacidadeDaFicha,
  projecaoDoPronto,
  prontosLivres,
} from "@/lib/domain/producao";
import { docMeta, docResumoMensal } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import { contextoDaCapacidade } from "@/lib/hooks/useDespensaParaProduzir";
import { BlocoOrcamento } from "./BlocoOrcamento";
import { BlocoPagamento } from "./BlocoPagamento";
import { BlocoWhatsApp } from "./BlocoWhatsApp";
import { validadeSugerida } from "@/lib/domain/orcamento";
import type { ResumoParaCliente } from "@/lib/domain/whatsapp";
import type {
  Centavos,
  Cliente,
  ConfiguracaoGeral,
  DataISO,
  EscolhaFeita,
  FichaTecnica,
  Fornada,
  Insumo,
  Meta,
  Pedido,
  ResumoMensal,
  StatusPedido,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { novoId } from "@/lib/utils/id";

type TipoEntrega = "RETIRADA" | "ENTREGA";

interface LinhaItemForm {
  /** Id local: é o que mantém a linha no lugar quando ela remove a de cima. */
  chave: string;
  fichaTecnicaId: string;
  nomeSnapshot: string;
  /** Texto: "1," é estado legítimo do teclado, e não pode virar zero. */
  quantidade: string;
  /** Congelados quando o item entrou. Mudar a quantidade não os refaz. */
  precoUnitario: Centavos;
  custoUnitarioSnapshot: Centavos;
  /**
   * O par que dá a base do combo, `custoUnitario − custoEscolhas`
   * (`DECISOES.md#d100`). Da ficha quando o item entra; da própria linha
   * gravada quando o pedido reabre, para a base continuar congelada.
   */
  custoDoKit: { custoUnitario: Centavos; custoEscolhas: Centavos };
  escolhas: EscolhaFeita[];
}

/** O que as escolhas gravadas somam no custo da linha. */
function custoDasEscolhasFeitas(escolhas: EscolhaFeita[]): Centavos {
  return escolhas.reduce(
    (soma, escolha) =>
      soma + Math.round(escolha.custoUnitarioSnapshot * escolha.quantidade),
    0,
  );
}

interface ValoresPedido {
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  dataEntregaISO: DataISO;
  /** Vazio é "sem prazo". */
  validoAteISO: string;
  tipoEntrega: TipoEntrega;
  taxaEntrega: Centavos;
  endereco: string;
  itens: LinhaItemForm[];
  desconto: Centavos;
  formaPagamentoId: string;
  observacoes: string;
}

const ENTREGAS: {
  valor: TipoEntrega;
  titulo: string;
  explicacao: string;
  icone: typeof Store;
}[] = [
  {
    valor: "RETIRADA",
    titulo: "Ela retira",
    explicacao: "A cliente busca com você, no dia combinado.",
    icone: Store,
  },
  {
    valor: "ENTREGA",
    titulo: "Você entrega",
    explicacao: "A taxa de entrega entra no total do pedido.",
    icone: Truck,
  },
];

const NASCIMENTOS: {
  valor: StatusPedido;
  titulo: string;
  explicacao: string;
}[] = [
  {
    valor: "ORCAMENTO",
    titulo: "Orçamento",
    explicacao: "Ainda é uma proposta. Você pode mexer no preço.",
  },
  {
    valor: "CONFIRMADO",
    titulo: "Já está fechado",
    explicacao: "A cliente aceitou e a data está combinada.",
  },
];

function texto(numero: number): string {
  return String(numero).replace(".", ",");
}

/** "Faltam 2 de Cookie neste combo." — o que a linha diz quando não fecha. */
function fraseDoQueFalta(
  faltam: { categoria: string; quantidade: number }[],
): string {
  return faltam
    .map(({ categoria, quantidade }) =>
      quantidade > 0
        ? `${quantidade === 1 ? "Falta" : "Faltam"} ${quantidade} de ${categoria} neste combo.`
        : `${-quantidade} de ${categoria} a mais neste combo.`,
    )
    .join(" ");
}

function valoresIniciais(
  pedido: Pedido | undefined,
  configuracao: ConfiguracaoGeral | null,
  hoje: DataISO,
): ValoresPedido {
  const formas = configuracao?.formasPagamento ?? [];

  if (!pedido) {
    return {
      clienteId: "",
      clienteNome: "",
      clienteTelefone: "",
      // Campo que pode ser sugerido não nasce vazio (`PRODUCT.md`, princípio 1).
      // Hoje é o palpite honesto: a maioria das encomendas é combinada para os
      // próximos dias, e mudar a data é um toque.
      dataEntregaISO: hoje,
      // Vazio no pedido novo: o bloco do orçamento só aparece em pedido que
      // existe, e sugestão que ela não viu não vira dado (`#d17`).
      validoAteISO: "",
      tipoEntrega: "RETIRADA",
      taxaEntrega: 0,
      endereco: "",
      itens: [],
      desconto: 0,
      formaPagamentoId: formas.find((forma) => forma.ativo)?.id ?? "",
      observacoes: "",
    };
  }

  return {
    clienteId: pedido.clienteId ?? "",
    clienteNome: pedido.clienteNome,
    clienteTelefone: pedido.clienteTelefone ?? "",
    dataEntregaISO: pedido.dataEntregaISO,
    // Sem validade, o campo nasce com a sugestão só enquanto é orçamento:
    // pedido confirmado sem validade fica sem (`DECISOES.md#d110`).
    validoAteISO:
      pedido.validoAteISO ??
      (pedido.status === "ORCAMENTO" ? validadeSugerida(hoje) : ""),
    tipoEntrega: pedido.entrega.tipo,
    taxaEntrega: pedido.entrega.taxa,
    endereco: pedido.entrega.endereco ?? "",
    itens: pedido.itens.map((item) => ({
      chave: novoId(),
      fichaTecnicaId: item.fichaTecnicaId,
      nomeSnapshot: item.nomeSnapshot,
      quantidade: texto(item.quantidade),
      // O que está gravado é o que vale: reabrir um pedido não repreça nada.
      precoUnitario: item.precoUnitario,
      custoUnitarioSnapshot: item.custoUnitarioSnapshot,
      custoDoKit: {
        custoUnitario: item.custoUnitarioSnapshot,
        custoEscolhas: custoDasEscolhasFeitas(item.escolhas ?? []),
      },
      escolhas: item.escolhas ?? [],
    })),
    desconto: pedido.desconto,
    formaPagamentoId: pedido.formaPagamentoId ?? "",
    observacoes: pedido.observacoes ?? "",
  };
}

export function FormularioPedido({
  contaId,
  pedido,
  fichas,
  clientes,
  insumos,
  fornadas,
  pedidosAbertos,
  despensaPronta,
  hoje,
  configuracao,
  pendente,
}: {
  contaId: string;
  pedido?: Pedido;
  fichas: FichaTecnica[];
  clientes: Cliente[];
  /** A despensa, as fornadas recentes e os pedidos do horizonte: respondem
   * se dá para fazer cada item, e alimentam a folha de registrar fornada. */
  insumos: Insumo[];
  fornadas: Fornada[];
  pedidosAbertos: Pedido[];
  /** Enquanto os três não chegaram, a linha não diz nada. */
  despensaPronta: boolean;
  /** O dia congela na abertura, no editor que monta esta tela. */
  hoje: DataISO;
  configuracao: ConfiguracaoGeral | null;
  pendente: boolean;
}) {
  const router = useRouter();
  const idObservacoes = useId();

  const [valores, setValores] = useState<ValoresPedido>(() =>
    valoresIniciais(pedido, configuracao, hoje),
  );
  const [status, setStatus] = useState<StatusPedido>(
    pedido?.status ?? "ORCAMENTO",
  );

  // O dia do pagamento nasce hoje, e não na data da entrega: o normal é ela
  // tocar no botão no dia em que o dinheiro entrou. Mudar a data é um toque, e
  // é o que ela faz quando está pondo um pedido antigo em dia.
  const [pagoEmISO, setPagoEmISO] = useState<DataISO>(hoje);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosItens, setErrosItens] = useState<Record<number, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  const [cadastro, setCadastro] = useState<{ aberto: boolean; chave: string }>({
    aberto: false,
    chave: "fechado",
  });
  const [fornada, setFornada] = useState<{ aberto: boolean; chave: string }>({
    aberto: false,
    chave: "fechado",
  });

  const definir = <C extends keyof ValoresPedido>(
    campo: C,
    valor: ValoresPedido[C],
  ) => setValores((anterior) => ({ ...anterior, [campo]: valor }));

  const mapaFichas = useMemo(
    () => new Map(fichas.map((ficha) => [ficha.id, ficha])),
    [fichas],
  );

  /**
   * A categoria de uma receita escolhida, pela ficha **de hoje**, e só se ela
   * ainda serve: arquivada ou virada kit não conta, e a linha diz que falta.
   */
  const categoriaDaReceita = (fichaId: string) => {
    const receita = mapaFichas.get(fichaId);
    return receita && podeSerComponente(receita)
      ? receita.categoria
      : undefined;
  };

  /**
   * O que este pedido pede, em massa: a ficha de cada item, com a quantidade
   * pedida. A massa se faz sob demanda e do tamanho que quiser (`#d93`), então
   * 12 cookies abrem com 12 — e ela sobe para a receita inteira se quiser
   * congelar o resto. Sai do pedido **gravado**, e não da tela: a fornada é o
   * que aconteceu, e o que aconteceu tem documento.
   *
   * A linha de um combo à escolha pede as receitas escolhidas (`#d103`): massa
   * de "combo" não existe, massa de tradicional existe. Por ficha, somando as
   * linhas — a mesma receita pode vir solta e dentro de um combo, e a folha
   * escolhe por ficha.
   */
  const opcoesDeFornada = useMemo<OpcaoDeFornada[]>(() => {
    const porFicha = new Map<string, OpcaoDeFornada>();
    const pedir = (fichaId: string, unidades: number) => {
      const ficha = mapaFichas.get(fichaId);
      if (!ficha || !(ficha.rendimento > 0)) return;
      const atual = porFicha.get(fichaId);
      if (atual) atual.unidades += unidades;
      else porFicha.set(fichaId, { ficha, unidades });
    };
    for (const item of pedido?.itens ?? []) {
      const ficha = mapaFichas.get(item.fichaTecnicaId);
      if (ficha && temEscolhas(ficha)) {
        for (const escolha of item.escolhas ?? []) {
          pedir(escolha.fichaTecnicaId, escolha.quantidade * item.quantidade);
        }
      } else {
        pedir(item.fichaTecnicaId, item.quantidade);
      }
    }
    return [...porFicha.values()];
  }, [pedido, mapaFichas]);
  const podeAssar =
    !!pedido && pedido.status !== "CANCELADO" && opcoesDeFornada.length > 0;
  const fornadasDoPedido = useMemo(
    () => fornadas.filter((atual) => atual.pedidoId === pedido?.id),
    [fornadas, pedido],
  );

  /**
   * Dá para fazer? A despensa projetada, menos o que os **outros** pedidos
   * fechados já prometeram: este fica de fora, senão descontaria a si mesmo.
   * É sobre hoje, e não sobre o que a lista de compras vai trazer até lá.
   */
  const contextoDaDespensa = useMemo(
    () =>
      contextoDaCapacidade(
        pedidosAbertos,
        fichas,
        insumos,
        fornadas,
        hoje,
        pedido?.id,
      ),
    [pedidosAbertos, fichas, insumos, fornadas, hoje, pedido],
  );

  /** O que já virou massa para este pedido, por ficha: não se pergunta de novo. */
  const jaFeitasPorFicha = useMemo(() => {
    const total = new Map<string, number>();
    for (const fornada of fornadasDoPedido) {
      if (fornada.arquivado) continue;
      total.set(
        fornada.fichaId,
        (total.get(fornada.fichaId) ?? 0) + fornada.unidadesProduzidas,
      );
    }
    return total;
  }, [fornadasDoPedido]);

  const formas = configuracao?.formasPagamento ?? [];
  const formasVisiveis = formas.filter(
    (forma) => forma.ativo || forma.id === valores.formaPagamentoId,
  );
  const forma = formas.find((item) => item.id === valores.formaPagamentoId);

  const clienteVinculado = clientes.find(
    (candidata) => candidata.id === valores.clienteId,
  );

  /**
   * O mês em que o dinheiro entra (ou entrou).
   *
   * De um pedido já pago é o gravado: desfazer em outubro um pagamento de
   * setembro tira o dinheiro de setembro. De um pedido em aberto é o dia que
   * ela escolheu no bloco de pagamento.
   */
  const competenciaPagamento =
    pedido?.competenciaPagamento ?? competenciaDeISO(pagoEmISO);

  // A tela assina os dois documentos para que a mutação não leia nada: o
  // espelho da meta e o ticket médio são escritos por valor, e lançar precisa
  // funcionar sem rede (`DECISOES.md#d29`).
  const referenciaResumo = useMemo(
    () => docResumoMensal(contaId, competenciaPagamento),
    [contaId, competenciaPagamento],
  );
  const referenciaMeta = useMemo(
    () => docMeta(contaId, competenciaPagamento),
    [contaId, competenciaPagamento],
  );

  const resumoDoPagamento = useDocumento<ResumoMensal>(referenciaResumo);
  const metaDoPagamento = useDocumento<Meta>(referenciaMeta);

  const parcelasDoPagamento = parcelasDoResumo(resumoDoPagamento.dado);

  const contextoPagamento: ContextoPagamento = {
    competencia: competenciaPagamento,
    meta: metaDoPagamento.dado,
    entradas: parcelasDoPagamento.entradas,
    receitaPedidos: parcelasDoPagamento.receitaPedidos,
    qtdPedidos: parcelasDoPagamento.qtdPedidos,
  };

  /** Os agregados da cliente só andam quando o pedido aponta para um cadastro. */
  const clienteDoPedido = clienteVinculado
    ? {
        id: clienteVinculado.id,
        totalPedidos: clienteVinculado.totalPedidos,
        totalGasto: clienteVinculado.totalGasto,
      }
    : null;

  const itensResolvidos: ItemDoPedido[] = valores.itens.map((linha) => ({
    fichaTecnicaId: linha.fichaTecnicaId,
    nomeSnapshot: linha.nomeSnapshot,
    quantidade: parseParaNumero(linha.quantidade),
    precoUnitario: linha.precoUnitario,
    custoUnitarioSnapshot: linha.custoUnitarioSnapshot,
    ...(linha.escolhas.length > 0 ? { escolhas: linha.escolhas } : {}),
  }));

  // Retirada não tem taxa: o campo some, e o número some com ele.
  const taxaEntrega =
    valores.tipoEntrega === "ENTREGA" ? valores.taxaEntrega : 0;

  const derivado = derivarPedido({
    itens: itensResolvidos,
    desconto: valores.desconto,
    taxaEntrega,
    forma,
  });

  // A mesma ficha não entra duas vezes — exceto o combo à escolha, em que
  // duas linhas são duas escolhas diferentes: três "tradicional + nutella" e
  // um "dois nutella".
  const opcoesFicha: OpcaoBusca[] = fichas
    .filter((ficha) => ficha.ativo)
    .filter(
      (ficha) =>
        temEscolhas(ficha) ||
        !valores.itens.some((linha) => linha.fichaTecnicaId === ficha.id),
    )
    .map((ficha) => ({
      id: ficha.id,
      nome: ficha.nome,
      nomeBusca: ficha.nomeBusca,
      detalhe: `${formatarMoeda(ficha.precificacao.precoVenda)} por unidade`,
    }));

  const termoCliente = chaveDeBusca(valores.clienteNome);
  const sugestoesCliente =
    valores.clienteId || termoCliente.length < 2
      ? []
      : clientes
          .filter((candidata) => candidata.nomeBusca.includes(termoCliente))
          .slice(0, 4);

  /** O item entra no pedido, e é aqui que preço e custo congelam (`#d08`). */
  function adicionarFicha(fichaId: string) {
    const ficha = mapaFichas.get(fichaId);
    if (!ficha) return;

    setValores((anterior) => ({
      ...anterior,
      itens: [
        ...anterior.itens,
        {
          chave: novoId(),
          fichaTecnicaId: ficha.id,
          nomeSnapshot: ficha.nome,
          quantidade: "1",
          precoUnitario: ficha.precificacao.precoVenda,
          // Num combo à escolha, a linha nasce só com a base: as escolhas
          // somam à medida que ela toca (`#d100`).
          custoUnitarioSnapshot: temEscolhas(ficha)
            ? custoDoComboMontado(ficha, [])
            : ficha.custoUnitario,
          custoDoKit: {
            custoUnitario: ficha.custoUnitario,
            custoEscolhas: ficha.custoEscolhas ?? 0,
          },
          escolhas: [],
        },
      ],
    }));
  }

  /**
   * Mais ou menos uma receita na escolha do combo. O custo da linha é refeito
   * a cada toque: base do kit mais o que está escolhido, com o custo de cada
   * receita congelado no momento em que entrou.
   */
  function mudarEscolha(
    chave: string,
    receita: { id: string; nome: string; custoUnitario: Centavos },
    delta: number,
  ) {
    setValores((anterior) => ({
      ...anterior,
      itens: anterior.itens.map((linha) => {
        if (linha.chave !== chave) return linha;
        const atual = linha.escolhas.find(
          (escolha) => escolha.fichaTecnicaId === receita.id,
        );
        const quantidade = (atual?.quantidade ?? 0) + delta;
        const escolhas = linha.escolhas.filter(
          (escolha) => escolha.fichaTecnicaId !== receita.id,
        );
        if (quantidade > 0) {
          escolhas.push({
            fichaTecnicaId: receita.id,
            nomeSnapshot: receita.nome,
            quantidade,
            custoUnitarioSnapshot:
              atual?.custoUnitarioSnapshot ?? receita.custoUnitario,
          });
        }
        return {
          ...linha,
          escolhas,
          custoUnitarioSnapshot: custoDoComboMontado(
            linha.custoDoKit,
            escolhas,
          ),
        };
      }),
    }));
  }

  function mudarLinha(chave: string, quantidade: string) {
    setValores((anterior) => ({
      ...anterior,
      itens: anterior.itens.map((linha) =>
        linha.chave === chave ? { ...linha, quantidade } : linha,
      ),
    }));
  }

  function removerLinha(chave: string) {
    setValores((anterior) => ({
      ...anterior,
      itens: anterior.itens.filter((linha) => linha.chave !== chave),
    }));
  }

  /** Troca o congelado pelo preço de agora — e o custo junto, que é o par dele. */
  function usarPrecoDeHoje(chave: string) {
    setValores((anterior) => ({
      ...anterior,
      itens: anterior.itens.map((linha) => {
        if (linha.chave !== chave) return linha;
        const ficha = mapaFichas.get(linha.fichaTecnicaId);
        if (!ficha) return linha;
        // Num combo, o custo de hoje é a base de hoje mais as receitas
        // escolhidas pelo custo de hoje: preço e custo andam juntos (`#d32`).
        const escolhas = linha.escolhas.map((escolha) => ({
          ...escolha,
          custoUnitarioSnapshot:
            mapaFichas.get(escolha.fichaTecnicaId)?.custoUnitario ??
            escolha.custoUnitarioSnapshot,
        }));
        const custoDoKit = {
          custoUnitario: ficha.custoUnitario,
          custoEscolhas: ficha.custoEscolhas ?? 0,
        };
        return {
          ...linha,
          precoUnitario: ficha.precificacao.precoVenda,
          custoUnitarioSnapshot: custoDoComboMontado(custoDoKit, escolhas),
          custoDoKit,
          escolhas,
        };
      }),
    }));
  }

  function vincularCliente(cliente: {
    id: string;
    nome: string;
    telefone: string;
  }) {
    setValores((anterior) => ({
      ...anterior,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      // O telefone do cadastro só entra se o pedido ainda não tem um: o que ela
      // digitou aqui pode ser o número de quem vai receber, e não o dela.
      clienteTelefone: anterior.clienteTelefone || cliente.telefone,
    }));
  }

  function trocarEntrega(proximo: TipoEntrega) {
    setValores((anterior) => {
      if (anterior.tipoEntrega === proximo) return anterior;
      return {
        ...anterior,
        tipoEntrega: proximo,
        // O endereço da cliente cadastrada vem junto: o sistema não pede o que
        // já sabe (`PRODUCT.md`, princípio 1).
        endereco:
          proximo === "ENTREGA" && !anterior.endereco
            ? (clienteVinculado?.endereco ?? "")
            : anterior.endereco,
      };
    });
  }

  /**
   * O que a cliente vai ler, montado dos valores **da tela** — os mesmos que
   * desenham o rodapé de totais, e não os do documento gravado (`#d78`). Se ela
   * corrigiu a quantidade e ainda não salvou, o resumo manda o que ela está
   * vendo, e não um número que ninguém tem na frente.
   */
  function resumoParaCliente(salvo: Pedido): ResumoParaCliente {
    return {
      negocio: configuracao?.nomeNegocio ?? "",
      codigo: salvo.codigo,
      clienteNome: valores.clienteNome,
      itens: itensResolvidos,
      subtotal: derivado.subtotal,
      desconto: derivado.desconto,
      taxaEntrega: derivado.taxaEntrega,
      total: derivado.total,
      entrega: {
        tipo: valores.tipoEntrega,
        dataISO: valores.dataEntregaISO,
        endereco: valores.endereco || undefined,
      },
      formaNome: forma?.nome,
      formaInstrucoes: forma?.instrucoes,
      pago: salvo.pago,
    };
  }

  function dadosDoPedido(): DadosPedido {
    return {
      clienteId: valores.clienteId || undefined,
      clienteNome: valores.clienteNome,
      clienteTelefone: valores.clienteTelefone || undefined,
      itens: itensResolvidos,
      status,
      dataEntregaISO: valores.dataEntregaISO,
      entrega: {
        tipo: valores.tipoEntrega,
        taxa: taxaEntrega,
        endereco: valores.endereco || undefined,
      },
      desconto: valores.desconto,
      formaPagamentoId: valores.formaPagamentoId || undefined,
      formasPagamento: formas,
      validoAteISO: valores.validoAteISO || undefined,
      observacoes: valores.observacoes || undefined,
    };
  }

  async function salvar() {
    const resultado = esquemaPedido.safeParse({
      clienteNome: valores.clienteNome,
      clienteTelefone: valores.clienteTelefone || undefined,
      dataEntregaISO: valores.dataEntregaISO,
      validoAteISO: valores.validoAteISO || undefined,
      status,
      tipoEntrega: valores.tipoEntrega,
      taxaEntrega,
      endereco: valores.endereco || undefined,
      desconto: valores.desconto,
      formaPagamentoId: valores.formaPagamentoId || undefined,
      itens: itensResolvidos.map((item) => ({
        fichaTecnicaId: item.fichaTecnicaId,
        quantidade: item.quantidade,
        escolhas: item.escolhas?.map((escolha) => ({
          fichaTecnicaId: escolha.fichaTecnicaId,
          quantidade: escolha.quantidade,
        })),
      })),
      observacoes: valores.observacoes || undefined,
    });

    // Escolha incompleta cai na linha, como qualquer falha de linha. O esquema
    // não sabe o que o kit pede; a ficha sabe.
    const errosEscolha: Record<number, string> = {};
    valores.itens.forEach((linha, indice) => {
      const ficha = mapaFichas.get(linha.fichaTecnicaId);
      if (!ficha || !temEscolhas(ficha)) return;
      const { completas, faltam } = escolhasCompletas(
        ficha,
        linha.escolhas,
        categoriaDaReceita,
      );
      if (!completas) errosEscolha[indice] = fraseDoQueFalta(faltam);
    });

    if (!resultado.success || Object.keys(errosEscolha).length > 0) {
      setErros(resultado.success ? {} : errosPorCampo(resultado.error));
      setErrosItens({
        ...(resultado.success ? {} : errosDeLinha(resultado.error, "itens")),
        ...errosEscolha,
      });
      return;
    }

    setErros({});
    setErrosItens({});
    setFalha(null);
    setSalvando(true);

    try {
      if (pedido) {
        // Pedido já pago corrige a transação e o agregado junto: reverter mais
        // aplicar, como na 4A. Sem isso o caixa ficaria com um número que o
        // pedido não reconhece.
        await atualizarPedido(
          contaId,
          pedido,
          dadosDoPedido(),
          contextoPagamento,
          clienteDoPedido,
        );
      } else {
        await criarPedido(contaId, dadosDoPedido());
      }
      router.push("/pedidos");
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  async function pagar() {
    if (!pedido) return;
    setFalha(null);
    setSalvando(true);
    try {
      await marcarPedidoPago(
        contaId,
        pedido,
        pagoEmISO,
        formas,
        contextoPagamento,
        clienteDoPedido,
      );
      setSalvando(false);
    } catch {
      setFalha(
        "Não foi possível marcar como pago agora. Tente de novo em instantes.",
      );
      setSalvando(false);
    }
  }

  async function desfazer() {
    if (!pedido) return;
    setFalha(null);
    setSalvando(true);
    try {
      await desfazerPagamento(
        contaId,
        pedido,
        contextoPagamento,
        clienteDoPedido,
      );
      setSalvando(false);
    } catch {
      setFalha(
        "Não foi possível desfazer o pagamento agora. Tente de novo em instantes.",
      );
      setSalvando(false);
    }
  }

  /**
   * O status anda sozinho, sem passar pelo salvamento do resto: é uma ação com
   * verbo próprio ("marcar como pronto"), e não um campo do formulário.
   */
  async function mover(proximo: StatusPedido) {
    if (!pedido) return;
    setFalha(null);
    setSalvando(true);
    try {
      // Cancelar um pedido pago é desfazer o pagamento primeiro: o dinheiro
      // precisa sair do caixa junto, senão o mês conta uma venda que não
      // aconteceu. A mutação recusa a ordem inversa.
      let pago = pedido.pago;
      if (proximo === "CANCELADO" && pago) {
        await desfazerPagamento(
          contaId,
          pedido,
          contextoPagamento,
          clienteDoPedido,
        );
        pago = false;
      }

      await mudarStatusPedido(
        contaId,
        { id: pedido.id, status, pago },
        proximo,
      );
      setStatus(proximo);
      setSalvando(false);
    } catch {
      setFalha("Não foi possível mudar o pedido de estado agora.");
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!pedido) return;
    setFalha(null);
    setSalvando(true);
    try {
      await arquivarPedido(contaId, pedido.id);
      router.push("/pedidos");
    } catch {
      setFalha("Não foi possível arquivar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  const titulo = valores.clienteNome.trim() || "Novo pedido";
  const erroDaLista =
    Object.keys(errosItens).length === 0 ? erros.itens : undefined;

  return (
    <>
      {/* Mesmo encolhimento do editor de ficha, e pelo mesmo motivo. */}
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 py-3 apertado:py-2 lg:-mx-8 lg:px-8 lg:pb-4 lg:pt-6">
        <Link
          href="/pedidos"
          className="toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink apertado:hidden"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          Pedidos
        </Link>

        <div className="mt-1 flex items-center justify-between gap-4 apertado:mt-0">
          <div className="min-w-0">
            <h1 className="truncate font-display text-title font-semibold text-ink lg:text-display">
              {titulo}
            </h1>
            {pedido && (
              <p className="num mt-0.5 truncate text-label text-ink-muted">
                {pedido.codigo}
              </p>
            )}
          </div>
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

      {/* Espaço no pé para o rodapé de totais não cobrir o último bloco. */}
      <div className="mt-4 space-y-4 pb-48 apertado:pb-32 lg:pb-44">
        {pedido ? (
          <Bloco
            icone={ClipboardList}
            titulo="Em que pé está"
            descricao="Voltar um passo é sempre permitido, e cancelar não apaga nada."
          >
            <div className="flex flex-wrap items-center gap-2">
              <SeloStatus status={status} />
            </div>

            <div className="flex flex-wrap gap-2">
              {transicoesPermitidas(status).map((proximo) => (
                <Botao
                  key={proximo}
                  tamanho="sm"
                  variante={proximo === "CANCELADO" ? "perigo" : "secundaria"}
                  disabled={salvando}
                  onClick={() => void mover(proximo)}
                >
                  {status === "CANCELADO" && proximo === "ORCAMENTO"
                    ? "Reabrir como orçamento"
                    : ACAO_STATUS_PEDIDO[proximo]}
                </Botao>
              ))}
            </div>

            {/* A fornada não é o status (`DECISOES.md#d92`): registrar não
                move o pedido, e mover não registra. O atalho abre a folha já
                preenchida pelo que o pedido pede, e um atalho não é um
                acoplamento. */}
            {podeAssar && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
                <Botao
                  tamanho="sm"
                  variante="terciaria"
                  onClick={() =>
                    setFornada({ aberto: true, chave: `fornada-${novoId()}` })
                  }
                  iconeInicial={
                    <CookingPot
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  }
                >
                  Registrar fornada
                </Botao>
                <p className="max-w-[48ch] text-label text-ink-muted">
                  A massa que você fez para este pedido sai da despensa e da
                  lista de compras.
                </p>
              </div>
            )}

            {/* As deste pedido, com o desfazer. Aparecem mesmo quando o pedido
                não pode mais receber massa: o registro errado precisa poder
                sair de qualquer jeito. */}
            {fornadasDoPedido.length > 0 && (
              <FornadasRecentes contaId={contaId} fornadas={fornadasDoPedido} />
            )}
          </Bloco>
        ) : (
          <Bloco
            icone={ClipboardList}
            titulo="Como este pedido nasce"
            descricao="Dá para mudar depois: um orçamento aceito vira pedido confirmado em um toque."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {NASCIMENTOS.map((opcao) => (
                <Escolha
                  key={opcao.valor}
                  ativo={status === opcao.valor}
                  titulo={opcao.titulo}
                  explicacao={opcao.explicacao}
                  aoEscolher={() => setStatus(opcao.valor)}
                />
              ))}
            </div>
          </Bloco>
        )}

        <Bloco
          icone={UserRound}
          titulo="Para quem é"
          descricao="O nome basta. A cliente que compra uma vez na feira não precisa virar cadastro."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome da cliente"
              required
              autoFocus={!pedido}
              placeholder="Ana Beatriz"
              value={valores.clienteNome}
              erro={erros.clienteNome}
              onChange={(evento) => {
                definir("clienteNome", evento.target.value);
                // Mudar o nome à mão desfaz o vínculo: o cadastro aponta para
                // outra pessoa a partir daqui.
                if (valores.clienteId) definir("clienteId", "");
              }}
            />

            <Campo
              rotulo="Telefone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 90000-0000"
              dica="Opcional. É por onde a encomenda foi combinada."
              value={valores.clienteTelefone}
              onChange={(evento) =>
                definir("clienteTelefone", evento.target.value)
              }
            />
          </div>

          {clienteVinculado ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Selo
                tom="marca"
                icone={<UserRound aria-hidden className="size-3.5" />}
              >
                Cadastro de {clienteVinculado.nome}
              </Selo>
              <Botao
                tamanho="sm"
                variante="terciaria"
                onClick={() =>
                  setCadastro({ aberto: true, chave: `editar-${novoId()}` })
                }
              >
                Editar cadastro
              </Botao>
              <button
                type="button"
                onClick={() => definir("clienteId", "")}
                className="toque inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
              >
                <Unlink aria-hidden className="size-4" strokeWidth={1.75} />
                Desvincular
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sugestoesCliente.length > 0 && (
                <div>
                  <p className="text-label text-ink-muted">
                    Já cadastradas com esse nome:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {sugestoesCliente.map((candidata) => (
                      <button
                        key={candidata.id}
                        type="button"
                        onClick={() =>
                          vincularCliente({
                            id: candidata.id,
                            nome: candidata.nome,
                            telefone: candidata.telefone ?? "",
                          })
                        }
                        className="toque inline-flex items-center gap-2 rounded-full border border-line-strong px-3 text-label font-medium text-ink transition-colors duration-150 ease-quart hover:bg-sunken"
                      >
                        <Check
                          aria-hidden
                          className="size-4 text-wine-700 dark:text-wine-300"
                          strokeWidth={2}
                        />
                        {candidata.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Botao
                tamanho="sm"
                variante="terciaria"
                disabled={valores.clienteNome.trim().length < 2}
                onClick={() =>
                  setCadastro({ aberto: true, chave: `novo-${novoId()}` })
                }
                iconeInicial={
                  <UserPlus aria-hidden className="size-4" strokeWidth={1.75} />
                }
              >
                Cadastrar esta cliente
              </Botao>
            </div>
          )}
        </Bloco>

        <Bloco
          icone={Receipt}
          titulo="O que ela pediu"
          descricao="O preço entra congelado: mudar a ficha depois não mexe neste pedido."
          recuado={false}
        >
          <div className="lg:ml-8">
            <BuscaItem
              rotulo="Adicionar produto"
              placeholder="Buscar ficha"
              opcoes={opcoesFicha}
              aoEscolher={adicionarFicha}
              semResultado="Nenhuma ficha com esse nome. Só o que já está precificado pode entrar em um pedido."
            />
          </div>

          <div className="-mx-4 lg:-mx-5">
            {valores.itens.length === 0 ? (
              <p className="px-4 text-label text-ink-muted lg:px-5">
                Nenhum produto ainda. Busque acima e toque para adicionar.
              </p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {valores.itens.map((linha, indice) => {
                  const ficha = mapaFichas.get(linha.fichaTecnicaId);
                  const precoDaFicha = ficha?.precificacao.precoVenda;
                  const oferecer = ofereceOPrecoDeHoje(
                    status,
                    linha.precoUnitario,
                    precoDaFicha,
                  );
                  const combo = !!ficha && temEscolhas(ficha);
                  // Quem responde "dá?": a própria ficha ou, num combo à
                  // escolha, cada receita escolhida com a quantidade dela
                  // vezes a da linha (`#d103`). A capacidade é aritmética
                  // pura sobre o que a tela já tem, refeita a cada tecla: é
                  // assim que a resposta acompanha a quantidade enquanto ela
                  // digita.
                  // ponytail: `jaFeitas` e `prontos` são por ficha, e a mesma
                  // receita pode estar em duas linhas (solta e num combo);
                  // cada linha vê o total. Se confundir, o abate passa a ser
                  // por linha, na ordem.
                  const quantidadeDaLinha = parseParaNumero(linha.quantidade);
                  const perguntas =
                    !despensaPronta || !ficha
                      ? []
                      : combo
                        ? linha.escolhas.flatMap((escolha) => {
                            const receita = mapaFichas.get(
                              escolha.fichaTecnicaId,
                            );
                            return receita
                              ? [
                                  {
                                    receita,
                                    unidades:
                                      escolha.quantidade * quantidadeDaLinha,
                                    nome: receita.nome,
                                  },
                                ]
                              : [];
                          })
                        : [
                            {
                              receita: ficha,
                              unidades: quantidadeDaLinha,
                              nome: undefined,
                            },
                          ];

                  return (
                    <LinhaItemPedido
                      key={linha.chave}
                      nome={linha.nomeSnapshot}
                      detalhe={
                        linha.escolhas.length > 0
                          ? resumoDasEscolhas(linha.escolhas)
                          : undefined
                      }
                      quantidade={linha.quantidade}
                      precoUnitario={linha.precoUnitario}
                      subtotal={derivado.linhas[indice]?.subtotal ?? 0}
                      precoDeHoje={oferecer ? precoDaFicha : undefined}
                      aoMudarQuantidade={(valor) =>
                        mudarLinha(linha.chave, valor)
                      }
                      aoUsarPrecoDeHoje={() => usarPrecoDeHoje(linha.chave)}
                      aoRemover={() => removerLinha(linha.chave)}
                      erro={errosItens[indice]}
                    >
                      {/* A escolha abre embaixo da linha, sem painel e sem
                          modal: em 360px é uma lista curta com −/+. */}
                      {combo && ficha && (
                        <EscolhaDoCombo
                          kit={ficha}
                          escolhas={linha.escolhas}
                          fichas={fichas}
                          aoMudar={(receita, delta) =>
                            mudarEscolha(linha.chave, receita, delta)
                          }
                        />
                      )}
                      {perguntas.map(({ receita, unidades, nome }) => {
                        const capacidade = capacidadeDaFicha(
                          receita,
                          fichas,
                          insumos,
                          contextoDaDespensa.consumo,
                          hoje,
                          contextoDaDespensa.prometido,
                        );
                        return (
                          capacidade && (
                            <FraseCabeNoPedido
                              key={receita.id}
                              nome={nome}
                              capacidade={capacidade}
                              unidades={unidades}
                              jaFeitas={jaFeitasPorFicha.get(receita.id) ?? 0}
                              // O que está pronto, sem o que já é dos outros
                              // pedidos; o que é deste, a frase tira sozinha.
                              prontos={prontosLivres(
                                projecaoDoPronto(fornadas, receita, hoje),
                                contextoDaDespensa.reservado.get(receita.id) ??
                                  0,
                              )}
                            />
                          )
                        );
                      })}
                    </LinhaItemPedido>
                  );
                })}
              </ul>
            )}

            {erroDaLista && (
              <p
                role="alert"
                className="mt-3 px-4 text-label text-negative lg:px-5"
              >
                {erroDaLista}
              </p>
            )}
          </div>
        </Bloco>

        <Bloco
          icone={CalendarDays}
          titulo="Quando e como"
          descricao="A data manda na agenda: é por ela que o pedido aparece na tela Hoje."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Data da entrega"
              type="date"
              required
              value={valores.dataEntregaISO}
              erro={erros.dataEntregaISO}
              onChange={(evento) =>
                definir("dataEntregaISO", evento.target.value)
              }
            />
          </div>

          <fieldset>
            <legend className="text-label font-medium text-ink">
              Como ela recebe
            </legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {ENTREGAS.map((opcao) => (
                <Escolha
                  key={opcao.valor}
                  ativo={valores.tipoEntrega === opcao.valor}
                  titulo={opcao.titulo}
                  explicacao={opcao.explicacao}
                  icone={opcao.icone}
                  aoEscolher={() => trocarEntrega(opcao.valor)}
                />
              ))}
            </div>
          </fieldset>

          {valores.tipoEntrega === "ENTREGA" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoMoeda
                rotulo="Taxa de entrega"
                valor={valores.taxaEntrega}
                aoMudar={(centavos) => definir("taxaEntrega", centavos)}
                erro={erros.taxaEntrega}
                dica="Entra no total e não é custo: é dinheiro que você recebe."
              />
              <Campo
                rotulo="Endereço"
                placeholder="Rua das Acácias, 120 — apto 42"
                value={valores.endereco}
                onChange={(evento) => definir("endereco", evento.target.value)}
              />
            </div>
          )}
        </Bloco>

        <Bloco
          icone={Store}
          titulo="Pagamento"
          descricao="A taxa da maquininha sai do seu lucro, então ela aparece no total antes de você fechar o combinado."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Seletor
              rotulo="Como ela vai pagar"
              value={valores.formaPagamentoId}
              onChange={(evento) =>
                definir("formaPagamentoId", evento.target.value)
              }
            >
              <option value="">Ainda não sei</option>
              {formasVisiveis.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.nome}
                </option>
              ))}
            </Seletor>

            <CampoMoeda
              rotulo="Desconto"
              valor={valores.desconto}
              aoMudar={(centavos) => definir("desconto", centavos)}
              erro={erros.desconto}
              dica="O arredondamento que você deu para a cliente."
            />
          </div>

          {derivado.custoTaxaPagamento > 0 && (
            <p className="num text-label text-ink-muted">
              A maquininha fica com {formatarMoeda(derivado.custoTaxaPagamento)}{" "}
              deste pedido, e sobram{" "}
              {formatarMoeda(derivado.total - derivado.custoTaxaPagamento)} para
              você.
            </p>
          )}

          {formasVisiveis.length === 0 && (
            <p className="text-label text-ink-muted">
              Você ainda não cadastrou formas de pagamento.{" "}
              <Link
                href="/configuracao"
                className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
              >
                Cadastrar agora
              </Link>
            </p>
          )}
        </Bloco>

        {/* Depois do pagamento, porque é a ordem em que a encomenda acontece:
            ela combina, produz, entrega, e só então recebe. O pedido que ainda
            não existe não tem o que pagar — nem o que confirmar: um resumo sem
            código não é um pedido, é uma proposta (`DECISOES.md#d78`). */}
        {pedido && (
          <>
            {/* O orçamento vem antes da confirmação, na ordem em que a venda
                acontece. A folha lê o gravado (`#d107`), o WhatsApp lê a tela
                (`#d78`): um é documento assinado, o outro é conversa. */}
            <BlocoOrcamento
              pedidoId={pedido.id}
              validoAteISO={valores.validoAteISO}
              aoMudarValidade={(iso) => definir("validoAteISO", iso)}
              hoje={hoje}
              temItens={itensResolvidos.length > 0}
            />

            <BlocoWhatsApp
              resumo={resumoParaCliente(pedido)}
              telefone={valores.clienteTelefone}
            />

            <BlocoPagamento
              pedido={pedido}
              pagoEmISO={pagoEmISO}
              aoMudarData={setPagoEmISO}
              aoPagar={() => void pagar()}
              aoDesfazer={() => void desfazer()}
              ocupado={salvando}
              semAgregado={resumoDoPagamento.carregando}
            />
          </>
        )}

        <Bloco
          icone={NotebookPen}
          titulo="Observações"
          descricao="O que você vai querer lembrar na hora de produzir e de embalar."
        >
          <EnvelopeCampo id={idObservacoes} rotulo="Sobre este pedido">
            <textarea
              id={idObservacoes}
              rows={3}
              value={valores.observacoes}
              placeholder="Sem nozes. Laço vinho. Entregar depois das 18h."
              onChange={(evento) => definir("observacoes", evento.target.value)}
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-body text-ink transition-colors duration-150 ease-quart placeholder:text-ink-subtle"
            />
          </EnvelopeCampo>
        </Bloco>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}

        {pedido &&
          (confirmandoArquivo ? (
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4">
              <p className="text-label text-ink">
                Arquivar este pedido? Ele sai da agenda e não volta na lista.
                Para dizer que a encomenda não vai acontecer, o certo é{" "}
                <strong className="font-semibold">cancelar</strong>: arquivar é
                para o pedido que foi anotado duas vezes.
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
                Arquivar pedido
              </Botao>
            </div>
          ))}
      </div>

      <PainelPedido derivado={derivado} />

      <PainelCliente
        aberto={cadastro.aberto}
        chave={cadastro.chave}
        contaId={contaId}
        cliente={clienteVinculado}
        nomeSugerido={valores.clienteNome.trim()}
        aoSalvar={vincularCliente}
        aoFechar={() => setCadastro({ aberto: false, chave: cadastro.chave })}
      />

      {pedido && podeAssar && (
        <PainelFornada
          aberto={fornada.aberto}
          chave={fornada.chave}
          aoFechar={() => setFornada({ aberto: false, chave: fornada.chave })}
          contaId={contaId}
          opcoes={opcoesDeFornada}
          fichas={fichas}
          insumos={insumos}
          fornadas={fornadas}
          hoje={hoje}
          pedido={{ id: pedido.id, clienteNome: pedido.clienteNome }}
        />
      )}
    </>
  );
}

/** Um cartão de escolha: o mesmo desenho do seletor de tipo da ficha. */
function Escolha({
  ativo,
  titulo,
  explicacao,
  icone: Icone,
  aoEscolher,
}: {
  ativo: boolean;
  titulo: string;
  explicacao: string;
  icone?: LucideIcon;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoEscolher}
      className={cn(
        "rounded-md border p-3 text-left transition-colors duration-150 ease-quart",
        ativo
          ? "border-wine-700 bg-wine-100"
          : "border-line-strong hover:bg-sunken",
      )}
    >
      <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
        {ativo ? (
          <Check
            aria-hidden
            className="size-4 shrink-0 text-wine-700 dark:text-wine-300"
            strokeWidth={2}
          />
        ) : (
          Icone && (
            <Icone
              aria-hidden
              className="size-4 shrink-0 text-ink-muted"
              strokeWidth={1.75}
            />
          )
        )}
        {titulo}
      </span>
      <span className="mt-1 block text-label text-ink-muted">{explicacao}</span>
    </button>
  );
}
