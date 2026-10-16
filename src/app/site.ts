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
 *
 * `atualizadoEm` (`AAAA-MM-DD`) é o "Atualizado em" da página, o `lastmod` do
 * sitemap e o `dateModified` do artigo: mudou a conta, muda aqui (`#d415`).
 */
export const PAGINAS_DO_PRECO = [
  {
    endereco: "/como-calcular-o-preco-do-cookie",
    titulo: "Como calcular o preço do cookie",
    doce: "Cookie",
    resumo: "A conta passo a passo, com uma calculadora pra fazer a sua.",
    atualizadoEm: "2026-09-24",
  },
  {
    endereco: "/como-calcular-o-preco-do-brigadeiro",
    titulo: "Como calcular o preço do brigadeiro",
    doce: "Brigadeiro",
    resumo: "O preço do cento, a hora de enrolar e o brigadeiro avulso.",
    atualizadoEm: "2026-10-01",
  },
  {
    endereco: "/como-calcular-o-preco-do-bolo-por-quilo",
    titulo: "Como calcular o preço do bolo por quilo",
    doce: "Bolo por quilo",
    resumo:
      "O custo do quilo, e a caixa e a decoração que não crescem com o peso.",
    atualizadoEm: "2026-10-02",
  },
  {
    endereco: "/como-calcular-o-preco-do-bolo-de-pote",
    titulo: "Como calcular o preço do bolo de pote",
    doce: "Bolo de pote",
    resumo: "O pote, a embalagem que pesa e o preço no aplicativo de entrega.",
    atualizadoEm: "2026-10-02",
  },
  // A porta das outras (`#d259`): última aqui para fechar "Outros doces", e
  // primeira no `llms.txt`.
  {
    endereco: "/como-calcular-o-preco-de-doces",
    titulo: "Como calcular o preço de doces",
    doce: "A conta pra qualquer doce",
    resumo:
      "A conta que serve pra todos, e o que muda do cookie ao bolo de pote.",
    atualizadoEm: "2026-10-15",
  },
] as const;

export type EnderecoDoPreco = (typeof PAGINAS_DO_PRECO)[number]["endereco"];

/** Quem publica, para a busca e os assistentes (`#d415`). */
export const ORGANIZACAO = {
  "@type": "Organization",
  name: "Rende",
  url: `${URL_DO_SITE}/conheca`,
  logo: `${URL_DO_SITE}/icons/icone-512.png`,
} as const;

/** O JSON de um `ld+json`, com `<` escapado: nenhum texto fecha a tag. */
export const jsonLd = (dados: object) =>
  JSON.stringify({ "@context": "https://schema.org", ...dados }).replace(
    /</g,
    "\\u003c",
  );
