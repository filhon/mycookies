# Spec 048 · O teste que mostra o que rendeu

**Tipo:** a faixa do teste da tela Hoje deixa de ser um relógio e passa a mostrar o que o Rende
já fez pela conta, e nos três últimos dias põe o preço do plano ao lado do que ela vendeu, em
produto dela. Um componente reescrito, uma função pura com teste. **Nenhum campo, nenhuma
rota, nenhum índice, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão curta.
**Origem:** crítica da tela Hoje com `/impeccable` (2026-09-25).
**Depende de:** a 045 (o agregado do mês já lido pela tela, que esta reusa).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d218` e `#d219`.

---

## Problema

"Seu teste grátis acaba em 5 dias · Assinar" é a primeira linha da tela, com o mesmo peso de
tudo, e "Assinar" é texto depois de um ponto médio. Ela diz **quanto tempo falta** e nunca **o
que vale**.

Os produtos de assinatura que convertem teste em pagamento mostram, no fim do teste, o que a
pessoa já tem ali dentro (o Duolingo mostra a sequência, o Canva os designs, o Notion as
páginas) e comparam o preço com um ganho concreto. O Rende tem o ganho mais concreto de todos,
em reais, e não o usa: a tela de assinatura (039) já fala "o mês sai por N cookies", mas com o
cookie do exemplo, e só para quem foi até lá.

Uma confeiteira no dia 12 do teste com R$ 2.086 de vendas acompanhadas e cinco produtos com
preço lê "acaba em 2 dias · Assinar". Deveria ler o que ela vai deixar de ter.

---

## 1 · O que esta spec decide

### A faixa conta o que rendeu, com os números da conta: `#d218`

Durante o teste, sempre que houver o que contar, a faixa ganha uma segunda linha:

```
[hourglass]  Seu teste grátis acaba em 5 dias                    ›
             5 produtos com preço · R$ 2.086 em vendas em setembro
```

- **Produtos com preço:** fichas vivas com `precificacao.precoVenda > 0`, da consulta de fichas
  que a tela já assina.
- **Vendas:** `entradas` do agregado do mês que a 045 já lê. Mês sem entrada: só os produtos.
- **Nada a contar** (zero produto com preço e zero entrada): a faixa fica como hoje, uma linha.
  Não se inventa valor, e a conta que ainda não montou nada tem o cartão dos primeiros passos
  logo abaixo.

### Nos três últimos dias, o preço ao lado do que ela vende, e um botão de verdade: `#d219`

Com `diasRestantes <= DIAS_DE_ATENCAO` a faixa vira um bloco (mesmo contorno, mais alto):

```
[triangle-alert]  Seu teste grátis acaba em 2 dias
                  5 produtos com preço · R$ 2.086 em vendas em setembro
                  O completo custa R$ 49 por mês: a sobra de 13 unidades de Cookie Oreo.
                  Sem assinar, nada se perde: tudo fica guardado para ler.
                  [ Assinar ]
```

- **"A sobra de N {produto}"**: o produto mais vendido do mês em `resumo.produtos` (maior
  `quantidade`), com `lucro / quantidade` como sobra por unidade, e
  `unidadesQuePagam(mensalDoCompleto, sobraPorUnidade)`. É o `#d182` com o produto **dela** e
  com **sobra** em vez de preço: o plano se paga com o que sobra, não com o que entra. Sem
  produto vendido no mês, sobra ≤ 0 ou sem preço do Stripe (`/api/assinatura/precos` falhou ou
  sem rede): a linha não aparece. Nome do produto no plural só se a ficha tiver plural
  Sempre "N unidades de {nome}": o nome da ficha não tem plural gravado, e
  pluralizar nome próprio de produto erra ("Cookies Oreo 120gs").
- **O preço é o do plano que ela usa hoje no teste** (o teste é do completo; se a 032 permitir
  teste do essencial, o essencial). Busca uma vez por montagem, só nos três últimos dias.
- **"Nada se perde"** é verdade pelo `#d144` (ler não tem prazo). A frase existe porque o
  medo de perder o que montou segura a decisão, e a resposta honesta é curta.
- **"Assinar" vira botão primário** (`accent-500`, 52 px no celular). A Hoje não tem primário
  (`DESIGN.md`: tela de leitura), então o "um por tela" continua valendo; e nos três últimos
  dias assinar **é** a ação da tela. O bloco inteiro deixa de ser link: com um botão dentro, o
  alvo é o botão.
- Ícone e cor de atenção continuam como estão (`TriangleAlert`, `text-attention`); o âmbar do
  botão é o acento, não a atenção, e o triângulo e a palavra carregam o aviso.

### Função pura

`sobraQuePagaOPlano(produtos: ResumoMensal["produtos"], mensal: Centavos): { nome: string;
unidades: number } | null` em `src/lib/domain/assinatura.ts`, com teste: sem produtos, empate
em quantidade (maior receita ganha), lucro negativo, quantidade zero.

---

## 2 · Antes de tocar em código

- Ler `fraseDoTeste`, `situacaoDaConta` e a 039 (`#d181` a `#d184`): o texto e o "N cookies"
  daqui não podem contradizer o de `/assinatura`.
- Confirmar em `lerPrecos` qual chave é o mensal do completo e se a rota responde sem login de
  dona (a ajudante nunca vê a faixa, `#d156`).

---

## 3 · Escopo

- `src/components/assinatura/FaixaDoTeste.tsx`, reescrito; recebe o resumo do mês e as fichas
  da página em vez de ler de novo.
- `src/lib/domain/assinatura.ts`: `sobraQuePagaOPlano` e teste.
- `src/app/(app)/(coluna)/page.tsx`: passar os dados.

---

## Critérios de aceite

- [ ] Segunda linha com produtos e vendas quando há o que contar; uma linha quando não há.
- [ ] Nos três últimos dias: o preço do plano em sobra de produto dela, a frase do "nada se
      perde" e o botão primário.
- [ ] Sem preço do Stripe ou sem produto vendido: sem a linha do preço, e o resto igual.
- [ ] `sobraQuePagaOPlano` com teste.
- [ ] Nenhuma leitura nova além da rota de preços, e só nos três últimos dias.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d218` e `#d219` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Desconto de fim de teste, cupom, contagem regressiva em horas.** É a pressão que a marca
  não faz ("confiante, não arrogante"; "honesta, não alarmista").
- **O mesmo bloco no e-mail do teste acabando** (044-B). Faz sentido depois: a peça é a mesma
  frase. Entra quando esta tiver rodado com uma conta de verdade.
- **Mostrar a faixa para quem já assinou** ("o Rende te acompanhou R$ X este mês"). É o
  argumento de retenção, e o bloco do mês da 045 já é ele.

---

## Decisões desta spec que são fáceis de rejeitar

- **Botão primário na Hoje.** Contraria a letra do `DESIGN.md` ("tela de leitura"), não o
  espírito ("um por tela"). Três dias por conta, uma vez.
- **Sobra e não preço no "paga o plano".** Diverge da 039, que usa preço. A 039 fala com quem
  ainda não tem produto; aqui ela tem, e a sobra é a conta honesta.
