"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Consulta de mídia como fonte externa de verdade.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: a largura da tela
 * é estado do navegador, não do React. Assinar direto elimina o render extra e
 * o piscar de layout que o par estado/efeito provoca.
 *
 * O instantâneo do servidor é `false`: mobile-first é o padrão honesto quando
 * ainda não se sabe o tamanho da tela.
 */
export function useMediaQuery(consulta: string): boolean {
  const inscrever = useCallback(
    (aoMudar: () => void) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener("change", aoMudar);
      return () => mq.removeEventListener("change", aoMudar);
    },
    [consulta],
  );

  return useSyncExternalStore(
    inscrever,
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}

/** Ponto de virada estrutural: barra lateral em vez de navegação inferior. */
export function useDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

function inscreverConexao(aoMudar: () => void) {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

/**
 * `navigator.onLine` sozinho mente (Wi-Fi conectado sem internet), mas serve
 * como sinal imediato. O estado real de sincronização vem dos metadados do
 * Firestore, expostos pelos hooks de coleção.
 */
export function useConexao(): boolean {
  return useSyncExternalStore(
    inscreverConexao,
    () => navigator.onLine,
    () => true,
  );
}
