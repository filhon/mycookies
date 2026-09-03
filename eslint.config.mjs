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
    ],
  },
];

export default config;
