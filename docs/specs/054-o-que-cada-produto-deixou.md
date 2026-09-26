# Spec 054 · O que cada produto deixou

**Tipo:** a lista de produtos passa a dizer, ao lado da sobra por unidade, quanto cada produto
vendeu e deixou no mês, e ganha ordem além do alfabeto. No desktop, as colunas trocam: sai o que
é ficha de receita (rende) e o que obriga a subtrair de cabeça (sugerido ao lado de praticado),
entra a margem e o mês. No celular, a sobra sai do `micro`. A seta de "hoje" só aparece quando a
diferença vale uma olhada. **Nenhum campo, nenhuma regra, nenhuma dependência; uma leitura de
documento que o app já faz em outras telas.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Produtos (2026-09-26).
**Depende de:** 053 entregue. Sem ela, o "deixou no mês" dos kits é o número inflado.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d228`, `#d229` e `#d230`.

---

## Problema

**A coluna que mais pesa não compara.** A tabela tem seis colunas de número e a de maior peso é
"Sobra" por unidade. Ela responde "quanto cobrar", e responde bem. Mas a pergunta da noite
(contexto 4 do `PRODUCT.md`) é outra: **qual produto me sustenta?** R$ 35 de um combo e R$ 1,70
de um mini lado a lado dizem que o combo é 20 vezes melhor, e isso só é verdade se ela vender os
dois no mesmo ritmo. O `ResumoMensal.produtos` já guarda, por ficha, `quantidade`, `receita` e
`lucro` do mês. O Caixa lê. A tela onde ela decide o preço não.

É o que as ferramentas de custo de cardápio pagas chamam de engenharia de cardápio (a matriz
popularidade × margem do Toast, do Square, do MarketMan, do meez): o preço por unidade sozinho
esconde onde está o dinheiro. O Rende já tem as duas metades e não as põe lado a lado.

**Duas colunas que não ganham o lugar.**

- **Rende** é fato da receita, não número que se compara entre produtos. Mora no painel e no
  editor.
- **Sugerido** ao lado de **Praticado** obriga a subtrair. No print, todo praticado está acima do
  sugerido, e a coluna inteira não diz nada. O que importa é a exceção: praticado **abaixo** do
  sugerido.

**Sem ordem.** 12 produtos em ordem alfabética (`orderBy("nomeBusca")`). A 052 deu três ordens
aos materiais; os produtos ficaram sem nenhuma.

**No celular, o dado que responde é o menor da linha.** A sobra está em `text-micro` (12px),
abaixo do preço em corpo. O `DESIGN.md` é explícito: "Dinheiro nunca aparece em fonte de rótulo
nem em `micro`: é o dado que a usuária veio buscar." Nos combos, a seta ainda espreme o "rende" até
"rende 2…".

**A seta que diz três centavos.** Nos três combos, "R$ 35,12 → R$ 35,09". O `#d136` decidiu que a
linha mostra toda diferença. O print mostra o custo: um quarto da tabela diz "mudou" sobre 0,1%,
e ela aprende a não olhar a seta, inclusive no dia em que ela importar.

---

## 1 · O que esta spec decide

### As colunas do desktop: `#d228`

(Vendeu e Deixou ilustrativos; os outros números são os do print.)

| Produto          | Custo/un | Preço    | Sobra/un | Vendeu | Deixou    |
| ---------------- | -------- | -------- | -------- | ------ | --------- |
| Cookie Oreo 120g | R$ 6,20  | R$ 13,00 | R$ 6,80  | 41     | R$ 278,80 |
| (produção, 055)  |          |          | 52%      |        |           |

- **Preço** é o praticado. Só quando ele está abaixo do sugerido, uma segunda linha em
  `attention` com `TriangleAlert`: "sugerido R$ 9,54". Acima, silêncio.
- **Sobra/un** leva a margem embaixo, em `label` `ink-muted` ("52%"), a partir de
  `precificacao.margemReal`. Percentual sempre com os reais ao lado, como manda o `DESIGN.md`.
- **Vendeu** e **Deixou** vêm do `ResumoMensal` do mês corrente (`docResumoMensal` +
  `useDocumento`, como a `FaixaDoTeste`). Sem venda no mês, "—" em `ink-subtle`. "Deixou" com
  sinal, cor e `trending-down` quando negativo, como toda sobra.
- A linha da contagem nomeia o mês: "12 produtos · vendas de setembro".
- `COLUNAS_FICHA` continua o único dono da proporção. Com o `PainelProduto` aberto entre `lg` e
  `xl`, a linha volta ao arranjo do celular, como em Materiais (`#d225`): seis colunas não cabem
  em 1024px com o painel, e hoje já não cabem.

### A linha do celular

- Em cima: nome e preço (como hoje).
- No meio: "custa R$ 6,20 · **sobram R$ 6,80** (52%)" em `label`, com a sobra em `ink` 600 e o
  sinal do prejuízo como hoje. Some o "rende N unidades" (vai para o editor).
- Embaixo, só com venda no mês: "vendeu 41 · deixou R$ 278,80".
- Kit: o selo "Kit" entra na linha do nome, depois do nome, e não num andar próprio.

### A lista tem ordem: `#d229`

Um `Seletor` "Ordem" na linha da contagem, o mesmo de `/insumos` (`#d226`), com:

- **Pelo nome** (padrão).
- **Deixou mais no mês**: `lucro` do resumo, maior primeiro; sem venda vai para o fim, por nome.
- **Sobra por unidade**: maior primeiro.
- **Margem**: `margemReal`, maior primeiro.

Guardada no aparelho (`rende:ordem-produtos`), lida como em `/insumos`. `ordenarFichas(fichas,
ordem, produtosDoMes)` em `custoFicha.ts`, pura, com teste. A ordem vale com busca e filtro.

### A seta só quando vale: `#d230`

Revê a metade do `#d136` que fala da linha. A seta "gravado → hoje" aparece quando:

- o sinal cruza o zero, **ou**
- `|hoje − gravado| ≥ max(R$ 0,10, 2% do preço praticado)`.

Abaixo disso, a linha mostra a sobra de hoje sem seta, e o selo "Custo desatualizado" continua
dizendo que o gravado envelheceu. O painel do produto e o cartão da Hoje não mudam.
`sobraMudouDeVerdade(gravado, hoje, preco)` em `custoFicha.ts`, com teste.

---

## 2 · Antes de tocar em código

- Reler `#d129`, `#d130`, `#d135`, `#d136`, `#d225` e `#d226` inteiros.
- `useDocumento` do resumo: é uma leitura, em cache, a mesma chave que a Hoje e o Caixa já
  abrem. Não criar hook novo.
- O resumo guarda por `fichaId`. Produto renomeado continua casando pelo id; o `nome` do resumo
  não é usado aqui.
- Conferir que o leitor de tela ouve cada célula com o rótulo (`sr-only`): "vendeu 41 no mês",
  "deixou R$ 278,80 no mês".

---

## 3 · Escopo

- `src/lib/domain/custoFicha.ts`: `ordenarFichas`, `sobraMudouDeVerdade`, com teste.
- `src/components/fichas/LinhaFicha.tsx`: colunas, linha do celular, seta.
- `src/components/fichas/ListaFichas.tsx`: o resumo do mês, o seletor, o cabeçalho das colunas,
  o arranjo com o painel aberto.

---

## 4 · Roteiro de aparelho

1. Desktop 1440px: seis colunas; "Vendeu" e "Deixou" batem com o ranking do Caixa do mesmo mês.
2. Ordem "Deixou mais no mês": o primeiro é o primeiro do Caixa por lucro.
3. Um produto com preço abaixo do sugerido mostra a segunda linha em atenção; os outros não.
4. Combos depois da 053: sem seta de três centavos.
5. Desktop 1024px com o painel aberto: linhas no arranjo do celular, sem rolagem horizontal.
6. Celular 360px: a sobra lê a meio metro; nenhuma linha trunca o custo.
7. Recarregar: a ordem continua. Janela anônima: "pelo nome".

---

## Critérios de aceite

- [ ] Colunas Produto · Custo/un · Preço · Sobra/un (com margem) · Vendeu · Deixou.
- [ ] Sugerido só quando o praticado está abaixo dele, com ícone e palavra.
- [ ] Sobra do celular em `label` 600, nunca `micro`.
- [ ] Quatro ordens, guardadas no aparelho, `ordenarFichas` testada.
- [ ] Seta com limiar, `sobraMudouDeVerdade` testada.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d228` a `#d230` escritos; `ESTADO.md` e a regra "Tabela" do `DESIGN.md` atualizados.

---

## 5 · Fora de escopo

- **Ordenar clicando no cabeçalho da coluna.** Um mecanismo só, o mesmo de Materiais. Se o
  roteiro mostrar que ela procura o clique no cabeçalho, vira spec própria para as duas tabelas.
- **Período além do mês corrente.** O resumo é mensal; "últimos 30 dias" exigiria duas leituras e
  uma soma que não bate com o Caixa.
- **Editar o preço na célula.** Pula o painel de preço, que é onde o preço mostra a consequência.
- **Foto do produto na linha.** `fotoUrl` existe, mas quatro sabores em dois tamanhos têm a mesma
  cara; o nome distingue melhor.
