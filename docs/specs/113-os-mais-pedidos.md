# Spec 113 · Os mais pedidos

**Tipo:** a primeira tela do cardápio público passa a mostrar doces: até três produtos mais
pedidos, com foto grande, antes das categorias. O número vem do agregado do mês, que o Rende
já grava. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.** Muda o que sai
para fora (a ordem dos mais pedidos, nunca a quantidade) e o que a página lê com o Admin SDK
(dois documentos de `agregados`, por id).
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10.
**Depende de:** 112 (o toque no destaque abre a ficha do produto).
**Aprovações pedidas:** (1) **o que sai para fora**: quais produtos vendem mais, em ordem, sem
número; (2) **a leitura pública ganha `agregados`**, dois documentos por id, só para tirar
`produtos[id].quantidade`.
**Decisões a registrar:** `#d316`, que **reverte um item do `#d166`** ("o selo 'o mais pedido':
o Rende não sabe disso").

---

## Problema

1. **A primeira tela do celular não tem um doce.** No print de 393 px: a capa (uma foto de
   embalagem), o nome, WhatsApp e Instagram, as pílulas e três combos sem foto. As fotos dos
   cookies, que são o que vende, começam depois da primeira rolagem. Quem chega pela bio do
   Instagram decide em segundos se rola ou fecha.
2. **A ordem das seções é a do app, não a da vitrine.** "Combo" vem antes de "Cookie" porque é
   a ordem de `categoriasProduto`, que serve à cozinha dela. A cliente nova não sabe por onde
   começar, e não há nada que diga o que a casa faz melhor.
3. **O `#d166` recusou "o mais pedido" porque o Rende não sabia.** Hoje sabe: `ResumoMensal.produtos`
   guarda, por `fichaTecnicaId`, quantas unidades saíram nos pedidos pagos do mês (é o ranking do
   Caixa). Duas leituras por id dão os dois últimos meses.

---

## 1 · O que esta spec decide: `#d316`

- **O número.** `maisPedidosDoCardapio(resumos, produtos)` em `domain/cardapio.ts`, puro e
  testado: soma `quantidade` do mês corrente e do anterior (competência pelo dia de Brasília) por
  ficha, fica com os produtos que estão na página, **têm foto** e não estão esgotados, e devolve
  até três ids, do mais para o menos vendido. Cada um precisa de **pelo menos 5 unidades** nos
  dois meses (`MINIMO_PARA_DESTACAR`), e a faixa só aparece com **dois ou mais**: "mais pedido"
  com uma venda é número inventado, e a regra da seção 4 da 031 vale aqui.
- **O combo conta como combo**, como em `maisPedidos` (`#d275`): é ele que se vende.
- **O que sai.** `Cardapio.maisPedidos?: string[]`, só ids. Nenhuma quantidade, receita ou lucro
  sai do servidor; o teste das chaves confere `Cardapio` e o conteúdo de `maisPedidos`.
- **A leitura.** `lerCardapio` faz um `getAll` de `agregados/{competencia}` dos dois meses, em
  paralelo com o que já lê, e reduz a `Map<fichaId, quantidade>` antes de chamar
  `montarCardapio`. Mês sem documento conta zero. A página continua guardada 60 s.
- **A faixa.** Acima das pílulas, "Os mais pedidos" em `heading`, e uma grade de três colunas
  (nunca carrossel, nunca rolagem lateral): foto quadrada na largura da coluna, o nome em até duas
  linhas e o preço. A peça inteira é um botão que abre a ficha da 112. Sem "Adicionar" na peça:
  o controle de quantidade mora na linha da lista e na ficha, e dois controles do mesmo produto na
  mesma tela confundem. Com o produto no carrinho, "2 no pedido" abaixo do preço.
- **Os produtos continuam nas seções deles.** A faixa é atalho, não move nada.
- **Sem interruptor no painel.** Uma usuária; se ela não quiser, o interruptor vem com o pedido.

---

## 2 · Antes de tocar em código

1. Conferir em `mutations/` quando `ResumoMensal.produtos` é incrementado (pagamento) e se o
   desfazer o pagamento decrementa. Se não decrementa, o número sobe com o desfazer; anotar no
   `#d316`, e o mínimo de 5 cobre o ruído.
2. Conferir que o combo à escolha grava `produtos[kitId]` e não as receitas de dentro.
3. `firebaseAdmin.ts`, no cabeçalho: a lista do que a página lê ganha "os agregados dos dois
   últimos meses, só para a ordem dos mais pedidos".

---

## 3 · Escopo

- `src/lib/domain/cardapio.ts`: `MINIMO_PARA_DESTACAR`, `maisPedidosDoCardapio`,
  `Cardapio.maisPedidos?`, `montarCardapio` recebe o mapa. Testes: o corte de três, o mínimo de
  5, menos de dois some, sem foto fora, esgotado fora, produto fora da página fora, as chaves.
- `src/lib/server/cardapio.ts`: o `getAll` dos dois agregados.
- `src/components/cardapio/PedidoPeloCardapio.tsx`: a faixa.

---

## 4 · Roteiro de navegador

1. Conta real, 393 px: a primeira tela, sem rolar, mostra a faixa com as fotos de três doces.
2. Tocar num deles: a ficha da 112 abre. "Pôr no pedido": a peça diz "1 no pedido" e a linha da
   seção também mostra o passo.
3. Marcar o mais vendido como esgotado (limitado, pote zero): sai da faixa, e o quarto entra.
4. Conta de teste sem venda: nenhuma faixa, e a página é a de hoje.
5. Rede: o HTML e o pacote de dados não têm nenhuma quantidade.

---

## Critérios de aceite

- [ ] Até três destaques com foto, cada um com pelo menos 5 unidades em dois meses; menos de dois,
      nada.
- [ ] Só ids saem; teste das chaves.
- [ ] Duas leituras por id a mais, dentro do `revalidate`.
- [ ] A peça abre a ficha; nenhum controle de quantidade duplicado.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d316` escrito com a reversão do item do
      `#d166`; `ESTADO.md` atualizado.

---

## Fora de escopo

- **"Mais pedido" como selo na linha.** A faixa já diz; o selo repetiria em três linhas.
- **Destaque escolhido por ela** ("lançamento", "do mês"). É o próximo passo natural, e é um
  campo; vem quando ela pedir.
- **Quantidade à vista** ("120 vendidos este mês"). É dado do negócio dela na página pública.
- **Ordem das seções diferente da do app.** A faixa resolve a primeira tela sem mexer na ordem.
