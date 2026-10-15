# Spec 174 · Depois do doce

**Tipo:** o link do pedido entregue deixa de ser um beco: ganha "Pedir de novo" (o cardápio dela,
ou o WhatsApp com o pedido anterior escrito) e o Instagram dela. A prévia do link ganha o logo da
loja. O pé da página ganha a linha "feito com Rende" que a folha já tem, com a mesma chave para
tirar.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica do link de acompanhamento de 2026-10-15. O momento em que a cliente está com
o doce na mão é o mais feliz da relação, e a página entregue mostra uma trilha toda marcada e o
botão do WhatsApp. iFood, Shopify (a página de pedido com "Comprar de novo") e a Amazon usam o
pedido entregue para a próxima compra. Para a confeiteira isso é recompra (a 105 já procura quem
parou de pedir); para o Rende, a página é vista por cada cliente de cada confeiteira, e é o único
lugar público em que o Rende não aparece, enquanto a folha impressa da mesma encomenda diz
"feito com Rende" (`#d127`).
**Depende de:** 117, 031 (o cardápio), 114 (a prévia com a vitrine), 171 (a ação da vez).
**Aprovações pedidas:** (1) **o que sai para fora**: a lista fechada do `#d320` ganha o Instagram
dela, o endereço do cardápio quando aberto e `feitoCom`; (2) o Rende na página da cliente dela.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **O entregue não leva a lugar nenhum.** A cliente que gostou não tem, na página, como pedir de
   novo nem onde seguir a loja.
2. **A prévia do link é só texto.** "Seu pedido na MyCookie's / Acompanhe a sua encomenda.", sem
   imagem. Um link sem rosto no WhatsApp parece golpe (o argumento da 116), e é o mesmo link que
   leva o Pix.
3. **O Rende não aparece.** Calendly, Typeform, Linktree e Hotmart põem a própria marca no pé da
   página que o cliente do cliente vê; é a propaganda que se paga sozinha. O Rende já faz isso na
   folha impressa e já tem a chave para tirar (`ocultarFeitoCom`, `#d147`).

---

## 1 · O que esta spec decide

### "Pedir de novo"

- Em `ENTREGUE`, `acaoDaVez` (171) ganha `"pedir"`, que vence `falar`; `pagar` continua vencendo
  (entregue e não pago, o Pix vem primeiro e o "Pedir de novo" fica secundário).
- **Com o cardápio aberto:** "Pedir de novo" (`RotateCcw`) leva a `/c/{endereço}`. Só o cardápio,
  sem carrinho preenchido: o produto pode ter saído, o preço pode ter mudado.
- **Sem o cardápio aberto, com WhatsApp:** o mesmo botão abre `linkDoWhatsApp(whatsapp, "Oi! Quero
pedir de novo: 12 × Cookie Red Velvet, 1 × Bolo de pote de ninho.")`, as linhas do pedido em
  texto (`quantidade × nome`). Ela responde com o preço de hoje.
- **Sem nenhum dos dois:** sem botão.
- `acompanhamentoDoPedido` recebe `cardapioAberto: boolean` do servidor (o mesmo dado que
  `lerVitrine` já lê) e devolve `cardapio?: string` (o caminho), só em `ENTREGUE`.

### O Instagram dela

Em `ENTREGUE`, depois do "Pedir de novo", o terciário "Seguir a {loja} no Instagram"
(`ExternalLink`, sem logo do Instagram: marca de terceiro), para `https://instagram.com/{arroba}`,
de `contato.instagram`. Só quando há. `negocio.instagram?` no objeto, só em `ENTREGUE`.

### A prévia com o logo

`generateMetadata` passa a pôr o logo como `images` quando a vitrine tem logo, pela rota da
vitrine que a prévia do cardápio já usa (`/c/{endereço}/vitrine/logo?v=…`, `#d317`), `card:
"summary"`. Nada além do logo: título e descrição continuam sem nome, valor e data (`#d320`).
**Conferir na sessão:** a rota do logo só serve com o cardápio aberto (`lerImagemDaVitrine`). Com
o cardápio fechado, a prévia continua sem imagem; abrir a rota para o link do pedido é outra
decisão, e não desta spec.

### "feito com Rende"

- No pé da página, depois do WhatsApp, centrado, em `micro` `--ink-subtle`: "feito com Rende",
  link para `/conheca`. Como na folha (`#d127`): uma linha, nunca logo, nunca cor da marca. É a
  página dela.
- Sai quando `ocultarFeitoCom` (`#d147`): a mesma escolha vale para a folha e para o link. A dica
  da opção na Configuração passa a dizer "na folha e no link do pedido".
- `negocio.feitoCom: boolean` no objeto.

---

## 2 · Antes de tocar em código

1. **Pedir as aprovações.**
2. Ler `lerVitrine` e a prévia do cardápio: de onde vêm `logoVersao` e se o cardápio está aberto.
3. Ler a dica de `ocultarFeitoCom` na Configuração.

---

## 3 · Escopo

- `domain/acompanhamento.ts`: `cardapio?`, `instagram?`, `feitoCom`, `acaoDaVez` com `"pedir"`;
  teste das chaves (só em `ENTREGUE` para os dois primeiros).
- `domain/whatsapp.ts`: `mensagemDePedirDeNovo(itens)`; teste.
- `server/cardapio.ts`: `lerAcompanhamento` passa cardápio aberto, Instagram, `feitoCom`,
  `logoVersao`.
- A página: o bloco do entregue, a prévia, o pé.
- A dica de `ocultarFeitoCom` na Configuração.
- Linha em `components/comecar/novidades.ts`: "A cliente pede de novo pelo link do pedido
  entregue".

---

## 4 · Roteiro de navegador

1. Pedido entregue e pago, cardápio aberto: "Pedir de novo" leva ao cardápio; o Instagram abre o
   perfil.
2. Cardápio fechado: "Pedir de novo" abre o WhatsApp com as linhas do pedido.
3. Entregue e não pago: o Pix é o primário; "Pedir de novo" secundário.
4. Colar o link numa conversa com o cardápio aberto: a prévia tem o logo e nenhum dado pessoal.
5. "feito com Rende" no pé; marcar a opção de esconder: some da página e da folha.

---

## Critérios de aceite

- [ ] "Pedir de novo" só no entregue, pelo cardápio ou pelo WhatsApp, nunca com carrinho
      preenchido.
- [ ] A prévia com o logo quando a rota serve; sem dado pessoal.
- [ ] "feito com Rende" obedece `ocultarFeitoCom`.
- [ ] `lint`, `typecheck`, `test` e `build` passam; decisão registrada; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **"feito com Rende" na página da cliente dela.** O cardápio decidiu "nada do Rende aqui"
  (`#d317`); o link do pedido é a folha na tela (`#d357`), e a folha leva a linha. Se a página
  for vista como cardápio, a linha sai e a spec perde só isso.
- **Sem carrinho preenchido.** Reabrir o pedido antigo no cardápio exige casar fichas, escolhas de
  combo e preços de hoje; o cardápio aberto já está a dois toques do mesmo pedido.

---

## Fora de escopo

- **Avaliação e depoimento** ("Como estava?", estrelas). Para onde vai a nota, quem modera, se
  aparece no cardápio: é produto novo, e a confeitaria recebe o elogio no WhatsApp.
- **Cupom de volta** ("10% no próximo"). Desconto é decisão dela (`#d309`).
- **Link de indicação** do Rende com recompensa. É a página dela, não a vitrine do Rende.
