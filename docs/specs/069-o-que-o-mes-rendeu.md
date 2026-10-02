# Spec 069 · O que o mês rendeu

**Tipo:** o topo de `/financeiro` passa a separar as duas respostas que hoje se confundem: o que as
vendas deixaram acima do custo de fazer, e o que passou pelo caixa. Uma função pura com teste, o
`ResultadoDoMes` refeito, o `VendasPorPedido` absorvido, o `CartaoDoMes` da Hoje lendo a mesma
função. **Nenhum campo, nenhuma consulta nova, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa com `/impeccable` sobre os prints de celular e desktop de
2026-10-02, pedida por quem conduz o projeto.
**Depende de:** nada. É a primeira de seis (069 a 074) e **vem antes de todas**: as outras
encaixam no bloco que esta desenha.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d260` e `#d261`.

---

## Problema

Lido nos prints, com os dados da MyCookie's em 2 de outubro:

**O número que abre a tela não é o que ela diz que é.** "O que sobrou no mês: +R$ 138,00", e a
descrição do cabeçalho promete "o que sobrou de verdade". Três blocos abaixo, a mesma tela diz que
esses pedidos custaram **R$ 67,56** para fazer. Os ingredientes foram comprados em setembro, então
outubro parece só lucro, e setembro, o mês do saco de farinha, pareceu prejuízo. O que a tela
chama de "sobrou" é o caixa: entrou menos saiu. O que o mês **rendeu** (R$ 138,00 menos R$ 67,56,
R$ 70,44) não está escrito em lugar nenhum; ela teria de fazer a subtração de cabeça, e o produto
existe para que ela não faça conta (`PRODUCT.md`, princípio 1).

Todo serviço de gestão que cobra mensalidade separa as duas perguntas: o Conta Azul e o QuickBooks
têm o fluxo de caixa e o resultado em telas diferentes; o Shopify mostra vendas e margem lado a
lado. O Rende tem os dois números e mostra só um como resposta.

**R$ 138,00 aparece quatro vezes na primeira tela.** Sobrou, Entrou, a meta e "O que veio de
encomenda". Repetição não é hierarquia: o olho procura qual dos quatro é o que decide.

**"Saiu" diz uma coisa aqui e outra na Hoje.** No `CartaoDoMes` da Hoje, "Saiu" inclui a
maquininha, para que entrou menos saiu feche com o número de cima (`#d209`). No `ResultadoDoMes`
não inclui: num mês com cartão, Entrou − Saiu ≠ Sobrou na tela do Caixa, e as duas telas mostram
"Saiu" com valores diferentes para o mesmo mês.

**"Ticket médio" é palavra de software.** A grade "Pedidos · Ticket médio · Doces" é a única
linha da tela no vocabulário que o `CLAUDE.md` recusa.

**A cor do número muda de tela.** Na Hoje o "sobrou" é tinta com o ponto âmbar (`#d210`); aqui é
verde com "+". O mesmo número em duas roupas parece dois números.

---

## 1 · O que esta spec decide

### O mês tem duas respostas, e a que decide vem primeiro: `#d260`

O bloco do topo responde, nesta ordem:

```
O que o mês rendeu
R$ 70,44 •                       ← display, tinta, ponto âmbar
51% do que você vendeu em pedido, já sem o custo de fazer e a maquininha.
Sua hora já está paga dentro do custo.
───────────────────────────────────────────────
Vendeu em pedido   Custou fazer   Maquininha   [Outras saídas]
R$ 138,00          R$ 67,56       R$ 0,00      (só se > 0)
5 pedidos · 6 doces · cada pedido sai a R$ 27,60
───────────────────────────────────────────────  (faixa rebaixada)
No caixa  +R$ 138,00
Entrou R$ 138,00 · Saiu R$ 0,00
O caixa conta o dinheiro que entrou e saiu. O que rendeu conta o que cada venda deixou.
Os dois só batem quando você compra e vende no mesmo mês.
```

- **"Rendeu" é o display**, com o ponto âmbar (o número que decide, `DESIGN.md`, Signature). É a
  pergunta do produto: "estou ganhando dinheiro em cada doce que vendo?".
- **"No caixa" desce para a faixa rebaixada**, em `heading`, com `comSinal`. Continua sendo o
  `lucro` do agregado, o mesmo de sempre; só deixa de se chamar "sobrou de verdade".
- **"Saiu" inclui a maquininha**, como na Hoje (`#d209`): Entrou − Saiu = No caixa, sempre, nas
  duas telas.
- **Mês sem pedido pago:** não há custo de fazer conhecido, então não há "rendeu". O display passa
  a ser "No caixa", sem ponto, e uma linha diz por quê: "Sem pedido pago neste mês. Venda lançada à
  mão não diz o que custou, então o que o mês rendeu não dá pra saber."
- **Venda de balcão no mês com pedido:** a linha "5 pedidos · 6 doces…" ganha "e R$ 40,00 de
  balcão, fora desta conta porque não diz o que custou". A frase de hoje do `VendasPorPedido` sobre
  o balcão sai daqui para lá.
- **Rendeu negativo:** "O que o mês perdeu", valor `comSinal` em `--negative`, `TrendingDown` e
  nenhum ponto (prejuízo não se enfeita, `#d210`).
- **"Ticket médio" sai.** "cada pedido sai a R$ 27,60" na linha da contagem. A meta continua lendo
  `ticketMedioDe`, sem mudança.

`VendasPorPedido` deixa de existir como seção: o que ele dizia (o que veio de encomenda, o custo
do que vendeu, a contagem) está no bloco novo. O link "Ver meus produtos" vai junto, na linha de
"Custou fazer".

### A conta do que rendeu: `#d261`

Função pura em `src/lib/domain/caixa.ts`:

```ts
export interface RendimentoDoMes {
  /** `null` quando não há pedido pago: sem custo conhecido, não há resposta. */
  rendeu: Centavos | null;
  vendeuEmPedido: Centavos; // receitaPedidos
  custouFazer: Centavos; // custoDoVendido
  maquininha: Centavos; // custoTaxasPagamento, inteiro
  outrasSaidas: Centavos; // as categorias abaixo
  deBalcao: Centavos; // entradas − receitaPedidos, nunca negativo
  /** rendeu ÷ vendeuEmPedido, em %. `null` junto com `rendeu`. */
  percentual: Percentual | null;
}

export function rendimentoDoMes(parcelas: ParcelasDoAgregado): RendimentoDoMes;
```

`rendeu = vendeuEmPedido − custouFazer − maquininha − outrasSaidas`.

**O que entra em `outrasSaidas`, e por quê.** O custo de fazer (`custoTotalEstimado` de cada
pedido) já carrega ingrediente, embalagem, a hora dela, gás e o rateio das despesas fixas. Somar as
saídas dessas categorias por cima contaria duas vezes. Então:

| Categoria        | Desconta? | Razão                                                           |
| ---------------- | --------- | --------------------------------------------------------------- |
| `COMPRA_INSUMO`  | não       | Está no custo de fazer, pela ficha                              |
| `EMBALAGEM`      | não       | Idem                                                            |
| `DESPESA_FIXA`   | não       | Está no rateio da ficha                                         |
| `PRO_LABORE`     | não       | É ela tirando o que é dela; a hora já está no custo             |
| `EQUIPAMENTO`    | não       | Investimento, não custo do mês; aparece no caixa                |
| `ENTREGA`        | sim       | A taxa de entrega cobrada está no total do pedido; o acerto não |
| `MARKETING`      | sim       | Não está em ficha nenhuma                                       |
| `IMPOSTO`        | sim       | Idem                                                            |
| `TAXA_PAGAMENTO` | sim       | Taxa lançada à mão, fora do `custoTaxa` de cada venda           |
| `OUTRO`          | sim       | Na dúvida, desconta: a conta erra pra baixo, nunca pra cima     |

**A maquininha inteira desconta**, mesmo a da venda de balcão, que não está em `vendeuEmPedido`.
Separar exigiria a lista de lançamentos, que a Hoje não assina. O erro é pequeno e é para baixo, a
mesma regra de `OUTRO`. Registrar no `#d261`.

**Um número só, duas telas.** O `CartaoDoMes` da Hoje passa a ler `rendimentoDoMes`: o display
dele é o mesmo "rendeu" (ou o caixa, no mês sem pedido), e a linha "Entrou · Saiu" continua. A
comparação com o mês passado (`#d211`) continua sobre entradas: não muda.

Testes: mês só de pedido; pedido e balcão; mês sem pedido (`null`); saída de cada categoria da
tabela (as que descontam e as que não); rendeu negativo; `deBalcao` nunca negativo (venda de
pedido estornada no mês seguinte).

---

## 2 · Antes de tocar em código

1. **Conferir o agregado de outubro da MyCookie's.** No print, "O que mais vendeu" soma R$ 37,00
   em 2 doces e o "Movimento por dia" mostra uma barra só, no dia 2, enquanto a lista tem três
   lançamentos no dia 1, R$ 138,00 em 5 pedidos e 6 doces. `conferirAgregado` não cobre `produtos`
   nem `porDia` (`#d81`), então a tela não acusa. Rodar "Recalcular o mês" e comparar:
   - se depois dele o ranking e o gráfico batem com a lista, foi deriva de incremento: anotar no
     `ESTADO.md` qual caminho de pagamento gravou o pedido sem os mapas e abrir spec própria;
   - se não batem, a sessão para e investiga antes de desenhar um bloco que lê os mesmos campos.
2. Ler `ResultadoDoMes.tsx`, `VendasPorPedido.tsx`, `CartaoDoMes.tsx` e o `#d209`.
3. `/impeccable` com registro **product**; `PRODUCT.md` e `DESIGN.md`.

---

## 3 · Escopo

### 3.1 Domínio

`rendimentoDoMes` e o teste dela, em `src/lib/domain/caixa.ts` e `tests/domain/caixa.test.ts`.

### 3.2 `src/components/financeiro/ResultadoDoMes.tsx`

Refeito com o desenho do `#d260`. Continua uma `<section>` só com `aria-labelledby`. A grade das
parcelas é `dl`, três ou quatro colunas a partir de `sm`, duas no celular (390 px: "Vendeu em
pedido" e "Custou fazer" na primeira linha, "Maquininha" e "Outras saídas" na segunda). O texto da
faixa do caixa fica em `max-w-[60ch]`.

### 3.3 `VendasPorPedido.tsx`

Apagado; `TelaFinanceiro` deixa de importá-lo.

### 3.4 `CartaoDoMes.tsx`

O display lê `rendimentoDoMes`. O rótulo vira "rendeu pra você" (ou "perdeu no mês"); no mês sem
pedido, "no caixa", sem ponto.

### 3.5 Texto

- A descrição do cabeçalho de `/financeiro`: "O que o mês rendeu, e o que passou pelo caixa." (sai
  "o que sobrou de verdade").
- O e-mail do mês (`#d209`) **não muda nesta spec**; vai para Fora de escopo.

---

## 4 · Roteiro de navegador

A 390 px e a 1280 px, nos dois temas.

1. **O mês dos prints.** Rendeu R$ 70,44, 51%; No caixa +R$ 138,00; R$ 138,00 aparece duas vezes
   na primeira tela (Vendeu em pedido e Entrou), e não quatro.
2. **Um lançamento de cartão.** Entrou − Saiu = No caixa, centavo por centavo; a Hoje mostra o
   mesmo "Saiu".
3. **Uma saída de Marketing.** O rendeu cai; uma de Compra de insumo não mexe nele.
4. **Mês sem pedido** (um mês anterior ao uso do app): display "No caixa", sem ponto, com a frase.
5. **Hoje e Caixa** mostram o mesmo número no display, no mesmo mês.

---

## Critérios de aceite

- [x] `rendimentoDoMes` pura, testada com os seis casos da seção 1.
- [x] O display da Caixa e da Hoje é o mesmo número, com o ponto âmbar só quando positivo.
- [x] "Saiu" inclui a maquininha nas duas telas.
- [x] Nenhum "Ticket médio" em `src/` fora de nome de função.
- [x] `VendasPorPedido.tsx` apagado.
- [~] Ícone e texto em todo estado negativo; nenhuma cor solta.
- [x] `lint`, `typecheck`, `test` e `build` passam; `firestore.rules`, `firestore.indexes.json` e
      `package.json` intocados.
- [x] `#d260` e `#d261` escritos; `ESTADO.md` atualizado, com o resultado do passo 2.1.

---

## 5 · Fora de escopo

- **O e-mail do mês** com o rendeu. Spec própria, quando esta estiver no ar e lida.
- **Separar a maquininha do balcão da dos pedidos.** Pede a lista de lançamentos na Hoje.
- **"Quanto posso tirar pra mim".** Separar a hora dela do resto do custo pede a mão de obra
  gravada por item no pedido e somada no agregado: campo novo, e a decisão de mostrar salário é
  de produto, não de tela.
- **Margem por categoria de produto, DRE, regime de competência completo.** O rendeu é a resposta
  de uma linha; a contabilidade inteira é o que o `PRODUCT.md` recusa ("curso de contabilidade").

---

## Decisões desta spec que são fáceis de rejeitar

- **O rendeu ser o display, e não o caixa.** O caixa é o que ela vê no extrato do banco; o rendeu
  é o que o produto existe para dizer. Se as entrevistas mostrarem que ela lê "rendeu" como
  "dinheiro na conta", troca-se a ordem, não a conta.
- **`OUTRO` descontar.** Pode ser compra de insumo lançada na categoria errada, e aí desconta duas
  vezes. Erra pra baixo, de propósito.
- **Venda de balcão fora do rendeu.** Quem vende muito no balcão vê um rendeu pequeno e a frase
  que diz por quê. Lançar o balcão como pedido resolve, e é o caminho que o app já ensina.

---

## Riscos

- **O custo de fazer é tão bom quanto as fichas.** Ficha com preço de material velho dá rendeu
  inflado. A linha "Custou fazer" leva a "Ver meus produtos", onde a 054 já mostra a sobra por
  produto.
- **O agregado com mapas faltando** (passo 2.1) não afeta o rendeu, que lê só campos escalares,
  mas afeta a confiança na tela inteira.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado; o roteiro da seção 4.
