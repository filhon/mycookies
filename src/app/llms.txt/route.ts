import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { lerBeta } from "@/lib/server/beta";
import { DESCRICAO } from "../descricao";
import { PAGINAS_DO_PRECO, URL_DO_SITE } from "../site";

/**
 * O `llms.txt` (llmstxt.org): convenção proposta, que alguns agentes leem
 * (`DECISOES.md#d177`). Rota, e não arquivo em `public/`, pelo endereço
 * absoluto. Nenhum preço: o do Stripe muda. A porta segue a fase do beta,
 * em até cinco minutos (spec 184, `#d407`).
 */
export const revalidate = 300;

/** A de doces vem primeiro, e as de cada doce embaixo, pela lista (`#d259`). */
const ehAPorta = (p: (typeof PAGINAS_DO_PRECO)[number]) =>
  p.endereco === "/como-calcular-o-preco-de-doces";
const PAGINAS = [
  ...PAGINAS_DO_PRECO.filter(ehAPorta),
  ...PAGINAS_DO_PRECO.filter((p) => !ehAPorta(p)),
];

export async function GET() {
  const porta =
    (await lerBeta()).fase === "BETA"
      ? `Em beta fechado, por convite, com lista de espera em ${URL_DO_SITE}/conheca#lista.`
      : `Teste de ${DIAS_DE_TESTE} dias.`;
  const texto = `# Rende

> ${DESCRICAO}

Aplicativo em português do Brasil para confeiteiras que vendem o que fazem: custo de cada doce,
preço sugerido, pedidos e caixa. Funciona no celular, sem internet. ${porta}

## Páginas

${PAGINAS.map((p) => `- [${p.titulo}](${URL_DO_SITE}${p.endereco}): ${p.resumo}\n`).join("")}- [O Rende](${URL_DO_SITE}/conheca): o que faz, os planos e as dúvidas
`;

  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
