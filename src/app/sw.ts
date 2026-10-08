import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import {
  CACHE_NOTA_COMPARTILHADA,
  ENTRADA_NOTA_COMPARTILHADA,
} from "@/lib/utils/notaCompartilhada";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// `/__/auth/*` e `/__/firebase/*` são do Firebase, servidos pelo `rewrites`
// (spec 043, `DECISOES.md#d199`). Uma resposta em cache, ou a página offline,
// no lugar de `/__/auth/handler` quebra o login do Google em silêncio: o
// ouvinte vem antes do Serwist e o cala, e o navegador busca na rede.
self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/__/")) {
    evento.stopImmediatePropagation();
    return;
  }
  // A nota que chega pelo "Compartilhar" do Android (spec 092, `#d294`). O
  // mesmo ouvinte, e não uma rota do Serwist: a resposta não é cache nem rede.
  if (
    evento.request.method === "POST" &&
    url.pathname === "/insumos/nota/compartilhar"
  ) {
    evento.stopImmediatePropagation();
    evento.respondWith(guardarNotaCompartilhada(evento.request));
  }
});

/**
 * Guarda o primeiro arquivo `nota` no Cache Storage e manda para a leitura.
 * Nada passa pela rede: compartilhar funciona sem sinal. Uma entrada só, e a
 * nota compartilhada por cima substitui a anterior. `TelaNota` lê e apaga.
 */
async function guardarNotaCompartilhada(pedido: Request): Promise<Response> {
  try {
    const arquivo = (await pedido.formData()).get("nota");
    if (arquivo instanceof File) {
      const cache = await caches.open(CACHE_NOTA_COMPARTILHADA);
      await cache.put(
        ENTRADA_NOTA_COMPARTILHADA,
        new Response(arquivo, {
          headers: {
            "content-type": arquivo.type,
            // Cabeçalho é ASCII; o nome do WhatsApp nem sempre.
            "x-nome": encodeURIComponent(arquivo.name),
          },
        }),
      );
    }
  } catch {
    // Sem o arquivo, a tela abre na porta de sempre.
  }
  return Response.redirect(new URL("/insumos/nota", self.location.origin), 303);
}

serwist.addEventListeners();
