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
    dataISO: "2026-10-16",
    titulo: "Fechar arrastando para baixo",
    frase:
      "No celular, o que abre de baixo pra cima fecha com o dedo: puxe pelo topo para baixo. O X continua lá.",
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-16",
    titulo: "O preço de fundadora, já no seu plano",
    frase:
      "Respondeu a pesquisa do beta? A tela de assinar mostra o preço com 30% a menos, e se você já assina, o desconto entra na próxima cobrança. Sem código pra digitar.",
    href: "/assinatura",
  },
  {
    dataISO: "2026-10-16",
    titulo: "A pesquisa do beta, que vale o preço de fundadora",
    frase:
      "Perto do fim do teste, responda a pesquisa em dois minutos e o seu plano sai com 30% a menos, para sempre. Não quer responder? É só não tocar.",
    href: "/configuracao#convites",
  },
  {
    dataISO: "2026-10-15",
    titulo: "Os seus convites do beta, prontos pra mandar",
    frase:
      "Em Configuração, cada convite vira um link com o seu nome. Escreva pra quem é, se quiser, e mande pelo WhatsApp. Quando ela entra, a sua lista mostra.",
    href: "/configuracao#convites",
  },
  {
    dataISO: "2026-10-15",
    titulo: "A cliente pede de novo pelo link do pedido entregue",
    frase:
      "Depois da entrega, o link leva ao seu cardápio, ou ao seu WhatsApp com o pedido anterior escrito, e ao seu Instagram. Colado na conversa, o link mostra o seu logo.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-15",
    titulo: "Ao confirmar ou deixar pronto, um toque avisa a cliente",
    frase:
      "Depois de mudar o pedido, o WhatsApp dela abre com a frase do passo e o link do pedido. Você lê e manda do seu número.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-15",
    titulo: "O link do pedido diz onde retirar e vai para a agenda da cliente",
    frase:
      "Escreva uma vez onde e quando se retira: o link do pedido de retirada mostra o endereço com o mapa, e a cliente põe o dia na agenda do celular, com aviso na véspera.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-15",
    titulo: "O link do pedido diz quando, e o Pix vem primeiro",
    frase:
      "A cliente abre e já vê o dia e a hora, paga antes de rolar a lista e manda o comprovante com o código do pedido.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-14",
    titulo: "O Rende de roupa nova",
    frase:
      "Cobalto no lugar da tinta escura, e o rosa marca só o que sobra pra você. Reinstale o app para ver o ícone novo.",
    href: "/",
  },
  {
    dataISO: "2026-10-14",
    titulo: "Os termos e a privacidade dizem o que mudou",
    frase:
      "Cada página termina com a data e uma linha por mudança, e quando a mudança pesa, a Hoje avisa.",
    href: "/privacidade",
  },
  {
    dataISO: "2026-10-14",
    titulo: "Assinar durante o teste não corta seus dias grátis",
    frase:
      "A primeira cobrança fica para o dia em que o teste acaba, e a tela de assinar mostra o que você já fez no Rende.",
    href: "/assinatura",
  },
  {
    dataISO: "2026-10-14",
    titulo: "A tela de assinar mostra o plano por mês e só sai do app no botão",
    frase:
      "Tocar num plano só o escolhe; o anual aparece pelo mês, com o total do ano embaixo, e o botão diz o que você vai pagar.",
    href: "/assinatura",
  },
  {
    dataISO: "2026-10-14",
    titulo: "O relatório do MEI abre na folha",
    frase:
      "O número do mês e o botão de imprimir vêm primeiro, a folha logo depois, e no celular só as linhas que têm valor, em letra de ler.",
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-14",
    titulo: "O ano do MEI numa tela, com os números da declaração",
    frase:
      "Os doze relatórios e o que falta de cada um, a receita do ano pronta para copiar na declaração anual, e o que você vendeu antes do Rende somado ao limite.",
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-14",
    titulo: "A lista das notas de compra vai junto com o relatório do MEI",
    frase:
      "A folha ganha uma segunda página com as compras do mês, e a tela diz quais ainda não têm nota lida para você achar o cupom.",
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-14",
    titulo: "O relatório do MEI diz até quando e o que já foi feito",
    frase:
      'O prazo do mês aparece sob o mês; depois de imprimir, toque em "Já imprimi e guardei", e se uma venda mudar depois, o Rende avisa.',
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O relatório do MEI sai com o seu CNPJ",
    frase:
      "Digite o CNPJ uma vez e o nome, a abertura e a atividade vêm junto; a folha sai preenchida, igual em qualquer aparelho.",
    href: "/financeiro",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A cliente aprova o orçamento pelo link",
    frase:
      'Um toque em "Aprovar orçamento" e o celular avisa; o pedido aparece em Esperando você, e você confirma a data.',
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O link do orçamento mostra o mesmo que a folha",
    frase:
      "A cliente abre no celular com as fotos, as descrições, a validade e as suas condições; e a folha impressa ganha o QR desse link.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A folha leva o seu logo e as suas condições",
    frase:
      "O logo do cardápio abre a folha, e o que você repete para toda cliente (alergênicos, validade, cancelamento) você escreve uma vez em A sua marca.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A folha do pedido diz em que pé ele está",
    frase:
      "Confirmado, ela mostra o sinal, o que falta e o QR do Pix com esse valor; no orçamento, os dados do Pix saem linha por linha, do jeito que você escreveu.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A bancada abre pelo pedido",
    frase:
      'Cada receita do pedido tem "Abrir na bancada": ela começa no que aquele pedido ainda pede, e a massa que você registra já sai ligada a ele.',
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A bancada já abre nas fornadas que os pedidos pedem",
    frase:
      "Ela diz quanto os pedidos ainda pedem da receita, tirando o que já está pronto, e começa nas fornadas que cobrem; você troca quando quiser.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O tempo escrito no passo vira relógio, na própria bancada",
    frase:
      "Toque no tempo ao lado do passo e o relógio conta acima do Fiz a massa, mais de um ao mesmo tempo; no fim, ele toca e vibra com a bancada aberta.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "Na bancada, cada passo diz quanto pôr e onde você parou",
    frase:
      "O passo da vez fica marcado com Agora, e o ingrediente citado no passo já vem com a quantidade das fornadas escolhidas.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "O recheio abre dentro da receita do cookie, já na quantidade certa",
    frase:
      "Na bancada, toque embaixo do recheio: ela diz o que sai do pote e mostra os ingredientes dele na medida desta massa.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A bancada avisa, antes de começar, o ingrediente que não dá",
    frase:
      "Abra a receita na bancada e escolha as fornadas: ela diz quantas a despensa dá e marca o ingrediente contado que não chega.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "Na bancada, a letra ficou maior e a massa diz quanto pesa cada bolinha",
    frase:
      "Abra a receita na bancada: dá para ler de longe, ela conta o que já foi para a tigela e Começar de novo limpa as marcas.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O recheio pronto sai do pote",
    frase:
      "Conte o recheio que você fez antes em Contar o que está pronto: a massa que leva ele tira do pote, e os ingredientes dele ficam na despensa.",
    href: "/fichas/contagem",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O recheio entra em outra receita",
    frase:
      "Cadastre o recheio ou a massa base rendendo em gramas e busque pelo nome em O que vai dentro de outro produto: o custo dele segue os ingredientes, em todo produto que o usa.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "Um sabor novo começa da receita de outro",
    frase:
      "No pé do produto, Fazer uma variação abre um produto novo com os materiais, a embalagem, o tempo e o preparo deste: troque o que muda, dê o nome e salve.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "A receita abre em letra grande na bancada",
    frase:
      "No produto, Abrir na bancada mostra a receita para ler de longe, com a tela acesa: escolha quantas fornadas, toque no que já foi para a tigela e registre a massa no fim.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O produto guarda o modo de preparo",
    frase:
      "Na receita, o bloco Como se faz guarda o passo a passo, um passo por linha: cole do caderno ou do WhatsApp e ele fica junto das quantidades.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "O preço avisa quando a margem parece um multiplicador",
    frase:
      "Pedir que sobre 2,5% do preço quase sempre era multiplicar o custo por 2,5: a tela diz quanto sobra em cada caso e troca num toque. A taxa de cartão zerada também avisa, com a da sua maquininha.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "Cada material mostra quanto pesa no custo do produto",
    frase:
      "Na receita, cada material ganha um traço com a parte dele no custo, uma frase diz quais pesam mais, e o campo do rendimento diz quanto pesa a massa de cada unidade.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo: "No computador, o preço do produto fica ao lado da receita",
    frase:
      "Na tela grande, o preço, o que sobra e o custo do lote ficam numa coluna à direita enquanto você mexe na receita, e os materiais viram colunas de quantidade e custo.",
    href: "/fichas",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "No computador, a contagem do pronto mostra a última contagem e o esperado lado a lado",
    frase:
      "Na tela grande, cada produto vira uma linha com a última contagem, o que esperamos no pote e o campo de hoje, um ao lado do outro.",
    href: "/fichas/contagem",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "Depois de contar o que está pronto, veja o que falta para os pedidos e o que saiu sem pedido",
    frase:
      "Ao salvar, a contagem mostra o pote que não dá para os pedidos abertos, o que acabou, o que sumiu sem passar pelo app e quanto vale o que está pronto.",
    href: "/fichas/contagem",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "Conte o que está pronto no − e no +, e a contagem pela metade fica guardada",
    frase:
      "No celular, cada pote ganha botões para contar de um em um, o nome aparece inteiro, e se o app fechar no meio a contagem volta de onde parou.",
    href: "/fichas/contagem",
  },
  {
    dataISO: "2026-10-12",
    titulo:
      "Na contagem do que está pronto, veja quanto deveria ter em cada pote",
    frase:
      "Cada produto mostra a última contagem, mais a massa feita, menos o que saiu em pedido, e a tela abre no que precisa ser conferido.",
    href: "/fichas/contagem",
  },
  {
    dataISO: "2026-10-11",
    titulo:
      "No computador, a contagem mostra a última contagem e a projeção lado a lado",
    frase:
      "Cada material vira uma linha com a última contagem, o que projetamos depois das fornadas e o campo, um ao lado do outro.",
    href: "/insumos/contagem",
  },
  {
    dataISO: "2026-10-11",
    titulo:
      "Depois de contar, veja o que acabou e o que sumiu da despensa, em reais",
    frase:
      "Ao salvar a contagem, aparece o que acabou, o que estava diferente do esperado e quanto vale o que você contou.",
    href: "/insumos/contagem",
  },
  {
    dataISO: "2026-10-11",
    titulo: "A contagem pela metade fica guardada no celular até você salvar",
    frase:
      "Se a tela apagar no meio da contagem, ela volta de onde parou, e o “próximo” do teclado leva à linha seguinte.",
    href: "/insumos/contagem",
  },
  {
    dataISO: "2026-10-11",
    titulo: "A contagem abre no que precisa ser conferido",
    frase:
      "A contagem abre no que está vencido, nunca foi contado ou passou pelo forno, e cada corredor diz quantas linhas já foram.",
    href: "/insumos/contagem",
  },
  {
    dataISO: "2026-10-11",
    titulo: "Contar em latas e pacotes",
    frase:
      "Na contagem, conte em latas e pacotes, e confirme com um toque o que não mudou.",
    href: "/insumos/contagem",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O cardápio em duas colunas no computador",
    frase:
      "Aberto no computador, o cardápio fica mais largo e mostra os produtos lado a lado, em duas colunas, e a cliente rola menos.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O combo com uma foto só no cardápio",
    frase:
      "No cardápio, o combo sem foto aparece com a foto de um dos sabores, e não mais com quatro espremidas, e diz quantos vêm. Em “Seu cardápio”, o produto marcado sem foto aparece com “Sem foto”.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O cardápio mais enxuto no celular",
    frase:
      "No cardápio, o preço e o “+” ficam ao lado da foto, cabem mais doces numa tela, as seções têm título maior e o botão do topo diz “Compartilhar”.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O pedido pelo cardápio, mais fácil de preencher",
    frase:
      "No cardápio, o pedido não desliza mais para o lado, os próximos dias aparecem numa grade, sem rolar, o combo mostra os sabores embaixo do nome e, no computador, o total e o “Enviar pedido” ficam sempre à vista.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O topo e o fim do cardápio",
    frase:
      "No cardápio, o nome da loja não encosta mais na capa, os pedidos e o pagamento aparecem com rótulo, e o fim da lista mostra seu nome com o WhatsApp e o Instagram.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O aviso de pedido novo no celular",
    frase:
      "Em “Configuração”, ative o aviso neste aparelho: quando uma cliente manda pedido pelo cardápio, o celular toca, mesmo com o Rende fechado. Com ele aberto, aparece uma faixa no topo.",
    href: "/configuracao#avisos",
  },
  {
    dataISO: "2026-10-10",
    titulo: "A taxa no cardápio",
    frase:
      "Com a entrega configurada, a cliente põe o CEP no cardápio e vê a taxa e o total com ela antes de mandar. O pedido chega com a taxa, e você ainda pode mudar ao confirmar.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "A taxa de entrega pela distância",
    frase:
      "Em “Seu cardápio”, diga de onde sai a entrega, até onde vai e quanto cobra por faixa, com os bairros que têm outro preço. “Testar um CEP” mostra quanto a cliente pagaria.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "A cliente acompanha o pedido pelo link",
    frase:
      "Cada pedido ganha um link só dele, no resumo do WhatsApp e no aviso do cardápio: a cliente vê em que pé está, quanto falta pagar e copia o Pix com o valor.",
    href: "/pedidos",
  },
  {
    dataISO: "2026-10-10",
    titulo: "Um endereço com o nome da sua loja",
    frase:
      "Em “Seu cardápio”, escolha o endereço do link, com o nome da sua loja. O link antigo e o QR code já impresso continuam levando ao seu cardápio.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "Agenda cheia sem fechar o cardápio",
    frase:
      "Em “Seu cardápio”, diga até quando a agenda está cheia e a cliente só escolhe depois disso. O topo do cardápio passa a dizer para quando dá, como você recebe e o seu recado.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O QR code do seu cardápio, para imprimir",
    frase:
      "Em “Seu cardápio”, baixe o QR code para o balcão, a etiqueta ou a embalagem. A cliente aponta a câmera e cai no seu cardápio, e o link que você manda chega com a sua capa.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "O cardápio abre pelos mais pedidos",
    frase:
      "A primeira tela do cardápio mostra, com foto, os doces que mais saíram nos seus pedidos pagos dos dois últimos meses, sem dizer quantos.",
    href: "/configuracao#a-sua-marca",
  },
  {
    dataISO: "2026-10-10",
    titulo: "No cardápio, a cliente abre o doce",
    frase:
      "Tocar no doce mostra a foto grande e a descrição inteira, o combo diz quantos sabores se escolhe, e “Monte a sua” mostra a foto de cada sabor.",
    href: "/configuracao#a-sua-marca",
  },
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
