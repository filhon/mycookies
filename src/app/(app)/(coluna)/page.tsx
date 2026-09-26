"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { FaixaDoTeste } from "@/components/assinatura/FaixaDoTeste";
import { CartaoPrimeirosPassos } from "@/components/comecar/CartaoPrimeirosPassos";
import { CartaoComprasHoje } from "@/components/compras/CartaoComprasHoje";
import { CartaoNoVermelhoHoje } from "@/components/fichas/CartaoNoVermelhoHoje";
import { CartaoDoMes } from "@/components/financeiro/CartaoDoMes";
import { AgendaHoje } from "@/components/pedidos/AgendaHoje";
import { cn } from "@/lib/utils/cn";
import { useAuth, usePapel } from "@/providers/AuthProvider";

const SAUDACAO_POR_HORA = (hora: number) => {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
};

export default function PaginaHoje() {
  const { conta } = useAuth();
  const dona = usePapel() === "DONA";
  const agora = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);

  // Sem nome próprio em código: ele vem de `conta.proprietaria`. Enquanto a
  // primeira leitura não chega, a saudação vai sozinha — melhor um cumprimento
  // curto por um instante do que um nome de mentira que depois troca na tela.
  const saudacao = SAUDACAO_POR_HORA(agora.getHours());

  const doMes = (
    <>
      {/* Raro, e a consequência direta da compra que ela acabou de lançar:
          "o que eu faço agora" vem antes de "o que vem depois". */}
      <CartaoNoVermelhoHoje />

      {/* Na pilha, depois da agenda, porque é a ordem em que o dia acontece:
          ela vê o que entrega, e daí decide o que precisa comprar. */}
      <div className="order-last empty:hidden xl:order-0">
        <CartaoComprasHoje />
      </div>
    </>
  );

  return (
    <>
      <CabecalhoPagina
        titulo={conta ? `${saudacao}, ${conta.proprietaria}` : saudacao}
        descricao={data.charAt(0).toUpperCase() + data.slice(1)}
        descricaoSempreVisivel
        acao={
          // No desktop a configuração mora na barra lateral. No celular não há
          // barra lateral, e ela não cabe entre os cinco destinos da navegação
          // inferior: fica aqui, na tela de entrada, como em todo aplicativo.
          <Link
            href="/configuracao"
            aria-label="Configuração"
            className="toque flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink lg:hidden"
          >
            <Settings aria-hidden className="size-5" strokeWidth={1.75} />
          </Link>
        }
      />

      {/* Enquanto o caminho do começo não terminou, "o que eu faço agora" vem
          antes de "como estou indo". Quando ele termina, o cartão some e esta
          tela volta a ser exatamente o que era. */}
      {/* 16 px dentro de um grupo, 24 px entre grupos (spec 045). */}
      <div className="mt-6 flex flex-col gap-6">
        {/* Os três são da dona (spec 030): a cobrança, o caminho do começo e o
            mês, que lê `agregados`. Para a ajudante não montam, e por isso
            não assinam nada que a regra negaria. */}
        {dona && (
          <div className="space-y-4 empty:hidden">
            <FaixaDoTeste />
            <CartaoPrimeirosPassos />
          </div>
        )}

        {/* Uma estrutura só, dois arranjos (`#d212`): na pilha, o mês, o
            produto no vermelho, a agenda e as compras; a partir de `xl`, o dia
            à esquerda e o mês à direita. A seção do mês é `contents` na pilha
            para que seus cartões entrem na ordem da coluna única. A ajudante,
            sem o mês, fica na coluna única em qualquer largura. */}
        <div
          className={cn(
            "flex flex-col gap-6",
            dona &&
              "xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start",
          )}
        >
          {dona ? (
            // ponytail: `top-36` é a altura do cabeçalho no desktop mais 24 px,
            // medida à mão; muda se o cabeçalho mudar.
            <section
              aria-labelledby="hoje-o-mes"
              className="contents xl:sticky xl:top-36 xl:col-start-2 xl:row-start-1 xl:flex xl:flex-col xl:gap-4"
            >
              <h2 id="hoje-o-mes" className="sr-only">
                O mês
              </h2>
              <CartaoDoMes />
              {doMes}
            </section>
          ) : (
            doMes
          )}

          <section
            aria-labelledby="hoje-o-dia"
            className="xl:col-start-1 xl:row-start-1"
          >
            <h2 id="hoje-o-dia" className="sr-only">
              O dia
            </h2>
            <AgendaHoje />
          </section>
        </div>
      </div>
    </>
  );
}
