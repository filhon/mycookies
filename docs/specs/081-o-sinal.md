# Spec 081 · O sinal

**Tipo:** a encomenda paga em duas vezes. O pedido passa a aceitar **um sinal**, que entra no caixa
no dia em que entrou, e "marcar como pago" passa a receber o que falta. Muda o que "a receber" quer
dizer. **Pede aprovação de schema antes de começar.**
**Tamanho:** duas sessões, **081-A** (domínio e mutações) e **081-B** (as telas).
**Origem:** crítica da tela de pedido sobre os prints de 2026-10-02.
**Depende de:** a 075 (o bloco Pagamento junto). A 080 lê o que falta pagar daqui, se vier depois.
**Aprovações pedidas:** **schema** (campo novo em `Pedido` que muda o sentido de `pago` e de "a
receber"); **regras**, se `firestore.rules` validar as chaves de `pedidos`.
**Decisões a registrar:** `#d279` e `#d280`.

---

## Problema

Encomenda de confeitaria se paga em duas vezes: o sinal (quase sempre metade) quando a cliente
confirma, o resto na entrega. Bakesy, CakeBoss e BakeSmart, os serviços de confeitaria que cobram
assinatura, têm sinal; é a primeira coisa que uma confeiteira procura num sistema de pedidos.

O Rende tem `pago: boolean`. Com o sinal na mão, ela escolhe entre dois erros:

1. **Marca como pago no sinal.** O pedido some de "Me devem" (062) e a outra metade vira dinheiro
   esquecido.
2. **Marca como pago só no fim.** O sinal, que entrou em setembro, aparece no caixa de outubro. O
   mês de setembro rende menos do que rendeu, e o relatório do MEI (074), que é regime de caixa,
   sai errado.

Os dois são número errado no lugar em que o produto existe para acertar.

---

## 1 · O que esta spec decide

### Um sinal por pedido, como entrada própria: `#d279`

- **`Pedido.sinal?: { valor: Centavos; pagoEm: Timestamp; competencia: CompetenciaMensal;
transacaoId: string; custoTaxa: Centavos }`**. Um só: o caso real é sinal e resto, e N
  pagamentos parciais seriam uma lista para resolver um problema que ela não tem.
- **Registrar o sinal** (pedido não pago, não cancelado): no bloco Pagamento, terciário "Recebi um
  sinal", que abre o valor (`CampoMoeda`, nasce com metade do total, arredondada ao real) e o dia
  (hoje). Confirmar cria uma transação `ENTRADA`/`VENDA` do valor, no dia, num `writeBatch` com o
  pedido, como `marcarPedidoPago` faz. Nada de `runTransaction`.
- **A taxa da maquininha** é por pagamento: percentual sobre o valor do sinal, e a taxa fixa uma
  vez por transação, que é como a maquininha cobra.
- **O agregado:** o sinal entra em `entradas` (e no dia) do mês dele, como qualquer transação. A
  parte do pedido no agregado (`receitaPedidos`, `custoDoVendido`, `produtos`, `qtdPedidos`)
  continua na **quitação**, com o total, como hoje. Assim o caixa conta o dinheiro quando entrou,
  e o "rendeu" (`#d261`) conta o pedido uma vez. "Recalcular o mês" refaz a transação do sinal
  como refaz qualquer transação; conferir que a metade do pedido não soma entrada.
- **Marcar como pago** com sinal cria a transação de `total − sinal.valor`, com a taxa sobre esse
  valor. A frase: "Entra o resto, R$ 50,00. O sinal de R$ 50,00 entrou em 28/09."
- **"A receber"** (`aReceber`, "Me devem", "Vai entrar", a linha da lista, a ficha) passa a contar
  `total − sinal`. A linha: "Sinal R$ 50,00 · faltam R$ 50,00".
- **Desfazer:** "Desfazer o pagamento" desfaz só a quitação; o sinal fica. "Desfazer o sinal"
  (terciário, só sem quitação) arquiva a transação e tira o campo, com a confirmação de sempre.
- **Mudar o total depois do sinal:** o sinal fica. Total menor que o sinal não salva: "O sinal
  (R$ 50,00) é maior que o pedido. Desfaça o sinal ou ajuste os itens."

### Cancelar com sinal: `#d280`

- A confirmação de cancelar um pedido com sinal pergunta, numa `Confirmacao` (modal: é destrutivo):
  "**Ficou com o sinal**" (padrão: o caixa não muda, o sinal é receita dela) ou "**Devolvi o
  sinal**" (arquiva a transação do sinal). O texto de cada opção diz o que acontece no caixa.

---

## 2 · Antes de tocar em código

1. **Pedir a aprovação** do campo e do novo sentido de "a receber". Sem ela, nada começa.
2. Ler `marcarPedidoPago`, `desfazerPagamento`, `deltaDoPedido` e `pedidoAgregavel`
   (`mutations/pedidos.ts`), `aReceber` (`domain/pedido.ts`) e o "Recalcular o mês".
3. Ler `firestore.rules` para `pedidos` e `transacoes`.

---

## 3 · Escopo

**081-A, domínio e mutações:**

- `domain/pedido.ts`: `faltaPagar(pedido)`, `sinalSugerido(total)`, `aReceber` com o sinal, a
  validação do total contra o sinal; testes.
- `mutations/pedidos.ts`: `registrarSinal`, `desfazerSinal`; `marcarPedidoPago` e o cancelamento
  com sinal; `atualizarPedido` de pedido com sinal.
- Roteiro de dados: um pedido com sinal em setembro e quitação em outubro; "Recalcular" os dois
  meses dá o mesmo agregado.

**081-B, telas:**

- O bloco Pagamento do editor, a ficha (063, "Recebi" recebe o que falta), a linha da lista e as
  vistas de 062, a mensagem do WhatsApp ("Sinal recebido: R$ 50,00. Falta: R$ 50,00.") e a
  confirmação de cancelar.

---

## 4 · Roteiro de navegador

1. Pedido de R$ 100,00: "Recebi um sinal" nasce com R$ 50,00; confirmar põe R$ 50,00 no caixa de
   hoje e o pedido em "Me devem" com R$ 50,00.
2. Marcar como pago: entra R$ 50,00; o mês do pedido no agregado é o da quitação; o caixa de cada
   mês tem a metade dele.
3. Sinal em cartão de crédito: a taxa de cada pagamento sai no mês dele.
4. Desfazer o pagamento: o sinal fica. Desfazer o sinal: o caixa volta.
5. Cancelar com sinal, "Ficou com o sinal": o caixa não muda. "Devolvi": sai.
6. Baixar o total para R$ 40,00 com sinal de R$ 50,00: não salva, com a frase.
7. Sem rede: registrar sinal e pagar funcionam e sobem depois.
8. Relatório do MEI de setembro: o sinal está lá.

---

## Critérios de aceite

- [ ] Aprovação registrada antes do código.
- [ ] Um sinal só; transação própria; `writeBatch`, sem transação.
- [ ] O pedido no agregado continua na quitação; o caixa conta o dinheiro quando entrou.
- [ ] "A receber" desconta o sinal em toda tela.
- [ ] Cancelar pergunta o destino do sinal.
- [ ] "Recalcular o mês" bate nos dois meses.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`, nas duas sessões.
- [ ] `#d279` e `#d280` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Mais de um pagamento parcial.** Um sinal e o resto.
- **Sinal pelo cardápio** (a cliente paga ao pedir). Pede gateway.
- **Exigir sinal** para confirmar. O sistema mostra; ela decide.

---

## Decisões desta spec que são fáceis de rejeitar

- **O pedido no agregado na quitação, e não rateado.** Ratear receita e custo entre dois meses
  deixaria o ranking de produtos com metade de cookie em cada mês.
- **"Ficou com o sinal" como padrão do cancelamento.** É o combinado comum na confeitaria; o
  outro caminho está a um toque.

---

## Riscos

- **É dinheiro em três lugares** (pedido, transação, agregado). Toda escrita no mesmo
  `writeBatch`; o "Recalcular" é a rede de proteção, e o roteiro 2 é obrigatório.
- **Pedidos antigos** não têm `sinal`: ausente é "sem sinal", e nada muda para eles.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real, em cada
sessão; o roteiro da seção 4.
