# Spec 126 · O que conferir primeiro

**Tipo:** a contagem passa a dizer quais linhas mais precisam de olho: o frescor ganha ícone e
palavra, a tela abre recortada no que precisa de conferência, e cada corredor diz quantas já
foram. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica sobre os prints da contagem de 2026-10-11, item 3.
**Depende de:** nada (pode entrar antes ou depois da 125).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d331`.

---

## Problema

Nos prints são 35 linhas de peso visual idêntico. "contada há 1 dia", "contada há 18 dias",
"contada há mais de um mês", "nunca contada" e "90 un anotados, sem contagem" estão todas no
mesmo cinza de `label`. A única pergunta que importa antes de começar, **"o que eu preciso
conferir hoje?"**, ela responde lendo as 35 frases.

O sistema já sabe a resposta: o frescor (`#d60`) e as fornadas desde a contagem (`#d87`). E a
contagem parcial já é a regra da casa (`#d59`: "contagem é por insumo, e não por despensa").
Falta a tela usar isso. É o que os serviços de estoque chamam de contagem cíclica: contar pouco,
sempre, começando pelo que está mais velho.

O rodapé conta "0 de 35"; com seis corredores na tela e o rodapé longe, ela não sabe em qual
deixou linha para trás.

---

## 1 · O que esta spec decide: `#d331`

### O frescor tem ícone e palavra

Na referência embaixo do nome, antes do texto que já existe:

- **`VENCIDA`** e **`NUNCA`**: `TriangleAlert` 14 px em `--attention` e a palavra em `--attention`
  ("vencida ·", "nunca contada"). Reusar o selo de `/insumos` (`#d61`) se ele couber na linha;
  senão, ícone + palavra.
- **Com fornada desde a contagem**: sem ícone (não é atenção, é o forno trabalhando), mas a
  projeção passa a vir **primeiro**, porque é o melhor palpite: "projetamos 510 g · 540 g
  contados há 15 dias, 1 fornada depois".
- **`FRESCA`** e **`ENVELHECENDO`** sem fornada: como hoje.

Cor nunca sozinha: triângulo e palavra, como o `DESIGN.md` manda para atenção. Nada em âmbar.

### A tela abre no que precisa

- Sem semente da compra, a faixa de ferramentas ganha as pílulas (o mesmo `Pilulas` do recorte
  da compra):
  - **"Precisa conferir (N)"**: linha `VENCIDA`, `NUNCA`, `ENVELHECENDO`, ou com fornada desde a
    contagem;
  - **"A despensa inteira (35)"**.
- **Abre em "Precisa conferir"** quando N está entre 1 e o total menos 1. N igual a zero ou ao
  total: abre na despensa inteira e as pílulas não aparecem (escolher entre a mesma lista e ela
  mesma é ruído).
- O recorte é de exibição, como o da compra: trocar de pílula não apaga nada digitado, e salvar
  grava tudo o que foi tocado. A linha que ela conta **não sai** do recorte ao ganhar número
  (sumir debaixo do dedo é pior que a lista não encolher); o recorte se refaz só ao trocar de
  pílula ou reabrir a tela.
- Com semente, as pílulas da compra continuam sozinhas, como hoje.

### Cada corredor diz quantas

- O `h2` do corredor ganha, à direita, "4 de 26" em `label` `--ink-muted` `tabular-nums`. Corredor
  inteiro contado: `Check` em `--positive` e "26 de 26".
- Conta as linhas **visíveis** do corredor, como o rodapé conta as visíveis da tela.

### Domínio

- `precisaConferir(linha, projecao)` em `domain/estoque.ts` (ou em `producao.ts`, se a projeção
  não puder entrar em `estoque.ts` sem ciclo), com testes dos quatro frescores e da fornada.
- `referencia` em `LinhaContagem` reordena a frase com projeção.

---

## 2 · Antes de tocar em código

1. Ler `contagemDoInsumo` e `rotuloDeIdade` em `domain/estoque.ts`, e `projecaoDoInsumo` em
   `producao.ts`.
2. Ler o selo "Contagem vencida" de `/insumos` (`#d61`).
3. Ler o recorte da compra em `TelaContagem.tsx` (`soDaCompra`): o novo é o mesmo mecanismo.

---

## 3 · Escopo

- `domain/estoque.ts` (ou `producao.ts`): `precisaConferir`, com testes.
- `LinhaContagem.tsx`: ícone e palavra de atenção; a frase da projeção reordenada.
- `TelaContagem.tsx`: as pílulas, o recorte, a contagem por corredor.
- `DECISOES.md`: `#d331`.
- `novidades.ts`: "A contagem abre no que precisa ser conferido".

---

## 4 · Roteiro de navegador

Em 360 px e 1280 px, nos dois temas:

1. Com a despensa dos prints: abre em "Precisa conferir"; Adesivo com logo, Chocolate pó e Sacola
   Kraft com triângulo e palavra; Chocolate cobertura branca (há 1 dia, sem fornada) fora.
2. Amido de milho: "projetamos 510 g · 540 g contados há 15 dias, 1 fornada depois".
3. Digitar numa linha do recorte: ela fica na tela; trocar para "A despensa inteira" e voltar:
   ela sai, e o número continua no rodapé.
4. "Ingredientes 0 de N" muda a cada linha; corredor completo ganha o `Check`.
5. Vinda da nota: só as pílulas da compra.
6. Leitor de tela: a palavra "vencida" é lida; o triângulo não.

---

## Critérios de aceite

- [x] Vencida e nunca contada com triângulo e palavra em `--attention`.
- [x] A projeção vem antes do número velho na frase.
- [x] Abre em "Precisa conferir" quando o recorte não é vazio nem a despensa inteira.
- [x] Linha contada não some do recorte enquanto a tela está aberta.
- [x] Contagem por corredor no título.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d331` escrito; `ESTADO.md` e `novidades.ts`
      atualizados.

---

## Decisões fáceis de rejeitar

- **Abrir no recorte, e não na despensa inteira.** Muda o que ela vê ao entrar. É o que torna
  contar barato: dez linhas em vez de 35, e as dez certas. A despensa inteira está a um toque.
- **"Envelhecendo" entra no recorte.** Uma contagem de 12 dias ainda vale (`#d60`), mas é a
  próxima a vencer. Se o recorte ficar grande demais na prática, ela sai e fica só vencida, nunca
  e fornada.
- **Sem busca.** Com 35 linhas e o recorte, a busca seria um campo a mais na faixa. Volta se a
  conta passar de 60 materiais.

---

## Fora de escopo

- **Ordem da prateleira** (local de armazenamento por material): é schema e cadastro novo; a
  ordem do corredor do mercado (`#d63`) continua.
- **Aviso fora da tela** ("faz 10 dias que você não conta"): é notificação, e é outra conversa.
