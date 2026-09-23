import type {
  Centavos,
  ConfiguracaoGeral,
  Conta,
  FichaTecnica,
} from "@/lib/types";
import { situacaoDaConta } from "./assinatura";
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

/** Arquivada, inativa, sem preço, por peso ou combo à escolha: fora. */
export function entraNoCardapio(ficha: FichaTecnica): boolean {
  return (
    !ficha.arquivado &&
    ficha.ativo &&
    ficha.precificacao.precoVenda > 0 &&
    UNIDADE[ficha.unidadeRendimento] !== undefined &&
    !(ficha.tipo === "KIT" && (ficha.escolhas?.length ?? 0) > 0)
  );
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
  const produtos = fichas
    .filter((ficha) => naLista.has(ficha.id) && entraNoCardapio(ficha))
    .map(produtoDoCardapio);
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
