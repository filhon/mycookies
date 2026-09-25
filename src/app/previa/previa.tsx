import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * A imagem de prévia das páginas públicas (spec 039, `DECISOES.md#d183`): o
 * que aparece no WhatsApp antes de a página abrir. Gerada no build, pelos
 * `opengraph-image.tsx` de `/conheca` e da página do preço.
 *
 * Duas saídas da regra de sempre, as duas nomeadas no `#d183`:
 * - `ImageResponse` não lê variável CSS, então as cores são literais, com o
 *   token de `globals.css` ao lado. É o único hex fora de `globals.css`.
 * - A fonte mora aqui, em bytes (`Archivo-Bold.ttf`, licença em `OFL.txt`):
 *   baixar do Google Fonts no build poria rede no build.
 */

export const CORES_DA_PREVIA = {
  canvas: "#F7F4EE", // --canvas, tema claro
  tinta: "#22242E", // --ink
  tintaApagada: "#6A6C78", // --ink-muted
  ambar: "#D89B3C", // --accent-500, o ponto
} as const;

export const TAMANHO_DA_PREVIA = { width: 1200, height: 630 };

// Relativo à raiz do projeto: é de lá que o build roda.
const ARCHIVO_700 = readFile(
  join(process.cwd(), "src/app/previa/Archivo-Bold.ttf"),
);

export async function desenharPrevia({
  linhaDeCima,
  frase,
}: {
  linhaDeCima: string;
  frase: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: CORES_DA_PREVIA.canvas,
        fontFamily: "Archivo",
      }}
    >
      {/* O logotipo de `Marca.tsx`: "rende" em caixa baixa, fechado pelo
          ponto de 0,29em, 0,31em depois do "e". */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          fontSize: 56,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: CORES_DA_PREVIA.tinta,
        }}
      >
        rende
        <div
          style={{
            width: 16,
            height: 16,
            marginLeft: 17,
            marginBottom: 9,
            borderRadius: 9999,
            backgroundColor: CORES_DA_PREVIA.ambar,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 34, color: CORES_DA_PREVIA.tintaApagada }}>
          {linhaDeCima}
        </div>
        <div
          style={{
            fontSize: 76,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: CORES_DA_PREVIA.tinta,
          }}
        >
          {frase}
        </div>
      </div>
    </div>,
    {
      ...TAMANHO_DA_PREVIA,
      fonts: [
        {
          name: "Archivo",
          data: await ARCHIVO_700,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
