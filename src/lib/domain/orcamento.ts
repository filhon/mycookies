import type {
  Centavos,
  ConfiguracaoGeral,
  Conta,
  DataISO,
  FichaTecnica,
  Pedido,
} from "@/lib/types";
import { SUFIXO_UNIDADE_RENDIMENTO } from "./custoFicha";
import { diaVizinho, rotuloDataCompleta, rotuloDiaPorExtenso } from "./datas";
import { nomeComEscolhas, subtotalDoItem } from "./pedido";

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
  /** `nomeSnapshot` com as escolhas do combo entre parênteses. */
  nome: string;
  /** Da ficha viva; ausente em ficha arquivada ou sem descrição (`#d108`). */
  descricao?: string;
  fotoUrl?: string;
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
    /** Some quando `ocultarFeitoCom` (spec 028, `#d147`). */
    feitoCom: boolean;
  };
  codigo: string;
  /** O dia da impressão, e não um campo gravado (`#d110`). */
  emitidoEmISO: DataISO;
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
    endereco?: string;
  };
  formaNome?: string;
  formaInstrucoes?: string;
}

// O que cada documento precisa entregar. `Pick` em vez do tipo inteiro pelo
// mesmo motivo de `PedidoParaEntrega`: `Timestamp` não atravessa para o
// domínio, e o teste monta só o que a folha lê.
export type PedidoParaOrcar = Pick<
  Pedido,
  | "codigo"
  | "clienteNome"
  | "itens"
  | "subtotal"
  | "desconto"
  | "total"
  | "dataEntregaISO"
  | "formaPagamentoId"
  | "validoAteISO"
> & { entrega: Pick<Pedido["entrega"], "tipo" | "taxa" | "endereco"> };

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

/** Tudo o que a folha desenha, montado de uma vez. */
export function montarOrcamento(entrada: {
  pedido: PedidoParaOrcar;
  fichas: FichaParaOrcar[];
  conta: Pick<Conta, "nome" | "proprietaria">;
  configuracao: ConfiguracaoParaOrcar | null;
  hojeISO: DataISO;
}): Orcamento {
  const { pedido, conta, configuracao, hojeISO } = entrada;
  const fichas = new Map(entrada.fichas.map((ficha) => [ficha.id, ficha]));

  // A foto e a descrição vêm da ficha viva; o preço e o nome, do pedido
  // (`#d108`). Ficha arquivada continua no pedido com o nome congelado, e a
  // linha sai sem foto e sem descrição.
  const linhas: LinhaDoOrcamento[] = pedido.itens.map((item) => {
    const ficha = fichas.get(item.fichaTecnicaId);
    return {
      nome: nomeComEscolhas(item),
      ...opcional("descricao", ficha?.descricao),
      ...opcional("fotoUrl", ficha?.fotoUrl),
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

  return {
    negocio: {
      nome: configuracao?.nomeNegocio.trim() || conta.nome,
      proprietaria: conta.proprietaria,
      ...opcional("telefone", configuracao?.contato?.telefone),
      ...opcional(
        "instagram",
        configuracao?.contato?.instagram?.trim().replace(/^@/, ""),
      ),
      ...opcional("assinaturaDataUrl", configuracao?.assinaturaDataUrl),
      ...opcional("frase", configuracao?.frase),
      feitoCom: !configuracao?.ocultarFeitoCom,
    },
    codigo: pedido.codigo,
    emitidoEmISO: hojeISO,
    ...opcional("validoAteISO", pedido.validoAteISO),
    empresa: pedido.clienteNome,
    linhas,
    temFoto: linhas.some((linha) => !!linha.fotoUrl),
    subtotal: pedido.subtotal,
    desconto: pedido.desconto,
    taxaEntrega: pedido.entrega.taxa,
    total: pedido.total,
    entrega: {
      tipo: pedido.entrega.tipo,
      dataISO: pedido.dataEntregaISO,
      ...opcional("endereco", pedido.entrega.endereco),
    },
    ...opcional("formaNome", forma?.nome),
    ...opcional("formaInstrucoes", forma?.instrucoes),
  };
}

/** Fecha a frase com ponto, sem dobrar o que ela já digitou com ponto. */
function frase(texto: string): string {
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

/**
 * "na quarta-feira", mas "no sábado": os dias úteis são femininos e o fim de
 * semana é masculino. O WhatsApp contorna com "em"; a folha fala como se fala.
 */
function noDia(iso: DataISO): string {
  const dia = rotuloDiaPorExtenso(iso);
  return `${/^(sábado|domingo)/.test(dia) ? "no" : "na"} ${dia}`;
}

/** As frases do bloco "Combinado", na ordem, só as que têm o que dizer. */
export function frasesDoCombinado(orcamento: Orcamento): string[] {
  const frases: string[] = [];

  if (orcamento.formaNome) {
    const pagamento = frase(`Pagamento por ${orcamento.formaNome}`);
    const instrucoes = orcamento.formaInstrucoes?.trim();
    frases.push(instrucoes ? `${pagamento} ${frase(instrucoes)}` : pagamento);
  }

  const { entrega } = orcamento;
  const onde =
    entrega.tipo === "ENTREGA" && entrega.endereco
      ? `, na ${entrega.endereco}`
      : "";
  frases.push(
    frase(
      `${entrega.tipo === "ENTREGA" ? "Entrega" : "Retirada"} ${noDia(entrega.dataISO)}${onde}`,
    ),
  );

  if (orcamento.validoAteISO) {
    frases.push(
      `Este orçamento vale até ${rotuloDataCompleta(orcamento.validoAteISO)}.`,
    );
  }

  return frases;
}
