import type { Route } from "next";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";

export interface Pergunta {
  /** Vira a âncora `#pergunta-{id}`: outras telas apontam para a resposta. */
  id: string;
  /** Como ela faz a pergunta, e não como o sistema chama a tela. */
  pergunta: string;
  /** Até três linhas, sem número de exemplo (`DECISOES.md#d70`). */
  resposta: string;
  href: Route;
  rotuloLink: string;
}

/**
 * As perguntas que atravessam telas, ou que nenhuma tela responde sozinha
 * (`DECISOES.md#d297`). Cópia, e não domínio: só esta página mostra.
 *
 * Cada resposta foi conferida no código na 095. Mudou o que ela diz? Muda aqui,
 * senão a resposta errada é a que ela vai ler.
 */
export const PERGUNTAS: readonly Pergunta[] = [
  {
    id: "caixa-zerado",
    pergunta: "Vendi, e o caixa do mês está zerado. Por quê?",
    // O agregado conta pelo dia do pagamento (`#d36`).
    resposta:
      "O Caixa conta o dinheiro no dia em que ele entra, e não no dia da entrega. A encomenda entregue e ainda não paga fica em “Me devem”: quando ela pagar, marque como pago, e a venda entra no caixa do dia em que o dinheiro entrou.",
    href: "/pedidos?vista=me-devem",
    rotuloLink: "Ver quem te deve",
  },
  {
    id: "preco-do-material",
    pergunta: "A farinha subiu. O preço dos meus doces muda sozinho?",
    // `marcarFichasDesatualizadas` (`#d05`) e o editor que abre com o preço
    // gravado como dela (`precoManual: true`).
    resposta:
      "Não: o preço é decisão sua. O material com preço novo deixa os produtos que o usam com “Custo desatualizado”. Abra e salve cada um para refazer o custo; o preço só muda se você tocar em “Usar”, ao lado do sugerido.",
    href: "/fichas",
    rotuloLink: "Ver os produtos",
  },
  {
    id: "hora",
    pergunta: "Mudei a minha hora na Configuração. E os produtos?",
    // `refazerFichasPelaConfiguracao` (`#d281`) e a prévia da 082-B.
    resposta:
      "Ao salvar, o custo de cada produto é refeito com a hora nova, e antes disso a tela mostra quais ficam mais caros. O preço de venda continua o seu. Os kits ficam com “Custo desatualizado” até você abrir e salvar.",
    href: "/configuracao#o-seu-preco",
    rotuloLink: "Abrir O seu preço",
  },
  {
    id: "sinal",
    pergunta: "A cliente pagou metade antes. Como eu lanço?",
    // `BlocoPagamento`, só no pedido gravado (`#d279`).
    resposta:
      "Abra o pedido e, em Pagamento, toque em “Recebi um sinal”. O sinal entra no caixa no dia em que ela pagou, e o pedido passa a dizer quanto falta. Quando o resto chegar, marque como pago.",
    href: "/pedidos",
    rotuloLink: "Abrir os pedidos",
  },
  {
    id: "pix",
    pergunta: "Como mando um Pix que já vai com o valor?",
    // A forma Pix com `pix` (`#d278`); sem ela, nem resumo nem botão levam o código.
    resposta:
      "Na Configuração, abra a forma Pix e preencha a chave, o nome e a cidade; o Pix de teste confere se cai na sua conta. Daí em diante, o resumo do WhatsApp leva o Pix copia e cola com o valor, e o pedido ganha “Copiar o Pix” enquanto não está pago.",
    href: "/configuracao#o-seu-preco",
    rotuloLink: "Abrir as formas de pagamento",
  },
  {
    id: "orcamento",
    pergunta: "Como mando o orçamento arrumado para a cliente?",
    // `BlocoOrcamento` em "Mandar pra cliente"; a folha lê o gravado (`#d107`).
    resposta:
      "Abra o pedido e, em “Mandar pra cliente”, toque em “Abrir a folha do orçamento”. A folha sai com a sua marca e a validade, e “Salvar em PDF” gera o arquivo para mandar. Ela mostra o que está salvo: salve o pedido antes.",
    href: "/pedidos",
    rotuloLink: "Abrir os pedidos",
  },
  {
    id: "dois-aparelhos",
    pergunta: "Posso usar no celular e no computador ao mesmo tempo?",
    resposta:
      "Pode. Entre com o mesmo e-mail nos dois: é a mesma conta, e o que você lança num aparece no outro quando os dois têm internet. O que foi feito sem internet fica na fila daquele aparelho, e aparece no outro depois de subir.",
    href: "/comecar#offline",
    rotuloLink: "Ver o que acontece sem internet",
  },
  {
    id: "arquivei",
    pergunta: "Arquivei uma coisa sem querer. Perdi?",
    // Nenhuma tela desarquiva hoje: `restaurarInsumo` existe e ninguém chama.
    // Quem conduz o projeto volta o `arquivado` à mão (`#d297`).
    resposta:
      "Não. Arquivar não apaga: tira das listas, e o que já foi feito com aquilo continua no histórico. Ainda não tem botão para desarquivar, então fale com a gente, e a gente traz de volta.",
    href: "/comecar#fale-com-a-gente",
    rotuloLink: "Falar com a gente",
  },
  {
    id: "mei",
    pergunta: "Como faço o relatório mensal do MEI?",
    // O pé de `/financeiro` (`#d269`).
    resposta:
      "No pé do Caixa, em “Relatório do MEI”. Ele soma as vendas do mês no modelo do portal: você confere, diz se emitiu nota e imprime. Do dia 1 ao 20, o link já abre o mês anterior, que é o que vence no dia 20.",
    href: "/financeiro",
    rotuloLink: "Abrir o Caixa",
  },
  {
    id: "assinatura",
    pergunta: "Se eu parar de assinar, o que acontece com o que eu cadastrei?",
    // Vencida lê e não escreve (`#d144`), o cardápio fecha, e apagar é só o
    // encerrar, por script, dias depois (`#d148`).
    resposta:
      "Fica tudo guardado. Sem assinatura, o Rende abre na tela de assinar e não deixa mexer, e o cardápio para de receber pedidos; assinando de novo, volta como estava. Apagar, só se você encerrar a conta.",
    href: "/configuracao#a-sua-conta",
    rotuloLink: "Abrir A sua conta",
  },
];

/** Pela pergunta e pela resposta, sem acento, como a busca de Materiais. */
export function filtrarPerguntas(termo: string): readonly Pergunta[] {
  const chave = chaveDeBusca(termo);
  if (!chave) return PERGUNTAS;
  return PERGUNTAS.filter((p) =>
    chaveDeBusca(`${p.pergunta} ${p.resposta}`).includes(chave),
  );
}
