# Auditoria de páginas

Controle do procedimento "o que a página X não tem comparada a serviços que faturam com
assinatura", rodado página a página com `/impeccable` e `/frontend-design` sobre prints de
celular e desktop. Cada crítica vira uma série de specs; a página conta como **melhorada**
quando a série inteira está codificada.

Levantado em 2026-10-12 (atualizado em 2026-10-14) a partir do campo **Origem** das specs e de `docs/ESTADO.md`.
"Codificada" não quer dizer publicada nem com roteiro de navegador rodado: isso continua em
`ESTADO.md`.

## O prompt

```
Use o /impeccable e o /frontend-design e me responda:

O que a minha página "X" @página_X não tem comparada a outros serviços, similares ou não,
que faturam milhares de reais por mês com assinatura? O que temos e podemos melhorar
substancialmente?

Não analise apenas o código, me visualize os prints que anexei.

Escreva spec (ou specs) para implementação com os achados.
```

Ao terminar uma página, mude a linha dela aqui (status, data, specs).

---

## App (logada)

| Página                 | Rota                                      | Arquivo                                                         | Status       | Crítica    | Specs   |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------- | ------------ | ---------- | ------- |
| Hoje                   | `/`                                       | `src/app/(app)/(coluna)/page.tsx`                               | ✅ melhorada | 2026-09-25 | 045–048 |
| Materiais              | `/insumos`                                | `src/app/(app)/insumos/page.tsx`                                | ✅ melhorada | 2026-09-26 | 049–052 |
| Produtos               | `/fichas`                                 | `src/app/(app)/fichas/page.tsx`                                 | ✅ melhorada | 2026-09-26 | 053–056 |
| Pedidos                | `/pedidos`                                | `src/app/(app)/pedidos/page.tsx`                                | ✅ melhorada | 2026-10-01 | 062–066 |
| Caixa                  | `/financeiro`                             | `src/app/(app)/(coluna)/financeiro/page.tsx`                    | ✅ melhorada | 2026-10-02 | 069–074 |
| Pedido (abrir / novo)  | `/pedidos/[id]`                           | `src/app/(app)/pedidos/[id]/page.tsx`                           | ✅ melhorada | 2026-10-02 | 075–081 |
| Configuração           | `/configuracao`                           | `src/app/(app)/configuracao/page.tsx`                           | ✅ melhorada | 2026-10-03 | 082–087 |
| Ler uma nota           | `/insumos/nota`                           | `src/app/(app)/(coluna)/insumos/nota/page.tsx`                  | ✅ melhorada | 2026-10-05 | 088–092 |
| Como funciona          | `/comecar`                                | `src/app/(app)/(coluna)/comecar/page.tsx`                       | ✅ melhorada | 2026-10-08 | 093–097 |
| Compras                | `/compras`                                | `src/app/(app)/(coluna)/compras/page.tsx`                       | ✅ melhorada | 2026-10-08 | 098–104 |
| Clientes               | `/clientes`                               | `src/app/(app)/clientes/page.tsx`                               | ✅ melhorada | 2026-10-09 | 105–109 |
| Contagem da despensa   | `/insumos/contagem`                       | `src/app/(app)/(coluna)/insumos/contagem/page.tsx`              | ✅ melhorada | 2026-10-11 | 125–129 |
| Contagem do pronto     | `/fichas/contagem`                        | `src/app/(app)/(coluna)/fichas/contagem/page.tsx`               | ✅ melhorada | 2026-10-12 | 130–133 |
| Produto (abrir / novo) | `/fichas/[id]`                            | `src/app/(app)/(coluna)/fichas/[id]/page.tsx`                   | ✅ melhorada | 2026-10-12 | 134–140 |
| Na bancada             | `/fichas/[id]/bancada`                    | `src/app/(app)/fichas/[id]/bancada/page.tsx`                    | ✅ melhorada | 2026-10-12 | 141–146 |
| Orçamento em papel     | `/pedidos/[id]/orcamento`                 | `src/app/(app)/(coluna)/pedidos/[id]/orcamento/page.tsx`        | ✅ melhorada | 2026-10-12 | 147–149 |
| Relatório do MEI       | `/financeiro/relatorio-mei/[competencia]` | `src/app/(app)/financeiro/relatorio-mei/[competencia]/page.tsx` | ✅ melhorada | 2026-10-12 | 150–154 |

## Estrutura comum (não é página, mas aparece em todas)

| Peça                                     | Status       | Crítica    | Specs   |
| ---------------------------------------- | ------------ | ---------- | ------- |
| Barra lateral, cabeçalho, barra de baixo | ✅ melhorada | 2026-09-30 | 057–060 |

## Entrada e assinatura

| Página                   | Rota                      | Arquivo                                          | Status       | Crítica    | Specs   |
| ------------------------ | ------------------------- | ------------------------------------------------ | ------------ | ---------- | ------- |
| Entrar                   | `/login`                  | `src/app/(auth)/login/page.tsx`                  | ✅ melhorada | 2026-09-25 | 041–043 |
| Criar conta              | `/cadastro`               | `src/app/(auth)/cadastro/page.tsx`               | ✅ melhorada | 2026-10-14 | 155–156 |
| Senha nova               | `/redefinir-senha`        | `src/app/(auth)/redefinir-senha/page.tsx`        | ✅ melhorada | 2026-10-14 | 157–158 |
| Assinatura               | `/assinatura`             | `src/app/(auth)/assinatura/page.tsx`             | ✅ melhorada | 2026-10-14 | 159–162 |
| Confirmando a assinatura | `/assinatura/confirmando` | `src/app/(auth)/assinatura/confirmando/page.tsx` | ⬜ pendente  |            |         |
| Termos                   | `/termos`                 | `src/app/(auth)/termos/page.tsx`                 | ⬜ pendente  |            |         |
| Privacidade              | `/privacidade`            | `src/app/(auth)/privacidade/page.tsx`            | ⬜ pendente  |            |         |

## Públicas

| Página                         | Rota                                       | Arquivo                                                    | Status       | Crítica    | Specs            |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------- | ------------ | ---------- | ---------------- |
| Página do Rende (venda)        | `/conheca`                                 | `src/app/conheca/page.tsx`                                 | 🟡 parcial   | 2026-09-24 | 038–040, 067     |
| Cardápio público               | `/c/[contaId]`                             | `src/app/c/[contaId]/page.tsx`                             | ✅ melhorada | 2026-10-10 | 112–116, 120–124 |
| Pedido que a cliente acompanha | `/c/[contaId]/pedido/[pedidoId]/[chave]`   | `src/app/c/[contaId]/pedido/[pedidoId]/[chave]/page.tsx`   | ⬜ pendente  |            |                  |
| Preço de doces                 | `/como-calcular-o-preco-de-doces`          | `src/app/como-calcular-o-preco-de-doces/page.tsx`          | ⬜ pendente  |            |                  |
| Preço do bolo de pote          | `/como-calcular-o-preco-do-bolo-de-pote`   | `src/app/como-calcular-o-preco-do-bolo-de-pote/page.tsx`   | ⬜ pendente  |            |                  |
| Preço do bolo por quilo        | `/como-calcular-o-preco-do-bolo-por-quilo` | `src/app/como-calcular-o-preco-do-bolo-por-quilo/page.tsx` | ⬜ pendente  |            |                  |
| Preço do brigadeiro            | `/como-calcular-o-preco-do-brigadeiro`     | `src/app/como-calcular-o-preco-do-brigadeiro/page.tsx`     | ⬜ pendente  |            |                  |
| Preço do cookie                | `/como-calcular-o-preco-do-cookie`         | `src/app/como-calcular-o-preco-do-cookie/page.tsx`         | ⬜ pendente  |            |                  |
| Sem rede                       | `/offline`                                 | `src/app/offline/page.tsx`                                 | ⬜ pendente  |            |                  |

---

## Notas

- **`/conheca` está parcial** porque a crítica de 2026-09-24 ("crítica da página de venda") é
  anterior ao procedimento com prints e não foi feita com `/frontend-design`; a 067 veio de
  conversa, não de crítica. Vale refazer com o prompt acima.
- **`/fichas/[id]` foi auditada em 2026-10-12** (a crítica dos prints do editor de produto,
  oito itens): 134 a 140, com a 140 em duas sessões (140-A, o preparo no custo; 140-B, o preparo
  no pote). Os roteiros de navegador da 138, da 139 e da 140 seguem por rodar, e a pergunta da 140
  à Maynara ("faz recheio que vai em mais de um produto?") segue em aberto (`ESTADO.md`).
- **`/fichas/[id]/bancada` foi auditada em 2026-10-12** (a crítica dos prints da bancada em
  360 px e 1920 px, onze itens). A página nasceu da 138: 141 (itens 1 a 5), 142 (6), 143 (7),
  144 (8 e 9), 145 (10) e 146 (11), com a 146 em duas sessões (146-A, a sugestão; 146-B, a
  entrada pelo pedido). Os roteiros de navegador de 141 a 146 seguem por rodar. A pergunta da 146
  à Maynara ("parte dos pedidos ou faz sempre a mesma e congela?") segue em aberto, e o menu da
  linha da lista de produtos no celular ficou de fora da 146-B (`#d353`).
- **`/pedidos/[id]/orcamento` foi auditada em 2026-10-12** (a crítica dos prints da folha do
  orçamento): 147 (a folha que se lê sozinha), 148 (a marca e o combinado de sempre) e 149 (o
  orçamento que a cliente aprova pelo link), com a 149 em duas sessões (149-A e 149-B). Os
  roteiros de navegador da 148 e da 149 seguem por rodar (`ESTADO.md`).
- **`/financeiro/relatorio-mei/[competencia]` foi auditada em 2026-10-12** (a crítica da tela e
  a crítica visual dos prints de celular e desktop): 150 (o MEI que o Rende conhece), 151 (o mês
  que se entrega), 152 (as notas que vão junto), 153 (o ano do MEI, que abre
  `/financeiro/relatorio-mei/AAAA` no mesmo segmento) e 154 (a folha no centro, que tirou a rota
  de `(coluna)`, `#d363`). Os roteiros de navegador de 150 a 154 seguem por rodar; o 4 da 154
  (imprimir pelo app instalado no iPhone) decide se o PDF gerado no aparelho vira pedido de
  dependência, e falta conferir no portal os rótulos da DASN-SIMEI e se o relatório zerado é
  exigido.
- **`/cadastro` foi auditada em 2026-10-14** (prints de celular 383 px e desktop 1864 px,
  comparada com as portas de Canva, Notion, Nuvemshop, Hotmart, Calendly e Shopify): 155 (a porta
  que mostra o que vem) e 156 (o e-mail que chega). Os roteiros de navegador das duas seguem por
  rodar (`ESTADO.md`).
- **`/redefinir-senha` foi auditada em 2026-10-14** (prints do mesmo dia): 157 (a senha trocada,
  com a tela de pronto) e 158 (o aviso da senha trocada por e-mail). Os roteiros das duas seguem
  por rodar.
- **`/assinatura` foi auditada em 2026-10-14** (prints de celular e desktop com a conta
  MyCookie's, Completo com cortesia, e a comparação com páginas de plano de serviços de
  assinatura): 159 (quem já assina vai para o painel da Configuração), 160 (o plano escolhido
  antes de pagar), 161 (o que o teste rendeu na porta, e a primeira cobrança no fim do teste) e
  162 (antes de ir embora: o passo antes de cancelar, o Essencial como saída e o motivo no
  portal, já ligado no ao vivo). Os roteiros de navegador de 159 a 162 seguem por rodar. O
  desconto de permanência da 162 não foi decidido e ficou de fora (`#d376`).
- **Nasceram de spec, nunca foram auditadas:** a página do pedido da cliente (117) e as cinco
  páginas de preço (037, 068).
- **A ordem sugerida para as pendentes**, pelo que pesa no uso e na venda:
  1. A página do pedido da cliente, que é o Rende visto por quem compra.
  2. As cinco páginas de preço, com a mesma crítica valendo para as cinco.
  3. `/assinatura/confirmando`, `/termos`, `/privacidade`, `/offline`.
