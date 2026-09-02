# Spec 003 · Vendas, pedidos e lista de compras

**Tamanho:** três sessões. `3A` pedido e agenda, `3B` do pedido ao caixa, `3C` lista de
compras. Não juntar.
**Depende de:** specs 000, 002 e 004 executadas.
**Decisões que originam:** `DECISOES.md#d08` (snapshot no pedido), `#d11` (kit com um nível),
`#d23` (o par delta/agregar) e `#d28` (o que a 4B deixou esperando por este módulo).

## Problema

A Maynara sabe o custo de cada doce, o preço que fecha a margem e o resultado do mês. O que
ela não tem é o meio do caminho: **o pedido**. Hoje a encomenda mora no WhatsApp, a data de
entrega mora na cabeça, e a compra de insumo é feita por estimativa na frente da gôndola.

Três perguntas que nenhum módulo responde ainda:

1. **O que eu entrego esta semana, e para quem?**
2. **Quanto eu preciso comprar para dar conta do que já vendi?**
3. **Aquele pedido de R$ 240,00 deu quanto de lucro, de verdade?**

O Módulo 2 tornou visível o custo de um doce e o Módulo 4 o resultado de um mês. Este liga os
dois pela ponta que falta: a venda combinada, que vira produção, que vira compra, que vira
dinheiro no caixa.

## O que muda por vir depois do Módulo 4

A ordem executada foi 1 → 2 → 4 → 3, e agora ela cobra a conta. A spec 004 entregou metade de
`ResumoMensal` e deixou a outra metade em zero, com a regra de que **zero é ausência e não
pode aparecer na tela**. Esta spec preenche exatamente essa metade:

| Campo                                                | Quem alimenta | Nesta spec                              |
| ---------------------------------------------------- | ------------- | --------------------------------------- |
| `entradas`, `saidas`, `lucro`, `custoTaxasPagamento` | transação     | já existe; o pedido pago vira uma delas |
| `porDia[].pedidos`, `qtdPedidos`, `qtdItensVendidos` | pedido        | ✅ 3B                                   |
| `ticketMedio`, `produtos`                            | pedido        | ✅ 3B                                   |
| `custoInsumos`                                       | pedido        | ✅ 3B, renomeado                        |
| `Meta.pedidosNecessarios`, `ticketMedioReferencia`   | meta + pedido | ✅ 3B, vence `#d28`                     |

Duas consequências práticas, e as duas são estruturais:

- **A 3B mexe no coração da 4A.** `src/lib/domain/caixa.ts` passa a somar as duas metades.
  O teste da 4A é a rede: ele precisa continuar passando **sem uma linha alterada**. Se
  quebrar, o refactor quebrou o caixa.
- **O lançamento manual continua valendo.** O pedido pago passa a criar a transação, e a
  venda de balcão que nunca virou pedido continua entrando à mão, como hoje.

---

# Sessão 3A · O pedido e a agenda

## Escopo

Coleções `pedidos` e `clientes`, telas `/pedidos` e `/pedidos/[id]`, a agenda da tela Hoje, e
o motor em `src/lib/domain/pedido.ts`.

**Esta sessão não encosta no caixa nem no agregado.** Um pedido pode ser criado, editado,
confirmado e entregue sem que um centavo se mova no painel financeiro. Isso é de propósito: o
pedido precisa estar de pé e conferido antes de virar dinheiro, e separar 3A de 3B é o que
permite a 3B ser só sobre agregado.

### Módulo novo de domínio

`pedido.ts`. Puro, sem Firebase, coberto por teste.

```
derivarPedido(itens, desconto, taxaEntrega, forma)   // todos os totais de uma vez
codigoDoPedido(data)                                  // 'P-260915-K3F'
transicoesPermitidas(status)                          // para onde este pedido pode ir
```

`derivarPedido` existe pelo mesmo motivo de `derivarFicha` (`DECISOES.md#d19`): o editor
chama para desenhar o rodapé e a mutação chama para gravar. Dois caminhos somando um pedido
seriam dois caminhos para o total divergir do que ela mostrou para a cliente.

### Fórmulas

```
subtotalItem       = round(precoUnitario × quantidade)
custoItem          = round(custoUnitarioSnapshot × quantidade)

subtotal           = Σ subtotalItem
desconto           = min(desconto, subtotal)          // guarda: nunca total negativo
total              = subtotal − desconto + entrega.taxa
custoTotalEstimado = Σ custoItem
custoTaxaPagamento = taxaCobrada(total, forma)        // já existe em custosOperacionais.ts
lucroEstimado      = total − custoTotalEstimado − custoTaxaPagamento
```

**A taxa de entrega entra no total e não entra no custo.** Ela é dinheiro que a Maynara
recebe, então some com ela do total seria esconder receita; e descontá-la como custo exigiria
um campo de custo de entrega que não existe, o que seria inventar dado. A consequência é que
`lucroEstimado` carrega a taxa dentro, e por isso **a tela mostra a taxa em linha própria** —
do lucro de R$ 75,82 do caso de aceite, R$ 10,00 são a entrega, e ela precisa ver isso.

**A taxa da maquininha incide sobre o total**, entrega inclusa, porque é sobre o total que a
maquininha cobra.

### Snapshot: quando o preço congela

`DECISOES.md#d08` já decidiu que `ItemPedido` guarda `nomeSnapshot`, `precoUnitario` e
`custoUnitarioSnapshot`. Falta dizer **quando** eles são tirados.

```
o item entra no pedido   → congela preço e custo da ficha naquele instante
a quantidade muda        → multiplica o congelado, nunca busca o preço de hoje
a ficha muda de preço    → o pedido não se mexe
```

Enquanto o pedido é `ORCAMENTO`, e só enquanto é, a linha cujo preço divergiu da ficha ganha
um selo com a ação **"usar o preço de hoje"** — o mesmo vocabulário do `custoDesatualizado`
da ficha (`#d05`), pelo mesmo motivo: o sistema mostra e oferece, nunca reprecifica pelas
costas dela (`#d21`). De `CONFIRMADO` em diante o selo some: o preço combinado com a cliente
é o preço, e um orçamento aceito não muda de valor porque o chocolate subiu.

### Código do pedido, e o número que não existe

`Pedido.codigo` nasce no aparelho: `P-AAMMDD-XXX`, com três caracteres do `novoId()`. É a
identidade do pedido, e é o que a Maynara lê para a cliente.

**`Pedido.numero` fica sem gravar, e `ResumoGlobal.ultimoNumeroPedido` fica em zero.** Um
sequencial humano exige alguém contando em um lugar só, e contar exige `runTransaction`, que
exige rede — proibido em caminho crítico. Um pedido anotado na feira, sem sinal, não pode
esperar um número. `ResumoGlobal.proximaEntrega` e `pedidosAbertos` também ficam sem uso: a
agenda já responde as duas com a consulta que a tela Hoje faz de qualquer jeito, e campo
mantido por incremento que ninguém lê é campo que vai torcer em silêncio.

`ResumoGlobal.totalClientes`, esse sim, é incrementado — mesmo caminho de `totalInsumos` e
`totalFichas`.

### Status

```
ORCAMENTO → CONFIRMADO → EM_PRODUCAO → PRONTO → ENTREGUE
qualquer um → CANCELADO        CANCELADO → ORCAMENTO (reabrir)
```

Voltar um passo é sempre permitido: marcar "pronto" sem querer não pode custar um pedido. A
regra mora em `transicoesPermitidas` e é testada, e não espalhada em botões de tela.

Cancelar **não** apaga: `status = 'CANCELADO'`, como todo o resto do sistema. `arquivado`
continua sendo outra coisa — some da lista, e é o que se faz com o pedido duplicado.

### Cliente

Cadastro leve: nome, telefone, Instagram, endereço, observações. `nomeBusca` no mesmo padrão
de insumo e ficha.

**Pedido de cliente avulso não exige cadastro.** `clienteNome` é obrigatório e é snapshot;
`clienteId` é opcional. A cliente que compra uma vez na feira não vira ficha de cadastro, e
exigir isso transformaria a venda rápida em formulário.

Os agregados de `Cliente` (`totalPedidos`, `totalGasto`, `ticketMedio`, `ultimoPedidoEm`)
ficam em zero nesta sessão e **não aparecem na tela**. Eles são de dinheiro, e dinheiro é 3B.

### Telas

**`/pedidos`** — lista agrupada por data de entrega, da mais próxima para a mais distante,
com os já entregues fora do caminho. Cada linha: cliente, o que é, quanto, e o status como
texto mais ícone, nunca só cor. Um filtro de status em pílulas, como o de `/fichas`.

**`/pedidos/[id]`** — o editor, no mesmo desenho de `/fichas/[id]`, com o id `novo` para o
pedido que ainda não existe. Busca de ficha com adição por toque, quantidade por linha, e o
**rodapé fixo** com subtotal, desconto, entrega, total e "sobra deste pedido". O rodapé é o
mesmo padrão do painel de preço da ficha, pelo mesmo motivo: a pergunta que trouxe a Maynara
até aqui não pode depender de rolar a lista de itens.

**Tela Hoje** — a agenda substitui o estado vazio que hoje diz "a agenda entra no ar com o
módulo de pedidos". Entregas de hoje primeiro; se não houver nenhuma, as da semana. O cartão
de meta continua acima: o número que ela persegue vem antes da lista do dia.

### Índices

- `pedidos` por `arquivado` + `dataEntregaISO` crescente.
- `clientes` por `arquivado` + `nomeBusca` crescente.

O filtro de status é feito em memória: são dezenas de pedidos por mês, e um índice por
combinação de status seria manutenção sem retorno. **Rodar
`firebase deploy --only firestore:indexes` faz parte desta sessão.**

### Caso de aceite, com números

Duas fichas já salvas, com os números da spec 002: **Cookie tradicional** com custo unitário
441 e preço 690, e **Caixa com 6** com custo unitário 3200 e preço 4990. Crédito a 4,99%.

| Item               | Qtd | Preço unitário | Subtotal | Custo unitário | Custo da linha |
| ------------------ | --- | -------------- | -------- | -------------- | -------------- |
| Cookie tradicional | 20  | 690            | 13800    | 441            | 8820           |
| Caixa com 6        | 2   | 4990           | 9980     | 3200           | 6400           |

Desconto de 780 (ela arredondou para R$ 230,00) e taxa de entrega de 1000:

| Campo                | Conta                | Valor |
| -------------------- | -------------------- | ----- |
| `subtotal`           | 13800 + 9980         | 23780 |
| `total`              | 23780 − 780 + 1000   | 24000 |
| `custoTotalEstimado` | 8820 + 6400          | 15220 |
| `custoTaxaPagamento` | round(24000 × 4,99%) | 1198  |
| `lucroEstimado`      | 24000 − 15220 − 1198 | 7582  |

**Edição.** A cliente pediu 24 cookies em vez de 20, mesmo desconto e mesma entrega:

| Campo                | Conta                | Valor |
| -------------------- | -------------------- | ----- |
| `subtotal`           | 16560 + 9980         | 26540 |
| `total`              | 26540 − 780 + 1000   | 26760 |
| `custoTotalEstimado` | 10584 + 6400         | 16984 |
| `custoTaxaPagamento` | round(26760 × 4,99%) | 1335  |
| `lucroEstimado`      | 26760 − 16984 − 1335 | 8441  |

**Guarda.** Desconto de 30000 em um subtotal de 23780 vira desconto de 23780, e o total cai
para a taxa de entrega. Nunca total negativo, e a tela diz que o desconto foi limitado.

Esses números vão para `tests/domain/pedido.test.ts` como estão.

## Critérios de aceite 3A

- [ ] Os números do caso de aceite batem exatamente, em teste.
- [ ] Desconto maior que o subtotal não produz total negativo, e a tela explica.
- [ ] Preço e custo congelam quando o item entra, e mudar a quantidade não os refaz.
- [ ] Ficha que mudou de preço mostra o selo só enquanto o pedido é orçamento.
- [ ] `transicoesPermitidas` cobre avanço, um passo atrás, cancelamento e reabertura, em teste.
- [ ] Pedido sem item nenhum não salva.
- [ ] Cancelar muda o status e não apaga o documento.
- [ ] Pedido de cliente avulso salva sem cadastro de cliente.
- [ ] A tela Hoje mostra as entregas de hoje, e a da semana quando hoje está vazio.
- [ ] Nenhum número deste módulo aparece no painel financeiro ainda.
- [ ] Índices publicados.
- [ ] Portão de conclusão passando.

---

# Sessão 3B · Do pedido ao caixa

## Escopo

O pedido pago vira transação e alimenta a metade do agregado que a spec 004 deixou em zero.
Mais os agregados de `Cliente` e a meta que `#d28` deixou esperando.

**É a sessão perigosa das três.** Todo o resto é formulário e lista; aqui o agregado ganha um
segundo escritor, e agregado com dois escritores é onde um número torce em silêncio.

### O agregado ganha a segunda metade

`ParcelasDoAgregado`, em `caixa.ts`, cresce para carregar os campos de pedido. Nasce o par
obrigatório, ao lado do que já existe e pela mesma razão de `#d23`:

```
deltaDoPedido(pedido, sinal)      // o que somar quando um pedido é pago ou desfeito
agregarPedidos(pedidos)           // a metade do pedido, reconstruída do zero
agregarMes(transacoes, pedidos)   // o mês inteiro, as duas metades
```

O teste exige que os dois caminhos concordem, exatamente como na 4A. E há um ganho de
limpeza: **"Recalcular o mês" deixa de precisar ler o agregado antes de reescrevê-lo.** A
leitura só existia para preservar `porDia[].pedidos`, que este módulo passa a calcular
(`#d23`, segunda consequência). Uma consulta a mais, uma leitura a menos.

### Fórmulas

```
qtdPedidos        += 1
qtdItensVendidos  += Σ quantidade dos itens
receitaPedidos    += total
custoDoVendido    += custoTotalEstimado
porDia['DD'].pedidos += 1

produtos[fichaId].quantidade += quantidade
produtos[fichaId].receita    += subtotalItem
produtos[fichaId].lucro      += subtotalItem − custoItem

ticketMedio        = qtdPedidos > 0 ? round(receitaPedidos / qtdPedidos) : 0
```

`ticketMedio` é razão, e razão não se incrementa. Ele segue a regra que `#d30` já fixou para
o espelho da meta: **é gravado no mesmo ponto em que as parcelas mudam, e refeito na leitura
a partir de `receitaPedidos` e `qtdPedidos`**, que são exatos porque são incrementos. Quem
desenha a tela usa a versão refeita.

O dia é o **dia do pagamento**, e a razão está logo abaixo.

### Três mudanças de schema, e por que elas precisam de aprovação

1. **`ResumoMensal.receitaPedidos`**, campo novo. Sem ele, `ticketMedio` não tem como ser
   exato: seria mantido por escrita de valor a partir de um total que a tela precisaria ler,
   e é assim que agregado torce.
2. **`ResumoMensal.custoInsumos` vira `custoDoVendido`.** O campo nunca foi escrito por
   ninguém, então não há migração. O nome mente sobre o conteúdo: o que ele guarda é o custo
   total do que foi vendido, mão de obra e rateio inclusos, e não o que ela gastou comprando
   insumo — que já mora em `porCategoriaSaida.COMPRA_INSUMO`. Manter o nome garantiria que
   alguém, um dia, somasse as duas coisas achando que são a mesma.
3. **`Pedido.competenciaPagamento`**, campo novo, derivado de `pagoEm` na escrita e ausente
   enquanto o pedido não foi pago. Sem ele não existe a consulta "os pedidos pagos deste
   mês", e sem essa consulta **"Recalcular o mês" não consegue refazer a metade do pedido** —
   teria que varrer as transações do mês, colher os `pedidoId` e ler um documento por pedido.
   É o mesmo padrão de `Transacao.competencia`, pelo mesmo motivo: a chave de agregação é
   gravada, e não deduzida na leitura.

Na tela, o segundo se chama **"custo do que você vendeu"**, nunca "custo de insumos".

### O agregado fala de dinheiro, e não de entrega

É a decisão que organiza a sessão inteira, e a mais fácil de errar.

`Pedido.competencia` é derivada de `dataEntrega`, e o comentário do tipo diz que ela é a
"chave de agregação do dashboard". **Deixa de ser.** O painel financeiro é regime de caixa:
`entradas` é dinheiro que entrou, e a spec 004 construiu o mês inteiro em cima disso.

```
um pedido entra no agregado quando é PAGO,
e entra na competência do PAGAMENTO — nunca na da entrega.
```

Um pedido entregue em 30/09 e pago em 02/10 conta em outubro, nos dois lados: na transação e
na contagem de pedidos. Um pedido pago adiantado em setembro e entregue em outubro conta em
setembro. `Pedido.competencia` continua existindo e continua sendo a chave da **agenda**: o
mês em que se entrega. O comentário do tipo precisa ser corrigido junto, senão a próxima
sessão acredita nele.

A consequência incômoda dessa escolha precisa aparecer na tela, ou o painel mente por
omissão: **o pedido entregue e não pago não está em lugar nenhum.** Por isso `/pedidos` ganha
uma linha de **"a receber"**, somada em memória sobre os pedidos que a tela já carregou —
nenhum agregado novo, nenhuma consulta nova.

### Pagar, e desfazer

```
marcar pago    → cria a transação, grava transacaoId, aplica delta(pedido, +1)
desfazer pago  → arquiva a transação, limpa transacaoId, aplica delta(pedido, −1)
cancelar pago  → desfaz o pagamento primeiro, depois cancela
```

A transação nasce pela mutação que já existe (`criarTransacao`), com tipo `ENTRADA`,
categoria `VENDA`, valor igual ao `total`, a forma de pagamento do pedido e a descrição
apontando para o código e a cliente. A taxa da maquininha é congelada lá, como manda `#d24` —
o pedido guarda a sua em `custoTaxaPagamento`, e as duas precisam nascer do mesmo cálculo.

**Editar um pedido já pago** é reverter mais aplicar, como na 4A: reverte a contribuição
antiga, atualiza a transação com o novo total e aplica a nova. Se o valor mudou, a transação
muda junto — senão o caixa fica com um número que o pedido não reconhece.

**A tela de pagamento assina o agregado e a meta do mês do pagamento**, porque é o preço já
aceito em `#d29`: a mutação não lê nada, quem sabe é a tela. São dois documentos pequenos, e
sem eles o espelho da meta não anda quando a venda entra por pedido.

### Índice

`pedidos` por `arquivado` + `competenciaPagamento` + `pagoEm` decrescente. É a consulta de
"Recalcular o mês", e é a mesma forma do índice de `transacoes` da 4A.

### Cliente

`totalPedidos`, `totalGasto` e `ultimoPedidoEm` são incrementados no pagamento e revertidos
no desfazer. `ticketMedio` do cliente segue a mesma regra do agregado: razão de dois
incrementos, refeita na leitura.

### A meta ganha o que faltava

`#d28` vence aqui, e é uma decisão pequena com duas partes:

- **`pedidosNecessarios` passa a ser gravado e exibido**: `ceil(faturamentoAlvo / ticketMedio
de referência)`, agora que "pedido" existe e o campo pode dizer a verdade.
- **`ticketMedioReferencia` passa a ser sugerido pelo ticket médio real** quando houver
  pedido pago no mês, com a média das fichas como alternativa quando não houver. Continua
  editável, e continua sendo o único campo da meta que a usuária pode ajustar à mão.

O bloco de meta ganha uma linha, não uma tela. Se a sessão estourar, **é esta parte que se
corta** — ela é a mais separável das cinco, e vira uma 3D de meia hora.

### Caso de aceite, com números

O agregado de `2026-09` como a spec 004 o deixou, antes de qualquer pedido: `entradas` 24500,
`saidas` 12000, `custoTaxasPagamento` 689, `lucro` 11811.

O pedido do caso de aceite da 3A (total 24000, custo 15220, taxa 1198, 22 itens) é marcado
como pago no dia **15/09**, no crédito:

| Campo                 | Conta                     | Valor |
| --------------------- | ------------------------- | ----- |
| `entradas`            | 24500 + 24000             | 48500 |
| `custoTaxasPagamento` | 689 + 1198                | 1887  |
| `lucro`               | 48500 − 12000 − 1887      | 34613 |
| `qtdPedidos`          | 0 + 1                     | 1     |
| `qtdItensVendidos`    | 20 + 2                    | 22    |
| `receitaPedidos`      | 0 + 24000                 | 24000 |
| `custoDoVendido`      | 0 + 15220                 | 15220 |
| `ticketMedio`         | 24000 ÷ 1                 | 24000 |
| `porDia['15']`        | entradas 24000, pedidos 1 |       |

E o ranking de produtos, que aparece na tela pela primeira vez:

| Ficha              | Quantidade | Receita | Lucro               |
| ------------------ | ---------- | ------- | ------------------- |
| Cookie tradicional | 20         | 13800   | 13800 − 8820 = 4980 |
| Caixa com 6        | 2          | 9980    | 9980 − 6400 = 3580  |

O lucro por produto **não desconta desconto, entrega nem maquininha**: essas três são do
pedido inteiro e não têm como ser rateadas por item sem inventar um critério. A tela diz isso
em uma frase, e o lucro do mês continua saindo de `lucro`, que desconta tudo.

**Desfazer o pagamento** devolve cada número acima ao valor anterior, e a transação é
arquivada, nunca apagada. O teste roda os dois caminhos — delta a delta e reconstrução — como
na 4A.

**Meta.** Com alvo de 300000 e o realizado em 48500, o progresso vai de 8,17% para 16,17%. O
ticket médio de referência passa a ser sugerido como 24000, e `pedidosNecessarios` vira
`ceil(300000 ÷ 24000) = 13` pedidos.

Esses números vão para `tests/domain/caixa.test.ts` — no mesmo arquivo do par existente,
porque é o mesmo agregado.

## Critérios de aceite 3B

- [ ] Os números do caso de aceite batem exatamente, em teste.
- [ ] `deltaDoPedido` aplicado em sequência e `agregarPedidos` concordam, em teste.
- [ ] **O teste da 4A passa sem uma linha alterada.**
- [ ] Marcar como pago cria a transação e grava `transacaoId`; desfazer arquiva e reverte.
- [ ] Editar um pedido pago corrige a transação e o agregado.
- [ ] O agregado usa a data do pagamento, e a agenda continua usando a data de entrega.
- [ ] "Recalcular o mês" refaz as duas metades e não precisa mais ler o agregado antes.
- [ ] `custoInsumos` virou `custoDoVendido`, e a tela o chama de "custo do que você vendeu".
- [ ] Pedido entregue e não pago aparece em "a receber", e não no resultado do mês.
- [ ] Os agregados do cliente andam com o pagamento e voltam com o desfazer.
- [ ] `pedidosNecessarios` deixa de ser zero e passa a aparecer.
- [ ] Portão de conclusão passando.

---

# Sessão 3C · A lista de compras

## Escopo

Coleção `listasCompra`, tela `/compras`, e o motor em `src/lib/domain/listaCompras.ts`.

É a sessão que fecha o ciclo do produto: do pedido combinado até o carrinho no mercado, com
uma mão só e sinal ruim (`PRODUCT.md`, contexto 2).

### Módulo novo de domínio

```
explodirDemanda(pedidos, fichas)     // pedido → insumo, em unidade base
montarLista(demanda, insumos)        // demanda → o que comprar, em pacote e em reais
```

### A explosão, um nível de cada vez

Cada item de pedido aponta para uma ficha, e cada ficha consome insumos por **lote**. A
demanda de um insumo por unidade vendida é a quantidade da linha dividida pelo rendimento do
lote:

```
porUnidade = item.quantidade / ficha.rendimento
demanda   += porUnidade × quantidadePedida
```

Em um kit, os `itens` são a embalagem do próprio kit e os `componentes` são fichas simples:
cada componente vira `quantidade × quantidadePedida` unidades daquela ficha, e essas unidades
explodem pela regra acima. `#d11` garante que a recursão para no primeiro nível, e é por isso
que ela cabe em uma função sem detecção de ciclo.

**A demanda é proporcional, e não arredondada para lotes inteiros.** 32 cookies são 1,6 lote,
e a lista pede insumo para 1,6 lote. Arredondar para 2 lotes inflaria a compra em 25% para
resolver um problema que a Maynara resolve sozinha na bancada: ela faz a fornada do tamanho
que quiser.

### Do útil ao físico, e só então o estoque

A ordem das operações é onde esta conta costuma ser feita errado.

```
util      = demanda somada, em unidade base            // o que entra na receita
fisica    = util / (1 − perdaPercentual / 100)         // o que precisa sair do mercado
comprar   = max(0, fisica − estoqueAtual)
pacotes   = ceil(comprar / quantidadeBase)
custo     = pacotes × precoCompra
```

A perda **divide**, e não multiplica: se 5% se perde na peneira, os 100% do preço são pagos
por 95% de produto útil. É a mesma conta de `calcularCustoInsumo`, e o erro inverso é o mais
comum em planilha de confeitaria.

O estoque é descontado **depois** da perda porque estoque é físico: os 500 g de farinha no
armário também vão perder 5% quando forem usados. Descontar antes misturaria uma grandeza
com a outra.

`custoEstimado` conta **pacotes inteiros**, e não a fração necessária: ninguém compra 342 g
de farinha, compra o pacote de 1 kg. É o número que ela vai gastar de fato no caixa do
mercado, que é a única versão desse número que serve para alguma coisa.

### Quais pedidos entram

Os de `dataEntrega` dentro do período, com status `CONFIRMADO`, `EM_PRODUCAO` ou `PRONTO`.

`ORCAMENTO` fica de fora: comprar insumo para um orçamento que talvez não feche é dinheiro
parado na despensa. `ENTREGUE` e `CANCELADO` também, pelo motivo oposto — um já foi
produzido, o outro não vai ser. A tela diz quantos orçamentos ficaram de fora e oferece o
atalho para confirmá-los, senão a lista some com um pedido sem explicar por quê.

### Regerar

`ListaCompras.pedidoIds` existe para isso. Regerar refaz a lista com os pedidos do período de
hoje, e **preserva o que já foi marcado como comprado**, casando por `insumoId`. Sem isso,
confirmar um pedido novo no meio da feira apagaria meia hora de carrinho.

### Tela `/compras`

Não entra na navegação inferior: cinco destinos é o teto (`src/components/layout/navegacao.ts`).
Chega-se a ela pelo cabeçalho de `/pedidos` e por um cartão na tela Hoje quando há pedido
para produzir.

A tela é desenhada para a mão suja e o carrinho:

- Itens agrupados por categoria de insumo, na ordem em que se anda no mercado: ingrediente,
  embalagem, etiqueta, o resto.
- Linha com alvo de toque inteiro para marcar como comprado, com o total restante somando ao
  vivo no rodapé.
- Cada linha diz **as duas quantidades**: o que falta ("342 g") e o que se compra ("1 pacote
  de 1 kg"). A primeira é a verdade da receita, a segunda é a verdade da gôndola.
- **O que ela já tem fica no fim**, em um bloco separado de "não precisa comprar". Some com o
  item seria pedir que ela confira de cabeça se esqueceu alguma coisa.
- **Corrigir o preço no ato.** Tocar no preço de um insumo abre o campo e grava em `insumos`,
  reusando `atualizarInsumo` e `marcarFichasDesatualizadas` — é o contexto 2 do `PRODUCT.md`,
  e o momento em que ela mais sabe o preço de verdade. O custo estimado da lista se refaz na
  hora; as fichas ganham o selo de custo desatualizado, como já ganham hoje.

### Índice

`listasCompra` por `arquivado` + `criadoEm` decrescente.

### Caso de aceite, com números

Ficha **Cookie tradicional**, a da spec 002: lote de 20 unidades, com 500 g de farinha, 300 g
de chocolate, 200 g de manteiga e 20 saquinhos. Ficha **Caixa com 6**: um kit que consome 6
cookies e 1 caixa.

Pedido do caso de aceite da 3A: 20 cookies e 2 caixas com 6. São **32 cookies** para
produzir, 20 soltos e 12 dentro dos kits, mais 2 caixas.

Por unidade de cookie: 25 g de farinha, 15 g de chocolate, 10 g de manteiga, 1 saquinho.

| Insumo    | Útil  | Perda | Físico   | Estoque | Comprar  | Compra em         | Pacotes | Custo |
| --------- | ----- | ----- | -------- | ------- | -------- | ----------------- | ------- | ----- |
| Farinha   | 800 g | 5%    | 842,11 g | 500 g   | 342,11 g | 1 kg / R$ 12,50   | 1       | 1250  |
| Chocolate | 480 g | 0%    | 480 g    | 0       | 480 g    | 1 kg / R$ 40,00   | 1       | 4000  |
| Manteiga  | 320 g | 0%    | 320 g    | 0       | 320 g    | 500 g / R$ 17,50  | 1       | 1750  |
| Saquinho  | 32 un | 0%    | 32 un    | 50 un   | 0        | 100 un / R$ 30,00 | 0       | 0     |
| Caixa     | 2 un  | 0%    | 2 un     | 0       | 2 un     | 25 un / R$ 50,00  | 1       | 5000  |

`custoEstimado` da lista: 1250 + 4000 + 1750 + 0 + 5000 = **12000**, R$ 120,00.

O saquinho é a linha que prova a conta do estoque: ela precisa de 32 e tem 50, então não
compra, e a linha vai para o bloco de "não precisa comprar" em vez de sumir. A caixa é a que
prova a conta do pacote: precisa de 2 e leva 25, porque é assim que se vende caixa.

Uma diferença proposital em relação à spec 002: **lá a farinha aparece com custo já corrigido
e sem perda; aqui ela tem 5%.** É o que faz esta tabela exercitar a divisão pelo fator de
correção, que é o erro clássico. Os dois casos de aceite não se contradizem — este mede
quantidade a comprar, aquele mede custo de produzir —, mas o custo unitário do cookie não é
reproduzível a partir desta tabela, e não deve ser tentado.

Esses números vão para `tests/domain/listaCompras.test.ts` como estão.

## Critérios de aceite 3C

- [ ] Os números do caso de aceite batem exatamente, em teste.
- [ ] O kit explode em componentes e para no primeiro nível, em teste.
- [ ] A perda divide e o estoque é descontado depois dela, em teste.
- [ ] Insumo com estoque suficiente aparece como "não precisa comprar", e não some.
- [ ] Regerar preserva o que já foi marcado como comprado.
- [ ] Orçamento não entra na lista, e a tela diz quantos ficaram de fora.
- [ ] Corrigir o preço de um insumo pela lista atualiza o insumo e marca as fichas.
- [ ] Rendimento zero ou ficha arquivada no meio da explosão não quebram a conta.
- [ ] Índice publicado.
- [ ] Portão de conclusão passando.

---

## Fora de escopo, nas três sessões

Pagamento parcial e sinal de encomenda, parcelamento, nota fiscal, etiqueta ou romaneio de
entrega, integração com WhatsApp, importação de pedido de qualquer lugar, rota de entrega,
frete calculado por distância, controle de estoque que se movimenta sozinho na produção,
ordem de produção separada do pedido, previsão de demanda, recompra automática, programa de
fidelidade, e qualquer relatório que compare meses.

**Estoque continua sendo um número que a Maynara digita**, e não um saldo que o sistema
movimenta. Baixa automática de estoque na produção parece o passo seguinte óbvio e não é: ela
produz fora do sistema, e um saldo que só o sistema mexe fica errado na primeira fornada não
registrada. Estoque errado é pior que estoque nenhum, porque a lista de compras passa a
mentir. Quando houver caso de uso, ele nasce com contagem periódica, não com baixa por
receita.

## Decisões que esta spec toma, e que são fáceis de rejeitar

Reunidas aqui para não precisarem ser garimpadas. Cada uma vira registro em `DECISOES.md` na
sessão que a executar.

1. **O agregado usa a data do pagamento, e a agenda a data da entrega.** Um pedido entregue e
   não pago não está no resultado do mês; está em "a receber".
2. **Preço e custo congelam quando o item entra no pedido**, e o selo de preço mudado só
   existe enquanto o pedido é orçamento.
3. **A taxa de entrega é receita, e aparece em linha própria dentro do lucro do pedido.**
4. **`Pedido.numero`, `ultimoNumeroPedido`, `proximaEntrega` e `pedidosAbertos` ficam sem
   uso**, em vez de mantidos por um mecanismo que exige rede ou que ninguém lê.
5. **`custoInsumos` vira `custoDoVendido`** no agregado, antes que alguém o some com as
   compras de insumo.
6. **`ResumoMensal.receitaPedidos` é campo novo**, para que `ticketMedio` seja razão de dois
   incrementos exatos.
7. **A demanda da lista de compras é proporcional**, e não arredondada para lotes inteiros.
8. **O estoque é descontado depois da perda**, porque as duas grandezas precisam ser físicas.
9. **Estoque não se movimenta sozinho.**

## Riscos

**O agregado com dois escritores é o risco real, e ele é maior do que o da 4A.** Lá havia um
caminho; aqui há dois, e eles escrevem no mesmo documento. A defesa é a mesma e precisa ser
levada a sério na 3B: o par `delta`/`agregar` para a metade nova, o teste que exige que
concordem, e o teste da 4A intacto como prova de que a metade velha não se mexeu. Se a 3B
precisar cortar por tempo, corte a meta, depois o cliente, **nunca o par.**

**O pedido pago que muda de valor** é o caminho com mais estados: pedido, transação, agregado
do caixa, agregado do pedido, agregado do cliente e espelho da meta, todos precisando andar
juntos. É onde o "reverter mais aplicar" da 4A é copiado, e é onde ele é mais fácil de fazer
pela metade.

**A explosão de demanda depende de dados que podem ter sumido.** Uma ficha arquivada depois
do pedido, um insumo arquivado depois da ficha, um rendimento zerado: os três precisam
devolver zero com explicação em vez de `NaN`, no mesmo espírito das guardas da 002 e da 4B. O
pedido guarda `nomeSnapshot`, então a lista sabe dizer o nome do que não conseguiu explodir —
e dizer isso é melhor do que omitir a linha.

**Três sessões é o teto.** Se a 3B parecer grande demais quando chegar a vez dela, a meta sai
e vira uma 3D. Se a 3A parecer grande demais, o cliente sai dela e o pedido fica só com
`clienteNome`, que é o que a venda de balcão já usa.
