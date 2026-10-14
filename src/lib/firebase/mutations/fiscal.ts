import { deleteField, setDoc, Timestamp } from "firebase/firestore";
import { docMei } from "../colecoes";
import { despachar } from "./despachar";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  AtividadeMei,
  Centavos,
  CompetenciaMensal,
  DadosMei,
  GuardadoMei,
} from "@/lib/types";

export interface MudancaMei {
  /** Sempre: é a que a tela mostra, e o documento nunca nasce sem ela. */
  atividade: AtividadeMei;
  /** `null` tira. */
  cnpj?: string | null;
  nomeEmpresarial?: string | null;
  abertura?: CompetenciaMensal | null;
  /** Só os meses que mudaram: o `merge` funde o mapa chave a chave. */
  notas?: Record<CompetenciaMensal, Centavos>;
}

/**
 * O MEI dela, em `fiscal/mei` (`DECISOES.md#d359`): um campo por toque, como
 * `salvarVitrine`, com `merge`. Quem chama já conferiu o CNPJ com `cnpjValido`
 * e a abertura com `ehCompetencia`.
 */
export function salvarMei(contaId: string, mudanca: MudancaMei): void {
  const corpo: Record<string, unknown> = {
    v: VERSAO_SCHEMA,
    atualizadoEm: Timestamp.now(),
  };
  for (const [campo, valor] of Object.entries(mudanca)) {
    if (valor !== undefined) corpo[campo] = valor ?? deleteField();
  }
  despachar(
    setDoc(docMei(contaId), corpo as Partial<DadosMei>, { merge: true }),
  );
}

/**
 * "Já imprimi e guardei" (`DECISOES.md#d360`): o retrato do papel em
 * `guardados[competencia]`. Regravar troca o retrato; `null` tira, que é o
 * "Desfazer" de um mês que não estava guardado.
 */
export function guardarRelatorioMei(
  contaId: string,
  atividade: AtividadeMei,
  competencia: CompetenciaMensal,
  retrato: GuardadoMei | null,
): void {
  despachar(
    setDoc(
      docMei(contaId),
      {
        v: VERSAO_SCHEMA,
        atualizadoEm: Timestamp.now(),
        atividade,
        guardados: { [competencia]: retrato ?? deleteField() },
      } as Partial<DadosMei>,
      { merge: true },
    ),
  );
}
