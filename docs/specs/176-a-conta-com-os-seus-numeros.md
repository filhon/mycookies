# Spec 176 · A conta com os seus números

**Tipo:** `/como-calcular-o-preco-de-doces` ganha uma calculadora de cinco campos, um por parcela,
na unidade em que ela vende, mais margem, taxas e o preço que ela cobra hoje. A conta refaz a cada
tecla pelas funções do app e termina na porção rosa. No desktop ela ocupa a coluna da direita, hoje
vazia, presa ao lado das cinco parcelas que explicam cada campo.
Nenhum campo gravado, nenhuma regra, nenhuma dependência. Uma função pura nova, com teste.
**Tamanho:** uma sessão.
**Origem:** a crítica da página de doces de 2026-10-15. As páginas de conteúdo que trazem
assinante (as ferramentas gratuitas da Shopify, as calculadoras da NerdWallet e da Omni, a
calculadora de tarifas da Stripe) são **a ferramenta primeiro e o texto em volta**. A página de
doces responde a pergunta mais larga do site ("como precificar doces") e é a única do conjunto em
que ela não pode fazer conta nenhuma: a pergunta "Preciso de planilha?" a manda para a calculadora
do cookie, que só conhece cookie.
**Depende de:** 068, 040 (a `CalculadoraDaPorta`, de onde vêm os campos e o desenho do resultado),
175 (a tabela; pode vir antes ou depois, não se tocam).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. **Reabre um "Fora de escopo" da 068**
("A calculadora nas páginas novas", que esperava o Search Console): ver "Decisões fáceis de
rejeitar".
**Decisões a registrar:** duas, numeradas na sessão (a calculadora sem receita; o lugar dela).

---

## Problema

1. **A pergunta larga não tem ferramenta.** Quem busca "como precificar doces" vende pão de mel,
   torta, salgado, docinho de festa. A tabela mostra quatro exemplos e diz "o seu preço sai dos
   números da sua cozinha", sem lugar para pôr os números.
2. **A calculadora que existe não serve aqui.** A `CalculadoraDaPorta` parte de uma receita da
   biblioteca (dois cookies). Levar outro doce a ela é receita nova na biblioteca, que é também o
   onboarding do app: foi o motivo da 068 para deixá-la fora.
3. **No desktop, metade da tela está vazia.** Do "As cinco parcelas" até o convite, o texto ocupa
   68ch à esquerda e a coluna da direita (uns 40% da largura a 1864px) fica em branco. A página do
   cookie usa esse espaço para a `ContaAberta` presa; a de doces não usa para nada.
4. **A página não termina num número dela.** O convite pede o teste antes de ela ter visto o
   próprio preço. Na `/conheca` e na página do cookie, a calculadora vem antes do convite e o
   resultado é dela.

---

## 1 · O que esta spec decide

### A calculadora sem receita

Ela já sabe o custo de cada parcela, ou consegue estimar; a página acabou de ensinar as cinco.
Então os campos são **as cinco parcelas, em reais, por unidade de venda**, e não ingredientes:

| Campo             | Componente   | Dica (uma linha, `label` `ink-muted`)                |
| ----------------- | ------------ | ---------------------------------------------------- |
| A unidade         | `Pilulas`    | unidade · cento · quilo · pote. Só muda as palavras. |
| Ingredientes      | `CampoMoeda` | O que a receita leva, dividido pelo que ela rende.   |
| Embalagem         | `CampoMoeda` | Tudo que sai junto: forminha, pote, caixa, etiqueta. |
| Sua hora          | `CampoMoeda` | O tempo de fazer, vezes o valor da sua hora.         |
| Gás e energia     | `CampoMoeda` | O forno e o fogão pelo tempo da receita.             |
| Despesas fixas    | `CampoMoeda` | O mês dividido pelo que você vende nele.             |
| Margem            | `Campo` %    | O que você quer que sobre do preço.                  |
| Taxas             | `Campo` %    | Maquininha, aplicativo, pagamento online, somados.   |
| Quanto cobra hoje | `CampoMoeda` | Opcional. A conta diz quanto ele deixa.              |

**Começa preenchida com o cookie do `EXEMPLO`**, por unidade, com 40% e 5%. Uma linha de
`Pilulas` acima dos campos, "Começar pelo exemplo do", com Cookie · Brigadeiro · Bolo · Bolo de
pote, troca os cinco valores, a unidade e as taxas pelos do exemplo daquele doce (o pote com as do
balcão). É a ponte entre a tabela de cima e o doce dela: ela parte do mais parecido e troca o que
for diferente.

**O resultado**, na ordem da `CalculadoraDaPorta`:

1. "Custa R$ X por {unidade}", com a `FaixaDeComposicao` das cinco parcelas digitadas.
2. "Cobre R$ Y", em `Dinheiro` grande, já no meio real (`precoArredondado`).
3. "sobram **R$ Z pra você**", na porção rosa, a única da página.
4. Com "Quanto cobra hoje" preenchido: "No seu preço de hoje sobram R$ W, N% do preço". Abaixo
   do sugerido, com `TrendingDown` e `--negative`; abaixo do custo, "cada venda tira R$ V do seu
   bolso" com o mesmo ícone. Acima ou igual, só a frase.
5. Margem + taxas ≥ 100%: `TriangleAlert` e a frase do `motivo` de `calcularPrecoSugerido`, no
   lugar do preço. Nada de `NaN`, nada de preço negativo.

**A conta é uma função pura**, `contaDasParcelas` em `src/lib/domain/calculadora.ts`, ao lado de
`contaDaPorta`: recebe as cinco parcelas, margem, taxas e o preço de hoje; devolve custo,
segmentos, o `ResultadoPreco` e o `verificarPreco` do preço de hoje. Só compõe
`calcularPrecoSugerido`, `verificarPreco` e `somaTaxas`; **nenhuma aritmética nova**. O componente
só desenha.

**Nada é guardado.** Nem `localStorage`, nem o rascunho da porta (`#d189`): o rascunho tem a forma
de uma receita da biblioteca, e esta conta não tem receita. Levar a conta para o cadastro é o
"Fora de escopo".

### O lugar dela

- **Desktop (`lg`):** a grade da página do cookie, `lg:grid-cols-[minmax(0,1fr)_26rem]`. "As
  cinco parcelas" e "Margem e taxas" na esquerda; a calculadora na direita, `lg:sticky lg:top-8`,
  do começo das parcelas ao fim da margem. Ela lê a parcela à esquerda e preenche o campo à
  direita. As perguntas voltam à coluna de leitura embaixo, sem a calculadora ao lado.
- **Celular:** depois de "As cinco parcelas", antes de "Margem e taxas", com `h2` "Faça a conta do
  seu doce" e `id="sua-conta"`. Ela leu as cinco e chega nos cinco campos.
- **A resposta do topo** ganha uma frase no fim: "Ou ponha os seus números na conta, mais abaixo",
  com o link para `#sua-conta`. A resposta continua inteira antes dele (`#d176`).
- **"Preciso de planilha?"** passa a apontar para `#sua-conta` desta página, e não para a do
  cookie.

**Sem JavaScript**, o servidor entrega a calculadora com o cookie do exemplo e o resultado dele,
parada: o mesmo comportamento da `CalculadoraDaPorta` na 040.

---

## 2 · Antes de tocar em código

1. Ler a 040 e `src/components/site/CalculadoraDaPorta.tsx` inteiros: os campos, o resultado e a
   ordem saem dela. Reaproveitar `CampoMoeda`, `Campo`, `Pilulas`, `Dinheiro`, `Porcao`,
   `FaixaDeComposicao` sem mudar nenhum.
2. `/impeccable` com registro **brand**; `PRODUCT.md` e `DESIGN.md`.
3. Conferir o teclado numérico no iPhone e no Android: `inputMode="decimal"` nos percentuais.

---

## 3 · Escopo

- `src/lib/domain/calculadora.ts`: `contaDasParcelas` e o tipo da entrada.
- `tests/domain/calculadora.test.ts`: o cookie do `EXEMPLO` dá o mesmo preço e a mesma sobra que a
  página do cookie; cada um dos quatro exemplos dá o preço da tabela; margem + taxas = 100 dá
  `ok: false`; preço de hoje abaixo do custo dá lucro negativo.
- `src/components/site/CalculadoraDasParcelas.tsx`, `"use client"`.
- `page.tsx` de doces: a grade, a calculadora, a frase da resposta e o link da pergunta.
- A `caption` da tabela e o texto em volta não mudam (são da 175).

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px, 1280px e 1864px, nos dois temas.

1. Sem JavaScript: a calculadora aparece com o cookie e R$ 8,50, e o texto da página inteiro.
2. Com o exemplo do brigadeiro: R$ 176,50 o cento, igual à tabela.
3. Trocar a margem para 60% e as taxas para 40%: aviso no lugar do preço, nada quebrado.
4. "Quanto cobra hoje" R$ 2,00 no cookie: a frase com ícone de queda e "tira do seu bolso".
5. Desktop: a calculadora fica presa enquanto as parcelas passam, e solta antes das perguntas;
   nada encosta no rodapé.
6. Celular: o link da resposta desce até a calculadora; nenhum campo menor que 48px; nenhuma
   rolagem lateral.
7. Uma porção rosa na tela, só a da calculadora.
8. Lighthouse no celular: acessibilidade 100; a nota de desempenho no `ESTADO.md`, comparada com a
   de antes (o componente é o primeiro JavaScript da página).

---

## Critérios de aceite

- [ ] `contaDasParcelas` só compõe funções que já existem, e o teste prende os quatro exemplos.
- [ ] A calculadora começa no cookie, troca para os quatro exemplos e aceita qualquer número.
- [ ] O resultado mostra custo, faixa, preço, sobra na porção e, com o preço de hoje, o que ele
      deixa; margem + taxas ≥ 100 vira aviso.
- [ ] Desktop com a coluna da direita usada; celular com a calculadora depois das parcelas.
- [ ] Nada gravado no aparelho nem no Firestore.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [ ] Duas decisões registradas; a nota da 068 ("A calculadora nas páginas novas") marcada como
      "em parte, na 176"; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **Não esperar o Search Console.** A 068 deixou a calculadora para quando uma página de doce
  tivesse impressões e saída baixa. Esta não é aquela calculadora (não pede receita nova na
  biblioteca), e a página de doces é a da pergunta larga, onde nenhum exemplo é o doce dela. Se
  quem conduz preferir esperar, a 176 fica escrita e não entra.
- **Parcelas em reais, e não ingredientes.** Quem nunca somou a embalagem não sabe o número de
  cabeça. A dica de cada campo diz como chegar nele, e a página do doce mais parecido tem o passo a
  passo. A conta por ingrediente é a do app.
- **Unidade só como palavra.** Trocar "cento" não converte nada: os valores são do que ela vende.
- **Nada guardado.** Ela pode perder o que digitou ao sair. Guardar pede uma forma nova de
  rascunho e uma porta no cadastro para recebê-lo.

---

## Fora de escopo

- Levar a conta para o cadastro (o rascunho do `#d189` com outra forma): spec própria, se a
  medição mostrar gente usando a calculadora e indo para `/cadastro`.
- Imprimir ou mandar a conta: o "planilha de precificação" que a busca pede. Ver a 177.
- A calculadora nas páginas de cada doce: elas têm a `ContaAberta` e o passo a passo.
- Evento de uso na medição: o Vercel Web Analytics só conta evento em plano pago (`#d180`).
