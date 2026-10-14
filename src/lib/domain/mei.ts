import type {
  AntesDoRende,
  AtividadeMei,
  Centavos,
  CompetenciaMensal,
  DataISO,
  GuardadoMei,
  Transacao,
} from "@/lib/types";
import { competenciaVizinha, diasEntre } from "./datas";
import { digitosDoCnpj } from "./notaFiscal";

export type { AtividadeMei };

/**
 * O limite de faturamento anual do MEI (`DECISOES.md#d270`).
 *
 * Conferido em 2026-10-02: R$ 81.000,00, LC 123/2006, art. 18-A, §1º; o
 * proporcional do ano de abertura é R$ 6.750,00 por mês (§2º). O PLP 186/2026,
 * que o sobe para R$ 110.000,00 em 2027, ainda não foi votado. Fonte:
 * https://www.gov.br/empresas-e-negocios/pt-br/empreendedor
 */
export const LIMITE_MEI_ANUAL: Centavos = 8_100_000;
export const LIMITE_MEI_POR_MES: Centavos = LIMITE_MEI_ANUAL / 12;

export interface EscolhasMei {
  atividade: AtividadeMei;
  /** Quanto das vendas do mês saiu com nota. Cortado no total. */
  comNota: Centavos;
}

/** As dez linhas do Relatório Mensal das Receitas Brutas, na ordem do portal. */
export interface RelatorioMei {
  I: Centavos;
  II: Centavos;
  III: Centavos;
  IV: Centavos;
  V: Centavos;
  VI: Centavos;
  VII: Centavos;
  VIII: Centavos;
  IX: Centavos;
  X: Centavos;
  /** Entradas fora de `VENDA`: não são receita, e a tela diz quanto ficou fora. */
  outrasEntradas: Centavos;
  /** Quantas vendas somaram o X: a origem do número (`#d360`). */
  vendasContadas: number;
}

type Lancamento = Pick<Transacao, "tipo" | "categoria" | "valor">;

/**
 * O relatório do mês a partir dos lançamentos dele (`#d269`).
 *
 * Receita bruta é a soma das entradas `VENDA` pelo valor bruto, antes da
 * maquininha. Arquivado não chega: a consulta do mês já o deixa fora.
 * Prestação de serviço (VII a IX) fica sempre zerada: confeitaria vende produto.
 */
export function relatorioMei(
  lancamentos: Lancamento[],
  escolhas: EscolhasMei,
): RelatorioMei {
  let vendas = 0;
  let vendasContadas = 0;
  let outrasEntradas = 0;
  for (const l of lancamentos) {
    if (l.tipo !== "ENTRADA") continue;
    if (l.categoria === "VENDA") {
      vendas += l.valor;
      vendasContadas += 1;
    } else outrasEntradas += l.valor;
  }
  const comNota = Math.min(Math.max(0, escolhas.comNota), vendas);
  const semNota = vendas - comNota;
  const comercio = escolhas.atividade === "COMERCIO";

  return {
    I: comercio ? semNota : 0,
    II: comercio ? comNota : 0,
    III: comercio ? vendas : 0,
    IV: comercio ? 0 : semNota,
    V: comercio ? 0 : comNota,
    VI: comercio ? 0 : vendas,
    VII: 0,
    VIII: 0,
    IX: 0,
    X: vendas,
    outrasEntradas,
    vendasContadas,
  };
}

/** As "entradas de mercadorias" do modelo, entre as saídas (`#d361`). */
const CATEGORIAS_DE_COMPRA: ReadonlySet<Transacao["categoria"]> = new Set([
  "COMPRA_INSUMO",
  "EMBALAGEM",
  "EQUIPAMENTO",
]);

export interface NotaDoMes {
  dataISO: DataISO;
  descricao: string;
  valor: Centavos;
  /** Os 14 primeiros dígitos de `notaChave`, quando houver. */
  cnpj?: string;
  comNota: boolean;
}

export interface NotasDoMes {
  linhas: NotaDoMes[];
  total: Centavos;
  comNota: number;
  semNota: number;
}

/**
 * A lista que vai anexa ao relatório (`#d361`): as compras do mês, por data.
 * Despesa fixa, imposto, entrega e pró-labore ficam fora. Arquivado não chega.
 */
export function notasDoMes(
  lancamentos: Pick<
    Transacao,
    | "tipo"
    | "categoria"
    | "valor"
    | "dataISO"
    | "descricao"
    | "notaChave"
    | "arquivado"
  >[],
): NotasDoMes {
  const linhas = lancamentos
    .filter(
      (l) =>
        l.tipo === "SAIDA" &&
        !l.arquivado &&
        CATEGORIAS_DE_COMPRA.has(l.categoria),
    )
    .map((l): NotaDoMes => {
      const cnpj = l.notaChave?.replace(/\D/g, "").slice(0, 14);
      return {
        dataISO: l.dataISO,
        descricao: l.descricao,
        valor: l.valor,
        ...(cnpj?.length === 14 && { cnpj }),
        comNota: cnpj?.length === 14,
      };
    })
    .sort((a, b) =>
      a.dataISO < b.dataISO ? -1 : a.dataISO > b.dataISO ? 1 : 0,
    );
  const comNota = linhas.filter((l) => l.comNota).length;
  return {
    linhas,
    total: linhas.reduce((soma, l) => soma + l.valor, 0),
    comNota,
    semNota: linhas.length - comNota,
  };
}

/** O relatório de um mês vence no dia 20 do mês seguinte (`#d269`). */
export const DIA_DO_PRAZO = 20;
/** A partir de quantos dias para o 20 a frase ganha o triângulo (`#d360`). */
const DIAS_DE_ATENCAO = 5;

export interface PrazoDoRelatorio {
  /**
   * `aberto`: o mês ainda corre; `vence`: fechado, até o dia 20; `atrasado`:
   * passou do 20 sem guardar; `guardado`: ela guardou e nada mudou depois.
   */
  estado: "aberto" | "vence" | "atrasado" | "guardado";
  /**
   * `aberto`: o dia 1º em que fica pronto; `vence` e `atrasado`: o dia 20;
   * `guardado`: o dia em que ela guardou.
   */
  data: DataISO;
  /** Dias até o dia 20; só conta em `vence`. */
  faltam: number;
  /** `vence` com cinco dias ou menos. */
  atencao: boolean;
}

/**
 * Em que pé está o relatório do mês (`#d360`). Guardado e depois mudado volta
 * ao prazo: o papel guardado não é mais o mês.
 */
export function prazoDoRelatorio(
  competencia: CompetenciaMensal,
  hojeISO: DataISO,
  guardado?: { em: DataISO; mudou: boolean } | null,
): PrazoDoRelatorio {
  if (guardado && !guardado.mudou) {
    return { estado: "guardado", data: guardado.em, faltam: 0, atencao: false };
  }
  const seguinte = competenciaVizinha(competencia, 1);
  if (hojeISO < `${seguinte}-01`) {
    return {
      estado: "aberto",
      data: `${seguinte}-01`,
      faltam: 0,
      atencao: false,
    };
  }
  const prazo = `${seguinte}-${DIA_DO_PRAZO}`;
  const faltam = diasEntre(hojeISO, prazo);
  return faltam >= 0
    ? {
        estado: "vence",
        data: prazo,
        faltam,
        atencao: faltam <= DIAS_DE_ATENCAO,
      }
    : { estado: "atrasado", data: prazo, faltam, atencao: false };
}

/**
 * O papel guardado já não é o mês (`#d360`): o total, o valor com nota ou a
 * atividade mudaram depois. Em centavos, sem tolerância.
 */
export function mudouDepoisDeGuardado(
  guardado: Pick<GuardadoMei, "total" | "comNota" | "atividade">,
  relatorio: RelatorioMei,
  atividade: AtividadeMei,
): boolean {
  return (
    guardado.atividade !== atividade ||
    guardado.total !== relatorio.X ||
    guardado.comNota !== comNotaDoRelatorio(relatorio, atividade)
  );
}

/** O valor com nota que saiu no papel: já cortado no total. */
export function comNotaDoRelatorio(
  relatorio: RelatorioMei,
  atividade: AtividadeMei,
): Centavos {
  return atividade === "COMERCIO" ? relatorio.II : relatorio.V;
}

export type EstadoDoLimite = "dentro" | "perto" | "passou";

export interface LimiteDoAno {
  /** Entradas de janeiro até o mês, de todas as categorias: erra pra cima. */
  entradas: Centavos;
  /** O anual, ou o proporcional quando o MEI abriu neste ano (`#d359`). */
  teto: Centavos;
  /** O MEI abriu neste ano, e o teto é `LIMITE_MEI_POR_MES` por mês desde então. */
  proporcional: boolean;
  /** 0 a 100 e além; só para mostrar. */
  percentual: number;
  /** A média dos meses com agregado vezes doze; `null` com menos de três. */
  ritmo: Centavos | null;
  estado: EstadoDoLimite;
  /**
   * O primeiro mês com entrada, quando é depois de janeiro e da abertura: o
   * que entrou antes de ela lançar no Rende não está na soma (`#d359`).
   */
  desde: CompetenciaMensal | null;
  /** O que ela informou de antes do Rende, quando é deste ano e já está na soma (`#d362`). */
  antes: (AntesDoRende & { de: CompetenciaMensal }) | null;
}

/** `AAAA-MM` com mês de verdade: a abertura digitada à mão passa por aqui. */
export function ehCompetencia(
  valor: string | undefined,
): valor is CompetenciaMensal {
  return !!valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

/** Dois meses vezes doze é chute: o ritmo só aparece a partir de três. */
const MESES_PARA_O_RITMO = 3;

/**
 * Quanto do limite do ano já foi usado (`#d270`), pelos agregados de janeiro
 * até `ate`. Por id, como `noAno`: o `global` fica fora porque 'g' > '2'.
 *
 * Com `abertura` no mesmo ano, o teto é `LIMITE_MEI_POR_MES` vezes os meses
 * de lá até dezembro, o da abertura inteiro (LC 123/2006, art. 18-A, §2º).
 *
 * `antes` (`#d362`) entra inteiro em qualquer mês do ano, mesmo num mês que ele
 * cobre só em parte: erra pra cima, que é o lado seguro. Com ele, `desde` some.
 */
export function limiteDoAno(
  agregados: { id: string; entradas?: Centavos }[],
  ate: CompetenciaMensal,
  abertura?: CompetenciaMensal,
  antesDoAno?: AntesDoRende,
): LimiteDoAno {
  const ano = ate.slice(0, 4);
  const doAno = agregados
    .filter((a) => a.id >= `${ano}-01` && a.id <= ate)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const antes = antesDoAno?.ate.startsWith(ano) ? antesDoAno : null;
  const entradas =
    doAno.reduce((soma, a) => soma + (a.entradas ?? 0), 0) +
    (antes?.valor ?? 0);

  const proporcional = ehCompetencia(abertura) && abertura.startsWith(ano);
  const teto = proporcional
    ? LIMITE_MEI_POR_MES * (13 - Number(abertura.slice(5, 7)))
    : LIMITE_MEI_ANUAL;

  const inicio = proporcional ? abertura : `${ano}-01`;
  const primeiro = doAno.find((a) => (a.entradas ?? 0) > 0)?.id;
  // Os meses que o "antes" cobre contam para o ritmo, e os agregados deles não.
  const meses = antes
    ? doAno.filter((a) => a.id > antes.ate).length +
      Math.max(
        0,
        Number(antes.ate.slice(5, 7)) - Number(inicio.slice(5, 7)) + 1,
      )
    : doAno.length;

  return {
    entradas,
    teto,
    proporcional,
    percentual: (entradas / teto) * 100,
    ritmo:
      meses >= MESES_PARA_O_RITMO ? Math.round((entradas / meses) * 12) : null,
    // Em centavos, e não pelo percentual: 80% de 81 mil é conta exata.
    estado:
      entradas > teto
        ? "passou"
        : entradas * 10 >= teto * 8
          ? "perto"
          : "dentro",
    desde: !antes && primeiro && primeiro > inicio ? primeiro : null,
    antes: antes && { ...antes, de: inicio },
  };
}

/** A DASN-SIMEI do ano vence em 31 de maio do ano seguinte. */
export function prazoDaDeclaracao(ano: string): DataISO {
  return `${Number(ano) + 1}-05-31`;
}

export interface MesDoAno {
  competencia: CompetenciaMensal;
  /** As vendas do mês, como a linha X do relatório. */
  vendas: Centavos;
  prazo: PrazoDoRelatorio;
  /** Guardado e mudado depois: a linha diz, com o triângulo (`#d360`). */
  mudou: boolean;
}

export interface AnoDoMei {
  /** `false` enquanto o ano corre: a tela diz "Até agora" e não mostra o prazo. */
  terminado: boolean;
  /** 31 de maio do ano seguinte. */
  prazo: DataISO;
  /** Os campos da DASN-SIMEI: comércio e indústria somam juntos; serviço é zero. */
  comercioEIndustria: Centavos;
  servicos: Centavos;
  total: Centavos;
  /**
   * A linha "antes do Rende": de `de` a `ate`, com o valor informado ou `null`
   * para pedir. Só quando o primeiro mês com venda é depois de janeiro e da
   * abertura, ou quando ela já informou.
   */
  antes: {
    de: CompetenciaMensal;
    ate: CompetenciaMensal;
    valor: Centavos | null;
  } | null;
  /** Os meses depois do "antes", até dezembro. */
  meses: MesDoAno[];
  /** Nem venda nem "antes" no ano. */
  vazio: boolean;
}

/**
 * O ano do MEI (`#d362`): os doze meses, cada um com o estado do relatório, e
 * os números que a declaração anual pede. As vendas vêm por mês, somadas como
 * o relatório (só `VENDA`, bruto). Os meses que o "antes" cobre saem da lista e
 * da soma: o valor informado toma o lugar deles, sem contar duas vezes.
 */
export function anoDoMei(
  ano: string,
  vendasPorMes: Record<CompetenciaMensal, Centavos>,
  mei: {
    atividade: AtividadeMei;
    abertura?: CompetenciaMensal;
    antes?: Record<string, AntesDoRende>;
    notas?: Record<CompetenciaMensal, Centavos>;
    guardados?: Record<
      CompetenciaMensal,
      Omit<GuardadoMei, "em"> & { em: DataISO }
    >;
  },
  hojeISO: DataISO,
): AnoDoMei {
  const doze = Array.from(
    { length: 12 },
    (_, i): CompetenciaMensal => `${ano}-${String(i + 1).padStart(2, "0")}`,
  );
  const inicio =
    ehCompetencia(mei.abertura) && mei.abertura.startsWith(ano)
      ? mei.abertura
      : `${ano}-01`;
  const primeiro = doze.find((c) => (vendasPorMes[c] ?? 0) > 0);
  const informado = mei.antes?.[ano];
  const antes = informado
    ? { de: inicio, ate: informado.ate, valor: informado.valor }
    : primeiro && primeiro > inicio
      ? { de: inicio, ate: competenciaVizinha(primeiro, -1), valor: null }
      : null;

  const meses = doze
    .filter((c) => !antes || c > antes.ate)
    .map((competencia): MesDoAno => {
      const vendas = vendasPorMes[competencia] ?? 0;
      const guardado = mei.guardados?.[competencia];
      const mudou =
        !!guardado &&
        mudouDepoisDeGuardado(
          guardado,
          relatorioMei(
            [{ tipo: "ENTRADA", categoria: "VENDA", valor: vendas }],
            {
              atividade: mei.atividade,
              comNota: mei.notas?.[competencia] ?? 0,
            },
          ),
          mei.atividade,
        );
      return {
        competencia,
        vendas,
        prazo: prazoDoRelatorio(
          competencia,
          hojeISO,
          guardado && { em: guardado.em, mudou },
        ),
        mudou,
      };
    });

  const comercioEIndustria =
    (antes?.valor ?? 0) + meses.reduce((soma, m) => soma + m.vendas, 0);
  return {
    terminado: hojeISO > `${ano}-12-31`,
    prazo: prazoDaDeclaracao(ano),
    comercioEIndustria,
    servicos: 0,
    total: comercioEIndustria,
    antes,
    meses,
    vazio: !primeiro && !informado,
  };
}

/** Como no CCMEI: a razão social do MEI é o nome dela e o CPF. */
export const NOME_EMPRESARIAL_MAX = 120;

/**
 * A atividade que o CNAE principal sugere (`#d359`): seção C (divisões 10 a
 * 33) é indústria, divisões 45 a 47 são comércio, o resto não sugere. Só o
 * principal: o secundário fica para ela, pelo CCMEI.
 */
export function atividadeDoCnae(codigo: string): AtividadeMei | null {
  const divisao = Number(codigo.replace(/\D/g, "").slice(0, 2) || NaN);
  if (divisao >= 10 && divisao <= 33) return "INDUSTRIA";
  if (divisao >= 45 && divisao <= 47) return "COMERCIO";
  return null;
}

/** O que `/api/mei/cnpj` devolve: no máximo estas três chaves. */
export interface MeiDoCnpj {
  nomeEmpresarial?: string;
  abertura?: CompetenciaMensal;
  atividade?: AtividadeMei;
}

interface RespostaCnpjMei {
  razao_social?: unknown;
  simples?: { data_opcao_mei?: unknown } | null;
  estabelecimento?: {
    data_inicio_atividade?: unknown;
    atividade_principal?: { subclasse?: unknown } | null;
  } | null;
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

/**
 * A resposta de `publica.cnpj.ws` reduzida ao que a folha usa (`#d359`).
 *
 * **Nada além de três chaves atravessa a rota**, como na leitura de nota: a
 * resposta traz endereço, telefone, e-mail e sócios, que não têm o que fazer
 * no navegador. A abertura é a opção pelo MEI, senão o início da atividade;
 * o que não vier, ou vier fora de forma, fica para ela.
 */
export function meiDoCnpj(resposta: unknown): MeiDoCnpj {
  const r = (resposta ?? {}) as RespostaCnpjMei;
  const nome = texto(r.razao_social).trim().slice(0, NOME_EMPRESARIAL_MAX);
  const data =
    texto(r.simples?.data_opcao_mei) ||
    texto(r.estabelecimento?.data_inicio_atividade);
  const abertura = /^(\d{4}-\d{2})-\d{2}/.exec(data)?.[1];
  const atividade = atividadeDoCnae(
    texto(r.estabelecimento?.atividade_principal?.subclasse),
  );
  return {
    ...(nome && { nomeEmpresarial: nome }),
    ...(abertura && { abertura }),
    ...(atividade && { atividade }),
  };
}

/** "12345678000190" → "12.345.678/0001-90", e a máscara parcial enquanto digita. */
export function formatarCnpj(texto: string): string {
  const d = digitosDoCnpj(texto).slice(0, 14);
  return [
    d.slice(0, 2),
    d.length > 2 ? `.${d.slice(2, 5)}` : "",
    d.length > 5 ? `.${d.slice(5, 8)}` : "",
    d.length > 8 ? `/${d.slice(8, 12)}` : "",
    d.length > 12 ? `-${d.slice(12)}` : "",
  ].join("");
}
