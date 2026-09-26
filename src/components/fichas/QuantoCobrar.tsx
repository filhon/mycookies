"use client";

import Link from "next/link";
import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { TrendingDown } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { EsqueletoLista } from "@/components/ui/Esqueleto";
import { classesBotao } from "@/components/ui/estilosBotao";
import { custosDeHoje } from "@/lib/domain/custoFicha";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { formatarMoeda } from "@/lib/domain/money";
import { lerPedidoDeBusca } from "@/lib/domain/precificacao";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { Centavos, FichaTecnica, Insumo } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useContaId } from "@/providers/AuthProvider";
import { ID_FICHA_NOVA } from "./EditorFicha";

/** Mais que isso é lista, e a lista mora em `/fichas`. */
const LINHAS = 6;

/**
 * A resposta de "quanto cobro por isso?" na tela Hoje (spec 047,
 * `DECISOES.md#d216`): o total da quantidade que a cliente pediu, e o que
 * sobra dele com o custo de hoje, o mesmo de `CartaoNoVermelhoHoje` e da seta
 * de `/fichas` (`#d135`). O campo mora no cabeçalho da página; aqui chega só o
 * texto.
 *
 * As consultas são as do cartão do vermelho, que a Hoje já assina: o
 * Firestore divide o mesmo alvo, e nada novo sai para a rede.
 */
export function QuantoCobrar({ busca }: { busca: string }) {
  const contaId = useContaId();
  const { quantidade, termo } = lerPedidoDeBusca(busca);

  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const consultaInsumos = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const insumos = useColecao<Insumo>(consultaInsumos);

  const hojes = useMemo(
    () => custosDeHoje(fichas.dados, insumos.dados),
    [fichas.dados, insumos.dados],
  );

  // A mesma chave de `/fichas`, para as duas buscas não discordarem.
  const chave = chaveDeBusca(termo);
  const achadas = fichas.dados.filter(
    (ficha) =>
      ficha.ativo &&
      ficha.precificacao.precoVenda > 0 &&
      ficha.nomeBusca.includes(chave),
  );

  const carregando = fichas.carregando || insumos.carregando;

  return (
    <section aria-label="Quanto cobrar" className="mt-4">
      {/* A contagem anuncia a mudança uma vez; a lista não fala sozinha. */}
      <p aria-live="polite" className="text-label text-ink-muted">
        {carregando
          ? "Carregando"
          : achadas.length === 0
            ? "Nenhum produto"
            : `${achadas.length} ${achadas.length === 1 ? "produto" : "produtos"}`}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
        {carregando ? (
          <EsqueletoLista />
        ) : achadas.length === 0 ? (
          <p className="px-4 py-4 text-body text-ink">
            {termo
              ? `Nenhum produto com "${termo}".`
              : "Nenhum produto com preço ainda."}{" "}
            O preço sai da ficha:{" "}
            <Link
              href={`/fichas/${ID_FICHA_NOVA}`}
              className={classesBotao({ variante: "terciaria" })}
            >
              Montar um produto
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {achadas.slice(0, LINHAS).map((ficha, indice) => (
              <LinhaQuantoCobrar
                key={ficha.id}
                ficha={ficha}
                quantidade={quantidade}
                sobraUnitaria={
                  hojes.get(ficha.id)?.sobra ?? ficha.precificacao.lucroUnitario
                }
                // Só na primeira: é o número que ela vai mandar, e o ponto é
                // único na tela (o mês não está nela enquanto a busca está).
                comPonto={indice === 0}
              />
            ))}
          </ul>
        )}
      </div>

      {achadas.length > LINHAS && (
        <Link
          href="/fichas"
          className={classesBotao({ variante: "terciaria", className: "mt-2" })}
        >
          Ver os {achadas.length} produtos
        </Link>
      )}
    </section>
  );
}

function LinhaQuantoCobrar({
  ficha,
  quantidade,
  sobraUnitaria,
  comPonto,
}: {
  ficha: FichaTecnica;
  quantidade: number;
  sobraUnitaria: Centavos;
  comPonto: boolean;
}) {
  const preco = ficha.precificacao.precoVenda;
  const total = Math.round(quantidade * preco);
  const sobra = Math.round(quantidade * sobraUnitaria);
  // "Depois da maquininha" só é verdade quando a taxa está dentro da sobra.
  const maquininha = ficha.precificacao.taxaCartaoConsiderada > 0;

  return (
    <li>
      <Link
        href={`/fichas/${ficha.id}`}
        className="block px-4 py-3 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {ficha.nome}
          </span>
          <span className="num shrink-0 text-label text-ink-muted">
            {quantidade.toLocaleString("pt-BR")} × {formatarMoeda(preco)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center justify-end gap-2">
          <Dinheiro centavos={total} tamanho="lg" className="text-ink" />
          {/* Nas outras linhas o lugar do ponto fica vazio: os totais
              alinham em coluna. */}
          <span
            aria-hidden
            className={cn(
              "inline-block size-2.5 shrink-0 rounded-full",
              comPonto && "bg-accent-500",
            )}
          />
        </span>

        {sobra < 0 ? (
          // Cor nunca sozinha: sinal, ícone e a palavra.
          <span className="mt-0.5 flex items-center gap-1.5 text-label text-negative">
            <TrendingDown
              aria-hidden
              className="size-4 shrink-0"
              strokeWidth={2}
            />
            <span>
              <span className="num font-semibold">
                −{formatarMoeda(Math.abs(sobra))}
              </span>
              : você paga isso para vender
            </span>
          </span>
        ) : (
          <span className="mt-0.5 block text-label text-ink-muted">
            sobram{" "}
            <span className="num font-semibold text-ink">
              {formatarMoeda(sobra)}
            </span>{" "}
            pra você{maquininha && ", depois da maquininha"}
          </span>
        )}
      </Link>
    </li>
  );
}
