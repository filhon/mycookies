# Spec 125 · Contar como está na prateleira

**Tipo:** o campo da contagem passa a aceitar o número em embalagens ("3 latas") além da
unidade base, e a linha intocada ganha o atalho "Igual". Nenhum schema, nenhuma regra, nenhum
índice, nenhuma dependência. A gravação continua em unidade base, pelo mesmo `writeBatch`.
**Tamanho:** uma sessão.
**Origem:** a crítica "o que a contagem não tem comparada aos serviços de assinatura?" sobre os
prints de 2026-10-11, itens 1 e 2.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d329`, `#d330`.

---

## Problema

O print do celular pede **gramas** de tudo o que tem peso: leite condensado "2,72 kg", chocolate
cobertura "2,02 kg", creme de leite "2,82 kg". Na despensa ninguém vê 2,72 kg: vê sete latas. Para
digitar o número que a tela quer, a Maynara faz `7 × 395` de cabeça, com farinha no dedo, para
cada linha. É a conta que o produto promete fazer por ela (`PRODUCT.md`, princípio 1).

Todo serviço de estoque que se paga por assinatura (MarketMan, WISK, Apicbase, meez, Square for
Retail) conta na unidade em que a coisa está na prateleira: caixa, pacote, unidade, e converte.
O Rende já sabe o tamanho da embalagem de cada material (`quantidadeCompra` + `unidadeCompra`,
gravado em base em `quantidadeBase`), e não usa isso aqui.

O segundo custo é o número que não mudou. "Encontrar o mesmo número é uma contagem, e é uma das
mais valiosas" (`#d58`), mas hoje confirmar os 192 adesivos de ontem é digitar 1-9-2.

---

## 1 · Contar em embalagens: `#d329`

### O campo ganha a unidade como botão

- O sufixo do campo ("g", "ml", "un"), hoje um `<span aria-hidden>`, vira **botão** quando a
  embalagem do material tem mais de uma unidade base (`quantidadeBase > 1`). Alterna entre:
  - **base**: "g", "ml" ou "un", como hoje;
  - **embalagem**: "emb".
- Alvo de 44 × 44 px dentro do campo, à direita; o campo cresce de `w-28` para `w-32` para o
  número continuar com ≈ 72 px. `aria-label` diz o estado e o destino: "Contando em gramas.
  Contar em embalagens de 395 g".
- **Trocar com número digitado converte o número**, e não o apaga: "2" em embalagens de 395 g
  vira "790" em gramas. É o mesmo número dito de outro jeito.
- Material com `quantidadeBase` igual a 1 (comprado de um em um) não tem botão: as duas unidades
  seriam a mesma.

### Qual vem primeiro

- **g e ml: embalagem. un: a base.** Ninguém pesa a despensa; mas ovo, adesivo e saquinho se
  contam soltos, e a embalagem de 30 ovos não é como ela os vê.
- A escolha que ela fizer **fica no aparelho, por material** (`localStorage`, chave
  `rende:contagem:unidades`, mapa `insumoId → "embalagem" | "base"`, tudo em `try/catch` como em
  `rascunhoDaPorta.ts`). Na próxima contagem a linha abre como ela deixou.
- **Linha semeada pela compra abre em base**, qualquer que seja a escolha guardada: a sugestão é
  `contagem + entrada` em base, e escrevê-la em embalagens daria "4,1012658". Se ela trocar, o
  número converte como qualquer outro.

### O que a linha diz

- A referência embaixo do nome (`referencia`) continua em base: é o que está gravado.
- Em embalagem, a consequência do que ela digitou diz a conta inteira:
  "2,5 embalagens de 395 g = 987,5 g, contados hoje". Fração é permitida: a lata aberta pela
  metade é "0,5".
- Zero continua "zero: conferido, e não tem", em qualquer unidade.

### Domínio

- Em `domain/estoque.ts`: `naBase(valor, unidade, quantidadeBase)` e `daBaseParaCampo(valorBase,
unidade, quantidadeBase)` (este devolve texto por `textoContado`). Testes: embalagem inteira,
  fração, conversão de ida e volta sem resíduo de ponto flutuante (3 × 0,1 kg), `quantidadeBase`
  igual a 1.
- `TelaContagem` guarda a unidade por linha ao lado de `digitados`; `valores` passa a ser
  `naBase(numeroContado(texto), unidade, quantidadeBase)`. `resumoDaContagem` e `salvar` não
  mudam: já recebem base.
- `LinhaDeContagem` ganha `tamanhoEmbalagem: number` (o `quantidadeBase` do insumo), preenchido
  em `linhasParaContar`.

---

## 2 · "Igual": `#d330`

- Na linha **intocada** com contagem que vale (`FRESCA` ou `ENVELHECENDO`) e **sem fornada desde
  então**, aparece um botão terciário **"Igual"** entre o texto e o campo (44 px de alto,
  `--brand-as-ink`, hover `--brand-100`). `aria-label`: "Igual à última contagem: 192 un".
- O toque escreve no campo o número anotado, na unidade em que a linha está, e a consequência
  passa a dizer "igual à última, conferido hoje". Daí em diante é um campo digitado como qualquer
  outro: apagar desfaz.
- Some com a linha tocada; não aparece em linha vencida, nunca contada ou com fornada desde a
  contagem (ali o número velho já não é o que está na prateleira, e o atalho convidaria a
  confirmá-lo sem olhar).
- Em 360 px o botão entra na linha do campo, à esquerda dele; o nome trunca antes. Se não couber
  sem o nome cair abaixo de ≈ 120 px, vai para a linha da referência, à direita.

---

## 3 · Antes de tocar em código

1. Ler `LinhaContagem.tsx` (o sufixo, `referencia`, `consequencia`) e `TelaContagem.tsx`
   (`digitados`, `valores`, a semeadura).
2. Ler `#d58` e `#d59`: o campo nasce vazio, e esta spec não muda isso.
3. Conferir em `/insumos` dois materiais reais: um em kg (embalagem de 1 kg) e um em g (395 g).

---

## 4 · Escopo

- `domain/estoque.ts`: as duas funções e `tamanhoEmbalagem`, com testes.
- `LinhaContagem.tsx`: o sufixo-botão, a frase em embalagem, o "Igual".
- `TelaContagem.tsx`: a unidade por linha e a lembrança no aparelho.
- `/fichas/contagem` (a irmã, `#d97`) **não** muda: o pote se conta em unidades de rendimento.
- `DECISOES.md`: `#d329`, `#d330`, e nota no `#d59` ("o campo continua nascendo vazio; o 'Igual'
  é um ato dela, por linha").
- `novidades.ts`: "Na contagem, conte em latas e pacotes, e confirme com um toque o que não
  mudou".

---

## 5 · Roteiro de navegador

Em 360 px e 1280 px, nos dois temas:

1. Leite condensado (395 g): abre em "emb"; digitar 7 mostra "7 embalagens de 395 g = 2,765 kg";
   trocar para "g" vira "2765".
2. Ovos (un): abre em "un"; o botão existe só se a embalagem tiver mais de um.
3. Trocar a unidade de uma linha, sair e voltar: ela abre como foi deixada.
4. Vinda da nota: a linha semeada abre em base com a soma de sempre.
5. "Igual" em Adesivo com logo: escreve 192, o rodapé conta 1; apagar volta a 0.
6. "Igual" não aparece em Amido de milho (fornada desde então) nem em Chocolate pó (nunca contada).
7. Salvar: o insumo grava em base; `/insumos` mostra 2,765 kg.

---

## Critérios de aceite

- [x] Embalagem e base alternam no campo, com conversão do número digitado.
- [x] g e ml abrem em embalagem; un em base; a escolha fica no aparelho por material.
- [x] "Igual" só na linha intocada com contagem válida e sem fornada desde então.
- [x] Nada muda na gravação: base, mesmo `writeBatch`, mesmos dois campos.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d329`, `#d330` e a nota no `#d59` escritos;
      `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **"Igual" é semente com um toque a mais.** Não é: semente é o default que ela não escolheu
  (`#d59`); o "Igual" exige um gesto por linha, e só existe onde o número velho ainda pode ser o
  da prateleira. Se o uso mostrar trinta "Iguais" em dez segundos, o atalho sai.
- **"emb", e não "lata" ou "pacote".** O sistema não sabe se é lata, pacote ou pote. O tamanho
  aparece no `aria-label` e na frase da consequência, que é onde ela confere.
- **Sem campo misto ("2 emb + 120 g").** Fração resolve a lata aberta sem dois campos por linha.

---

## Fora de escopo

- **Nome da embalagem** (lata, pacote, caixa) no cadastro do material: é schema, e é outra spec
  se o "emb" não bastar.
- **Leitor de código de barras e voz.** Material de confeitaria a granel quase nunca tem código
  útil, e reconhecimento de voz em PWA no iPhone não é confiável o bastante para número.
- **A irmã `/fichas/contagem`.**
