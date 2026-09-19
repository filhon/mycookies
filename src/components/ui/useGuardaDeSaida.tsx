"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Confirmacao } from "./Confirmacao";

type Acao = () => void | Promise<void>;

/**
 * A guarda de "sair sem salvar". Enquanto `sujo`, qualquer saída da tela
 * passa por um diálogo: o link (captura do clique), o voltar do navegador
 * (sentinela no histórico, `#d132`) e recarregar ou fechar a aba
 * (`beforeunload`, cujo diálogo é do navegador e não este).
 *
 * `navegar(href)` é a saída de quem já salvou: desarma a sentinela e navega,
 * sem perguntar. `pedir(acao)` é para um botão que não é link (o "Sair" da
 * configuração). `dialogo` é renderizado uma vez pela tela.
 */
export function useGuardaDeSaida(sujo: boolean): {
  navegar: (href: Route) => Promise<void>;
  pedir: (acao: Acao) => void;
  dialogo: ReactNode;
} {
  const router = useRouter();
  const [pendente, setPendente] = useState<Acao | null>(null);
  const sujoRef = useRef(sujo);
  /** A sentinela está no histórico. */
  const armada = useRef(false);
  /** O `popstate` que o próprio hook provocou, à espera de resolver. */
  const desarme = useRef<(() => void) | null>(null);
  /** O diálogo aberto veio do voltar: "Continuar aqui" precisa rearmar. */
  const veioDoVoltar = useRef(false);
  /** A saída foi confirmada: nada mais pergunta até a ação terminar. */
  const liberado = useRef(false);

  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo]);

  const armar = useCallback(() => {
    if (armada.current) return;
    history.pushState(null, "", location.href);
    armada.current = true;
  }, []);

  /** Tira a sentinela e só resolve quando o navegador confirmou que tirou. */
  const desarmar = useCallback(
    () =>
      new Promise<void>((resolver) => {
        if (!armada.current) return resolver();
        armada.current = false;
        desarme.current = resolver;
        history.back();
      }),
    [],
  );

  // A sentinela entra quando há o que perder e sai quando não há mais
  // (salvou a configuração, desfez a edição à mão).
  useEffect(() => {
    if (sujo) armar();
    else void desarmar();
  }, [sujo, armar, desarmar]);

  const navegar = useCallback(
    async (href: Route) => {
      await desarmar();
      router.push(href);
    },
    [desarmar, router],
  );

  const pedir = useCallback((acao: Acao) => {
    if (!sujoRef.current || liberado.current) {
      void acao();
      return;
    }
    setPendente(() => acao);
  }, []);

  useEffect(() => {
    // Captura, e sem `stopPropagation`: o `onClick` do próprio link roda, e o
    // `Link` do Next desiste sozinho ao ver `defaultPrevented`.
    const aoClicar = (evento: MouseEvent) => {
      if (
        !sujoRef.current ||
        liberado.current ||
        evento.defaultPrevented ||
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      )
        return;
      const link = (evento.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (
        link.origin !== location.origin ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const destino = link.pathname + link.search;
      if (destino === location.pathname + location.search) return;
      evento.preventDefault();
      veioDoVoltar.current = false;
      setPendente(() => () => navegar(destino as Route));
    };

    const aoVoltar = () => {
      if (desarme.current) {
        desarme.current();
        desarme.current = null;
        return;
      }
      if (!armada.current || liberado.current) return;
      // O navegador consumiu a sentinela; a URL e o formulário não mudaram.
      armada.current = false;
      veioDoVoltar.current = true;
      setPendente(() => () => history.back());
    };

    const aoDescarregar = (evento: BeforeUnloadEvent) => {
      if (!sujoRef.current || liberado.current) return;
      evento.preventDefault();
    };

    document.addEventListener("click", aoClicar, true);
    window.addEventListener("popstate", aoVoltar);
    window.addEventListener("beforeunload", aoDescarregar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("popstate", aoVoltar);
      window.removeEventListener("beforeunload", aoDescarregar);
    };
  }, [navegar]);

  const continuar = useCallback(() => {
    setPendente(null);
    if (veioDoVoltar.current) {
      veioDoVoltar.current = false;
      if (sujoRef.current) armar();
    }
  }, [armar]);

  const confirmar = useCallback(async () => {
    const acao = pendente;
    setPendente(null);
    veioDoVoltar.current = false;
    if (!acao) return;
    liberado.current = true;
    try {
      await acao();
    } finally {
      // Se a ação não desmontou a tela (o `sair()` recusou por pendência,
      // `#d118`), a guarda volta a valer.
      liberado.current = false;
    }
  }, [pendente]);

  const dialogo = (
    <Confirmacao
      aberto={pendente !== null}
      titulo="Sair e perder o que você mudou?"
      descricao="Nada do que você mudou aqui foi salvo ainda."
      rotuloConfirmar="Sair sem salvar"
      rotuloCancelar="Continuar aqui"
      aoConfirmar={() => void confirmar()}
      aoCancelar={continuar}
    />
  );

  return { navegar, pedir, dialogo };
}
