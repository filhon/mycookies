# Spec 135 · O que pesa no custo

**Tipo:** cada material da receita mostra a parte dele no custo dos materiais, o bloco diz em uma
frase quais dois ou três pesam mais, e a receita diz quanto pesa a massa e quanto dá por unidade.
Aritmética nova em `src/lib/domain/`, com teste. Nenhum schema, nenhuma regra, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, itens 3 e 4.
**Depende de:** 134 (a grade de colunas no desktop).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d340`.

---

## Problema

O Cookie Cacau com Nutella tem quinze materiais. A Nutella sozinha é R$ 21,12 de R$ 53,44, quase
40%; Nutella e chocolate meio amargo juntos passam da metade. A tela mostra isso como dois números
entre quinze, na mesma tinta e no mesmo peso que os R$ 0,09 do papel manteiga. Para ver o que pesa
ela precisa somar de cabeça, que é exatamente a planilha de onde ela saiu.

Meez, Galley e CostBrain mostram a porcentagem de cada ingrediente no custo e ordenam ou destacam o
que mais pesa. É a pergunta que vem antes de mexer no preço: "o que eu troco?".

O segundo número que falta é o peso. O nome do produto diz "120g". A receita soma 1.826 g fora os
ovos e a essência, e rende 16: ≈ 114 g por cookie de massa, que com os dois ovos fecha nos 120.
Hoje essa conta não existe em lugar nenhum, e é ela que diz se a porção está certa e se o
rendimento de 16 é verdade. Meez e Galley calculam o rendimento por peso para isso.

---

## 1 · O que esta spec decide: `#d340`

### 1.1 A parte de cada material

- `src/lib/domain/custoFicha.ts` ganha `parteDoCusto(itens): Map<insumoId, number>`: o custo da
  linha sobre a soma de **materiais + embalagem** (não sobre o lote inteiro: a hora dela não é
  ingrediente, e "Nutella é 20% do lote" esconde a pergunta). Percentual inteiro, arredondado; a
  soma pode não dar 100, e tudo bem.
- Na linha: um **traço de 4px** sob o nome, de largura proporcional, `--border-strong` na trilha e
  `--brand-as-ink` no preenchimento (`DESIGN.md` § Seção no papel: "medida de linha é traço de 4px
  sob o nome, nunca fundo da linha inteira"). Ao lado do custo, "40%" em `label` `--ink-muted`
  tabular.
- No desktop, a quarta coluna da grade da 134: **Parte**.
- Kit: a parte vale para componentes e embalagem do mesmo jeito.

### 1.2 A frase do bloco

Logo abaixo da busca, antes da lista, quando a receita tem 4 ou mais materiais:

- "**Nutella** e **chocolate meio amargo** são 55% dos materiais." (os que somam ≥ 50%, no máximo
  três; se um só passa de 50%, só ele).
- Sem ícone, sem tom: é informação, não aviso. O nome é texto, não link (o link para Materiais já
  existe na faixa do preço médio).

### 1.3 O peso da massa

- `pesoDaMassa(itens, rendimento)` em `custoFicha.ts`: soma os itens com unidade base `g` que
  **não** são embalagem; devolve `{ gramas, porUnidade, semPeso: nomes[] }`, em que `semPeso` são
  os itens em `ml` ou `un` (não se inventa densidade nem peso de ovo).
- Mostra no bloco "A receita", embaixo de "Rende", como `dica` do campo, só quando
  `unidadeRendimento` é `un` ou `porcao` e há pelo menos um item em gramas:
  "A massa pesa 1.826 g, fora 2 ovos e 5 ml de essência de baunilha: ≈ 114 g por unidade antes do
  forno."
- `semPeso` com mais de dois nomes vira "fora ovos e mais 2". Embalagem nunca entra na frase.

---

## 2 · Testes

- `parteDoCusto`: o caso do print (Nutella 40%, papel manteiga 0%), lista vazia, custo zero.
- `pesoDaMassa`: o caso do print (1.826 g, 114 g, `semPeso` = ovos e essência), receita só em
  `un`, embalagem em `g` fora da soma, rendimento zero.

---

## 3 · Escopo

- `custoFicha.ts` e o teste.
- `LinhaItemFicha.tsx`: o traço, a porcentagem, a quarta coluna.
- `FormularioFicha.tsx`: a frase do bloco, a dica do "Rende".
- `DECISOES.md`: `#d340` (por que materiais + embalagem e não o lote; por que ml não vira grama).
- `novidades.ts`: "Cada material mostra quanto pesa no custo do produto".

---

## 4 · Roteiro de navegador

360 e 1920 px, dois temas:

1. Cookie Cacau com Nutella: Nutella com o traço mais longo e "40%"; frase "Nutella e chocolate
   meio amargo são 55% dos materiais."; dica "1.826 g … ≈ 114 g por unidade".
2. Trocar Nutella para 160 g: traço, porcentagem e frase mudam ao digitar.
3. Kit: a parte nos componentes, sem frase de peso.

---

## Critérios de aceite

- [ ] Toda linha com traço e porcentagem; a quarta coluna no desktop.
- [ ] A frase dos que mais pesam, só com 4+ materiais.
- [ ] O peso da massa sem inventar densidade.
- [ ] Testes novos passam; portão de conclusão passa; `#d340`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Ordenar a lista pelo custo.** A frase responde; a ordem da receita é a ordem em que ela pesa.
- **Sugerir substituto mais barato.** Decidir é dela.
- **Peso por densidade (ml → g) e peso médio do ovo.** Número inventado com cara de certo.
- **Perda de peso no forno.** Pede um campo novo; esperar ela perguntar.
