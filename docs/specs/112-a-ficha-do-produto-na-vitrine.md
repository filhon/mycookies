# Spec 112 · A ficha do produto na vitrine

**Tipo:** a linha de produto do cardápio público abre uma ficha com a foto grande e a descrição
inteira; o combo deixa de ser três linhas iguais de texto; no desktop, a linha encolhe para a
altura da foto. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.** Muda o que
sai para fora em um ponto: a foto das opções de combo que já estão na página (seção 1).
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público (`/c/[contaId]`) sobre os prints de celular e desktop de
2026-10-10, comparando com cardápios digitais por assinatura (Goomer, Anota AI, Cardápio Web) e
com o iFood.
**Depende de:** 031 (A a F). Tudo codificado.
**Aprovações pedidas:** a foto da opção de combo sai na `OpcaoDoCombo` quando a opção está na
lista (é a mesma foto que a rota já serve na linha dela).
**Decisões a registrar:** `#d315`.

---

## Problema

Nos prints, com a conta real:

1. **A descrição corta e não abre.** "Massa delicada de pistache com chocolate branco e
   pedacinhos crocantes de pistache, recheada com…" é o fim do texto no celular (`line-clamp-3`).
   Não há toque que mostre o resto. A cliente decide sem ler o recheio, que é o que diferencia o
   doce.
2. **A foto é o único apetite da página, e tem 104 px.** Tocar nela não faz nada. Todo cardápio
   que se paga abre o produto: foto grande, descrição inteira, quantidade, e o botão com o valor.
3. **Os combos são o primeiro bloco da página e o mais pobre.** Combo 4 Cookies, Combo
   Degustação e Combo Dupla: três linhas sem foto, cada uma com "Você escolhe os sabores". A
   cliente não sabe quantos sabores escolhe nem quais existem até tocar.
4. **"Monte a sua" escolhe sabor pelo nome.** A página tem a foto de cada cookie e não a usa
   justamente na hora de escolher entre eles.
5. **No desktop, cada produto ocupa o dobro do que precisa.** O preço e o "Adicionar" ficam numa
   linha abaixo da foto (decisão certa a 360 px, `#d166`), e com uma linha de descrição sobra um
   vão de ~60 px entre o texto e o preço, em cada um dos oito produtos.
6. **"· un" em todo preço.** "R$ 13,00 · un" repete oito vezes uma unidade que ninguém
   perguntou. "· porção" informa; "· un" não.

---

## 1 · O que esta spec decide: `#d315`

- **A linha abre a ficha.** O nome, a descrição e a foto formam um `<button>` que abre
  `FichaNaVitrine` no `Painel` (folha no celular, lateral no desktop, como o invariante pede). O
  "Adicionar" e o passo continuam fora desse botão, na linha do preço: dois alvos, nenhum
  dentro do outro. Produto sem foto e sem descrição também abre, pela consistência.
- **A ficha:** a foto quadrada no topo, em até 320 px de lado (`FOTO_LADO_PX`, o que a foto
  gravada aguenta sem esticar), o nome em `heading`, a descrição inteira, as linhas que a página
  já tem (economia do kit, selo da promoção, "Restam N") e o preço com o riscado. No rodapé, o
  passo de quantidade e **"Pôr no pedido · R$ 26,00"** (variante `loja`, 52 px), que grava a
  quantidade escolhida no carrinho e fecha. A ficha começa em 1, ou na quantidade que o carrinho
  já tem; com o produto no carrinho, o botão diz "Atualizar o pedido", e no zero, "Tirar do
  pedido". O "+" para no que resta (`cabeMaisUm`), como na linha.
- **Combo à escolha não ganha ficha nova:** a linha continua abrindo "Monte a sua", que passa a
  ter no topo a foto do combo (quando há) e a descrição inteira.
- **O combo diz o que se escolhe.** "Você escolhe os sabores" vira o que a escolha é, por
  `escolhasEmTexto(escolhas)` em `domain/cardapio.ts`, com teste: uma escolha, "Escolha 4 ·
  Cookie"; duas, "Escolha 2 · Cookie + 1 · Brownie". A economia mínima continua depois, como hoje.
- **Combo sem foto mostra as opções.** No lugar da foto, um mosaico de até quatro fotos das
  opções (2 × 2, cada uma com metade do lado), só das opções que têm `fotoVersao`. Com uma só,
  ela ocupa o quadrado; com nenhuma, o quadrado some como hoje. `OpcaoDoCombo` ganha
  `fotoVersao?`, presente só quando a opção está na lista e tem foto: a rota
  `/c/{id}/foto/{fichaId}` já serve essa foto, e opção fora da lista continua sem nada (a rota
  daria 404). O teste das chaves (`#d158`) ganha `fotoVersao` na opção, e só ela.
- **"Monte a sua" com foto:** 48 px à esquerda do nome de cada opção que tem `fotoVersao`.
- **Desktop (`lg`):** o preço e o controle sobem para a coluna do texto, abaixo da descrição, e a
  foto vai a 128 px (`lg:size-32`). A linha passa a ter a altura do maior dos dois. O celular não
  muda (`#d166`).
- **"· un" sai.** O rótulo da unidade só aparece quando não é `un` (hoje, só "porção").

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md` e usar `/impeccable` (a página é a primeira tela do Rende que
   não é da confeiteira; a voz é a dela com a cliente).
2. Ler `PedidoPeloCardapio.tsx` inteiro: `Produto`, `Passo`, `MonteOCombo`, `mudar` e o foco que
   volta ao controle depois de "Adicionar". A ficha usa o mesmo `mudar`, sem segundo carrinho.
3. Conferir no `Painel` se dois painéis podem abrir em sequência (ficha fecha, pedido abre) sem
   o foco cair no `body`.

---

## 3 · Escopo

- `src/lib/domain/cardapio.ts`: `escolhasEmTexto`, `fotoVersao?` em `OpcaoDoCombo` (só na lista).
  Testes em `tests/domain/cardapio.test.ts` (o texto com uma e duas escolhas; a opção fora da
  lista sem `fotoVersao`; o teste das chaves).
- `src/components/cardapio/PedidoPeloCardapio.tsx`: a linha como botão, `FichaNaVitrine`, o
  mosaico, a foto nas opções do "Monte a sua", o desktop compacto, o rótulo da unidade.
- Nenhum arquivo de servidor muda além do que `montarCardapio` devolve.

---

## 4 · Roteiro de navegador

1. **360 px.** Tocar no Cookie Pistache: a ficha abre com a foto grande e a descrição inteira,
   "recheada com creme de pistache" à vista. "+" duas vezes, "Pôr no pedido · R$ 45,00": a ficha
   fecha, a linha mostra o passo com 3, a barra diz "Ver pedido · 3 itens".
2. Abrir de novo: começa em 3 e diz "Atualizar o pedido". Descer a 0: "Tirar do pedido".
3. **Combo.** A linha do Combo 4 Cookies diz "Escolha 4 · Cookie" e mostra o mosaico dos
   cookies. "Monte a sua" mostra a foto de cada sabor.
4. **Limitado.** Produto com "Restam 2": a ficha para o "+" em 2.
5. **Desktop 1280.** Cada linha tem a altura da foto (128 px), com o preço sob a descrição.
6. **Teclado.** Tab chega ao botão da linha e ao "Adicionar" separados; Enter na linha abre a
   ficha; Esc fecha e devolve o foco à linha.
7. **Rede.** Nenhuma resposta com `data:image`; as fotos das opções vêm da rota com cache
   imutável.

---

## Critérios de aceite

- [x] A linha abre a ficha com a descrição inteira; "Adicionar" continua alvo separado.
- [x] "Pôr no pedido" grava a quantidade e respeita o que resta.
- [x] Combo à escolha diz o que se escolhe; sem foto, mostra o mosaico das opções da lista.
- [x] Foto nas opções do "Monte a sua".
- [x] Desktop com o preço na coluna do texto; celular igual ao de hoje.
- [x] "· un" não aparece; "· porção" sim.
- [x] Teste das chaves com `fotoVersao` na opção, e só ela.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d315` escrito; `ESTADO.md` atualizado.

---

## Fora de escopo

- **Foto maior que 320 px.** A ficha aguenta o que a foto gravada tem. Subir `FOTO_LADO_PX` pesa
  o documento da ficha, que o app inteiro sincroniza; se a foto parecer mole nos celulares de
  tela densa, é decisão própria (ou o Storage que o `#d162` já previa).
- **Mais de uma foto por produto, galeria e zoom.** Uma foto por ficha é o que o schema tem.
- **Observação por item pela cliente** ("sem nozes"). `ItemPedido.observacao` existe (078), mas
  o recado do pedido já cobre, e é um campo a mais na folha.
- **Ficha com URL própria** (`/c/{id}?produto=`). Útil para ela mandar um doce só; vira spec se
  ela pedir.
