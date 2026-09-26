"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { ChevronRight, Hourglass, TriangleAlert } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  DIAS_DE_ATENCAO,
  fraseDoTeste,
  situacaoDaConta,
  sobraQuePagaOPlano,
} from "@/lib/domain/assinatura";
import { parcelasDoResumo } from "@/lib/domain/caixa";
import { competenciaAtual, rotuloMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { colFichas, docResumoMensal } from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type { Centavos, FichaTecnica, Pacote, ResumoMensal } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/**
 * A faixa do teste na tela Hoje (spec 048). Durante o teste inteiro: o prazo
 * e, quando há o que contar, o que o Rende já fez pela conta (`#d218`). Nos
 * três últimos dias vira bloco, com o preço do plano na sobra do produto que
 * ela mais vende e o botão de assinar (`#d219`). Nenhuma outra situação mostra
 * a faixa: vencida é uma tela cheia (`#d144`), e assinante e livre não têm o
 * que avisar.
 */
export function FaixaDoTeste() {
  const { conta } = useAuth();

  const situacao = conta
    ? situacaoDaConta(
        {
          plano: conta.plano,
          trialAteMs: conta.trialAte?.toMillis(),
          assinaturaAteMs: conta.assinaturaAte?.toMillis(),
        },
        new Date().getTime(),
      )
    : null;

  if (situacao?.tipo !== "teste") return null;
  return <Faixa dias={situacao.diasRestantes} />;
}

function Faixa({ dias }: { dias: number }) {
  const contaId = useContaId();
  const [competencia] = useState(() => competenciaAtual(new Date()));

  // As mesmas duas leituras de `CartaoDoMes` e `CartaoNoVermelhoHoje`: o
  // Firestore divide o alvo, e nenhuma consulta nova sai daqui (`#d218`).
  const refResumo = useMemo(
    () => docResumoMensal(contaId, competencia),
    [contaId, competencia],
  );
  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const resumo = useDocumento<ResumoMensal>(refResumo);
  const fichas = useColecao<FichaTecnica>(consultaFichas);

  const emAtencao = dias <= DIAS_DE_ATENCAO;
  const mensal = useMensalDoCompleto(emAtencao);

  const { entradas, produtos } = parcelasDoResumo(resumo.dado);
  const comPreco = fichas.dados.filter(
    (ficha) => ficha.precificacao.precoVenda > 0,
  ).length;

  const contado = [
    comPreco > 0 &&
      `${comPreco} ${comPreco === 1 ? "produto" : "produtos"} com preço`,
    entradas > 0 &&
      `${formatarMoeda(entradas)} em vendas em ${rotuloMes(competencia)}`,
  ].filter(Boolean);
  // Nada a contar, nada inventado: a faixa fica em uma linha.
  const oQueRendeu = contado.length > 0 ? contado.join(" · ") : null;

  const Icone = emAtencao ? TriangleAlert : Hourglass;
  const icone = (
    <Icone
      aria-hidden
      className={`size-5 shrink-0 ${emAtencao ? "text-attention" : "text-ink-muted"}`}
      strokeWidth={1.75}
    />
  );

  if (!emAtencao) {
    return (
      <Link
        href="/assinatura"
        className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        {icone}
        <span className="min-w-0 flex-1">
          <span className="block text-label font-medium text-ink">
            {fraseDoTeste(dias)}
          </span>
          {oQueRendeu && (
            <span className="num block text-label text-ink-muted">
              {oQueRendeu}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </Link>
    );
  }

  const pagaOPlano =
    mensal != null ? sobraQuePagaOPlano(produtos, mensal) : null;

  // Com um botão dentro, o bloco deixa de ser link: o alvo é o botão.
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-surface px-4 py-4">
      <span className="pt-0.5">{icone}</span>
      <div className="min-w-0 flex-1">
        <p className="text-label font-medium text-attention">
          {fraseDoTeste(dias)}
        </p>
        {oQueRendeu && (
          <p className="num text-label text-ink-muted">{oQueRendeu}</p>
        )}
        <div className="mt-2">
          {pagaOPlano && mensal != null && (
            <p className="num text-body text-ink">
              O completo custa {formatarMoeda(mensal)} por mês: a sobra de{" "}
              {pagaOPlano.unidades}{" "}
              {pagaOPlano.unidades === 1 ? "unidade" : "unidades"} de{" "}
              {pagaOPlano.nome}.
            </p>
          )}
          {/* Verdade pelo `#d144`: ler não tem prazo. */}
          <p className="text-body text-ink-muted">
            Sem assinar, nada se perde: tudo fica guardado para ler.
          </p>
        </div>
        <Link
          href="/assinatura"
          className={classesBotao({
            variante: "primaria",
            tamanho: "lg",
            className: "mt-4 w-full sm:w-auto lg:h-12",
          })}
        >
          Assinar
        </Link>
      </div>
    </div>
  );
}

/**
 * O mensal do completo, que é o plano do teste (`#d168`), lido do Stripe uma
 * vez por montagem e só quando `ativo`. Sem rede ou sem configuração, `null`,
 * e a linha do preço não aparece.
 */
function useMensalDoCompleto(ativo: boolean): Centavos | null {
  const { usuario } = useAuth();
  const [mensal, setMensal] = useState<Centavos | null>(null);

  useEffect(() => {
    if (!ativo || !usuario) return;
    let cancelado = false;

    async function carregar() {
      try {
        const token = await usuario!.getIdToken();
        const resposta = await fetch("/api/assinatura/precos", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) return;
        const precos = (await resposta.json()) as Record<
          Pacote,
          { mensal: Centavos }
        >;
        if (!cancelado) setMensal(precos.COMPLETO.mensal);
      } catch {
        // Sem a linha do preço; o resto da faixa não depende dela.
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [ativo, usuario]);

  return mensal;
}
