# Spec 066 · A mesa dos pedidos

**Tipo:** no desktop, `/pedidos` sai da coluna de leitura e vira tabela, com a ficha da 063
acoplada à direita. **Nenhum campo, nenhuma consulta, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Pedidos (2026-10-01), print do desktop.
**Depende de:** 063 (a ficha). Se a 064 rodou, a hora vira coluna.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d253`.

É a de menor retorno das cinco: a dona usa o celular na bancada, e o desktop é a noite. Pode ficar
para depois sem prejuízo.

---

## Problema

No print do desktop, a lista ocupa a coluna de 1024px no meio de uma tela de 1.860px: sobram cerca
de 300px vazios de cada lado. Dentro da coluna, o nome está na borda esquerda e o valor a quase
900px dele, e o olho atravessa a linha para casar os dois. Cada pedido gasta duas ou três linhas
de texto: os 39 pedidos do print dão três telas e meia.

À noite, sentada, ela compara: qual dia rendeu, quem pagou, quanto sobrou de cada um. É o uso para
o qual uma tabela existe. Materiais e Produtos já viraram mesa (`#d225`, `#d228`), com o detalhe
acoplado à direita (`#d130`). Pedidos ficou para trás. A lista de pedidos do Shopify, a mais copiada
do mercado, é uma tabela com o estado do pagamento e o da entrega em colunas separadas.

---

## 1 · O que esta spec decide

### A mesa: `#d253`

- `/pedidos/page.tsx` sai do grupo `(coluna)` para `src/app/(app)/pedidos/`, como `/insumos` e
  `/fichas`. O editor `/pedidos/[id]` fica na coluna.
- **A partir de `lg`**, a `<li>` da linha vira grade, como em Produtos:

  | Hora | Cliente | Itens | Estado | Pagamento | Total | Sobra |
  | ---- | ------- | ----- | ------ | --------- | ----: | ----: |
  - Hora só se a 064 rodou. Itens com o resumo curto da 062, truncado com `title`.
  - Estado: o selo. Pagamento: "Pago" com `Check`, "Falta receber" com `HandCoins` (só em
    entregue), vazio no resto.
  - Total e sobra tabulares à direita; prejuízo com sinal, cor e ícone.
  - Cabeçalho das colunas em micro 600 caixa alta, `aria-hidden`, rótulo `sr-only` em cada célula,
    como Produtos.

- **O dia continua sendo o grupo**: uma linha de cabeçalho de grupo com o dia, a contagem, o total
  e a sobra da 062, alinhados às colunas de Total e Sobra.
- **Com a ficha aberta**, a ficha da 063 vai para a coluna acoplada à direita, e a linha
  selecionada fica em `--surface-sunken`. Entre `lg` e `xl`, com a ficha aberta, a linha volta à
  do celular, a mesma regra de Produtos.
- **Sem escolha de ordem.** A ordem é a data, e na agenda a hora; não há outra que ela peça aqui.
- A faixa "Me devem / Vai entrar", as pílulas e a busca ficam acima da mesa, na largura dela.

---

## 2 · Antes de tocar em código

- Ler como Produtos montou a grade, a coluna acoplada e a volta entre `lg` e `xl`, e repetir; se
  houver peça reaproveitável sem virar abstração nova, reaproveitar.
- Conferir que mover a página de grupo não muda a URL nem quebra o `recolhe` do cabeçalho.

---

## 3 · Escopo

- Mover `src/app/(app)/(coluna)/pedidos/page.tsx` para `src/app/(app)/pedidos/page.tsx`.
- `src/components/pedidos/ListaPedidos.tsx` e `LinhaPedido.tsx`: a grade e a coluna acoplada.

---

## 4 · Roteiro de navegador

1. 1440px: a mesa ocupa a largura; nome e valor na mesma faixa do olho.
2. Clicar num pedido: a ficha acopla à direita, a linha fica marcada; Esc fecha.
3. 1100px com a ficha aberta: a linha volta à do celular.
4. Leitor de tela: cada célula lê o rótulo da coluna.
5. Celular: nada muda.

---

## Critérios de aceite

- [ ] Tabela a partir de `lg`, com o grupo do dia.
- [ ] Ficha acoplada, linha selecionada; volta à linha entre `lg` e `xl` com a ficha aberta.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d253` escrito; `ESTADO.md` e a linha "Tabela" do `DESIGN.md` (que lista as telas) atualizados.

---

## 5 · Fora de escopo

- **Ordenar por coluna.** Ver acima; e clique no cabeçalho é o que `#d226` já recusou.
- **Seleção múltipla e ações em lote.** Mesma razão da 062.
- **Exportar a tabela.** A planilha é de onde ela está saindo.
