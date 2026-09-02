import { describe, expect, it } from "vitest";
import { deltaDaTransacao, type TransacaoAgregavel } from "@/lib/domain/caixa";
import {
  esforcoRestante,
  espelhoDaMeta,
  medirMeta,
  planejarMeta,
  posicaoNoMes,
  precoMedioDasFichas,
  ritmoDoEspelho,
  type EspelhoMeta,
  type ParametrosMeta,
} from "@/lib/domain/metas";

// ---------------------------------------------------------------------------
// O caso de aceite da spec 004, sessão 4B, número por número.
//
// Meta de 2026-09: alvo R$ 3.000,00 e preço médio unitário R$ 6,90 — o preço
// da ficha do caso de aceite da spec 002.
// ---------------------------------------------------------------------------

const META: ParametrosMeta = {
  competencia: "2026-09",
  faturamentoAlvo: 300000,
  precoMedioUnitario: 690,
};

/** Dia 12 de setembro, no fuso do aparelho — nunca em UTC (`#d26`). */
const DIA_12 = new Date(2026, 8, 12, 14, 30);

describe("planejarMeta · quantos doces a meta pede", () => {
  const plano = planejarMeta(META);

  it("converte o alvo em doces pelo preço médio", () => {
    // ceil(300000 ÷ 690) = 435.
    expect(plano.unidadesNecessarias).toBe(435);
  });

  it("conta as semanas do mês em fração, e não em semanas cheias", () => {
    // 30 ÷ 7. Arredondar para 5 espalharia a meta por uma semana que não
    // existe e a faria parecer mais fácil do que é.
    expect(plano.diasNoMes).toBe(30);
    expect(plano.semanasNoMes).toBeCloseTo(4.286, 3);
  });

  it("entrega o número que ela persegue: doces por semana", () => {
    // ceil(435 ÷ 4,286) = 102.
    expect(plano.unidadesPorSemana).toBe(102);
    expect(plano.motivo).toBeNull();
  });
});

describe("medirMeta · no dia 12, com R$ 1.200,00 realizados", () => {
  const medida = medirMeta(META, 120000, DIA_12);

  it("mede o progresso em cima do alvo", () => {
    // 120000 ÷ 300000 × 100.
    expect(medida.progresso).toBe(40);
    expect(medida.faltaEmDinheiro).toBe(180000);
  });

  it("diz quantos doces ainda faltam", () => {
    // ceil(180000 ÷ 690) = 261.
    expect(medida.unidadesRestantes).toBe(261);
  });

  it("conta o dia de hoje como dia que ainda dá para vender", () => {
    // 30 − 12 + 1 = 19.
    expect(medida.diasRestantes).toBe(19);
  });

  it("reparte o que falta pelas semanas que sobraram", () => {
    // ceil(261 ÷ (19 ÷ 7)) = 97.
    expect(medida.unidadesPorSemanaRestante).toBe(97);
  });

  it("compara o realizado com o alvo rateado pelos dias corridos", () => {
    // 120000 >= 300000 × 12 ÷ 30.
    expect(medida.noRitmo).toBe(true);
    expect(medirMeta(META, 119999, DIA_12).noRitmo).toBe(false);
  });

  it("não declara batida uma meta que ainda não foi batida", () => {
    expect(medida.batida).toBe(false);
    expect(medirMeta(META, 300000, DIA_12).batida).toBe(true);
  });

  it("para de contar o que falta depois que a meta é ultrapassada", () => {
    const passou = medirMeta(META, 350000, DIA_12);

    expect(passou.faltaEmDinheiro).toBe(0);
    expect(passou.unidadesRestantes).toBe(0);
    expect(passou.unidadesPorSemanaRestante).toBe(0);
    expect(passou.progresso).toBeCloseTo(116.67, 2);
  });
});

describe("guardas: zero e uma frase, nunca NaN nem Infinity", () => {
  const semAlvo = { ...META, faturamentoAlvo: 0 };
  const semPreco = { ...META, precoMedioUnitario: 0 };

  it("alvo zero não vira divisão por zero", () => {
    expect(planejarMeta(semAlvo)).toMatchObject({
      unidadesNecessarias: 0,
      unidadesPorSemana: 0,
      motivo: "ALVO_ZERO",
    });

    const medida = medirMeta(semAlvo, 120000, DIA_12);
    expect(medida.progresso).toBe(0);
    expect(medida.unidadesRestantes).toBe(0);
    expect(medida.batida).toBe(false);
    expect(medida.motivo).toBe("ALVO_ZERO");
  });

  it("conta sem ficha nenhuma não tem preço médio, e diz isso", () => {
    expect(precoMedioDasFichas([])).toBe(0);
    expect(planejarMeta(semPreco)).toMatchObject({
      unidadesNecessarias: 0,
      unidadesPorSemana: 0,
      motivo: "SEM_PRECO_MEDIO",
    });
  });

  it("sem preço médio o dinheiro continua medido, só os doces somem", () => {
    // O progresso em reais não depende do preço de um doce: escondê-lo seria
    // perder informação que a usuária tem.
    const medida = medirMeta(semPreco, 120000, DIA_12);

    expect(medida.progresso).toBe(40);
    expect(medida.unidadesRestantes).toBe(0);
    expect(medida.unidadesPorSemanaRestante).toBe(0);
    expect(medida.motivo).toBe("SEM_PRECO_MEDIO");
  });

  it("nenhum número sai como NaN ou Infinity, em nenhuma combinação", () => {
    for (const parametros of [semAlvo, semPreco, { ...semAlvo, ...semPreco }]) {
      const medida = medirMeta(parametros, 0, DIA_12);
      for (const valor of Object.values(medida)) {
        if (typeof valor === "number")
          expect(Number.isFinite(valor)).toBe(true);
      }
    }
  });
});

describe("posicaoNoMes", () => {
  it("no mês corrente, conta o dia de hoje dos dois lados", () => {
    expect(posicaoNoMes("2026-09", DIA_12)).toEqual({
      diaAtual: 12,
      diasNoMes: 30,
      diasRestantes: 19,
    });
  });

  it("no último dia do mês ainda resta o próprio dia", () => {
    expect(posicaoNoMes("2026-09", new Date(2026, 8, 30)).diasRestantes).toBe(
      1,
    );
  });

  it("mês fechado não tem dia pela frente", () => {
    // Olhar a meta de agosto em setembro: ela não tem mais prazo, e o ritmo
    // passa a ser medido contra o mês inteiro.
    expect(posicaoNoMes("2026-08", DIA_12)).toEqual({
      diaAtual: 31,
      diasNoMes: 31,
      diasRestantes: 0,
    });
  });

  it("mês que ainda não começou tem o mês inteiro pela frente", () => {
    expect(posicaoNoMes("2026-10", DIA_12)).toEqual({
      diaAtual: 0,
      diasNoMes: 31,
      diasRestantes: 31,
    });
  });

  it("mês fechado não divide por zero ao repartir o que faltou", () => {
    const medida = medirMeta(
      { ...META, competencia: "2026-08" },
      120000,
      DIA_12,
    );

    expect(medida.diasRestantes).toBe(0);
    expect(medida.unidadesPorSemanaRestante).toBe(0);
    expect(medida.unidadesRestantes).toBe(261);
    expect(medida.noRitmo).toBe(false);
  });
});

describe("ritmoDoEspelho · o espelho refeito com o dia de hoje", () => {
  const espelho: EspelhoMeta = espelhoDaMeta(medirMeta(META, 120000, DIA_12));

  it("guarda no agregado exatamente os seis campos do espelho", () => {
    expect(Object.keys(espelho).sort()).toEqual([
      "faturamentoAlvo",
      "noRitmo",
      "progresso",
      "realizado",
      "unidadesPorSemanaRestante",
      "unidadesRestantes",
    ]);
  });

  it("no mesmo dia, devolve o que foi gravado", () => {
    const ritmo = ritmoDoEspelho(espelho, "2026-09", DIA_12);

    expect(ritmo.unidadesPorSemanaRestante).toBe(
      espelho.unidadesPorSemanaRestante,
    );
    expect(ritmo.noRitmo).toBe(espelho.noRitmo);
  });

  it("dias depois, sem venda nova, o esforço por semana sobe", () => {
    // O dinheiro não mudou, então o espelho não foi reescrito. O que mudou foi
    // o calendário: ceil(261 ÷ (6 ÷ 7)) = 305.
    const ritmo = ritmoDoEspelho(espelho, "2026-09", new Date(2026, 8, 25));

    expect(ritmo.diasRestantes).toBe(6);
    expect(ritmo.unidadesPorSemanaRestante).toBe(305);
    expect(ritmo.noRitmo).toBe(false);
  });

  it("reconhece a meta batida pelo dinheiro do próprio espelho", () => {
    const batida = espelhoDaMeta(medirMeta(META, 300000, DIA_12));

    expect(ritmoDoEspelho(batida, "2026-09", DIA_12).batida).toBe(true);
    expect(ritmoDoEspelho(espelho, "2026-09", DIA_12).batida).toBe(false);
  });
});

describe("o espelho anda junto com o dinheiro", () => {
  // `realizado` é `entradas`, e é a mesma verdade guardada duas vezes: o que
  // move uma precisa mover a outra. Aqui o delta do caixa alimenta a meta pelo
  // mesmo caminho que a mutação usa.
  const venda = (valor: number): TransacaoAgregavel => ({
    tipo: "ENTRADA",
    categoria: "VENDA",
    valor,
    dataISO: "2026-09-03",
    custoTaxa: 0,
  });

  it("lançar uma venda move o progresso", () => {
    const delta = deltaDaTransacao(venda(120000), 1);
    const espelho = espelhoDaMeta(medirMeta(META, 0 + delta.entradas, DIA_12));

    expect(espelho.realizado).toBe(120000);
    expect(espelho.progresso).toBe(40);
    expect(espelho.unidadesRestantes).toBe(261);
  });

  it("editar é reverter mais aplicar, também na meta", () => {
    const delta =
      deltaDaTransacao(venda(120000), -1).entradas +
      deltaDaTransacao(venda(150000), 1).entradas;
    const espelho = espelhoDaMeta(medirMeta(META, 120000 + delta, DIA_12));

    expect(espelho.realizado).toBe(150000);
    expect(espelho.progresso).toBe(50);
  });

  it("arquivar devolve a meta ao ponto de antes do lançamento", () => {
    const delta = deltaDaTransacao(venda(150000), -1);
    const espelho = espelhoDaMeta(
      medirMeta(META, 150000 + delta.entradas, DIA_12),
    );

    expect(espelho.realizado).toBe(0);
    expect(espelho.progresso).toBe(0);
    expect(espelho.unidadesRestantes).toBe(435);
    expect(espelho.noRitmo).toBe(false);
  });

  it("saída não mexe na meta: meta é de faturamento, não de sobra", () => {
    const delta = deltaDaTransacao(
      {
        tipo: "SAIDA",
        categoria: "COMPRA_INSUMO",
        valor: 9000,
        dataISO: "2026-09-05",
        custoTaxa: 0,
      },
      1,
    );

    expect(delta.entradas).toBe(0);
    expect(medirMeta(META, 120000 + delta.entradas, DIA_12).progresso).toBe(40);
  });
});

describe("esforcoRestante · o número no prazo em que ele quer dizer algo", () => {
  it("fala em semana enquanto ainda existe uma semana inteira", () => {
    const medida = medirMeta(META, 120000, DIA_12);

    expect(
      esforcoRestante(
        medida.unidadesRestantes,
        medida.unidadesPorSemanaRestante,
        medida.diasRestantes,
      ),
    ).toEqual({ unidades: 97, prazo: "SEMANA" });
  });

  it("na última semana, fala do que falta até o fim do mês", () => {
    // No dia 29 restam dois dias: "914 doces por semana" é conta certa e
    // informação inútil.
    const medida = medirMeta(META, 120000, new Date(2026, 8, 29));

    expect(medida.diasRestantes).toBe(2);
    expect(
      esforcoRestante(
        medida.unidadesRestantes,
        medida.unidadesPorSemanaRestante,
        medida.diasRestantes,
      ),
    ).toEqual({ unidades: 261, prazo: "FIM_DO_MES" });
  });

  it("na virada dos sete dias, ainda é semana", () => {
    expect(esforcoRestante(261, 97, 7).prazo).toBe("SEMANA");
    expect(esforcoRestante(261, 97, 6).prazo).toBe("FIM_DO_MES");
  });
});

describe("precoMedioDasFichas", () => {
  function ficha(precoVenda: number, ativo = true) {
    return { ativo, precificacao: { precoVenda } };
  }

  it("tira a média dos preços das fichas ativas", () => {
    // (690 + 1200 + 450) ÷ 3 = 780.
    expect(precoMedioDasFichas([ficha(690), ficha(1200), ficha(450)])).toBe(
      780,
    );
  });

  it("arredonda para centavo inteiro", () => {
    // (690 + 451) ÷ 2 = 570,5.
    expect(precoMedioDasFichas([ficha(690), ficha(451)])).toBe(571);
  });

  it("ignora ficha inativa e ficha ainda sem preço", () => {
    // Contar preço zero puxaria a média para baixo e inflaria a quantidade de
    // doces da meta: ficha sem preço é ficha que ela ainda não precificou.
    expect(
      precoMedioDasFichas([ficha(690), ficha(0), ficha(1200, false)]),
    ).toBe(690);
  });

  it("devolve zero quando não sobra ficha nenhuma", () => {
    expect(precoMedioDasFichas([ficha(0), ficha(500, false)])).toBe(0);
  });
});
