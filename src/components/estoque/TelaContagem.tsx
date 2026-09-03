"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Plus } from "lucide-react";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { classesBotao } from "@/components/ui/estilosBotao";
import { LinhaContagem } from "./LinhaContagem";
import { RodapeContagem } from "./RodapeContagem";
import { dataISODe } from "@/lib/domain/datas";
import {
  linhasParaContar,
  numeroContado,
  resumoDaContagem,
} from "@/lib/domain/estoque";
import { agruparPorCorredor, ROTULO_CORREDOR } from "@/lib/domain/listaCompras";
import { colInsumos } from "@/lib/firebase/colecoes";
import {
  salvarContagem,
  type ContagemGravavel,
} from "@/lib/firebase/mutations/estoque";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/**
 * Nenhuma compra semeia os campos nesta sessão: a semeadura pela nota e pelo
 * fechamento da lista é da 7B. O mapa vazio mora fora do componente para não
 * nascer de novo a cada render e refazer as linhas por nada.
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
  const router = useRouter();

  // O dia congela na abertura: a contagem começada às 23h50 é datada no dia em
  // que ela a começou, e não em dois dias diferentes conforme a linha.
  const [hoje] = useState(() => dataISODe(new Date()));
  const [digitados, setDigitados] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<string | null>(null);

  const consulta = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const {
    dados: insumos,
    carregando,
    erro,
    pendente,
  } = useColecao<Insumo>(consulta);

  const linhas = useMemo(
    () => linhasParaContar(insumos, SEM_ENTRADAS, hoje),
    [insumos, hoje],
  );

  const valores = useMemo(() => {
    const mapa: Record<string, number | null> = {};
    for (const linha of linhas) {
      mapa[linha.insumoId] = numeroContado(digitados[linha.insumoId] ?? "");
    }
    return mapa;
  }, [linhas, digitados]);

  const resumo = resumoDaContagem(linhas, valores);
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

    const contagens = linhas.reduce<ContagemGravavel[]>((lista, linha) => {
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

    // Volta para onde ela veio: o efeito que ela quer ver está na outra tela.
    router.push("/compras");
  }

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 pb-3 pt-3 lg:-mx-8 lg:px-8 lg:pb-4 lg:pt-6">
        <Link
          href="/compras"
          className="toque -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          Compras
        </Link>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-display text-title font-semibold text-ink lg:text-display">
            Contar a despensa
          </h1>
          <SeloSincronizacao pendente={pendente} />
        </div>

        <p className="mt-1 max-w-[60ch] text-label text-ink-muted lg:text-body">
          Digite só o que você conferir. Zero também é contagem: é você dizendo
          que acabou.
        </p>
      </header>

      <div className="mt-4 space-y-4 pb-52 lg:pb-44">
        {carregando ? (
          <div role="status" aria-label="Carregando" className="space-y-4">
            {[0, 1].map((indice) => (
              <Esqueleto key={indice} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : erro ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não deu para carregar seus insumos"
              descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
            />
          </div>
        ) : linhas.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <EstadoVazio
              titulo="Não há o que contar ainda"
              descricao="A contagem lista os insumos que você já cadastrou. Cadastre a farinha, e ela aparece aqui na próxima vez."
              acao={
                <Link
                  href="/insumos"
                  className={classesBotao({
                    variante: "primaria",
                    tamanho: "lg",
                  })}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2} />
                  Cadastrar insumo
                </Link>
              }
            />
          </div>
        ) : (
          corredores.map((corredor) => (
            <section
              key={corredor.categoria}
              aria-labelledby={`corredor-${corredor.categoria}`}
              className="overflow-hidden rounded-lg border border-line bg-surface"
            >
              <h2
                id={`corredor-${corredor.categoria}`}
                className="border-b border-line px-4 pb-3 pt-4 text-subheading font-semibold text-ink lg:px-5"
              >
                {ROTULO_CORREDOR[corredor.categoria]}
              </h2>
              <ul className="divide-y divide-line">
                {corredor.itens.map((linha) => (
                  <LinhaContagem
                    key={linha.insumoId}
                    linha={linha}
                    texto={digitados[linha.insumoId] ?? ""}
                    aoMudar={(texto) =>
                      setDigitados((anteriores) => ({
                        ...anteriores,
                        [linha.insumoId]: texto,
                      }))
                    }
                  />
                ))}
              </ul>
            </section>
          ))
        )}

        {falha && (
          <p role="alert" className="text-label text-negative">
            {falha}
          </p>
        )}
      </div>

      {linhas.length > 0 && (
        <RodapeContagem resumo={resumo} aoSalvar={salvar} />
      )}
    </>
  );
}
