import type { Route } from "next";
import { diaVizinho } from "@/lib/domain/datas";
import type { DataISO } from "@/lib/types/common";

export interface Novidade {
  /** O dia do commit que entregou, e não o da spec. */
  dataISO: DataISO;
  /** O que ela ganha, e não o nome do recurso. */
  titulo: string;
  /** Uma linha, sem número de exemplo (`DECISOES.md#d70`). */
  frase: string;
  href: Route;
  /** Só aparece no Android. */
  soAndroid?: boolean;
}

/**
 * O que mudou para ela, a mais nova primeiro (`DECISOES.md#d298`). Cópia, e não
 * domínio: só "Como funciona" mostra.
 *
 * Toda spec que muda algo que ela vê acrescenta uma linha aqui, no topo, com o
 * dia do commit. É isso que acende "Novidade" no menu.
 */
export const NOVIDADES: readonly Novidade[] = [
  {
    dataISO: "2026-10-09",
    titulo: "Quem você chamou voltou",
    frase:
      "Quem você chamou sai da lista por duas semanas, a ficha diz quando foi, e Clientes conta quantas das chamadas voltaram a pedir.",
    href: "/clientes",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Juntar a cliente cadastrada duas vezes",
    frase:
      "A ficha avisa quando outra cliente tem o mesmo telefone ou o mesmo nome, e “Juntar” passa os pedidos para uma só e soma o que ela já gastou.",
    href: "/clientes",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Achar a cliente pelo telefone",
    frase:
      "A busca de Clientes acha pelo telefone e pelo Instagram, a lista ordena por quem sumiu ou pediu por último, e o número aparece arrumado na ficha.",
    href: "/clientes",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Com quem falar hoje",
    frase:
      "Clientes separa quem sumiu e quem comprou uma vez só, e “Chamar” abre o WhatsApp com a mensagem de volta pronta pra você ajustar.",
    href: "/clientes",
  },
  {
    dataISO: "2026-10-09",
    titulo: "A ficha de cada cliente",
    frase:
      "Toque numa cliente: a alergia à vista, o que ela pede, o que deve, os pedidos dela e o novo pedido já com ela.",
    href: "/clientes",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Pôr na lista o que a conta não pediu",
    frase:
      "“Levar também” acrescenta um material ou um pacote a mais, e refazer a lista não tira.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Mandar a lista de compras",
    frase:
      "Quem vai ao mercado recebe o que falta, por corredor e com o preço, pelo WhatsApp ou onde você escolher.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-09",
    titulo: "Quanto da compra é dos pedidos",
    frase:
      "A lista diz quanto do total é para os pedidos, quanto eles trazem e quanto é para manter a reserva.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-09",
    titulo: "O pacote inteiro por um pouquinho",
    frase:
      "A lista avisa quando o pacote é muito maior que a falta ou quando a falta é só da reserva, e o item pode ficar pra próxima.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-09",
    titulo: "O porquê de cada item da lista",
    frase:
      "Toque no preço de um item: a conta, de que pedido vem, a última compra e o que o preço novo faz nos produtos.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-08",
    titulo: "A lista de compras se refaz sozinha",
    frase:
      "Mudou o período ou contou a despensa, a lista acompanha, e a tela fica acesa no mercado.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-08",
    titulo: "A lista de compras cabe no celular",
    frase:
      "O preço aparece em toda linha, o pacote vem primeiro e o que você marca desce para o carrinho.",
    href: "/compras",
  },
  {
    dataISO: "2026-10-08",
    titulo: "A nota chega pelo Compartilhar",
    frase:
      "No PDF da nota, toque em Compartilhar e escolha o Rende: ela já chega para ler.",
    href: "/insumos/nota",
    soAndroid: true,
  },
  {
    dataISO: "2026-10-08",
    titulo: "A nota comprida numa leitura só",
    frase:
      "O cupom que não cabe numa foto vai em partes, e o Rende lê todas juntas.",
    href: "/insumos/nota",
  },
  {
    dataISO: "2026-10-05",
    titulo: "O seu nome e a sua assinatura no orçamento",
    frase:
      "Assine com o dedo na Configuração, e o pé da folha leva o nome do negócio e a assinatura.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-05",
    titulo: "As despesas que a gente esquece",
    frase:
      "Aluguel, internet, contador: cada despesa fixa numa linha, com as que costumam ficar de fora à mão.",
    href: "/configuracao#o-seu-preco",
  },
  {
    dataISO: "2026-10-05",
    titulo: "A conta da energia e do gás, feita por você",
    frase:
      "Em “Fazer a conta”, você copia o que vem na conta do mês, e o Rende divide.",
    href: "/configuracao#o-seu-preco",
  },
  {
    dataISO: "2026-10-03",
    titulo: "Mudou a hora, os produtos acompanham",
    frase:
      "Antes de salvar o custo da hora, você vê quanto passa a sobrar em cada produto.",
    href: "/configuracao#o-seu-preco",
  },
  {
    dataISO: "2026-10-03",
    titulo: "O sinal da encomenda",
    frase:
      "Anote o sinal no pedido: ele entra no caixa no dia, e a cobrança já é só do que falta.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-03",
    titulo: "O Pix vai com o valor",
    frase:
      "Com a sua chave na Configuração, o resumo do WhatsApp leva o Pix copia e cola já com o valor.",
    href: "/configuracao#o-seu-preco",
  },
  {
    dataISO: "2026-10-03",
    titulo: "O dia que ainda cabe",
    frase:
      "Ao escolher a entrega, o pedido diz quanto você já tem para fazer naquele dia.",
    href: "/pedidos/novo" as Route,
  },
  {
    dataISO: "2026-10-03",
    titulo: "O pedido de sempre num toque",
    frase:
      "O que mais sai aparece primeiro, e o último pedido da cliente se repete com um toque.",
    href: "/pedidos/novo" as Route,
  },
  {
    dataISO: "2026-10-02",
    titulo: "O relatório do MEI pronto para imprimir",
    frase:
      "O Caixa monta o relatório mensal das receitas no modelo do portal, e acompanha o limite do ano.",
    href: "/financeiro",
  },
];

const JANELA_DIAS = 90;
const MAXIMO = 6;
/** O aparelho que nunca viu nada não ganha "Novidade" sobre o que já existia. */
const CARENCIA_DIAS = 14;

/** As dos últimos 90 dias, no máximo seis. */
export function novidadesRecentes(
  hojeISO: DataISO,
  lista: readonly Novidade[] = NOVIDADES,
): Novidade[] {
  const desde = diaVizinho(hojeISO, -JANELA_DIAS);
  return lista.filter((n) => n.dataISO >= desde).slice(0, MAXIMO);
}

/** Há uma mais nova que a vista; sem nada visto, só a dos últimos 14 dias. */
export function haNovidade(
  hojeISO: DataISO,
  vista: DataISO | null,
  maisNova: DataISO | undefined = NOVIDADES[0]?.dataISO,
): boolean {
  if (!maisNova) return false;
  return vista
    ? maisNova > vista
    : maisNova >= diaVizinho(hojeISO, -CARENCIA_DIAS);
}

const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2 out". */
export function rotuloNovidade(iso: DataISO): string {
  const [, mes, dia] = iso.split("-").map(Number);
  return `${dia} ${MESES[(mes ?? 1) - 1]}`;
}
