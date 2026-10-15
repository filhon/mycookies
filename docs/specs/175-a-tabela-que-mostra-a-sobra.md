# Spec 175 · A tabela que mostra a sobra

**Tipo:** a tabela "O que muda de doce pra doce" de `/como-calcular-o-preco-de-doces` passa a
mostrar o que cada preço deixa pra ela, em reais, e do que o custo de cada doce é feito, pela
faixa de composição. No celular, cada doce vira uma linha que se toca inteira, no lugar da lista de
definições com quatro rótulos repetidos.
Nenhum campo, nenhuma regra, nenhuma dependência. Nenhuma aritmética nova.
**Tamanho:** uma sessão.
**Origem:** a crítica da página de doces de 2026-10-15, sobre os prints de celular (383px) e de
desktop (1864px). Páginas de conteúdo que vendem assinatura (as ferramentas gratuitas da Shopify, a
página de tarifas da Stripe, as calculadoras da NerdWallet) mostram a consequência do número junto
dele, e mostram o número decomposto num desenho. A página de doces mostra um preço sozinho e
descreve a composição em palavras.
**Depende de:** 068 (a página e os quatro exemplos), 033-C (a `FaixaDeComposicao`).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Decisões a registrar:** uma, numerada na sessão (a faixa por doce na tabela).

---

## Problema

1. **O preço aparece sozinho.** A coluna "Preço do exemplo" diz R$ 8,50, R$ 176,50, R$ 117,50,
   R$ 17,00 e mais nada. É o princípio 3 do `PRODUCT.md` ("todo número mostra a sua
   consequência") e o par obrigatório "preço + sobra" do `DESIGN.md`, os dois quebrados na página
   que existe para ensinar a conta.
2. **O dado mais forte é o menor da página.** "Sobram 2% do preço" no brigadeiro é o argumento da
   página inteira (duas horas de trabalho por R$ 1,80), e está em `text-label` `ink-muted`, sem
   reais e sem a referência dos 40%. O `DESIGN.md` pede o percentual com o que ele vale em reais.
3. **A composição é texto.** "Ingredientes, 71% do custo", "Seu trabalho, 41% do cento": o leitor
   imagina a proporção. O Rende tem a faixa de composição para isso, e ela não aparece na página
   (nenhuma assinatura da marca aparece: nem faixa, nem porção, nem corte).
4. **No celular, a lista é pesada e o preço vem por último.** Cada doce tem quatro pares
   rótulo/valor; "Vende por", "O que pesa", "O erro" e "Preço do exemplo" se repetem quatro vezes
   (dezesseis rótulos), e o preço, que é o que ela veio buscar, fica no fim de cada bloco. O nome
   do doce é o único alvo, sublinhado fino; por isso o texto precisa dizer "Toque no doce para ver
   a conta dele".
5. **No desktop, o cabeçalho quebra.** "Vende por" e "Preço do exemplo" ocupam duas linhas cada
   no print de 1864px; a coluna "Vende por" é uma palavra só por linha.

---

## 1 · O que esta spec decide

### A linha de cada doce

Quatro informações, nesta ordem de leitura:

1. **O doce e a unidade**: "Brigadeiro", e embaixo "o cento" (some a coluna "Vende por").
2. **Do que o custo é feito**: a `FaixaDeComposicao` do exemplo, com `composicaoDoLote` sobre o
   custo dele (o bolo pelo `boloDe(2)`), e abaixo a frase do "o que pesa" de hoje, em `label`.
   A faixa é a mesma do editor de produto, sem mudar o componente: o "Seu trabalho" em
   `--brand-as-ink`, o resto em degraus de `--ink`. Proporção real, nunca inventada (`#d126`).
3. **O preço e a sobra**: o preço em `Dinheiro` à direita, tabular, e logo abaixo "sobram
   R$ 4,66 pra você" em `label`. **Sem a porção rosa**: são quatro sobras na mesma tela, e a
   porção é uma por tela (`#d381`). Ela fica para a calculadora da 176.
4. **O erro e o que ele custa**: o nome do erro, e abaixo, com `TrendingDown` em `--negative`,
   "sobram R$ 1,80, 2% do preço, e não 40%". O reais vem de `verificarPreco(...).lucroUnitario`,
   que a página já calcula e descarta.

Números à mão, para a sessão conferir contra as funções (vale o da função, e a diferença vai para
o `ESTADO.md`):

| Doce         | Preço     | Sobra no preço | No erro                                       |
| ------------ | --------- | -------------- | --------------------------------------------- |
| Cookie       | R$ 8,50   | R$ 4,66        | somar 45%: R$ 1,28, 26%                       |
| Brigadeiro   | R$ 176,50 | R$ 70,67       | sem a hora: R$ 1,80, 2%                       |
| Bolo (2 kg)  | R$ 117,50 | R$ 47,12/kg    | o quilo do de 2 kg no de 1 kg: R$ 29,62, 25%  |
| Bolo de pote | R$ 17,00  | R$ 7,05        | o preço do balcão no aplicativo: R$ 4,50, 26% |

### Celular: uma linha que se toca inteira

A lista de definições sai. Cada `<li>` é um `Link` de bloco inteiro (a "lista com divisórias" do
`DESIGN.md`: nome e detalhe à esquerda, valor tabular à direita, alvo inteiro), com `ArrowRight`
de 16px ao lado do nome, como o `OutrosDoces`:

```
Brigadeiro  →                    R$ 176,50
o cento                 sobram R$ 70,67 pra você
▇▇▇▇▇▇▇▇/▇▇▇▇▇▇▇/▇/▇/▇
Seu trabalho, 41% do cento, quase o mesmo que a receita
↘ Esquecer a hora de enrolar: sobram R$ 1,80, 2% do preço, e não 40%
```

O rótulo de cada parte vai em `sr-only` onde a posição não diz (o `DESIGN.md`, "Tabela"). A
frase "Toque no doce para ver a conta dele, passo a passo." sai do parágrafo da seção: a linha
inteira é o alvo e a seta diz que leva.

### Desktop: quatro colunas

`Doce` · `Do que o custo é feito` · `O erro` · `Preço`. "Vende por" entra embaixo do nome. O
cabeçalho com `whitespace-nowrap`. O link do nome se estende à linha inteira (`relative` na
`<tr>`, `after:absolute after:inset-0` no link), com hover em `--surface-sunken`; o foco continua
no link. A `caption` fica.

---

## 2 · Antes de tocar em código

1. Ler a 068 inteira e `src/app/como-calcular-o-preco-de-doces/page.tsx`.
2. `/impeccable` com registro **brand** (é página do site, não o app), e `PRODUCT.md`/`DESIGN.md`.
3. Conferir a tabela da seção 1 contra `calcularPrecoSugerido` e `verificarPreco`.

---

## 3 · Escopo

- `page.tsx`: `Linha` ganha `sobra: Centavos` (o `lucroUnitario` no preço do exemplo),
  `sobraNoErroEmReais: Centavos` e `segmentos` (o `composicaoDoLote` do exemplo, por unidade de
  venda, como `/conheca` faz para a `FaixaDoCusto`). `vendePor` vira o artigo e a unidade ("o
  cento", "a unidade", "o quilo", "o pote").
- A lista do celular e a tabela do desktop refeitas como a seção 1; `Erro` e `Preco` ajustados.
- `tests/domain/exemplo.test.ts`: um `it` por doce prendendo a sobra no preço e a sobra no erro
  em reais, com a conta à mão no comentário.
- `DESCRICAO_DA_PAGINA` fica como está.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px e a 1280px, nos dois temas.

1. Cada linha mostra preço e sobra; nenhum preço sozinho.
2. A faixa de cada doce bate com a da página dele (mesma proporção, mesmo destaque).
3. No celular, tocar em qualquer ponto da linha leva à página do doce; alvo ≥ 44px.
4. No desktop, nenhum cabeçalho em duas linhas a 1024px; clicar na linha leva ao doce; Tab passa
   pelos quatro links em ordem, com foco visível.
5. Sem JavaScript, tudo igual (a página continua server component).
6. Nenhuma rolagem lateral a 390px; o erro do bolo ("Um preço de quilo pra qualquer tamanho") não
   empurra a coluna do preço.
7. Lighthouse no celular: acessibilidade 100.

---

## Critérios de aceite

- [x] Todo preço da tabela tem a sobra em reais ao lado; todo erro tem a sobra em reais, o
      percentual e "e não 40%".
- [x] A faixa de composição de cada doce sai de `composicaoDoLote`; nenhuma proporção escrita à mão.
- [x] Nenhuma porção rosa na tabela.
- [x] Celular sem `<dl>` de quatro rótulos; linha inteira como alvo.
- [x] O teste prende as oito quantias novas.
- [x] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [x] Decisão registrada; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **A faixa sem a maquininha e a sobra.** A faixa do preço praticado (com maquininha e sobra em
  rosa) é spec própria pelo `#d381`. Aqui a faixa é só do custo, e a sobra vai em texto.
- **Tirar a coluna "Vende por".** A unidade continua na linha, embaixo do nome; o que sai é a
  coluna de uma palavra.
- **A linha inteira clicável no desktop.** Com o link estendido, selecionar texto da linha fica
  mais difícil. Quem copia o "o que pesa" é raro; quem quer abrir o doce é a maioria.

---

## Fora de escopo

- A calculadora com os números dela (176).
- A tabela de margem e markup e o botão de mandar a página (177).
- A faixa nas páginas de cada doce: elas têm a `ContaAberta`.
- Mudar `FaixaDeComposicao`.
