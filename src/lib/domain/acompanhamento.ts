import type {
  Centavos,
  ConfiguracaoGeral,
  DataISO,
  FichaTecnica,
  FormaPagamento,
  Pedido,
  StatusPedido,
} from "@/lib/types";
import {
  diasEntre,
  hojeEmBrasilia,
  rotuloDataCompleta,
  rotuloDiaNoAno,
  rotuloDiaPorExtenso,
  rotuloSoODiaDaSemana,
} from "./datas";
import { vaiParaAgenda } from "./agenda";
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
  negocio: {
    nome: string;
    quem: string;
    whatsapp?: string;
    /** O logo da vitrine, `data:` URL, como na folha (`#d356`, `#d357`). */
    logo?: string;
    /** O combinado de sempre, com as linhas dela (`#d356`). */
    condicoes?: string;
    /** O logo pela rota da vitrine, para a prévia (spec 174): a rota só serve
     * com o cardápio aberto (`lerImagemDaVitrine`). */
    logoDaPrevia?: string;
    /** O usuário do Instagram, sem "@": só no entregue (spec 174). */
    instagram?: string;
    /** `!ocultarFeitoCom` (`#d147`): a linha do pé, como na folha. */
    feitoCom: boolean;
  };
  codigo: string;
  /** "Pedir de novo" pelo cardápio aberto (spec 174): o caminho, só no
   * entregue. Sem carrinho preenchido. */
  cardapio?: string;
  /** Para quem é o orçamento: o nome da cliente, só no orçamento (`#d357`). */
  para?: string;
  /** A frase do pé em que está, na voz da confeiteira. */
  situacao: string;
  /** "Retirada amanhã, às 15h", logo abaixo da `situacao` (spec 171). Fora no
   * entregue e no cancelado. */
  quando?: string;
  /** Os quatro passos depois do orçamento; vazia no orçamento e no cancelado. */
  passos: { rotulo: string; feito: boolean; atual: boolean }[];
  /** "Este orçamento vale até …", só enquanto `podeAprovar`. */
  validoAte?: string;
  /** O botão "Aprovar orçamento" (spec 149, `#d358`): `podeAprovar`. */
  podeAprovar: boolean;
  dia: string;
  hora?: string;
  entrega: { tipo: "RETIRADA" | "ENTREGA"; endereco?: string };
  /** Onde e quando se retira (spec 172): só no pedido de retirada, nunca no
   * cardápio, porque muita confeiteira retira em casa. */
  retirada?: { endereco: string; horario?: string };
  /** "Pôr na agenda do celular" (spec 172): `vaiParaAgenda`. */
  naAgenda: boolean;
  itens: {
    quantidade: string;
    nome: string;
    subtotal: Centavos;
    /** Da ficha viva, como na folha (`#d108`). */
    descricao?: string;
    /** Da ficha viva; o combo sem foto própria leva a da primeira escolha. */
    fotoUrl?: string;
  }[];
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
  | "clienteNome"
  | "aprovacao"
>;

/** A foto e a descrição vêm da ficha viva (`#d108`); arquivada não conta. */
export type FichaAcompanhada = Pick<
  FichaTecnica,
  "id" | "fotoUrl" | "descricao" | "arquivado"
>;

/** Só entra no objeto o que tem valor: ausência é ausência, e não `undefined`. */
export function opcional<K extends string>(
  chave: K,
  valor: string | undefined | null,
): Partial<Record<K, string>> {
  const limpo = valor?.trim();
  return limpo ? ({ [chave]: limpo } as Record<K, string>) : {};
}

/** O nome de quem aprova: 1 a 80 caracteres, depois do `trim` (`#d358`). */
export const NOME_DE_QUEM_APROVA_MAX = 80;

/**
 * O orçamento pode ser aprovado pelo link (spec 149, `#d358`): ainda é
 * orçamento, dentro da validade (vence hoje ainda vale; sem validade, vale) e
 * ninguém aprovou. A rota e a página perguntam a mesma coisa.
 */
export function podeAprovar(
  pedido: {
    status: StatusPedido;
    validoAteISO?: DataISO;
    aprovacao?: unknown;
  },
  hojeISO: DataISO,
): boolean {
  return (
    pedido.status === "ORCAMENTO" &&
    !pedido.aprovacao &&
    !(pedido.validoAteISO && pedido.validoAteISO < hojeISO)
  );
}

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

/** "15:00" vira "15h", "09:30" vira "9h30". */
function horaFalada(hora: string): string {
  const [h, m] = hora.split(":");
  return `${Number(h)}h${m && m !== "00" ? m : ""}`;
}

/**
 * A linha do quando, no topo (spec 171): a palavra da entrega na frente, o dia
 * como se fala dele ("hoje", "amanhã", "sábado" na semana, "em 3 de novembro"
 * depois dela) e a hora. Dia passado vai por extenso, sem "atrasado": quem
 * decide se atrasou é ela.
 */
export function quandoDoPedido(
  tipo: "RETIRADA" | "ENTREGA",
  dataISO: DataISO,
  hora: string | undefined,
  hojeISO: DataISO,
): string {
  const dias = diasEntre(hojeISO, dataISO);
  const dia =
    dias < 0
      ? `em ${rotuloDiaPorExtenso(dataISO)}`
      : dias === 0
        ? "hoje"
        : dias === 1
          ? "amanhã"
          : dias < 7
            ? rotuloSoODiaDaSemana(dataISO)
            : `em ${rotuloDiaNoAno(dataISO, hojeISO)}`;
  const palavra = tipo === "ENTREGA" ? "Entrega" : "Retirada";
  return `${palavra} ${dia}${hora ? `, às ${horaFalada(hora)}` : ""}`;
}

/**
 * "Pedir de novo" (spec 174): só no entregue, pelo cardápio aberto ou, sem
 * ele, pelo WhatsApp dela. O último passo atual é o entregue; `cardapio` só
 * sai nele.
 */
export function podePedirDeNovo(
  visto: Pick<Acompanhamento, "passos" | "cardapio" | "negocio">,
): boolean {
  return (
    !!visto.cardapio ||
    (!!visto.negocio.whatsapp && !!visto.passos.at(-1)?.atual)
  );
}

/**
 * O primário da página (spec 171): aprovar enquanto o orçamento pode, pagar
 * quando há Pix, pedir de novo no entregue (spec 174), e falar com ela no resto.
 */
export function acaoDaVez(
  visto: Pick<
    Acompanhamento,
    "podeAprovar" | "pix" | "passos" | "cardapio" | "negocio"
  >,
): "aprovar" | "pagar" | "pedir" | "falar" {
  if (visto.podeAprovar) return "aprovar";
  if (visto.pix) return "pagar";
  if (podePedirDeNovo(visto)) return "pedir";
  return "falar";
}

/**
 * O Pix só de um valor que a dona confirmou: fora do orçamento, não
 * cancelado, com o que falta, e a forma do pedido é Pix com os três dados.
 * A folha do pedido usa a mesma regra para o QR (`#d355`).
 */
export function pixDoPedido(
  pedido: Pick<Pedido, "status" | "formaPagamentoId" | "codigo">,
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
  negocio: Omit<Acompanhamento["negocio"], "logoDaPrevia"> & {
    retirada?: ConfiguracaoGeral["retirada"];
    /**
     * Só com o cardápio aberto (spec 174): o endereço que a cliente abriu, o
     * `contaId` da rota da vitrine (que não resolve apelido) e a versão do
     * logo, quando há logo.
     */
    cardapio?: { endereco: string; contaId: string; logoVersao?: number };
  },
  formas: FormaPagamento[],
  hojeISO: DataISO,
  fichas: FichaAcompanhada[] = [],
): Acompanhamento {
  const tipo = pedido.entrega.tipo;
  const quem = negocio.quem || negocio.nome;
  const cancelado = pedido.status === "CANCELADO";
  const orcamento = pedido.status === "ORCAMENTO";
  const vencido =
    orcamento && !!pedido.validoAteISO && pedido.validoAteISO < hojeISO;
  // A aprovação vale mais que o vencido: foi dada dentro da validade.
  const aprovado = orcamento ? pedido.aprovacao : undefined;
  const aprovadoEm =
    aprovado &&
    rotuloDiaNoAno(hojeEmBrasilia(new Date(aprovado.em.toMillis())), hojeISO);
  const aberto = podeAprovar(pedido, hojeISO);
  const vivas = new Map(
    fichas.filter((f) => !f.arquivado).map((f) => [f.id, f]),
  );
  const fotoDe = (id: string) => vivas.get(id)?.fotoUrl?.trim() || undefined;
  const atual = PASSOS.indexOf(pedido.status);
  const falta = faltaPagar(pedido);
  const pix = pixDoPedido(pedido, formas, falta);
  const endereco = pedido.entrega.endereco?.trim();
  const retirada =
    tipo === "RETIRADA" ? negocio.retirada?.endereco.trim() : undefined;
  const entregue = pedido.status === "ENTREGUE";
  const { cardapio } = negocio;

  return {
    negocio: {
      nome: negocio.nome,
      quem,
      ...(negocio.whatsapp ? { whatsapp: negocio.whatsapp } : {}),
      ...opcional("logo", negocio.logo),
      ...opcional("condicoes", negocio.condicoes),
      ...(cardapio?.logoVersao !== undefined
        ? {
            logoDaPrevia: `/c/${encodeURIComponent(cardapio.contaId)}/vitrine/logo?v=${cardapio.logoVersao}`,
          }
        : {}),
      ...opcional(
        "instagram",
        entregue ? negocio.instagram?.trim().replace(/^@+/, "") : undefined,
      ),
      feitoCom: negocio.feitoCom,
    },
    codigo: pedido.codigo,
    ...(entregue && cardapio
      ? { cardapio: `/c/${encodeURIComponent(cardapio.endereco)}` }
      : {}),
    ...opcional("para", orcamento ? pedido.clienteNome : undefined),
    situacao: cancelado
      ? `Este pedido foi cancelado. Fale com a ${quem} se tiver dúvida.`
      : aprovado
        ? `Aprovado por ${aprovado.nome} em ${aprovadoEm}. A ${quem} vai confirmar a data.`
        : vencido
          ? `Este orçamento venceu em ${rotuloDataCompleta(pedido.validoAteISO!)}. Fale com a ${quem} para um preço novo.`
          : orcamento
            ? `A ${quem} vai confirmar`
            : rotuloDoPasso(pedido.status, tipo),
    ...(cancelado || entregue
      ? {}
      : {
          quando: quandoDoPedido(
            tipo,
            pedido.dataEntregaISO,
            pedido.horaEntrega,
            hojeISO,
          ),
        }),
    // O orçamento é a folha na tela (`#d357`): o caminho começa na confirmação.
    passos:
      cancelado || orcamento
        ? []
        : PASSOS.map((passo, i) => ({
            rotulo: rotuloDoPasso(passo, tipo),
            feito: i < atual,
            atual: i === atual,
          })),
    ...(aberto && pedido.validoAteISO
      ? { validoAte: rotuloDiaPorExtenso(pedido.validoAteISO) }
      : {}),
    podeAprovar: aberto,
    dia: rotuloDiaPorExtenso(pedido.dataEntregaISO),
    ...(pedido.horaEntrega ? { hora: pedido.horaEntrega } : {}),
    entrega: {
      tipo,
      ...(tipo === "ENTREGA" && endereco ? { endereco } : {}),
    },
    ...(retirada
      ? {
          retirada: {
            endereco: retirada,
            ...opcional("horario", negocio.retirada?.horario),
          },
        }
      : {}),
    naAgenda: vaiParaAgenda(pedido, hojeISO),
    itens: pedido.itens.map((item) => ({
      quantidade: quantidadeEmTexto(item.quantidade),
      nome: nomeComEscolhas(item),
      subtotal: item.subtotal,
      ...opcional("descricao", vivas.get(item.fichaTecnicaId)?.descricao),
      ...opcional(
        "fotoUrl",
        fotoDe(item.fichaTecnicaId) ??
          (item.escolhas ?? [])
            .map((escolha) => fotoDe(escolha.fichaTecnicaId))
            .find(Boolean),
      ),
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
