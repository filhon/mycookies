# Spec 055 · O que falta pra fazer

**Tipo:** a falta de material deixa de ser repetida em cada linha e vira uma faixa só, acima da
lista, com a saída para a lista de compras. A linha de produção de cada produto encolhe para uma
linha curta, e o detalhe vai para o painel e o editor. **Nenhum campo, nenhuma consulta, nenhuma
regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Produtos (2026-09-26).
**Depende de:** 053 (a concordância "1 unidade"). Independente da 054; se as duas rodarem, a 054
primeiro, porque mexe na mesma linha.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d231`.

---

## Problema

**Alarme repetido.** No print do celular, 6 das 12 linhas têm uma frase em ocre com triângulo:
"não dá nem uma fornada · falta Biscoito Oreo". Quatro materiais explicam todas: Biscoito Oreo
(2 produtos), Cream cheese (2), Creme de pistache (1) e Amido de milho (1). A tela diz a mesma
coisa seis vezes, e a cor de atenção cobre metade da lista. O `PRODUCT.md` pede "honesta
sobre o que não sabe", não "alarmista"; e um alarme em toda linha para de ser alarme.

**A falta não leva a lugar nenhum.** A resposta a "falta Biscoito Oreo" é comprar Biscoito Oreo, e
isso mora em `/compras`. Daqui não há caminho: a linha inteira é link para o produto.

**A linha muda de altura.** No desktop, a célula do produto carrega até três andares ("7 unidades
prontas · contada há 7 dias", "dá para 1 fornada · 21 unidades · Amido de milho acaba primeiro"),
e em 1864px de largura ainda quebra em "primeiro" sozinho. As linhas variam de uma a quatro
alturas, e os números das outras colunas flutuam no meio de cada uma. É o ruído que faz a tabela
parecer planilha.

O que o Rende tem aqui é raro: nenhuma ferramenta de custo de cardápio diz "dá 1 fornada com o
que tem na despensa". O dado é forte; a apresentação dilui.

---

## 1 · O que esta spec decide

### A falta é uma faixa, e a linha diz uma coisa só: `#d231`

**A faixa.** Acima da lista, abaixo da linha da contagem, a "Faixa de aviso" do `DESIGN.md`
(atenção, ícone + frase + ação em texto), só quando há produto com `fornadas === 0` e `gargalo`
conhecido:

> ⚠ **6 produtos param por falta de 4 materiais:** Biscoito Oreo, Cream cheese, Creme de
> pistache e Amido de milho. **Ver o que comprar**

- A ação leva a `/compras`.
- Mais de quatro materiais: `listarNomes` com "e mais N", que já existe.
- A faixa respeita busca e filtro: conta o que está visível.
- `faltasDaLista(capacidades)` em `producao.ts`, pura, com teste: `{ produtos: number;
materiais: string[] }`, materiais sem repetição, na ordem de quantos produtos cada um trava.
- O aviso "Quantas fornadas dá sai da contagem…" (material sem contagem) continua onde está; os
  dois não se fundem, porque um pede compra e o outro pede contagem.

**A linha.** Uma linha só de produção, no celular e no desktop, sem quebra:

| Situação            | Hoje                                                          | Depois                   |
| ------------------- | ------------------------------------------------------------- | ------------------------ |
| pronto e capacidade | 7 unidades prontas · contada há 7 dias / dá para 1 fornada ·… | 7 prontas · dá 1 fornada |
| só capacidade       | dá para 1 fornada · 18 unidades · Creme de pistache acaba…    | dá 1 fornada             |
| sem fornada         | ⚠ não dá nem uma fornada · falta Biscoito Oreo                | ⚠ falta Biscoito Oreo    |

- "falta X" leva o triângulo em `attention`, e o texto em `ink-muted`: a palavra "falta" e o
  ícone carregam o sentido, a faixa acima carrega o peso. Cor nunca sozinha.
- A idade da contagem, as unidades da fornada e o "acaba primeiro" saem da lista. Continuam no
  editor (`FormularioFicha` já usa `FraseDaCapacidade`) e entram no `PainelProduto` do desktop,
  numa seção "Pra produzir" com as duas frases inteiras, entre o cabeçalho e "O custo do lote".
- A forma curta é uma prop de `FraseDaCapacidade`/`FraseDoPronto` (`curta`), e não um terceiro
  componente.

---

## 2 · Antes de tocar em código

- Reler `#d93` e `#d94` sobre a frase da capacidade, e o `CartaoComprasHoje`, que já
  resume faltas na tela Hoje: copiar a palavra de lá se couber.
- Conferir que `/compras` inclui a demanda do piso (`fichasAbaixoDoPiso`); se o produto sem piso
  não entra na lista, a ação diz "Abrir a lista de compras" e não promete que o material está nela.

---

## 3 · Escopo

- `src/lib/domain/producao.ts`: `faltasDaLista`, com teste.
- `src/components/producao/FraseDaCapacidade.tsx`: a forma curta.
- `src/components/fichas/ListaFichas.tsx`: a faixa.
- `src/components/fichas/LinhaFicha.tsx`: a linha curta.
- `src/components/fichas/PainelProduto.tsx`: a seção "Pra produzir".

---

## 4 · Roteiro de aparelho

1. Conta da Maynara, celular: uma faixa em cima ("6 produtos… 4 materiais"), nenhuma frase ocre
   inteira nas linhas.
2. "Ver o que comprar" abre `/compras` com Biscoito Oreo lá.
3. Buscar "mini": a faixa passa a contar só os minis.
4. Desktop 1440px: todas as linhas da tabela com a mesma altura, ou no máximo duas.
5. Clicar num cookie: o painel mostra "contada há 7 dias" e "Amido de milho acaba primeiro".
6. Despensa em dia: a faixa some.

---

## Critérios de aceite

- [x] Uma faixa com produtos e materiais, sem repetição, com a ação para `/compras`.
- [x] Linha de produção curta, uma linha, com ícone e palavra na falta.
- [~] Detalhe da produção no painel do desktop e no editor.
- [x] `faltasDaLista` testada.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d231` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Pôr os materiais na lista de compras com um toque.** Seria escrita nova vinda de uma tela de
  leitura; a lista de compras já monta a demanda. Se o roteiro mostrar que ela chega em
  `/compras` e não acha, vira spec.
- **Trocar as pílulas Receitas/Kits por "perde dinheiro" e "falta material".** Filtros de
  dimensões diferentes numa escolha única confundem; com a faixa e a ordem da 054, a pergunta já
  tem resposta.
- **Avisar a falta por e-mail.** O aviso diário da 044-B é o lugar, e é outra spec.
