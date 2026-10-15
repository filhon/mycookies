import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A marca Rende em tela (`docs/marca/rende/MARCA.md` § 2.1 e § 2.4), território
 * Porções: o corte de 8° divide em porções, e a porção rosa é o que sobra pra
 * ela. O rosa do símbolo é a única peça rosa da marca; no resto da tela ele
 * marca só a sobra (`#d381`). Nenhum dos dois vira ícone de interface: para
 * isso existe o Lucide.
 *
 * Os dois são SVG inline com a cor em `currentColor`: `tinta` segue o tema
 * (`brand-ink`), `negativa` é papel sobre cobalto. O id do recorte vem do
 * `useId`, para que dois na mesma página não dividam máscara.
 */

type Tom = "tinta" | "negativa";

const COR: Record<Tom, string> = {
  tinta: "text-brand-ink",
  negativa: "text-on-brand",
};

function useIdSvg() {
  return useId().replace(/[^\w-]/g, "");
}

/*
 * A assadeira de `logo/rende-simbolo.svg` (80,15 × 67,92) em quatro porções,
 * com os cortes já abertos em polígono: cortes de 7,47 de espessura a 8°, o
 * mesmo `_geometria.json`. `CORTES` é o vão entre elas, que só a abertura
 * desenha.
 */
const PORCOES = [
  "0,0 21.04,0 11.49,67.92 0,67.92",
  "28.58,0 41.08,0 31.53,67.92 19.03,67.92",
  "48.62,0 61.12,0 51.57,67.92 39.07,67.92",
];
const PORCAO_ROSA = "68.66,0 80.15,0 80.15,67.92 59.11,67.92";
const CORTES = [
  "21.04,0 28.58,0 19.03,67.92 11.49,67.92",
  "41.08,0 48.62,0 39.07,67.92 31.53,67.92",
  "61.12,0 68.66,0 59.11,67.92 51.57,67.92",
];

/**
 * O símbolo: a assadeira cortada em quatro, a última porção rosa. Mínimo de
 * 24px (`size-6`). `abrindo` é a abertura do app: a assadeira inteira, os três
 * cortes abrindo da esquerda e a porção virando rosa (`globals.css`, § a
 * abertura); com movimento reduzido ele já chega cortado.
 */
export function Simbolo({
  tom = "tinta",
  abrindo = false,
  className,
}: {
  tom?: Tom;
  abrindo?: boolean;
  className?: string;
}) {
  const recorte = useIdSvg();
  return (
    <svg
      viewBox="0 0 80.15 67.92"
      aria-hidden="true"
      className={cn(
        "size-12 shrink-0",
        COR[tom],
        abrindo && "simbolo-abrindo",
        className,
      )}
    >
      <clipPath id={recorte}>
        <rect width="80.15" height="67.92" rx="4.75" />
      </clipPath>
      <g clipPath={`url(#${recorte})`} fill="currentColor">
        {PORCOES.map((pontos) => (
          <polygon key={pontos} points={pontos} />
        ))}
        <polygon
          points={PORCAO_ROSA}
          fill="var(--accent-500)"
          className="simbolo-rosa"
        />
        {abrindo &&
          CORTES.map((pontos, i) => (
            <polygon
              key={pontos}
              points={pontos}
              className="simbolo-corte"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            />
          ))}
      </g>
    </svg>
  );
}

/**
 * A porção rosa: o valor que sobra pra ela, e só ele (`MARCA.md` § 2.2). Uma
 * por tela, nunca em prejuízo, nunca em botão. A caixa leva o corte de 8°; o
 * texto fica reto. `sobre-rosa` passa a tinta de dentro (o "R$" do `Dinheiro`
 * também) para `on-accent`.
 */
export function Porcao({ children }: { children: ReactNode }) {
  return (
    <span className="sobre-rosa inline-block -skew-x-8 rounded-[3px] bg-accent-500 px-[0.3em] text-ink">
      <span className="inline-block skew-x-8">{children}</span>
    </span>
  );
}

/** As letras de `logo/rende-principal.svg`, em curvas: Familjen Grotesk 700. */
const LETRAS =
  "M13.50 66.67L0 66.67L0 16.67L12.33 16.67L12.33 25.83L14.33 25.83Q14.83 23.33 16.21 21.13Q17.58 18.92 20.42 17.54Q23.25 16.17 28.00 16.17L28.00 16.17L30.67 16.17L30.67 28.33L27.00 28.33Q19.92 28.33 16.71 31.92Q13.50 35.50 13.50 42.67L13.50 42.67L13.50 66.67ZM61.25 67.92L61.25 67.92Q49.42 67.92 43.21 60.83Q37 53.75 37 41.58L37 41.58Q37 33.42 39.79 27.58Q42.58 21.75 47.96 18.58Q53.33 15.42 61.08 15.42L61.08 15.42Q72.25 15.42 78.21 22.17Q84.17 28.92 84.17 42L84.17 42L84.17 44.83L50.17 44.83Q50.58 51.17 53.46 54.79Q56.33 58.42 61.25 58.42L61.25 58.42Q65.17 58.42 67.54 56.08Q69.92 53.75 70.67 50.67L70.67 50.67L83.50 50.67Q82.75 55.25 80.17 59.17Q77.58 63.08 72.92 65.50Q68.25 67.92 61.25 67.92ZM50.17 36.33L50.17 36.33L71 36.33Q70.67 30.67 68.17 27.54Q65.67 24.42 61 24.42L61 24.42Q56.42 24.42 53.63 27.38Q50.83 30.33 50.17 36.33ZM107.33 66.67L93.83 66.67L93.83 16.67L106.33 16.67L106.33 24.17L108.33 24.17Q109.83 20.42 112.96 17.92Q116.08 15.42 122.17 15.42L122.17 15.42Q130.50 15.42 134.67 20.67Q138.83 25.92 138.83 34.92L138.83 34.92L138.83 66.67L125.33 66.67L125.33 37.17Q125.33 32 123.50 29.21Q121.67 26.42 117.50 26.42L117.50 26.42Q112.67 26.42 110 30.21Q107.33 34 107.33 39.67L107.33 39.67L107.33 66.67ZM168.17 67.67L168.17 67.67Q161.33 67.67 156.92 64.29Q152.50 60.92 150.33 55Q148.17 49.08 148.17 41.58L148.17 41.58Q148.17 33.83 150.37 28Q152.58 22.17 157.04 18.92Q161.50 15.67 168.17 15.67L168.17 15.67Q173.08 15.67 176.21 17.42Q179.33 19.17 181.17 22.17L181.17 22.17L183.17 22.17L183.17 0L196.67 0L196.67 66.67L184.17 66.67L184.17 60.17L182.17 60.17Q180.42 63.33 177.08 65.50Q173.75 67.67 168.17 67.67ZM172 58.17L172 58.17Q177.08 58.17 180.13 53.71Q183.17 49.25 183.17 41.67L183.17 41.67Q183.17 34 180.13 29.58Q177.08 25.17 172 25.17L172 25.17Q167.42 25.17 164.79 29.29Q162.17 33.42 162.17 41.67L162.17 41.67Q162.17 49.92 164.79 54.04Q167.42 58.17 172 58.17ZM230.92 67.92L230.92 67.92Q219.08 67.92 212.87 60.83Q206.67 53.75 206.67 41.58L206.67 41.58Q206.67 33.42 209.46 27.58Q212.25 21.75 217.62 18.58Q223.00 15.42 230.75 15.42L230.75 15.42Q241.92 15.42 247.88 22.17Q253.83 28.92 253.83 42L253.83 42L253.83 44.83L219.83 44.83Q220.25 51.17 223.12 54.79Q226.00 58.42 230.92 58.42L230.92 58.42Q234.83 58.42 237.21 56.08Q239.58 53.75 240.33 50.67L240.33 50.67L253.17 50.67Q252.42 55.25 249.83 59.17Q247.25 63.08 242.58 65.50Q237.92 67.92 230.92 67.92ZM219.83 36.33L219.83 36.33L240.67 36.33Q240.33 30.67 237.83 27.54Q235.33 24.42 230.67 24.42L230.67 24.42Q226.08 24.42 223.29 27.38Q220.50 30.33 219.83 36.33Z";

/** Os quatro cortes que dividem a largura em cinco porções iguais. */
const CORTES_DO_LOGOTIPO = [
  [56.1, 45.43],
  [106.87, 96.2],
  [157.63, 146.96],
  [208.4, 197.73],
];

/**
 * O logotipo: "rende" em curvas, cortado em cinco porções a 8°. A largura
 * mínima é 96px (`MARCA.md` § 2.1): `md` tem 97px; abaixo disso, só o símbolo.
 */
export function Logotipo({
  tamanho = "md",
  tom = "tinta",
  className,
}: {
  tamanho?: "md" | "lg";
  /** `negativa` é papel sobre cobalto; `tinta` inverte com o tema. */
  tom?: Tom;
  className?: string;
}) {
  const cortes = useIdSvg();
  return (
    <svg
      viewBox="0 0 253.83 67.92"
      role="img"
      aria-label="Rende"
      className={cn(
        "shrink-0",
        tamanho === "lg" ? "h-9 w-33.75" : "h-6.5[97px]",
        COR[tom],
        className,
      )}
    >
      <mask
        id={cortes}
        maskUnits="userSpaceOnUse"
        x="-10"
        y="-10"
        width="273.83"
        height="87.92"
      >
        <rect x="-10" y="-10" width="273.83" height="87.92" fill="white" />
        <g stroke="black" strokeWidth="7.47">
          {CORTES_DO_LOGOTIPO.map(([topo, base]) => (
            <line key={topo} x1={topo} y1="-4" x2={base} y2="71.92" />
          ))}
        </g>
      </mask>
      <path d={LETRAS} fill="currentColor" mask={`url(#${cortes})`} />
    </svg>
  );
}
