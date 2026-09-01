"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/CabecalhoPagina";
import { classesBotao } from "@/components/ui/estilosBotao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";

const SAUDACAO_POR_HORA = (hora: number) => {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
};

export default function PaginaHoje() {
  const agora = new Date();
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);

  return (
    <>
      <CabecalhoPagina
        titulo={`${SAUDACAO_POR_HORA(agora.getHours())}, Maynara`}
        descricao={data.charAt(0).toUpperCase() + data.slice(1)}
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
