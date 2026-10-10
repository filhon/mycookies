# Spec 115 · Antes de pedir

**Tipo:** o topo do cardápio público responde as perguntas que a cliente faz antes de pedir
(para quando dá, como paga, onde retira) e a dona ganha "agenda cheia até…" no lugar de fechar
o cardápio. **Schema aditivo em `ConfiguracaoGeral.cardapio`** (`recado?`, `aPartirDeISO?`).
Nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10.
**Depende de:** 031.
**Aprovações pedidas:** (1) **schema aditivo**: `cardapio.recado?: string` e
`cardapio.aPartirDeISO?: DataISO`; (2) **o que sai para fora**: os tipos das formas de pagamento
ativas (nunca o nome, a taxa, a chave Pix ou as instruções); (3) a reversão parcial de um item do
"Fora de escopo" da 031 (seção "Decisões fáceis de rejeitar").
**Decisões a registrar:** `#d318`.

---

## Problema

1. **A página não responde nada antes do formulário.** No print, o topo tem o nome e dois botões.
   As perguntas que a cliente manda no WhatsApp antes de pedir ("aceita Pix?", "pra quando dá?",
   "entrega no meu bairro?", "onde eu pego?") só têm resposta, e parcial, dentro da folha do
   pedido, depois de escolher. Todo cardápio pago põe isso no topo: prazo, pagamento, retirada.
   Quem não acha, pergunta no WhatsApp, e o cardápio deixa de poupar a conversa que ele existe
   para poupar.
2. **Com a agenda cheia, a única saída é fechar o cardápio.** Semana de Natal, encomenda grande:
   para não receber pedido para amanhã, ela fecha, e o link da bio passa a dizer "Este cardápio
   não está aberto agora", que para quem chega parece link quebrado. O cardápio de encomenda não
   precisa fechar: precisa empurrar o primeiro dia.
3. **O Rende já sabe como ela recebe.** As formas de pagamento ativas estão na configuração; a
   página só não diz.

---

## 1 · O que esta spec decide: `#d318`

- **"Antes de pedir"**, logo abaixo do nome e da frase, uma lista curta (`<dl>` visual de até
  três linhas, ícone de 16 px e texto `label`, `--ink`), cada linha só quando tem o que dizer:
  - `CalendarDays` · **"Pedidos para a partir de amanhã"**, ou, com agenda cheia, "Pedidos para
    a partir de sexta, 17 de outubro" (`rotuloDiaPorExtenso`). Sempre aparece: é a regra que a
    folha já aplica, dita antes.
  - `Wallet` · **"Pix, dinheiro ou cartão"**, pelos **tipos** das formas ativas, por
    `pagamentoEmTexto(tipos)` em `domain/cardapio.ts` com teste: `PIX` → "Pix", `DINHEIRO` →
    "dinheiro", `DEBITO`/`CREDITO`/`CREDITO_PARCELADO` → "cartão" (uma vez), `TRANSFERENCIA` →
    "transferência"; na ordem Pix, cartão, dinheiro, transferência; juntados com vírgula e "ou".
    Pelo tipo e não pelo nome, porque o nome é dela para ela ("Crédito maquininha Stone").
  - O **recado**, como parágrafo `body` abaixo das linhas, quando ela escreveu.
- **O recado da loja.** `cardapio.recado?: string`, até 280 caracteres, texto dela, sem
  formatação. É onde mora o que o Rende não sabe e a 031 deixou fora de propósito: bairro de
  retirada, área de entrega, antecedência de bolo grande, pedido mínimo. "Retirada no
  Espinheiro. Entrega a combinar. Bolos com 3 dias de antecedência."
- **Agenda cheia.** `cardapio.aPartirDeISO?: DataISO`, "o primeiro dia que aceito". A página
  começa os botões de "Para quando?" em `max(amanhã, aPartirDeISO)` e o `min` do calendário
  também; o handler recusa com `data` o que vier antes, pela mesma conta
  (`primeiroDiaDoCardapio(hojeISO, aPartirDeISO)`, pura e testada, usada pelos dois). Passado o
  dia, o campo vale como ausente sozinho; o próximo `salvarCardapio` o limpa, como a promoção
  vencida. Máximo: hoje + `DIAS_A_FRENTE`.
- **O painel "Seu cardápio"** ganha, abaixo do link, a seção **"Para a cliente saber"**:
  - "Recado" (`AreaTexto`, 280, com a contagem) e a dica "Aparece no topo do cardápio. Onde
    retirar, onde você entrega, o que precisa de mais antecedência.";
  - "Agenda cheia até" (`type="date"`), com a frase ao vivo "A cliente só escolhe a partir de
    sexta, 17 de outubro." e "Tirar". Grava o dia seguinte ao escolhido como `aPartirDeISO`
    (ela pensa em "cheia até", a página em "a partir de");
  - a linha fixa em `--ink-muted`: "Como você recebe vem das suas formas de pagamento." com o
    link para elas.
    Grava por `salvarCardapio`, no toque para a data, no sair do campo para o recado (a 015).
- **O que sai para fora a mais:** os tipos das formas ativas, o recado e o primeiro dia. O teste
  das chaves de `Cardapio.negocio` ganha `pagamento`, `recado` e `aPartirDeISO`, e confere que
  nada de `FormaPagamento` além do tipo passa.

---

## 2 · Antes de tocar em código

1. **Pedir as aprovações** (schema e o que sai para fora).
2. Ler `pedidoDoCardapio` (o teste da data) e o bloco "Para quando?" de `PedidoPeloCardapio`.
3. Ler `SeuCardapio.tsx` e a limpeza da promoção vencida em `salvarCardapio`.

---

## 3 · Escopo

- `types/configuracao.ts`: os dois campos, com o comentário da spec.
- `domain/cardapio.ts`: `pagamentoEmTexto`, `primeiroDiaDoCardapio`, `montarCardapio` devolve
  `negocio.pagamento`, `recado`, `aPartirDeISO`; `pedidoDoCardapio` usa o primeiro dia. Testes:
  os tipos misturados, cartão uma vez só, sem forma ativa sem linha, o primeiro dia antes/depois
  de amanhã, o vencido ignorado, o handler recusando o dia antes, as chaves.
- `page.tsx` (a lista do topo), `PedidoPeloCardapio.tsx` (os dias), `SeuCardapio.tsx`,
  `mutations/configuracao.ts`.
- Linha em `components/comecar/novidades.ts`: "Agenda cheia sem fechar o cardápio".

---

## 4 · Roteiro de navegador

1. Escrever o recado no painel: em até um minuto, a página o mostra abaixo do nome.
2. "Agenda cheia até" quinta: a página diz "a partir de sexta", e o primeiro botão de dia é
   sexta. `fetch` com a data de quarta: `data`.
3. No dia seguinte à data, sem tocar em nada: volta a "a partir de amanhã".
4. Desativar o cartão nas formas: a linha diz "Pix ou dinheiro". Desativar todas: a linha some.
5. 360 px: a lista do topo não empurra a primeira foto para fora da primeira tela com a faixa da
   113 (conferir as duas juntas, se a 113 já entrou).

---

## Critérios de aceite

- [ ] A lista "antes de pedir" no topo, cada linha só com dado; o recado dela abaixo.
- [ ] Formas por tipo, sem nome, taxa ou chave; teste das chaves.
- [ ] "Agenda cheia até" empurra o primeiro dia na página e no handler, pela mesma função, e
      vence sozinha.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d318` escrito; `ESTADO.md` e `novidades.ts`
      atualizados.

---

## Decisões fáceis de rejeitar

- **"Agenda cheia" é a antecedência configurável que a 031 deixou fora.** Lá a regra era "vira
  campo com o primeiro pedido real que ela precisar recusar toda semana". Aqui não é regra fixa
  ("sempre 2 dias"), é uma data que vence: o caso é a semana lotada, e a alternativa dela hoje é
  fechar o link da bio.
- **Recado em texto livre, e não campos** (bairro, raio, mínimo). Cada campo seria uma regra que
  o Rende passaria a ter de cumprir; o texto é dela e não promete nada que o sistema não faça.

---

## Fora de escopo

- **Horário de funcionamento e dias da semana fechados.** A data cobre a semana cheia; dia fixo
  de folga vira campo quando ela recusar o mesmo dia toda semana.
- **Taxa de entrega por bairro e pedido mínimo calculado.** O recado diz; o sistema não cobra.
- **Pausa total com o cardápio aberto** (ver produtos sem pedir). "Agenda cheia" até 90 dias
  cobre; abaixo disso é fechar.
