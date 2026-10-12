# Spec 146 · A fornada que os pedidos pedem (proposta)

**Tipo:** proposta para decisão, **não para implementar como está**. A bancada passa a saber quanto
os pedidos ainda pedem deste produto e já abre nas fornadas que cobrem, e passa a abrir a partir
do pedido, já ligada a ele. Reabre dois itens do "Fora de escopo" da 138.
**Tamanho:** grande demais para uma sessão. Se aprovada, vira 146-A (a sugestão) e 146-B (a
entrada pelo pedido), descritas na seção 3.
**Origem:** a crítica dos prints da bancada de 2026-10-12, item 11.
**Depende de:** 138.
**Aprovações pedidas:** **reabrir a 138** em "Escala por unidades desejadas" e "Bancada a partir
da lista de produtos ou de um pedido".
**Decisões a registrar:** `#d352`, se aprovada.

---

## Problema

Hoje a bancada abre em 1 fornada, sempre, e só pelo editor do produto (Produtos → o produto → a
faixa → "Abrir na bancada"). Mas a pergunta que ela faz ao entrar na cozinha não é "quantas
fornadas?": é "quanto eu preciso fazer para os pedidos de amanhã?". O Rende tem a resposta: os
pedidos abertos, o que já virou massa para eles (`reservadoNoPronto`) e o que está pronto no pote
(`prontosLivres`). Ela faz a conta de cabeça com o app aberto ao lado.

Nenhum app de receita pago sabe de pedido. Os de gestão que sabem (Meez, Galley, Apicbase) cobram
caro justamente por "plano de produção que vira receita escalada". É a frase do Rende ("o sistema
faz a conta; ela toma a decisão") aplicada à cozinha.

---

## 1 · A proposta

### 1.1 Quanto os pedidos pedem

- `faltaFazer(fichaId, pedidos, fornadas, prontosLivres)` em `domain/producao.ts`: o que os pedidos
  abertos pedem desta receita (itens e escolhas de combo, como `reservadoNoPronto` já soma), menos
  a massa já feita para eles, menos os prontos livres. Piso zero.
- Os pedidos são os da lista de compras (`entraNaLista`, até `HORIZONTE_MAXIMO`): o mesmo recorte
  que a despensa usa, para as duas telas nunca discordarem.
- **Teto conhecido:** a caixa com cookie fixo dentro continua agregada pela ficha da caixa (o
  `ponytail` de `reservadoNoPronto`). Precisa explodir `componentes`, como já explode `escolhas`.

### 1.2 Na bancada

- Acima das pílulas: **"Os pedidos até sábado pedem 40 · 6 prontos · faltam 34"**, em `label`, com
  `ClipboardList`.
- A bancada **abre** nas fornadas que cobrem os 34, arredondadas para cima em meia fornada (34 ÷ 16
  = 2,125 → 2½), e só quando a aba não tem escolha guardada. A pílula "2½" aparece **só** quando a
  conta pede um valor fora de ½ · 1 · 2 · 3, marcada com "pedidos" embaixo. Ela troca à vontade: é
  o campo que vem preenchido e editável (`PRODUCT.md`, princípio 1).
- `faltam 0`: "Os pedidos já estão cobertos" e a bancada abre em 1, como hoje.

### 1.3 Pelo pedido

- No editor do pedido, cada item de receita ganha "Abrir na bancada", que vai para
  `/fichas/{id}/bancada?pedido={pedidoId}`. A bancada abre nas fornadas **deste** pedido, e o
  `PainelFornada`, que já aceita `pedido`, registra a fornada ligada a ele (`#d91`).
- Na lista de produtos, a linha da receita ganha "Na bancada" no menu dela. Nunca na linha inteira:
  o toque da linha continua abrindo o produto.

## 2 · O que pede decisão

1. **Reabrir a 138** nos dois itens.
2. **Meia fornada como passo.** 2½ é o que a pílula mostra; quem quer 34 exatos digita na folha da
   fornada, que já aceita fração (`lotes`).
3. **Abrir já na sugestão**, e não só mostrar. A proposta segue o princípio 1; a alternativa é
   abrir em 1 e a frase oferecer "Usar 2½".

## 3 · Divisão, se aprovada

- **146-A · A sugestão.** `faltaFazer` com teste, a frase e a pílula na bancada.
- **146-B · A entrada pelo pedido.** O parâmetro `pedido`, o link no item do pedido e no menu da
  lista, a fornada ligada.

---

## Pergunta para a Maynara antes de tudo

"Quando você vai fazer massa, você parte dos pedidos de amanhã ou faz sempre a mesma quantidade e
congela?" Se for "sempre a mesma e congelo", a 146-A perde a razão e a 146-B fica sozinha.

---

## Fora de escopo, em qualquer caso

- Plano de produção do dia com várias receitas numa tela (é a tela Hoje, e outra spec).
- Campo livre "quero N unidades" na bancada.
