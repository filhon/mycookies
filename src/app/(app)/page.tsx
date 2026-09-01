"use client";

import Link from "next/link";
import { CalendarDays, Settings } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { classesBotao } from "@/components/ui/estilosBotao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useAuth } from "@/providers/AuthProvider";

const SAUDACAO_POR_HORA = (hora: number) => {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
};

export default function PaginaHoje() {
  const { conta } = useAuth();
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

  return (
    <>
      <CabecalhoPagina
        titulo={conta ? `${saudacao}, ${conta.proprietaria}` : saudacao}
        descricao={data.charAt(0).toUpperCase() + data.slice(1)}
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

      <section aria-labelledby="titulo-entregas" className="mt-6">
        <h2
          id="titulo-entregas"
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          <CalendarDays
            aria-hidden
            className="size-5 text-ink-muted"
            strokeWidth={1.75}
          />
          Entregas de hoje
        </h2>

        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
          <EstadoVazio
            titulo="A agenda entra no ar com o módulo de pedidos"
            descricao="Enquanto isso, cadastre seus insumos: é deles que sai o custo de toda receita, e nenhum preço fica de pé sem esse alicerce."
            acao={
              <Link
                href="/insumos"
                className={classesBotao({
                  variante: "primaria",
                  tamanho: "lg",
                })}
              >
                Cadastrar insumos
              </Link>
            }
          />
        </div>
      </section>
    </>
  );
}
