/**
 * O endereço público do Rende, para o que pede endereço absoluto: sitemap,
 * `canonical`, Open Graph e `llms.txt`. A Vercel dá o domínio de produção no
 * build e na execução: o próprio quando houver, o `*.vercel.app` enquanto não
 * houver. Ver `DECISOES.md#d178`.
 */
export const URL_DO_SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

/**
 * As páginas que respondem "como calcular o preço" (`DECISOES.md#d257`). O
 * sitemap, o `llms.txt`, a medição e o bloco "Outros doces" leem daqui: página
 * nova é uma linha nova, e nenhum dos quatro fica para trás.
 */
export const PAGINAS_DO_PRECO = [
  {
    endereco: "/como-calcular-o-preco-do-cookie",
    titulo: "Como calcular o preço do cookie",
    doce: "Cookie",
    resumo: "A conta passo a passo, com uma calculadora pra fazer a sua.",
  },
  {
    endereco: "/como-calcular-o-preco-do-brigadeiro",
    titulo: "Como calcular o preço do brigadeiro",
    doce: "Brigadeiro",
    resumo: "O preço do cento, a hora de enrolar e o brigadeiro avulso.",
  },
] as const;
