import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/sw.js",
      "public/swe-worker-*.js",
      // Andaime do `firebase init`, com tsconfig e eslintrc próprios e
      // dependências que o `npm install` da raiz não instala. Ver
      // `DECISOES.md#d73`.
      "functions/**",
      // A referência da faixa do custo, guardada como veio; o código é
      // `site/FaixaDoCusto.tsx` (`DECISOES.md#d382`).
      "docs/marca/rende/faixa-custo/**",
    ],
  },
];

export default config;
