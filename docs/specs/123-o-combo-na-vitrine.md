# Spec 123 · O combo na vitrine

**Tipo:** o combo à escolha no cardápio público deixa o mosaico de quatro fotos por uma foto só,
e o texto da linha diz o produto, e não a mecânica. Em "Seu cardápio", a dona vê quais produtos
marcados estão sem foto. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência,
nada no handler.
**Tamanho:** uma sessão.
**Origem:** a crítica "está tão bom quanto os outros aplicativos?" sobre os prints de
2026-10-10, item 4.
**Depende de:** 031-C, 112, 113, 122 (mesmo arquivo; a 122 entra antes).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d327` (reverte o item do mosaico do `#d315`).

---

## Problema

1. **O mosaico parece improvisado.** O combo sem foto própria mostra as opções com foto em 2 × 2
   (`#d315`). Nos prints, os três combos da MyCookie's (4 Cookies, Degustação, Dupla) têm as
   mesmas opções e mostram **o mesmo mosaico**: quatro cookies espremidos em 52 px cada, que não
   distinguem um combo do outro e dão à lista a cara de colagem.
2. **O texto descreve a mecânica.** "Escolha 4 · Cookie" é a legenda do "Monte a sua" levada
   para a vitrine. A cliente quer saber quantos vêm e que variedade há, e o "·" entre um número e
   uma categoria no singular não lê como frase.
3. **A dona não sabe que o combo está sem foto.** "Seu cardápio" lista o que está marcado, sem
   dizer o que vai sair sem imagem. A foto do combo montado é a solução de verdade, e nada no
   app aponta para ela.

---

## 1 · O que esta spec decide: `#d327`

### Uma foto, e não o mosaico

- O combo **com foto própria** continua com ela. É o melhor caso, e o único que distingue os
  três combos.
- O combo **sem foto própria** mostra **a foto de uma opção**: a primeira que aparece em
  `cardapio.maisPedidos`, ou, sem nenhuma lá, a primeira opção com foto, na ordem de
  `escolhas[].opcoes`. Sem opção com foto, nenhuma foto, como hoje.
- A escolha é uma função pura em `domain/cardapio.ts`, **`fotoDoCombo(produto, maisPedidos)`**,
  que devolve `{ id, versao } | null`, com teste: foto própria, opção mais pedida, primeira com
  foto, nenhuma. O `Retrato` passa a recebê-la, e o código do mosaico (`quatro`, a grade
  `grid-cols-2 grid-rows-2`) sai.
- A foto da opção é servida pela rota de hoje: a opção só tem `fotoVersao` quando está na página
  (`#d315`), então o 404 não volta.
- O "Monte a sua" não muda: a foto do topo continua sendo a do combo, quando há, e cada opção
  continua com a dela.

### O texto da linha

- `escolhasEmTexto` passa a receber as opções e diz o produto:
  - **uma escolha:** "4 à sua escolha, entre 5 opções". As opções contadas são as que não estão
    esgotadas (`restam !== 0`). Com o número igual ao das opções: "2 à sua escolha, entre 2
    opções".
  - **várias:** "2 de Cookie e 1 de Brownie, à sua escolha" (vírgula entre as do meio, "e"
    antes da última). A categoria fica como ela escreveu: plural automático em português erra
    ("Pão de mel" → ?).
- O " · economize pelo menos R$ X" continua depois, como hoje.
- A legenda do "Monte a sua" ("Escolha 4 · Cookie") **não muda**: lá, a mecânica é o assunto.
- O teste de `escolhasEmTexto` em `tests/domain/cardapio.test.ts` muda junto, com o caso da
  opção esgotada.

### O aviso em "Seu cardápio"

- Na lista "O que aparece no cardápio", o produto **marcado** sem `fotoUrl` ganha, à direita do
  nome, "Sem foto" em `label` `--ink-muted` com o ícone `ImageOff` de 16 px (cor nunca é o único
  portador). O desmarcado não ganha nada: não vai sair.
- Abaixo da lista, só quando há algum combo marcado sem foto, uma linha `label` `--ink-muted`:
  "Combo sem foto aparece com a foto de um dos sabores. A foto do combo montado se põe no
  produto, em Produtos."
- Nenhum link dentro da linha: ela é um `<label>` de caixa de marcar, e um link dentro do rótulo
  rouba o toque.

---

## 2 · Antes de tocar em código

1. A 122 já entrou (o `Retrato` na linha nova).
2. Ler em `PedidoPeloCardapio.tsx` o `Retrato` e a linha do combo no `Produto`; em
   `domain/cardapio.ts`, `escolhasEmTexto`, `ProdutoDoCardapio.escolhas` e
   `maisPedidosDoCardapio` (só produtos com foto entram lá, então a opção achada nele sempre
   tem foto); em `SeuCardapio.tsx`, a lista "O que aparece no cardápio".

---

## 3 · Escopo

- `domain/cardapio.ts`: `fotoDoCombo` (nova) e `escolhasEmTexto` (texto novo), com teste.
- `PedidoPeloCardapio.tsx`: o `Retrato` com uma foto só, a chamada nova de `escolhasEmTexto`.
- `SeuCardapio.tsx`: o "Sem foto" e a linha do combo.
- `DECISOES.md`: `#d327`, e a nota de status no `#d315`.
- Linha em `components/comecar/novidades.ts`: "O combo com uma foto só no cardápio", que diz
  também do "Sem foto" em "Seu cardápio".

---

## 4 · Roteiro de navegador

Em 360 e 1440 px, nos dois temas:

1. Combo com foto própria: a dele.
2. Combo sem foto, com uma opção entre os mais pedidos: a foto dessa opção, uma só, no quadrado
   inteiro.
3. Combo sem foto, sem mais pedidos: a primeira opção com foto.
4. Combo sem foto e sem opção com foto: nenhuma foto, o texto na linha inteira.
5. O texto: "4 à sua escolha, entre 5 opções"; com uma opção esgotada, "entre 4 opções"; num
   combo de duas categorias, "2 de Cookie e 1 de Brownie, à sua escolha".
6. "Seu cardápio": "Sem foto" só nos marcados sem foto; desmarcar tira; a linha do combo só com
   combo marcado sem foto.

---

## Critérios de aceite

- [ ] O mosaico saiu; o combo sem foto mostra uma foto de opção, pela regra de `fotoDoCombo`.
- [ ] `escolhasEmTexto` com o texto novo e a contagem sem as esgotadas, testado.
- [ ] "Sem foto" em "Seu cardápio" para o marcado sem foto, com ícone e texto.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d327` escrito com a nota no `#d315`;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Os três combos com a mesma foto.** Com as mesmas opções, a regra escolhe a mesma. É menos
  feio que o mosaico repetido, mas não distingue. O que distingue é a foto do combo montado, e
  é por isso que "Seu cardápio" passa a dizer "Sem foto".
- **"opções", e não "sabores".** Um combo pode ser de bebida e salgado. "Sabores" leria melhor
  num cardápio só de doce; "opções" não erra em nenhum.
- **Contar só as não esgotadas.** "Entre 5 opções" com duas esgotadas promete o que o "Monte a
  sua" não entrega.

---

## Fora de escopo

- **Um quadro tipográfico** (o "4" grande na cor da loja) no lugar da foto. Distinguiria os
  combos, mas é um enfeite inventado, e a foto vende mais.
- **Gerar a foto do combo** juntando as das opções. A colagem é o problema.
- **Link de "Sem foto" direto para o editor do produto.** O rótulo é de caixa de marcar; o
  caminho é Produtos.
- **A linha e a lista**: a 122. **A grade do desktop**: a 124.
