# Spec 004 · Caixa, metas e previsão

**Tamanho:** duas sessões. `4A` caixa, `4B` metas e previsão. Não juntar.
**Depende de:** specs 000 e 002 executadas.
**Decisões que originam:** `DECISOES.md#d09` (agregado mensal) e `#d10` (incremento no cliente).

## Problema

A Maynara sabe o custo de cada doce e o preço que fecha a margem. Não sabe se o mês fechou no
azul. Dinheiro entra pelo Pix e sai pelo mercado sem passar por lugar nenhum, e no fim do mês
a única evidência é o saldo da conta, que mistura o negócio com a vida pessoal.

O Módulo 2 tornou visível o custo de um doce. Este torna visível o resultado de um mês, e
transforma a meta em um número que ela persegue na segunda-feira: **quantos doces por semana**.

## O que muda por vir antes do Módulo 3

A ordem acordada é 1 → 2 → 4 → 3. Isso significa que **pedidos não existem ainda**, e é o
fato mais importante desta spec.

`ResumoMensal` já está tipado para os dois mundos. Metade dos campos é alimentada por
transação, metade por pedido. Esta spec entrega a primeira metade e **deixa a segunda
intocada**, com valor zero e sem aparecer na interface:

| Campo                                  | Quem alimenta    | Nesta spec        |
| -------------------------------------- | ---------------- | ----------------- |
| `entradas`, `saidas`, `lucro`          | transação        | ✅ entregue       |
| `custoTaxasPagamento`                  | transação        | ✅ entregue       |
| `porCategoriaSaida`                    | transação        | ✅ entregue       |
| `porDia[].entradas`, `porDia[].saidas` | transação        | ✅ entregue       |
| `porDia[].pedidos`                     | pedido           | fica em 0         |
| `qtdPedidos`, `qtdItensVendidos`       | pedido           | fica em 0         |
| `ticketMedio`, `produtos`              | pedido           | fica em 0 e vazio |
| `meta`                                 | meta + transação | ✅ na 4B          |

**Zero não é resultado: é ausência.** Nenhum número da coluna "pedido" pode aparecer na tela
como se fosse fato. Ticket médio de R$ 0,00 em um mês que vendeu é mentira, e mentira em
painel financeiro é o pior defeito que este projeto pode ter.

Consequência prática: **a venda é lançada à mão nesta spec.** Quando o Módulo 3 chegar, o
pedido pago passa a criar a transação (`Pedido.transacaoId` já existe para esse vínculo), e o
lançamento manual continua valendo para a venda de balcão que nunca virou pedido.

Por isso o mecanismo de delta da 4A precisa nascer reutilizável: o Módulo 3 vai escrever no
**mesmo** documento de agregado, pelo mesmo caminho.

---

# Sessão 4A · Caixa

## Escopo

Tela `/financeiro`, coleção `transacoes`, agregado `agregados/{YYYY-MM}`, e o motor em
`src/lib/domain/caixa.ts`.

### Módulo novo de domínio

`caixa.ts`. Puro, sem Firebase, coberto por teste. Duas funções que precisam concordar:

```
deltaDaTransacao(transacao, sinal)   // o que somar no agregado, +1 ou −1
agregarTransacoes(transacoes)        // o agregado inteiro, reconstruído do zero
```

A segunda existe porque a primeira é perigosa. Agregado mantido por incremento é agregado que
pode torcer em silêncio, e `DECISOES.md#d10` já registra esse risco em outro eixo. O teste
que fecha o buraco: **aplicar os deltas de uma sequência de transações produz exatamente o
mesmo objeto que reconstruir a partir delas.** Se as duas discordam, o painel está errado, e o
teste diz isso antes da usuária.

### Fórmulas

```
taxaDaEntrada = tipo === 'ENTRADA' && formaPagamentoId
                ? taxaCobrada(valor, forma)      // já existe em custosOperacionais.ts
                : 0

entradas             = Σ valor            das transações ENTRADA
saidas               = Σ valor            das transações SAIDA
custoTaxasPagamento  = Σ taxaDaEntrada
lucro                = entradas − saidas − custoTaxasPagamento

porCategoriaSaida[c] = Σ valor  das SAIDA de categoria c
porDia['DD']         = { entradas, saidas, pedidos: 0 }
```

`valor` é sempre positivo; o sinal mora em `tipo`. Já está assim no tipo, e é o que evita erro
de sinal em soma.

**A taxa da maquininha é derivada da entrada, não é uma saída.** A venda entra pelo valor
bruto com `formaPagamentoId`, e a taxa é calculada na escrita e somada em
`custoTaxasPagamento`. Duas razões: o Módulo 2 inteiro existe para tornar essa taxa visível, e
ela merece linha própria no painel em vez de se dissolver entre aluguel e farinha; e uma
transação automática de taxa poluiria a lista com uma linha que a usuária não lançou e não
pode explicar.

A categoria `TAXA_PAGAMENTO` continua existindo para o que é de fato uma despesa avulsa —
aluguel da maquininha, mensalidade de gateway. A dica do campo precisa dizer isso, senão ela
lança a taxa duas vezes.

### Editar é reverter mais aplicar

É o ponto onde este módulo quebra se for feito às pressas.

```
criar    → aplica delta(nova, +1)
editar   → aplica delta(anterior, −1), depois delta(nova, +1)
arquivar → aplica delta(anterior, −1)
```

**Se a data mudar de mês, são dois documentos**: reverte no agregado da competência antiga e
aplica no da nova. Nunca apagar transação (`arquivado: true`), como todo o resto do sistema.

Como escape, e porque `#d10` cobra isso mais cedo ou mais tarde: **"Recalcular o mês"**, que lê
as transações da competência e reescreve o agregado com `agregarTransacoes`. Uma consulta, uma
escrita, disponível na interface. Não é o caminho normal — é a rede de segurança, e o que
prova que os deltas estão certos.

### Tela `/financeiro`

Seletor de mês no topo, e o mês corrente por padrão. Abaixo, nesta ordem:

1. **Três números do mês** — entrou, saiu, sobrou. `lucro` com sinal e ícone, nunca só cor.
2. **O que a maquininha comeu** — `custoTaxasPagamento` do mês, em reais, com a frase que
   liga ao Módulo 2. É o número que ninguém calcula sozinha.
3. **Movimento por dia** — barras a partir de `porDia`, sem biblioteca de gráfico: são 31
   barras em CSS, e uma dependência de produção nova precisaria de aprovação para desenhar o
   que uma `div` com altura percentual desenha. Entrada e saída lado a lado, com rótulo
   acessível por dia.
4. **Para onde foi o dinheiro** — `porCategoriaSaida` como lista ordenada por valor, com
   barra proporcional. Lista com divisórias, não grade de cartões.
5. **Lançamentos do mês** — lista das transações, mais recente primeiro, tocável para editar.

Lançar abre painel lateral no desktop e folha inferior no celular, como todo formulário deste
projeto. Campos: tipo, valor, descrição, categoria, data, forma de pagamento (só em entrada),
recorrente, observações.

A tela precisa dizer, quando o mês está vazio, que venda ainda se lança à mão e que isso muda
no módulo de pedidos. Estado vazio que ensina, nunca "nenhum registro encontrado".

### Índice

`transacoes` por `arquivado` + `competencia` + `data` decrescente. Sem ele a lista do mês não
carrega — e o índice de `fichas` da spec 002 ainda não foi publicado, então **rodar
`firebase deploy --only firestore:indexes` faz parte desta sessão.**

### Caso de aceite, com números

Competência `2026-09`. Crédito a 4,99%, débito a 1,99%, Pix sem taxa.

| #   | Dia | Lançamento        | Tipo    | Categoria     | Centavos |
| --- | --- | ----------------- | ------- | ------------- | -------- |
| 1   | 03  | Venda no crédito  | ENTRADA | VENDA         | 12000    |
| 2   | 03  | Venda no Pix      | ENTRADA | VENDA         | 8000     |
| 3   | 05  | Compra no atacado | SAIDA   | COMPRA_INSUMO | 9000     |
| 4   | 10  | Internet          | SAIDA   | DESPESA_FIXA  | 3000     |
| 5   | 12  | Venda no débito   | ENTRADA | VENDA         | 4500     |

| Campo do agregado     | Conta                                 | Valor |
| --------------------- | ------------------------------------- | ----- |
| `entradas`            | 12000 + 8000 + 4500                   | 24500 |
| `saidas`              | 9000 + 3000                           | 12000 |
| `custoTaxasPagamento` | 599 + 0 + 90                          | 689   |
| `lucro`               | 24500 − 12000 − 689                   | 11811 |
| `porDia['03']`        | entradas 20000, saidas 0              |       |
| `porDia['05']`        | entradas 0, saidas 9000               |       |
| `porCategoriaSaida`   | COMPRA_INSUMO 9000, DESPESA_FIXA 3000 |       |

As taxas: `round(12000 × 4,99%) = 599`, `round(4500 × 1,99%) = 90`.

**Edição.** A venda 1 estava errada e vira R$ 150,00, mesmo dia e mesma forma:

| Campo                 | Conta                 | Valor |
| --------------------- | --------------------- | ----- |
| `entradas`            | 24500 − 12000 + 15000 | 27500 |
| `custoTaxasPagamento` | 689 − 599 + 749       | 839   |
| `lucro`               | 27500 − 12000 − 839   | 14661 |

**Arquivamento.** A internet (lançamento 4) é arquivada:

| Campo               | Conta              | Valor |
| ------------------- | ------------------ | ----- |
| `saidas`            | 12000 − 3000       | 9000  |
| `porCategoriaSaida` | DESPESA_FIXA       | 0     |
| `lucro`             | 27500 − 9000 − 839 | 17661 |

**Troca de mês.** A venda 5 muda de 12/09 para 02/10: sai inteira de `2026-09` e entra em
`2026-10`, com a taxa junto.

Esses números vão para `tests/domain/caixa.test.ts` como estão, e o mesmo cenário roda pelos
dois caminhos — delta a delta e reconstrução — com o mesmo resultado.

## Critérios de aceite 4A

- [x] Os números do caso de aceite batem exatamente, em teste.
- [x] `deltaDaTransacao` aplicado em sequência e `agregarTransacoes` concordam, em teste.
- [x] Editar valor, categoria ou data corrige o agregado; mudar de mês move entre os dois.
- [x] Arquivar reverte a contribuição; nenhuma transação é apagada.
- [x] "Recalcular o mês" reconstrói o agregado a partir das transações.
- [x] Nenhum campo alimentado por pedido aparece na tela.
- [x] Mês sem lançamento nenhum não mostra painel zerado como se fosse resultado.
- [x] Índices publicados, incluindo o de `fichas` que ficou pendente da spec 002.
- [x] Portão de conclusão passando.

---

# Sessão 4B · Metas e previsão

## Escopo

Coleção `metas`, o espelho `ResumoMensal.meta`, o bloco de meta em `/financeiro`, o cartão na
tela Hoje, e o motor em `src/lib/domain/metas.ts`.

### Fórmulas

```
diasNoMes            = dias do mês da competência
semanasNoMes         = diasNoMes / 7                    // fracionário de propósito
unidadesNecessarias  = ceil(faturamentoAlvo / precoMedioUnitario)
unidadesPorSemana    = ceil(unidadesNecessarias / semanasNoMes)

realizado            = entradas do agregado da competência
progresso            = realizado / faturamentoAlvo × 100
unidadesRestantes    = ceil(max(0, faturamentoAlvo − realizado) / precoMedioUnitario)
diasRestantes        = diasNoMes − diaAtual + 1
unidadesPorSemanaRestante = ceil(unidadesRestantes / (diasRestantes / 7))
noRitmo              = realizado >= faturamentoAlvo × (diaAtual / diasNoMes)
```

`semanasNoMes` é fracionário porque arredondar para 5 espalharia a meta por uma semana que não
existe e a faria parecer mais fácil do que é. O número que a usuária vê é o de doces por
semana, já arredondado para cima; as semanas nunca aparecem cruas.

**Guardas obrigatórias**, no mesmo espírito do rendimento zero da spec 002: alvo zero, preço
médio zero e mês sem ficha nenhuma devolvem zero e uma frase, nunca `Infinity` nem `NaN`. Uma
conta sem fichas cadastradas não tem preço médio, e a interface diz isso e aponta para
`/fichas` — como a ficha sem configuração aponta para `/configuracao`.

### De onde sai o preço médio

Não há histórico de vendas: o Módulo 3 é que traz ticket médio de verdade. A única fonte que
existe é o cardápio, então `precoMedioUnitario` é sugerido como a **média de
`precificacao.precoVenda` das fichas ativas**, e é editável — princípio 1 do `PRODUCT.md`:
campo que pode ser calculado vem preenchido, nunca vazio e obrigatório.

Ele é gravado em `Meta.ticketMedioReferencia`, que é o campo que existe para isso.

**`pedidosNecessarios` fica em zero e não aparece na tela.** Quantos pedidos são necessários
depende do valor médio de um pedido, e pedido não existe neste módulo. Preencher com o preço
unitário faria o campo dizer "cada pedido tem um doce", que é falso. O campo espera o Módulo 3.

### O espelho no agregado

`ResumoMensal.meta` guarda `faturamentoAlvo`, `realizado`, `progresso`, `unidadesRestantes`,
`unidadesPorSemanaRestante` e `noRitmo`, para que o painel e o cartão da tela Hoje saiam de
uma leitura, como manda `#d09`.

Isso cria a segunda fonte de verdade do módulo: `realizado` também é `entradas`. Ela é
atualizada nos mesmos pontos em que `entradas` muda — criar, editar, arquivar e recalcular o
mês —, e "Recalcular o mês" da 4A reescreve o espelho junto. Um caminho só, o da 4A.

### Onde a meta aparece

- **`/financeiro`**: bloco de meta com o alvo, o progresso e a frase de ritmo. Sem meta
  definida, um convite a definir uma, não um vazio.
- **Tela Hoje**: cartão com o número que ela persegue — quantos doces por semana faltam — e
  nada mais. É a tela que ela abre de manhã.

O progresso usa o filete dourado da marca quando a meta é batida (`DESIGN.md`, assinatura 2).
Sem confete: as metas motivam com números reais, não com gamificação.

### Caso de aceite, com números

Meta de `2026-09`: alvo R$ 3.000,00, preço médio unitário R$ 6,90 — o preço da ficha do caso
de aceite da spec 002.

| Resultado             | Conta              | Valor |
| --------------------- | ------------------ | ----- |
| `unidadesNecessarias` | ceil(300000 ÷ 690) | 435   |
| `semanasNoMes`        | 30 ÷ 7             | 4,286 |
| `unidadesPorSemana`   | ceil(435 ÷ 4,286)  | 102   |

No dia 12, com R$ 1.200,00 realizados:

| Resultado                   | Conta                      | Valor |
| --------------------------- | -------------------------- | ----- |
| `progresso`                 | 120000 ÷ 300000 × 100      | 40%   |
| `unidadesRestantes`         | ceil(180000 ÷ 690)         | 261   |
| `diasRestantes`             | 30 − 12 + 1                | 19    |
| `unidadesPorSemanaRestante` | ceil(261 ÷ (19 ÷ 7))       | 97    |
| `noRitmo`                   | 120000 >= 300000 × 12 ÷ 30 | true  |

Esses números vão para `tests/domain/metas.test.ts` como estão.

## Critérios de aceite 4B

- [x] Os números do caso de aceite batem exatamente, em teste.
- [x] Alvo zero, preço médio zero e conta sem fichas devolvem zero com explicação, não `NaN`.
- [x] O preço médio vem sugerido das fichas ativas e é editável.
- [x] `pedidosNecessarios` não aparece em tela nenhuma.
- [x] Lançar, editar e arquivar transação move o progresso da meta.
- [x] A tela Hoje mostra quantos doces por semana faltam.
- [x] Portão de conclusão passando.

---

## Fora de escopo, nas duas sessões

Conciliação bancária, importação de extrato ou OCR de comprovante, anexo de nota fiscal,
transação parcelada ou recorrente que se lança sozinha, categoria criada pela usuária,
relatório em PDF, exportação para contador, comparação entre meses, projeção para os meses
seguintes, separação entre pessoa física e jurídica, e qualquer campo alimentado por pedido.

`recorrente` é gravado como marca — a repetição automática é outro módulo, e um agendador que
escreve sozinho no caixa é a última coisa que se constrói sem servidor confiável.

## Decisões que esta spec toma, e que são fáceis de rejeitar

Estão reunidas aqui para não precisarem ser garimpadas no texto. Cada uma vira registro em
`DECISOES.md` na sessão que a executar.

1. **A taxa da maquininha é campo derivado da entrada, não transação separada.**
2. **`pedidosNecessarios` fica em zero até o Módulo 3**, em vez de ser preenchido com uma
   suposição.
3. **`ticketMedioReferencia` guarda preço médio unitário** enquanto não há pedido, que é o
   único sentido possível para o campo hoje.
4. **Gráfico desenhado à mão**, sem dependência nova.
5. **`agregarTransacoes` existe** como reconstrução e como oráculo de teste, mesmo não sendo
   o caminho normal.

## Riscos

**O agregado torto é o risco real deste módulo.** Todo o resto é formulário e lista. Um
incremento perdido não dá erro, não aparece em log e só é notado quando o lucro do mês parece
estranho — e aí não há como saber quando começou. A defesa é a dupla `delta`/`agregar` com
teste que exige concordância, mais o botão de recalcular. Se a sessão 4A precisar cortar
algo por tempo, **corte da tela, nunca dessa dupla.**

**Datas.** É o primeiro módulo em que data é dado, e não enfeite. `date-fns` está no
`package.json` desde o começo e nunca foi usado (`ESTADO.md`, dívidas). A sessão 4A decide:
ou ele ganha uso real aqui, ou sai do projeto. `Timestamp.now()` continua valendo — nada de
`serverTimestamp()` (`#d06`) —, e `dataISO` e `competencia` são derivados da data escolhida
pela usuária, no fuso do aparelho.
