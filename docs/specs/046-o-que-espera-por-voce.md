# Spec 046 · O que espera por você

**Tipo:** a tela Hoje ganha uma lista curta do que pede resposta dela (pedido que chegou pelo
cardápio, pedido que passou do dia, entrega feita e não recebida), e a agenda vazia deixa de
ser o maior bloco da tela: vira uma linha, e o link do cardápio vem para perto dela. Duas
consultas novas no cliente, sem índice novo. **Nenhum campo, nenhuma rota, nenhuma regra,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Hoje com `/impeccable` (2026-09-25).
**Depende de:** a 045 (o lugar da coluna "o dia" no desktop largo). Sem ela, a lista entra na
pilha única, acima do mês.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d213` a `#d215`.

---

## Problema

1. **O pedido que a cliente fez pelo link não chega à tela de entrada.** A 031 abriu o
   cardápio público, e o pedido nasce como `ORCAMENTO` com `origem: "CARDAPIO"`. A cliente
   está esperando a confirmação. A agenda só mostra o que é para os próximos 7 dias; a
   encomenda de aniversário para daqui a duas semanas não aparece em lugar nenhum da Hoje, e a
   cliente fica sem resposta. Todo produto de venda que fatura por assinatura (iFood,
   Nuvemshop, Shopify, o próprio WhatsApp Business) abre no "pedido novo". É a notificação que
   paga a mensalidade.
2. **O que já passou some.** `AgendaHoje` começa em hoje por escolha (o comentário do
   componente: "sem cobrança de ontem no meio"). O efeito é que o pedido confirmado para ontem,
   que ela esqueceu de marcar como entregue ou que de fato não saiu, fica invisível na tela
   que ela abre.
3. **O dinheiro que já é dela e não entrou** (`consultaEntreguesEmAberto`) só aparece em
   `/pedidos`, na faixa "A receber".
4. **A agenda vazia ocupa a tela.** Na captura de desktop, o estado vazio tem 300 px de altura
   e o maior título da página depois da saudação é "Nada marcado para os próximos dias". O
   estado vazio grande foi desenhado para ensinar a tela a quem nunca anotou um pedido; para
   quem opera, uma semana calma é um estado normal, e não merece o centro da tela.
5. **A ferramenta que traz pedido mora escondida.** O link do cardápio está em
   `/configuracao › Seu cardápio`, dentro de um painel. Na semana vazia, a Hoje oferece
   "Anotar um pedido" (que ela ainda não tem) e não oferece "mandar o cardápio" (que é o que
   gera o pedido).

---

## 1 · O que esta spec decide

### "Esperando você": três fontes, uma lista, acima do mês: `#d213`

Componente novo `EsperandoVoce`, primeiro bloco depois da faixa do teste e dos primeiros
passos. **Não existe quando está vazio**, como o cartão de compras: sem título, sem "tudo em
dia", sem esqueleto.

É **lista com divisórias**, não cartões: um contorno só (`rounded-lg border bg-surface`) e
linhas de 52 px, cada uma alvo inteiro. Três tipos de linha, nesta ordem:

| Linha                   | Consulta                                                                                                                                                | Texto                                                                  | Vai para        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------- |
| Pedido pelo cardápio    | `arquivado == false`, `origem == "CARDAPIO"`, `status == "ORCAMENTO"`, só igualdades (a mesma da rota `/api/cardapio/pedido`)                           | "Ana pediu pelo cardápio" / "12 cookies · sáb, 4 out" · valor          | `/pedidos/{id}` |
| Passou do dia           | `consultaAgenda` com `dataEntregaISO < hoje` e `status in [CONFIRMADO, EM_PRODUCAO, PRONTO]` (o índice `arquivado + status + dataEntregaISO` já existe) | "Pedido da Ana era para ontem" / "Marcar como entregue ou mudar o dia" | `/pedidos/{id}` |
| Entregue e não recebido | `consultaEntreguesEmAberto` (já existe)                                                                                                                 | "R$ 180,00 pra receber" / "de 2 entregas já feitas"                    | `/pedidos`      |

- As duas primeiras são uma linha **por pedido**, até 3 de cada, e "e mais N" leva a
  `/pedidos`. A terceira é **uma linha só**, somada por `aReceber`: é dinheiro, não tarefa.
- Ícones: `inbox` (cardápio), `calendar-clock` (passou do dia, em `attention` com a palavra
  "era para"), `hand-coins` (receber, `ink-muted`). Nenhuma é vermelha: nada disso é erro.
- A ajudante vê as duas primeiras (ela confirma e entrega); a de dinheiro, só a dona.
- Pedido pelo cardápio para **hoje ou amanhã** sobe para o topo da lista, com o marcador
  "Para amanhã": é o que ela não pode deixar para depois.

Reverte a frase do comentário de `AgendaHoje` sobre "cobrança de ontem": a agenda continua
começando em hoje, e o que passou mora aqui, separado, com a saída na própria linha. Não é
cobrança; é a pergunta "isso saiu?".

### A agenda vazia de quem já opera é uma linha: `#d214`

- **Antes dos primeiros passos terminarem** (`conta.primeirosPassosEm` ausente): o estado
  vazio grande continua, porque ensina.
- **Depois:** o estado vazio vira uma linha dentro do mesmo contorno da agenda, 56 px:
  "Nada marcado até sexta, 2 de outubro." com o botão terciário "Anotar um pedido" à direita.
  A data é `diaVizinho(hoje, 7)` por extenso; ela diz até onde a agenda olha, o que "os
  próximos dias" não dizia.

### O link do cardápio vai para perto da agenda: `#d215`

Uma linha logo abaixo da agenda, **só para a dona**, **só com o cardápio aberto** e **só
quando a agenda tem menos de 3 pedidos na semana** (a semana cheia não precisa de mais
convite):

```
[store]  Seu cardápio está no ar                [Mandar o link]
         6 produtos · 1 pedido por ele este mês
```

- "Mandar o link" usa `navigator.share` quando existe e copiar quando não, com o "Copiado"
  vivo por 2 s: exatamente o que `SeuCardapio` já faz. O par sai de lá para um hook
  `useLinkDoCardapio()` em `src/components/conta/`, e `SeuCardapio` passa a usá-lo. Nada é
  escrito duas vezes.
- A contagem de pedidos pelo cardápio no mês sai da consulta da primeira linha de `#d213`
  mais os já confirmados; se custar consulta nova, a segunda linha do bloco fica só com os
  produtos.
- **Cardápio fechado, plano completo:** "Receba pedido por um link" e "Abrir o cardápio",
  que leva a `/configuracao` com o painel aberto (`?painel=cardapio`, se a tela ainda não
  aceita, a sessão acrescenta a leitura do parâmetro).
- **Plano essencial** (`usePortao("cardapio") === "fechado"`): a linha não aparece. Vender o
  upgrade na tela de entrada é a 048, com os números dela.

---

## 2 · Antes de tocar em código

- Confirmar que a regra deixa a ajudante ler `pedidos` com `origem` (ela lê a coleção inteira,
  `#d157`) e que a consulta só de igualdades não pede índice no cliente (a rota do servidor já
  roda igual).
- Ler `ListaPedidos.tsx:404` (o `atrasado` de lá): a condição de "passou do dia" é a mesma,
  e se já é função, reusar.

---

## 3 · Escopo

- `src/components/pedidos/EsperandoVoce.tsx`, novo.
- `src/components/pedidos/AgendaHoje.tsx`: o estado vazio em duas formas (`#d214`); o
  comentário do topo atualizado.
- `src/components/conta/useLinkDoCardapio.ts`, novo, extraído de `SeuCardapio.tsx`.
- `src/components/conta/LinhaDoCardapioHoje.tsx`, novo.
- `src/app/(app)/(coluna)/page.tsx`: a ordem.
- Se a condição "passou do dia" não existir como função pura: `passouDoDia(pedido, hoje)` em
  `domain/pedido.ts`, com teste.

---

## 4 · Roteiro de navegador

1. Na página pública, fazer um pedido para daqui a 15 dias. Abrir a Hoje: a linha "pediu pelo
   cardápio" está lá; a agenda não tem o pedido.
2. Confirmar o pedido: a linha some.
3. Pedido confirmado com data de ontem: "era para ontem"; marcar entregue: some da lista e
   aparece "pra receber" se não foi pago.
4. Conta depois dos primeiros passos, semana vazia: a agenda é uma linha; o cardápio aberto
   aparece abaixo; "Mandar o link" abre a folha do sistema no celular e copia no desktop.
5. Login de ajudante: sem "pra receber", sem a linha do cardápio.
6. Sem rede: as três consultas vêm do cache; nada trava.

---

## Critérios de aceite

- [ ] "Esperando você" com as três fontes, lista com divisórias, ausente quando vazia.
- [ ] Pedido pelo cardápio aparece em qualquer data; hoje e amanhã no topo.
- [ ] Passou do dia com ícone e palavra, sem vermelho.
- [ ] Agenda vazia: grande antes dos primeiros passos, uma linha depois, com a data-limite.
- [ ] Linha do cardápio só para a dona, cardápio aberto, semana com menos de 3 pedidos.
- [ ] `useLinkDoCardapio` usado pelo painel e pela Hoje.
- [ ] Nenhum índice novo em `firestore.indexes.json`; `firestore.rules` intocado.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d213` a `#d215` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Aviso por push ou e-mail do pedido do cardápio.** É o que falta para ela saber do pedido
  sem abrir o app; pede service worker com push e permissão. Spec própria, depois de ver se
  a linha da Hoje basta.
- **Confirmar o pedido na própria linha.** Confirmar pede olhar data, itens e preço; é o
  editor.
- **Contador na navegação inferior.** O ícone de Pedidos com um número é o "notificações
  disputando atenção" do `PRODUCT.md`.

---

## Decisões desta spec que são fáceis de rejeitar

- **Mostrar o que passou do dia na tela de entrada.** Reverte o comentário da 3A. A defesa:
  sem isso, um pedido esquecido não aparece em lugar nenhum que ela abra sem procurar.
- **Esconder o estado vazio grande depois dos primeiros passos.** Se o roteiro mostrar que ela
  sente falta do convite, a linha ganha a frase de volta, não o bloco.

## Riscos

- **Linha "passou do dia" que nunca some,** para quem não usa os status e só anota. A saída
  na linha ("mudar o dia") e o limite de 3 contêm; se virar ruído permanente no uso, a linha
  passa a olhar só os últimos 3 dias.
