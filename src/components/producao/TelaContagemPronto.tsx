"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { Check, CookingPot, Plus, TriangleAlert } from "lucide-react";
import { RodapeContagem } from "@/components/estoque/RodapeContagem";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas } from "@/components/ui/Pilulas";
import { classesBotao } from "@/components/ui/estilosBotao";
import { useGuardaDeSaida } from "@/components/ui/useGuardaDeSaida";
import {
  rotuloDaQuantidade,
  SUFIXO_UNIDADE_RENDIMENTO,
} from "@/lib/domain/custoFicha";
import {
  esperadoNoPote,
  precisaConferirOPote,
  type EsperadoNoPote,
} from "@/lib/domain/cardapio";
import { dataISODe, diaVizinho } from "@/lib/domain/datas";
import {
  IDADE_VENCE_DIAS,
  numeroContado,
  resumoDaContagem,
  rotuloDeIdade,
  sugestaoDaContagem,
  textoContado,
} from "@/lib/domain/estoque";
import {
  contagemDoPronto,
  temPronto,
  type ProjecaoDoPronto,
} from "@/lib/domain/producao";
import {
  lerSementeDoPronto,
  limparSementeDoPronto,
} from "@/lib/estado/sementeDoPronto";
import { colFichas, colPedidos } from "@/lib/firebase/colecoes";
import { salvarContagemDoPronto } from "@/lib/firebase/mutations/estoque";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import type {
  FichaTecnica,
  Fornada,
  Pedido,
  UnidadeRendimento,
} from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

function quanto(valor: number, unidade: UnidadeRendimento): string {
  return rotuloDaQuantidade(valor, unidade);
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

  // A janela das fornadas: contagem mais velha que isso já venceu e não tem
  // esperado (`#d335`). A forma de `AgendaHoje`, que já tem índice.
  const consultaPedidos = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        where("dataEntregaISO", ">=", diaVizinho(hoje, -IDADE_VENCE_DIAS)),
        orderBy("dataEntregaISO"),
      ),
    [contaId, hoje],
  );

  const { dados, carregando, erro, pendente } =
    useColecao<FichaTecnica>(consulta);
  const { dados: fornadas, carregando: carregandoFornadas } =
    useColecao<Fornada>(consultaProducao);
  const { dados: pedidos, carregando: carregandoPedidos } =
    useColecao<Pedido>(consultaPedidos);
  // Só receita tem pote: o kit é o agregado das receitas de dentro, e é por
  // ele que o pedido de combo desconta do pote de cada uma.
  const fichas = useMemo(() => dados.filter(temPronto), [dados]);
  const kits = useMemo(
    () => dados.filter((ficha) => !temPronto(ficha)),
    [dados],
  );

  const esperados = useMemo(
    () =>
      new Map(
        fichas.map((ficha) => [
          ficha.id,
          esperadoNoPote(ficha, fornadas, pedidos, kits, hoje),
        ]),
      ),
    [fornadas, pedidos, kits, fichas, hoje],
  );

  const semeada = semente
    ? fichas.find((ficha) => ficha.id === semente.fichaId)
    : undefined;
  const sugestao =
    semente && semeada
      ? sugestaoDaContagem(contagemDoPronto(semeada, hoje), semente.unidades)
      : null;

  // Sem semente, a tela abre no que precisa de olho (`#d335`, as regras do
  // `#d331`): congelado ao abrir e ao trocar de pílula. `undefined` é "ainda
  // não decidido"; `null`, todos.
  const [recorte, setRecorte] = useState<Set<string> | null>();
  const [comPilulas, setComPilulas] = useState(false);

  // Recorte vazio cai para todas: acontece quando a ficha semeada ainda não
  // chegou do cache.
  const recortadas = semente
    ? soEsta && semeada
      ? [semeada]
      : []
    : recorte
      ? fichas.filter((ficha) => recorte.has(ficha.id))
      : [];
  const linhas = recortadas.length > 0 ? recortadas : fichas;

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

  /** O que precisa de olho e ainda não ganhou número nesta contagem. */
  const aConferir = useMemo(
    () =>
      fichas
        .filter((ficha) => {
          const esperado = esperados.get(ficha.id);
          return (
            valores[ficha.id] === null &&
            !!esperado &&
            precisaConferirOPote(esperado)
          );
        })
        .map((ficha) => ficha.id),
    [fichas, valores, esperados],
  );

  // Decide uma vez, com fichas, fornadas e pedidos na mão, durante o render
  // para a lista inteira não piscar antes do recorte (`#d331`).
  if (
    recorte === undefined &&
    !carregando &&
    !carregandoFornadas &&
    !carregandoPedidos
  ) {
    const util =
      !semente && aConferir.length > 0 && aConferir.length < fichas.length;
    setComPilulas(util);
    setRecorte(util ? new Set(aConferir) : null);
  }

  function escrever(fichaId: string, texto: string) {
    setDigitados((anteriores) => ({ ...anteriores, [fichaId]: texto }));
  }

  // Inclusive o que a fornada semeou: a proposta que sai da contagem é
  // trabalho perdido também (`DECISOES.md#d134`).
  const sujo = Object.values(valores).some((quantidade) => quantidade !== null);
  const guarda = useGuardaDeSaida(sujo);

  // O que está na tela e o que ela já tocou fora dela: salvar grava tudo o
  // que foi tocado, e o rodapé não pode dizer zero com número digitado.
  const naTela = new Set(linhas.map((ficha) => ficha.id));
  const resumo = resumoDaContagem(
    fichas
      .filter((ficha) => naTela.has(ficha.id) || valores[ficha.id] !== null)
      .map((ficha) => ficha.id),
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
    void guarda.navegar("/fichas");
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Contar o que está pronto"
        descricao={`A massa no congelador e o que já assou, por produto. ${
          semente
            ? "Confira no pote antes de salvar. Zero também é contagem: é você dizendo que acabou."
            : "Digite só o que você conferir. Zero também é contagem: é você dizendo que acabou."
        }`}
        voltar={{ href: "/fichas", rotulo: "Produtos" }}
        pendente={pendente}
      />

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
        <Pilulas
          className="mt-4"
          rotulo="O que contar"
          numerico
          opcoes={[
            { valor: true, rotulo: "Só este produto (1)" },
            { valor: false, rotulo: `Todos (${fichas.length})` },
          ]}
          valor={soEsta}
          aoMudar={setSoEsta}
        />
      )}

      {comPilulas && (
        <Pilulas
          className="mt-4"
          rotulo="O que contar"
          numerico
          opcoes={[
            {
              valor: true,
              rotulo: `Precisa conferir (${recorte?.size ?? aConferir.length})`,
            },
            { valor: false, rotulo: `Todos (${fichas.length})` },
          ]}
          valor={!!recorte}
          aoMudar={(precisa) => setRecorte(precisa ? new Set(aConferir) : null)}
        />
      )}

      <div className="mt-4 pb-52 lg:pb-44">
        {carregando || (!semente && recorte === undefined) ? (
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
                esperado={esperados.get(ficha.id)}
                proposto={
                  ficha.id === semeada?.id && sugestao !== null
                    ? sugestao
                    : null
                }
                entrada={semente?.unidades ?? 0}
                texto={digitados[ficha.id] ?? ""}
                aoMudar={(texto) => escrever(ficha.id, texto)}
                aoIgual={(anotado) => escrever(ficha.id, textoContado(anotado))}
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

      {guarda.dialogo}

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
  esperado,
  proposto,
  entrada,
  texto,
  aoMudar,
  aoIgual,
}: {
  ficha: FichaTecnica;
  esperado?: EsperadoNoPote;
  /** O que a fornada propôs para esta linha, ou `null`. */
  proposto: number | null;
  /** As unidades da fornada que semeou. */
  entrada: number;
  texto: string;
  aoMudar: (texto: string) => void;
  aoIgual: (anotado: number) => void;
}) {
  const unidade = ficha.unidadeRendimento;
  const digitado = texto.trim().length > 0;
  const valor = numeroContado(texto);
  const ilegivel = digitado && valor === null;
  const contado = valor !== null;
  // A procedência vale enquanto o campo ainda é o que a fornada propôs.
  const procedencia =
    proposto !== null && texto === textoContado(proposto) && esperado
      ? procedenciaDoPronto(esperado, entrada, unidade)
      : null;

  const contagem = esperado?.contagem;
  const semMovimento =
    !!esperado && esperado.fornadas === 0 && esperado.pedidos === 0;
  // Vencida sempre; nunca contada só com fornada na janela (`#d335`): sem
  // ela, nada indica que haja algo no pote.
  const atencao =
    contagem?.frescor === "VENCIDA" ||
    (contagem?.frescor === "NUNCA" && !semMovimento);
  // "Igual" (`#d330`): só onde o número velho ainda pode ser o do pote.
  const anotado = contagem?.anotado ?? null;
  const igual =
    !digitado &&
    semMovimento &&
    anotado !== null &&
    (contagem?.frescor === "FRESCA" || contagem?.frescor === "ENVELHECENDO");

  /** Em 360px o botão desce para a linha da referência, para o nome não sumir. */
  const botaoIgual = (className: string) => (
    <button
      type="button"
      onClick={() => anotado !== null && aoIgual(anotado)}
      aria-label={`Igual à última contagem: ${quanto(anotado ?? 0, unidade)}`}
      className={classesBotao({
        variante: "terciaria",
        tamanho: "sm",
        className: cn("shrink-0", className),
      })}
    >
      Igual
    </button>
  );

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
          <div className="flex items-center gap-2">
            <p
              id={`pronto-${ficha.id}-referencia`}
              className={cn(
                "num mt-0.5 flex min-w-0 flex-1 items-start gap-1.5 text-label",
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
              ) : contado ? (
                !ilegivel && (
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-positive"
                    strokeWidth={2.5}
                  />
                )
              ) : (
                !ilegivel &&
                atencao && (
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-attention"
                    strokeWidth={2}
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
                        : contagem?.frescor !== "NUNCA" && valor === anotado
                          ? "igual à última, conferido hoje"
                          : `${quanto(valor, unidade)}, contadas hoje`
                      : referencia(esperado, unidade, atencao)))}
              </span>
            </p>
            {igual && botaoIgual("min-[400px]:hidden")}
          </div>
        </div>

        {igual && botaoIgual("hidden min-[400px]:inline-flex")}
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

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * O esperado primeiro (`#d335`): "esperamos 9 unidades · 16 contadas há 8
 * dias, +12 da massa, −19 em 4 pedidos", cada parcela só se não for zero. Sem
 * movimento, "7 unidades · contada há 23 dias". Vencida e nunca contada com
 * fornada abrem com a palavra em atenção (o triângulo vem de fora).
 */
function referencia(
  esperado: EsperadoNoPote | undefined,
  unidade: UnidadeRendimento,
  atencao: boolean,
): ReactNode {
  const palavra = (texto: string) =>
    atencao ? (
      <span className="font-medium text-attention">{texto}</span>
    ) : (
      texto
    );
  if (!esperado || esperado.contagem.frescor === "NUNCA") {
    return palavra("nunca contada");
  }
  const { contagem } = esperado;
  if (contagem.frescor === "VENCIDA") {
    return (
      <>
        {palavra("vencida")} · {rotuloDeIdade(contagem)}
      </>
    );
  }

  const anotado = contagem.anotado ?? 0;
  if (
    esperado.esperado === null ||
    (esperado.fornadas === 0 && esperado.pedidos === 0)
  ) {
    return `${quanto(anotado, unidade)} · ${rotuloDeIdade(contagem)}`;
  }
  const dias = contagem.idadeEmDias ?? 0;
  const parcelas = [
    `${numero(anotado)} contadas ${dias === 0 ? "hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}`,
    esperado.feitas > 0 && `+${numero(esperado.feitas)} da massa`,
    esperado.saiu > 0 &&
      `−${numero(esperado.saiu)} em ${esperado.pedidos} ${esperado.pedidos === 1 ? "pedido" : "pedidos"}`,
  ].filter(Boolean);
  return `esperamos ${quanto(esperado.esperado, unidade)} · ${parcelas.join(", ")}`;
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
