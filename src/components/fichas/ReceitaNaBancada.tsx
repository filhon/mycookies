"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { orderBy, query, where } from "firebase/firestore";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CookingPot,
  Package,
  PackageOpen,
  RotateCcw,
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
  passosDoPreparo,
  preparoNaBancada,
  quantidadeNaBancada,
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

/** O que a aba guarda: as fornadas e o que já foi para a tigela. */
interface Marcas {
  fator: number;
  /** `insumoId`, ou `{preparoId}/{insumoId}` para o de dentro do preparo (`#d349`). */
  itens: string[];
  passos: number[];
}

const SEM_MARCAS: Marcas = { fator: 1, itens: [], passos: [] };

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

      <div className="mt-6 space-y-8 pb-32 lg:pb-36">
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
                onClick={() =>
                  setMarcas({ ...SEM_MARCAS, fator: marcas.fator })
                }
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
                {passos.map((passo, indice) => (
                  <li key={indice}>
                    <LinhaMarcavel
                      feito={marcas.passos.includes(indice)}
                      aoTocar={() =>
                        setMarcas({
                          ...marcas,
                          passos: alternar(marcas.passos, indice),
                        })
                      }
                      marcador={
                        <span className="num text-body font-semibold">
                          {indice + 1}
                        </span>
                      }
                      className="items-start"
                    >
                      <span className="min-w-0 flex-1 text-subheading leading-[1.6]">
                        {passo}
                      </span>
                    </LinhaMarcavel>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <RodapeFixo noPe>
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
          setMarcas({ ...SEM_MARCAS, fator: marcas.fator });
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
