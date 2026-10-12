import { describe, expect, it } from "vitest";
import {
  escalarItens,
  mencoesNoPasso,
  passosDoPreparo,
  preparoNaBancada,
  relogio,
  rotuloDoTempo,
  tempoNoPasso,
  temQuantidadeEscrita,
} from "@/lib/domain/preparo";

describe("passosDoPreparo", () => {
  it("uma linha é um passo, e a linha em branco some", () => {
    expect(
      passosDoPreparo(
        "Bata a manteiga com os açúcares até clarear.\n\n  Junte o ovo.  \n\t\nAsse a 180 °C por 12 minutos.\n",
      ),
    ).toEqual([
      "Bata a manteiga com os açúcares até clarear.",
      "Junte o ovo.",
      "Asse a 180 °C por 12 minutos.",
    ]);
  });

  it("o texto colado do Windows não deixa \\r no passo", () => {
    expect(passosDoPreparo("Bata.\r\nAsse.\r\n")).toEqual(["Bata.", "Asse."]);
  });

  it("vazio, só espaço ou ausente não tem passo", () => {
    expect(passosDoPreparo("")).toEqual([]);
    expect(passosDoPreparo(" \n \n")).toEqual([]);
    expect(passosDoPreparo(undefined)).toEqual([]);
  });
});

describe("escalarItens", () => {
  const farinha = { quantidade: 560, unidadeBase: "g" as const };
  const ovos = (quantidade: number) => ({
    quantidade,
    unidadeBase: "un" as const,
  });

  it("multiplica e fica em gramas: 1.120 g não vira 1,12 kg", () => {
    expect(escalarItens([farinha], 2)[0]).toMatchObject({
      quantidade: 1120,
      rotulo: "1.120 g",
    });
    expect(escalarItens([farinha], 0.5)[0]?.rotulo).toBe("280 g");
    expect(escalarItens([farinha], 1)[0]?.rotulo).toBe("560 g");
  });

  it("ovo vai de meio em meio, sem o 'un' (#d347)", () => {
    expect(escalarItens([ovos(2)], 2)[0]?.rotulo).toBe("4");
    expect(escalarItens([ovos(2)], 0.5)[0]?.rotulo).toBe("1");
    expect(escalarItens([ovos(3)], 0.5)[0]?.rotulo).toBe("1 ½");
    expect(escalarItens([ovos(1)], 0.5)[0]?.rotulo).toBe("½");
  });

  it("grama e ml inteiros; abaixo de 10, uma casa; nunca zero", () => {
    const item = (quantidade: number) => ({
      quantidade,
      unidadeBase: "ml" as const,
    });
    expect(escalarItens([item(125)], 0.5)[0]?.rotulo).toBe("63 ml");
    expect(escalarItens([item(3)], 0.5)[0]?.rotulo).toBe("1,5 ml");
    expect(escalarItens([item(2.5)], 1)[0]?.rotulo).toBe("2,5 ml");
    expect(escalarItens([item(0.1)], 0.5)[0]?.quantidade).toBe(0.1);
    expect(escalarItens([ovos(0.2)], 1)[0]?.quantidade).toBe(0.5);
  });

  it("mantém o resto do item", () => {
    const [linha] = escalarItens(
      [{ ...farinha, insumoId: "f", nomeSnapshot: "Farinha" }],
      3,
    );
    expect(linha).toMatchObject({ insumoId: "f", quantidade: 1680 });
  });
});

describe("mencoesNoPasso (#d350)", () => {
  const ingredientes = [
    { nomeSnapshot: "Manteiga", rotulo: "240 g" },
    { nomeSnapshot: "Açúcar cristal", rotulo: "200 g" },
    { nomeSnapshot: "Açúcar mascavo", rotulo: "160 g" },
    { nomeSnapshot: "Ovo", rotulo: "2" },
    { nomeSnapshot: "Farinha de trigo", rotulo: "1.120 g" },
    { nomeSnapshot: "Chocolate", rotulo: "100 g" },
    { nomeSnapshot: "Chocolate branco", rotulo: "50 g" },
  ];
  const ler = (passo: string) =>
    mencoesNoPasso(passo, ingredientes)
      .map((p) => (p.rotulo ? `${p.texto} [${p.rotulo}]` : p.texto))
      .join("");

  it("a primeira palavra casa; os dois açúcares, não", () => {
    expect(ler("Bata a manteiga com os açúcares")).toBe(
      "Bata a manteiga [240 g] com os açúcares",
    );
    expect(ler("Junte o açúcar e mexa")).toBe("Junte o açúcar e mexa");
    expect(ler("Junte o Açúcar Mascavo.")).toBe(
      "Junte o Açúcar Mascavo [160 g].",
    );
  });

  it("o plural de ovo, e só a palavra inteira", () => {
    expect(ler("Junte os ovos")).toBe("Junte os ovos [2]");
    expect(ler("Junte o ovo, um ovo por vez")).toBe(
      "Junte o ovo [2], um ovo por vez",
    );
    expect(ler("Formato ovoide")).toBe("Formato ovoide");
  });

  it("o nome inteiro antes da palavra, e o mais longo antes do curto", () => {
    expect(ler("Adicione a farinha de trigo")).toBe(
      "Adicione a farinha de trigo [1.120 g]",
    );
    expect(ler("Adicione a farinha aos poucos")).toBe(
      "Adicione a farinha [1.120 g] aos poucos",
    );
    expect(ler("Derreta o chocolate branco")).toBe(
      "Derreta o chocolate branco [50 g]",
    );
    expect(ler("Derreta o chocolate e o chocolate branco")).toBe(
      "Derreta o chocolate [100 g] e o chocolate branco [50 g]",
    );
  });

  it("sem menção, um pedaço só", () => {
    expect(mencoesNoPasso("Asse a 180 graus", ingredientes)).toEqual([
      { texto: "Asse a 180 graus" },
    ]);
  });
});

describe("temQuantidadeEscrita (#d350)", () => {
  it("número com unidade é quantidade de uma fornada", () => {
    for (const passo of [
      "junte 560 g de farinha",
      "1 kg de açúcar",
      "200ml de leite",
      "2 xícaras de farinha",
      "1 colher de fermento",
      "½ xícara de óleo",
      "1,5 L de água",
    ])
      expect(temQuantidadeEscrita(passo), passo).toBe(true);
  });

  it("temperatura, tempo e contagem, não", () => {
    for (const passo of [
      "Asse a 180 graus",
      "Asse a 180 °C por 12 minutos",
      "Junte os 2 ovos",
      "Bata a manteiga",
    ])
      expect(temQuantidadeEscrita(passo), passo).toBe(false);
  });
});

describe("tempoNoPasso (#d351)", () => {
  it("minutos, horas e segundos, com e sem espaço", () => {
    const casos: [string, number][] = [
      ["Asse por 12 minutos.", 720],
      ["Asse por 12 min", 720],
      ["asse 12min", 720],
      ["Leve à geladeira por 1 hora", 3600],
      ["Descanse 2 horas", 7200],
      ["Asse por 1h30", 5400],
      ["Asse por 1h30min", 5400],
      ["Asse por 1 hora e 30 minutos", 5400],
      ["Micro-ondas por 30 segundos", 30],
      ["Micro-ondas por 30s", 30],
      ["Deixe descansar por meia hora", 1800],
      ["Asse por 1,5 hora", 5400],
    ];
    for (const [passo, segundos] of casos)
      expect(tempoNoPasso(passo), passo).toBe(segundos);
  });

  it("faixa vale o menor", () => {
    expect(tempoNoPasso("Asse de 10 a 12 minutos")).toBe(600);
    expect(tempoNoPasso("Asse 12-10 min")).toBe(600);
    expect(tempoNoPasso("Asse até dourar, 15 ou 18 minutos")).toBe(900);
  });

  it("o primeiro tempo, e o que não é tempo não casa", () => {
    expect(tempoNoPasso("Asse a 180 °C por 12 minutos")).toBe(720);
    expect(tempoNoPasso("Bata 3 minutos e descanse 30 minutos")).toBe(180);
    expect(tempoNoPasso("Junte 2 a 3 ovos e bata 5 minutos")).toBe(300);
    expect(tempoNoPasso("Descanse 1 hora 2 ovos")).toBe(3600);
    for (const passo of ["Asse a 180 graus", "Junte 560 g", "Bata a manteiga"])
      expect(tempoNoPasso(passo), passo).toBeNull();
  });
});

describe("rotuloDoTempo e relogio (#d351)", () => {
  it("o botão diz o tempo como se escreve", () => {
    expect(rotuloDoTempo(720)).toBe("12 min");
    expect(rotuloDoTempo(5400)).toBe("1h30");
    expect(rotuloDoTempo(3600)).toBe("1 h");
    expect(rotuloDoTempo(90)).toBe("1 min 30 s");
    expect(rotuloDoTempo(30)).toBe("30 s");
  });

  it("o relógio conta para baixo e para no zero", () => {
    expect(relogio(702)).toBe("11:42");
    expect(relogio(701.2)).toBe("11:42");
    expect(relogio(5)).toBe("0:05");
    expect(relogio(3725)).toBe("1:02:05");
    expect(relogio(-3)).toBe("0:00");
  });
});

describe("preparoNaBancada (#d349)", () => {
  // Recheio de 1.000 g: 320 g de Nutella, 500 g de creme, 180 g de leite em pó.
  const recheio = {
    rendimento: 1000,
    itens: [
      { insumoId: "nutella", quantidade: 320, unidadeBase: "g" as const },
      { insumoId: "creme", quantidade: 500, unidadeBase: "g" as const },
      { insumoId: "leite", quantidade: 180, unidadeBase: "g" as const },
    ],
  };
  const gramas = (r: ReturnType<typeof preparoNaBancada>) =>
    r.ingredientes.map((item) => item.quantidade);

  it("sem pote, os de dentro saem em 320 g de 1.000 g", () => {
    const sem = preparoNaBancada(recheio, 320, undefined);
    expect(sem).toMatchObject({ pote: null, resto: 320 });
    expect(gramas(sem)).toEqual([102, 160, 58]);
  });

  it("duas fornadas dobram os de dentro", () => {
    expect(gramas(preparoNaBancada(recheio, 640, undefined))).toEqual([
      205, 320, 115,
    ]);
  });

  it("pote contado em zero é fiz junto", () => {
    expect(preparoNaBancada(recheio, 320, 0)).toMatchObject({
      pote: null,
      resto: 320,
    });
  });

  it("pote que dá: nada sai, e a lista é a dos 320 g para o fiz junto", () => {
    const da = preparoNaBancada(recheio, 320, 1000);
    expect(da).toMatchObject({ pote: 1000, resto: 0 });
    expect(gramas(da)).toEqual([102, 160, 58]);
  });

  it("pote que não dá: a lista é a do resto", () => {
    const naoDa = preparoNaBancada(recheio, 320, 200);
    expect(naoDa).toMatchObject({ pote: 200, resto: 120 });
    expect(gramas(naoDa)).toEqual([38, 60, 22]);
  });
});
