"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { Check, History, Plus, ShoppingBasket } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Pilulas } from "@/components/ui/Pilulas";
import { classesBotao } from "@/components/ui/estilosBotao";
import { useGuardaDeSaida } from "@/components/ui/useGuardaDeSaida";
import { LinhaContagem } from "./LinhaContagem";
import { RodapeContagem } from "./RodapeContagem";
import { agruparPorCorredor, ROTULO_CORREDOR } from "@/lib/domain/corredores";
import { dataISODe } from "@/lib/domain/datas";
import {
  daBaseParaCampo,
  linhasParaContar,
  naBase,
  numeroContado,
  precisaConferir,
  resumoDaContagem,
  textoContado,
  unidadeDoCampo,
  type LinhaDeContagem,
  type UnidadeDoCampo,
} from "@/lib/domain/estoque";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import { lerSemente, limparSemente } from "@/lib/estado/sementeDaContagem";
import {
  guardarUnidadeDaContagem,
  lerUnidadesDaContagem,
} from "@/lib/estado/unidadesDaContagem";
import { colInsumos } from "@/lib/firebase/colecoes";
import {
  salvarContagem,
  type ContagemGravavel,
} from "@/lib/firebase/mutations/estoque";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Fornada, Insumo } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  apagarRascunho,
  guardarRascunho,
  lerRascunho,
} from "@/lib/utils/rascunhoDaContagem";
import { useContaId } from "@/providers/AuthProvider";

/** "14h10", como ela diz a hora. */
function horaDe(instante: number): string {
  const data = new Date(instante);
  return `${data.getHours()}h${String(data.getMinutes()).padStart(2, "0")}`;
}

function linhasJaDigitadas(quantas: number): string {
  return quantas === 1
    ? "1 linha já digitada"
    : `${quantas} linhas já digitadas`;
}

/**
 * Sem compra atrás dela, a tela nasce com todos os campos vazios. O mapa vazio
 * mora fora do componente para não nascer de novo a cada render e refazer as
 * linhas por nada.
 */
const SEM_ENTRADAS = new Map<string, number>();

/**
 * Contar a despensa inteira: uma linha por insumo, um número cada, uma escrita.
 *
 * É página e não painel, pelo mesmo argumento de `/insumos/nota`
 * (`DECISOES.md#d50`): a invariante do `CLAUDE.md` é sobre formulário de **um**
 * objeto, e aqui são de seis a trinta e quatro campos numéricos. Em 360px isso
 * não cabe numa folha inferior.
 *
 * A entrada mora em `/compras`, e não em `/insumos`: contar é ato de compra — o
 * número existe para a lista, e é contado antes de sair de casa ou depois de
 * guardar as sacolas.
 */
export function TelaContagem() {
  const contaId = useContaId();

  // O dia congela na abertura: a contagem começada às 23h50 é datada no dia em
  // que ela a começou, e não em dois dias diferentes conforme a linha.
  const [hoje] = useState(() => dataISODe(new Date()));

  // A semente é lida uma vez, na montagem, e só é apagada depois de os campos
  // nascerem: consumi-la aqui deixaria a tela sem semente se ela chegasse antes
  // dos insumos, que é exatamente o caso quando a lista vem do cache.
  const [semente] = useState(lerSemente);
  const semeados = useRef(false);

  // A contagem pela metade que ficou no aparelho (`#d332`), só a de hoje. Com
  // semente ela não volta e não é apagada: a compra é outro começo, e o
  // rascunho continua lá se ela sair sem salvar.
  const [retomado, setRetomado] = useState(() =>
    semente ? null : lerRascunho(contaId, hoje),
  );
  const [digitados, setDigitados] = useState<Record<string, string>>(
    () => retomado?.digitados ?? {},
  );
  const [falha, setFalha] = useState<string | null>(null);

  // A unidade de cada linha (`#d329`): a que ela trocou nesta contagem, senão a
  // que ela deixou no aparelho, senão o padrão de `unidadeDoCampo`.
  const [guardadas] = useState(lerUnidadesDaContagem);
  const [unidades, setUnidades] = useState<Record<string, UnidadeDoCampo>>(
    () => retomado?.unidades ?? {},
  );
  const unidadeDe = (linha: LinhaDeContagem) =>
    unidadeDoCampo(
      linha,
      unidades[linha.insumoId] ?? guardadas[linha.insumoId],
    );

  // A cada mudança, o rascunho. O retrato da abertura não é mudança: regravá-lo
  // só trocaria a hora que a faixa mostra.
  const [abertura] = useState({ digitados, unidades });
  useEffect(() => {
    if (semente) return;
    if (digitados === abertura.digitados && unidades === abertura.unidades) {
      return;
    }
    guardarRascunho(contaId, hoje, digitados, unidades);
  }, [semente, abertura, contaId, hoje, digitados, unidades]);

  // Vinda da nota, a tela abre recortada no que a nota trouxe: uma nota de
  // cinco linhas abria trinta e quatro campos, e ela caçava os cinco. É um
  // filtro sobre as linhas, e desligá-lo devolve a despensa inteira.
  const [soDaCompra, setSoDaCompra] = useState(() => lerSemente() !== null);

  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const consultaProducao = useMemo(
    () => consultaFornadas(contaId, hoje),
    [contaId, hoje],
  );

  const {
    dados: insumos,
    carregando,
    erro,
    pendente,
  } = useColecao<Insumo>(consulta);
  const { dados: fornadas, carregando: carregandoFornadas } =
    useColecao<Fornada>(consultaProducao);

  // Sem compra, a tela abre no que precisa de conferência (`#d331`). O recorte
  // é congelado ao abrir e ao trocar de pílula: a linha que ganha número não
  // some debaixo do dedo. `undefined` é "ainda não decidido"; `null`, a
  // despensa inteira.
  const [recorte, setRecorte] = useState<Set<string> | null>();
  const [comPilulas, setComPilulas] = useState(false);

  const todas = useMemo(
    () => linhasParaContar(insumos, semente?.entradas ?? SEM_ENTRADAS, hoje),
    [insumos, semente, hoje],
  );
  const linhas = useMemo(() => {
    const filtro = semente ? soDaCompra && semente.entradas : recorte;
    if (!filtro) return todas;
    const visiveis = todas.filter((linha) => filtro.has(linha.insumoId));
    // Recorte vazio é a despensa inteira, e não a tela vazia: acontece quando
    // o insumo que a nota acabou de cadastrar ainda não chegou do cache.
    return visiveis.length > 0 ? visiveis : todas;
  }, [todas, soDaCompra, semente, recorte]);

  /** O que o forno levou de cada insumo desde a contagem dele (`#d87`). */
  const projecoes = useMemo(
    () =>
      new Map(
        insumos.map((insumo) => [
          insumo.id,
          projecaoDoInsumo(fornadas, insumo, hoje),
        ]),
      ),
    [fornadas, insumos, hoje],
  );

  /**
   * Os campos que a compra semeia, uma vez só.
   *
   * Uma vez só porque `linhas` se refaz a cada chegada do Firestore, e semear de
   * novo apagaria o que ela já corrigiu. O que a semente escreve é a sugestão de
   * `sugestaoDaContagem`, e a linha diz de onde ela saiu — a decisão continua
   * sendo dela, e o que muda é só quanto ela precisa digitar.
   */
  useEffect(() => {
    if (semeados.current || !semente || todas.length === 0) return;
    semeados.current = true;

    const semeadas = todas.filter((linha) => linha.sugestao !== null);
    setDigitados(
      Object.fromEntries(
        semeadas.map((linha) => [
          linha.insumoId,
          textoContado(linha.sugestao ?? 0),
        ]),
      ),
    );
    // A sugestão é uma soma em base, e escrita em embalagens daria "4,1012658":
    // a linha semeada abre em base, qualquer que seja a escolha guardada.
    setUnidades(
      Object.fromEntries(semeadas.map((linha) => [linha.insumoId, "base"])),
    );
    limparSemente();
  }, [todas, semente]);

  const valores = useMemo(() => {
    const mapa: Record<string, number | null> = {};
    for (const linha of todas) {
      const valor = numeroContado(digitados[linha.insumoId] ?? "");
      mapa[linha.insumoId] =
        valor === null
          ? null
          : naBase(
              valor,
              unidadeDoCampo(
                linha,
                unidades[linha.insumoId] ?? guardadas[linha.insumoId],
              ),
              linha.tamanhoEmbalagem,
            );
    }
    return mapa;
  }, [todas, digitados, unidades, guardadas]);

  /** O que precisa de olho e ainda não ganhou número nesta contagem. */
  const aConferir = useMemo(
    () =>
      todas
        .filter(
          (linha) =>
            valores[linha.insumoId] === null &&
            precisaConferir(linha, projecoes.get(linha.insumoId)),
        )
        .map((linha) => linha.insumoId),
    [todas, valores, projecoes],
  );

  // Decide uma vez, com os materiais e as fornadas na mão. Recorte vazio ou
  // igual à despensa inteira não tem pílula: seria escolher a lista entre ela
  // mesma. Durante o render, e não num efeito, para a lista inteira não piscar
  // antes do recorte.
  if (recorte === undefined && !carregando && !carregandoFornadas) {
    const util =
      !semente && aConferir.length > 0 && aConferir.length < todas.length;
    setComPilulas(util);
    setRecorte(util ? new Set(aConferir) : null);
  }

  function escrever(insumoId: string, texto: string) {
    setDigitados((anteriores) => ({ ...anteriores, [insumoId]: texto }));
  }

  /** Limpa campos e rascunho, e o recorte se decide de novo sem o que ela tinha digitado. */
  function comecarDeNovo() {
    setDigitados({});
    setUnidades({});
    setRetomado(null);
    setRecorte(undefined);
  }

  /** Trocar com número digitado converte o número: é o mesmo, dito de outro jeito. */
  function trocarUnidade(linha: LinhaDeContagem) {
    const de = unidadeDe(linha);
    const para: UnidadeDoCampo = de === "base" ? "embalagem" : "base";
    const valor = numeroContado(digitados[linha.insumoId] ?? "");
    if (valor !== null) {
      escrever(
        linha.insumoId,
        daBaseParaCampo(
          naBase(valor, de, linha.tamanhoEmbalagem),
          para,
          linha.tamanhoEmbalagem,
        ),
      );
    }
    setUnidades((anteriores) => ({ ...anteriores, [linha.insumoId]: para }));
    guardarUnidadeDaContagem(linha.insumoId, para);
  }

  /**
   * "Igual" (`#d330`): o número anotado, na unidade da linha. Quando a conta
   * em embalagens não fecha (1000 g em latas de 395 g), a linha passa a base
   * nesta contagem: confirmar o mesmo número não pode gravar 1000,14 g.
   */
  function confirmarIgual(linha: LinhaDeContagem) {
    const anotado = linha.contagem.anotado;
    if (anotado === null) return;
    const unidade = unidadeDe(linha);
    const texto = daBaseParaCampo(anotado, unidade, linha.tamanhoEmbalagem);
    const volta = naBase(
      numeroContado(texto) ?? -1,
      unidade,
      linha.tamanhoEmbalagem,
    );
    if (volta === anotado) {
      escrever(linha.insumoId, texto);
      return;
    }
    setUnidades((anteriores) => ({ ...anteriores, [linha.insumoId]: "base" }));
    escrever(linha.insumoId, textoContado(anotado));
  }

  // Inclusive o que a compra semeou: a proposta que sai da contagem é trabalho
  // perdido também (`DECISOES.md#d134`).
  const sujo = Object.values(valores).some((quantidade) => quantidade !== null);
  const guarda = useGuardaDeSaida(sujo);

  // O rodapé conta o que está na tela e o que ela já tocou fora dela: salvar
  // grava tudo o que foi tocado, inclusive o que o recorte esconde, e o rodapé
  // não pode dizer zero com número digitado (`#d331`).
  const naTela = new Set(linhas.map((linha) => linha.insumoId));
  const resumo = resumoDaContagem(
    todas
      .filter(
        (linha) =>
          naTela.has(linha.insumoId) || valores[linha.insumoId] !== null,
      )
      .map((linha) => linha.insumoId),
    valores,
  );
  const corredores = agruparPorCorredor(linhas);

  /**
   * Salvar não espera o servidor, e é deliberado.
   *
   * **A despensa é o pior sinal da casa** — é o fundo, atrás da cozinha, e é
   * onde a contagem acontece por definição. A promessa de uma escrita do
   * Firestore não resolve enquanto não há rede, então um `await` aqui deixaria o
   * botão preso em "salvando" exatamente no lugar em que esta tela existe para
   * funcionar. O cache local já aplicou, e o selo de sincronização conta a
   * verdade sobre o que ainda não subiu (`DECISOES.md#d40`).
   */
  function salvar() {
    const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));

    const contagens = todas.reduce<ContagemGravavel[]>((lista, linha) => {
      const quantidade = valores[linha.insumoId];
      const insumo = porId.get(linha.insumoId);
      if (quantidade === null || quantidade === undefined || !insumo) {
        return lista;
      }
      return [...lista, { insumo, quantidade }];
    }, []);

    if (contagens.length === 0) return;

    setFalha(null);
    salvarContagem(contaId, contagens, hoje).catch(() =>
      setFalha("Não deu para salvar a contagem agora."),
    );
    apagarRascunho(contaId);

    // Volta para onde ela veio: o efeito que ela quer ver está na outra tela.
    void guarda.navegar("/compras");
  }

  return (
    <>
      {/* Vinda da compra, "digite só o que você conferir" seria uma instrução
          para campos que já nasceram cheios. */}
      <CabecalhoPagina
        titulo="Contar a despensa"
        descricao={
          semente
            ? "Confira na prateleira antes de salvar. Zero também é contagem: é você dizendo que acabou."
            : "Digite só o que você conferir. Zero também é contagem: é você dizendo que acabou."
        }
        voltar={{ href: "/compras", rotulo: "Compras" }}
        pendente={pendente}
      />

      {/* A oferta da compra: os campos já vêm somados, e cada linha diz de onde
          o número saiu. A compra sabe quanto entrou e não sabe o que saiu desde
          então — por isso ela propõe, e nunca grava sozinha. */}
      {semente && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-sunken px-4 py-3 text-label text-ink">
          <ShoppingBasket
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
          <span className="max-w-[62ch]">
            Os campos já vêm com o que{" "}
            {semente.origem === "NOTA" ? "a nota" : "a compra"} trouxe, somado à
            sua última contagem. Confira na prateleira e corrija o que não
            bater: nada é gravado antes de você salvar.
          </span>
        </p>
      )}

      {/* O recorte: só as linhas que a compra trouxe, ou a despensa inteira.
          Pílulas como as de período em `/compras`, porque é a mesma escolha. */}
      {semente && (
        <Pilulas
          className="mt-4"
          rotulo="O que contar"
          numerico
          opcoes={[
            {
              valor: true,
              rotulo: `Só o que ${semente.origem === "NOTA" ? "a nota" : "a compra"} trouxe (${semente.entradas.size})`,
            },
            { valor: false, rotulo: `A despensa inteira (${todas.length})` },
          ]}
          valor={soDaCompra}
          aoMudar={setSoDaCompra}
        />
      )}

      {/* O que voltou do aparelho, com a hora: ela reconhece a contagem dela
          antes de continuar. Sem modal: continuar é não fazer nada. */}
      {retomado && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-line bg-sunken py-1 pl-4 pr-1 text-label text-ink">
          <p className="flex items-start gap-2.5 py-2">
            <History
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-muted"
              strokeWidth={1.75}
            />
            <span>
              Continuando a contagem das {horaDe(retomado.salvoEm)}:{" "}
              {linhasJaDigitadas(Object.keys(retomado.digitados).length)}.
            </span>
          </p>
          <button
            type="button"
            onClick={comecarDeNovo}
            className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
          >
            Começar de novo
          </button>
        </div>
      )}

      {/* Sem compra, o mesmo mecanismo: o recorte do que precisa de olho. Ele
          se refaz ao trocar de pílula, e o que já ganhou número sai dele. */}
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
            { valor: false, rotulo: `A despensa inteira (${todas.length})` },
          ]}
          valor={!!recorte}
          aoMudar={(precisa) => setRecorte(precisa ? new Set(aConferir) : null)}
        />
      )}

      <div className="mt-4 space-y-4 pb-52 lg:pb-44">
        {carregando || (!semente && recorte === undefined) ? (
          <div role="status" aria-label="Carregando" className="space-y-4">
            {[0, 1].map((indice) => (
              <Esqueleto key={indice} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : erro ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não deu para carregar seus materiais"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          </div>
        ) : linhas.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não há o que contar ainda"
              descricao="A contagem lista os materiais que você já cadastrou. Cadastre a farinha, e ela aparece aqui na próxima vez."
              acao={
                <Link
                  href="/insumos"
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Cadastrar material
                </Link>
              }
            />
          </div>
        ) : (
          corredores.map((corredor) => {
            // Como o rodapé, conta as linhas visíveis do corredor.
            const { contadas, total } = resumoDaContagem(
              corredor.itens.map((linha) => linha.insumoId),
              valores,
            );
            const completo = contadas === total;
            return (
              <section
                key={corredor.categoria}
                aria-labelledby={`corredor-${corredor.categoria}`}
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <h2
                  id={`corredor-${corredor.categoria}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
                >
                  {ROTULO_CORREDOR[corredor.categoria]}
                  <span
                    className={cn(
                      "num flex items-center gap-1 text-label font-normal tabular-nums",
                      completo ? "text-positive" : "text-ink-muted",
                    )}
                  >
                    {completo && (
                      <Check
                        aria-hidden
                        className="size-3.5"
                        strokeWidth={2.5}
                      />
                    )}
                    {contadas} de {total}
                    <span className="sr-only">
                      {" "}
                      {total === 1 ? "contado" : "contados"}
                    </span>
                  </span>
                </h2>
                <ul className="divide-y divide-line">
                  {corredor.itens.map((linha) => (
                    <LinhaContagem
                      key={linha.insumoId}
                      linha={linha}
                      projecao={projecoes.get(linha.insumoId)}
                      origem={semente?.origem}
                      texto={digitados[linha.insumoId] ?? ""}
                      unidade={unidadeDe(linha)}
                      aoMudar={(texto) => escrever(linha.insumoId, texto)}
                      aoTrocarUnidade={() => trocarUnidade(linha)}
                      aoIgual={() => confirmarIgual(linha)}
                    />
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}
      </div>

      {guarda.dialogo}

      {linhas.length > 0 && (
        <RodapeContagem resumo={resumo} aoSalvar={salvar} />
      )}
    </>
  );
}
