import { DIAS_DE_TESTE } from "@/lib/domain/cadastro";
import { DESCRICAO } from "../descricao";
import { PAGINAS_DO_PRECO, URL_DO_SITE } from "../site";

/**
 * O `llms.txt` (llmstxt.org): convenção proposta, que alguns agentes leem
 * (`DECISOES.md#d177`). Rota, e não arquivo em `public/`, pelo endereço
 * absoluto. Nenhum preço: o do Stripe muda, e isto é estático.
 */
export const dynamic = "force-static";

export function GET() {
  const texto = `# Rende

> ${DESCRICAO}

Aplicativo em português do Brasil para confeiteiras que vendem o que fazem: custo de cada doce,
preço sugerido, pedidos e caixa. Funciona no celular, sem internet. Teste de ${DIAS_DE_TESTE} dias.

## Páginas

${PAGINAS_DO_PRECO.map((p) => `- [${p.titulo}](${URL_DO_SITE}${p.endereco}): ${p.resumo}\n`).join("")}- [O Rende](${URL_DO_SITE}/conheca): o que faz, os planos e as dúvidas
`;

  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
