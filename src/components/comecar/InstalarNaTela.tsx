"use client";

import { useSyncExternalStore } from "react";
import { Download, Monitor, Share, Smartphone } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { useMediaQuery } from "@/lib/hooks/useDispositivo";
import {
  assinarInstalacao,
  instalar,
  lerInstalacao,
  lerInstalacaoNoServidor,
} from "@/lib/utils/instalacao";
import { SecaoGuia } from "./SecaoGuia";

/** Sem assinatura: nenhum aparelho vira instalado no meio da leitura. */
const SEM_MUDANCA = () => () => undefined;

function useEstadoDaInstalacao() {
  return useSyncExternalStore(
    assinarInstalacao,
    lerInstalacao,
    lerInstalacaoNoServidor,
  );
}

/**
 * Instalado é uma pergunta que o navegador responde sozinho, e por isso nada
 * disto é gravado (`DECISOES.md#d71`): um booleano em `Conta` seria um campo
 * para uma resposta que já existe, e que muda por aparelho.
 *
 * `display-mode: standalone` é a resposta padrão. `navigator.standalone` é a
 * do iPhone antigo, que é justamente o aparelho para o qual a 5A rasterizou os
 * ícones (`#d44`) — perguntar só pela consulta de mídia deixaria o convite de
 * pé em cima do app já instalado, que é o caso que a spec proíbe. `instalou` é
 * o `appinstalled` desta visita: a aba onde ela aceitou continua navegador.
 */
export function useInstalado(): boolean {
  const porMidia = useMediaQuery("(display-mode: standalone)");

  const porIOS = useSyncExternalStore(
    SEM_MUDANCA,
    () =>
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );

  const { instalou } = useEstadoDaInstalacao();

  return porMidia || porIOS || instalou;
}

/**
 * O convite para pôr o sistema na tela de início.
 *
 * Onde o navegador entrega o próprio convite (`beforeinstallprompt`), é um
 * botão, e as instruções somem (`#d295`). Onde não entrega, o texto sai de
 * `pointer: coarse` e **nunca** de user-agent: o que decide a instrução é o
 * dedo ou o mouse na frente dela.
 *
 * **A seção inteira some com o app instalado**, e não só o miolo: um título
 * sozinho, sem nada embaixo, seria pior do que o convite repetido.
 */
export function InstalarNaTela({ id }: { id: string }) {
  const instalado = useInstalado();
  const { podeInstalar } = useEstadoDaInstalacao();
  const noDedo = useMediaQuery("(pointer: coarse)");

  if (instalado) return null;

  const Icone = noDedo ? Smartphone : Monitor;

  return (
    <SecaoGuia
      id={id}
      titulo="Instalar na tela de início"
      descricao="Aberto pelo ícone, o sistema abre direto no que você estava fazendo e continua funcionando sem internet, como qualquer outro aplicativo do aparelho."
    >
      {podeInstalar ? (
        <Botao
          iconeInicial={
            <Download aria-hidden className="size-4" strokeWidth={2} />
          }
          onClick={() => void instalar()}
        >
          Instalar o Rende
        </Botao>
      ) : (
        <div className="flex gap-3 rounded-lg bg-sunken px-4 py-4 lg:px-5">
          <Icone
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />

          <div className="min-w-0 space-y-2 text-label text-ink-muted">
            {noDedo ? (
              <>
                <p className="max-w-[62ch]">
                  <span className="font-semibold text-ink">No iPhone:</span>{" "}
                  toque no botão de compartilhar{" "}
                  <Share
                    aria-hidden
                    className="inline size-4 align-[-0.125em] text-ink-muted"
                    strokeWidth={1.75}
                  />
                  , na barra de baixo do Safari, e depois em &ldquo;Adicionar à
                  Tela de Início&rdquo;.
                </p>
                <p className="max-w-[62ch]">
                  <span className="font-semibold text-ink">No Android:</span> o
                  próprio navegador costuma oferecer. Se não oferecer, o menu de
                  três pontinhos tem &ldquo;Instalar aplicativo&rdquo;.
                </p>
              </>
            ) : (
              <>
                <p className="max-w-[62ch]">
                  <span className="font-semibold text-ink">
                    No Chrome ou no Edge:
                  </span>{" "}
                  o ícone de instalar aparece no fim da barra de endereço.
                </p>
                <p className="max-w-[62ch]">
                  Instalado, o sistema ganha janela própria, sem abas e sem
                  barra de endereço. No celular, que é onde ele mais serve, a
                  instalação é pelo próprio navegador: no iPhone, pelo botão de
                  compartilhar; no Android, pela oferta do Chrome.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </SecaoGuia>
  );
}
