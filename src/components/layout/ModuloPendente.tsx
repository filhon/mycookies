import type { Route } from "next";
import Link from "next/link";
import { CabecalhoPagina } from "./CabecalhoPagina";
import { classesBotao } from "@/components/ui/estilosBotao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";

/**
 * Placa honesta no lugar de uma tela vazia sem explicação: diz o que vem,
 * de que depende, e para onde ir agora.
 */
export function ModuloPendente({
  titulo,
  descricao,
  oQueVem,
  proximoPasso,
}: {
  titulo: string;
  descricao: string;
  oQueVem: string;
  proximoPasso: { href: Route; rotulo: string };
}) {
  return (
    <>
      <CabecalhoPagina titulo={titulo} descricao={descricao} />
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        <EstadoVazio
          titulo="Ainda não construído"
          descricao={oQueVem}
          acao={
            <Link
              href={proximoPasso.href}
              className={classesBotao({ variante: "primaria", tamanho: "lg" })}
            >
              {proximoPasso.rotulo}
            </Link>
          }
        />
      </div>
    </>
  );
}
