"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { query, where } from "firebase/firestore";
import { Wand2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { CampoMoeda } from "@/components/ui/CampoMoeda";
import { Painel } from "@/components/ui/Painel";
import { rotuloMes } from "@/lib/domain/datas";
import { planejarMeta, precoMedioDasFichas } from "@/lib/domain/metas";
import { formatarMoeda } from "@/lib/domain/money";
import { errosPorCampo, esquemaMeta } from "@/lib/domain/schemas";
import { colFichas } from "@/lib/firebase/colecoes";
import { salvarMeta } from "@/lib/firebase/mutations/metas";
import { useColecao } from "@/lib/hooks/useColecao";
import type {
  Centavos,
  CompetenciaMensal,
  FichaTecnica,
  Meta,
} from "@/lib/types";

/**
 * Onde a meta do mês é definida: dois números, e o segundo já vem preenchido.
 *
 * O preço médio de um doce é a média das fichas ativas, sugerida e editável.
 * Não há histórico de venda para tirar ticket médio de verdade enquanto o
 * módulo de pedidos não existe, e campo que pode ser calculado não nasce vazio
 * e obrigatório (`PRODUCT.md`, princípio 1).
 */
export function FormularioMeta({
  aberto,
  aoFechar,
  contaId,
  competencia,
  meta,
  realizado,
  chave: chaveAtual,
}: {
  aberto: boolean;
  aoFechar: () => void;
  contaId: string;
  competencia: CompetenciaMensal;
  /** A meta que já existe neste mês, se existe. */
  meta: Meta | null;
  /** `entradas` do mês, para o espelho nascer com o progresso certo. */
  realizado: Centavos;
  /** Muda a cada abertura, como no lançamento: o painel fica montado. */
  chave: string;
}) {
  const [alvo, setAlvo] = useState<Centavos>(meta?.faturamentoAlvo ?? 0);
  // O par que evita sincronizar um campo com o outro (`DECISOES.md#d21`): o
  // preço exibido é derivado a cada render, e não copiado para o estado.
  const [precoManual, setPrecoManual] = useState(Boolean(meta));
  const [precoDigitado, setPrecoDigitado] = useState<Centavos>(
    meta?.ticketMedioReferencia ?? 0,
  );

  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setAlvo(meta?.faturamentoAlvo ?? 0);
    setPrecoManual(Boolean(meta));
    setPrecoDigitado(meta?.ticketMedioReferencia ?? 0);
    setErros({});
    setFalha(null);
  }

  // A assinatura só existe enquanto o painel está aberto: a lista de fichas
  // serve a este campo e a mais nada na tela de caixa.
  const consultaFichas = useMemo(
    () =>
      aberto
        ? query(colFichas(contaId), where("arquivado", "==", false))
        : null,
    [contaId, aberto],
  );
  const fichas = useColecao<FichaTecnica>(consultaFichas);

  const sugerido = precoMedioDasFichas(fichas.dados);
  const precoMedioUnitario = precoManual ? precoDigitado : sugerido;
  const semFichas = !fichas.carregando && sugerido === 0;

  const plano = planejarMeta({
    competencia,
    faturamentoAlvo: alvo,
    precoMedioUnitario,
  });

  function mudarPreco(centavos: Centavos) {
    setPrecoManual(true);
    setPrecoDigitado(centavos);
  }

  async function salvar() {
    const resultado = esquemaMeta.safeParse({
      faturamentoAlvo: alvo,
      precoMedioUnitario,
    });
    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }

    setErros({});
    setFalha(null);
    setSalvando(true);
    try {
      await salvarMeta(contaId, competencia, resultado.data, realizado, meta);
      setSalvando(false);
      aoFechar();
    } catch {
      setFalha("Não foi possível salvar agora. Tente de novo em instantes.");
      setSalvando(false);
    }
  }

  const mes = rotuloMes(competencia);

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={meta ? `Meta de ${mes}` : `Definir a meta de ${mes}`}
      descricao="Quanto você quer faturar, e por quanto sai um doce em média."
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1" disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={() => void salvar()}
            carregando={salvando}
            className="flex-[1.6]"
          >
            Salvar meta
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        <CampoMoeda
          rotulo={`Quanto você quer faturar em ${mes}`}
          obrigatorio
          valor={alvo}
          aoMudar={setAlvo}
          erro={erros.faturamentoAlvo}
          dica="O que entra de venda no mês, antes de descontar qualquer custo."
        />

        <div>
          <CampoMoeda
            rotulo="Preço médio de um doce"
            obrigatorio
            valor={precoMedioUnitario}
            aoMudar={mudarPreco}
            erro={erros.precoMedioUnitario}
            dica={
              semFichas
                ? undefined
                : "Vem da média das suas fichas. Ajuste se o que você mais vende for mais caro ou mais barato."
            }
          />

          {semFichas ? (
            <p className="mt-1.5 max-w-[52ch] text-label text-ink-muted">
              Você ainda não tem ficha com preço, então não há média para
              sugerir.{" "}
              <Link
                href="/fichas"
                className="font-medium text-wine-700 underline underline-offset-2 dark:text-wine-300"
              >
                Cadastrar uma ficha
              </Link>
            </p>
          ) : (
            precoManual &&
            sugerido > 0 &&
            sugerido !== precoMedioUnitario && (
              <button
                type="button"
                onClick={() => setPrecoManual(false)}
                className="toque -ml-2 mt-1 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-wine-700 transition-colors duration-150 ease-quart hover:bg-wine-100 dark:text-wine-300"
              >
                <Wand2 aria-hidden className="size-4" strokeWidth={1.75} />
                Usar a média das fichas, {formatarMoeda(sugerido)}
              </button>
            )
          )}
        </div>

        {/* Todo número mostra a consequência: aqui, a meta já traduzida em
            doces, que é a forma em que ela cabe numa semana de produção. */}
        <div className="rounded-lg border border-line bg-sunken px-4 py-3">
          {plano.motivo ? (
            <p className="max-w-[46ch] text-label text-ink-muted">
              {plano.motivo === "ALVO_ZERO"
                ? "Diga quanto você quer faturar e o número de doces aparece aqui."
                : "Diga por quanto sai um doce e o número de doces aparece aqui."}
            </p>
          ) : (
            <p className="max-w-[46ch] text-label text-ink">
              São{" "}
              <strong className="num font-semibold">
                {plano.unidadesNecessarias}
              </strong>{" "}
              doces em {mes}, ou{" "}
              <strong className="num font-semibold">
                {plano.unidadesPorSemana}
              </strong>{" "}
              por semana.
            </p>
          )}
        </div>

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}
      </div>
    </Painel>
  );
}
