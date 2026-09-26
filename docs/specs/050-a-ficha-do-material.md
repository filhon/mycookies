# Spec 050 · A ficha do material

**Tipo:** tocar num material deixa de abrir o formulário e passa a abrir a ficha dele, para
ler: o que ele custa, **o preço de cada compra** (o histórico que o documento já guarda e
nenhuma tela mostra), **onde ele entra** e quanto pesa em cada produto, e a despensa. Editar
vira um botão dentro dela. A linha da lista ganha a variação da última compra. Duas funções
puras com teste, um componente. **Uma assinatura nova** (fichas vivas, já no cache de quem
abriu Produtos), **nenhum campo, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Materiais (2026-09-26).
**Depende de:** 049 (`custoDeReferencia`, para o histórico falar em quilo).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d222` e `#d223`.

---

## Problema

O `Insumo` guarda as **últimas doze compras** em `historicoPrecos`, com data, preço, embalagem
e fornecedor. O comentário do tipo diz por quê: "o gráfico 'preço da farinha subiu?' sai de
graça na mesma leitura". Nenhuma tela lê esse campo. A pergunta que o dado existe para
responder não tem onde ser feita.

A ficha técnica guarda `insumoIds` para responder, com uma consulta, "quais receitas usam este
material?". Hoje isso serve só para marcar fichas desatualizadas; a confeiteira nunca vê a
resposta. Ela não sabe quanto do custo do cookie de pistache é o creme de pistache de
R$ 109,50 o pote, nem em quantos produtos a manteiga entra.

E tocar numa linha abre direto "Editar material", com o campo de preço em foco de edição. Toda
consulta é uma edição em potencial: para saber quanto ainda tem de chocolate, ela abre um
formulário que pode mudar o custo de todos os produtos.

É aqui que as ferramentas de custo que se pagam por assinatura (MarketMan, Galley, meez, no
restaurante; Craftybase, no artesanato) concentram valor: o ingrediente tem uma página, com a
história do preço e a lista do que ele encarece. O Rende já tem os dois dados gravados.

---

## 1 · O que esta spec decide

### Tocar lê; editar é um botão: `#d222`

A página ganha o modo do painel: `"ver" | "editar"`. Tocar na linha abre o `Painel` em
`"ver"` com `FichaDoMaterial`; o rodapé do painel tem **"Editar material"** (primário do
painel, o único). Tocar nele troca o conteúdo do mesmo painel pelo `FormularioInsumo` que já
existe, sem fechar e reabrir. "Cancelar" no formulário de um material existente volta para a
ficha, não fecha. "Novo material" continua abrindo direto o formulário.

Arquivar continua dentro do formulário, onde está.

**`FichaDoMaterial`**, de cima para baixo:

```
Creme de pistache                                     Ingrediente · Pistache Brasil
─────────────────────────────────────────────────────────────────────────────
R$ 109,50 o pote de 1 kg
R$ 109,50 o quilo, sem perda                        (custo em heading, tabular)

O preço de cada compra
  12 set   R$ 109,50 · 1 kg    R$ 109,50 o quilo   ↗ subiu 9%    Atacadão
  03 ago   R$ 99,90 · 1 kg     R$ 99,90 o quilo
  preço médio da biblioteca    R$ 92,00 o quilo
  Subiu 19% desde a primeira compra, em 3 de agosto.

Onde entra                                               em 3 produtos
  Cookie de pistache         R$ 1,32 por unidade · 41% do custo      ›
  Brigadeiro de pistache     R$ 0,48 por unidade · 22% do custo      ›
  Caixa presente             R$ 0,48 por caixa   ·  6% do custo      ›

Na despensa
  360 g · contada há 3 dias · 1 fornada desde então, projetamos 240 g
```

- **O preço de cada compra**: `historicoPrecos` do mais novo ao mais velho, no máximo doze
  (é o teto gravado). Cada linha: data curta, preço e embalagem, o quilo (`custoDeReferencia`
  sobre `custoUnidadeBase`, **sem** perda, porque perda mudar não é o preço mudar), a variação
  para a compra anterior quando for de 1% ou mais, e o fornecedor quando houver.
- **A entrada da biblioteca não é compra dela.** Em material com `ehDaBiblioteca(id)`, a entrada
  mais velha é o preço de referência: vai rotulada "preço médio da biblioteca", sem variação, e
  **não entra** na frase do total nem na variação da linha da lista. Sem isso, a primeira compra
  real apareceria como "subiu 40%".
- **A frase do total** só com duas compras dela ou mais: "Subiu 19% desde a primeira compra, em
  3 de agosto." / "Caiu 6% …" / "O mesmo preço desde 3 de agosto." Com uma: "Uma compra
  registrada, em 3 de agosto. As próximas aparecem aqui."
- **Onde entra**: as fichas vivas com `insumoIds` contendo o id. Para cada uma, o custo deste
  material por unidade de rendimento, com o preço de hoje (`custoLinhaItem` com
  `custoUnidadeBaseCorrigido` atual ÷ `rendimento`), e a parte que isso é de `custoDeHoje(...)
.custoUnitario`. Ordem: maior parte primeiro. Toca e vai para `/fichas/{id}`. Nenhuma: "Ainda
  não entra em nenhum produto." sem ação.
- **Kit que usa o material só pelas receitas de dentro** não aparece (o kit não tem o id em
  `insumoIds`); a caixa e a fita do próprio kit aparecem, porque estão em `itens`.
- **Na despensa**: as mesmas frases da linha (`contagemDoInsumo`, `rotuloDeIdade`,
  `projecaoDoInsumo`), sem a regra do 049 de esconder a idade: aqui é o lugar dela.

### Histórico em lista, e a variação vai para a linha: `#d223`

**Sem gráfico.** Doze pontos no máximo, quase sempre dois ou três: uma lista com a variação
escrita diz mais que uma linha subindo, cabe no celular a meio metro e não pede dependência.
Se a conta passar a ter doze compras em quase todo material, o gráfico volta à mesa.

Na `LinhaInsumo`, ao lado do custo de referência, quando a **última compra dela** mudou o
quilo em 5% ou mais em relação à anterior dela:

```
Creme de pistache                        ↗ 9%   R$ 109,50 ›
```

Ícone `trending-up` / `trending-down` em `ink-muted`, o número, e em `sr-only` "subiu 9% na
última compra". Sem cor semântica: preço de material subir não é erro nem prejuízo, é
informação; a consequência mora nos produtos (e na 051). A marca já reservou `atencao` para
custo desatualizado, e usar a mesma cor para "subiu" diluiria o selo.

Funções puras novas, em `src/lib/domain/custoInsumo.ts`, com teste:

- `comprasDoInsumo(insumo)`: o histórico ordenado, a entrada da biblioteca marcada, a variação
  de cada compra e o resumo do total.
- `variacaoDaUltimaCompra(insumo): number | null`: o percentual, ou `null` com menos de duas
  compras dela.

E em `src/lib/domain/custoFicha.ts`:

- `usoDoMaterial(fichas, material, custos: Map<string, CustoDeHoje>)`: as linhas de "Onde entra".

---

## 2 · Antes de tocar em código

- A página não assina fichas hoje. Usar **a mesma consulta** de `ListaFichas`
  (`where("arquivado", "==", false)`) para cair no mesmo cache; o custo é uma leitura por ficha
  na primeira abertura sem cache, e zero depois.
- `custosDeHoje(fichas, dados)` já existe e é o que `/fichas` usa: calcular uma vez na página,
  com `useMemo`, e passar o mapa.
- Ler o `#d87` (projeção) e o `#d135` (custo de hoje) antes de escrever as frases.
- A ajudante vê tudo isso (`#d157`: o custo é dela também). Confirmar que ela lê fichas pelas
  regras atuais; se não ler, "Onde entra" some para ela e **nenhuma regra muda**.

---

## 3 · Escopo

- `src/lib/domain/custoInsumo.ts`: `comprasDoInsumo`, `variacaoDaUltimaCompra`, testes.
- `src/lib/domain/custoFicha.ts`: `usoDoMaterial`, teste.
- `src/components/insumos/FichaDoMaterial.tsx`, novo.
- `src/components/insumos/LinhaInsumo.tsx`: a variação.
- `src/components/insumos/FormularioInsumo.tsx`: "Cancelar" volta para a ficha quando há
  `aoVoltar`.
- `src/app/(app)/(coluna)/insumos/page.tsx`: a assinatura das fichas, `custosDeHoje`, o modo
  do painel.

---

## 4 · Roteiro de aparelho

1. Tocar em "Creme de pistache": abre a ficha, não o formulário; nenhum campo com foco.
2. "Editar material" troca o conteúdo sem piscar o painel; "Cancelar" volta para a ficha.
3. Material da biblioteca com uma compra dela: a linha da biblioteca rotulada, nenhuma
   variação contra ela, na lista e na ficha.
4. "Onde entra" soma com o que `/fichas/{id}` mostra de custo (a parte bate com a composição
   do editor, arredondada).
5. Sem rede, com Produtos já aberto antes: a ficha abre inteira do cache.
6. Leitor de tela: cada compra é uma frase ("12 de setembro, 109 reais e 50, um quilo, subiu
   9%, Atacadão").

---

## Critérios de aceite

- [ ] Tocar abre a ficha; editar é o botão do rodapé; o painel não fecha na troca.
- [ ] Histórico do mais novo ao mais velho, quilo sem perda, variação, fornecedor.
- [ ] A entrada da biblioteca rotulada e fora de toda variação.
- [ ] "Onde entra" com custo por unidade e parte do custo, maior primeiro, tocável.
- [ ] Variação de 5% ou mais na linha, com ícone e texto, sem cor semântica.
- [ ] Funções puras com teste; `domain/` sem Firebase nem React.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d222` e `#d223` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Quanto o preço novo muda os produtos**, antes de salvar: é a 051.
- **Comparar fornecedores** ("no Atacadão sai 8% mais barato"). O histórico tem o fornecedor,
  mas doze compras de um material raramente têm dois fornecedores; esperar a conta mostrar o
  dado.
- **Gráfico do preço.** Ver `#d223`.
- **Valor parado na despensa** (estoque × custo). É o número de relatório dos sistemas de
  estoque de restaurante; para quem compra por semana, não muda decisão nenhuma.
- **Limiar de estoque mínimo por material.** Saiu de propósito (comentário da `LinhaInsumo`):
  vinte palpites a manter. A lista de compras já sabe o que falta pelos pedidos.
