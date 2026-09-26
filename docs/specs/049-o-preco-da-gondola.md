# Spec 049 · O preço da gôndola

**Tipo:** a linha do material passa a dizer o custo no número que a confeiteira lê no mercado
(o quilo, o litro, a unidade), o arredondamento do custo unitário para de errar em até 33%, a
linha para de repetir a idade da contagem quando ela não diz nada, e a tela conta quantos
materiais ainda estão com o preço médio da biblioteca. **Nenhum campo, nenhuma consulta,
nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Materiais com `/impeccable` e `/frontend-design` (2026-09-26), a
partir dos prints de desktop e de celular com as 35 linhas da conta da Maynara.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d220` e `#d221`.

---

## Problema

Nos prints, a coluna da direita (o número de maior peso na linha) diz:

| Material         | Compra          | A linha mostra | O custo real   |
| ---------------- | --------------- | -------------- | -------------- |
| Açúcar cristal   | R$ 3,59 · 1 kg  | R$ 0,0036 /g   | R$ 0,00359 /g  |
| Creme de leite   | R$ 2,99 · 200 g | R$ 0,01 /g     | R$ 0,01495 /g  |
| Leite condensado | R$ 6,69 · 395 g | R$ 0,02 /g     | R$ 0,01694 /g  |
| Farinha de trigo | R$ 3,75 · 2 kg  | R$ 0,0019 /g   | R$ 0,001875 /g |

Três problemas no mesmo número:

1. **Ninguém pensa em reais por grama.** A confeiteira compara farinha na gôndola pelo preço do
   quilo que a etiqueta já traz. "R$ 0,0036 por g" é o número do motor de custo, não o dela: é
   a tela falando a língua do software (`CLAUDE.md`, UI).
2. **O arredondamento mente.** `formatarCustoUnitario` usa quatro casas abaixo de um centavo e
   duas acima. Entre R$ 0,01 e R$ 0,10 por grama, a faixa de quase todo laticínio, chocolate e
   creme, o erro chega a 33% (creme de leite: R$ 0,01 mostrado, R$ 0,015 real). A marca é "a
   balança da bancada"; balança que arredonda um terço não é confiável.
3. **A coluna não alinha.** "R$ 0,0036" e "R$ 0,30" têm larguras diferentes na mesma coluna
   tabular; no desktop se vê a coluna serrilhada.

E duas coisas em volta dele:

- **A terceira linha repete a mesma frase 25 vezes.** "contada há 3 dias" aparece em quase toda
  linha. Uma contagem fresca não pede decisão; repetida, vira o cinza uniforme da planilha que o
  `PRODUCT.md` lista como anti-referência.
- **O selo "Preço médio" é invisível em conjunto.** Um material da biblioteca que nunca teve o
  preço trocado está custando os produtos com o preço de referência, não com o dela. A tela
  mostra isso linha a linha, mas nunca diz quantos são, e é o maior erro de custo que a conta
  pode ter no primeiro mês.

---

## 1 · O que esta spec decide

### O custo da linha é o do quilo, do litro ou da unidade: `#d220`

Função pura nova em `src/lib/domain/unidades.ts`:

```ts
custoDeReferencia(custoPorBase: number, unidadeBase: UnidadeBase):
  { centavos: number; rotulo: "o quilo" | "o litro" | "a unidade" }
```

`g` multiplica por 1000 e vira "o quilo"; `ml` multiplica por 1000 e vira "o litro"; `un` fica
e vira "a unidade". Entra `custoUnidadeBaseCorrigido`, o custo com a perda, que é o que o
produto paga.

Na `LinhaInsumo`:

```
Creme de leite                                   R$ 14,95 ›
R$ 2,99 · 200 g                                   o quilo
180 g na despensa
```

- O valor em `formatarMoeda` quando a referência é quilo ou litro (multiplicado por 1000, ele
  sempre tem centavos inteiros significativos) e em `formatarCustoUnitario` quando é unidade
  (luva a R$ 0,0875 continua precisando de casas).
- O rótulo embaixo, em `micro`, no lugar do "por g".
- Com perda maior que zero, o custo do quilo já é o corrigido, e a linha do meio continua
  dizendo "· 10% de perda": os dois números conversam.

**O custo por grama não some do produto.** Ele continua no `ResumoCusto` do formulário e no
detalhe do item em `FormularioFicha`, onde a conta é "quantos gramas × quanto o grama": ali ele
é o número certo. A linha da lista é lida no mercado; o formulário, na bancada.

### O custo unitário tem dois dígitos que importam: `#d221`

`formatarCustoUnitario` passa a escolher as casas pelo tamanho do número, com **no mínimo dois
dígitos significativos** e no mínimo duas casas:

| Entrada (reais) | Hoje      | Depois    |
| --------------- | --------- | --------- |
| 0,00359         | R$ 0,0036 | R$ 0,0036 |
| 0,01495         | R$ 0,01   | R$ 0,015  |
| 0,02995         | R$ 0,03   | R$ 0,030  |
| 0,0875          | R$ 0,09   | R$ 0,088  |
| 0,60            | R$ 0,60   | R$ 0,60   |
| 12,5            | R$ 12,50  | R$ 12,50  |

Erro relativo máximo de 5%. Os quatro chamadores (`LinhaInsumo`, `ResumoCusto`,
`FormularioFicha`, `CartaoLinhaNota`) ganham a correção de graça. Teste com a tabela acima em
`tests/domain/`.

### A idade da contagem só aparece quando conta

Na terceira linha da `LinhaInsumo`:

- `FRESCA` (até 7 dias): só "180 g na despensa". A idade sai.
- `ENVELHECENDO`: "180 g na despensa · contada há 12 dias", como hoje.
- `VENCIDA`: como hoje, com o selo "Contagem vencida".
- `NUNCA`: "nunca contada", como hoje.
- A projeção do forno ("2 fornadas desde então · projetamos 120 g") não muda.

A regra de frescor não muda (`IDADE_FRESCA_DIAS`, `domain/estoque.ts`); só a frase.

### A tela conta os preços médios

Quando `dados.filter(temPrecoMedio).length > 0`, uma faixa informativa entre as pílulas e a
contagem, no padrão de `AvisoLeituraSemRede` (ícone `info`, frase, ação em texto):

> ⓘ 9 materiais ainda estão com o preço médio da biblioteca. Com o que você paga, o custo dos
> seus produtos fica seu. **Mostrar esses**

"Mostrar esses" põe a lista num filtro que não é pílula (`filtro === "PRECO_MEDIO"`), e a linha
da contagem vira "9 com preço médio · **Ver todos**". Busca continua funcionando dentro dele.
A faixa some quando o número chega a zero; com um só, "1 material ainda está…".

---

## 2 · Antes de tocar em código

- Conferir se `formatarCustoUnitario` tem teste hoje; se tem, a tabela acima substitui os
  casos que mudarem, e a mudança vai registrada no `#d221`.
- Conferir no `CartaoLinhaNota` se "por g" continua fazendo sentido ali (é a leitura da nota, a
  mesma situação do formulário): não mudar o rótulo, só o arredondamento.
- Ler `temPrecoMedio` e o `#d` que o criou: o critério (biblioteca e no máximo uma entrada no
  histórico) é o que a faixa conta. Não inventar outro.

---

## 3 · Escopo

- `src/lib/domain/unidades.ts`: `custoDeReferencia`, com teste.
- `src/lib/domain/money.ts`: `formatarCustoUnitario` com dígitos significativos, com teste.
- `src/components/insumos/LinhaInsumo.tsx`: o custo de referência e a idade condicional.
- `src/app/(app)/(coluna)/insumos/page.tsx`: a faixa, o filtro `PRECO_MEDIO`, a linha da contagem.

---

## 4 · Roteiro de aparelho

1. Celular, a lista da conta da Maynara: "Creme de leite" mostra R$ 14,95 o quilo; "Ovos"
   mostra R$ 0,60 a unidade; a coluna da direita alinha.
2. Um material contado hoje não mostra idade; um de 14 dias mostra.
3. Com a conta de exemplo (biblioteca intocada), a faixa conta todos; trocar o preço de um e
   voltar: o número desce um.
4. Leitor de tela lê "catorze reais e noventa e cinco, o quilo" na mesma frase.
5. Tema escuro: a faixa informativa com o par `info` / `info-bg` do `DESIGN.md`.

---

## Critérios de aceite

- [x] Linha com o custo do quilo, do litro ou da unidade, com a perda.
- [x] `formatarCustoUnitario` com erro relativo de no máximo 5%, testado.
- [x] Idade da contagem só fora de `FRESCA`.
- [x] Faixa do preço médio com contagem e filtro; some em zero.
- [x] Nenhuma consulta nova, nenhum campo novo.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d220` e `#d221` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Variação de preço na linha** ("subiu 12%"): precisa do histórico lido, é da 050.
- **Ordenar a lista**: é da 052.
- **"Contar a despensa" em Materiais.** Continua em Compras, pelo motivo escrito em
  `EntradaContagem`: contar é ato de compra, e o cabeçalho daqui já tem duas ações.
- **Escolher a unidade de referência** (ver o chocolate "por 100 g"). Quilo, litro e unidade
  são o que a etiqueta da gôndola usa; configuração para isso seria um palpite a manter.
