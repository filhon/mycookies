import type { Centavos, DataISO } from "@/lib/types";
import { rotuloDiaPorExtenso } from "./datas";
import { formatarMoeda } from "./money";
import { quantidadeEmTexto, subtotalDoItem } from "./pedido";

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
  }[];
  subtotal: Centavos;
  desconto: Centavos;
  taxaEntrega: Centavos;
  total: Centavos;
  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    dataISO: DataISO;
    endereco?: string;
  };
  /** O nome da forma escolhida, quando houver. Nunca a taxa dela. */
  formaNome?: string;
  pago: boolean;
}

/** 'Ana Beatriz' → 'Ana'. É como ela cumprimenta na conversa. */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
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

  const itens = resumo.itens.map(
    (item) =>
      `• ${quantidadeEmTexto(item.quantidade)} × ${item.nomeSnapshot} — ${formatarMoeda(
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

  const dia = rotuloDiaPorExtenso(resumo.entrega.dataISO);
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
  ];

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
    "Qualquer ajuste é só me chamar.",
  ].join("\n\n");
}
