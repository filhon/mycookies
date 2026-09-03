/**
 * O caminho das primeiras semanas.
 *
 * O sistema tem quinze telas e uma cadeia de dependência que existe de verdade
 * — configuração → insumos → fichas → pedidos → caixa — sem que nada em tela
 * alguma diga que ela existe. Este módulo é essa ordem escrita uma vez só.
 *
 * **É um caminho, e não um tour** (`DECISOES.md#d65`): nenhum passo bloqueia
 * tela nenhuma, nenhum passo é obrigatório, e o sistema inteiro continua
 * funcionando com o cartão ignorado. O que ele faz é dizer onde ela está e
 * levá-la até lá.
 *
 * Os rótulos moram aqui pelo mesmo motivo que `ROTULO_CORREDOR` e os rótulos de
 * status do pedido moram no domínio: a frase que diz **o que se perde sem o
 * passo** é a regra, e não a renderização. Duas telas mostram estes cinco
 * passos — o cartão da tela Hoje e `/comecar` —, e duas cópias da mesma frase
 * divergiriam.
 *
 * Nada aqui toca o Firestore, e nada aqui sabe quem perguntou: o gancho traz os
 * cinco fatos prontos, este módulo devolve a ordem e o estado de cada um.
 */

export type EstadoPasso = "FEITO" | "AGORA" | "DEPOIS";

export type IdPasso =
  "CONFIGURACAO" | "INSUMOS" | "FICHAS" | "PEDIDOS" | "CAIXA";

/**
 * O que o sistema sabe sobre a conta. Cinco perguntas, cinco respostas.
 *
 * Cada fato é perguntado à coleção que tem a resposta, e nunca ao contador de
 * `agregados/global` (`DECISOES.md#d67`): um passo marcado como feito **some da
 * lista**, e o que some não volta a ser ensinado. O erro barato é o contrário —
 * um passo pendente sem razão custa um toque e uma olhada.
 */
export interface FatosDoComeco {
  temConfiguracao: boolean;
  temInsumo: boolean;
  temFicha: boolean;
  temPedido: boolean;
  temLancamento: boolean;
}

export interface PassoDoComeco {
  id: IdPasso;
  numero: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  /** Uma frase: o que se perde sem ele. Nunca uma instrução de clique. */
  porque: string;
  /** O que a tela vai pedir dela. Uma linha, não um manual. */
  oQueEsperar: string;
  href: string;
  rotuloAcao: string;
  estado: EstadoPasso;
}

/** O passo sem o estado: o que não depende de conta nenhuma. */
export type PassoBase = Omit<PassoDoComeco, "estado">;

/**
 * Os cinco, na ordem, e a ordem não depende dos fatos.
 *
 * **São a navegação inferior lida em voz alta** — Insumos, Fichas, Pedidos,
 * Caixa, na ordem em que os destinos já estão em `navegacao.ts` —, com a
 * configuração como o zero que não coube lá. Quem termina o caminho aprendeu o
 * menu sem que o menu tenha sido explicado.
 *
 * A meta ficou de fora de propósito (`DECISOES.md#d66`): ela já tem quem a peça,
 * e quem pede é o `CartaoMetaHoje`, logo abaixo deste cartão na mesma tela.
 */
export const CATALOGO_DO_COMECO: readonly PassoBase[] = [
  {
    id: "CONFIGURACAO",
    numero: 1,
    titulo: "Conferir a configuração",
    porque:
      "É daqui que saem a sua hora, o gás, a energia e a taxa da maquininha. Sem conferir, a ficha calcula o preço pela metade e o caixa não desconta o que a maquininha leva.",
    oQueEsperar:
      "Os valores já vêm sugeridos. Você confere o que é seu, ajusta e salva.",
    href: "/configuracao",
    rotuloAcao: "Conferir a configuração",
  },
  {
    id: "INSUMOS",
    numero: 2,
    titulo: "Cadastrar o que você compra",
    porque:
      "O preço do pacote é o que vira custo por grama. Sem um insumo cadastrado, nenhum doce tem custo.",
    oQueEsperar:
      "Nome, quanto vem no pacote e quanto você pagou. Uma foto da nota cadastra vários de uma vez.",
    href: "/insumos",
    rotuloAcao: "Cadastrar um insumo",
  },
  {
    id: "FICHAS",
    numero: 3,
    titulo: "Montar a primeira ficha",
    porque:
      "Enquanto o preço sai da intuição, não dá para saber se o doce paga o próprio custo.",
    oQueEsperar:
      "A receita como você faz: os insumos, o rendimento do lote e o tempo de bancada. O preço aparece no rodapé.",
    href: "/fichas",
    rotuloAcao: "Montar uma ficha",
  },
  {
    id: "PEDIDOS",
    numero: 4,
    titulo: "Registrar uma encomenda",
    porque:
      "É o pedido que enche a agenda da semana, monta a lista do mercado e mostra o que você ainda tem a receber.",
    oQueEsperar:
      "A cliente, o dia da entrega e o que ela pediu. O total e o quanto sobra ficam no rodapé.",
    href: "/pedidos",
    rotuloAcao: "Registrar uma encomenda",
  },
  {
    id: "CAIXA",
    numero: 5,
    titulo: "Marcar a encomenda como paga",
    porque:
      "O dinheiro só entra no caixa quando você diz que recebeu. Sem isso, o mês fecha em branco mesmo com a encomenda entregue.",
    oQueEsperar:
      "Abra a encomenda entregue e diga o dia em que o dinheiro caiu. O caixa do mês se refaz sozinho.",
    href: "/pedidos",
    rotuloAcao: "Abrir os pedidos",
  },
];

/** Qual fato fecha qual passo. Um por um, sem esperteza. */
const FATO_DO_PASSO: Record<IdPasso, (fatos: FatosDoComeco) => boolean> = {
  CONFIGURACAO: (fatos) => fatos.temConfiguracao,
  INSUMOS: (fatos) => fatos.temInsumo,
  FICHAS: (fatos) => fatos.temFicha,
  PEDIDOS: (fatos) => fatos.temPedido,
  CAIXA: (fatos) => fatos.temLancamento,
};

/**
 * Os cinco passos com o estado de cada um.
 *
 * Três regras, e as três têm teste:
 *
 * - **A ordem é fixa** e não depende dos fatos.
 * - **`FEITO` é o fato, em qualquer posição.** Quem cadastrou um insumo antes de
 *   salvar a configuração tem o passo 2 feito e o passo 1 como o de agora — o
 *   caminho aponta, não cobra.
 * - **Existe no máximo um `AGORA`**, e ele é o primeiro passo não feito. Todo
 *   passo não feito depois dele é `DEPOIS`, porque duas ações primárias na mesma
 *   tela não são uma escolha: são uma dúvida.
 */
export function passosDoComeco(fatos: FatosDoComeco): PassoDoComeco[] {
  let agoraJaSaiu = false;

  return CATALOGO_DO_COMECO.map((passo) => {
    if (FATO_DO_PASSO[passo.id](fatos)) {
      return { ...passo, estado: "FEITO" as const };
    }
    if (agoraJaSaiu) return { ...passo, estado: "DEPOIS" as const };

    agoraJaSaiu = true;
    return { ...passo, estado: "AGORA" as const };
  });
}

/** O passo de agora, ou `null` quando os cinco estão feitos. */
export function proximoPasso(passos: PassoDoComeco[]): PassoDoComeco | null {
  return passos.find((passo) => passo.estado === "AGORA") ?? null;
}

export interface ProgressoDoComeco {
  feitos: number;
  total: number;
  concluido: boolean;
}

/**
 * O progresso em passos, e não em porcentagem: a unidade é o passo, e uma barra
 * em 40% de um caminho de cinco é uma precisão que não existe.
 */
export function progressoDoComeco(passos: PassoDoComeco[]): ProgressoDoComeco {
  const feitos = passos.filter((passo) => passo.estado === "FEITO").length;
  return { feitos, total: passos.length, concluido: feitos === passos.length };
}
