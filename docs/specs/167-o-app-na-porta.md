# Spec 167 · O app na porta

**Tipo:** a `/conheca` passa a mostrar o app. A seção "Depois do preço" (`#d181`), escrita em
2026-09-24 e escondida desde então por falta das capturas, vai ao ar com quatro momentos, e não
três: entra "A cliente pede pelo link", o que o Completo vende e a página nunca mostrou. O momento
do cardápio leva a um cardápio de verdade, o da conta de demonstração.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão de código, curta. O que trava é o trabalho fora do código (seção 3), e
ele vem antes.
**Origem:** a crítica da `/conheca` de 2026-10-14 (`/impeccable` e `/frontend-design`, prints de
celular a 383 px e desktop a 1864 px), comparada às páginas de venda de Nuvemshop, Kyte, Anota AI,
Conta Azul, Notion e Calendly. Todas mostram o produto antes de pedir o cadastro; a do Rende vende
uma assinatura de um app que a visitante não vê nenhuma vez. As quatro dobras de cima vendem a
mesma conta (o cookie de R$ 4,41 a R$ 8,50) e nada do resto: pedidos, lista do mercado, caixa,
cardápio, ajudantes, a nota do mercado, a bancada, o orçamento com Pix, o MEI.
**Depende de:** 039 (`DepoisDoPreco`, `TELAS_DO_MES`), 112–116 (o cardápio público e o apelido).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão (completa a `#d181`).

---

## Problema

1. **O app não aparece.** `TELAS_DO_MES` tem `src` vazio há três semanas, e a seção e a âncora
   somem (`temTelasDoMes`). A única imagem da página é a faixa animada, que é o exemplo de novo.
2. **A resposta a "por que pagar todo mês" mora numa dúvida**, em texto, no fim da página. O
   argumento existe (`#d181`); falta ele ser visto.
3. **O Completo vende o cardápio com link em uma linha de lista.** É a peça que a cliente final
   vê, a mais fácil de mostrar e a única que dá para abrir de verdade, sem conta.
4. **O bloqueio é a conta de demonstração**, que não existe. `ESTADO.md` (seção da 039) já diz
   como fazer; ninguém fez porque é trabalho de mão, e nenhuma spec o pôs na frente.

---

## 1 · O que esta spec decide

### Os quatro momentos

A ordem é a da semana dela. Títulos e textos dos três de hoje ficam como estão (`#d181` os
conferiu contra o app).

| #   | Título                    | Captura                                                       |
| --- | ------------------------- | ------------------------------------------------------------- |
| 1   | A manteiga subiu.         | a Hoje com o aviso do doce no vermelho e o material culpado   |
| 2   | Chegou uma encomenda.     | o editor do pedido: itens, total, sobra e o botão do WhatsApp |
| 3   | A cliente pede pelo link. | o cardápio público da conta de demonstração, no celular       |
| 4   | Fechou o mês.             | o Caixa: entradas, saídas e a meta com os doces que faltam    |

Texto do 3: "Você manda um link. A cliente escolhe, diz o dia, e o pedido chega anotado no Rende,
com o total e o que sobra pra você." Abaixo do texto, em `label` `--ink-muted`: "No Completo".
Sem selo, sem cor: é informação, não destaque.

Abaixo do selo do 3, link terciário com `ArrowUpRight`: **"Abrir um cardápio de exemplo"**, aba
nova, para `CARDAPIO_DE_EXEMPLO` (constante em `page.tsx`, o caminho `/c/{apelido}` da conta de
demonstração). Constante vazia, o link some e o momento fica.

### A apresentação

A de hoje (`#d181`): texto e tela lado a lado alternando no desktop, empilhados no celular, sem
moldura de aparelho, sem grade de cartões. Duas mudanças:

- No celular a imagem ocupa a largura da coluna até 20rem (hoje 18rem), centrada: a 383 px, a
  tela do app lida a ~80% do tamanho real, que é o que se lê sem ampliar.
- `sizes` passa a `"(min-width: 1024px) 18rem, 20rem"`.

### O `TELAS_DO_MES`

Ganha o quarto item. O portão continua o mesmo: a seção só aparece com os quatro `src`
preenchidos (`every`), e o `alt` por escrever é pego por `rg -n "\[texto" src/app`.

### O convite da calculadora

Já existe: com a seção no ar, "Sem cartão. Veja o que acontece depois do preço" leva a `#depois`.
Nada muda.

### `novidades.ts`

Nada: é a página de venda, não o app.

---

## 2 · Escopo

- `src/app/conheca/page.tsx`: o quarto item, `CARDAPIO_DE_EXEMPLO`, o selo e o link do momento
  3, o tamanho da imagem no celular.
- `public/site/`: as quatro capturas (seção 3).
- `ESTADO.md`: a seção da 039 deixa de dizer que as capturas não existem; a lista das telas que,
  mudando, refazem captura ganha o cardápio público.

## Fora de escopo

- Vídeo, GIF, demonstração interativa, moldura de celular.
- Reproduzir as telas com componentes do app e dado falso (recusado na `#d181`).
- Um script que crie a conta de demonstração ou tire as capturas: é trabalho de uma vez, e a
  captura à mão a cada spec que muda a tela é o custo já aceito.
- Os outros momentos (a nota do mercado, a bancada, o orçamento, o MEI): entram na lista do
  "Os dois têm" da 170, em texto.
- O cardápio da MyCookie's como exemplo: é prova, não demonstração, e é da 169.

---

## 3 · Fora do código, para quem conduz o projeto (antes da sessão)

O que `ESTADO.md` já descreve, com o cardápio a mais. Uns 40 minutos.

1. `npm run conceder-acesso -- <e-mail de demonstração> demonstracao` (conta `livre`: abre tudo,
   inclusive o cardápio).
2. Nome do negócio inventado, que não seja de ninguém ("Doces da Vila"). Instalar a biblioteca e
   salvar os produtos. Subir a manteiga em `/insumos` até um doce ficar no vermelho.
3. Duas clientes de nome inventado e dois pedidos, um deles confirmado.
4. Ligar o cardápio com o apelido `exemplo`, com os dois cookies e foto se houver.
5. Um mês de caixa (umas oito entradas e quatro saídas) e uma meta.
6. Capturar a 390 × 844, tema claro, só a parte da tela que resolve o momento. WebP até 120 KB,
   em `public/site/`: `mes-aviso.webp`, `mes-pedido.webp`, `mes-cardapio.webp`, `mes-caixa.webp`.
7. Escrever o `alt` de cada uma com os números da tela.

Pedido feito por visitante no cardápio de exemplo cai na conta de demonstração e não chega a
ninguém. Se encher, arquivar de vez em quando.

---

## 4 · Roteiro de navegador

1. `/conheca` a 390 × 844: a seção aparece depois da calculadora, quatro momentos empilhados,
   cada imagem legível sem ampliar.
2. A 1280: texto e tela alternando o lado; a âncora "Depois do preço" no topo.
3. "Abrir um cardápio de exemplo" abre `/c/exemplo` em aba nova, e o pedido pelo cardápio funciona.
4. Leitor de tela: cada imagem lê o `alt` com os números.
5. Lighthouse mobile: CLS continua ~0 (largura e altura gravadas); as imagens abaixo da dobra
   carregam preguiçosas.
