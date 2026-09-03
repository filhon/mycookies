import { z } from "zod";
import { ehEmbalagem } from "./custoFicha";
import { chaveDeBusca } from "./custoInsumo";
import type {
  CategoriaInsumo,
  CategoriaTransacao,
  Centavos,
  DataISO,
  Percentual,
  UnidadeCompra,
} from "@/lib/types";

/**
 * Do papel ao insumo.
 *
 * A regra que este módulo inteiro existe para sustentar: **toda palavra é do
 * modelo, todo número é daqui.** O modelo devolve o que está impresso, em
 * texto, exatamente como está — `"12,50"`, `"1,01KG"`, `"C/25"`. Quem
 * transforma isso em centavos inteiros, em unidade base e em categoria é este
 * arquivo, puro, sem Firebase e sem React, coberto por teste.
 *
 * O motivo é `DECISOES.md#d02`: dinheiro é centavo inteiro porque erro de
 * arredondamento aqui é o defeito mais caro possível, e não se delega o
 * arredondamento a um sistema probabilístico. O motivo prático é maior — um
 * número que o modelo calculou é um número que ninguém pode auditar. Com a
 * divisão acima, a parte perigosa da leitura é justamente a que `npm test`
 * cobre.
 */

// ---------------------------------------------------------------------------
// O que a rota devolve
// ---------------------------------------------------------------------------

/** O que o modelo devolve por linha: texto impresso, nunca conta feita. */
export interface LinhaLida {
  /** "FARINHA TRIGO DONA BENTA 1KG" — como está no papel. */
  descricao: string;
  /** "Farinha de trigo" — a tradução, que é o que o modelo serve para fazer. */
  nome: string;
  /** "Dona Benta" — "" quando não dá para dizer. */
  marca: string;
  /** "1" — quantas embalagens, como impresso. */
  quantidade: string;
  /** "UN" — a coluna de unidade da nota. */
  unidadeTexto: string;
  valorUnitario: string;
  valorTotal: string;
}

export interface NotaLida {
  estabelecimento: string;
  /** "75.315.333/0001-09" — como impresso, "" se ilegível. */
  cnpj: string;
  /** "" até a consulta de CNPJ responder; só a rota preenche. */
  cidade: string;
  /** "" quando ilegível. */
  dataISO: string;
  total: string;
  linhas: LinhaLida[];
}

// ---------------------------------------------------------------------------
// Tetos, porque cota é dinheiro
// ---------------------------------------------------------------------------

/** Depois da compressão. Foto de celular chega com muito mais do que isso. */
export const LIMITE_ARQUIVO_BYTES = 8 * 1024 * 1024;

/** Nota de mercado tem entre seis e vinte linhas. Sessenta é folga larga. */
export const LIMITE_LINHAS = 60;

/** Quanto a leitura pode demorar antes de virar falha com frase. */
export const TEMPO_LIMITE_LEITURA_MS = 30_000;

/** O enriquecimento é opcional: passou disso, a leitura segue sem ele. */
export const TEMPO_LIMITE_CNPJ_MS = 3_000;

/** Maior lado da imagem depois da redução, e a qualidade do JPEG. */
export const LADO_MAXIMO_PX = 1600;
export const QUALIDADE_JPEG = 0.8;

export const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

// ---------------------------------------------------------------------------
// As falhas, com a frase de cada uma
// ---------------------------------------------------------------------------

/**
 * Cada teto estourado tem a sua frase, e a frase mora aqui e não na tela: a
 * rota decide o código e a tela escreve a mesma coisa que o teste leu.
 */
export type FalhaNota =
  | "sem-acesso"
  | "sem-arquivo"
  | "arquivo-grande"
  | "linhas-demais"
  | "fora-de-forma"
  | "sem-resposta"
  | "sem-configuracao"
  | "sem-rede";

export const MENSAGEM_FALHA: Record<FalhaNota, string> = {
  "sem-acesso":
    "Este login não abre esta conta. Saia e entre de novo, e tente outra vez.",
  "sem-arquivo": "Não deu para ler esse arquivo. Escolha uma foto ou um PDF.",
  "arquivo-grande":
    "Esse arquivo é grande demais, mesmo depois de reduzido. Fotografe a nota mais de perto, em partes.",
  "linhas-demais": `Esta nota tem mais de ${LIMITE_LINHAS} linhas. Fotografe em partes e leia uma parte de cada vez — o que já foi cadastrado não se perde.`,
  "fora-de-forma":
    "A leitura voltou embaralhada. Tente de novo com a nota mais plana e a foto mais reta.",
  "sem-resposta":
    "A leitura demorou demais e foi interrompida. Tente de novo em instantes.",
  "sem-configuracao":
    "A leitura de nota ainda não está configurada neste servidor.",
  "sem-rede":
    "Ler uma nota precisa de internet. Sem ela, o cadastro à mão continua funcionando.",
};

// ---------------------------------------------------------------------------
// O esquema da resposta do modelo
// ---------------------------------------------------------------------------

/**
 * Campo de texto tolerante à ausência, e intolerante a número.
 *
 * Ausente ou nulo vira `""`, porque "linha que não deu para ler vira linha com
 * campo vazio" — e campo vazio ela corrige em dois toques. Mas um `12.5` no
 * lugar de `"12,50"` é recusado: é exatamente o número que o modelo não tem
 * direito de calcular, e aceitá-lo desfaria a regra deste módulo.
 */
const texto = () =>
  z
    .string()
    .nullish()
    .transform((valor) => valor ?? "");

export const esquemaLinhaLida = z.object({
  descricao: texto(),
  nome: texto(),
  marca: texto(),
  quantidade: texto(),
  unidadeTexto: texto(),
  valorUnitario: texto(),
  valorTotal: texto(),
});

export const esquemaNotaLida = z.object({
  estabelecimento: texto(),
  cnpj: texto(),
  cidade: texto(),
  dataISO: texto(),
  total: texto(),
  // Sem teto aqui: passar de sessenta linhas não é resposta fora de forma, é um
  // teto de cota estourado — e ele tem a frase dele, que diz o que fazer. O
  // limite de sanidade evita uma resposta em laço virar mil cartões na tela.
  linhas: z.array(esquemaLinhaLida).max(LIMITE_LINHAS * 10),
});

// ---------------------------------------------------------------------------
// Texto impresso → número
// ---------------------------------------------------------------------------

/**
 * `"1.234,56"` e `"1234.56"` → `123456`. `null` quando não é número.
 *
 * Não é `parseParaCentavos` de `money.ts`, e a diferença é de propósito. Aquele
 * lê um teclado, onde quem digita sabe o que quis dizer e onde o valor ausente
 * é legitimamente zero. Este lê um papel, onde:
 *
 * - **`null` não é zero.** Uma linha cujo valor não deu para ler precisa ser
 *   distinguível de uma linha de graça, senão o rodapé some com dinheiro.
 * - **`.` com três casas é separador de milhar.** Nota brasileira imprime
 *   `1.500` para mil e quinhentos reais, e `1.500,00` para o mesmo valor. A
 *   vírgula, essa, é sempre decimal.
 */
export function centavosDoTexto(entrada: string): Centavos | null {
  const limpo = (entrada ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!/\d/.test(limpo)) return null;

  const negativo = limpo.startsWith("-");
  const semSinal = limpo.replace(/-/g, "");

  const ultimaVirgula = semSinal.lastIndexOf(",");
  const ultimoPonto = semSinal.lastIndexOf(".");
  const posDecimal = Math.max(ultimaVirgula, ultimoPonto);

  let valor: number;
  if (posDecimal === -1) {
    // Sem separador nenhum, o que está impresso são reais inteiros.
    valor = Number(semSinal);
  } else {
    const casas = semSinal.length - posDecimal - 1;
    const milharSolitario =
      ultimaVirgula === -1 &&
      casas === 3 &&
      semSinal.indexOf(".") === posDecimal;

    if (milharSolitario) {
      valor = Number(semSinal.replace(/\./g, ""));
    } else {
      const inteiro = semSinal.slice(0, posDecimal).replace(/[.,]/g, "");
      const decimal = semSinal.slice(posDecimal + 1).replace(/[.,]/g, "");
      valor = Number(`${inteiro || "0"}.${decimal}`);
    }
  }

  if (!Number.isFinite(valor)) return null;
  const centavos = Math.round(valor * 100);
  return negativo ? -centavos : centavos;
}

/** `"1,240"` → `1.24`. A quantidade de embalagens, que não é dinheiro. */
function numeroDoTexto(entrada: string): number | null {
  const limpo = (entrada ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!/\d/.test(limpo)) return null;

  const ultimoSeparador = Math.max(
    limpo.lastIndexOf(","),
    limpo.lastIndexOf("."),
  );
  const valor =
    ultimoSeparador === -1
      ? Number(limpo)
      : Number(
          `${limpo.slice(0, ultimoSeparador).replace(/[.,]/g, "")}.${limpo
            .slice(ultimoSeparador + 1)
            .replace(/[.,]/g, "")}`,
        );

  return Number.isFinite(valor) ? valor : null;
}

// ---------------------------------------------------------------------------
// Descrição → embalagem
// ---------------------------------------------------------------------------

export interface Embalagem {
  quantidade: number;
  unidade: UnidadeCompra;
}

const UNIDADE_DA_NOTA: Record<string, UnidadeCompra> = {
  KG: "kg",
  KGS: "kg",
  QUILO: "kg",
  G: "g",
  GR: "g",
  GRS: "g",
  L: "l",
  LT: "l",
  LTS: "l",
  LITRO: "l",
  ML: "ml",
};

/** `500G` e `1,01KG`. `KG` e `ML` vêm antes de `G` e `L` para não serem comidos. */
const TAMANHO = /(\d+(?:[.,]\d+)?)\s*(KG|ML|G|L)(?![A-Z])/gi;

/** `C/25` e `C/ 25` — é assim que se escreve "vem 25 dentro". */
const DENTRO = /\bC\/\s*(\d+)/i;

/**
 * `10X15` é dimensão de embalagem, e não quantidade.
 *
 * A máscara poupa o caso em que o segundo número carrega unidade — `2X500G` é
 * "dois de quinhentos gramas", e ali o tamanho da embalagem é 500 g.
 */
const DIMENSAO =
  /\d+(?:[.,]\d+)?\s*[xX]\s*\d+(?:[.,]\d+)?(?![\d.,])(?!\s*(?:KG|ML|G|L)\b)/g;

/**
 * `"1,01KG"` → `{ 1,01, "kg" }` · `"C/25"` → `{ 25, "un" }`.
 *
 * É a função difícil deste módulo, e as regras dela são deterministas de
 * propósito — o modelo lê a descrição, mas quem decide o que ela significa é
 * uma tabela que o teste consegue interrogar:
 *
 * 1. `C/<n>` vence tudo.
 * 2. `<n><unidade>` com unidade em `kg|g|l|ml` vem depois. Vale o **último**
 *    tamanho da descrição, porque é ali que o mercado imprime o do pacote.
 * 3. `<n>X<n>` é dimensão, e não conta.
 * 4. Nada disso: a coluna de unidade da nota, quando ela é peso ou volume — um
 *    item vendido a `KG` custa o valor unitário por quilo —, e `{ 1, "un" }`
 *    no resto, que é o palpite honesto.
 */
export function embalagemDoTexto(
  descricao: string,
  unidadeTexto = "",
): Embalagem {
  const semDimensao = (descricao ?? "").replace(DIMENSAO, " ");

  const dentro = DENTRO.exec(semDimensao);
  if (dentro?.[1]) {
    const quantidade = Number(dentro[1]);
    if (quantidade > 0) return { quantidade, unidade: "un" };
  }

  let tamanho: RegExpExecArray | null;
  let ultimo: RegExpExecArray | null = null;
  TAMANHO.lastIndex = 0;
  while ((tamanho = TAMANHO.exec(semDimensao)) !== null) ultimo = tamanho;

  if (ultimo?.[1] && ultimo[2]) {
    const quantidade = numeroDoTexto(ultimo[1]);
    const unidade = UNIDADE_DA_NOTA[ultimo[2].toUpperCase()];
    if (quantidade && quantidade > 0 && unidade) return { quantidade, unidade };
  }

  const daColuna = UNIDADE_DA_NOTA[(unidadeTexto ?? "").trim().toUpperCase()];
  if (daColuna) return { quantidade: 1, unidade: daColuna };

  return { quantidade: 1, unidade: "un" };
}

// ---------------------------------------------------------------------------
// Descrição → categoria
// ---------------------------------------------------------------------------

/**
 * Categoria por tabela de palavras, e não pelo modelo.
 *
 * São cinco categorias e algumas dezenas de palavras. Uma tabela é grátis,
 * determinista, testável e corrigível em um toque; a mesma resposta vinda do
 * modelo custa token e não pode ser conferida por teste.
 *
 * `cx` ficou de fora de propósito: "LEITE CX 1L" e "OVOS CX C/30" são comida, e
 * a abreviação sozinha erraria mais do que acerta.
 */
const PALAVRAS: { categoria: CategoriaInsumo; palavras: string[] }[] = [
  {
    categoria: "ETIQUETA",
    palavras: [
      "etiqueta",
      "etiquetas",
      "adesivo",
      "adesivos",
      "rotulo",
      "rotulos",
      "tag",
      "tags",
    ],
  },
  {
    categoria: "ARMAZENAMENTO",
    palavras: [
      "pote",
      "potes",
      "potinho",
      "potinhos",
      "hermetico",
      "vasilha",
      "tupperware",
      "ziplock",
    ],
  },
  {
    categoria: "EMBALAGEM",
    palavras: [
      "saco",
      "sacos",
      "saquinho",
      "saquinhos",
      "sacola",
      "sacolas",
      "caixa",
      "caixas",
      "celofane",
      "papel",
      "kraft",
      "cartonado",
      "fita",
      "fitas",
      "laco",
      "lacos",
      "bandeja",
      "bandejas",
      "forminha",
      "forminhas",
      "filme",
      "plastico",
      "tampa",
      "tampas",
      "copo",
      "copos",
      "embalagem",
      "embalagens",
      "blister",
      "cinta",
      "cintas",
      "marmita",
      "marmitex",
      "guardanapo",
      "guardanapos",
    ],
  },
];

export function categoriaSugerida(descricao: string): CategoriaInsumo {
  const alvo = ` ${chaveDeBusca(descricao ?? "").replace(/[^a-z0-9]+/g, " ")} `;

  for (const grupo of PALAVRAS) {
    if (grupo.palavras.some((palavra) => alvo.includes(` ${palavra} `))) {
      return grupo.categoria;
    }
  }

  return "INGREDIENTE";
}

// ---------------------------------------------------------------------------
// CNPJ
// ---------------------------------------------------------------------------

/** Só os catorze dígitos, sem a pontuação que o papel imprime. */
export function digitosDoCnpj(texto: string): string {
  return (texto ?? "").replace(/\D/g, "");
}

/**
 * Os dois dígitos verificadores, offline.
 *
 * É o único campo do papel que o sistema confere sozinho — sem rede, sem
 * modelo, sem perguntar nada a ela. Se o dígito não fecha, a leitura do
 * cabeçalho saiu torta, e isso se sabe antes de gastar qualquer chamada.
 * Catorze dígitos iguais fecham a conta e não são CNPJ de ninguém.
 */
export function cnpjValido(texto: string): boolean {
  const digitos = digitosDoCnpj(texto);
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const verificador = (ate: number): number => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(digitos[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    verificador(12) === Number(digitos[12]) &&
    verificador(13) === Number(digitos[13])
  );
}

// ---------------------------------------------------------------------------
// A nota lida → o rascunho que a tela edita
// ---------------------------------------------------------------------------

export interface LinhaRascunho {
  /** Identidade da linha na tela: sobrevive a editar, remover e trazer de volta. */
  chave: string;
  /** O que está impresso, guardado para ela conferir contra o papel. */
  descricao: string;
  nome: string;
  marca: string;
  categoria: CategoriaInsumo;
  /**
   * O preço de UMA embalagem, e nunca o da linha.
   *
   * `Insumo.precoCompra` é o preço de uma embalagem inteira, e uma linha de
   * duas manteigas a R$ 17,50 vale R$ 35,00 no cupom e R$ 17,50 no cadastro.
   * Quem soma R$ 35,00 é o caixa; por isso os dois números vivem separados.
   */
  precoCompra: Centavos;
  /** O que a linha vale no cupom. É esta que soma para conferir o total. */
  valorTotal: Centavos;
  /** Quantas embalagens a linha traz. */
  embalagens: number;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
}

export interface RascunhoNota {
  estabelecimento: string;
  /** Catorze dígitos, ou "" quando o verificador não fecha. */
  cnpj: string;
  cidade: string;
  /** "" quando ilegível. */
  dataISO: DataISO;
  total: Centavos;
  linhas: LinhaRascunho[];
}

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** `NotaLida` → `RascunhoNota`, com tudo já em centavos e unidade base. */
export function normalizarNota(lida: NotaLida): RascunhoNota {
  const cnpj = digitosDoCnpj(lida.cnpj);

  return {
    estabelecimento: lida.estabelecimento.trim(),
    cnpj: cnpjValido(cnpj) ? cnpj : "",
    cidade: lida.cidade.trim(),
    dataISO: FORMATO_ISO.test(lida.dataISO.trim()) ? lida.dataISO.trim() : "",
    total: centavosDoTexto(lida.total) ?? 0,
    linhas: lida.linhas.map((linha, indice) => normalizarLinha(linha, indice)),
  };
}

function normalizarLinha(linha: LinhaLida, indice: number): LinhaRascunho {
  const descricao = linha.descricao.trim();
  const embalagem = embalagemDoTexto(descricao, linha.unidadeTexto);

  const embalagens = Math.max(numeroDoTexto(linha.quantidade) ?? 1, 0) || 1;
  const unitario = centavosDoTexto(linha.valorUnitario);
  const total = centavosDoTexto(linha.valorTotal);

  // Um dos dois basta: o outro sai por divisão ou por multiplicação, e as duas
  // contas são daqui. O que não se faz é inventar valor onde não há nenhum.
  const precoCompra =
    unitario ?? (total !== null ? Math.round(total / embalagens) : 0);
  const valorTotal = total ?? Math.round(precoCompra * embalagens);

  return {
    chave: `linha-${indice}`,
    descricao,
    nome: linha.nome.trim() || descricao,
    marca: linha.marca.trim(),
    categoria: categoriaSugerida(`${descricao} ${linha.nome}`),
    precoCompra,
    valorTotal,
    embalagens,
    quantidadeCompra: embalagem.quantidade,
    unidadeCompra: embalagem.unidade,
  };
}

// ---------------------------------------------------------------------------
// Conferência do total
// ---------------------------------------------------------------------------

export interface ConferenciaTotal {
  /** A soma das linhas mantidas. */
  soma: Centavos;
  /** O total impresso na nota. */
  total: Centavos;
  /** `total − soma`. Positivo quando falta linha para fechar. */
  diferenca: Centavos;
  bate: boolean;
}

export function somarLinhas(linhas: LinhaRascunho[]): Centavos {
  return linhas.reduce((soma, linha) => soma + linha.valorTotal, 0);
}

/** A soma bate com a nota? Devolve a diferença, em centavos. */
export function conferirTotal(
  linhas: LinhaRascunho[],
  total: Centavos,
): ConferenciaTotal {
  const soma = somarLinhas(linhas);
  const diferenca = total - soma;
  return { soma, total, diferenca, bate: diferenca === 0 };
}

// ---------------------------------------------------------------------------
// Pareamento com o que já está cadastrado
// ---------------------------------------------------------------------------

/** O bastante de um insumo para parear e para dizer "era R$ 11,90". */
export interface InsumoConhecido {
  id: string;
  nome: string;
  nomeBusca: string;
  precoCompra: Centavos;
}

export interface Pareamento {
  insumoId: string;
  /** O nome **cadastrado**, e não o lido: é ele que a tela mostra no selo. */
  nome: string;
  precoAnterior: Centavos;
}

/** Prefixo curto demais casa com meio cadastro. Três letras é o piso. */
const PREFIXO_MINIMO = 3;

/**
 * Toda linha é pareada contra os insumos já cadastrados, por `nomeBusca`:
 * exato primeiro, prefixo depois, `null` se nenhum.
 *
 * É o item que decide se a funcionalidade ainda serve no segundo mês. Sem ele,
 * a terceira compra do ano deixa a conta com três farinhas, e a ficha do cookie
 * aponta para a primeira.
 *
 * O pareamento sai do **nome atual da linha**, e não do que o modelo leu: como
 * a tela recalcula a cada tecla, corrigir o nome é o jeito de desfazer um
 * pareamento errado, sem nenhum controle a mais na tela.
 */
export function parearComInsumos(
  linhas: LinhaRascunho[],
  insumos: InsumoConhecido[],
): Map<string, Pareamento> {
  const pares = new Map<string, Pareamento>();

  for (const linha of linhas) {
    const alvo = chaveDeBusca(linha.nome);
    if (!alvo) continue;

    const escolhido =
      insumos.find((insumo) => insumo.nomeBusca === alvo) ??
      melhorPrefixo(alvo, insumos);

    if (escolhido) {
      pares.set(linha.chave, {
        insumoId: escolhido.id,
        nome: escolhido.nome,
        precoAnterior: escolhido.precoCompra,
      });
    }
  }

  return pares;
}

/**
 * "Farinha" casa com "Farinha de trigo", e o corte é em palavra inteira: sem
 * isso, "Farinha" casaria com "Farinheira" e a compra atualizaria o insumo
 * errado. Entre dois candidatos, vence o de nome mais próximo em comprimento.
 */
function melhorPrefixo(
  alvo: string,
  insumos: InsumoConhecido[],
): InsumoConhecido | undefined {
  if (alvo.length < PREFIXO_MINIMO) return undefined;

  const candidatos = insumos.filter((insumo) => {
    const nome = insumo.nomeBusca;
    if (nome.length < PREFIXO_MINIMO) return false;

    const [maior, menor] =
      nome.length >= alvo.length ? [nome, alvo] : [alvo, nome];
    return (
      maior.startsWith(menor) &&
      (maior.length === menor.length || maior[menor.length] === " ")
    );
  });

  return candidatos.sort(
    (a, b) =>
      Math.abs(a.nomeBusca.length - alvo.length) -
      Math.abs(b.nomeBusca.length - alvo.length),
  )[0];
}

// ---------------------------------------------------------------------------
// A linha vira cadastro
// ---------------------------------------------------------------------------

/**
 * Os campos que a nota preenche num insumo.
 *
 * Precisa continuar atribuível a `DadosInsumo` de `mutations/insumos.ts` — o
 * compilador cobra isso no ponto em que a tela monta a gravação. A forma mora
 * aqui porque a **regra** de o que a nota pode escrever é de domínio, e é o que
 * o teste interroga.
 */
export interface CadastroDaLinha {
  nome: string;
  categoria: CategoriaInsumo;
  marca?: string;
  fornecedor?: string;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  perdaPercentual: Percentual;
}

/**
 * Insumo novo nasce com `perdaPercentual: 0`, e a linha não pergunta.
 *
 * É o único campo do formulário que a nota não pode responder, e transformá-lo
 * em pergunta obrigatória faria cada leitura terminar em seis perguntas. Ela
 * ajusta em `/insumos` quando quiser.
 */
export function cadastroDaLinha(
  linha: LinhaRascunho,
  fornecedor: string,
): CadastroDaLinha {
  return {
    nome: linha.nome.trim(),
    categoria: linha.categoria,
    ...(linha.marca.trim() ? { marca: linha.marca.trim() } : {}),
    ...(fornecedor.trim() ? { fornecedor: fornecedor.trim() } : {}),
    precoCompra: linha.precoCompra,
    quantidadeCompra: linha.quantidadeCompra,
    unidadeCompra: linha.unidadeCompra,
    perdaPercentual: 0,
  };
}

/** O bastante de um insumo cadastrado para saber o que a nota não pode tocar. */
export interface InsumoParaAtualizar {
  marca?: string;
  fornecedor?: string;
}

/**
 * Uma nota traz preço. Ela não traz o que você configurou.
 *
 * Mudam `precoCompra`, `quantidadeCompra`, `unidadeCompra`, e `marca` e
 * `fornecedor` **se estiverem vazios**. Continuam como estavam
 * `perdaPercentual`, `estoqueAtual`, `estoqueContadoEmISO`, `categoria` e o nome
 * cadastrado — que ficam de fora deste objeto justamente para não terem como
 * ser sobrescritos. Importar uma nota não pode zerar os 5% de perda da farinha
 * que ela ajustou em março, e ler a nota não é contar a despensa.
 */
export function atualizacaoDaLinha(
  anterior: InsumoParaAtualizar,
  linha: LinhaRascunho,
  fornecedor: string,
): Partial<CadastroDaLinha> {
  return {
    precoCompra: linha.precoCompra,
    quantidadeCompra: linha.quantidadeCompra,
    unidadeCompra: linha.unidadeCompra,
    ...(anterior.marca?.trim() || !linha.marca.trim()
      ? {}
      : { marca: linha.marca.trim() }),
    ...(anterior.fornecedor?.trim() || !fornecedor.trim()
      ? {}
      : { fornecedor: fornecedor.trim() }),
  };
}

// ---------------------------------------------------------------------------
// A compra vira saída no caixa
// ---------------------------------------------------------------------------

/**
 * O que a nota vira em `transacoes`: **um lançamento, e não um por item.**
 *
 * Nove linhas de chocolate no mesmo dia não são nove decisões financeiras: são
 * uma compra. O caixa é lido por dia e por categoria, e uma nota explodida em
 * vinte lançamentos transforma `/financeiro` em extrato bancário. O detalhe por
 * item já está guardado onde ele serve, que é `historicoPrecos` dentro de cada
 * insumo.
 */
export interface LancamentoDaNota {
  descricao: string;
  categoria: CategoriaTransacao;
  /** A soma das linhas **mantidas**, e nunca o total impresso na nota. */
  valor: Centavos;
  dataISO: DataISO;
  /** "" quando o CNPJ não fecha: sem chave não há guarda, e nada trava. */
  notaChave: string;
}

/**
 * `75315333000109-2026-09-02-17620` — CNPJ, dia e o total **impresso**.
 *
 * É a decisão 8 (`DECISOES.md#d52`) pagando: o nome da loja é o campo mais
 * frágil do cabeçalho, e uma chave que dependesse dele falharia exatamente
 * quando a segunda foto saísse um pouco diferente da primeira. Catorze dígitos
 * com verificador saem iguais das duas fotos.
 *
 * O total é o do **papel**, e não a soma das linhas mantidas: na segunda leitura
 * ela pode tirar linhas diferentes, e uma chave que se mexesse com isso não
 * reconheceria a mesma nota. O que a chave identifica é o documento impresso.
 *
 * Sem CNPJ legível não há chave — e sem chave a tela não inventa uma a partir do
 * nome, porque uma chave frágil erra nos dois sentidos: deixa passar a nota
 * repetida e barra a nota nova.
 */
export function chaveDaNota(
  cnpj: string,
  dataISO: DataISO,
  totalImpresso: Centavos,
): string {
  const digitos = digitosDoCnpj(cnpj);
  if (!cnpjValido(digitos) || !FORMATO_ISO.test(dataISO)) return "";

  return `${digitos}-${dataISO}-${totalImpresso}`;
}

/** "Compra no Atacadão", ou "Compra de insumos" quando o nome não sai da nota. */
export function descricaoDaCompra(estabelecimento: string): string {
  const nome = (estabelecimento ?? "").trim();
  return nome ? `Compra no ${nome}` : "Compra de insumos";
}

/**
 * `EMBALAGEM` quando **toda** linha mantida for embalagem; `COMPRA_INSUMO` no
 * resto.
 *
 * A regra de o que é embalagem é a mesma da ficha (`ehEmbalagem`, `#d20`): uma
 * segunda definição aqui seria um segundo lugar para as duas divergirem. Uma
 * compra mista continua sendo compra de insumo, porque é o que ela é na maior
 * parte — e ratear uma nota entre duas categorias exigiria dois lançamentos, que
 * é justamente o que esta sessão decidiu não fazer.
 */
export function categoriaDaCompra(linhas: LinhaRascunho[]): CategoriaTransacao {
  if (linhas.length === 0) return "COMPRA_INSUMO";

  return linhas.every((linha) => ehEmbalagem(linha.categoria))
    ? "EMBALAGEM"
    : "COMPRA_INSUMO";
}

/**
 * O lançamento que a compra vira, dito antes de acontecer.
 *
 * O valor é a soma do que **ficou**: o shampoo de R$ 29,80 não é do negócio, e
 * se o caixa recebesse os R$ 176,20 impressos o sistema estaria dizendo que a
 * confeitaria gastou em shampoo — o "quanto sobra" do mês sairia R$ 29,80 menor
 * por uma compra pessoal.
 */
export function lancamentoDaNota(
  linhas: LinhaRascunho[],
  cabecalho: { estabelecimento: string; cnpj: string; dataISO: DataISO },
  totalImpresso: Centavos,
): LancamentoDaNota {
  return {
    descricao: descricaoDaCompra(cabecalho.estabelecimento),
    categoria: categoriaDaCompra(linhas),
    valor: somarLinhas(linhas),
    dataISO: cabecalho.dataISO,
    notaChave: chaveDaNota(cabecalho.cnpj, cabecalho.dataISO, totalImpresso),
  };
}
