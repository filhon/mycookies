"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { Check, CookingPot, Package } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { listarNomes } from "@/components/producao/FraseDaCapacidade";
import { PainelFornada } from "@/components/producao/PainelFornada";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Pilulas } from "@/components/ui/Pilulas";
import { RodapeFixo } from "@/components/ui/RodapeFixo";
import { ehEmbalagem, rotuloDaQuantidade } from "@/lib/domain/custoFicha";
import { dataISODe } from "@/lib/domain/datas";
import {
  escalarItens,
  FORNADAS_DA_BANCADA,
  passosDoPreparo,
} from "@/lib/domain/preparo";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "@/lib/hooks/useColecao";
import { useTelaAcesa } from "@/lib/hooks/useTelaAcesa";
import type { DataISO, FichaTecnica, Fornada, Insumo } from "@/lib/types";
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
          <p className="num mt-3 text-body text-ink-muted">
            Rende{" "}
            <span className="font-semibold text-ink">
              {rotuloDaQuantidade(unidades, ficha.unidadeRendimento)}
            </span>
          </p>
        </section>

        <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10 lg:space-y-0">
          <section aria-labelledby="bancada-ingredientes">
            <h2
              id="bancada-ingredientes"
              className="text-subheading font-semibold text-ink"
            >
              Ingredientes
            </h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {ingredientes.map((item) => (
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
                    className="items-center"
                  >
                    <span className="min-w-0 flex-1 text-body">
                      {item.nomeSnapshot}
                    </span>
                    <span className="num shrink-0 text-heading font-semibold">
                      {item.rotulo}
                    </span>
                  </LinhaMarcavel>
                </li>
              ))}
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
          </section>

          <section aria-labelledby="bancada-preparo">
            <h2
              id="bancada-preparo"
              className="text-subheading font-semibold text-ink"
            >
              Como se faz
            </h2>
            {passos.length === 0 ? (
              <p className="mt-3 max-w-[56ch] text-body text-ink-muted">
                Este produto ainda não tem o modo de preparo.{" "}
                <Link
                  href={doProduto}
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
                      <span className="min-w-0 flex-1 text-body leading-[1.75]">
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
            <span className="size-5 rounded-full border-2 border-line-strong" />
          ))
        )}
      </span>
      {children}
    </button>
  );
}
