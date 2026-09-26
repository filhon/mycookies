# Spec 056 · O que o mês diz do cardápio

**Tipo:** acima da lista de produtos, até três frases que cruzam o quanto cada produto vende com o
quanto ele deixa: quem sustenta o mês, quem vende muito e deixa pouco (com a conta do "e se"), e
quem deixa muito e vende pouco. Cada frase abre o produto. **Nenhum campo, nenhuma consulta além
da da 054, nenhuma regra, nenhuma dependência, nenhum gráfico.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Produtos (2026-09-26).
**Depende de:** 053 e 054 entregues. A 054 traz o resumo do mês para a tela; esta o lê.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d232` e `#d233`.

---

## Problema

Depois da 054, a tabela tem "Vendeu" e "Deixou" ao lado da sobra por unidade. O dado está na
tela, mas a leitura continua sendo dela: comparar 12 linhas em duas dimensões de cabeça, à noite,
depois de um dia de forno.

É a peça que as ferramentas pagas de cardápio vendem como relatório próprio: a engenharia de
cardápio (popularidade × margem, os quatro quadrantes de Kasavana e Smith). No formato delas é um
gráfico de dispersão com quadrantes e rótulos ("estrela", "burro de carga", "enigma", "cão").
Para o Rende, o gráfico é a anti-referência do "dashboard SaaS escuro genérico", e o rótulo por
linha é o selo de gamificação que o `PRODUCT.md` recusa. O que sobra, e é o que importa, é a
frase: o sistema faz a conta, ela decide.

---

## 1 · O que esta spec decide

### Até três frases, só com dado que sustente: `#d232`

Um bloco em `surface`, sem cartão dentro de cartão, entre a linha da contagem (e a faixa da 055)
e a lista. Título em `subheading`: **"O que setembro diz"**. Até três frases em `body`, cada uma
com o nome do produto como link (desktop: abre o `PainelProduto`; celular: o editor). As vendas
dos exemplos são ilustrativas; as sobras são as do print:

1. **Quem sustenta o mês.** O maior `lucro` do resumo.
   > **Cookie Red Velvet** deixou R$ 564,20 em 86 vendidos, o que mais sustentou o mês.
2. **Vende muito e deixa pouco.** Entre os com `quantidade ≥ mediana` e `margemReal < mediana`,
   o de maior quantidade. Leva a conta do `#d233`.
   > **Mini Cookie Tradicional** vendeu 212 e deixa R$ 1,92 em cada. R$ 0,40 a mais, com as
   > mesmas vendas, teriam sido R$ 84,80 no mês.
3. **Deixa muito e vende pouco.** Entre os com `margemReal ≥ mediana` e `quantidade < mediana`,
   o de maior sobra por unidade. Sem sugestão: pode ser produto de encomenda, e a decisão é dela.
   > **Cookie Pistache** deixa R$ 6,26 em cada e vendeu 4 no mês.

Regras:

- Medianas sobre os produtos **vendidos no mês** e vivos (não arquivados). Kit entra como
  produto; depois da 053 o número dele é o da caixa.
- Frase que não tem candidato não aparece. Nenhuma frase, nenhum bloco.
- **Dado mínimo:** pelo menos 4 produtos vendidos e 30 unidades no mês. Abaixo disso, o bloco não
  existe; mediana de três produtos é ruído dito com confiança.
- **Qual mês:** o corrente a partir do dia 10; antes, o anterior. O título nomeia o mês
  ("O que agosto diz"), então nunca há dúvida de qual é.
- O mesmo produto não aparece em duas frases.
- `leituraDoCardapio(produtosDoMes, fichas)` em `caixa.ts`, pura, com teste, devolvendo dados e
  não texto; a frase é montada no componente.
- No celular, o bloco é um `<details>` nativo fechado, com o título e a primeira frase visíveis
  no `<summary>`: a lista é o que ela veio buscar na bancada. No desktop, aberto.

### A conta do "e se" assume as mesmas vendas: `#d233`

"R$ X a mais, com as mesmas vendas, teriam sido R$ Y no mês."

- **X** é o maior entre `precoSugerido − precoVenda` (se positivo) e 10% do `precoVenda`,
  arredondado para cima a R$ 0,10. Com o sugerido acima do praticado, é a distância até ele; sem,
  é um degrau que ela reconhece.
- **Y** é `X × quantidade × (1 − taxas)`, com `somaTaxas` da ficha: a maquininha também leva a
  parte dela do aumento.
- A frase diz "com as mesmas vendas" porque o Rende não sabe quanto a cliente aceita. Honesto
  sobre o que não sabe; nunca "suba o preço".

---

## 2 · Antes de tocar em código

- Reler `#d218` e `#d219` (a faixa do teste já escolhe "o mais vendido") e `produtosOrdenados`:
  a mesma filtragem da linha zerada vale aqui.
- Dinheiro em centavos inteiros do começo ao fim; o 10% e o arredondamento em centavos.
- Contar as frases com o leitor de tela: o bloco é uma `<section>` com `aria-labelledby` no
  título; nada de `aria-live`, porque não muda enquanto ela olha.

---

## 3 · Escopo

- `src/lib/domain/caixa.ts`: `leituraDoCardapio`, com teste (medianas, mínimo, mesmo produto
  fora de duas frases, o degrau do "e se", a troca de mês no dia 10).
- `src/components/fichas/LeituraDoMes.tsx`: o bloco.
- `src/components/fichas/ListaFichas.tsx`: onde ele entra.

---

## 4 · Roteiro de aparelho

1. Conta da Maynara, desktop, depois do dia 10: o bloco com as frases que o mês sustentar;
   conferir cada número contra as colunas "Vendeu" e "Deixou" da 054.
2. Clicar no nome: o painel abre no produto.
3. Celular: o bloco fechado mostra o título e a primeira frase; abrir mostra as outras.
4. Conta de exemplo nova, sem vendas: nenhum bloco.
5. Dia 3 do mês: o título diz o mês anterior.

---

## Critérios de aceite

- [ ] Até três frases, cada uma só com candidato, nenhuma com o mesmo produto.
- [ ] Mínimo de 4 produtos e 30 unidades, testado.
- [ ] O "e se" em centavos, com a taxa, dizendo "com as mesmas vendas".
- [ ] `<details>` fechado no celular, aberto no desktop.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d232` e `#d233` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Gráfico de dispersão, quadrantes, rótulo por linha.** Ver o problema.
- **Levar as frases para o Caixa ou para o e-mail do dia.** O lugar é onde ela muda o preço. Se
  der certo aqui, o aviso diário da 044-B é candidato natural, em outra spec.
- **Reajuste em lote ("todos 10% a mais").** É a pergunta seguinte, e merece a própria spec com a
  consequência produto a produto, no padrão do `#d224`.
- **Histórico de custo por produto.** Pediria gravar o custo a cada salvamento; é mudança de
  schema e fica para quando ela perguntar "quando o Red Velvet ficou mais caro?".
