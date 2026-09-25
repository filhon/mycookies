import { deleteField, setDoc, Timestamp } from "firebase/firestore";
import { docConfiguracao, docVitrine } from "../colecoes";
import { despachar } from "./despachar";
import type { RateioOperacional } from "@/lib/domain/custoFicha";
import {
  CONFIGURACAO_SUGERIDA,
  parametrosDePreco,
  precificacaoSugerida,
  rateioSugerido,
} from "@/lib/domain/configuracaoSugerida";
import { custoIndiretoPorHora } from "@/lib/domain/custosOperacionais";
import type { ParametrosPreco } from "@/lib/domain/precificacao";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { ConfiguracaoGeral, DadosConfiguracao } from "@/lib/types";

// Moram no domínio e no schema desde a 040 (`DECISOES.md#d186`); reexportados
// para nenhum importador mudar.
export { CONFIGURACAO_SUGERIDA };
export type { DadosConfiguracao };

/**
 * O rateio que uma ficha usa: o salvo, senão o sugerido (`DECISOES.md#d114`).
 *
 * Zero era o que `custoFicha.ts` usava enquanto a conta não salvava nada — e
 * zero também é um número que o sistema inventou, o mesmo erro da planilha
 * dela. A sugestão inteira está mais perto da verdade, e a faixa na tela
 * continua dizendo de onde o número veio.
 */
export function rateioDaConta(
  configuracao: ConfiguracaoGeral | null,
): RateioOperacional {
  return configuracao ? configuracao.operacional : rateioSugerido();
}

/** Método, margem, markup, arredondamento e a maior taxa ativa — salvos, senão sugeridos. */
export function precificacaoPadraoDaConta(
  configuracao: ConfiguracaoGeral | null,
): ParametrosPreco {
  if (!configuracao) return precificacaoSugerida();
  return parametrosDePreco(
    configuracao.precificacao ?? CONFIGURACAO_SUGERIDA.precificacao,
    configuracao.formasPagamento ?? CONFIGURACAO_SUGERIDA.formasPagamento,
  );
}

/**
 * Uma escrita só, no documento único `configuracao/geral`.
 *
 * `merge: true` porque esta tela não é dona do documento inteiro: as categorias
 * de produto e o que os módulos seguintes acrescentarem continuam de pé mesmo
 * que esta versão da tela não os conheça.
 */
export async function salvarConfiguracao(
  contaId: string,
  dados: DadosConfiguracao,
): Promise<void> {
  despachar(
    setDoc(docConfiguracao(contaId), corpoDaConfiguracao(dados), {
      merge: true,
    }),
  );
}

/**
 * O documento que `salvarConfiguracao` grava, com `merge: true`. A biblioteca
 * trazida da calculadora grava o mesmo corpo no lote dela (`#d191`).
 */
export function corpoDaConfiguracao(dados: DadosConfiguracao) {
  const { operacional } = dados;
  return {
    v: VERSAO_SCHEMA,
    ...(dados.nomeNegocio ? { nomeNegocio: dados.nomeNegocio } : {}),
    operacional: {
      ...operacional,
      custoIndiretoPorHora: custoIndiretoPorHora(
        operacional.despesasFixasMensais,
        operacional.horasProdutivasMes,
      ),
    },
    precificacao: dados.precificacao,
    formasPagamento: dados.formasPagamento,
    categoriasProduto: dados.categoriasProduto,
    // Vazio apaga, e não esconde: com `merge`, uma chave ausente deixaria
    // o telefone velho e a assinatura que ela acabou de tirar no documento.
    ...(dados.contato && {
      contato: {
        telefone: dados.contato.telefone?.trim() || deleteField(),
        instagram: dados.contato.instagram?.trim() || deleteField(),
      },
    }),
    assinaturaDataUrl: dados.assinaturaDataUrl || deleteField(),
    frase: dados.frase?.trim() || deleteField(),
    ocultarFeitoCom: dados.ocultarFeitoCom || deleteField(),
    atualizadoEm: Timestamp.now(),
  };
}

/**
 * O cardápio público (spec 031, `DECISOES.md#d159`), gravado no toque (a 015)
 * pelo painel "Seu cardápio". Só a chave dele: o formulário da configuração
 * não o conhece, e o `merge` de `salvarConfiguracao` não o apaga.
 *
 * Pressupõe o documento existindo: numa conta que nunca salvou a
 * configuração, isto criaria um `configuracao/geral` sem `operacional`, e
 * `rateioDaConta` confiaria nele. O painel não oferece o toque nesse caso.
 */
/**
 * A capa, o logo e a cor do cardápio (spec 031, sessão F, `DECISOES.md#d166`),
 * em `configuracao/vitrine`. Um campo por toque, como `salvarCardapio`; `null`
 * tira. `merge` porque cada toque traz um campo só.
 */
export function salvarVitrine(
  contaId: string,
  mudanca: Partial<Record<"capa" | "logo" | "cor", string | null>>,
): void {
  const campos = Object.fromEntries(
    Object.entries(mudanca).map(([campo, valor]) => [
      campo,
      valor ?? deleteField(),
    ]),
  );
  despachar(
    setDoc(
      docVitrine(contaId),
      { ...campos, v: VERSAO_SCHEMA, atualizadoEm: Timestamp.now() },
      { merge: true },
    ),
  );
}

export function salvarCardapio(
  contaId: string,
  cardapio: NonNullable<ConfiguracaoGeral["cardapio"]>,
): void {
  despachar(
    setDoc(
      docConfiguracao(contaId),
      { cardapio, v: VERSAO_SCHEMA, atualizadoEm: Timestamp.now() },
      { merge: true },
    ),
  );
}
