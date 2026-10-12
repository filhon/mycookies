# Spec 130 · O que o pote deveria ter

**Tipo:** a contagem do pronto passa a dizer quanto o sistema espera em cada pote (a última
contagem, mais a massa feita, menos o que saiu em pedido), marca com ícone e palavra o que precisa
de olho, abre recortada no que precisa ser conferido e ganha o "Igual". Nenhum schema, nenhuma
regra, nenhum índice novo, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica "o que a contagem do pronto não tem comparada aos serviços de assinatura?"
sobre os prints de 2026-10-12, itens 1 e 2.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d335`.

---

## Problema

O print mostra dez linhas de peso visual idêntico. "7 unidades · contada há 23 dias" é o único
número que a tela oferece, e é o menos útil: em 23 dias saiu cookie em pedido, e o sistema sabe
quantos. O cardápio já faz essa conta para "Restam N" (`#d164`: contagem + massa − pedidos depois
da contagem); a contagem, que é a tela onde ela confere o pote, não faz. A projeção daqui só soma a
massa (`projecaoDoPronto`), e nunca desce.

Cinco das dez linhas dizem "nunca contada" (Ice Cookie e os quatro minis). Provavelmente são
produtos que ela não guarda pronto: faz na hora, ou fez uma vez. Pesam o mesmo que o Tradicional,
que tem 16 no pote. A pergunta que importa antes de começar, **"o que eu confiro hoje?"**, ela
responde lendo as dez frases.

A despensa resolveu isso na 126 (`#d331`) e deixou esta tela de fora de propósito. Todo serviço de
estoque por assinatura (Shopify, Square, Katana, Craftybase, Sortly) mostra o esperado ao lado do
campo, e a contagem cíclica começa pelo que mais mudou.

---

## 1 · O que esta spec decide: `#d335`

### O esperado desconta o que saiu

- `esperadoNoPote(ficha, fornadas, pedidos, kits, hojeISO)`, pura, devolve
  `{ contagem, fornadas, feitas, pedidos, saiu, esperado }`:
  - `feitas` e `fornadas`: as de `projecaoDoPronto`, sem mudança.
  - `saiu`: as unidades da ficha (`unidadesPorFicha`: a linha, as escolhas de combo e os
    componentes de kit) nos pedidos **não arquivados**, com status fora de `ORCAMENTO` e
    `CANCELADO`, com `dataEntregaISO > estoqueProntoContadoEmISO` e que **já saíram**: status
    `ENTREGUE`, ou `dataEntregaISO < hoje`. O pedido de hoje ainda não entregue continua no pote.
  - `pedidos`: quantos pedidos entraram em `saiu`.
  - `esperado`: `max(0, contagem.quantidade + feitas − saiu)`; `null` sem contagem que valha
    (vencida ou nunca), como hoje.
- **Por que diferente do `restamNoPote`.** O cardápio desconta também o pedido futuro e o
  orçamento, porque é o que não pode vender duas vezes. A contagem pergunta o que está **fisicamente**
  no pote: só sai o que foi entregue, ou cujo dia passou.
- Mora onde `unidadesPorFicha` não feche ciclo: `cardapio.ts` importa `projecaoDoPronto` de
  `producao.ts`. Se `producao.ts` precisar de `unidadesPorFicha`, ela desce para `producao.ts` e
  `cardapio.ts` passa a importá-la de lá.

### A leitura dos pedidos

- `TelaContagemPronto` lê os pedidos com `arquivado == false` e `dataEntregaISO >=
diaVizinho(hoje, −IDADE_VENCE_DIAS)`: a mesma janela de `consultaFornadas` (contagem mais velha
  que isso já é vencida e não tem esperado) e a mesma forma de consulta de `AgendaHoje`, que já tem
  índice.
- Os kits vêm da mesma consulta de fichas (`dados`, antes do filtro `temPronto`).

### A frase diz o esperado primeiro

No celular, embaixo do nome (`referencia`):

- Com movimento desde a contagem: **"esperamos 9 · 16 contadas há 8 dias, +12 da massa, −19 em 4
  pedidos"**. Cada parcela só aparece se não for zero.
- Sem movimento: como hoje, "7 unidades · contada há 23 dias".
- **`VENCIDA`**: `TriangleAlert` 14 px e "vencida · contada há mais de um mês" em `--attention`.
- **`NUNCA`**: triângulo e "nunca contada" em `--attention` **só se houve fornada dela na janela**
  (há massa feita e nenhum número). Sem fornada, "nunca contada" fica em `--ink-muted`, sem
  ícone: nada indica que haja algo no pote.

Cor nunca sozinha; nada em âmbar.

### A tela abre no que precisa

- `precisaConferirOPote(esperado)`: `VENCIDA`, `ENVELHECENDO`, fornada desde a contagem, pedido que
  saiu desde a contagem, ou `NUNCA` **com** fornada na janela. Testes dos casos.
- Sem semente da fornada, as pílulas de `Pilulas` na faixa de ferramentas: **"Precisa conferir
  (N)"** e **"Todos (10)"**. Mesmas regras do `#d331`: abre no recorte quando N está entre 1 e o
  total menos 1; senão, sem pílulas; trocar não apaga nada; a linha contada não some do recorte
  até trocar de pílula ou reabrir.
- Com semente, as pílulas da semente ("Só este produto" / "Todos") continuam sozinhas.
- No print, isso deixa de fora os cinco "nunca contada" sem fornada: a tela abre com o que de fato
  mexeu.

### "Igual"

- O botão terciário do `#d330`, com a mesma regra de onde ele aparece: linha intocada, contagem
  `FRESCA` ou `ENVELHECENDO`, **sem fornada e sem pedido** desde então. `aria-label`: "Igual à
  última contagem: 7 unidades". O toque escreve o número; a frase passa a "igual à última,
  conferido hoje".
- Com movimento, não aparece: o número velho já não é o do pote, e o esperado é palpite (a
  diferença entre os dois é o que a 132 mostra).

---

## 2 · Antes de tocar em código

1. Ler `#d164` e `restamNoPote` em `domain/cardapio.ts`: a conta irmã.
2. Ler `projecaoDoPronto` e `#d97`: o pote é medição com data, não saldo. Esta spec não grava nada
   derivado; o esperado é leitura, como a projeção.
3. Ler o "Igual" e o recorte em `LinhaContagem.tsx` e `TelaContagem.tsx` (125, 126) e reaproveitar
   o que der sem generalizar à força: as linhas são de tipos diferentes (`LinhaDeContagem` contra
   `FichaTecnica`).
4. Abrir `/fichas/contagem` com os dados reais: anotar quais produtos têm fornada na janela.

---

## 3 · Escopo

- `domain/producao.ts` (ou `cardapio.ts`): `esperadoNoPote`, `precisaConferirOPote`, com testes:
  entregue antes da contagem não sai; orçamento e cancelado não saem; pedido de hoje não entregue
  não sai; ontem não marcado como entregue sai; combo e kit descontam a ficha de dentro; nunca
  abaixo de zero.
- `TelaContagemPronto.tsx`: a consulta de pedidos, a frase, o ícone, as pílulas, o "Igual".
- `DECISOES.md`: `#d335`, e nota no `#d97` ("a contagem mostra o esperado com a saída dos
  pedidos; o pote gravado continua medição").
- `novidades.ts`: "Na contagem do que está pronto, veja quanto deveria ter em cada pote".

---

## 4 · Roteiro de navegador

Em 360 px e 1280 px, nos dois temas:

1. Tradicional com pedidos entregues desde a contagem: "esperamos N · 16 contadas há 8 dias, −X
   em Y pedidos".
2. Um pedido para hoje, ainda confirmado: não desconta; marcar como entregue: desconta.
3. Combo com "1 Red Velvet" entregue: desconta do Red Velvet.
4. Abre em "Precisa conferir"; os minis sem fornada ficam em "Todos", sem triângulo.
5. Registrar uma fornada de Mini Oreo e voltar (pelo "Todos"): "nunca contada" com triângulo.
6. "Igual" só em linha sem fornada e sem pedido desde a contagem.
7. Vinda de "Fiz a massa": só as pílulas da semente.

---

## Critérios de aceite

- [x] Esperado = contagem + massa − pedidos que saíram, com os testes da seção 3.
- [x] Frase com o esperado primeiro e as parcelas que não são zero.
- [x] Triângulo e palavra em vencida, e em nunca contada só com fornada na janela.
- [x] Recorte "Precisa conferir" com as regras do `#d331`.
- [x] "Igual" só sem movimento.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d335` e a nota no `#d97` escritos;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Dia passado conta como entregue, mesmo sem o status.** Ela esquece de marcar; o cookie saiu
  igual. Se o pedido ficou para outro dia, ela muda a data, e a conta acompanha.
- **"Nunca contada" sem fornada não é atenção.** Um produto feito na hora nunca vai ter pote, e
  pintá-lo de ocre para sempre ensinaria a ignorar o ocre.
- **Sem campo "não guardo pronto" na ficha.** É schema; a regra da fornada resolve o print sem ele.
  Volta se um produto guardado em pote ficar meses sem fornada registrada.

---

## Fora de escopo

- **Gravar o esperado** ou transformar o pote em saldo: `#d97` continua.
- **A grade do desktop** (133) e o **resumo depois de salvar** (132).
- **Massa e assado em potes separados**, validade, lote: é schema, e é outra conversa.
