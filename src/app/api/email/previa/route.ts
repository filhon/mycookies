import { NextResponse } from "next/server";
import { RESPONSAVEL } from "@/app/(auth)/responsavel";
import { URL_DO_SITE } from "@/app/site";
import {
  boasVindas,
  mesFechado,
  metaBatida,
  senhaNova,
  testeAcabando,
  type Peca,
} from "@/lib/email/pecas";
import { enviarEmail } from "@/lib/server/email";

/**
 * As cinco peças com os dados dos moldes de `docs/specs/044-emails/`, para
 * conferir no navegador (`?peca=…`) e no Gmail do celular (`&enviar=1`, para
 * `RESPONSAVEL.email`). Só existe no `npm run dev`.
 */
export const dynamic = "force-dynamic";

const PECAS: Record<string, () => Peca> = {
  "boas-vindas": () =>
    boasVindas({
      nome: "Carla",
      email: "carla@exemplo.com",
      acabaEmISO: "2026-10-09",
    }),
  "senha-nova": () =>
    senhaNova({
      email: "carla@exemplo.com",
      link: `${URL_DO_SITE}/redefinir-senha?mode=resetPassword&oobCode=EXEMPLO&lang=pt-BR`,
    }),
  "teste-acabando": () =>
    testeAcabando({
      nome: "Carla",
      negocio: "Doces da Carla",
      acabaEmISO: "2026-10-09",
      faltam: 3,
      diasDeUso: 11,
      produtos: 6,
      noVermelho: 2,
      pior: { nome: "torta de limão", perdaPorUnidade: 38, minimo: 464 },
      pedidos: 14,
      entrou: 184000,
      precos: {
        ESSENCIAL: { mensal: 2900, anual: 29000 },
        COMPLETO: { mensal: 4900, anual: 49000 },
      },
    }),
  "meta-batida": () =>
    metaBatida({
      competencia: "2026-09",
      entrou: 451200,
      alvo: 400000,
      diaQueBateu: 22,
    }),
  "mes-fechado": () =>
    mesFechado({
      competencia: "2026-09",
      entrou: 451200,
      saiu: 329960,
      pedidos: 38,
      maisVendido: { nome: "Cookie clássico", unidades: 212 },
      meta: { alvo: 400000, diaQueBateu: 22 },
      metaDoProximo: false,
    }),
};

export async function GET(requisicao: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(requisicao.url);
  const nome = url.searchParams.get("peca") ?? "";
  const fabricar = PECAS[nome];
  if (!fabricar) {
    return new NextResponse(`?peca=${Object.keys(PECAS).join(" | ")}`, {
      status: 404,
    });
  }

  const peca = fabricar();
  if (url.searchParams.get("enviar") === "1") {
    const resultado = await enviarEmail({
      para: RESPONSAVEL.email,
      peca,
      chave: `previa/${nome}/${Date.now()}`,
    });
    return NextResponse.json({ resultado, para: RESPONSAVEL.email });
  }

  return new NextResponse(peca.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
