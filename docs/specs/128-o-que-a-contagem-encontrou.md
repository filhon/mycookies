# Spec 128 · O que a contagem encontrou

**Tipo:** depois de salvar, a contagem mostra o que encontrou: o que acabou, o que estava diferente
do esperado (em quantidade e em reais) e quanto vale o que ela contou. Depois, "Ver a lista de
compras". Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica sobre os prints da contagem de 2026-10-11, item 5.
**Depende de:** 125 se já entrou (os números chegam em base de qualquer jeito); nenhuma outra.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d333`, com nota de revisão no `#d62`.

---

## Problema

Contar 35 linhas dá trabalho, e hoje o fim é sair: salvar volta para `/compras` no mesmo toque
(`#d62`). O que a contagem descobriu fica invisível, e é a parte que vale dinheiro:

- Na tela já está "Nutella 900 g, contada há 18 dias". Se ela conta 300 g, sumiram 600 g que o
  sistema não viu sair: fornada não registrada, prova, perda, presente. São **R$ 24** de material.
- Amido de milho: "projetamos 510 g". Se ela conta 200 g, a fornada registrada não explica tudo.

Todo serviço de estoque por assinatura fecha a contagem com o relatório de diferença (esperado
contra contado, em dinheiro) e com o valor do estoque. É a página que paga a assinatura: transforma
"contar" de obrigação em descoberta. No Rende, é o princípio 3 do `PRODUCT.md` aplicado à
despensa: todo número mostra a sua consequência.

---

## 1 · O que esta spec decide: `#d333`

### Salvar abre o resumo, e não volta

- `salvar()` continua despachando o `writeBatch` **sem esperar** (`#d62` vale inteiro: na despensa
  não há sinal). O que muda é o destino: em vez de `navegar("/compras")`, a tela troca para o
  **resumo**, na mesma rota, com os números que ela tem em memória.
- O botão primário do resumo é **"Ver a lista de compras"** (`/compras`). O voltar do cabeçalho
  continua indo para Compras. Recarregar a página volta à contagem vazia: o resumo não é guardado.
- O selo de sincronização do cabeçalho segue dizendo a verdade sobre o que subiu.

### O que o resumo diz, nesta ordem

Seções no papel (`DESIGN.md`, "Seção no papel"), lista com divisórias; nenhum cartão.

1. **Título**: "Contagem salva." (com o ponto âmbar do estado vazio, e é o único âmbar da tela
   além do botão) e uma linha: "28 materiais com a data de hoje. Os 7 em branco continuam com a
   data que tinham."
2. **"Acabou"**: as linhas zeradas, nome e unidade. Frase: "Daqui pra frente a lista compra o que
   os pedidos pedirem delas." Some se não houver.
3. **"Diferente do que esperávamos"**: linha contada que tinha um esperado e ficou longe dele.
   - **Esperado**: a projeção, se houve fornada desde a contagem válida; senão, o anotado de uma
     contagem `FRESCA` ou `ENVELHECENDO`. Vencida, nunca contada e linha semeada pela compra não
     têm esperado (não há o que comparar).
   - **Longe**: diferença de **10% ou mais** do esperado **e** de pelo menos R$ 1,00. Abaixo disso
     é erro de balança, e listá-lo seria ruído.
   - Cada linha: nome; "300 g · esperávamos 900 g"; à direita, a diferença em reais, tabular,
     com sinal: "−R$ 24,00" com `TrendingDown` e cor negativa, ou "+R$ 6,40" com `TrendingUp` e
     cor positiva. Cor nunca sozinha.
   - Ordem: maior diferença em reais primeiro.
   - Abaixo da lista, uma linha em `--ink-muted`: "A diferença pode ser fornada não registrada,
     prova, perda, ou a contagem anterior." O sistema não sabe qual, e diz isso.
   - Total: "R$ 31,20 a menos do que esperávamos, em 3 materiais." Some se a seção sumir.
4. **"O que você contou vale"**: soma de `contado × custoUnidadeBase` nas linhas contadas, em
   display, com "nos 28 materiais contados hoje" embaixo. **Só as contadas**: somar as que ficaram
   em branco seria afirmar um valor que ninguém conferiu.

### Domínio

- `achadosDaContagem(linhas, valores, projecoes, custos)` em `domain/estoque.ts` (ou um módulo
  irmão, se a projeção pedir), pura, devolvendo `{ zeradas, diferencas, valorContado }`. Dinheiro
  em **centavos inteiros**: `custoUnidadeBase` é fracionado, então arredonda **uma vez**, no
  total de cada linha, e soma inteiros.
- Testes: limiar de 10% e de R$ 1,00 (os dois precisam valer); projeção tem precedência sobre
  anotado; vencida e semeada sem esperado; zero conta como zerada e como diferença se havia
  esperado; soma em centavos sem resíduo.

---

## 2 · Antes de tocar em código

1. Ler `#d62` e `#d40`: o despacho sem espera não muda.
2. Ler `custoUnidadeBase` e `custoUnidadeBaseCorrigido` em `types/insumos.ts`. O valor da despensa
   usa o **sem correção**: a perda é da receita, e não da prateleira.
3. Ler o estado vazio (`EstadoVazio`) para o título com o ponto.

---

## 3 · Escopo

- `domain/estoque.ts`: `achadosDaContagem`, com testes.
- `components/estoque/ResumoDaContagem.tsx`: o resumo.
- `TelaContagem.tsx`: o estado "salvo", a troca de destino, a guarda de saída desligada depois de
  salvar.
- `DECISOES.md`: `#d333`, e nota no `#d62` ("a tela não espera o servidor; desde a 128 ela mostra o
  resumo antes de voltar").
- `novidades.ts`: "Depois de contar, veja o que acabou e o que sumiu da despensa, em reais".

---

## 4 · Roteiro de navegador

Em 360 px e 1280 px, nos dois temas:

1. Contar Nutella 300 g (anotado 900 g, há 18 dias): aparece com "−R$ …" e o ícone.
2. Contar Açúcar cristal 1,15 kg (anotado 1,152 kg): não aparece (abaixo dos limiares).
3. Contar Amido de milho 200 g: esperado é a projeção, 510 g.
4. Zerar Corante: aparece em "Acabou" e, como tinha esperado, em "Diferente".
5. Contar Chocolate pó (nunca contada): entra no valor, não em "Diferente".
6. Modo avião: salvar abre o resumo na hora; o selo diz "Salvo no aparelho".
7. "Ver a lista de compras": a lista reflete a contagem.
8. Nenhuma diferença e nada zerado: só o título e o valor.

---

## Critérios de aceite

- [x] Salvar não espera o servidor e abre o resumo.
- [x] "Acabou", "Diferente do que esperávamos" (com os dois limiares) e "O que você contou vale".
- [x] Diferença com sinal, cor e ícone; frase honesta sobre a causa.
- [x] Dinheiro em centavos inteiros no domínio, com testes.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d333` e a nota no `#d62` escritos;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Um passo a mais antes de `/compras`.** Ela vai querer ver a lista; agora é um toque a mais.
  O resumo é o único lugar onde a diferença existe: sem ele, a contagem nunca mostra nada que ela
  não tenha digitado.
- **Sem guardar a diferença.** Um histórico de "o que sumiu por mês" seria schema novo. O resumo
  mostra a diferença de hoje; se ela pedir o histórico, é outra spec.
- **Custo sem a perda.** Com `custoUnidadeBaseCorrigido`, um material com 20% de perda valeria na
  prateleira mais do que ela pagou.

---

## Fora de escopo

- **Histórico de diferenças e relatório de perdas.**
- **A irmã `/fichas/contagem`**: o pote tem outra conta (`#d97`).
- **Atribuir a diferença** a fornada, perda ou prova: o sistema não vê, e não adivinha.
