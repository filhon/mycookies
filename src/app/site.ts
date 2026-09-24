/**
 * O endereço público do Rende, para o que pede endereço absoluto: sitemap,
 * `canonical`, Open Graph e `llms.txt`. A Vercel dá o domínio de produção no
 * build e na execução: o próprio quando houver, o `*.vercel.app` enquanto não
 * houver. Ver `DECISOES.md#d178`.
 */
export const URL_DO_SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
