import type {
  Centavos,
  DataISO,
  FormaPagamento,
  Pedido,
  StatusPedido,
} from "@/lib/types";
import { rotuloDiaPorExtenso } from "./datas";
import { faltaPagar, nomeComEscolhas, quantidadeEmTexto } from "./pedido";
import { brCodePix } from "./pix";

/**
 * O pedido que a cliente acompanha pelo link (spec 117, `DECISOES.md#d320`):
 * o que sai de um pedido para quem tem a chave dele, e mais nada. Como
 * `montarCardapio` (`#d158`), o teste confere as chaves do objeto devolvido.
 */

/** 16 bytes → 22 caracteres base64url, sem `=`. Os bytes vêm de quem chama. */
export function chavePublicaDe(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** O caminho do link, com o endereço do cardápio (o apelido ou o `contaId`). */
export function caminhoDoAcompanhamento(
  endereco: string,
  pedidoId: string,
  chave: string,
): string {
  return `/c/${encodeURIComponent(endereco)}/pedido/${encodeURIComponent(pedidoId)}/${encodeURIComponent(chave)}`;
}

export interface Acompanhamento {
  negocio: { nome: string; quem: string; whatsapp?: string };
  codigo: string;
  /** A frase do pé em que está, na voz da confeiteira. */
  situacao: string;
  /** Os quatro passos depois do orçamento; vazia no cancelado. */
  passos: { rotulo: string; feito: boolean; atual: boolean }[];
  /** "Este orçamento vale até …", só no orçamento e enquanto vale. */
  validoAte?: string;
  dia: string;
  hora?: string;
  entrega: { tipo: "RETIRADA" | "ENTREGA"; endereco?: string };
  itens: { quantidade: string; nome: string; subtotal: Centavos }[];
  subtotal: Centavos;
  /** `null` é "a combinar": o orçamento com taxa zero de quem pediu entrega. */
  taxaEntrega: Centavos | null;
  desconto: Centavos;
  total: Centavos;
  pago: boolean;
  sinal?: Centavos;
  falta: Centavos;
  /** O copia e cola do que falta, só nas condições de `pixDoPedido`. */
  pix?: string;
}

type PedidoAcompanhado = Pick<
  Pedido,
  | "codigo"
  | "status"
  | "dataEntregaISO"
  | "horaEntrega"
  | "entrega"
  | "itens"
  | "subtotal"
  | "desconto"
  | "total"
  | "pago"
  | "sinal"
  | "formaPagamentoId"
  | "validoAteISO"
>;

/** Os passos depois do orçamento. O orçamento é a frase, não um passo. */
const PASSOS: StatusPedido[] = [
  "CONFIRMADO",
  "EM_PRODUCAO",
  "PRONTO",
  "ENTREGUE",
];

function rotuloDoPasso(
  status: StatusPedido,
  tipo: "RETIRADA" | "ENTREGA",
): string {
  const entrega = tipo === "ENTREGA";
  switch (status) {
    case "CONFIRMADO":
      return "Confirmado";
    case "EM_PRODUCAO":
      return "Sendo feito";
    case "PRONTO":
      return entrega ? "Pronto, sai para entrega" : "Pronto para retirar";
    case "ENTREGUE":
      return entrega ? "Entregue" : "Retirado";
    default:
      return "";
  }
}

/**
 * O Pix só de um valor que a dona confirmou: fora do orçamento, não
 * cancelado, com o que falta, e a forma do pedido é Pix com os três dados.
 */
function pixDoPedido(
  pedido: PedidoAcompanhado,
  formas: FormaPagamento[],
  falta: Centavos,
): string | undefined {
  if (pedido.status === "ORCAMENTO" || pedido.status === "CANCELADO") return;
  if (falta <= 0) return;
  const forma = formas.find((f) => f.id === pedido.formaPagamentoId);
  const pix = forma?.tipo === "PIX" ? forma.pix : undefined;
  if (!pix?.chave || !pix.nome || !pix.cidade) return;
  return brCodePix({ ...pix, valor: falta, identificador: pedido.codigo });
}

export function acompanhamentoDoPedido(
  pedido: PedidoAcompanhado,
  negocio: Acompanhamento["negocio"],
  formas: FormaPagamento[],
  hojeISO: DataISO,
): Acompanhamento {
  const tipo = pedido.entrega.tipo;
  const quem = negocio.quem || negocio.nome;
  const cancelado = pedido.status === "CANCELADO";
  const orcamento = pedido.status === "ORCAMENTO";
  const atual = PASSOS.indexOf(pedido.status);
  const falta = faltaPagar(pedido);
  const pix = pixDoPedido(pedido, formas, falta);
  const endereco = pedido.entrega.endereco?.trim();

  return {
    negocio: {
      nome: negocio.nome,
      quem,
      ...(negocio.whatsapp ? { whatsapp: negocio.whatsapp } : {}),
    },
    codigo: pedido.codigo,
    situacao: cancelado
      ? `Este pedido foi cancelado. Fale com a ${quem} se tiver dúvida.`
      : orcamento
        ? `A ${quem} vai confirmar`
        : rotuloDoPasso(pedido.status, tipo),
    passos: cancelado
      ? []
      : PASSOS.map((passo, i) => ({
          rotulo: rotuloDoPasso(passo, tipo),
          feito: i < atual,
          atual: i === atual,
        })),
    ...(orcamento && pedido.validoAteISO && pedido.validoAteISO >= hojeISO
      ? { validoAte: rotuloDiaPorExtenso(pedido.validoAteISO) }
      : {}),
    dia: rotuloDiaPorExtenso(pedido.dataEntregaISO),
    ...(pedido.horaEntrega ? { hora: pedido.horaEntrega } : {}),
    entrega: {
      tipo,
      ...(tipo === "ENTREGA" && endereco ? { endereco } : {}),
    },
    itens: pedido.itens.map((item) => ({
      quantidade: quantidadeEmTexto(item.quantidade),
      nome: nomeComEscolhas(item),
      subtotal: item.subtotal,
    })),
    subtotal: pedido.subtotal,
    taxaEntrega:
      tipo === "ENTREGA" && orcamento && pedido.entrega.taxa === 0
        ? null
        : pedido.entrega.taxa,
    desconto: pedido.desconto,
    total: pedido.total,
    pago: pedido.pago,
    ...(pedido.sinal && !pedido.pago ? { sinal: pedido.sinal.valor } : {}),
    falta,
    ...(pix ? { pix } : {}),
  };
}
