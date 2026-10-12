# Spec 143 · O preparo aberto na bancada

**Tipo:** a linha do preparo (140-A) abre na bancada: os ingredientes dele na quantidade que esta
massa pede, o que sai do pote (140-B), e o caminho para o "como se faz" dele. Nenhum schema,
nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints da bancada de 2026-10-12, item 7.
**Depende de:** 138, 140-A, 140-B. Se a 142 já estiver, leva o aviso dela para dentro.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d349`.

---

## Problema

Com a 140-A, o Cookie recheado mostra na bancada "Recheio de Nutella · 320 g" e para aí. Se ela
fez o recheio antes, está certo: pesa 320 g do pote. Se faz **junto** (o caso que a 140-B chama de
"fiz junto"), precisa da receita do recheio em 320 g, não na de 1 kg que está no produto dele. Hoje
ela sai da bancada, abre o recheio no editor, e faz regra de três de cabeça com a mão suja. É
exatamente a conta que a bancada existe para fazer (`#d343`).

Meez e Galley abrem a sub-receita na linha, já na quantidade da receita de cima. É o que separa
"tem sub-receita" de "a sub-receita serve na produção".

---

## 1 · O que esta spec decide: `#d349`

### 1.1 A linha do preparo

- Continua sendo uma linha marcável como as outras (o alvo inteiro marca), com o selo "Preparo"
  que o editor já usa.
- Embaixo dela, no mesmo `<li>`, um segundo botão de largura inteira e 44 px: a frase do pote e o
  `ChevronDown`. Dois alvos empilhados, nunca um botão dentro do outro.

### 1.2 A frase, pelo pote

Pelo mesmo cálculo da folha da fornada (`potesDosPreparos` e `tirarDoPote`, `#d346`), com as
fornadas escolhidas:

- **Pote que dá:** `PackageOpen` "Do pote: tem 1.000 g · ficam 680 g". O botão abre os ingredientes
  com a frase "Fiz junto? Ver os 4 ingredientes" (fechado por padrão).
- **Pote que não dá:** "O pote tem 200 g · os outros 120 g saem dos ingredientes". Aberto por
  padrão, e a lista de dentro é a dos **120 g**.
- **Sem pote contado:** "Ver os 4 ingredientes do recheio". Aberto por padrão: sem pote, ela faz
  junto.

### 1.3 Os ingredientes de dentro

- `escalarItens(itens do preparo sem embalagem, gramasDoIngrediente / preparo.rendimento)`, onde
  as gramas são as da linha já multiplicadas pelas fornadas (ou o resto do pote, em 1.2). Pura, a
  mesma escala da bancada; o teste cobre 320 g de um recheio de 1.000 g e o resto do pote.
- Linhas recuadas dentro da mesma lista, na letra da bancada, marcáveis. A marca é
  `{preparoId}/{insumoId}` nas marcas da aba (`#d343`), e "Começar de novo" (141) limpa junto.
  Lista dentro de lista, nunca cartão dentro de cartão.
- Com a 142: o aviso "tem 80 g" aparece aqui, na linha do material de dentro, e só quando os
  ingredientes saem de fato (sem pote, ou no resto dele).
- No pé da lista de dentro, link terciário **"Como se faz o Recheio de Nutella"** para
  `/fichas/{preparoId}/bancada`. O gesto volta. As marcas de cada ficha ficam separadas, como já
  ficam.

### 1.4 O que conta como "na tigela"

A contagem da 141 conta o preparo como uma linha, aberto ou fechado. As linhas de dentro não
entram no "4 de 12": são do preparo.

---

## 2 · Escopo

- `ReceitaNaBancada.tsx`: 1.1 a 1.4.
- `domain/preparo.ts`: a escala de dentro, se não sair de `escalarItens` direto, com teste.
- A bancada passa a ler o pote dos preparos como a folha lê (mesmas consultas, nenhuma nova).
- `DECISOES.md`: `#d349` (aberto por padrão sem pote; a lista do resto do pote; dois alvos
  empilhados).
- `novidades.ts`: "O recheio abre dentro da receita do cookie, já na quantidade certa".

---

## 3 · Roteiro de navegador

1. Recheio de 1.000 g, cookie com 320 g, pote nunca contado: aberto, ingredientes do recheio em
   320 g (Nutella 32% da dela, e assim por diante).
2. 2 fornadas: 640 g, os de dentro dobram.
3. Pote contado em 1.000 g: "Do pote: tem 1.000 g · ficam 680 g", fechado; abrir mostra os de 320 g.
4. Pote em 200 g: "os outros 120 g saem dos ingredientes", a lista em 120 g.
5. Marcar dois de dentro, sair e voltar: marcados. "Começar de novo" limpa.
6. "Como se faz o Recheio de Nutella" abre a bancada dele; voltar pelo gesto.
7. 360 e 1920 px, dois temas, offline.

---

## Critérios de aceite

- [x] Linha do preparo com a frase do pote e a lista de dentro, pelos três casos.
- [x] Escala de dentro testada, no resto do pote também.
- [x] Marcas de dentro na aba, limpas com o resto.
- [x] Link para a bancada do preparo.
- [x] Portão de conclusão passa; `#d349`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Os passos do preparo dentro da receita de cima.** O link resolve; misturar dois modos de
  preparo numa lista só confunde a ordem.
- **Registrar a fornada do recheio dali.** A bancada do recheio tem o "Fiz a massa" dela.
