# Spec 134 · O produto no computador

**Tipo:** no desktop, o editor de produto ganha a coluna do preço à direita, presa sob o
cabeçalho, como o editor de pedido (`#d274`), e a lista do que vai dentro vira grade de colunas
(`#d334`). No celular nada muda. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, itens 1 e 2.
**Depende de:** nada. Entra antes da 135, que acrescenta uma coluna à grade daqui.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d339`.

---

## Problema

No print a 1864 px a tela tem três defeitos que o celular não tem.

1. **O número que ela veio buscar está no rodapé.** O `PainelPreco` é um `RodapeFixo` de 1024 px
   colado na borda de baixo do monitor: custo, sugerido, preço e "sobram R$ x" numa tira fina,
   longe do que ela está mexendo. No celular isso é certo (o polegar mora ali); a 1864 px é o
   lugar onde o olho menos passa. Todo serviço de custeio de receita que se paga (Meez, Galley,
   Apicbase, CostBrain) põe o custo vivo numa coluna ao lado da receita: ela digita "320 g" de
   Nutella e vê o preço mudar no mesmo campo de visão.
2. **"O custo do lote" mora no fim da página**, depois de quinze ingredientes. A faixa de
   composição, que é a assinatura do produto (`DESIGN.md` § Signature), só aparece para quem rola
   até lá.
3. **A linha do material atravessa a tela.** Quantidade à esquerda, custo na ponta direita, e
   ≈ 600 px de papel entre os dois, quinze vezes. É o print que a 129 consertou na despensa e a 133
   no pote.

---

## 1 · O que esta spec decide: `#d339`

### 1.1 A coluna do preço, a partir de `2xl`

- `FormularioFicha` ganha a mesma grade do editor de pedido:
  `2xl:grid 2xl:grid-cols-[minmax(0,59rem)_20rem] 2xl:items-start 2xl:gap-8`. Ler
  `FormularioPedido.tsx` (linha ≈ 1211) e o `#d274` antes; a rota sai da coluna de leitura do
  mesmo jeito que a do pedido saiu.
- À direita, `sticky` sob o cabeçalho, nesta ordem:
  1. **Preço**: custo da unidade, sugerido (com "Usar"), o campo "Preço de venda" e a frase da
     sobra com o ponto âmbar. É o `PainelPreco` em outra pele: extrair o miolo para um componente
     que as duas peles usam (`RodapeFixo` no celular e abaixo de `2xl`, coluna em `2xl`). Um
     componente, duas cascas; não duplicar a lógica de `explicar()`.
  2. **O custo do lote**: a faixa de composição e as parcelas (`Parcela`), o "Custo do lote
     inteiro" e o "Dividido por 16 unidades".
- Em `2xl` o bloco "O custo do lote" da coluna da esquerda some (`2xl:hidden`): o mesmo número em
  dois lugares da mesma tela é dois lugares para conferir. O `pb-32 lg:pb-40` do formulário vira
  `2xl:pb-8`, como no pedido.
- A coluna não tem botão. O "Salvar" continua no cabeçalho (`#d271`).
- Entre `lg` e `2xl` nada muda: rodapé, como hoje.

### 1.2 A grade do que vai dentro, a partir de `lg`

- A mesma `<li>` de `LinhaItemFicha` em `lg:grid lg:items-center lg:gap-x-6` com três colunas e o
  botão de remover:
  1. **Material**: nome; o selo "Embalagem" ao lado, como hoje.
  2. **Quantidade**: o campo e a unidade.
  3. **Custo**: `Dinheiro` tabular à direita.
- Cabeçalho de colunas uma vez, acima da lista: micro 600 caixa alta `--ink-muted`,
  `aria-hidden`; cada célula com o rótulo em `sr-only` (o padrão da `LinhaContagem`, 129).
- `LinhaComponenteFicha` (kit) usa a mesma grade, com "× R$ 1,20" dentro da célula da quantidade.
  `LinhaEscolhaFicha` fica como está: o detalhe embaixo não cabe em coluna.
- As colunas são uma constante exportada de `LinhaItemFicha.tsx`, para a 135 acrescentar a quarta.

---

## 2 · Antes de tocar em código

1. Ler `#d274`, `#d129`, `#d334` e `#d338`.
2. Ler `RodapeFixo.tsx` e `PainelPreco.tsx`: o miolo sai sem mudar o comportamento do teclado
   aberto (`apertado:`, `#d75`).
3. Conferir que `useDesktop` não é necessário: a troca de casca é CSS (`2xl:hidden` /
   `hidden 2xl:block`). Se o campo de preço existir duas vezes no DOM, só um pode estar no
   formulário e na ordem de Tab; nesse caso, `useDesktop`-equivalente com o mesmo ponto de quebra,
   e não dois campos.

---

## 3 · Escopo

- `FormularioFicha.tsx`: a grade `2xl`, a coluna, o bloco do custo `2xl:hidden`.
- `PainelPreco.tsx`: o miolo extraído; a casca de coluna.
- `LinhaItemFicha.tsx`: a grade `lg`, o cabeçalho, a constante das colunas.
- `DECISOES.md`: `#d339`. `DESIGN.md`: a linha "Tabela" ganha "o que vai dentro do produto"; o
  parágrafo da coluna de leitura ganha o editor de produto ao lado do de pedido.
- `novidades.ts`: "No computador, o preço do produto fica ao lado da receita".

---

## 4 · Roteiro de navegador

Em 1024, 1280, 1536 e 1920 px, nos dois temas; e 360 px para conferir que nada mudou:

1. Cookie Cacau com Nutella: a 1920, a coluna à direita mostra 6,78 · 7,90 · o preço · a sobra, e
   a faixa de composição logo embaixo. Rolar até "Manteiga": a coluna continua à vista.
2. Mudar Nutella de 320 para 200 g: custo, faixa e sobra mudam na coluna, sem rolar.
3. A 1280: rodapé, como hoje; a grade dos materiais já em colunas.
4. Kit: a coluna mostra "Produtos do kit" e, com escolhas, "A escolha da cliente".
5. Tab: nome → rende → … → último material → preço. O preço é alcançado uma vez só.
6. Leitor de tela na linha: "Material, Nutella. Quantidade, 320 g. Custo, R$ 21,12".

---

## Critérios de aceite

- [x] A partir de `2xl`, preço e custo do lote numa coluna presa à direita; sem rodapé.
- [x] Abaixo de `2xl`, o rodapé de hoje, sem mudança.
- [x] A partir de `lg`, os materiais em três colunas com cabeçalho.
- [x] Um campo de preço só no DOM, ou dois com um só alcançável.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d339` escrito; `DESIGN.md`, `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Fora de escopo

- **A parte de cada material no custo**: 135.
- **Reordenar os blocos** (a produção no topo, "Mais detalhes" antes da receita). Ver as
  observações da crítica; pede o roteiro com a Maynara antes.
- **Arrastar para reordenar materiais.**
