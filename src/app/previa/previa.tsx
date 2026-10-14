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
 * - A fonte mora aqui, em bytes (`FamiljenGrotesk-Bold.ttf`, licença em `OFL.txt`):
 *   baixar do Google Fonts no build poria rede no build.
 */

export const CORES_DA_PREVIA = {
  canvas: "#F8F5F0", // --canvas, tema claro
  tinta: "#121A2D", // --ink
  tintaApagada: "#5B6375", // --ink-muted
} as const;

export const TAMANHO_DA_PREVIA = { width: 1200, height: 630 };

// Relativo à raiz do projeto: é de lá que o build roda.
const DISPLAY_700 = readFile(
  join(process.cwd(), "src/app/previa/FamiljenGrotesk-Bold.ttf"),
);
// O logotipo cobalto do pacote, já em curvas: entra como imagem.
const LOGOTIPO = readFile(
  join(process.cwd(), "public/marca/rende-principal.svg"),
  "base64",
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
        fontFamily: "Familjen Grotesk",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- `ImageResponse` não tem `next/image`. */}
      <img
        src={`data:image/svg+xml;base64,${await LOGOTIPO}`}
        width={194}
        height={52}
        alt="Rende"
      />

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
          name: "Familjen Grotesk",
          data: await DISPLAY_700,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
