import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
  if (url.origin === self.location.origin && url.pathname.startsWith("/__/")) {
    evento.stopImmediatePropagation();
  }
});

serwist.addEventListeners();
