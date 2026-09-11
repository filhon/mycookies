"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Seletor } from "@/components/ui/Campo";
import { Painel } from "@/components/ui/Painel";
import { ROTULO_UNIDADE_RENDIMENTO } from "@/lib/domain/custoFicha";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { parseParaNumero } from "@/lib/domain/money";
import {
  consumoDesdeAContagem,
  consumoPorLote,
  disponivelParaProducao,
  fornadaGravavel,
} from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import { registrarFornada } from "@/lib/firebase/mutations/fornadas";
import type {
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  UnidadeRendimento,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** Uma ficha que a folha pode fazer, com quantas unidades ela propõe. */
export interface OpcaoDeFornada {
  ficha: FichaTecnica;
  unidades: number;
}

const FORMA_DE_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** O sufixo do campo, curto: "un", e não "unidades", ao lado de um número. */
const SUFIXO_RENDIMENTO: Record<UnidadeRendimento, string> = {
  un: "un",
  porcao: "porções",
  g: "g",
  ml: "ml",
};

function texto(numero: number): string {
  return String(Number(numero.toFixed(2))).replace(".", ",");
}

/**
 * A folha de registrar fornada: painel lateral no desktop, folha inferior no
 * celular.
 *
 * Fornada é a massa feita (`DECISOES.md#d93`): ela mistura, congela e assa sob
 * demanda, e o insumo sai da despensa na tigela. Por isso o campo é **quantas
 * unidades** a massa vai render, e não quantos lotes — ela faz massa para 15
 * cookies quando a despensa não dá para 25, e a receita converte em lote.
 *
 * Embaixo dos campos, o que a fornada vai custar da despensa, linha por linha,
 * **antes de salvar**. É o princípio 3 do `PRODUCT.md` — todo número mostra a
 * sua consequência — e é o que torna a projeção legível: ela vê a despensa
 * descer antes de aceitar que ela desça.
 *
 * Salvar não espera o servidor (`#d62`, `#d80`): a cozinha é o pior sinal da
 * casa depois da despensa, e a folha fecha no toque.
 *
 * A ficha vem de quem abriu: a tela da ficha manda uma opção, e a do pedido
 * manda as fichas que o pedido pede, com a quantidade pedida. Não há busca
 * solta, porque não há entrada solta.
 */
export function PainelFornada({
  aberto,
  aoFechar,
  contaId,
  chave: chaveAtual,
  opcoes,
  fichas,
  insumos,
  fornadas,
  hoje,
  pedido,
}: {
  aberto: boolean;
  aoFechar: () => void;
  contaId: string;
  /** Muda a cada abertura, para a folha não reabrir com o que ficou. */
  chave: string;
  /** Ao menos uma. Com mais de uma, ela escolhe. */
  opcoes: OpcaoDeFornada[];
  /** Todas as fichas vivas, para resolver os componentes de um kit. */
  fichas: FichaTecnica[];
  insumos: Insumo[];
  /** As fornadas já registradas, para a projeção de cada insumo. */
  fornadas: Fornada[];
  hoje: DataISO;
  /** Quando a fornada é para um pedido específico (`#d91`). */
  pedido?: { id: string; clienteNome: string };
}) {
  const inicial = () => ({
    fichaId: opcoes[0]?.ficha.id ?? "",
    unidades: texto(opcoes[0]?.unidades ?? 0),
    dataISO: hoje,
  });

  const [estado, setEstado] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);

  const [chave, setChave] = useState(chaveAtual);
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setEstado(inicial());
    setErro(null);
  }

  const opcao = opcoes.find((atual) => atual.ficha.id === estado.fichaId);
  const ficha = opcao?.ficha;

  const porId = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  // O que a massa já levou desde a contagem de cada insumo: a projeção que a
  // linha mostra é "medido − isso", e a fornada desta folha desce a partir daí.
  const consumoAnterior = useMemo(
    () => consumoDesdeAContagem(fornadas, insumos),
    [fornadas, insumos],
  );

  const umLote = useMemo(
    () => (ficha ? consumoPorLote(ficha, fichas, insumos) : []),
    [ficha, fichas, insumos],
  );

  const unidades = parseParaNumero(estado.unidades);
  const gravavel = ficha
    ? fornadaGravavel(ficha, Math.max(0, unidades), umLote)
    : null;
  const lotes = gravavel?.lotes ?? 0;

  const linhas = (gravavel?.consumo ?? []).map((linha) => {
    const insumo = porId.get(linha.insumoId);
    const contagem = insumo ? contagemDoInsumo(insumo, hoje) : null;
    // Sem contagem que valha não há projeção: `null`, e não zero.
    const disponivel =
      insumo && contagem && contagem.quantidade !== null
        ? disponivelParaProducao(
            insumo,
            consumoAnterior.get(insumo.id) ?? 0,
            hoje,
          )
        : null;

    return {
      ...linha,
      unidadeBase: insumo?.unidadeBase ?? ("un" as const),
      contagem,
      disponivel,
      fica: disponivel === null ? null : disponivel - linha.quantidade,
    };
  });

  const trava = linhas.filter((linha) => linha.fica !== null && linha.fica < 0);

  function escolherFicha(fichaId: string) {
    const escolhida = opcoes.find((atual) => atual.ficha.id === fichaId);
    setEstado((anterior) => ({
      ...anterior,
      fichaId,
      // A quantidade proposta é a daquela ficha: o que o pedido pede dela.
      unidades: texto(escolhida?.unidades ?? 0),
    }));
  }

  function salvar() {
    if (!ficha || !gravavel) return;

    if (!(gravavel.unidadesProduzidas > 0)) {
      setErro("Diga para quantas unidades você fez massa.");
      return;
    }
    if (!FORMA_DE_DIA.test(estado.dataISO)) {
      setErro("Escolha o dia em que você fez a massa.");
      return;
    }

    setErro(null);
    registrarFornada(contaId, {
      fichaId: ficha.id,
      nomeSnapshot: ficha.nome,
      lotes: gravavel.lotes,
      unidadesProduzidas: gravavel.unidadesProduzidas,
      unidadeRendimento: ficha.unidadeRendimento,
      dataISO: estado.dataISO,
      consumo: gravavel.consumo,
      pedidoId: pedido?.id,
    });
    aoFechar();
  }

  return (
    <Painel
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Registrar fornada"
      descricao={
        pedido
          ? `Para o pedido de ${pedido.clienteNome}. A lista de compras deixa de comprar o que esta massa já gastou.`
          : "O que foi para a massa desconta a despensa até a próxima contagem. Nada é gravado no estoque."
      }
      rodape={
        <div className="flex gap-3">
          <Botao onClick={aoFechar} className="flex-1">
            Cancelar
          </Botao>
          <Botao
            variante="primaria"
            tamanho="lg"
            onClick={salvar}
            disabled={!ficha}
            className="flex-[1.6]"
          >
            Registrar
          </Botao>
        </div>
      }
    >
      <div className="space-y-5">
        {opcoes.length > 1 ? (
          <Seletor
            rotulo="A ficha"
            value={estado.fichaId}
            onChange={(evento) => escolherFicha(evento.target.value)}
          >
            {opcoes.map((atual) => (
              <option key={atual.ficha.id} value={atual.ficha.id}>
                {atual.ficha.nome}
              </option>
            ))}
          </Seletor>
        ) : (
          <div>
            <p className="text-label font-medium text-ink">A ficha</p>
            <p className="mt-1 text-body text-ink">{ficha?.nome}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="Massa para quantas"
            required
            inputMode="decimal"
            autoComplete="off"
            sufixo={ficha ? SUFIXO_RENDIMENTO[ficha.unidadeRendimento] : ""}
            value={estado.unidades}
            onChange={(evento) =>
              setEstado((anterior) => ({
                ...anterior,
                unidades: evento.target.value,
              }))
            }
          />
          <Campo
            rotulo="O dia"
            type="date"
            required
            value={estado.dataISO}
            onChange={(evento) =>
              setEstado((anterior) => ({
                ...anterior,
                dataISO: evento.target.value,
              }))
            }
          />
        </div>

        {/* A conversão que a receita faz por ela: quantas unidades são quanto
            de lote. É o que deixa fazer menos do que a receita rende sem
            dividir de cabeça. */}
        {ficha && gravavel && (
          <p className="num text-label text-ink-muted">
            A receita rende{" "}
            <span className="font-semibold text-ink">
              {texto(ficha.rendimento)}{" "}
              {ROTULO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
            </span>{" "}
            por lote
            {gravavel.unidadesProduzidas > 0 && (
              <>
                <span className="mx-1.5 text-ink-subtle">·</span>
                {texto(gravavel.unidadesProduzidas)} são{" "}
                <span className="font-semibold text-ink">
                  {texto(lotes)} {lotes === 1 ? "lote" : "lotes"}
                </span>
              </>
            )}
          </p>
        )}

        {/* A consequência, antes de salvar. Cada linha diz o que sai, o que
            ela tem pela projeção e o que fica — ou que não há contagem que
            valha, caso em que não há projeção a fazer descer. */}
        <div className="-mx-5">
          <h3 className="px-5 text-label font-medium text-ink">
            Sai da despensa
          </h3>
          {linhas.length === 0 ? (
            <p className="mt-1.5 px-5 text-label text-ink-muted">
              Esta ficha não tem insumos cadastrados. Nada sai da despensa.
            </p>
          ) : (
            <ul className="mt-1.5 divide-y divide-line border-y border-line">
              {linhas.map((linha) => (
                <li
                  key={linha.insumoId}
                  className="flex min-h-14 items-center justify-between gap-3 px-5 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">
                      {linha.nomeSnapshot}
                    </span>
                    <span
                      className={cn(
                        "num mt-0.5 flex items-center gap-1.5 text-label",
                        linha.fica !== null && linha.fica < 0
                          ? "text-attention"
                          : "text-ink-muted",
                      )}
                    >
                      {linha.fica !== null && linha.fica < 0 && (
                        <TriangleAlert
                          aria-hidden
                          className="size-3.5 shrink-0"
                          strokeWidth={2}
                        />
                      )}
                      <span className="truncate">{consequencia(linha)}</span>
                    </span>
                  </span>
                  <span className="num shrink-0 text-body font-semibold text-ink">
                    {formatarQuantidade(linha.quantidade, linha.unidadeBase)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {trava.length > 0 && (
          <p className="flex items-start gap-2.5 rounded-lg border border-attention/30 bg-attention-soft px-4 py-3 text-label text-ink">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-attention"
              strokeWidth={1.75}
            />
            <span className="max-w-[60ch]">
              Pela última contagem,{" "}
              {trava.map((linha) => linha.nomeSnapshot).join(", ")}{" "}
              {trava.length === 1 ? "não dá" : "não dão"} para esta massa. Faça
              menos, ou registre mesmo assim: é dizer que a despensa tinha mais
              do que a contagem disse, e a próxima contagem acerta o número.
            </span>
          </p>
        )}

        {erro && (
          <p role="alert" className="text-label text-negative">
            {erro}
          </p>
        )}
      </div>
    </Painel>
  );
}

/** "você tem 1,2 kg → fica 674 g", "falta 84 g", ou por que não há projeção. */
function consequencia(linha: {
  unidadeBase: Insumo["unidadeBase"];
  contagem: ReturnType<typeof contagemDoInsumo> | null;
  disponivel: number | null;
  fica: number | null;
}): string {
  const quanto = (valor: number) =>
    formatarQuantidade(valor, linha.unidadeBase);

  if (!linha.contagem) return "insumo fora do cadastro";
  if (linha.disponivel === null || linha.fica === null) {
    return linha.contagem.frescor === "VENCIDA"
      ? "contagem vencida: sem projeção"
      : "sem contagem recente";
  }
  if (linha.fica < 0) {
    return `você tem ${quanto(linha.disponivel)} · faltam ${quanto(-linha.fica)}`;
  }
  return `você tem ${quanto(linha.disponivel)} → fica ${quanto(linha.fica)} · ${rotuloDeIdade(linha.contagem)}`;
}
