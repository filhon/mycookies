import type { Centavos, DataISO } from "@/lib/types";
import { rotuloDiaPorExtenso } from "./datas";
import { formatarMoeda } from "./money";
import { brCodePix, type DadosPix } from "./pix";
import {
  faltaPagar,
  nomeComEscolhas,
  quantidadeEmTexto,
  subtotalDoItem,
} from "./pedido";

/**
 * O caminho do pedido até a conversa em que ele nasceu.
 *
 * O pedido chega pelo WhatsApp e a confirmação volta por lá — hoje digitada de
 * novo, item por item, com os números copiados da tela. Este módulo escreve o
 * texto; quem envia continua sendo ela, com o polegar, depois de ler
 * (`DECISOES.md#d77`).
 *
 * Puro de propósito: é aqui que mora tudo o que pode sair errado, e um resumo
 * errado vai direto para a cliente sem passar por ninguém.
 */

/**
 * Só dígitos, com DDI, do jeito que o `wa.me` disca.
 * '(11) 90000-0000' → '5511900000000'. `null` quando não dá para discar — e
 * `null` degrada para o WhatsApp perguntando o destinatário, não para erro.
 */
export function telefoneParaWhatsApp(telefone?: string): string | null {
  // O zero de operadora antes do DDD ('011') sai: ele não é parte do número.
  const digitos = (telefone ?? "").replace(/\D/g, "").replace(/^0+/, "");

  // Fixo com DDD são 10, celular com DDD são 11. Antes do teste de DDI, porque
  // existe DDD 55 (Santa Maria), e '55 3000-0000' é número local, não DDI.
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;

  if (
    (digitos.length === 12 || digitos.length === 13) &&
    digitos.startsWith("55")
  ) {
    return digitos;
  }

  return null;
}

/**
 * O click-to-chat oficial, com o texto embutido e **não enviado**.
 * Sem telefone, o WhatsApp pergunta para quem — aceita `null` porque é isso
 * que `telefoneParaWhatsApp` devolve quando não sabe.
 */
export function linkDoWhatsApp(
  telefone: string | null | undefined,
  texto: string,
): string {
  return `https://wa.me/${telefone ?? ""}?text=${encodeURIComponent(texto)}`;
}

/** O que a cliente precisa conferir, e nada do que é da Maynara (`#d79`). */
export interface ResumoParaCliente {
  negocio: string;
  codigo: string;
  clienteNome: string;
  itens: {
    quantidade: number;
    nomeSnapshot: string;
    precoUnitario: Centavos;
    /** O que foi escolhido num combo: entra entre parênteses, é o que ela confere. */
    escolhas?: { quantidade: number; nomeSnapshot: string }[];
    /** A nota deste item (spec 078): entra entre parênteses, depois do nome. */
    observacao?: string;
  }[];
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
  /** O nome da forma escolhida, quando houver. Nunca a taxa dela. */
  formaNome?: string;
  /** Os dados para pagar por essa forma (`FormaPagamento.instrucoes`). */
  formaInstrucoes?: string;
  /**
   * O Pix da forma (`FormaPagamento.pix`), quando ela tem os três dados: o
   * resumo leva o copia e cola com o total no lugar das instruções (`#d278`).
   */
  formaPix?: DadosPix;
  pago: boolean;
  /** O sinal já recebido (`#d279`): o resumo diz quanto falta, e o Pix é disso. */
  sinal?: Centavos;
}

/** 'Ana Beatriz' → 'Ana'. É como ela cumprimenta na conversa. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}

/**
 * O convite de volta para quem parou de pedir (`#d309`). Sem emoji e sem
 * desconto: o desconto é decisão dela, que edita no WhatsApp antes de mandar.
 * Com `produto` (a ficha conhece os pedidos), "o último Cookie Red Velvet".
 */
export function mensagemDeVolta({
  primeiroNome,
  negocio,
  produto,
}: {
  primeiroNome: string;
  negocio: string;
  produto?: string;
}): string {
  const oi = primeiroNome ? `Oi, ${primeiroNome}!` : "Oi!";
  const quem = negocio ? ` Aqui é da ${negocio}.` : "";
  const ultimo = produto ? `o último ${produto}` : "o último";
  return `${oi}${quem} Faz um tempinho que você não pede, e eu queria saber se ficou tudo certo com ${ultimo}. Essa semana tem fornada, quer que eu separe um pra você?`;
}

/**
 * A cobrança do pedido entregue e não pago (`DECISOES.md#d249`): curta, com o
 * dia da entrega e o valor, sem lista de itens. Ela já recebeu o doce; o que
 * falta lembrar é o quanto. Os dados para pagar não entram: o Pix com o valor
 * vai pelo "Copiar o Pix" da ficha, colado onde ela quiser (spec 080).
 */
export function mensagemDeCobranca(pedido: {
  clienteNome: string;
  dataEntregaISO: DataISO;
  total: Centavos;
  sinal?: { valor: Centavos } | null;
}): string {
  const nome = primeiroNome(pedido.clienteNome);
  // '2026-09-27' → '27/9': é como se escreve o dia numa conversa.
  const [, mes, dia] = pedido.dataEntregaISO.split("-").map(Number);
  const oi = nome ? `Oi, ${nome}!` : "Oi!";
  // Com sinal, cobra o que falta, e diz que o sinal já entrou (`#d279`).
  const quanto = pedido.sinal
    ? `: o sinal de ${formatarMoeda(pedido.sinal.valor)} já entrou, faltam ${formatarMoeda(faltaPagar({ ...pedido, pago: false }))}`
    : `, ${formatarMoeda(pedido.total)}`;
  return `${oi} Passando pra lembrar do pedido de ${dia}/${mes}${quanto}. Obrigada!`;
}

/**
 * O resumo do pedido, pronto para colar na conversa.
 *
 * Zero é ausência, a mesma regra do painel financeiro: uma linha
 * "Desconto: R$ 0,00" faz a cliente procurar um desconto que não houve. Os
 * negritos são dois — o negócio e o total —, e não há emoji: a voz do sistema é
 * a da confeitaria, e não a de um chatbot.
 */
export function mensagemDoPedido(resumo: ResumoParaCliente): string {
  const nome = primeiroNome(resumo.clienteNome);
  const falta = faltaPagar({
    ...resumo,
    sinal: resumo.sinal ? { valor: resumo.sinal } : null,
  });

  const itens = resumo.itens.map(
    (item) =>
      `• ${quantidadeEmTexto(item.quantidade)} × ${nomeComEscolhas(item)}${item.observacao ? ` (${item.observacao})` : ""} — ${formatarMoeda(
        subtotalDoItem(item),
      )}`,
  );

  const totais = [
    `Subtotal: ${formatarMoeda(resumo.subtotal)}`,
    ...(resumo.desconto > 0
      ? [`Desconto: −${formatarMoeda(resumo.desconto)}`]
      : []),
    ...(resumo.taxaEntrega > 0
      ? [`Entrega: ${formatarMoeda(resumo.taxaEntrega)}`]
      : []),
    `*Total: ${formatarMoeda(resumo.total)}*`,
  ];

  const dia = resumo.entrega.hora
    ? `${rotuloDiaPorExtenso(resumo.entrega.dataISO)}, às ${resumo.entrega.hora}`
    : rotuloDiaPorExtenso(resumo.entrega.dataISO);
  const endereco =
    resumo.entrega.tipo === "ENTREGA" && resumo.entrega.endereco
      ? ` — ${resumo.entrega.endereco}`
      : "";

  const combinado = [
    resumo.entrega.tipo === "ENTREGA"
      ? `Entrega em ${dia}${endereco}`
      : `Retirada em ${dia}`,
    ...(resumo.formaNome ? [`Pagamento: ${resumo.formaNome}`] : []),
    // Linha própria, e não um caso dentro da linha da forma: duas afirmações
    // independentes valem mais que uma frase com dois estados dentro.
    ...(resumo.pago ? ["Já está pago. Obrigada!"] : []),
    ...(!resumo.pago && resumo.sinal
      ? [
          `Sinal recebido: ${formatarMoeda(resumo.sinal)}. Falta: ${formatarMoeda(falta)}.`,
        ]
      : []),
  ];

  // Os dados para pagar são bloco próprio, e só enquanto há o que pagar: chave
  // Pix embaixo de "Já está pago" é um convite a pagar de novo. Com o Pix da
  // forma, o copia e cola entra no lugar das instruções, numa linha só dele,
  // para a cliente copiar sem levar texto junto (`#d278`).
  const instrucoes = resumo.formaInstrucoes?.trim();
  const pix =
    resumo.formaPix && falta > 0
      ? brCodePix({
          ...resumo.formaPix,
          valor: falta,
          identificador: resumo.codigo,
        })
      : undefined;
  const paraPagar = resumo.pago
    ? []
    : pix
      ? [`Pix copia e cola (já com o valor):\n${pix}`]
      : instrucoes
        ? [instrucoes]
        : [];

  return [
    // Conta que nunca salvou a configuração não tem nome de negócio, e um
    // '** · pedido' é pior do que a linha sem a marca.
    resumo.negocio
      ? `*${resumo.negocio}* · pedido ${resumo.codigo}`
      : `Pedido ${resumo.codigo}`,
    nome ? `Oi, ${nome}! Fechamos assim:` : "Oi! Fechamos assim:",
    itens.join("\n"),
    totais.join("\n"),
    combinado.join("\n"),
    ...paraPagar,
    "Qualquer ajuste é só me chamar.",
  ].join("\n\n");
}
