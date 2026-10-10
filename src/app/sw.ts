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

/**
 * O aviso de pedido novo (spec 119, `DECISOES.md#d323`). O FCM entrega
 * `{ data: { titulo, corpo, url, tag }, from, fcmMessageId, … }`: a forma que o
 * próprio `firebase/messaging/sw` lê com `event.data.json()`. Só `data`, e
 * quem desenha é este ouvinte.
 */
interface AvisoRecebido {
  titulo: string;
  corpo: string;
  url: string;
  tag: string;
}

function lerAviso(dados: PushMessageData | null): AvisoRecebido | null {
  try {
    const aviso = (dados?.json() as { data?: Partial<AvisoRecebido> })?.data;
    if (typeof aviso?.titulo !== "string" || typeof aviso.url !== "string") {
      return null;
    }
    return {
      titulo: aviso.titulo,
      corpo: aviso.corpo ?? "",
      url: aviso.url,
      tag: aviso.tag ?? aviso.url,
    };
  } catch {
    return null;
  }
}

/** As janelas do app, e não as do cardápio público, que não têm a faixa. */
async function janelasDoApp(): Promise<WindowClient[]> {
  const janelas = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  // ponytail: só `/c/` sai; `/conheca` e os guias visíveis engolem o aviso.
  // Pedir confirmação da janela quando alguém estiver nelas na hora do pedido.
  return janelas.filter(
    (janela) => !new URL(janela.url).pathname.startsWith("/c/"),
  );
}

self.addEventListener("push", (evento) => {
  const aviso = lerAviso(evento.data);
  if (!aviso) return;
  evento.waitUntil(
    (async () => {
      // App aberto e visível: a faixa no lugar da notificação do sistema.
      // ponytail: o Safari pode cortar a assinatura depois de alguns push sem
      // notificação; o `renovarAviso` da abertura seguinte refaz o token.
      const visivel = (await janelasDoApp()).find(
        (janela) => janela.visibilityState === "visible",
      );
      if (visivel) {
        visivel.postMessage({ tipo: "pedido-novo", ...aviso });
        return;
      }
      await self.registration.showNotification(aviso.titulo, {
        body: aviso.corpo,
        tag: aviso.tag,
        icon: "/icons/icone-192.png",
        data: { url: aviso.url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(
    (evento.notification.data as { url?: string } | null)?.url ?? "/pedidos",
    self.location.origin,
  ).href;
  evento.waitUntil(
    (async () => {
      const janela = (await janelasDoApp())[0];
      if (janela) {
        try {
          await janela.focus();
          await janela.navigate(url);
          return;
        } catch {
          // Janela fora do controle deste service worker: abre outra.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

serwist.addEventListeners();
