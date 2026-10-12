# Spec 140 · A receita dentro da receita (proposta)

**Tipo:** proposta para decisão, **não para implementar como está**. Um preparo (massa base,
recheio, ganache, brigadeiro) passa a poder entrar como ingrediente de outra receita, com o custo
dele seguindo o dela. Muda o schema de forma aditiva e revê o `D11`.
**Tamanho:** grande demais para uma sessão. Se aprovada, vira 140-A (custo) e 140-B (despensa e
fornada), descritas na seção 3.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, item 8.
**Depende de:** nada.
**Aprovações pedidas:** **mudança de schema** (`componentes` passa a valer em `SIMPLES`) e
**revisão do `D11`** ("um nível de profundidade"). Nada começa sem as duas.
**Decisões a registrar:** `#d345`, se aprovada.

---

## Problema

O Cookie Cacau com Nutella leva 320 g de Nutella pura. Muita confeiteira faz o recheio: Nutella com
creme de leite, congelada em bolinhas. Esse recheio vai em quatro produtos. Hoje ela tem duas
saídas, as duas ruins:

1. **Repetir os ingredientes do recheio em cada produto.** Quando o creme de leite sobe, o custo
   atualiza sozinho (a cadeia de `custoDesatualizado` funciona), mas mudar a receita do recheio é
   mudar quatro produtos à mão.
2. **Cadastrar o recheio como material**, com preço inventado. O custo deixa de seguir os
   ingredientes, que é o oposto do que o Rende promete.

Meez, Galley, Apicbase e CakeBoss chamam isso de _prep_ ou _sub-recipe_, e é o recurso que separa
"calculadora de custo" de "sistema de receitas". Em confeitaria é mais forte que em restaurante:
massa base, brigadeiro, ganache, calda e cobertura atravessam o cardápio inteiro.

---

## 1 · A proposta

- Uma receita (`SIMPLES`) com unidade de rendimento `g` ou `ml` pode entrar em outra receita como
  ingrediente, em gramas ou mililitros. O custo da linha é `custoUnitario` dela × quantidade, igual
  a um componente de kit.
- **Um nível, como o `D11`:** um preparo não leva preparo, e um kit continua não levando kit. A
  pergunta "isto pode entrar?" é `podeSerComponente` com a regra nova.
- Mudar o custo do preparo marca as receitas que o usam como `custoDesatualizado`, pelo mesmo
  caminho que hoje marca os kits (`componenteIds` com `array-contains`).
- Na lista de produtos, preparo não aparece no cardápio nem no pedido: ganha `vendavel: false`, ou
  sai pela unidade `g`/`ml`. **Decisão a tomar.**

## 2 · O que pede aprovação

1. `componentes[]` em `SIMPLES` (hoje só em `KIT`). Aditivo: documento antigo sem componente em
   receita continua válido. Mas toda leitura que supõe "componente ⇒ kit" precisa ser achada
   (`grep componentes`), e a lista de compras precisa explodir dois níveis.
2. `D11` revisto: "um nível" passa a ser "um nível de preparo e um de kit"; um kit pode levar uma
   receita que leva um preparo. A explosão de demanda continua finita (três níveis no máximo),
   mas deixa de ser trivial.
3. Despensa: fazer a massa do cookie desconta o recheio **pronto** (se ela fez antes) ou os
   ingredientes do recheio (se faz junto)? Os dois casos existem na bancada. Proposta: o preparo
   tem pote, como o produto (13D), e a fornada desconta do pote; sem pote contado, desconta os
   ingredientes.

## 3 · Divisão, se aprovada

- **140-A · O preparo no custo.** Schema, `podeSerComponente`, o bloco "O que vai dentro" aceitando
  preparo na busca (com o selo "Preparo"), o custo e a cadeia de desatualização. Sem despensa:
  fornada de receita com preparo desconta os ingredientes do preparo, pro rata.
- **140-B · O preparo no pote.** Contagem do preparo pronto, fornada que desconta do pote, lista de
  compras com dois níveis.

---

## Pergunta para a Maynara antes de tudo

"Você faz recheio ou massa base que vai em mais de um produto? Quantos? Faz antes ou junto?"
Se a resposta for "não" ou "um só", a 139 (variação) resolve, e esta fica arquivada.

---

## Fora de escopo, em qualquer caso

- Preparo dentro de preparo.
- Rendimento do preparo por unidade (`un`): bolinha de recheio de 20 g é `g`.
