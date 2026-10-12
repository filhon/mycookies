import type {
  Centavos,
  ConfiguracaoGeral,
  Conta,
  DataISO,
  FichaTecnica,
  Pedido,
  StatusPedido,
  VitrineDoCardapio,
} from "@/lib/types";
import { pixDoPedido } from "./acompanhamento";
import { SUFIXO_UNIDADE_RENDIMENTO } from "./custoFicha";
import { diaVizinho, rotuloDataCompleta } from "./datas";
import { faltaPagar, resumoDasEscolhas, subtotalDoItem } from "./pedido";

/**
 * O orçamento em papel: a folha A4 que a empresa lê sem a Maynara junto.
 *
 * O resumo do WhatsApp confirma uma conversa (`whatsapp.ts`); a folha é o que
 * a empresa assina. Por isso ela lê o documento **gravado**, e não a tela
 * (`DECISOES.md#d107`), e por isso o texto do "Combinado" é comparado inteiro
 * no teste: vai direto para uma empresa sem passar por ninguém.
 *
 * Puro de propósito: é aqui que mora tudo o que pode dar errado.
 */

/** Quantos dias o preço vale, por sugestão. Ela edita antes de salvar. */
export const DIAS_DE_VALIDADE = 7;

// As duas únicas imagens que o sistema grava, e os tetos que as guardam
// (`DECISOES.md#d109`): a redução acontece no aparelho, antes de gravar.
export const FOTO_LADO_PX = 320;
export const FOTO_MAX_BYTES = 80_000;
/**
 * Foto com fundo transparente (o recorte do cardápio) preserva o alpha: sai
 * WebP onde o navegador codifica e PNG onde não (Safari), e PNG de textura de
 * cookie a 320 px não cabe em 80 KB. O teto é o da assinatura.
 */
export const FOTO_COM_ALPHA_MAX_BYTES = 200_000;
export const ASSINATURA_LADO_PX = 720;
export const ASSINATURA_MAX_BYTES = 200_000;

/** PNG e WebP carregam transparência; JPEG, nunca. Decide `contain` ou `cover`. */
export function temAlpha(dataUrl: string): boolean {
  return /^data:image\/(png|webp)[;,]/.test(dataUrl);
}

/**
 * Quantos bytes a imagem de um `data:` URL ocupa, sem decodificá-la: base64
 * gasta 4 caracteres por 3 bytes, e o `=` do fim é enchimento.
 */
export function tamanhoDoDataUrl(url: string): number {
  const virgula = url.indexOf(",");
  const corpo = virgula >= 0 ? url.slice(virgula + 1) : url;
  const enchimento = corpo.endsWith("==") ? 2 : corpo.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((corpo.length * 3) / 4) - enchimento);
}

/** hoje + `DIAS_DE_VALIDADE`. Sugestão, e não dado (`#d17`): salvar grava. */
export function validadeSugerida(hojeISO: DataISO): DataISO {
  return diaVizinho(hojeISO, DIAS_DE_VALIDADE);
}

export type SituacaoDaValidade =
  "sem-prazo" | "valido" | "vence-hoje" | "vencido";

/** ISO compara como texto: 'YYYY-MM-DD' ordena sozinho. */
export function situacaoDaValidade(
  validoAteISO: DataISO | undefined,
  hojeISO: DataISO,
): SituacaoDaValidade {
  if (!validoAteISO) return "sem-prazo";
  if (validoAteISO > hojeISO) return "valido";
  if (validoAteISO === hojeISO) return "vence-hoje";
  return "vencido";
}

export interface LinhaDoOrcamento {
  /** `nomeSnapshot` sozinho: o que tem dentro do combo vai em `composicao`. */
  nome: string;
  /** "1 Cookie Pistache + 1 Cookie Red Velvet", só no combo (`resumoDasEscolhas`). */
  composicao?: string;
  /** Da ficha viva; ausente em ficha arquivada ou sem descrição (`#d108`). */
  descricao?: string;
  fotoUrl?: string;
  /**
   * Combo sem foto própria: as fotos das escolhas com ficha viva, até duas,
   * que a folha sobrepõe. Vazia quando a linha tem foto própria.
   */
  fotosDasEscolhas: string[];
  quantidade: number;
  /** 'un', 'porções', 'g', 'ml', da ficha viva; 'un' quando a ficha se foi. */
  unidade: string;
  precoUnitario: Centavos;
  /** `subtotalDoItem`, a mesma função do rodapé e do WhatsApp. */
  subtotal: Centavos;
}

export interface Orcamento {
  negocio: {
    nome: string;
    proprietaria: string;
    telefone?: string;
    /** Sem o `@`: a folha o desenha. */
    instagram?: string;
    assinaturaDataUrl?: string;
    /** A frase dela no rodapé (`#d127`). */
    frase?: string;
    /** O logo da vitrine do cardápio, `data:` URL (`#d356`). */
    logo?: string;
    /** O combinado de sempre, com as linhas dela (`#d356`). */
    condicoes?: string;
    /** Some quando `ocultarFeitoCom` (spec 028, `#d147`). */
    feitoCom: boolean;
  };
  codigo: string;
  /** O título e o fecho seguem o status; o resto da folha não (`#d354`). */
  status: StatusPedido;
  /** O dia da impressão, e não um campo gravado (`#d110`). */
  emitidoEmISO: DataISO;
  /** Só no orçamento: pedido confirmado não tem preço por vencer (`#d354`). */
  validoAteISO?: DataISO;
  empresa: string;
  linhas: LinhaDoOrcamento[];
  /** Alguma linha tem foto: sem nenhuma, a coluna da miniatura some. */
  temFoto: boolean;
  subtotal: Centavos;
  desconto: Centavos;
  taxaEntrega: Centavos;
  total: Centavos;
  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    dataISO: DataISO;
    /** "HH:MM", quando foi combinada (`#d251`). */
    hora?: string;
    endereco?: string;
  };
  formaNome?: string;
  formaInstrucoes?: string;
  pago: boolean;
  /** O sinal recebido, enquanto o pedido não está quitado. */
  sinal?: Centavos;
  /** `faltaPagar`, a mesma do acompanhamento. */
  falta: Centavos;
  /** O copia e cola do que falta, para o QR: `pixDoPedido` (`#d355`). */
  pix?: string;
}

/** O rótulo do topo da folha (`#d354`). A folha o desenha em caixa alta. */
export function rotuloDaFolha(status: StatusPedido): string {
  if (status === "ORCAMENTO") return "Orçamento";
  if (status === "ENTREGUE") return "Pedido entregue";
  return "Pedido confirmado";
}

// O que cada documento precisa entregar. `Pick` em vez do tipo inteiro pelo
// mesmo motivo de `PedidoParaEntrega`: `Timestamp` não atravessa para o
// domínio, e o teste monta só o que a folha lê.
export type PedidoParaOrcar = Pick<
  Pedido,
  | "codigo"
  | "status"
  | "clienteNome"
  | "itens"
  | "subtotal"
  | "desconto"
  | "total"
  | "dataEntregaISO"
  | "horaEntrega"
  | "formaPagamentoId"
  | "validoAteISO"
  | "pago"
> & {
  entrega: Pick<Pedido["entrega"], "tipo" | "taxa" | "endereco">;
  sinal?: { valor: Centavos } | null;
};

/** A foto e a descrição vêm da ficha viva (`#d108`). */
export type FichaParaOrcar = Pick<
  FichaTecnica,
  "id" | "unidadeRendimento" | "fotoUrl" | "descricao"
>;

export type ConfiguracaoParaOrcar = Pick<
  ConfiguracaoGeral,
  | "nomeNegocio"
  | "formasPagamento"
  | "contato"
  | "assinaturaDataUrl"
  | "frase"
  | "condicoes"
  | "ocultarFeitoCom"
>;

/** Só entra no objeto o que tem valor: ausência é ausência, e não `undefined`. */
function opcional<K extends string>(
  chave: K,
  valor: string | undefined | null,
): Partial<Record<K, string>> {
  const limpo = valor?.trim();
  return limpo ? ({ [chave]: limpo } as Record<K, string>) : {};
}

/**
 * O pé da folha: o contato, a frase, as condições, a assinatura e o "feito
 * com"; e o logo do topo, da vitrine do cardápio (`#d356`). A folha lê a
 * configuração gravada; a prévia da Configuração passa o formulário, para
 * mostrar a folha enquanto ela digita (spec 087, `#d289`).
 */
export function negocioDaFolha(
  conta: Pick<Conta, "nome" | "proprietaria">,
  configuracao: Partial<
    Pick<
      ConfiguracaoGeral,
      | "nomeNegocio"
      | "contato"
      | "assinaturaDataUrl"
      | "frase"
      | "condicoes"
      | "ocultarFeitoCom"
    >
  > | null,
  vitrine?: Pick<VitrineDoCardapio, "logo"> | null,
): Orcamento["negocio"] {
  return {
    nome: configuracao?.nomeNegocio?.trim() || conta.nome,
    proprietaria: conta.proprietaria,
    ...opcional("telefone", configuracao?.contato?.telefone),
    ...opcional(
      "instagram",
      configuracao?.contato?.instagram?.trim().replace(/^@/, ""),
    ),
    ...opcional("assinaturaDataUrl", configuracao?.assinaturaDataUrl),
    ...opcional("frase", configuracao?.frase),
    ...opcional("logo", vitrine?.logo),
    ...opcional("condicoes", configuracao?.condicoes),
    feitoCom: !configuracao?.ocultarFeitoCom,
  };
}

/** Tudo o que a folha desenha, montado de uma vez. */
export function montarOrcamento(entrada: {
  pedido: PedidoParaOrcar;
  fichas: FichaParaOrcar[];
  conta: Pick<Conta, "nome" | "proprietaria">;
  configuracao: ConfiguracaoParaOrcar | null;
  /** `configuracao/vitrine`, pelo logo (`#d356`); ausente = sem logo. */
  vitrine?: Pick<VitrineDoCardapio, "logo"> | null;
  hojeISO: DataISO;
}): Orcamento {
  const { pedido, conta, configuracao, vitrine, hojeISO } = entrada;
  const fichas = new Map(entrada.fichas.map((ficha) => [ficha.id, ficha]));

  // A foto e a descrição vêm da ficha viva; o preço e o nome, do pedido
  // (`#d108`). Ficha arquivada continua no pedido com o nome congelado, e a
  // linha sai sem foto e sem descrição.
  const linhas: LinhaDoOrcamento[] = pedido.itens.map((item) => {
    const ficha = fichas.get(item.fichaTecnicaId);
    const foto = ficha?.fotoUrl?.trim();
    // Combo sem foto própria mostra as receitas de dentro, pela mesma regra
    // da ficha viva: escolha arquivada não tem foto (`#d108`).
    const fotosDasEscolhas = foto
      ? []
      : (item.escolhas ?? [])
          .map((escolha) => fichas.get(escolha.fichaTecnicaId)?.fotoUrl?.trim())
          .filter((url): url is string => !!url)
          .slice(0, 2);
    return {
      nome: item.nomeSnapshot,
      ...opcional(
        "composicao",
        item.escolhas?.length ? resumoDasEscolhas(item.escolhas) : undefined,
      ),
      ...opcional("descricao", ficha?.descricao),
      ...opcional("fotoUrl", foto),
      fotosDasEscolhas,
      quantidade: item.quantidade,
      unidade: ficha
        ? SUFIXO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]
        : "un",
      precoUnitario: item.precoUnitario,
      subtotal: subtotalDoItem(item),
    };
  });

  const forma = pedido.formaPagamentoId
    ? configuracao?.formasPagamento.find(
        (item) => item.id === pedido.formaPagamentoId,
      )
    : undefined;
  const falta = faltaPagar(pedido);
  const pix = pixDoPedido(pedido, configuracao?.formasPagamento ?? [], falta);
  const orcamento = pedido.status === "ORCAMENTO";

  return {
    negocio: negocioDaFolha(conta, configuracao, vitrine),
    codigo: pedido.codigo,
    status: pedido.status,
    emitidoEmISO: hojeISO,
    ...opcional("validoAteISO", orcamento ? pedido.validoAteISO : undefined),
    empresa: pedido.clienteNome,
    linhas,
    temFoto: linhas.some(
      (linha) => !!linha.fotoUrl || linha.fotosDasEscolhas.length > 0,
    ),
    subtotal: pedido.subtotal,
    desconto: pedido.desconto,
    taxaEntrega: pedido.entrega.taxa,
    total: pedido.total,
    entrega: {
      tipo: pedido.entrega.tipo,
      dataISO: pedido.dataEntregaISO,
      ...opcional("hora", pedido.horaEntrega),
      ...opcional("endereco", pedido.entrega.endereco),
    },
    ...opcional("formaNome", forma?.nome),
    ...opcional("formaInstrucoes", forma?.instrucoes),
    pago: pedido.pago,
    ...(pedido.sinal && !pedido.pago ? { sinal: pedido.sinal.valor } : {}),
    falta,
    ...(pix ? { pix } : {}),
  };
}

/** Fecha a frase com ponto, sem dobrar o que ela já digitou com ponto. */
function frase(texto: string): string {
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

/**
 * As linhas do bloco "Combinado", na ordem, só as que têm o que dizer. O dia
 * não entra: o topo já diz (spec 147).
 *
 * As instruções saem como ela as escreveu, uma linha por linha dela, sem ponto
 * acrescentado: é o trecho que a cliente copia. Com o QR (`pix`) elas dão
 * lugar a ele, e no pedido pago saem, como no WhatsApp (`#d278`, `#d355`).
 */
export function frasesDoCombinado(orcamento: Orcamento): string[] {
  const frases: string[] = [];

  if (orcamento.formaNome) {
    frases.push(frase(`Pagamento por ${orcamento.formaNome}`));
    if (!orcamento.pix && !orcamento.pago) {
      frases.push(
        ...(orcamento.formaInstrucoes ?? "")
          .split("\n")
          .map((linha) => linha.trim())
          .filter(Boolean),
      );
    }
  }

  const { entrega } = orcamento;
  if (entrega.tipo === "ENTREGA" && entrega.endereco) {
    frases.push(frase(`Entrega na ${entrega.endereco}`));
  }

  if (orcamento.validoAteISO) {
    frases.push(
      `Este orçamento vale até ${rotuloDataCompleta(orcamento.validoAteISO)}.`,
    );
  }

  return frases;
}
