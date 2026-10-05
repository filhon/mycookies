"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Botao } from "./Botao";

/**
 * Assinar com o dedo (spec 087, `#d289`): um `<canvas>` com eventos de
 * ponteiro, fundo transparente e traço `--ink`. A área é papel (`folha`): no
 * tema escuro o `--ink` de fora seria claro, e a assinatura sumiria na folha.
 *
 * Entrega um PNG recortado no traço, para a assinatura encher a linha da
 * folha; a redução e o teto são de quem recebe (`CampoImagem`), os mesmos da
 * imagem escolhida.
 */
export function AreaDeAssinatura({
  aoUsar,
}: {
  aoUsar: (arquivo: File) => void;
}) {
  const tela = useRef<HTMLCanvasElement | null>(null);
  // Onde o traço passou, em pixels do canvas: é o recorte do PNG.
  const caixa = useRef<{ x0: number; y0: number; x1: number; y1: number }>(
    null,
  );
  const desenhando = useRef(false);
  const [vazia, setVazia] = useState(true);

  // Ref de função estável: o tamanho em pixels do aparelho é medido uma vez, ao
  // montar, e um novo render não apaga o que ela desenhou.
  // ponytail: girar o celular com a área aberta estica o traço; "Limpar" resolve.
  const montar = useCallback((elemento: HTMLCanvasElement | null) => {
    tela.current = elemento;
    if (!elemento) return;
    const escala = devicePixelRatio || 1;
    elemento.width = Math.round(elemento.clientWidth * escala);
    elemento.height = Math.round(elemento.clientHeight * escala);
    const pincel = elemento.getContext("2d");
    if (!pincel) return;
    pincel.scale(escala, escala);
    pincel.lineWidth = 2.5;
    pincel.lineCap = "round";
    pincel.lineJoin = "round";
    // Navegador que não lê `oklch` no canvas ignora a atribuição e fica no preto.
    pincel.strokeStyle = getComputedStyle(elemento).getPropertyValue("--ink");
  }, []);

  function ponto(evento: PointerEvent<HTMLCanvasElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    return {
      x: evento.clientX - retangulo.left,
      y: evento.clientY - retangulo.top,
    };
  }

  function marcar(x: number, y: number) {
    const escala = devicePixelRatio || 1;
    const [px, py] = [x * escala, y * escala];
    const atual = caixa.current;
    caixa.current = atual
      ? {
          x0: Math.min(atual.x0, px),
          y0: Math.min(atual.y0, py),
          x1: Math.max(atual.x1, px),
          y1: Math.max(atual.y1, py),
        }
      : { x0: px, y0: py, x1: px, y1: py };
  }

  function comecar(evento: PointerEvent<HTMLCanvasElement>) {
    const pincel = tela.current?.getContext("2d");
    if (!pincel) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    desenhando.current = true;
    const { x, y } = ponto(evento);
    pincel.beginPath();
    pincel.moveTo(x, y);
    // Um toque sem arrastar ainda deixa um ponto.
    pincel.lineTo(x + 0.1, y);
    pincel.stroke();
    marcar(x, y);
    setVazia(false);
  }

  function mover(evento: PointerEvent<HTMLCanvasElement>) {
    const pincel = tela.current?.getContext("2d");
    if (!desenhando.current || !pincel) return;
    const { x, y } = ponto(evento);
    pincel.lineTo(x, y);
    pincel.stroke();
    marcar(x, y);
  }

  function parar() {
    desenhando.current = false;
  }

  function limpar() {
    const elemento = tela.current;
    elemento
      ?.getContext("2d")
      ?.clearRect(0, 0, elemento.width, elemento.height);
    caixa.current = null;
    setVazia(true);
  }

  function usar() {
    const elemento = tela.current;
    const traco = caixa.current;
    if (!elemento || !traco) return;
    // A folga é a meia largura do traço, para a ponta não sair cortada.
    const folga = Math.ceil(4 * (devicePixelRatio || 1));
    const x = Math.max(0, Math.floor(traco.x0 - folga));
    const y = Math.max(0, Math.floor(traco.y0 - folga));
    const largura = Math.min(elemento.width, Math.ceil(traco.x1 + folga)) - x;
    const altura = Math.min(elemento.height, Math.ceil(traco.y1 + folga)) - y;

    const recorte = document.createElement("canvas");
    recorte.width = largura;
    recorte.height = altura;
    recorte
      .getContext("2d")
      ?.drawImage(elemento, x, y, largura, altura, 0, 0, largura, altura);
    recorte.toBlob((blob) => {
      if (blob)
        aoUsar(new File([blob], "assinatura.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-2">
      {/* A linha da folha, para ela saber onde apoiar. Fica fora do canvas:
          não vai para o PNG. */}
      <div className="folha relative h-40 w-full! min-h-0! rounded-md border border-line-strong p-0!">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 bottom-10 border-t border-line-strong"
        />
        <canvas
          ref={montar}
          role="img"
          aria-label="Área para assinar com o dedo ou o mouse"
          className="relative size-full touch-none"
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={parar}
          onPointerCancel={parar}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao onClick={usar} disabled={vazia}>
          Usar esta
        </Botao>
        <Botao variante="terciaria" onClick={limpar} disabled={vazia}>
          Limpar
        </Botao>
      </div>
    </div>
  );
}
