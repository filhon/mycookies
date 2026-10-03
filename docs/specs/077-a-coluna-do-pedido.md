# Spec 077 · A coluna do pedido

**Tipo:** no desktop largo (`2xl`), o editor de pedido sai da coluna de leitura e ganha uma coluna
à direita com o resumo (itens, total, sobra), presa enquanto o formulário rola; e salvar ganha
atalho de teclado. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela de pedido sobre os prints de desktop de 2026-10-02.
**Depende de:** a 075 (a ordem dos blocos).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d274`.

---

## Problema

O print de desktop tem 1864px. O editor ocupa a coluna de leitura (1024px, `(coluna)`), com
~300px vazios de cada lado. O total e a sobra moram no `PainelPedido`, preso ao pé da tela por
cima do último bloco (`pb-44` para não cobrir). Na noite de planejamento, sentada, a pergunta
"quanto sobra deste pedido" está numa barra no rodapé, e o que ela pediu está 600px acima.

O pedido em rascunho do Shopify, a fatura do Stripe e a venda do Square resolvem isso igual:
formulário à esquerda, resumo à direita, preso. É o desenho que a usuária desses serviços espera
encontrar, e o espaço já está sobrando na tela.

---

## 1 · O que esta spec decide

### O resumo à direita, a partir de `2xl`: `#d274`

- **A partir de `2xl`** (1536px; 1296px úteis depois da barra lateral), o editor sai da coluna e
  ocupa uma grade de duas colunas: o formulário com até 944px e, à direita, 320px de resumo,
  `sticky` logo abaixo do cabeçalho de contexto. É o mesmo ponto de quebra da mesa dos pedidos com
  a ficha aberta (`#d253`), pelo mesmo motivo: abaixo disso não cabe.
- **Abaixo de `2xl` nada muda**: a coluna de 1024px e o rodapé fixo de hoje.
- **O resumo é o `PainelPedido`**, com um arranjo vertical para a coluna:

  ```
  O QUE ELA PEDIU
  2× Cookie Nutella              R$ 26,00
  1× Combo 3 (2 trad., 1 pist.)  R$ 36,00
  ────────────────────────────────────────
  Subtotal                       R$ 62,00
  Desconto                      −R$  2,00
  Entrega                        R$  8,00
  Total do pedido               R$ 68,00   ← display
  ↳ Sobram R$ 31,40 deste pedido depois do custo de produzir e da maquininha.
  ```

  Sem itens: a frase de hoje ("Busque o que ela pediu…"). Prejuízo, desconto limitado e entrega
  dentro da sobra: as mesmas frases, ícones e tons de hoje. Um componente, dois arranjos
  (`hidden 2xl:block` e `2xl:hidden`), sem duplicar a conta.

- **Ações não vão para a coluna.** WhatsApp, folha e pagar continuam no formulário (075). Duas
  casas para o mesmo botão é a tela perguntando onde ele está.

### Salvar pelo teclado

`Ctrl+S` / `⌘S` chama `salvar` (com `preventDefault`) quando há "Salvar" na tela (não em
`soLeitura`). Funciona em qualquer largura com teclado físico. O `title` do botão diz o atalho.

---

## 2 · Antes de tocar em código

1. Ler como a 066 tirou `/pedidos` da coluna (`src/app/(app)/pedidos/`) e repetir: a rota
   `/pedidos/[id]` sai de `(app)/(coluna)/` e põe a própria largura, `max-w-5xl` abaixo de `2xl`.
2. Conferir que `/pedidos/[id]/orcamento` (a folha, 017) continua impressa sem o shell.
3. `/impeccable` com registro **product**.

---

## 3 · Escopo

- A rota do editor fora de `(coluna)`, com a grade em `2xl`.
- `PainelPedido.tsx`: o arranjo de coluna e a lista curta de itens.
- O atalho em `FormularioPedido.tsx`.
- `DESIGN.md`: a linha da coluna de leitura ganha "o editor de pedido em `2xl`" (`#d274`).

---

## 4 · Roteiro de navegador

1. 1864px: formulário à esquerda, resumo preso à direita ao rolar até o pé; nada coberto no fim.
2. 1440px: igual a hoje, coluna e rodapé fixo.
3. Adicionar um item e mudar o desconto: a coluna acompanha a cada tecla.
4. Prejuízo: triângulo, "perde" e o tom de atenção, na coluna.
5. `⌘S` com alteração salva; sem "Salvar" na tela (ajudante, pago), o atalho do navegador fica.
6. A folha do orçamento imprime como antes.

---

## Critérios de aceite

- [ ] Duas colunas só a partir de `2xl`; abaixo, sem diferença.
- [ ] O resumo e o rodapé saem do mesmo componente e da mesma `derivarPedido`.
- [ ] Nenhuma ação duplicada na coluna.
- [ ] Atalho de salvar com `preventDefault`, só onde há "Salvar".
- [ ] Nenhum campo, regra, índice ou dependência.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d274` escrito; `DESIGN.md` e `ESTADO.md` atualizados.

---

## 5 · Fora de escopo

- **O editor de produto com a mesma coluna.** Ele já tem o painel de preço; se esta funcionar, a
  mesma pergunta vale lá, em spec própria.
- **Outros atalhos** (novo item, próximo campo). Sem pedido dela, sem atalho.

---

## Decisões desta spec que são fáceis de rejeitar

- **`2xl`, e não `xl`.** Em `xl` sobram 1040px úteis: o formulário ficaria com 700px e os campos
  em duas colunas apertariam. O print dela é de 1864px.
- **A coluna sem botões.** A lista de serviços faz diferente (o "Enviar" na coluna). Aqui o
  âmbar já tem regra própria (`#d271`) e ela vale numa tela só.

---

## Riscos

- **Tirar a rota de `(coluna)` mudar o cabeçalho.** O título alinha com a coluna da tela
  (`#d129`); conferir nas duas larguras.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
