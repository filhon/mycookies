# Spec 124 · O cardápio no computador

**Tipo:** no desktop largo, a página do cardápio público alarga, e a lista de produtos passa a
duas colunas: a mesma linha do celular, lado a lado, sem cartão. Nenhum schema, nenhuma regra,
nenhum índice, nenhuma dependência, nada no handler.
**Tamanho:** uma sessão curta.
**Origem:** a crítica "está tão bom quanto os outros aplicativos?" sobre os prints de
2026-10-10, item 6.
**Depende de:** 121, 122 (a linha nova do produto; esta entra depois dela).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d328`.

---

## Problema

No print a 1511 px, a página é um cardápio de celular alargado: `max-w-6xl` (1152 px), a lista
numa coluna de ≈ 630 px com foto de 128 px, o pedido ao lado e quase 180 px de papel vazio em
cada lateral. Cada produto ocupa uma faixa de 630 px para ≈ 300 px de conteúdo, e a cliente rola
o dobro do que precisaria. iFood e Uber Eats, no computador, põem os produtos em duas colunas.

O peso é menor que o das outras duas specs: a cliente da Maynara chega quase toda pelo celular,
via WhatsApp e Instagram. Mas o link também abre no computador do trabalho, e é ali que a página
mais parece improvisada.

---

## 1 · O que esta spec decide: `#d328`

### A página alarga

- O `<main>` de `page.tsx` passa de `max-w-6xl` a **`max-w-7xl`** (1280 px). Com o `lg:px-10`,
  ficam 1200 px úteis; menos o pedido ao lado (25 rem, `#d325`) e o vão de 40 px, a coluna da
  lista fica com **≈ 760 px**.
- O topo alarga junto: a capa, o nome e os botões seguem a mesma largura.

### A lista em duas colunas, quando cabe

- A coluna da lista vira **contêiner** (`@container`), e a lista de cada seção passa a duas
  colunas quando ela tem **45 rem (720 px) ou mais**: `@[45rem]:grid @[45rem]:grid-cols-2
@[45rem]:gap-x-8`. É pela largura da coluna, e não da tela, porque o pedido ao lado come 440 px.
  - 1280 px ou mais: ≈ 760 px de coluna, duas colunas de ≈ 364 px (foto de 128, ≈ 220 de texto).
  - De 1024 a 1279 px: ≈ 500 a 680 px de coluna, uma coluna, como hoje.
  - Celular: uma coluna, sem mudança.
- **A linha é a mesma da 122**, e não um cartão: sem caixa, sem sombra, sem fundo. O `#d166`
  recusou "a grade de cartões com elevação", e essa recusa continua; o que muda é que a lista com
  divisórias ocupa duas colunas.
- **Os filetes:** o `divide-y` não funciona em grade. Cada produto leva `border-t`, menos os da
  primeira linha (`first:border-t-0` e, em duas colunas, `@[45rem]:[&:nth-child(2)]:border-t-0`).
  A grade estica as duas células de uma linha à mesma altura, então os dois filetes de uma linha
  se alinham num só traço com um vão no meio. Continua a regra do `#d325`/`#d326`: linha só entre
  produtos.
- Seção com um produto só: uma célula na coluna da esquerda, e a direita vazia. Nada de esticar a
  célula às duas colunas: a linha de 760 px é o problema de hoje.
- "Os mais pedidos" continua em três colunas, agora maiores (≈ 240 px).

---

## 2 · Antes de tocar em código

1. A 122 já entrou: a linha do produto tem o preço na coluna do texto em toda largura.
2. Ler em `page.tsx` o `<main>`; em `PedidoPeloCardapio.tsx`, a grade da página (`lg:grid-cols-
[minmax(0,1fr)_25rem]`), a coluna da lista e o `<ul>` das seções.
3. O Tailwind v4 traz a consulta de contêiner sem plugin (`@container`, `@[45rem]:`).

---

## 3 · Escopo

- `page.tsx`: o `max-w-7xl`.
- `PedidoPeloCardapio.tsx`: o `@container` na coluna da lista, a grade das seções e os filetes por
  `border-t`.
- `DECISOES.md`: `#d328`, e a nota de status no `#d166` (o item "a web usa a mesma lista com
  divisórias" continua, agora em duas colunas no largo).
- Nada em `domain/`, nenhum teste novo.
- Linha em `components/comecar/novidades.ts`: "O cardápio em duas colunas no computador".

---

## 4 · Roteiro de navegador

Em 1024, 1280, 1440 e 1920 px, nos dois temas:

1. 1024 px: uma coluna, como antes da spec; nenhuma rolagem lateral.
2. 1280 e 1440 px: duas colunas; os filetes de uma linha alinhados; nenhum filete em cima da
   primeira linha nem embaixo da última.
3. Seção com um produto, com dois e com três: um sozinho à esquerda; dois lado a lado, sem
   filete; três, com um filete só, na segunda linha, embaixo do da esquerda.
4. Produtos de alturas diferentes na mesma linha (um com descrição longa, outro sem): as duas
   células com a altura da maior, e o controle de cada uma logo abaixo do texto dela.
5. A âncora da pílula para no título da seção, abaixo da barra presa.
6. 1920 px: a página para em 1280, centrada.

---

## Critérios de aceite

- [x] `max-w-7xl` na página.
- [x] Duas colunas quando a coluna da lista tem 720 px ou mais, por consulta de contêiner.
- [x] Sem cartão: a mesma linha, com filete só entre linhas da grade.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d328` escrito com a nota no `#d166`;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Duas colunas, e não três.** A 1920 px caberia uma terceira se a página não parasse em 1280.
  Três colunas de 240 px espremeriam o texto ao lado da foto de 128.
- **Linha, e não cartão.** iFood usa cartão com borda no desktop. Aqui cartão seria caixa ao lado
  de caixa (o pedido ao lado já é uma), e o `#d166` recusou a grade de cartões.
- **`max-w-7xl`, e não largura inteira.** Acima de 1280 px as linhas ficariam longas demais para
  ler o preço junto do nome.

---

## Fora de escopo

- **A linha do produto, os títulos e os filetes no celular**: a 122.
- **O combo**: a 123.
- **O pedido ao lado**: a largura e a anatomia são da 121.
