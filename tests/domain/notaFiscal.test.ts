import { describe, expect, it } from "vitest";
import { calcularCustoInsumo } from "@/lib/domain/custoInsumo";
import {
  atualizacaoDaLinha,
  cadastroDaLinha,
  categoriaSugerida,
  centavosDoTexto,
  cnpjValido,
  conferirTotal,
  embalagemDoTexto,
  esquemaNotaLida,
  normalizarNota,
  parearComInsumos,
  somarLinhas,
  type InsumoConhecido,
  type LinhaRascunho,
  type NotaLida,
} from "@/lib/domain/notaFiscal";

/**
 * A nota do caso de aceite da spec 006, exatamente como está impressa:
 *
 *   ATACADAO DIST COM E IND LTDA
 *   CNPJ 75.315.333/0001-09          02/09/2026
 *   1  FARINHA TRIGO DONA BENTA 1KG        UN   1   12,50    12,50
 *   2  CHOCOLATE NOBRE MEIO AMARGO 1,01KG  UN   1   40,00    40,00
 *   3  MANTEIGA AVIACAO C/SAL 500G         UN   2   17,50    35,00
 *   4  CX PAPEL KRAFT 6 DOCES C/25         PCT  1   50,00    50,00
 *   5  SACO CELOFANE 10X15 C/100           PCT  1    8,90     8,90
 *   6  SHAMPOO SEDA 325ML                  UN   2   14,90    29,80
 *                                            TOTAL         176,20
 */
const NOTA: NotaLida = {
  estabelecimento: "ATACADAO DIST COM E IND LTDA",
  cnpj: "75.315.333/0001-09",
  cidade: "",
  dataISO: "2026-09-02",
  total: "176,20",
  linhas: [
    {
      descricao: "FARINHA TRIGO DONA BENTA 1KG",
      nome: "Farinha de trigo",
      marca: "Dona Benta",
      quantidade: "1",
      unidadeTexto: "UN",
      valorUnitario: "12,50",
      valorTotal: "12,50",
    },
    {
      descricao: "CHOCOLATE NOBRE MEIO AMARGO 1,01KG",
      nome: "Chocolate meio amargo",
      marca: "",
      quantidade: "1",
      unidadeTexto: "UN",
      valorUnitario: "40,00",
      valorTotal: "40,00",
    },
    {
      descricao: "MANTEIGA AVIACAO C/SAL 500G",
      nome: "Manteiga com sal",
      marca: "Aviação",
      quantidade: "2",
      unidadeTexto: "UN",
      valorUnitario: "17,50",
      valorTotal: "35,00",
    },
    {
      descricao: "CX PAPEL KRAFT 6 DOCES C/25",
      nome: "Caixa para 6 doces",
      marca: "",
      quantidade: "1",
      unidadeTexto: "PCT",
      valorUnitario: "50,00",
      valorTotal: "50,00",
    },
    {
      descricao: "SACO CELOFANE 10X15 C/100",
      nome: "Saquinho de celofane",
      marca: "",
      quantidade: "1",
      unidadeTexto: "PCT",
      valorUnitario: "8,90",
      valorTotal: "8,90",
    },
    {
      descricao: "SHAMPOO SEDA 325ML",
      nome: "Shampoo",
      marca: "Seda",
      quantidade: "2",
      unidadeTexto: "UN",
      valorUnitario: "14,90",
      valorTotal: "29,80",
    },
  ],
};

/** O custo por unidade base que a linha vai gravar no insumo. */
function custoPorUnidadeBase(linha: LinhaRascunho, perda = 0) {
  return calcularCustoInsumo({
    precoCompra: linha.precoCompra,
    quantidadeCompra: linha.quantidadeCompra,
    unidadeCompra: linha.unidadeCompra,
    perdaPercentual: perda,
  });
}

describe("centavosDoTexto", () => {
  it("lê o valor impresso nas duas notações", () => {
    expect(centavosDoTexto("1.234,56")).toBe(123456);
    expect(centavosDoTexto("1234.56")).toBe(123456);
    expect(centavosDoTexto("12,50")).toBe(1250);
    expect(centavosDoTexto("R$ 8,90")).toBe(890);
  });

  it("sem separador nenhum, o que está impresso são reais", () => {
    expect(centavosDoTexto("50")).toBe(5000);
  });

  it("ponto com três casas é milhar, e vírgula é sempre decimal", () => {
    expect(centavosDoTexto("1.500")).toBe(150000);
    expect(centavosDoTexto("12,500")).toBe(1250);
  });

  it("devolve null quando não é número, e null não é zero", () => {
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("ILEGIVEL")).toBeNull();
    // A distinção existe para o rodapé não sumir com dinheiro: uma linha que
    // não deu para ler não é uma linha de graça.
    expect(centavosDoTexto("0,00")).toBe(0);
  });
});

describe("embalagemDoTexto", () => {
  it("C/<n> vence tudo: é assim que se escreve 'vem 25 dentro'", () => {
    expect(embalagemDoTexto("CX PAPEL KRAFT 6 DOCES C/25", "PCT")).toEqual({
      quantidade: 25,
      unidade: "un",
    });
    expect(embalagemDoTexto("SACO CELOFANE 10X15 C/ 100", "PCT")).toEqual({
      quantidade: 100,
      unidade: "un",
    });
  });

  it("C/SAL não é C/<n>: a manteiga entra pelos 500 g", () => {
    expect(embalagemDoTexto("MANTEIGA AVIACAO C/SAL 500G", "UN")).toEqual({
      quantidade: 500,
      unidade: "g",
    });
  });

  it("lê tamanho com vírgula decimal, e não arredonda para 1 kg", () => {
    expect(
      embalagemDoTexto("CHOCOLATE NOBRE MEIO AMARGO 1,01KG", "UN"),
    ).toEqual({ quantidade: 1.01, unidade: "kg" });
  });

  it("lê as quatro unidades de peso e volume", () => {
    expect(embalagemDoTexto("FARINHA TRIGO DONA BENTA 1KG", "UN")).toEqual({
      quantidade: 1,
      unidade: "kg",
    });
    expect(embalagemDoTexto("SHAMPOO SEDA 325ML", "UN")).toEqual({
      quantidade: 325,
      unidade: "ml",
    });
    expect(embalagemDoTexto("SUCO INTEGRAL 2L", "UN")).toEqual({
      quantidade: 2,
      unidade: "l",
    });
  });

  it("10X15 é dimensão de embalagem, e não quantidade", () => {
    // Se contasse, o saquinho entraria a 10 unidades e o custo unitário sairia
    // dez vezes maior.
    expect(embalagemDoTexto("SACO CELOFANE 10X15", "PCT")).toEqual({
      quantidade: 1,
      unidade: "un",
    });
  });

  it("mas o tamanho colado na dimensão continua valendo", () => {
    expect(embalagemDoTexto("MANTEIGA 2X500G", "UN")).toEqual({
      quantidade: 500,
      unidade: "g",
    });
  });

  it("sem tamanho nenhum, o palpite honesto é uma unidade", () => {
    expect(embalagemDoTexto("PAO FRANCES", "UN")).toEqual({
      quantidade: 1,
      unidade: "un",
    });
  });

  it("item vendido a peso custa o valor unitário por quilo", () => {
    // A coluna de unidade da nota é a última palavra, e só quando ela é peso
    // ou volume: "PCT" e "UN" continuam caindo em `{ 1, un }`.
    expect(embalagemDoTexto("BANANA PRATA", "KG")).toEqual({
      quantidade: 1,
      unidade: "kg",
    });
  });
});

describe("categoriaSugerida", () => {
  it("separa o que não é comida", () => {
    expect(categoriaSugerida("CX PAPEL KRAFT 6 DOCES C/25")).toBe("EMBALAGEM");
    expect(categoriaSugerida("SACO CELOFANE 10X15 C/100")).toBe("EMBALAGEM");
    expect(categoriaSugerida("FITA CETIM 15MM")).toBe("EMBALAGEM");
    expect(categoriaSugerida("ETIQUETA ADESIVA REDONDA")).toBe("ETIQUETA");
    expect(categoriaSugerida("POTE HERMETICO 2L")).toBe("ARMAZENAMENTO");
  });

  it("comida continua sendo ingrediente", () => {
    expect(categoriaSugerida("FARINHA TRIGO DONA BENTA 1KG")).toBe(
      "INGREDIENTE",
    );
    expect(categoriaSugerida("MANTEIGA AVIACAO C/SAL 500G")).toBe(
      "INGREDIENTE",
    );
    // "CX" sozinho ficou fora da tabela de propósito: é assim que o mercado
    // imprime leite e ovo, e a abreviação erraria mais do que acerta.
    expect(categoriaSugerida("LEITE INTEGRAL CX 1L")).toBe("INGREDIENTE");
    expect(categoriaSugerida("OVOS BRANCOS CX C/30")).toBe("INGREDIENTE");
  });
});

describe("cnpjValido", () => {
  it("aceita o CNPJ do caso de aceite", () => {
    expect(cnpjValido("75.315.333/0001-09")).toBe(true);
    expect(cnpjValido("75315333000109")).toBe(true);
  });

  it("recusa o mesmo com o último dígito trocado", () => {
    expect(cnpjValido("75.315.333/0001-08")).toBe(false);
  });

  it("recusa catorze dígitos iguais", () => {
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("recusa qualquer coisa que não tenha catorze dígitos", () => {
    expect(cnpjValido("")).toBe(false);
    expect(cnpjValido("7531533300010")).toBe(false);
    expect(cnpjValido("753153330001099")).toBe(false);
    expect(cnpjValido("ATACADAO")).toBe(false);
  });
});

describe("esquemaNotaLida", () => {
  it("aceita a resposta do modelo e trata campo ausente como vazio", () => {
    const resultado = esquemaNotaLida.safeParse({
      estabelecimento: "PADARIA",
      cnpj: "",
      dataISO: "2026-09-02",
      total: "10,00",
      linhas: [
        {
          descricao: "PAO",
          nome: "Pão",
          quantidade: "1",
          unidadeTexto: "UN",
          valorUnitario: "10,00",
          valorTotal: "10,00",
        },
      ],
    });

    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.linhas[0]?.marca).toBe("");
    expect(resultado.success && resultado.data.cidade).toBe("");
  });

  it("recusa número onde deveria haver texto impresso", () => {
    // É a regra inteira deste módulo: um número que o modelo calculou é um
    // número que ninguém pode auditar.
    const resultado = esquemaNotaLida.safeParse({
      estabelecimento: "PADARIA",
      cnpj: "",
      cidade: "",
      dataISO: "2026-09-02",
      total: "10,00",
      linhas: [
        {
          descricao: "PAO",
          nome: "Pão",
          marca: "",
          quantidade: "1",
          unidadeTexto: "UN",
          valorUnitario: 10,
          valorTotal: "10,00",
        },
      ],
    });

    expect(resultado.success).toBe(false);
  });
});

describe("normalizarNota · o caso de aceite, linha por linha", () => {
  const rascunho = normalizarNota(NOTA);

  it("o cabeçalho prova o verificador", () => {
    expect(rascunho.cnpj).toBe("75315333000109");
    expect(rascunho.dataISO).toBe("2026-09-02");
    expect(rascunho.total).toBe(17620);
  });

  it("sem CNPJ legível, não há chave — e nada mais quebra", () => {
    const torto = normalizarNota({
      ...NOTA,
      cnpj: "75.315.333/0001-08",
      dataISO: "02/09/2026",
    });

    expect(torto.cnpj).toBe("");
    expect(torto.dataISO).toBe("");
    expect(torto.linhas).toHaveLength(6);
    expect(torto.total).toBe(17620);
  });

  it("linha 1 · farinha: 1 kg a R$ 12,50 dá 1,25 centavo por grama", () => {
    const linha = rascunho.linhas[0]!;
    expect(linha.nome).toBe("Farinha de trigo");
    expect(linha.marca).toBe("Dona Benta");
    expect(linha.precoCompra).toBe(1250);
    expect(linha.quantidadeCompra).toBe(1);
    expect(linha.unidadeCompra).toBe("kg");
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).toBe(1.25);
  });

  it("linha 1 · com a perda de 5% preservada, o custo corrigido é 1,3158", () => {
    // É o número que prova a regra de preservação: importar a nota não zera os
    // 5% que ela ajustou em março, então o custo não volta a ser 1,25.
    const corrigido = custoPorUnidadeBase(
      rascunho.linhas[0]!,
      5,
    ).custoUnidadeBaseCorrigido;

    expect(corrigido).toBeCloseTo(1.3158, 4);
    expect(corrigido).not.toBeCloseTo(1.25, 4);
  });

  it("linha 2 · a vírgula decimal: 1,01 kg dá 3,9604 centavos por grama", () => {
    const linha = rascunho.linhas[1]!;
    expect(linha.quantidadeCompra).toBe(1.01);
    expect(linha.unidadeCompra).toBe("kg");
    expect(custoPorUnidadeBase(linha).quantidadeBase).toBeCloseTo(1010, 6);

    // Um leitor que tratasse "1,01KG" como 1 kg erraria 1% em toda receita com
    // chocolate — e 1% de erro invisível em custo é o defeito que este sistema
    // existe para não ter.
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).toBeCloseTo(3.9604, 4);
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).not.toBeCloseTo(4, 4);
  });

  it("linha 3 · preço unitário contra preço de linha", () => {
    const linha = rascunho.linhas[2]!;
    expect(linha.precoCompra).toBe(1750);
    expect(linha.valorTotal).toBe(3500);
    expect(linha.embalagens).toBe(2);
    expect(linha.quantidadeCompra).toBe(500);
    expect(linha.unidadeCompra).toBe("g");
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).toBe(3.5);
  });

  it("linha 4 · C/25 dá R$ 2,00 por caixa", () => {
    const linha = rascunho.linhas[3]!;
    expect(linha.categoria).toBe("EMBALAGEM");
    expect(linha.quantidadeCompra).toBe(25);
    expect(linha.unidadeCompra).toBe("un");
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).toBe(200);
  });

  it("linha 5 · 10X15 não é quantidade; C/100 é", () => {
    const linha = rascunho.linhas[4]!;
    expect(linha.categoria).toBe("EMBALAGEM");
    expect(linha.quantidadeCompra).toBe(100);
    expect(linha.unidadeCompra).toBe("un");
    expect(custoPorUnidadeBase(linha).custoUnidadeBase).toBeCloseTo(8.9, 6);
  });

  it("linha 6 · o shampoo é lido normalmente: quem o tira é ela", () => {
    const linha = rascunho.linhas[5]!;
    expect(linha.valorTotal).toBe(2980);
    expect(linha.precoCompra).toBe(1490);
  });

  it("cada linha guarda a descrição impressa e uma chave própria", () => {
    expect(rascunho.linhas[0]?.descricao).toBe("FARINHA TRIGO DONA BENTA 1KG");
    expect(new Set(rascunho.linhas.map((linha) => linha.chave)).size).toBe(6);
  });

  it("valor unitário ilegível sai do total da linha, e não do nada", () => {
    const rasgada = normalizarNota({
      ...NOTA,
      linhas: [{ ...NOTA.linhas[2]!, valorUnitario: "" }],
    });

    expect(rasgada.linhas[0]?.precoCompra).toBe(1750);
    expect(rasgada.linhas[0]?.valorTotal).toBe(3500);
  });
});

describe("conferirTotal", () => {
  const rascunho = normalizarNota(NOTA);
  const mantidas = rascunho.linhas.slice(0, 5);
  const removidas = rascunho.linhas.slice(5);

  it("o rodapé diz R$ 146,40", () => {
    // 12,50 + 40,00 + 35,00 + 50,00 + 8,90
    expect(somarLinhas(mantidas)).toBe(14640);
  });

  it("os R$ 29,80 que ela tirou explicam a diferença", () => {
    const conferencia = conferirTotal(mantidas, rascunho.total);

    expect(conferencia.soma).toBe(14640);
    expect(conferencia.total).toBe(17620);
    expect(conferencia.diferenca).toBe(2980);
    expect(conferencia.bate).toBe(false);
    expect(somarLinhas(removidas)).toBe(2980);
  });

  it("com a nota inteira, a soma fecha com o impresso", () => {
    expect(conferirTotal(rascunho.linhas, rascunho.total)).toMatchObject({
      soma: 17620,
      diferenca: 0,
      bate: true,
    });
  });

  it("uma linha a menos deixa a diferença de pé", () => {
    const semAManteiga = mantidas.filter((linha) => linha.precoCompra !== 1750);
    expect(conferirTotal(semAManteiga, 14640).diferenca).toBe(3500);
  });
});

describe("parearComInsumos", () => {
  const rascunho = normalizarNota(NOTA);
  const cadastrados: InsumoConhecido[] = [
    {
      id: "farinha",
      nome: "Farinha de trigo",
      nomeBusca: "farinha de trigo",
      precoCompra: 1190,
    },
  ];

  it("a linha 1 não cria uma segunda farinha", () => {
    const pares = parearComInsumos(rascunho.linhas, cadastrados);
    const par = pares.get(rascunho.linhas[0]!.chave);

    expect(par?.insumoId).toBe("farinha");
    expect(par?.nome).toBe("Farinha de trigo");
    // "era R$ 11,90": o histórico de preço funcionando à vista.
    expect(par?.precoAnterior).toBe(1190);
  });

  it("o resto da nota nasce novo", () => {
    const pares = parearComInsumos(rascunho.linhas, cadastrados);
    expect(pares.size).toBe(1);
    expect(pares.get(rascunho.linhas[1]!.chave)).toBeUndefined();
  });

  it("casa por prefixo, em palavra inteira", () => {
    const linha = { ...rascunho.linhas[1]!, nome: "Chocolate" };
    const pares = parearComInsumos(
      [linha],
      [
        {
          id: "po",
          nome: "Chocolate em pó",
          nomeBusca: "chocolate em po",
          precoCompra: 900,
        },
        {
          id: "ada",
          nome: "Chocolatada",
          nomeBusca: "chocolatada",
          precoCompra: 700,
        },
      ],
    );

    expect(pares.get(linha.chave)?.insumoId).toBe("po");
  });

  it("entre dois prefixos, vence o nome mais próximo", () => {
    const linha = { ...rascunho.linhas[0]!, nome: "Farinha de trigo" };
    const pares = parearComInsumos(linha ? [linha] : [], [
      { id: "curto", nome: "Farinha", nomeBusca: "farinha", precoCompra: 1000 },
      {
        id: "perto",
        nome: "Farinha de trigo branca",
        nomeBusca: "farinha de trigo branca",
        precoCompra: 1300,
      },
    ]);

    expect(pares.get(linha.chave)?.insumoId).toBe("perto");
  });

  it("nome exato vence prefixo, mesmo com um prefixo mais curto na frente", () => {
    const linha = rascunho.linhas[0]!;
    const pares = parearComInsumos(
      [linha],
      [
        {
          id: "curto",
          nome: "Farinha",
          nomeBusca: "farinha",
          precoCompra: 1000,
        },
        ...cadastrados,
      ],
    );

    expect(pares.get(linha.chave)?.insumoId).toBe("farinha");
  });

  it("corrigir o nome na tela é o que desfaz um pareamento errado", () => {
    const linha = { ...rascunho.linhas[0]!, nome: "Farinha de rosca" };
    expect(parearComInsumos([linha], cadastrados).size).toBe(0);
  });
});

describe("o que a gravação preserva", () => {
  const rascunho = normalizarNota(NOTA);

  it("insumo novo nasce completo, e com perda zero", () => {
    const dados = cadastroDaLinha(rascunho.linhas[3]!, "Atacadão");

    expect(dados).toEqual({
      nome: "Caixa para 6 doces",
      categoria: "EMBALAGEM",
      fornecedor: "Atacadão",
      precoCompra: 5000,
      quantidadeCompra: 25,
      unidadeCompra: "un",
      perdaPercentual: 0,
    });
  });

  it("a nota traz preço; ela não traz o que você configurou", () => {
    const mudanca = atualizacaoDaLinha(
      { marca: "Dona Benta", fornecedor: "Mercado da esquina" },
      rascunho.linhas[0]!,
      "Atacadão",
    );

    expect(mudanca).toEqual({
      precoCompra: 1250,
      quantidadeCompra: 1,
      unidadeCompra: "kg",
    });

    // Nada de perda, estoque, categoria ou nome: o que não está aqui não tem
    // como ser sobrescrito.
    expect(mudanca).not.toHaveProperty("perdaPercentual");
    expect(mudanca).not.toHaveProperty("categoria");
    expect(mudanca).not.toHaveProperty("nome");
    expect(mudanca).not.toHaveProperty("estoqueAtual");
  });

  it("marca e fornecedor entram só quando estavam vazios", () => {
    const mudanca = atualizacaoDaLinha({}, rascunho.linhas[0]!, "Atacadão");

    expect(mudanca.marca).toBe("Dona Benta");
    expect(mudanca.fornecedor).toBe("Atacadão");
  });

  it("marca vazia na nota não apaga a que já estava lá", () => {
    const mudanca = atualizacaoDaLinha({}, rascunho.linhas[1]!, "");

    expect(mudanca).not.toHaveProperty("marca");
    expect(mudanca).not.toHaveProperty("fornecedor");
  });
});
