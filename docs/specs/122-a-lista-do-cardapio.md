# Spec 122 · A lista do cardápio

**Tipo:** acabamento da lista do cardápio público (`/c/[contaId]`): a linha do produto perde o
vão do celular, o "Adicionar" escrito vira um "+", saem as linhas que emolduram as listas, os
títulos de seção ganham peso e "Mandar" vira "Compartilhar". Nenhum schema, nenhuma regra,
nenhum índice, nenhuma dependência, nada no handler.
**Tamanho:** uma sessão.
**Origem:** a crítica "está tão bom quanto os outros aplicativos?" sobre os prints de
2026-10-10, itens 1, 2, 3 e 5 e o detalhe do "Mandar".
**Depende de:** 112, 120, 121 (mesmo arquivo; a 121 entra antes).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d326` (reverte em parte o `#d166` e o `#d315`, ver seção 1).

---

## Problema

O cardápio está acima da média dos cardápios de loja pequena (fotos boas, paleta quieta, nada
gritando), mas abaixo dos apps grandes. A diferença está no ritmo da lista, e não nos
componentes. Pelos prints, em ordem de peso:

1. **A linha do produto desperdiça altura no celular.** O preço e o controle moram numa linha
   própria, abaixo da foto (`#d315`, "o celular não muda"). Cada produto ocupa ≈ 180 px, e o
   combo, que não tem descrição, deixa ≈ 60 px de nada entre "Escolha 4 · Cookie" e o preço.
   Oito produtos passam de uma tela e meia.
2. **Oito "Adicionar" com contorno.** É o elemento mais pesado da lista, mais que o nome e o
   preço, e se repete idêntico em toda linha. A linha inteira já abre a ficha (`#d315`): o
   texto do botão não ensina nada que o "+" não diga.
3. **Linhas que emolduram.** A barra de categorias tem filete embaixo, e a primeira lista tem
   filete em cima, ≈ 40 px depois. Cada lista fecha com um filete, vem o vão, o título, e a
   próxima abre com outro. São pares de linhas paralelas fazendo o trabalho que o espaço e o
   título já fazem. O "Monte a sua" repete o desenho em cada escolha.
4. **Os títulos de seção não separam.** "Combo" e "Cookie" estão em `heading` (20 px), um degrau
   acima do nome do produto (16 px 600). Hoje o filete ajuda a separar; sem ele, o título
   precisa fazer isso sozinho.
5. **"Mandar" é ambíguo.** Ao lado de um cardápio, "Mandar" pode ser mandar o pedido. O botão
   compartilha o link (`#d317`).

---

## 1 · O que esta spec decide: `#d326`

### A linha do produto, igual em toda largura

- A anatomia do `lg` (`#d315`) passa a valer no celular: grade `grid-cols-[minmax(0,1fr)_auto]
grid-rows-[auto_1fr]`, a foto (ou o retrato do combo) na coluna da direita ocupando as duas
  linhas, e na coluna do texto: nome, descrição, economia ou escolhas e, logo abaixo
  (`self-start`), **o preço com o controle**. A foto fica com os tamanhos de hoje: 104 px no
  celular e 128 px no `lg`.
- A descrição corta em **duas** linhas no celular e três no `lg` (`line-clamp-2
lg:line-clamp-3`): a ficha mostra o resto.
- A 360 px a coluna do texto tem ≈ 208 px (328 − 104 − 16). O preço (≈ 75 px) e o "+" (44 px)
  cabem com folga; o passo (≈ 120 px) também. No pior caso, preço riscado, preço e passo, a
  linha quebra (`flex-wrap`), e o controle fica à direita (`ml-auto`).
- Sem foto, a coluna da direita some, como hoje, e o texto ocupa a linha.
- Resultado esperado no celular: ≈ 140 px por produto com descrição e ≈ 136 px por combo, contra
  ≈ 180 px hoje.
- **Reverte** o item do `#d315` "o celular não muda" e a frase do comentário do `Produto` ("a
  360px, ao lado da foto, espremeriam"): o que espremia era o "Adicionar" escrito.

### O "+" no lugar do "Adicionar"

- O "Adicionar" com texto vira um **botão redondo de 44 px só com `Plus`**: `rounded-full`,
  contorno `--border-strong`, ícone `--ink`, o mesmo `aria-label` de hoje ("Adicionar {nome}").
  Fica na linha do preço, **nunca sobre a foto**: a razão do `#d166` continua de pé (sem foto,
  ele flutuaria no nada).
- No pedido, o passo na cor da loja, como hoje: o que já está no pedido é o que tem cor na lista.
- Combo à escolha: o "+" sempre (abre o "Monte a sua", `aria-haspopup="dialog"`). O "2 no
  pedido" sai do lado do botão e vai para **debaixo do preço**, em `label` `--ink-muted`, na voz
  do "Restam".
- Esgotado: "Esgotado" no lugar do controle, como hoje.
- A devolução de foco (o `devolverFoco` do `Produto`) continua: o "+" vira passo, e o foco vai
  para o "+" do passo.
- **Reverte** o item do `#d166` "o '+' virou 'Adicionar' na linha do preço" só no rótulo: o
  lugar continua o mesmo.

### Menos linhas

- As listas de seção perdem o `border-y` e ficam com o `divide-y`: **linha só entre produtos**,
  a mesma regra do `#d325`. Idem nas listas do "Monte a sua".
- A barra de categorias perde o filete parada e **ganha o filete só presa**: um sentinela de 1 px
  antes da `<nav>` e um `IntersectionObserver` marcam `data-presa`. A borda existe sempre (1 px
  transparente) e só troca de cor (`data-[presa]:border-line`), sem mexer na altura. Presa, a
  linha marca onde a lista passa por baixo; parada, não separa nada.
- **O pedido ao lado (desktop) fica como está**, com a borda de fora. `--surface` (L 0,995) e
  `--canvas` (L 0,972) quase não se distinguem no tema claro: sem a borda, a caixa some no
  papel. As linhas de dentro são as bordas da rolagem (`#d325`).
- A barra "Ver pedido" do celular continua com o filete de cima: ela é fixa, e o conteúdo passa
  por baixo.

### Títulos que separam

- O `h2` de seção passa de `heading` a **`title`** (24 px, `font-display` 600), e "Os mais
  pedidos" também. Fica 1,5 vez o nome do produto.
- O ritmo: **48 px** do fim de uma lista ao título seguinte, **12 px** do título ao primeiro
  produto. A âncora da pílula continua parando abaixo da barra (`scroll-pt-16`).

### "Compartilhar"

- O botão do topo (`MandarOCardapio`) diz **"Compartilhar"**, e o nome acessível
  "Compartilhar o cardápio".
- Abaixo de `sm` o rótulo vira só o ícone `Share2` (`sr-only sm:not-sr-only`). Com o texto
  inteiro, os três botões (≈ 104 + 109 + 126 px mais os vãos) passam dos 328 px e quebram a
  fileira. O ícone de compartilhar é o mesmo do sistema do celular.
- O resto do `#d317` continua: a folha do sistema, e "Link copiado" sem ela.

---

## 2 · Antes de tocar em código

1. A 121 já entrou (o mesmo `PedidoPeloCardapio.tsx`).
2. Ler em `PedidoPeloCardapio.tsx` o `Produto`, o `PrecoDoProduto`, o `Retrato`, a `<nav>` das
   categorias, as seções e o `MonteOCombo`; em `src/components/cardapio/MandarOCardapio.tsx`, o
   rótulo.
3. Reler o `#d166` e o `#d315`: esta spec reverte um item de cada, e a nota de status deles
   aponta para o `#d326`.

---

## 3 · Escopo

- `PedidoPeloCardapio.tsx`: a grade do `Produto` em toda largura, o "+", o "N no pedido" do combo,
  o `line-clamp`, o `border-y` das seções e do "Monte a sua", o sentinela da `<nav>`, os `h2` e
  o ritmo das seções.
- `MandarOCardapio.tsx`: o rótulo.
- `DECISOES.md`: `#d326`, e a nota de status no `#d166` e no `#d315`.
- Nada em `domain/`, nenhum teste novo.
- Linha em `components/comecar/novidades.ts`: "O cardápio mais enxuto no celular".

---

## 4 · Roteiro de navegador

Em 360, 390, 1024 e 1440 px, nos dois temas:

1. Produto com foto e descrição longa: duas linhas de descrição no celular, o preço e o "+"
   logo abaixo, a linha da altura do maior entre texto e foto, sem vão.
2. Combo sem descrição: nenhum vão entre o texto e o preço.
3. Produto sem foto: o texto e o controle ocupam a linha inteira.
4. Promoção (preço riscado) com o produto no pedido, a 360 px: o passo fica à direita, mesmo se
   a linha quebrar.
5. "+" → passo → "−" até zero → "+": o foco segue o controle, como hoje. O alvo da linha abre a
   ficha, e o "+" não.
6. Lista com um produto: nenhum filete. Com três: dois, entre eles. Nenhum filete em cima nem
   embaixo da lista.
7. A barra de categorias: sem filete no lugar; ao rolar e prender, o filete aparece; ao voltar,
   some. As pílulas aparecem inteiras, sem corte embaixo, presas e soltas (o print do desktop
   mostrava o pé delas cortado).
8. "Compartilhar": texto inteiro a partir de `sm`, só o ícone abaixo; leitor de tela diz
   "Compartilhar o cardápio" nos dois.
9. O "Monte a sua": filete só entre as opções.

---

## Critérios de aceite

- [ ] A linha do produto tem o preço e o controle na coluna do texto em toda largura.
- [ ] "+" redondo de 44 px no lugar do "Adicionar", com o mesmo nome acessível.
- [ ] Filete só entre produtos; a barra de categorias com filete só presa.
- [ ] Títulos de seção em `title`, 48 px antes e 12 px depois.
- [ ] "Compartilhar" no lugar de "Mandar".
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d326` escrito com as notas no `#d166` e no
      `#d315`; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **"+" sem texto.** Quem nunca pediu por app pode não reconhecer. O "+" ao lado do preço é o
  sinal de todo app de entrega, o nome acessível diz "Adicionar", e a linha inteira abre a ficha
  com "Pôr no pedido" escrito. Revisitar se os relatos mostrarem cliente perdida.
- **Descrição em duas linhas no celular.** Corta mais cedo a descrição longa do Pistache. A ficha
  mostra inteira, e três linhas eram metade do vão.
- **Filete da barra só presa.** Custa um `IntersectionObserver`. A alternativa, nenhum filete,
  deixa a lista passar por baixo de uma borda invisível.

---

## Fora de escopo

- **A foto e o texto do combo**: a 123.
- **A grade de duas colunas no desktop**: a 124.
- **O `Painel`** (o primitivo) e o pedido ao lado: nenhuma mudança.
- **As listas do app** ("Seu cardápio", Produtos): o `border-y` delas segue o `DESIGN.md`
  ("Seção no papel"), outra regra.
