import Script from "next/script";

/**
 * O Speed Insights da Vercel, sem pacote (`DECISOES.md#d245`): a forma de duas
 * tags da documentação, como a `Medicao` (`#d180`). Mede o app inteiro: o que
 * interessa é a velocidade na mão de quem usa, não só nas páginas públicas.
 */
const FILA = `window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };`;

/** Só em produção: prévias e o `npm start` local não entram na conta. */
export function Desempenho() {
  if (process.env.VERCEL_ENV !== "production") return null;

  return (
    <>
      <Script id="desempenho-fila" strategy="afterInteractive">
        {FILA}
      </Script>
      <Script
        src="/_vercel/speed-insights/script.js"
        strategy="afterInteractive"
      />
    </>
  );
}
