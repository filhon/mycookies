# Spec 052 · A mesa dos materiais

**Tipo:** no desktop, a lista de materiais vira tabela, como a de produtos, com a ficha do
material (050) em coluna acoplada à direita. Nos dois tamanhos, a lista ganha ordem além do
alfabeto. **Nenhum campo, nenhuma consulta nova, nenhuma regra, nenhuma dependência.** Uma rota
muda de grupo.
**Tamanho:** uma sessão.
**Origem:** crítica da tela Materiais (2026-09-26).
**Depende de:** 049, 050 e 051 entregues e com roteiro rodado. É a última da série e a de
menor retorno: se o roteiro da 050 mostrar que o painel lateral basta no desktop, a parte da
tabela cai e fica só a ordem.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d225` e `#d226`.

---

## Problema

**Desktop.** No print, a lista ocupa a coluna de leitura de 1024px e cada linha tem o nome à
esquerda, o custo à direita e um vão no meio. É o arranjo do celular esticado. O contexto 4 do
`PRODUCT.md` ("noite, planejando, sentada, com calma") é onde ela compara materiais, e é
exatamente o caso que o `#d129` e o `#d130` resolveram em Produtos: a lista cujos números se
comparam vira tabela e sai da coluna, e o detalhe fica acoplado, sem cobrir a lista.

**Ordem.** 35 materiais em ordem alfabética, sem outra forma de olhar. Depois da 050 a lista
sabe três coisas que o alfabeto esconde: qual preço mudou por último, em quantos produtos cada
um entra e quanto pesa. A pergunta da noite é "o que ficou mais caro?", e hoje ela rola 35
linhas para responder.

---

## 1 · O que esta spec decide

### No desktop, tabela e ficha acoplada: `#d225`

A partir de `lg`, a mesma `<li>` da `LinhaInsumo` vira grade, no padrão de `LinhaFicha`
(`COLUNAS_FICHA`, cabeçalho em `micro` 600 caixa alta `aria-hidden`, rótulo de cada célula em
`sr-only`):

| Material            | Compra           | O quilo   | Última compra | Despensa  | Entra em   |
| ------------------- | ---------------- | --------- | ------------- | --------- | ---------- |
| Creme de pistache   | R$ 109,50 · 1 kg | R$ 109,50 | 12 set · ↗ 9% | 360 g     | 3 produtos |
| Ingrediente · marca |                  |           |               | há 3 dias |            |

- "O quilo" é o `custoDeReferencia` (049), com o rótulo da unidade na própria célula quando não
  for quilo ("R$ 0,60 a unidade").
- "Última compra" é `ultimaCompraEm` e a variação da 050.
- Clique na linha abre a `FichaDoMaterial` em coluna acoplada à direita (o mesmo arranjo de
  `PainelProduto` em `/fichas`), com a linha selecionada em `surface-sunken`. Abaixo de `lg`,
  continua o `Painel` (folha inferior).
- Para sair da coluna de leitura, `/insumos/page.tsx` sai do grupo `(coluna)` para
  `src/app/(app)/insumos/page.tsx`, como `/fichas`. `contagem/` e `nota/` **ficam** em
  `(coluna)`: são formulário e leitura. Conferir no `build` que os dois grupos convivem no
  mesmo segmento; se o Next reclamar, as duas rotas filhas mudam junto e continuam na coluna
  pelo próprio layout.

### A lista tem ordem: `#d226`

Um `Seletor` compacto na linha da contagem ("35 materiais", à esquerda do selo de
sincronização), rótulo "Ordem", três opções:

- **Pelo nome** (padrão, a de hoje).
- **Preço mudou por último**: `ultimaCompraEm` descendente, só compras dela (a entrada da
  biblioteca não conta, como na 050).
- **Pesa mais nos produtos**: a soma, pelos produtos em que entra, da parte do custo (a
  `usoDoMaterial` da 050), descendente. Material sem uso vai para o fim, por nome.

A ordem fica guardada no aparelho (`localStorage`, dentro de `try/catch`, ausência = "pelo
nome"). A ordenação é pura: `ordenarMateriais(insumos, ordem, uso)` em
`src/lib/domain/custoInsumo.ts`, com teste.

No celular o seletor abre a folha inferior, como todo `Seletor` (`DESIGN.md`).

---

## 2 · Antes de tocar em código

- Reler `ListaFichas` e `LinhaFicha` inteiros: a grade, o `lg:` que decide entre painel e
  coluna, e o `#d130`. Copiar o padrão, não inventar um segundo.
- "Pesa mais" soma partes percentuais de produtos diferentes. É uma ordem, não um número: não
  mostrar a soma em lugar nenhum.

---

## 3 · Escopo

- `src/lib/domain/custoInsumo.ts`: `ordenarMateriais`, com teste.
- `src/components/insumos/LinhaInsumo.tsx`: a grade de `lg`.
- `src/app/(app)/insumos/page.tsx` (movido): a coluna acoplada e o seletor de ordem.

---

## 4 · Roteiro de aparelho

1. Desktop 1440px: a tabela ocupa a largura; clicar abre a ficha à direita sem cobrir a lista;
   outra linha troca a ficha.
2. Desktop 1024px: a tabela e a ficha cabem sem rolagem horizontal.
3. "Preço mudou por último": o material editado agora vai para o topo.
4. Recarregar: a ordem continua. Janela anônima: "pelo nome".
5. Celular: nada mudou além do seletor.

---

## Critérios de aceite

- [ ] Tabela a partir de `lg`, no padrão de `LinhaFicha`, com `sr-only` por célula.
- [ ] Ficha do material acoplada no desktop; folha inferior abaixo de `lg`.
- [ ] Três ordens, a escolhida guardada no aparelho, `ordenarMateriais` testada.
- [ ] `/insumos/contagem` e `/insumos/nota` continuam funcionando e na coluna.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d225` e `#d226` escritos; `ESTADO.md` e `DESIGN.md` (a tabela de materiais na regra
      de "Tabela") atualizados.

---

## 5 · Fora de escopo

- **Editar o preço direto na célula da tabela.** Tentador no desktop, mas pula o bloco da 051,
  que é o que faz o preço novo mostrar a consequência.
- **Colunas configuráveis, exportar para planilha.** A planilha é a anti-referência.
- **Selecionar vários e arquivar em lote.** Ninguém pediu; arquivar é raro.
