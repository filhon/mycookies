# Spec 132 · O que o pote encontrou

**Tipo:** depois de salvar, a contagem do pronto mostra o que encontrou: o que falta para os
pedidos abertos, o que acabou, o que sumiu sem pedido (em unidades e em reais) e quanto vale o que
está pronto. Nenhum schema, nenhuma regra, nenhum índice novo, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica sobre os prints da contagem do pronto de 2026-10-12, item 5.
**Depende de:** 130 (o esperado).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d337`, com nota no `#d62`.

---

## Problema

Hoje salvar volta para `/fichas` no mesmo toque. A contagem acaba sem dizer nada que ela não tenha
digitado, e o pote é onde o dinheiro está pronto para sair:

- **Pedido sem massa.** Ela conta 6 Tradicionais; quinta tem dois pedidos que levam 10. O sistema
  sabe os dois números e não junta. Ela descobre na quinta.
- **Cookie que saiu sem pedido.** Esperávamos 9 Red Velvet (130), ela conta 4. Cinco cookies a
  R$ 8,50 são R$ 42,50 que não passaram pelo app: venda no balcão, prova, presente, perda. É o
  número que um serviço de estoque por assinatura põe no fim de toda contagem, e o que faz
  "contar" virar descoberta.
- **O pote tem valor.** Dezesseis Tradicionais, nove Red Velvet, sete Nutella: quanto isso é em
  venda? O estoque do Shopify, do Square e do Katana diz o valor em mãos.

A despensa ganhou o resumo na 128 (`#d333`); esta tela ficou de fora porque o pote tem outra conta
(`#d97`). A 130 deu a ela o esperado; agora dá para fechar.

---

## 1 · O que esta spec decide: `#d337`

### Salvar abre o resumo, e não volta

- `salvar()` continua despachando sem esperar (`#d62`). Em vez de `navegar("/fichas")`, a tela
  troca para o resumo, na mesma rota, com os números em memória; a guarda de saída desliga.
- Primário: **"Voltar para Produtos"**. Recarregar volta à contagem vazia; o resumo não é guardado.

### O que o resumo diz, nesta ordem

Seções no papel, listas com divisórias, nenhum cartão.

1. **"Contagem salva."** com o ponto âmbar, e uma linha: "7 produtos com a data de hoje. Os 3 em
   branco continuam com a data que tinham."
2. **"Falta para os pedidos"**: produto contado cujos pedidos abertos levam mais do que ela contou.
   - **Abertos**: não arquivados, status `CONFIRMADO`, `EM_PRODUCAO` ou `PRONTO`, `dataEntregaISO
     > = hoje`; unidades por `unidadesPorFicha`. Orçamento fica de fora: ainda não é pedido.
   - Cada linha: nome; "6 no pote · os pedidos até quinta levam 10"; à direita, **"faltam 4"** com
     `TriangleAlert` em `--attention`. Botão terciário "Fiz a massa", que leva à ficha
     (`/fichas/{id}`), onde o painel da fornada mora.
   - Some se não houver.
3. **"Acabou"**: as zeradas. Para a que está em `cardapio.limitados`, a linha diz "o cardápio já
   mostra Esgotado". Some se não houver.
4. **"Saiu sem pedido"** (e não "diferença"): linha contada com esperado (130) e contado **abaixo**
   dele por pelo menos 1 unidade **e** 10%.
   - Cada linha: nome; "4 no pote · esperávamos 9"; à direita, "−5 un · R$ 42,50" tabular, em
     `--negative` com `TrendingDown`. Valor a `precificacao.precoVenda`: é o que esses cookies
     teriam rendido.
   - Abaixo, em `--ink-muted`: "Pode ser venda que não passou pelo app, prova, presente ou perda.
     O sistema não vê qual."
   - Total: "R$ 61,00 em venda, R$ 23,80 de custo, em 2 produtos."
   - **Contado acima do esperado** vai numa linha só, sem valor: "Em 1 produto tinha mais do que
     esperávamos: massa que não foi registrada, ou a contagem anterior." Dinheiro a mais no pote
     não é achado; é registro faltando.
5. **"O que está pronto vale"**: soma de `contado × precoVenda` das contadas, em display, e
   embaixo "custou R$ X pra fazer, nos 7 produtos contados hoje". Só as contadas.

### Domínio

- `achadosDoPote(linhas, valores, esperados, abertos, kits)` em `domain/producao.ts`, pura,
  devolvendo `{ faltam, zeradas, sumiram, aMais, valorVenda, valorCusto }`. Centavos inteiros:
  `precoVenda` e `custoUnitario` já são inteiros por unidade; para porção fracionada, arredonda
  uma vez por linha.
- Testes: os dois limiares (1 unidade e 10%) juntos; vencida e nunca sem esperado; orçamento fora
  dos abertos; kit e combo descontam a ficha de dentro; zero conta como zerada e como sumida se
  havia esperado; produto sem `precoVenda` entra em "sumiu" sem valor e fora da soma.

---

## 2 · Antes de tocar em código

1. Ler `ResumoDaContagem.tsx` (128) e reaproveitar a estrutura das seções; os achados são outros,
   então o componente é irmão (`ResumoDoPote.tsx`), e não o mesmo com `if`.
2. Ler `#d164`: `cardapio.limitados` vem do documento de configuração, pelo hook que as telas já
   usam.
3. Confirmar que `precificacao.precoVenda` e `custoUnitario` são por unidade de rendimento.

---

## 3 · Escopo

- `domain/producao.ts`: `achadosDoPote`, com testes.
- `components/producao/ResumoDoPote.tsx`.
- `TelaContagemPronto.tsx`: o estado salvo, a consulta de pedidos abertos (a mesma da 130 cobre:
  amplia o fim da janela ou soma uma segunda consulta, a que der menos código).
- `DECISOES.md`: `#d337`, nota no `#d62` ("desde a 132, o pronto também mostra o resumo").
- `novidades.ts`: "Depois de contar o que está pronto, veja o que falta para os pedidos e o que
  saiu sem pedido".

---

## 4 · Roteiro de navegador

Em 360 px e 1280 px, nos dois temas:

1. Contar Tradicional abaixo do que os pedidos da semana levam: "faltam N" com o triângulo; "Fiz a
   massa" abre a ficha.
2. Contar Red Velvet 5 abaixo do esperado: "−5 un · R$ …" com ícone.
3. Contar 1 abaixo de um esperado de 16 (6%): não aparece.
4. Contar acima do esperado: só a linha "tinha mais".
5. Zerar um produto limitado no cardápio: "o cardápio já mostra Esgotado".
6. Modo avião: o resumo abre na hora; o selo diz "Salvo no aparelho".
7. Nada faltando, nada sumido: só o título e o valor.

---

## Critérios de aceite

- [ ] Salvar não espera o servidor e abre o resumo.
- [ ] "Falta para os pedidos", "Acabou", "Saiu sem pedido" e o valor, com os limiares.
- [ ] Sinal, cor e ícone em todo negativo e toda atenção; frase honesta sobre a causa.
- [ ] Dinheiro em centavos inteiros no domínio, com testes.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d337` e a nota no `#d62` escritos;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **"Falta para os pedidos" vem primeiro.** É a única seção que pede uma ação antes de um prazo.
- **"Sumiu" a preço de venda, e não a custo.** A pergunta dela é "quanto deixei de receber", e o
  custo vai no total para quem quiser a outra conta.
- **Limiar em unidade, e não em reais.** Um cookie é R$ 8: o "R$ 1,00" da 128 nunca filtraria
  nada aqui.
- **Sem botão "Registrar venda" na linha que sumiu.** O sistema não sabe se foi venda, e o botão
  afirmaria que foi.

---

## Fora de escopo

- **Histórico do que sumiu por mês.** Schema; volta se ela pedir.
- **Lançar no caixa a venda que sumiu.**
- **A grade do desktop** (133).
