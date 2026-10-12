"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { orderBy, query, where } from "firebase/firestore";
import {
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  CookingPot,
  Info,
  Package,
  PackageOpen,
  RotateCcw,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import {
  FraseDaCapacidade,
  listarNomes,
} from "@/components/producao/FraseDaCapacidade";
import { PainelFornada } from "@/components/producao/PainelFornada";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Pilulas } from "@/components/ui/Pilulas";
import { RodapeFixo } from "@/components/ui/RodapeFixo";
import { Selo } from "@/components/ui/Selo";
import {
  ehEmbalagem,
  fraseDaMassa,
  rotuloDaQuantidade,
} from "@/lib/domain/custoFicha";
import { dataISODe } from "@/lib/domain/datas";
import {
  escalarItens,
  FORNADAS_DA_BANCADA,
  mencoesNoPasso,
  passosDoPreparo,
  preparoNaBancada,
  quantidadeNaBancada,
  relogio,
  rotuloDoTempo,
  tempoNoPasso,
  temQuantidadeEscrita,
} from "@/lib/domain/preparo";
import {
  capacidadeDaFicha,
  consumoDesdeAContagem,
  potesDosPreparos,
} from "@/lib/domain/producao";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import { useTelaAcesa } from "@/lib/hooks/useTelaAcesa";
import type {
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  UnidadeBase,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { novoId } from "@/lib/utils/id";
import { useContaId } from "@/providers/AuthProvider";

const OPCOES_FORNADAS = FORNADAS_DA_BANCADA.map((valor) => ({
  valor,
  rotulo: valor === 0.5 ? "½" : String(valor),
}));

/**
 * A receita para ler durante a produção (`DECISOES.md#d343`): só leitura, a
 * tela acesa, e "Fiz a massa" no pé já com as fornadas escolhidas.
 *
 * Carrega o que a folha de registrar precisa e só então monta a bancada, para
 * que o que ficou na aba (`sessionStorage`) seja o estado inicial, e não um
 * efeito que reescreve a tela depois.
 */
export function ReceitaNaBancada({ id }: { id: string }) {
  const contaId = useContaId();
  const router = useRouter();
  const [hoje] = useState(() => dataISODe(new Date()));

  const consultaInsumos = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  // Todas as fichas, e não só esta: a folha resolve os componentes por elas.
  const consultaFichas = useMemo(
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

  const insumos = useColecao<Insumo>(consultaInsumos);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const fornadas = useColecao<Fornada>(consultaProducao);

  const carregando = insumos.carregando || fichas.carregando;
  const ficha = fichas.dados.find((candidata) => candidata.id === id);
  // Kit não tem receita, e ficha sem material não tem o que pesar: o editor
  // é quem diz o que falta (e o arquivado ou o endereço errado, também).
  const semBancada =
    !carregando &&
    (!ficha ||
      ficha.tipo !== "SIMPLES" ||
      ficha.itens.length + ficha.componentes.length === 0);

  useEffect(() => {
    if (semBancada) router.replace(`/fichas/${id}` as Route);
  }, [semBancada, router, id]);

  if (carregando || !ficha || semBancada) {
    return (
      <div role="status" aria-label="Carregando" className="space-y-4 pt-4">
        <Esqueleto className="h-10 w-2/3 rounded-md" />
        <Esqueleto className="h-11 w-56 rounded-full" />
        <Esqueleto className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <Bancada
      contaId={contaId}
      ficha={ficha}
      fichas={fichas.dados}
      insumos={insumos.dados}
      fornadas={fornadas.dados}
      hoje={hoje}
      pendente={fornadas.pendente}
    />
  );
}

/** Um relógio do passo (`#d351`): o fim como horário, para sair e voltar. */
interface RelogioDoPasso {
  passo: number;
  /** `Date.now()` do fim. */
  fim: number;
  segundos: number;
}

/** O que a aba guarda: as fornadas, o que já foi para a tigela e os relógios. */
interface Marcas {
  fator: number;
  /** `insumoId`, ou `{preparoId}/{insumoId}` para o de dentro do preparo (`#d349`). */
  itens: string[];
  passos: number[];
  relogios: RelogioDoPasso[];
}

const SEM_MARCAS: Marcas = { fator: 1, itens: [], passos: [], relogios: [] };

const MAXIMO_DE_RELOGIOS = 3;

/** Fora do componente: só se chama no toque, nunca ao desenhar. */
const daquiA = (segundos: number) => Date.now() + segundos * 1000;

// O rodapé cresce uma linha por relógio: o fim da página e a margem de
// rolagem do passo da vez crescem junto, para nada ficar embaixo dele.
const FOLGA_DO_RODAPE = [
  { pagina: "pb-32 lg:pb-36", passo: "scroll-mb-28 lg:scroll-mb-32" },
  { pagina: "pb-48 lg:pb-52", passo: "scroll-mb-44 lg:scroll-mb-48" },
  { pagina: "pb-60 lg:pb-64", passo: "scroll-mb-56 lg:scroll-mb-60" },
  { pagina: "pb-72 lg:pb-76", passo: "scroll-mb-68 lg:scroll-mb-72" },
] as const;

const chaveDaAba = (fichaId: string) => `rende:bancada:${fichaId}`;

/**
 * Da aba, e nunca do Firestore (`#d343`): a marca é da fornada de agora, e a
 * esquecida de ontem seria um ingrediente pulado hoje. Fechar a aba limpa.
 */
function lerMarcas(fichaId: string): Marcas {
  try {
    const guardado = sessionStorage.getItem(chaveDaAba(fichaId));
    return guardado ? { ...SEM_MARCAS, ...JSON.parse(guardado) } : SEM_MARCAS;
  } catch {
    return SEM_MARCAS;
  }
}

function guardarMarcas(fichaId: string, marcas: Marcas) {
  try {
    sessionStorage.setItem(chaveDaAba(fichaId), JSON.stringify(marcas));
  } catch {
    // Aba privada ou cheia: a marca vive só na tela, e ainda serve.
  }
}

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((atual) => atual !== valor)
    : [...lista, valor];
}

function Bancada({
  contaId,
  ficha,
  fichas,
  insumos,
  fornadas,
  hoje,
  pendente,
}: {
  contaId: string;
  ficha: FichaTecnica;
  fichas: FichaTecnica[];
  insumos: Insumo[];
  fornadas: Fornada[];
  hoje: DataISO;
  pendente: boolean;
}) {
  const router = useRouter();
  const doProduto = `/fichas/${ficha.id}` as Route;
  const [marcas, setMarcasNaTela] = useState(() => lerMarcas(ficha.id));
  const [painel, setPainel] = useState({ aberto: false, chave: "" });
  const [registrada, setRegistrada] = useState(false);

  useTelaAcesa(true);

  function setMarcas(novas: Marcas) {
    setMarcasNaTela(novas);
    guardarMarcas(ficha.id, novas);
  }

  // Começar de novo e registrar a massa limpam as marcas, não o forno.
  const marcasLimpas = () => ({
    ...SEM_MARCAS,
    fator: marcas.fator,
    relogios: marcas.relogios,
  });

  // O navegador só libera o som depois de um toque: o do relógio serve.
  const som = useRef<AudioContext | null>(null);
  function contar(passo: number, segundos: number) {
    try {
      som.current ??= new AudioContext();
      void som.current.resume();
    } catch {
      // Sem áudio, fica a vibração e a linha.
    }
    setMarcas({
      ...marcas,
      relogios: [
        ...marcas.relogios,
        { passo, fim: daquiA(segundos), segundos },
      ],
    });
  }
  const pararRelogio = (fim: number) =>
    setMarcas({
      ...marcas,
      relogios: marcas.relogios.filter((r) => r.fim !== fim),
    });

  // O preparo vai para a tigela como um ingrediente, pesado (`#d345`).
  const unidadeDe = new Map(fichas.map((f) => [f.id, f.unidadeRendimento]));
  const daMassa = [
    ...ficha.itens.filter((item) => !ehEmbalagem(item.categoria)),
    ...ficha.componentes.map((componente) => ({
      insumoId: componente.fichaId,
      nomeSnapshot: componente.nomeSnapshot,
      categoria: "INGREDIENTE" as const,
      quantidade: componente.quantidade,
      unidadeBase:
        unidadeDe.get(componente.fichaId) === "ml"
          ? ("ml" as const)
          : ("g" as const),
    })),
  ];
  const embalagem = ficha.itens.filter((item) => ehEmbalagem(item.categoria));
  const ingredientes = escalarItens(daMassa, marcas.fator);
  const passos = passosDoPreparo(ficha.modoPreparo);
  const unidades = ficha.rendimento * marcas.fator;
  const massa = fraseDaMassa(
    daMassa,
    ficha.rendimento,
    ficha.unidadeRendimento,
    marcas.fator,
  );
  const naTigela = ingredientes.filter((item) =>
    marcas.itens.includes(item.insumoId),
  ).length;
  const feitos = passos.filter((_, indice) =>
    marcas.passos.includes(indice),
  ).length;
  // O passo da vez é o primeiro não marcado; tudo marcado, nenhum (`#d350`).
  const agora = passos.findIndex(
    (_, indice) => !marcas.passos.includes(indice),
  );

  // Marcar leva o da vez para a tela, só se ele estiver fora dela.
  const passoDaVez = useRef<HTMLLIElement>(null);
  const rolar = useRef(false);
  useEffect(() => {
    if (!rolar.current) return;
    rolar.current = false;
    passoDaVez.current?.scrollIntoView({
      block: "nearest",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [marcas.passos]);

  // "Dá para fazer agora?", e não "dá para vender mais?": sem `prometido`,
  // porque a massa de agora é quase sempre a dos próprios pedidos (`#d348`).
  const capacidade = capacidadeDaFicha(
    ficha,
    fichas,
    insumos,
    consumoDesdeAContagem(fornadas, insumos),
    hoje,
  );
  // Só o contado que não dá. A linha do preparo não casa com linha da
  // capacidade: o aviso vai nos de dentro (`#d349`). As pílulas não travam.
  const naoDa = new Map(
    (capacidade?.insumos ?? []).flatMap((linha) =>
      linha.tem !== null &&
      linha.tem + 1e-6 < linha.precisaPorLote * marcas.fator
        ? [[linha.insumoId, quantidadeNaBancada(linha.tem, linha.unidadeBase)]]
        : [],
    ),
  );
  const folga = FOLGA_DO_RODAPE[marcas.relogios.length] ?? FOLGA_DO_RODAPE[0];
  const contando = new Set(marcas.relogios.map((r) => r.passo));
  const cheio = marcas.relogios.length >= MAXIMO_DE_RELOGIOS;

  // O pote de cada preparo, como a folha da fornada lê (`#d346`).
  const potes = potesDosPreparos(ficha, fichas, fornadas, hoje);
  const preparoDe = new Map(
    ficha.componentes.flatMap((componente) => {
      const preparo = fichas.find((f) => f.id === componente.fichaId);
      return preparo ? [[preparo.id, preparo] as const] : [];
    }),
  );

  return (
    <>
      <CabecalhoPagina
        titulo={ficha.nome}
        voltar={{ href: doProduto, rotulo: "Produto" }}
        pendente={pendente}
      />

      <div className={cn("mt-6 space-y-8", folga.pagina)}>
        <section aria-labelledby="bancada-fornadas">
          <h2
            id="bancada-fornadas"
            className="text-subheading font-semibold text-ink"
          >
            Quantas fornadas
          </h2>
          <Pilulas
            className="mt-3"
            rotulo="Quantas fornadas"
            numerico
            opcoes={OPCOES_FORNADAS}
            valor={marcas.fator}
            aoMudar={(fator) => setMarcas({ ...marcas, fator })}
          />
          {/* A bolinha não muda com as fornadas; a massa muda (`#d347`). */}
          <p className="num mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body text-ink-muted">
            <span>
              Rende{" "}
              <span className="font-semibold text-ink">
                {rotuloDaQuantidade(unidades, ficha.unidadeRendimento)}
              </span>
            </span>
            {massa && <span>{massa}</span>}
          </p>
          {capacidade && (
            <FraseDaCapacidade capacidade={capacidade} className="mt-2" />
          )}
        </section>

        {/* Sem passos, nada de segunda coluna vazia: a lista fica numa
            coluna só e o convite vai embaixo (`#d347`). */}
        <div
          className={cn(
            "space-y-8",
            passos.length > 0
              ? "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10 lg:space-y-0"
              : "max-w-2xl",
          )}
        >
          <section aria-labelledby="bancada-ingredientes">
            <TituloComContagem
              id="bancada-ingredientes"
              titulo="Ingredientes"
              feitos={naTigela}
              total={ingredientes.length}
              parcial="na tigela"
              tudo="Tudo na tigela"
            />
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {ingredientes.map((item) => {
                const tem = naoDa.get(item.insumoId);
                const preparo = preparoDe.get(item.insumoId);
                return (
                  <li key={item.insumoId}>
                    <LinhaMarcavel
                      feito={marcas.itens.includes(item.insumoId)}
                      aoTocar={() =>
                        setMarcas({
                          ...marcas,
                          itens: alternar(marcas.itens, item.insumoId),
                        })
                      }
                      marcador={null}
                      className="min-h-16 items-center"
                    >
                      {/* A letra da bancada, maior que a do app: é a única
                        tela que se lê a meio metro (`#d347`). */}
                      <span className="min-w-0 flex-1">
                        <span className="block text-heading">
                          {item.nomeSnapshot}
                        </span>
                        {preparo && (
                          <Selo tom="neutro" className="mt-1">
                            Preparo
                          </Selo>
                        )}
                        {/* O triângulo e a palavra levam o aviso; a cor não
                          decide sozinha (`#d348`). */}
                        {tem && (
                          <span className="num mt-0.5 flex items-center gap-1.5 text-label text-attention">
                            <TriangleAlert
                              aria-hidden
                              className="size-3.5 shrink-0"
                              strokeWidth={2}
                            />
                            tem {tem}
                          </span>
                        )}
                      </span>
                      <span className="num shrink-0 text-title font-semibold">
                        {item.rotulo}
                      </span>
                    </LinhaMarcavel>
                    {preparo && (
                      <DentroDoPreparo
                        preparo={preparo}
                        pede={item.quantidade}
                        unidade={item.unidadeBase}
                        pote={potes.get(preparo.id)}
                        marcas={marcas.itens}
                        aoMarcar={(chave) =>
                          setMarcas({
                            ...marcas,
                            itens: alternar(marcas.itens, chave),
                          })
                        }
                        naoDa={naoDa}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {embalagem.length > 0 && (
              <p className="mt-3 flex items-start gap-2 text-label text-ink-muted">
                <Package
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  Na embalagem:{" "}
                  {listarNomes(
                    embalagem.map((item) => item.nomeSnapshot),
                    embalagem.length,
                  )}
                </span>
              </p>
            )}
            {/* Sem confirmação: perder marcas não é destrutivo, e um modal
                na bancada seria pior que remarcar (`#d347`). */}
            {/* As marcas de dentro do preparo contam aqui, não no "4 de 12". */}
            {marcas.itens.length + feitos > 0 && (
              <Botao
                variante="terciaria"
                tamanho="sm"
                className="mt-2 -ml-3"
                iconeInicial={
                  <RotateCcw
                    aria-hidden
                    className="size-4"
                    strokeWidth={1.75}
                  />
                }
                onClick={() => setMarcas(marcasLimpas())}
              >
                Começar de novo
              </Botao>
            )}
          </section>

          <section aria-labelledby="bancada-preparo">
            <TituloComContagem
              id="bancada-preparo"
              titulo="Como se faz"
              feitos={feitos}
              total={passos.length}
              parcial="feitos"
              tudo="Tudo feito"
            />
            {passos.length === 0 ? (
              <p className="mt-3 max-w-[56ch] text-body text-ink-muted">
                Este produto ainda não tem o modo de preparo.{" "}
                <Link
                  href={`${doProduto}#como-se-faz` as Route}
                  className="font-medium text-brand-ink underline underline-offset-4"
                >
                  Escreva no produto
                </Link>{" "}
                e ele aparece aqui.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {passos.map((passo, indice) => {
                  const tempo = tempoNoPasso(passo);
                  return (
                    // Do mesmo tamanho dos outros: crescer faria a lista pular
                    // a cada marca. A margem deixa o rodapé fixo fora da conta.
                    <li
                      key={indice}
                      ref={indice === agora ? passoDaVez : undefined}
                      className={cn(
                        "flex items-start scroll-mt-20",
                        folga.passo,
                        indice === agora && "bg-brand-100",
                      )}
                    >
                      <LinhaMarcavel
                        className="min-w-0 flex-1 items-start"
                        feito={marcas.passos.includes(indice)}
                        aoTocar={() => {
                          rolar.current = !marcas.passos.includes(indice);
                          setMarcas({
                            ...marcas,
                            passos: alternar(marcas.passos, indice),
                          });
                        }}
                        marcador={
                          <span className="num text-body font-semibold">
                            {indice + 1}
                          </span>
                        }
                      >
                        <span className="min-w-0 flex-1">
                          {/* A palavra leva o sentido; o fundo só ajuda. */}
                          {indice === agora && (
                            <span className="block text-micro font-semibold text-brand-ink">
                              Agora
                            </span>
                          )}
                          <span className="block text-subheading leading-[1.6]">
                            {mencoesNoPasso(passo, ingredientes).map(
                              (pedaco, i) => (
                                <Fragment key={i}>
                                  {pedaco.texto}
                                  {pedaco.rotulo && (
                                    <>
                                      {" "}
                                      <span className="num font-semibold">
                                        {pedaco.rotulo}
                                      </span>
                                    </>
                                  )}
                                </Fragment>
                              ),
                            )}
                          </span>
                          {/* O texto nunca é reescrito: só se diz de quantas
                            fornadas ele é (`#d350`). */}
                          {marcas.fator !== 1 &&
                            temQuantidadeEscrita(passo) && (
                              <span className="mt-1 flex items-start gap-1.5 text-label text-ink-muted">
                                <Info
                                  aria-hidden
                                  className="mt-0.5 size-3.5 shrink-0 text-info"
                                  strokeWidth={2}
                                />
                                A quantidade escrita aqui é de 1 fornada.
                              </span>
                            )}
                        </span>
                      </LinhaMarcavel>
                      {/* Irmão do botão que marca, nunca dentro dele (`#d351`). */}
                      {tempo !== null && (
                        <Botao
                          variante="secundaria"
                          tamanho="sm"
                          className="num mt-1.5 mr-4 shrink-0 lg:mr-5"
                          aria-label={`Contar ${rotuloDoTempo(tempo)}`}
                          disabled={contando.has(indice) || cheio}
                          iconeInicial={
                            <Timer
                              aria-hidden
                              className="size-4"
                              strokeWidth={1.75}
                            />
                          }
                          onClick={() => contar(indice, tempo)}
                        >
                          {rotuloDoTempo(tempo)}
                        </Botao>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <RodapeFixo noPe>
        <Relogios
          relogios={marcas.relogios}
          passos={passos}
          som={som}
          aoParar={pararRelogio}
        />
        <div className="p-3 lg:px-5">
          <Botao
            variante="primaria"
            tamanho="lg"
            larguraTotal
            iconeInicial={
              <CookingPot aria-hidden className="size-5" strokeWidth={1.75} />
            }
            onClick={() =>
              setPainel({ aberto: true, chave: `bancada-${novoId()}` })
            }
          >
            Fiz a massa
          </Botao>
        </div>
      </RodapeFixo>

      <PainelFornada
        aberto={painel.aberto}
        chave={painel.chave}
        aoFechar={() => {
          setPainel({ aberto: false, chave: painel.chave });
          // "Contar o que está pronto" também fecha por aqui, e a navegação
          // do link dele vem depois desta: a última vence.
          if (registrada) router.push(doProduto);
        }}
        aoRegistrar={() => {
          setRegistrada(true);
          setMarcas(marcasLimpas());
        }}
        contaId={contaId}
        opcoes={[{ ficha, unidades }]}
        fichas={fichas}
        insumos={insumos}
        fornadas={fornadas}
        hoje={hoje}
      />
    </>
  );
}

/**
 * Os relógios dos passos, acima do "Fiz a massa" (`#d351`): um por linha, o
 * começo do passo e o que falta. No zero, a linha vira "Pronto" com o sino e
 * o tom de atenção, e toca até ela tocar na linha.
 */
function Relogios({
  relogios,
  passos,
  som,
  aoParar,
}: {
  relogios: RelogioDoPasso[];
  passos: string[];
  som: RefObject<AudioContext | null>;
  aoParar: (fim: number) => void;
}) {
  const [agora, setAgora] = useState(() => daquiA(0));
  const ativo = relogios.length > 0;
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setAgora(daquiA(0)), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  // Um bipe a cada dois segundos enquanto houver um pronto sem resposta.
  const prontos = relogios.filter((r) => r.fim <= agora).length;
  useEffect(() => {
    if (prontos > 0 && Math.floor(agora / 1000) % 2 === 0) bipe(som.current);
  }, [prontos, agora, som]);

  if (!ativo) return null;
  return (
    <div className="border-b border-line">
      <ul className="divide-y divide-line">
        {relogios.map((r) => {
          // O começo do passo, cortado pela largura.
          const nome = passos[r.passo] ?? "Passo";
          // `agora` atrasa até um tique: o relógio nunca passa do tempo dado.
          const falta = Math.min(r.segundos, (r.fim - agora) / 1000);
          return (
            <li key={r.fim}>
              {falta <= 0 ? (
                // O sino e a palavra levam o aviso; o tom só ajuda.
                <button
                  type="button"
                  onClick={() => aoParar(r.fim)}
                  className="flex min-h-12 w-full items-center gap-3 bg-attention-soft px-4 text-left text-attention transition-colors duration-150 ease-quart lg:px-5"
                >
                  <BellRing
                    aria-hidden
                    className="size-5 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span
                    role="alert"
                    className="min-w-0 flex-1 truncate text-body font-semibold"
                  >
                    Pronto: {nome}
                  </span>
                  <span className="shrink-0 text-label font-medium">
                    Desligar
                  </span>
                </button>
              ) : (
                <div className="flex min-h-12 items-center gap-3 pr-1 pl-4 lg:pr-2 lg:pl-5">
                  <Timer
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {nome}
                  </span>
                  <span className="num shrink-0 text-heading font-semibold text-ink">
                    {relogio(falta)}
                  </span>
                  <Botao
                    variante="terciaria"
                    tamanho="sm"
                    onClick={() => aoParar(r.fim)}
                  >
                    Parar
                  </Botao>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {/* Sem push, o navegador não toca com o app fechado (`#d351`). */}
      <p className="px-4 pb-2 text-micro text-ink-muted lg:px-5">
        Toca com a bancada aberta.
      </p>
    </div>
  );
}

/** Um bipe curto feito na hora, sem arquivo de som, e a vibração onde há. */
function bipe(som: AudioContext | null) {
  if ("vibrate" in navigator) navigator.vibrate(200);
  if (!som) return;
  const t = som.currentTime;
  const tom = som.createOscillator();
  const volume = som.createGain();
  tom.frequency.value = 880;
  volume.gain.setValueAtTime(0.0001, t);
  volume.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  tom.connect(volume).connect(som.destination);
  tom.start(t);
  tom.stop(t + 0.3);
}

/**
 * O preparo aberto na linha dele (`#d349`): a frase do pote num segundo botão,
 * embaixo da linha marcável e nunca dentro dela, e os ingredientes de dentro
 * na quantidade que esta massa pede. Sem pote, ou com pote que não dá, abre
 * sozinho: os ingredientes saem de fato. Com pote que dá, fica fechado e a
 * lista é a do "fiz junto?".
 */
function DentroDoPreparo({
  preparo,
  pede,
  unidade,
  pote,
  marcas,
  aoMarcar,
  naoDa,
}: {
  preparo: FichaTecnica;
  pede: number;
  unidade: UnidadeBase;
  pote: number | undefined;
  marcas: string[];
  aoMarcar: (chave: string) => void;
  naoDa: Map<string, string>;
}) {
  const idLista = useId();
  const {
    pote: tem,
    resto,
    ingredientes,
  } = preparoNaBancada(
    {
      rendimento: preparo.rendimento,
      itens: preparo.itens.filter((item) => !ehEmbalagem(item.categoria)),
    },
    pede,
    pote,
  );
  const saem = tem === null || resto > 0;
  // Ela escolhe; até lá, o padrão segue o pote e as pílulas.
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const aberto = escolha ?? saem;

  const q = (quantidade: number) => quantidadeNaBancada(quantidade, unidade);
  const ver =
    ingredientes.length === 1
      ? "Ver o ingrediente"
      : `Ver os ${ingredientes.length} ingredientes`;

  return (
    <>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idLista}
        onClick={() => setEscolha(!aberto)}
        className="flex min-h-11 w-full items-center gap-2 pr-4 pb-2 pl-14 text-left text-body text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:pr-5 lg:pl-15"
      >
        {tem !== null && (
          <PackageOpen
            aria-hidden
            className="size-4 shrink-0"
            strokeWidth={1.75}
          />
        )}
        <span className="num min-w-0 flex-1">
          {tem === null ? (
            ver
          ) : resto > 0 ? (
            `O pote tem ${q(tem)} · os outros ${q(resto)} saem dos ingredientes`
          ) : (
            <>
              Do pote: tem {q(tem)} · ficam {q(tem - pede)}
              <span className="block text-label">Fiz junto? {ver}</span>
            </>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 transition-transform duration-150 ease-quart",
            aberto && "rotate-180",
          )}
          strokeWidth={1.75}
        />
      </button>
      {/* Lista dentro da lista, recuada até o nome: nunca cartão no cartão. */}
      <div id={idLista} hidden={!aberto}>
        <ul className="divide-y divide-line border-t border-line">
          {ingredientes.map((item) => {
            const chave = `${preparo.id}/${item.insumoId}`;
            // O aviso só quando os de dentro saem de fato (`#d348`).
            const aviso = saem ? naoDa.get(item.insumoId) : undefined;
            return (
              <li key={chave}>
                <LinhaMarcavel
                  feito={marcas.includes(chave)}
                  aoTocar={() => aoMarcar(chave)}
                  marcador={null}
                  className="min-h-16 items-center pl-14 lg:pl-15"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-heading">
                      {item.nomeSnapshot}
                    </span>
                    {aviso && (
                      <span className="num mt-0.5 flex items-center gap-1.5 text-label text-attention">
                        <TriangleAlert
                          aria-hidden
                          className="size-3.5 shrink-0"
                          strokeWidth={2}
                        />
                        tem {aviso}
                      </span>
                    )}
                  </span>
                  <span className="num shrink-0 text-title font-semibold">
                    {item.rotulo}
                  </span>
                </LinhaMarcavel>
              </li>
            );
          })}
        </ul>
        {/* O gesto de voltar traz de volta; as marcas de cada bancada ficam
            separadas, pela chave da aba. */}
        <Link
          href={`/fichas/${preparo.id}/bancada` as Route}
          className="flex min-h-11 items-center gap-1 border-t border-line pr-4 pl-14 text-label font-medium text-brand-ink underline underline-offset-4 lg:pr-5 lg:pl-15"
        >
          Como se faz {preparo.nome}
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0"
            strokeWidth={1.75}
          />
        </Link>
      </div>
    </>
  );
}

/**
 * Uma linha que se marca com um toque: o alvo é a linha inteira, porque o
 * dedo vem sujo de massa. Feito, o `Check` toma o lugar do marcador e o texto
 * risca; o risco e o ícone dizem o que a cor sozinha não diz.
 */
function LinhaMarcavel({
  feito,
  aoTocar,
  marcador,
  className,
  children,
}: {
  feito: boolean;
  aoTocar: () => void;
  /** O número do passo; sem ele, um círculo vazio. */
  marcador: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={feito}
      onClick={aoTocar}
      className={cn(
        "flex min-h-14 w-full gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken lg:px-5",
        feito ? "text-ink-muted line-through" : "text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center"
      >
        {feito ? (
          <Check className="size-6 text-positive" strokeWidth={2.5} />
        ) : (
          (marcador ?? (
            // `--ink-muted`, e não `--border-strong`: aqui o anel é o único
            // sinal de que a linha se toca (`#d347`).
            <span className="size-6 rounded-full border-2 border-ink-muted" />
          ))
        )}
      </span>
      {children}
    </button>
  );
}

/**
 * O título da seção com quanto já foi, dentro do `h2` para que o leitor de
 * tela leia os dois juntos. Some com zero; tudo marcado leva o `Check`, sem
 * festa: nada se mexe perto de um número que ela está lendo.
 */
function TituloComContagem({
  id,
  titulo,
  feitos,
  total,
  parcial,
  tudo,
}: {
  id: string;
  titulo: string;
  feitos: number;
  total: number;
  parcial: string;
  tudo: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-baseline justify-between gap-3 text-subheading font-semibold text-ink"
    >
      <span>{titulo}</span>
      {feitos > 0 && (
        <span className="num flex items-center gap-1 text-label font-medium text-ink-muted">
          <span className="sr-only">, </span>
          {feitos >= total ? (
            <>
              <Check
                aria-hidden
                className="size-4 self-center text-positive"
                strokeWidth={2.5}
              />
              {tudo}
            </>
          ) : (
            `${feitos} de ${total} ${parcial}`
          )}
        </span>
      )}
    </h2>
  );
}
