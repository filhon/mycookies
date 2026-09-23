import { z } from "zod";
import {
  VERSAO_SCHEMA,
  type Centavos,
  type ConfiguracaoGeral,
  type Conta,
  type DataISO,
  type EscolhaDoKit,
  type EscolhaFeita,
  type FichaTecnica,
  type ItemPedido,
  type Pedido,
} from "@/lib/types";
import { situacaoDaConta } from "./assinatura";
import { opcoesDaEscolha, temEscolhas } from "./custoFicha";
import {
  competenciaDeISO,
  dataDeISO,
  dataISODe,
  diaVizinho,
  rotuloDiaPorExtenso,
} from "./datas";
import { formatarMoeda } from "./money";
import {
  codigoDoPedido,
  custoDoComboMontado,
  derivarPedido,
  escolhasCompletas,
  nomeComEscolhas,
  quantidadeEmTexto,
} from "./pedido";
import { telefoneParaWhatsApp } from "./whatsapp";

/**
 * O cardápio público (spec 031): o que sai da conta para quem não entrou.
 *
 * Puro, e o único lugar que decide o que é público. A página, a rota da foto,
 * o painel da dona e (na sessão B) o handler do pedido passam por aqui, e a
 * regra do Firestore continua sem nada aberto (`DECISOES.md#d158`).
 */

/** Freio da leitura da página: o painel não deixa marcar mais. */
export const LIMITE_DO_CARDAPIO = 40;

/** O que a página mostra de um produto. Nada de custo (`#d158`). */
export interface ProdutoDoCardapio {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  preco: Centavos;
  /** "un" ou "porção": o rótulo, pronto para a tela. */
  unidade: string;
  /** `atualizadoEm` em ms, para o `?v=` da foto; ausente = sem foto. */
  fotoVersao?: number;
  /** Kit fixo: a soma dos de dentro pelo preço de hoje, quando passa do preço do kit (`#d163`). */
  avulso?: Centavos;
  /** Combo à escolha: o que a cliente monta. */
  escolhas?: {
    categoria: string;
    quantidade: number;
    opcoes: OpcaoDoCombo[];
  }[];
  /** Combo à escolha: a economia da combinação mais barata, quando é positiva. */
  economiaMinima?: Centavos;
}

export interface OpcaoDoCombo {
  id: string;
  nome: string;
  /** Só quando a opção está na página; sem ele, a combinação não mostra economia. */
  preco?: Centavos;
}

export interface Cardapio {
  negocio: {
    nome: string;
    /** Primeiro nome de `proprietaria`, para "a Maynara confirma pelo WhatsApp". */
    quem: string;
    frase?: string;
    /** Já passado por `telefoneParaWhatsApp`; ausente quando não dá para discar. */
    whatsapp?: string;
    /** Sem o @. */
    instagram?: string;
    /** `!ocultarFeitoCom` (`#d147`). */
    feitoComRende: boolean;
  };
  /** Na ordem de `categoriasProduto`, e categoria desconhecida no fim; nome dentro. */
  secoes: { categoria: string; produtos: ProdutoDoCardapio[] }[];
}

const UNIDADE: Partial<Record<FichaTecnica["unidadeRendimento"], string>> = {
  un: "un",
  porcao: "porção",
};

/**
 * O `Content-Type` da foto gravada, ou `null` quando ela não sai pela rota.
 * WebP entra ao lado dos dois da spec: é o que o `CampoImagem` grava para
 * foto com fundo transparente onde o navegador codifica (`orcamento.ts`).
 */
export function tipoDaFoto(fotoUrl?: string): string | null {
  const achado = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(fotoUrl ?? "");
  return achado ? achado[1]! : null;
}

/** Arquivada, inativa, sem preço ou por peso: fora. O combo à escolha entra desde a sessão C. */
export function entraNoCardapio(ficha: FichaTecnica): boolean {
  return (
    !ficha.arquivado &&
    ficha.ativo &&
    ficha.precificacao.precoVenda > 0 &&
    UNIDADE[ficha.unidadeRendimento] !== undefined
  );
}

/** As receitas que servem a uma escolha do combo na página: as da 014, e só as ativas. */
function opcoesVivas<F extends FichaTecnica>(
  escolha: Pick<EscolhaDoKit, "categoria">,
  opcoes: F[],
  kitId: string,
): F[] {
  return opcoesDaEscolha(escolha, opcoes, kitId).filter((f) => f.ativo);
}

/**
 * Agrupa por categoria, na ordem de `categoriasProduto` e a desconhecida no
 * fim; nome dentro. A página e o painel da dona mostram na mesma ordem.
 */
export function porCategoria<T extends { categoria: string; nome: string }>(
  itens: T[],
  ordem: string[] = [],
): { categoria: string; itens: T[] }[] {
  const posicao = (categoria: string) => {
    const i = ordem.indexOf(categoria);
    return i === -1 ? ordem.length : i;
  };
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    grupos.set(item.categoria, [...(grupos.get(item.categoria) ?? []), item]);
  }
  return [...grupos]
    .map(([categoria, lista]) => ({
      categoria,
      itens: lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .sort(
      (a, b) =>
        posicao(a.categoria) - posicao(b.categoria) ||
        a.categoria.localeCompare(b.categoria, "pt-BR"),
    );
}

function produtoDoCardapio(ficha: FichaTecnica): ProdutoDoCardapio {
  const descricao = ficha.descricao?.trim();
  return {
    id: ficha.id,
    nome: ficha.nome,
    ...(descricao ? { descricao } : {}),
    categoria: ficha.categoria,
    preco: ficha.precificacao.precoVenda,
    unidade: UNIDADE[ficha.unidadeRendimento]!,
    ...(tipoDaFoto(ficha.fotoUrl)
      ? { fotoVersao: ficha.atualizadoEm?.toMillis() ?? 0 }
      : {}),
  };
}

/**
 * O produto, mais a conta do combo (`#d163`). Kit fixo: `avulso` só quando
 * todo o de dentro está na página e junto sai mais caro. Combo à escolha: as
 * opções vivas de cada escolha, e `null` (some da página) quando uma escolha
 * não tem nenhuma.
 */
function comboDoCardapio(
  ficha: FichaTecnica,
  precoNaPagina: Map<string, Centavos>,
  opcoes: FichaTecnica[],
): ProdutoDoCardapio | null {
  const produto = produtoDoCardapio(ficha);
  if (ficha.tipo !== "KIT") return produto;

  // A parte fixa, pelo preço da página; `null` quando algo de dentro não está nela.
  let fixo: Centavos | null = 0;
  for (const componente of ficha.componentes) {
    const preco = precoNaPagina.get(componente.fichaId);
    if (preco === undefined || fixo === null) fixo = null;
    else fixo += Math.round(preco * componente.quantidade);
  }

  if (!temEscolhas(ficha)) {
    return fixo !== null && ficha.componentes.length > 0 && fixo > produto.preco
      ? { ...produto, avulso: fixo }
      : produto;
  }

  // ponytail: combo à escolha com parte fixa não mostra economia (as opções
  // saem sem preço), porque a página não carrega o preço da parte fixa. Um
  // campo com essa soma quando existir um combo assim no cardápio.
  const comPreco = ficha.componentes.length === 0;
  const escolhas = (ficha.escolhas ?? []).map((escolha) => ({
    categoria: escolha.categoria,
    quantidade: escolha.quantidade,
    opcoes: opcoesVivas(escolha, opcoes, ficha.id)
      .map((opcao): OpcaoDoCombo => {
        const preco = comPreco ? precoNaPagina.get(opcao.id) : undefined;
        return {
          id: opcao.id,
          nome: opcao.nome,
          ...(preco !== undefined ? { preco } : {}),
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  }));
  if (escolhas.some((escolha) => escolha.opcoes.length === 0)) return null;

  // A combinação mais barata entre as opções com preço; sem nenhuma numa
  // escolha, nenhuma combinação mostra economia, e a linha também não.
  let maisBarata: Centavos | null = 0;
  for (const escolha of escolhas) {
    const precos = escolha.opcoes.flatMap((o) =>
      o.preco === undefined ? [] : [o.preco],
    );
    if (precos.length === 0 || maisBarata === null) maisBarata = null;
    else maisBarata += Math.min(...precos) * escolha.quantidade;
  }
  const economiaMinima = maisBarata === null ? 0 : maisBarata - produto.preco;

  return {
    ...produto,
    escolhas,
    ...(economiaMinima > 0 ? { economiaMinima } : {}),
  };
}

/**
 * A economia de uma combinação montada, ou `null` quando alguma opção não tem
 * preço na página. Da tela de montar e do teste: o servidor não a usa, porque
 * a economia não é gravada.
 */
export function economiaDoCombo(
  produto: ProdutoDoCardapio,
  escolhas: { fichaId: string; quantidade: number }[],
): Centavos | null {
  const opcoes = (produto.escolhas ?? []).flatMap((e) => e.opcoes);
  let avulso = 0;
  for (const escolha of escolhas) {
    const preco = opcoes.find((o) => o.id === escolha.fichaId)?.preco;
    if (preco === undefined) return null;
    avulso += preco * escolha.quantidade;
  }
  return avulso - produto.preco;
}

/**
 * Tudo o que a página desenha, ou `null` para "este cardápio não está aberto":
 * sem configuração, `aberto` falso, conta encerrada, conta vencida
 * (`situacaoDaConta`), ou nenhum produto que entre. Os cinco casos dão a
 * mesma resposta, de propósito: a página não diz a um estranho se a conta existe.
 */
export function montarCardapio(entrada: {
  conta: Conta;
  configuracao: ConfiguracaoGeral | null;
  /** As fichas de `cardapio.fichaIds` que existem; a função filtra o resto. */
  fichas: FichaTecnica[];
  /** As fichas das categorias de escolha dos combos da lista; a função filtra. */
  opcoes: FichaTecnica[];
  agoraMs: number;
}): Cardapio | null {
  const { conta, configuracao, fichas, agoraMs } = entrada;
  const cardapio = configuracao?.cardapio;
  if (!configuracao || !cardapio?.aberto) return null;
  if (conta.status === "ENCERRADA") return null;

  // Vencida lê e não escreve (`#d144`): não conseguiria responder o orçamento.
  const situacao = situacaoDaConta(
    {
      plano: conta.plano,
      trialAteMs: conta.trialAte?.toMillis(),
      assinaturaAteMs: conta.assinaturaAte?.toMillis(),
    },
    agoraMs,
  );
  if (situacao.tipo === "vencida") return null;

  const naLista = new Set(cardapio.fichaIds);
  const naPagina = fichas.filter(
    (ficha) => naLista.has(ficha.id) && entraNoCardapio(ficha),
  );
  // O preço que a própria página cobra: é contra ele que o combo economiza (`#d163`).
  const precoNaPagina = new Map(
    naPagina.map((ficha) => [ficha.id, ficha.precificacao.precoVenda]),
  );
  const produtos = naPagina
    .map((ficha) => comboDoCardapio(ficha, precoNaPagina, entrada.opcoes))
    .filter((produto) => produto !== null);
  if (produtos.length === 0) return null;

  const secoes = porCategoria(produtos, configuracao.categoriasProduto).map(
    ({ categoria, itens }) => ({ categoria, produtos: itens }),
  );

  const whatsapp = telefoneParaWhatsApp(configuracao.contato?.telefone);
  const instagram = configuracao.contato?.instagram?.trim().replace(/^@+/, "");
  const frase = configuracao.frase?.trim();

  return {
    negocio: {
      nome: conta.nome,
      quem: conta.proprietaria.trim().split(/\s+/)[0] ?? "",
      ...(frase ? { frase } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(instagram ? { instagram } : {}),
      feitoComRende: !configuracao.ocultarFeitoCom,
    },
    secoes,
  };
}

/** O texto do botão "Falar no WhatsApp" da vitrine. */
export function mensagemDeContato(negocio: Cardapio["negocio"]): string {
  return `Oi, ${negocio.nome}! Vi o cardápio e queria fazer um pedido.`;
}

// ---------------------------------------------------------------------------
// O pedido pelo cardápio (sessão B)
// ---------------------------------------------------------------------------

/** O teto do estrago de uma rota que escreve sem login (`#d161`). */
export const LIMITE_DE_ORCAMENTOS_EM_ABERTO = 20;
/** O dia mais distante que a cliente escolhe, contando de hoje. */
export const DIAS_A_FRENTE = 90;
const QUANTIDADE_MAXIMA = 500;

/** O que a página manda: ids e quantidades, nunca preço (`#d160`). */
export const esquemaPedidoDoCardapio = z.object({
  contaId: z.string().trim().min(1),
  nome: z.string().trim().min(2).max(80),
  telefone: z
    .string()
    .trim()
    .refine((t) => telefoneParaWhatsApp(t) != null),
  itens: z
    .array(
      z.object({
        fichaId: z.string().min(1),
        quantidade: z.number().int().min(1).max(QUANTIDADE_MAXIMA),
        /** O combo à escolha, por UMA unidade dele (como `EscolhaFeita`). */
        escolhas: z
          .array(
            z.object({
              fichaId: z.string().min(1),
              quantidade: z.number().int().min(1).max(50),
            }),
          )
          .min(1)
          .max(12)
          .optional(),
      }),
    )
    .min(1)
    .max(30),
  dataEntregaISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entrega: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("RETIRADA") }),
    z.object({
      tipo: z.literal("ENTREGA"),
      endereco: z.string().trim().min(5).max(200),
    }),
  ]),
  observacoes: z.string().trim().max(500).optional(),
  /** O pote de mel (`#d161`). Qualquer coisa aqui é robô. */
  site: z.string().optional(),
});

export type PedidoDoCardapio = z.infer<typeof esquemaPedidoDoCardapio>;

export type FalhaPedidoCardapio =
  | "fora-de-forma" // esquema, ou item repetido que soma mais de 500
  | "fechado" // montarCardapio devolveria null
  | "mudou" // item que saiu do cardápio desde que a página abriu
  | "data" // antes de amanhã ou depois de DIAS_A_FRENTE
  | "cheio" // LIMITE_DE_ORCAMENTOS_EM_ABERTO
  | "sem-configuracao"
  | "sem-resposta"
  | "sem-rede";

/** A voz é a da confeiteira falando com a cliente, e não a do Rende. */
export const MENSAGEM_FALHA_PEDIDO_CARDAPIO: Record<
  FalhaPedidoCardapio,
  string
> = {
  "fora-de-forma":
    "Confira o nome, o WhatsApp com DDD e, se for entrega, o endereço.",
  fechado: "O cardápio fechou enquanto você escolhia. Fale pelo WhatsApp.",
  mudou: "O cardápio mudou enquanto você escolhia. Confira e mande de novo.",
  data: `Escolha um dia entre amanhã e os próximos ${DIAS_A_FRENTE} dias.`,
  cheio:
    "Chegaram muitos pedidos de uma vez. Para não se perder, mande o seu pelo WhatsApp.",
  "sem-configuracao":
    "Não deu para enviar agora. Tente de novo daqui a pouco, ou mande pelo WhatsApp.",
  "sem-resposta":
    "Não deu para enviar agora. Tente de novo daqui a pouco, ou mande pelo WhatsApp.",
  "sem-rede": "Parece que a internet caiu. Conecte e toque em Enviar de novo.",
};

/**
 * O documento que o handler grava, menos os três `Timestamp` que o Admin SDK
 * cria. Os opcionais vazios ficam **ausentes**, e não `null` como em
 * `corpoDoPedido`: aqui é só criação, e o tipo não aceita `null`.
 */
export type CorpoDoPedidoDoCardapio = Omit<
  Pedido,
  "id" | "criadoEm" | "atualizadoEm" | "dataEntrega"
> & { origem: "CARDAPIO" };

/** Dia de calendário que existe: '2026-02-31' não volta igual. */
function diaValido(iso: DataISO): boolean {
  return dataISODe(dataDeISO(iso)) === iso;
}

type EscolhaPedida = { fichaId: string; quantidade: number };

/** A mesma receita duas vezes numa escolha vira uma, na ordem em que apareceu. */
function somarPorFicha(escolhas: EscolhaPedida[]): EscolhaPedida[] {
  const soma = new Map<string, number>();
  for (const e of escolhas) {
    soma.set(e.fichaId, (soma.get(e.fichaId) ?? 0) + e.quantidade);
  }
  return [...soma].map(([fichaId, quantidade]) => ({ fichaId, quantidade }));
}

/**
 * O pedido que o handler grava, com o preço e o custo de AGORA, lidos da ficha
 * (`#d160`). A mesma ficha com as mesmas escolhas em duas linhas vira uma
 * linha só; duas Duplas com sabores diferentes são duas. Falha `mudou`
 * quando um item ou um sabor não está mais na lista ou deixou de servir.
 */
export function pedidoDoCardapio(entrada: {
  pedido: PedidoDoCardapio;
  fichas: FichaTecnica[];
  /** As fichas das opções dos combos; a função confere se ainda servem. */
  opcoes: FichaTecnica[];
  fichaIds: string[];
  hojeISO: DataISO;
}):
  | { ok: true; corpo: CorpoDoPedidoDoCardapio }
  | { ok: false; falha: FalhaPedidoCardapio } {
  const { pedido, fichas, opcoes, fichaIds, hojeISO } = entrada;

  const linhas = new Map<
    string,
    { fichaId: string; quantidade: number; escolhas: EscolhaPedida[] }
  >();
  for (const item of pedido.itens) {
    const escolhas = somarPorFicha(item.escolhas ?? []);
    const chave = JSON.stringify([
      item.fichaId,
      [...escolhas].sort((a, b) => a.fichaId.localeCompare(b.fichaId)),
    ]);
    const linha = linhas.get(chave);
    if (linha) linha.quantidade += item.quantidade;
    else linhas.set(chave, { ...item, escolhas });
  }
  if ([...linhas.values()].some((l) => l.quantidade > QUANTIDADE_MAXIMA)) {
    return { ok: false, falha: "fora-de-forma" };
  }

  const dia = pedido.dataEntregaISO;
  if (
    !diaValido(dia) ||
    dia <= hojeISO ||
    dia > diaVizinho(hojeISO, DIAS_A_FRENTE)
  ) {
    return { ok: false, falha: "data" };
  }

  const naLista = new Set(fichaIds);
  const itens: ItemPedido[] = [];
  for (const { fichaId, quantidade, escolhas } of linhas.values()) {
    const ficha = fichas.find((f) => f.id === fichaId);
    if (!ficha || !naLista.has(fichaId) || !entraNoCardapio(ficha)) {
      return { ok: false, falha: "mudou" };
    }
    const combo = temEscolhas(ficha);
    if (combo !== escolhas.length > 0) {
      return { ok: false, falha: "fora-de-forma" };
    }

    const feitas: EscolhaFeita[] = [];
    for (const escolha of escolhas) {
      const opcao = opcoes.find((o) => o.id === escolha.fichaId);
      const serve =
        opcao &&
        (ficha.escolhas ?? []).some(
          (e) => opcoesVivas(e, [opcao], ficha.id).length > 0,
        );
      if (!serve) return { ok: false, falha: "mudou" };
      feitas.push({
        fichaTecnicaId: opcao.id,
        nomeSnapshot: opcao.nome,
        quantidade: escolha.quantidade,
        custoUnitarioSnapshot: opcao.custoUnitario,
      });
    }
    if (
      combo &&
      !escolhasCompletas(
        ficha,
        feitas,
        (id) => opcoes.find((o) => o.id === id)?.categoria,
      ).completas
    ) {
      return { ok: false, falha: "fora-de-forma" };
    }

    itens.push({
      fichaTecnicaId: fichaId,
      nomeSnapshot: ficha.nome,
      quantidade,
      precoUnitario: ficha.precificacao.precoVenda,
      // O combo montado, como no editor de pedido (`#d100`).
      custoUnitarioSnapshot: combo
        ? custoDoComboMontado(ficha, feitas)
        : ficha.custoUnitario,
      subtotal: 0,
      ...(combo ? { escolhas: feitas } : {}),
    });
  }

  const derivado = derivarPedido({ itens, desconto: 0, taxaEntrega: 0 });
  derivado.linhas.forEach((linha, i) => (itens[i]!.subtotal = linha.subtotal));

  const observacoes = pedido.observacoes?.trim();

  return {
    ok: true,
    corpo: {
      v: VERSAO_SCHEMA,
      // Pela data de Brasília, e não pela da máquina: `dataDeISO` devolve a
      // meia-noite local do dia, que é o que `codigoDoPedido` lê.
      codigo: codigoDoPedido(dataDeISO(hojeISO)),
      origem: "CARDAPIO",
      // Sem `clienteId`: cliente se cadastra pela dona, não pelo link.
      clienteNome: pedido.nome,
      clienteTelefone: pedido.telefone,
      itens,
      // As escolhidas entram, como em `corpoDoPedido`: a Dupla com Red Velvet contém Red Velvet.
      fichaIds: [
        ...new Set(
          itens.flatMap((item) => [
            item.fichaTecnicaId,
            ...(item.escolhas ?? []).map((e) => e.fichaTecnicaId),
          ]),
        ),
      ],
      status: "ORCAMENTO",
      dataEntregaISO: dia,
      competencia: competenciaDeISO(dia),
      // A taxa é combinada depois, e a página diz isso antes do envio.
      entrega:
        pedido.entrega.tipo === "ENTREGA"
          ? { tipo: "ENTREGA", taxa: 0, endereco: pedido.entrega.endereco }
          : { tipo: "RETIRADA", taxa: 0 },
      subtotal: derivado.subtotal,
      desconto: 0,
      total: derivado.total,
      custoTaxaPagamento: 0,
      custoTotalEstimado: derivado.custoTotalEstimado,
      lucroEstimado: derivado.lucroEstimado,
      pago: false,
      arquivado: false,
      ...(observacoes ? { observacoes } : {}),
    },
  };
}

/** "na sexta-feira", mas "no sábado" e "no domingo". */
function noDia(iso: DataISO): string {
  const escrito = rotuloDiaPorExtenso(iso);
  return `${/^(sábado|domingo)/.test(escrito) ? "no" : "na"} ${escrito}`;
}

/**
 * O que a cliente manda para a dona depois de gravar. "Meu nome é", e não
 * "Sou a": quem pede pode ser homem, e o texto sai no nome dele.
 */
export function mensagemDeAviso(entrada: {
  negocio: string;
  codigo: string;
  nome: string;
  itens: {
    nome: string;
    quantidade: number;
    escolhas?: { quantidade: number; nomeSnapshot: string }[];
  }[];
  total: Centavos;
  dataEntregaISO: DataISO;
  entrega: "RETIRADA" | "ENTREGA";
}): string {
  const itens = entrada.itens
    .map(
      (item) =>
        `${quantidadeEmTexto(item.quantidade)} ${nomeComEscolhas({ nomeSnapshot: item.nome, escolhas: item.escolhas })}`,
    )
    .join(", ");
  const total =
    entrada.entrega === "ENTREGA"
      ? `${formatarMoeda(entrada.total)} sem a entrega, para receber`
      : `${formatarMoeda(entrada.total)}, para retirar`;
  const nome = entrada.nome.trim().split(/\s+/)[0] ?? "";

  return (
    `Oi, ${entrada.negocio}! Acabei de fazer o pedido ${entrada.codigo} pelo cardápio: ${itens}. ` +
    `Total ${total} ${noDia(entrada.dataEntregaISO)}. Meu nome é ${nome}.`
  );
}
