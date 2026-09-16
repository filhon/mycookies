"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Check, CookingPot, Plus } from "lucide-react";
import { RodapeContagem } from "@/components/estoque/RodapeContagem";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import {
  ROTULO_UNIDADE_RENDIMENTO,
  SUFIXO_UNIDADE_RENDIMENTO,
} from "@/lib/domain/custoFicha";
import { dataISODe } from "@/lib/domain/datas";
import {
  numeroContado,
  resumoDaContagem,
  rotuloDeIdade,
  sugestaoDaContagem,
  textoContado,
} from "@/lib/domain/estoque";
import {
  contagemDoPronto,
  projecaoDoPronto,
  temPronto,
  type ProjecaoDoPronto,
} from "@/lib/domain/producao";
import {
  lerSementeDoPronto,
  limparSementeDoPronto,
} from "@/lib/estado/sementeDoPronto";
import { colFichas } from "@/lib/firebase/colecoes";
import { salvarContagemDoPronto } from "@/lib/firebase/mutations/estoque";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import type { FichaTecnica, Fornada, UnidadeRendimento } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

function quanto(valor: number, unidade: UnidadeRendimento): string {
  return `${String(Number(valor.toFixed(2))).replace(".", ",")} ${ROTULO_UNIDADE_RENDIMENTO[unidade]}`;
}

/**
 * Contar o que está pronto: a irmã de `/insumos/contagem`, um nível acima.
 *
 * Uma linha por ficha viva, um número cada, uma escrita. O campo nasce vazio
 * pelo mesmo motivo da despensa (`#d59`): vazio é "não contei esta", zero é
 * "contei, e não tem". A exceção é a fornada que ela acabou de registrar, que
 * semeia a própria linha com `contagem + o que a massa fez` (`#d64`, `#d97`).
 * A projeção fica na frase de referência, e nunca no campo.
 */
export function TelaContagemPronto() {
  const contaId = useContaId();
  const router = useRouter();

  const [hoje] = useState(() => dataISODe(new Date()));
  const [digitados, setDigitados] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);

  // Lida uma vez e apagada só depois de o campo nascer, como na despensa: as
  // fichas podem chegar do cache depois da tela.
  const [semente] = useState(lerSementeDoPronto);
  const semeado = useRef(false);
  const [soEsta, setSoEsta] = useState(() => lerSementeDoPronto() !== null);

  const consulta = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const consultaProducao = useMemo(
    () => consultaFornadas(contaId, hoje),
    [contaId, hoje],
  );

  const { dados, carregando, erro, pendente } =
    useColecao<FichaTecnica>(consulta);
  const { dados: fornadas } = useColecao<Fornada>(consultaProducao);
  // Só receita tem pote: o kit é o agregado das receitas de dentro.
  const fichas = useMemo(() => dados.filter(temPronto), [dados]);

  const projecoes = useMemo(
    () =>
      new Map(
        fichas.map((ficha) => [
          ficha.id,
          projecaoDoPronto(fornadas, ficha, hoje),
        ]),
      ),
    [fornadas, fichas, hoje],
  );

  const semeada = semente
    ? fichas.find((ficha) => ficha.id === semente.fichaId)
    : undefined;
  const sugestao =
    semente && semeada
      ? sugestaoDaContagem(contagemDoPronto(semeada, hoje), semente.unidades)
      : null;

  // O recorte cai para todas quando a ficha semeada ainda não chegou.
  const linhas = soEsta && semeada ? [semeada] : fichas;

  useEffect(() => {
    if (semeado.current || !semente || !semeada || sugestao === null) return;
    semeado.current = true;
    setDigitados({ [semeada.id]: textoContado(sugestao) });
    limparSementeDoPronto();
  }, [semente, semeada, sugestao]);

  const valores = useMemo(() => {
    const mapa: Record<string, number | null> = {};
    for (const ficha of fichas) {
      mapa[ficha.id] = numeroContado(digitados[ficha.id] ?? "");
    }
    return mapa;
  }, [fichas, digitados]);

  const resumo = resumoDaContagem(
    linhas.map((ficha) => ficha.id),
    valores,
  );

  /** Não espera o servidor: é a mesma escolha da despensa (`#d62`). */
  function salvar() {
    const contagens = fichas.flatMap((ficha) => {
      const quantidade = valores[ficha.id];
      return quantidade === null || quantidade === undefined
        ? []
        : [{ fichaId: ficha.id, quantidade }];
    });
    if (contagens.length === 0) return;

    setFalha(null);
    salvarContagemDoPronto(contaId, contagens, hoje).catch(() =>
      setFalha("Não deu para salvar a contagem agora."),
    );
    router.push("/fichas");
  }

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 pb-3 pt-3 lg:-mx-8 lg:px-8 lg:pb-4 lg:pt-6">
        <Link
          href="/fichas"
          className="toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          Produtos
        </Link>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-display text-title font-semibold text-ink lg:text-display">
            Contar o que está pronto
          </h1>
          <SeloSincronizacao pendente={pendente} />
        </div>

        <p className="mt-1 max-w-[60ch] text-label text-ink-muted lg:text-body">
          A massa no congelador e o que já assou, por produto.{" "}
          {semente
            ? "Confira no pote antes de salvar. Zero também é contagem: é você dizendo que acabou."
            : "Digite só o que você conferir. Zero também é contagem: é você dizendo que acabou."}
        </p>
      </header>

      {semente && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-sunken px-4 py-3 text-label text-ink">
          <CookingPot
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
          <span className="max-w-[62ch]">
            O campo já vem com a massa que você acabou de registrar, somada à
            sua última contagem. Confira no pote e corrija o que não bater: nada
            é gravado antes de você salvar.
          </span>
        </p>
      )}

      {semente && semeada && (
        <div className="mt-4 flex gap-2" role="group" aria-label="O que contar">
          {(
            [
              { valor: true, rotulo: "Só este produto", quantos: 1 },
              { valor: false, rotulo: "Todos", quantos: fichas.length },
            ] as const
          ).map((opcao) => {
            const ativo = soEsta === opcao.valor;
            return (
              <button
                key={String(opcao.valor)}
                type="button"
                onClick={() => setSoEsta(opcao.valor)}
                aria-pressed={ativo}
                className={cn(
                  "num h-11 shrink-0 rounded-full px-4 text-label font-medium",
                  "transition-colors duration-150 ease-quart",
                  ativo
                    ? "bg-wine-700 text-on-wine"
                    : "border border-line-strong text-ink-muted hover:bg-sunken",
                )}
              >
                {opcao.rotulo} ({opcao.quantos})
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 pb-52 lg:pb-44">
        {carregando ? (
          <div role="status" aria-label="Carregando" className="space-y-4">
            {[0, 1].map((indice) => (
              <Esqueleto key={indice} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : erro ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não deu para carregar seus produtos"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          </div>
        ) : linhas.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não há o que contar ainda"
              descricao="A contagem lista os produtos que você já montou. Crie o primeiro produto, e ele aparece aqui."
              acao={
                <Link
                  href="/fichas/nova"
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Criar produto
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {linhas.map((ficha) => (
              <LinhaPronto
                key={ficha.id}
                ficha={ficha}
                projecao={projecoes.get(ficha.id)}
                proposto={
                  ficha.id === semeada?.id && sugestao !== null
                    ? sugestao
                    : null
                }
                entrada={semente?.unidades ?? 0}
                texto={digitados[ficha.id] ?? ""}
                aoMudar={(texto) =>
                  setDigitados((anteriores) => ({
                    ...anteriores,
                    [ficha.id]: texto,
                  }))
                }
              />
            ))}
          </ul>
        )}

        {falha && (
          <p role="alert" className="mt-4 text-label text-negative">
            {falha}
          </p>
        )}
      </div>

      {linhas.length > 0 && (
        <RodapeContagem
          resumo={resumo}
          aoSalvar={salvar}
          rotulo="O que está pronto hoje"
          dica="Digite o que você está vendo no pote e no congelador. Não precisa contar tudo: o que ficar em branco não é gravado."
        />
      )}
    </>
  );
}

/** Uma ficha na contagem: o nome, o campo e a frase que explica o número velho. */
function LinhaPronto({
  ficha,
  projecao,
  proposto,
  entrada,
  texto,
  aoMudar,
}: {
  ficha: FichaTecnica;
  projecao?: ProjecaoDoPronto;
  /** O que a fornada propôs para esta linha, ou `null`. */
  proposto: number | null;
  /** As unidades da fornada que semeou. */
  entrada: number;
  texto: string;
  aoMudar: (texto: string) => void;
}) {
  const unidade = ficha.unidadeRendimento;
  const digitado = texto.trim().length > 0;
  const valor = numeroContado(texto);
  const ilegivel = digitado && valor === null;
  const contado = valor !== null;
  // A procedência vale enquanto o campo ainda é o que a fornada propôs.
  const procedencia =
    proposto !== null && texto === textoContado(proposto) && projecao
      ? procedenciaDoPronto(projecao, entrada, unidade)
      : null;

  return (
    <li className={cn("px-4 py-3 lg:px-5", contado && "bg-sunken")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`pronto-${ficha.id}`}
            className="block truncate text-body font-medium text-ink"
          >
            {ficha.nome}
          </label>
          <p
            id={`pronto-${ficha.id}-referencia`}
            className={cn(
              "num mt-0.5 flex items-start gap-1.5 text-label",
              ilegivel
                ? "text-negative"
                : contado && !procedencia
                  ? "text-ink"
                  : "text-ink-muted",
            )}
          >
            {procedencia ? (
              <CookingPot
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-ink-subtle"
                strokeWidth={2}
              />
            ) : (
              contado &&
              !ilegivel && (
                <Check
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-positive"
                  strokeWidth={2.5}
                />
              )
            )}
            <span>
              {ilegivel
                ? "não deu para ler este número"
                : (procedencia ??
                  (contado
                    ? valor === 0
                      ? "zero: conferido, e não tem"
                      : `${quanto(valor, unidade)}, contadas hoje`
                    : referencia(projecao, unidade)))}
            </span>
          </p>
        </div>

        <div className="relative w-28 shrink-0">
          <input
            id={`pronto-${ficha.id}`}
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            placeholder="—"
            value={texto}
            aria-describedby={`pronto-${ficha.id}-referencia`}
            aria-invalid={ilegivel ? true : undefined}
            onChange={(evento) => aoMudar(evento.target.value)}
            className={cn(
              BASE_CONTROLE,
              "num pr-14 text-right font-semibold",
              ilegivel ? "border-negative" : "border-line-strong",
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-muted"
          >
            {SUFIXO_UNIDADE_RENDIMENTO[unidade]}
          </span>
        </div>
      </div>
    </li>
  );
}

/** "13 unidades · contada há 2 dias · massa para 25 desde então, projetamos 38". */
function referencia(
  projecao: ProjecaoDoPronto | undefined,
  unidade: UnidadeRendimento,
): string {
  const anotado = projecao?.contagem.anotado;
  if (!projecao || anotado === null || anotado === undefined) {
    return "nunca contada";
  }
  const { contagem } = projecao;
  const base = `${quanto(anotado, unidade)} · ${rotuloDeIdade(contagem)}`;
  if (projecao.fornadas === 0 || projecao.prontos === null) return base;
  return `${base} · massa para ${quanto(projecao.feitas, unidade)} desde então, projetamos ${quanto(projecao.prontos, unidade)}`;
}

/** De onde a sugestão saiu: as mesmas três frases da despensa, com a massa no lugar da nota. */
function procedenciaDoPronto(
  projecao: ProjecaoDoPronto,
  entrada: number,
  unidade: UnidadeRendimento,
): string {
  const { contagem } = projecao;
  if (contagem.quantidade === null) {
    return `sem contagem recente · sugerimos ${quanto(entrada, unidade)}, que a massa fez`;
  }
  if (contagem.idadeEmDias === 0) {
    return "contada hoje · a massa não foi somada de novo";
  }
  const dias = contagem.idadeEmDias ?? 0;
  return `${quanto(contagem.quantidade, unidade)} contadas há ${dias} ${dias === 1 ? "dia" : "dias"} + ${quanto(entrada, unidade)} da massa`;
}
