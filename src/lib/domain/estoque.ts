import type {
  CategoriaInsumo,
  DataISO,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
import { agruparPorCorredor } from "./corredores";
import { diasEntre } from "./datas";
import { formatarQuantidade, paraBase } from "./unidades";

/**
 * Estoque é medição, e não saldo.
 *
 * Um saldo é consequência de movimentos. O sistema não vê os movimentos da
 * despensa — nem a fornada de quinta à noite, nem o pacote aberto para provar —,
 * então ele não tem como manter um saldo. O que ele guarda é **o que ela viu, e
 * quando viu**, e a consequência é este módulo inteiro: um número com data
 * envelhece, e um sistema que sabe a idade de um número pode parar de confiar
 * nele.
 *
 * `DataISO` entra e sai; `Timestamp` não atravessa. A precisão honesta é o dia:
 * ela conta na manhã de terça e assa na tarde de terça, e "contado há 6 horas"
 * seria uma exatidão que a despensa não tem.
 *
 * Nada aqui toca o Firestore: a tela chama para desenhar, a mutação chama para
 * gravar, e o teste cobre os dois com os mesmos números.
 */

// ---------------------------------------------------------------------------
// A idade da contagem
// ---------------------------------------------------------------------------

/**
 * Até quando uma contagem vale sem precisar dizer nada.
 *
 * Sete dias porque é o ciclo dela: ela compra no mesmo mercado toda semana, e o
 * horizonte padrão da lista de compras são 7 dias. Uma contagem vale uma ida ao
 * mercado sem aviso.
 */
export const IDADE_FRESCA_DIAS = 7;

/**
 * Depois disto a contagem não vale mais nada.
 *
 * Trinta porque é o maior horizonte da própria lista, e porque depois de um mês
 * todo número da despensa passou por uma compra e por várias fornadas: não
 * sobrou observação nenhuma dentro dele.
 */
export const IDADE_VENCE_DIAS = 30;

export type FrescorDaContagem = "FRESCA" | "ENVELHECENDO" | "VENCIDA" | "NUNCA";

/** A contagem de um insumo, do ponto de vista de quem vai decidir se confia. */
export interface ContagemDoInsumo {
  frescor: FrescorDaContagem;
  /** O que ela contou. `null` em `VENCIDA` e `NUNCA`: não é zero, é "não sei". */
  quantidade: number | null;
  /** Dias desde a contagem. `null` quando não há data. */
  idadeEmDias: number | null;
  /** O número que está gravado, mesmo quando não se confia nele. */
  anotado: number | null;
}

/**
 * O que a contagem precisa saber de um insumo. Nada além disso.
 *
 * Os dois campos aceitam `null` porque é isso que `corpoDeAtualizacao` grava
 * quando eles estão ausentes: no documento, "sem estoque" é `null` e não a
 * ausência da chave.
 */
export interface InsumoContado {
  estoqueAtual?: number | null;
  estoqueContadoEmISO?: DataISO | null;
}

/** Número negativo é dedo errado, e não dívida de farinha: vale ausência. */
function numeroAnotado(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/**
 * Os quatro estados, a partir da data da contagem.
 *
 * Data no futuro é dedo errado e vale `FRESCA`: quem digitou 2027 acabou de
 * contar, e desconfiar do número por causa do ano seria punir a contagem mais
 * recente que existe.
 */
export function frescorDaContagem(
  contadoEmISO: DataISO | null | undefined,
  hojeISO: DataISO,
): FrescorDaContagem {
  if (!contadoEmISO) return "NUNCA";

  const idade = diasEntre(contadoEmISO, hojeISO);
  if (idade <= IDADE_FRESCA_DIAS) return "FRESCA";
  if (idade <= IDADE_VENCE_DIAS) return "ENVELHECENDO";
  return "VENCIDA";
}

/**
 * O estoque gravado, lido como o que ele é: uma observação com idade.
 *
 * É aqui que `VENCIDA` vira `quantidade: null`. Não é zero — zero seria uma
 * afirmação sobre a despensa, e o que existe é ausência de informação.
 *
 * **Data sem número não é contagem.** O formulário de insumo pode apagar o
 * estoque e carregar a data adiante (é o que `dadosDoInsumo` faz com todo campo
 * que a tela da vez não fala). Sem número não há o que datar, e o insumo entra
 * como `NUNCA`.
 */
export function contagemDoInsumo(
  insumo: InsumoContado,
  hojeISO: DataISO,
): ContagemDoInsumo {
  const anotado = numeroAnotado(insumo.estoqueAtual);
  const contadoEmISO = insumo.estoqueContadoEmISO;
  const frescor =
    anotado === null ? "NUNCA" : frescorDaContagem(contadoEmISO, hojeISO);

  if (frescor === "NUNCA" || !contadoEmISO) {
    return {
      frescor: "NUNCA",
      quantidade: null,
      idadeEmDias: null,
      anotado,
    };
  }

  return {
    frescor,
    quantidade: frescor === "VENCIDA" ? null : anotado,
    // Contagem do futuro tem idade zero: "contada hoje" é a leitura honesta de
    // uma data que ainda não chegou.
    idadeEmDias: Math.max(0, diasEntre(contadoEmISO, hojeISO)),
    anotado,
  };
}

/**
 * O número que a lista de compras desconta.
 *
 * Contagem vencida e contagem inexistente valem **zero**, o que faz a lista
 * comprar a quantidade física inteira. A escolha é entre dois erros e eles não
 * custam o mesmo: descontar número velho erra para baixo e produz a compra
 * faltando — a fornada de sexta não acontece, e o pedido é da cliente. Não
 * descontar erra para cima e produz um pacote a mais na prateleira, que volta na
 * semana seguinte.
 */
export function estoqueParaLista(
  insumo: InsumoContado,
  hojeISO: DataISO,
): number {
  return contagemDoInsumo(insumo, hojeISO).quantidade ?? 0;
}

/** "contada hoje", "contada há 12 dias", "contada há mais de um mês", "nunca contada". */
export function rotuloDeIdade(contagem: ContagemDoInsumo): string {
  if (contagem.frescor === "NUNCA") return "nunca contada";

  // Passado de um mês, o número exato de dias não muda decisão nenhuma: o que
  // ela precisa saber é que a contagem não vale mais.
  if (contagem.frescor === "VENCIDA") return "contada há mais de um mês";

  const dias = contagem.idadeEmDias ?? 0;
  if (dias === 0) return "contada hoje";
  return `contada há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// ---------------------------------------------------------------------------
// A compra propondo a contagem
// ---------------------------------------------------------------------------

/**
 * O que a compra sugere no campo, e de onde a sugestão sai.
 *
 * Uma compra sabe **quanto entrou** e não sabe **o que saiu desde então**. Somar
 * a entrada e gravar seria inventar a metade que falta, então a compra faz o que
 * o sistema faz em todo lugar: calcula e pergunta (`DECISOES.md#d17`).
 *
 * As quatro regras, nesta ordem:
 *
 * 1. Sem entrada não há semente: o campo nasce vazio.
 * 2. Sem contagem confiável, a sugestão é **só o que entrou**. "Não sei mais
 *    1 kg" não são 1,5 kg.
 * 3. Contagem de hoje não recebe soma: ler a nota e depois fechar a lista da
 *    mesma compra encontraria a contagem feita há minutos e somaria os mesmos
 *    pacotes de novo.
 * 4. Contagem confiável de outro dia soma a entrada.
 *
 * `hojeISO` não entra: `ContagemDoInsumo` já foi lida contra hoje, e um segundo
 * "hoje" aqui seria uma data a mais para discordar da primeira.
 */
export function sugestaoDaContagem(
  contagem: ContagemDoInsumo,
  entrada: number,
): number | null {
  if (!(entrada > 0)) return null;
  if (contagem.quantidade === null) return entrada;
  if (contagem.idadeEmDias === 0) return contagem.quantidade;
  return contagem.quantidade + entrada;
}

/** De onde a entrada veio, que é o que a linha da contagem precisa dizer. */
export type OrigemDaEntrada = "NOTA" | "LISTA";

const ORIGEM: Record<OrigemDaEntrada, { de: string; sujeito: string }> = {
  NOTA: { de: "da nota", sujeito: "a nota" },
  LISTA: { de: "da compra", sujeito: "a compra" },
};

/** Uma linha de compra, no bastante para virar entrada em unidade base. */
export interface LinhaDeCompra {
  insumoId: string;
  /** Quantas embalagens a linha trouxe. Duas de 500 g são 1000 g. */
  embalagens: number;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
}

/** O que a nota trouxe, por `insumoId` e em unidade base. */
export function entradasDaNota(linhas: LinhaDeCompra[]): Map<string, number> {
  const entradas = new Map<string, number>();

  for (const linha of linhas) {
    if (!linha.insumoId) continue;
    const quantidade =
      linha.embalagens * paraBase(linha.quantidadeCompra, linha.unidadeCompra);
    if (!(quantidade > 0)) continue;

    // Duas linhas do mesmo insumo na mesma nota são uma entrada só.
    entradas.set(
      linha.insumoId,
      (entradas.get(linha.insumoId) ?? 0) + quantidade,
    );
  }

  return entradas;
}

/**
 * O mesmo, a partir do que ela marcou como comprado na lista.
 *
 * O tamanho do pacote vem do insumo vivo, e não da linha gravada: é lá que ele
 * muda quando a marca do mercado muda.
 */
export function entradasDaLista(
  itens: { insumoId: string; quantidadePacotes: number; comprado: boolean }[],
  insumos: { id: string; quantidadeBase: number }[],
): Map<string, number> {
  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const entradas = new Map<string, number>();

  for (const item of itens) {
    if (!item.comprado) continue;
    const insumo = porId.get(item.insumoId);
    if (!insumo) continue;

    const quantidade = item.quantidadePacotes * insumo.quantidadeBase;
    if (!(quantidade > 0)) continue;

    entradas.set(
      item.insumoId,
      (entradas.get(item.insumoId) ?? 0) + quantidade,
    );
  }

  return entradas;
}

// ---------------------------------------------------------------------------
// A tela de contagem
// ---------------------------------------------------------------------------

/** O que a tela de contagem precisa saber de um insumo. */
export interface InsumoParaContar extends InsumoContado {
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidadeBase: UnidadeBase;
  arquivado?: boolean;
}

/** Uma linha da tela de contagem. `digitado: null` é "não contei esta". */
export interface LinhaDeContagem {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidadeBase: UnidadeBase;
  contagem: ContagemDoInsumo;
  /** O que entrou pela compra, em unidade base. Zero quando não há compra. */
  entrada: number;
  /** A sugestão semeada, ou `null` quando não há o que sugerir. */
  sugestao: number | null;
}

/**
 * A tela inteira, na ordem em que se anda pela despensa.
 *
 * A ordem é a do corredor do mercado, e não a alfabética: é a mesma ordem da
 * lista de compras, e contar é ato de compra.
 */
export function linhasParaContar(
  insumos: InsumoParaContar[],
  entradas: Map<string, number>,
  hojeISO: DataISO,
): LinhaDeContagem[] {
  const linhas = insumos
    .filter((insumo) => !insumo.arquivado)
    .map((insumo) => {
      const contagem = contagemDoInsumo(insumo, hojeISO);
      const entrada = entradas.get(insumo.id) ?? 0;

      return {
        insumoId: insumo.id,
        nome: insumo.nome,
        categoria: insumo.categoria,
        unidadeBase: insumo.unidadeBase,
        contagem,
        entrada,
        sugestao: sugestaoDaContagem(contagem, entrada),
      };
    });

  return agruparPorCorredor(linhas).flatMap((corredor) => corredor.itens);
}

/**
 * De onde a sugestão saiu, em uma frase.
 *
 * Uma sugestão sem procedência é um número que ela não tem como conferir: os
 * mesmos 1620 g podem ser "620 que eu contei mais 1 kg que entrou na compra" ou
 * um palpite do sistema, e a diferença entre os dois é tudo o que esta spec
 * constrói.
 *
 * Devolve `null` quando não há sugestão — sem compra o campo nasce vazio, e não
 * há nada a explicar.
 */
export function procedenciaDaSugestao(
  linha: LinhaDeContagem,
  origem: OrigemDaEntrada,
): string | null {
  if (linha.sugestao === null) return null;

  const { contagem, entrada, unidadeBase } = linha;
  const quanto = (valor: number) => formatarQuantidade(valor, unidadeBase);
  const { de, sujeito } = ORIGEM[origem];

  // Sem contagem confiável não há soma, e a frase diz isso em vez de fingir um
  // saldo: "não sei mais 1 kg" não são 1,5 kg.
  if (contagem.quantidade === null) {
    return `sem contagem recente · sugerimos ${quanto(entrada)}, que ${sujeito} trouxe`;
  }

  // Ler a nota e depois fechar a lista da mesma compra encontraria a contagem
  // feita há minutos e somaria os mesmos pacotes de novo.
  if (contagem.idadeEmDias === 0) {
    return `contada hoje · ${sujeito} não foi somada de novo`;
  }

  const dias = contagem.idadeEmDias ?? 0;
  return `${quanto(contagem.quantidade)} contados há ${dias} ${
    dias === 1 ? "dia" : "dias"
  } + ${quanto(entrada)} ${de}`;
}

/**
 * O que ela digitou em uma linha, lido como os três estados que a tela precisa.
 *
 * Vazio é **"não contei esta"**, e `0` é **"contei, e não tem"**. São coisas
 * diferentes e por isso têm representações diferentes — é a terceira vez que
 * este projeto encontra o mesmo problema, depois do `#d43` e do `#d21`. Texto
 * que não vira número também é ausência: gravar zero porque ela digitou uma
 * letra seria inventar uma contagem.
 */
export function numeroContado(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;

  const valor = Number(limpo.replace(",", "."));
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/**
 * O inverso de `numeroContado`: a sugestão da compra virando texto de campo.
 *
 * Arredonda em três casas antes de escrever porque a entrada passa por
 * `paraBase`, e 2 × 0,5 kg em ponto flutuante sabe voltar como
 * 999,9999999999999 — um número que ela nunca digitaria e que não quer dizer
 * nada na despensa. A vírgula é a dela: é assim que o campo vai ser reeditado.
 */
export function textoContado(valor: number): string {
  return String(Number(valor.toFixed(3))).replace(".", ",");
}

export interface ResumoDaContagem {
  /** Quantas linhas ela digitou. A linha zerada conta aqui também. */
  contadas: number;
  /** Quantas dessas são `0`: conferidas, e vazias. */
  zeradas: number;
  /** Quantas ela não tocou. Estas não são gravadas. */
  intocadas: number;
  total: number;
}

/** O rodapé: "4 de 5 contados · 1 zerado". */
export function resumoDaContagem(
  linhas: LinhaDeContagem[],
  digitados: Record<string, number | null>,
): ResumoDaContagem {
  let contadas = 0;
  let zeradas = 0;

  for (const linha of linhas) {
    const digitado = digitados[linha.insumoId];
    if (digitado === null || digitado === undefined) continue;
    contadas += 1;
    if (digitado === 0) zeradas += 1;
  }

  return {
    contadas,
    zeradas,
    intocadas: linhas.length - contadas,
    total: linhas.length,
  };
}
