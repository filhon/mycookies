# Spec 120 · O topo e o pé do cardápio

**Tipo:** acabamento do cardápio público (`/c/[contaId]`): o nome desgruda da capa, as linhas
"antes de pedir" viram uma faixa de fatos desenhada, e o rodapé vira o fecho da loja, alinhado
com a lista. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10 (itens 1, 2, 3 e 5 do
pedido de quem conduz o projeto).
**Depende de:** 031, 115.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d324`.

---

## Problema

O cardápio é a página do Rende que mais gente de fora vai abrir, e é a vitrine que traz a
próxima confeiteira (o "Cardápio feito no Rende" mede isso, `#d317`). Nos prints, três pontos
parecem descuidados.

1. **O nome encosta na capa (desktop).** No `Topo`, a linha do logo e do texto é
   `lg:items-end`. O logo sobe 56 px sobre a capa (`-mt-14`), então o pé dele fica 56 px abaixo
   dela; a coluna do texto alinha pelo pé, e como ela tem mais de 56 px (nome, frase, duas
   linhas), o topo do `h1` sobe até a borda da capa. Quanto mais conteúdo no topo, mais o nome
   sobe. No celular a coluna é vertical e o problema não aparece.
2. **As linhas "antes de pedir" parecem soltas.** Duas linhas empilhadas, ícone de 16 px em
   `--ink` e texto `label`, sem rótulo: leem como uma lista com marcador trocado, e o ícone
   carrega um significado que nenhuma palavra diz ("Pix, cartão ou dinheiro" é o quê?).
3. **O rodapé tem duas linhas e não diz nada.**
   - O filete de cima do rodapé fica logo abaixo do filete de baixo da última lista: duas linhas
     paralelas.
   - Elas têm comprimentos diferentes: a lista termina na coluna da esquerda, e o rodapé
     atravessa a página inteira, por baixo da coluna do pedido.
   - O conteúdo repete o nome em `label` apagado, e o @ do Instagram não é link.
   - No celular, com algo no pedido, a barra fixa "Ver pedido" cobre o rodapé: o `pb-24` está
     na coluna da lista, e o rodapé fica fora dela.

---

## 1 · O que esta spec decide: `#d324`

### O nome desgruda da capa

- No `lg`, a linha do logo e do texto passa a `lg:items-start`. O logo continua sobre a capa
  (`-mt-14`, metade dele); a coluna do texto começa **20 px abaixo da capa** (`lg:pt-5`), e não
  pelo pé do logo. Sem logo, o `pt-6` de hoje; sem faixa, o `pt-10` de hoje.
- Os botões (WhatsApp, Instagram, Mandar) sobem com o nome: `lg:self-start lg:pt-5`, alinhados
  ao topo do `h1`, e não ao pé do bloco.
- No celular nada muda além de conferir: logo sobre a capa, 12 px, o nome.

### A faixa "antes de pedir"

- A `<ul>` com ícones vira uma **`<dl>` de fatos lado a lado**: `flex flex-wrap gap-x-8
gap-y-3`, `mt-4` abaixo da frase. Cada fato é um par:
  - `<dt>` em `micro` 600, caixa alta, `tracking-[0.08em]`, `--ink-muted` (a mesma voz da
    legenda "Escolha 4 · Cookie" do "Monte a sua");
  - `<dd>` em `label` 500, `--ink`.
- Os fatos, cada um só com dado, como na 115:
  - **Pedidos** · "A partir de amanhã" (ou "A partir de sexta, 17 de outubro");
  - **Pagamento** · "Pix, cartão ou dinheiro".
- **Sem ícone.** O rótulo diz o que o ícone tentava dizer, e dois ícones soltos eram metade do
  descuido. O `sr-only` "Pagamento:" sai: o `<dt>` já é o rótulo.
- O recado continua abaixo, em `body`, `mt-4`, até 48ch.
- A 360 px os dois fatos cabem lado a lado (≈ 130 + 32 + 150 px em 328); a data por extenso
  quebra para a linha de baixo sozinha, pelo `flex-wrap`.

### O pé da loja

- **O rodapé entra na coluna da lista.** `PedidoPeloCardapio` ganha a prop `pe?: ReactNode`,
  desenhada no fim da coluna da esquerda, depois da última seção. A página passa o rodapé por
  ela. Assim ele termina onde a lista termina no desktop, e herda o `pb-24` que o tira de baixo
  da barra "Ver pedido" no celular.
- **Sem filete.** `mt-16` de respiro no lugar da linha: a última lista já fecha com o filete
  dela.
- **O conteúdo é o fecho da loja**, a mesma pergunta do topo para quem rolou até o fim:
  - o logo em 40 px redondo (quando há) e o nome em `subheading` 600 `--ink`;
  - abaixo, os contatos como **links de texto** com ícone de 16 px em `--ink-muted` e texto
    `label` `--ink`, alvo de 44 px, `gap-x-6`: "WhatsApp" (o mesmo `linkDoWhatsApp` com
    `mensagemDeContato` do topo) e "@mycookiesartesanais" (link para o Instagram). Só os que
    existem; sem nenhum, só o nome. Link e não botão: o botão primário da página é o
    "Adicionar"/"Ver pedido", e o topo já tem os botões.
- **"Cardápio feito no Rende"** fica onde está a regra de hoje (`feitoComRende`, `#d147`):
  - celular: abaixo do bloco da loja, 32 px depois, `label` `--ink-muted`;
  - desktop: na mesma linha, à direita, alinhado ao pé do bloco da loja (`lg:flex-row
lg:items-end lg:justify-between`).
    Continua o único link do Rende na página, em aba nova, com `?de=cardapio`.

### O selo de verificação: não

O pedido era um selo de "conta verificada" para quem paga o Completo. **Fica fora, e a razão
vai no `#d324`:**

- **O cardápio já é do Completo.** `RECURSOS_DO_PACOTE.COMPLETO` inclui `"cardapio"`; fora
  dele, só o teste abre a página. O selo não separaria o Completo do Essencial, que nem tem
  cardápio: separaria a conta em teste, e diria "não verificada" à cliente dela justamente nos
  dias em que queremos que ela assine.
- **"Verificada" por quem?** A cliente da confeiteira não conhece o Rende, e a página é da loja
  (`#d166`). Um selo de verificação promete que alguém conferiu identidade e idoneidade; o Rende
  não confere CNPJ, endereço nem documento. É a promessa sem dado que o `#d166` já recusou
  ("volta na próxima").
- **Badge é anti-referência** (`PRODUCT.md`): "gamificação, badges".
- **O que o pagamento já compra na página:** o cardápio em si e tirar o "Cardápio feito no
  Rende" (`ocultarFeitoCom`, só para `assinante` e `livre`, `#d147`).
- Revisitar se um dia o Rende verificar algo de verdade (CNPJ, por exemplo) **e** o selo disser
  o que foi verificado.

---

## 2 · Antes de tocar em código

1. Ler `src/app/c/[contaId]/page.tsx` (o `Topo` e o rodapé) e, em `PedidoPeloCardapio.tsx`, o
   `return` (a coluna da lista e o `pb-24`).
2. A 121 mexe no mesmo arquivo; esta entra antes dela.

---

## 3 · Escopo

- `page.tsx`: o `Topo` (alinhamento, a `<dl>`), o rodapé passado como `pe`.
- `PedidoPeloCardapio.tsx`: a prop `pe`, desenhada no fim da coluna da lista.
- Nada em `domain/`, nenhum teste novo: é desenho, e o dado é o mesmo da 115.

---

## 4 · Roteiro de navegador

Em 360, 390, 1024 e 1440 px, nos dois temas:

1. Com capa e logo: no desktop, o nome começa abaixo da capa com folga visível; os botões
   alinham ao topo do nome. Com frase e recado longos, o nome não sobe.
2. Sem logo, com capa; sem capa, com cor; sem nenhum dos dois: o nome não encosta em nada.
3. A faixa: dois fatos lado a lado a 360 px; com agenda cheia, a data quebra sem empurrar o
   rótulo. Sem forma de pagamento ativa, só "Pedidos".
4. O pé: termina na largura da lista no desktop; uma linha só entre a última seção e ele (a da
   lista); com algo no pedido, no celular, rolar até o fim mostra o pé inteiro acima da barra.
5. Sem WhatsApp e sem Instagram: só o nome. Com `ocultarFeitoCom`: o pé fecha sem buraco.
6. Leitor de tela: a `<dl>` lê "Pedidos, a partir de amanhã; Pagamento, Pix, cartão ou
   dinheiro".

---

## Critérios de aceite

- [x] O nome não encosta na capa em nenhuma combinação de capa, logo e cor.
- [x] A faixa "antes de pedir" é uma `<dl>` com rótulo, sem ícone, cada fato só com dado.
- [x] O pé mora na coluna da lista, sem filete próprio, com os contatos como links, e fica
      acima da barra "Ver pedido" no celular.
- [x] O selo de verificação recusado no `#d324`, com a razão.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d324` escrito; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **Fatos sem ícone.** O ícone poderia ficar ao lado do rótulo. Ficou de fora porque o rótulo já
  diz, e a faixa fica mais quieta com uma voz só. Se a dona pedir mais fatos (retirada,
  entrega), a `<dl>` cresce sem mudar de forma.
- **Contatos repetidos no pé.** Topo e pé dizem WhatsApp e Instagram. Quem rolou o cardápio
  inteiro e não achou o que queria é exatamente quem vai perguntar; subir de volta é o passo que
  perde a conversa.

---

## Fora de escopo

- **O selo de verificação** (acima).
- **O checkout** (a folha e o pedido ao lado): é a 121.
- **Endereço, horário e mapa no pé.** O recado da 115 cobre; campo novo é regra nova.
- **A logo do Rende no "Cardápio feito no Rende".** Continua texto (`#d166`).
