import Script from "next/script";

/**
 * A visita contada pela Vercel, sem pacote (spec 038, `DECISOES.md#d180`): a
 * forma de duas tags da documentação, com `beforeSend` pela fila `window.va`.
 *
 * O script, uma vez carregado, segue a navegação do cliente; o filtro descarta
 * todo evento fora destes caminhos, e é ele que deixa o app sem medição.
 * `/login` fica fora: quem entra já é da casa.
 */
const CAMINHOS_MEDIDOS = [
  "/conheca",
  "/como-calcular-o-preco-do-cookie",
  "/cadastro",
];

const FILA = `window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.va("beforeSend", function (evento) {
  return ${JSON.stringify(CAMINHOS_MEDIDOS)}.includes(new URL(evento.url).pathname) ? evento : null;
});`;

/** Só em produção: prévias e o `npm start` local não contam visita. */
export function Medicao() {
  if (process.env.VERCEL_ENV !== "production") return null;

  return (
    <>
      <Script id="medicao-fila" strategy="afterInteractive">
        {FILA}
      </Script>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
    </>
  );
}
