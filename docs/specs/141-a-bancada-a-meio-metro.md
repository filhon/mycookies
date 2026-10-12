# Spec 141 · A bancada a meio metro

**Tipo:** acabamento da bancada (138): letra de ler a meio metro, marcador que se vê, quanto já
foi para a tigela, o peso da massa e da bolinha, "Começar de novo", e o estado vazio do preparo
que leva ao campo certo. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints da bancada de 2026-10-12 (360 px e 1920 px), itens 1 a 5.
**Depende de:** 138.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d347`.

---

## Problema

Os prints mostram uma lista bem resolvida para quem está sentada, não para quem está a meio metro
com farinha na mão:

1. **O nome do ingrediente está em 16 px** e a quantidade em 20 px. É o tamanho do resto do app,
   e a bancada é a única tela que se lê de longe. Paprika, Mela e o NYT Cooking sobem a letra no
   modo cozinha; aqui ela sobe nada.
2. **O círculo de marcar mal aparece.** É um anel de 20 px em `--border-strong`, que mede 1,97:1
   sobre a superfície (`#d123` aceita isso no campo, que tem rótulo; aqui o anel é o único sinal
   de que a linha se toca).
3. **Nada diz quanto falta.** Doze linhas, quatro marcadas: ela conta com o olho. Nem "desmarcar
   tudo" existe: se desistiu no meio, ou recomeçou a massa, cada marca sai com um toque, ou fecha
   a aba.
4. **O produto se chama "120 g" e a tela não diz quanto pesa a bolinha.** Quem faz cookie porciona
   na balança. O editor já calcula ("A massa pesa 1.831 g: ≈ 114 g por unidade antes do forno",
   `#d340`), e a bancada, que é onde se porciona, não mostra.
5. **"2 un" ao lado de "Ovos"** é a linguagem do sistema. Na cozinha se diz "2 ovos", e o nome já
   está na linha.
6. **Sem modo de preparo**, o link leva ao topo do editor, a dez blocos do campo. No desktop o
   estado vazio ocupa sozinho a coluna da direita (7/12 da largura) com uma frase, e a página
   parece pela metade.

---

## 1 · O que esta spec decide: `#d347`

### 1.1 A letra da bancada

Só nesta tela, porque só ela se lê de longe (o resto do app continua na escala do `DESIGN.md`):

- **Nome do ingrediente:** tamanho de `heading` (1,25 rem), peso 400.
- **Quantidade:** tamanho de `title` (1,5 rem), **Figtree** 600 tabular. Não Archivo: é dado de
  lista, e Archivo é só título e valor financeiro em destaque.
- **Passo do preparo:** tamanho de `subheading` (1,0625 rem), 400, entrelinha 1,6.
- Linha de ingrediente com 64 px de altura mínima (era 56).

Nada de tipografia fluida: é o mesmo número em 360 e em 1920 px.

### 1.2 O marcador

- Círculo de **24 px**, borda de 2 px em `--ink-muted` (≈ 5:1 sobre `--surface`).
- Feito: o `Check` em `--positive` no lugar do círculo e o texto riscado em `--ink-muted`, como
  hoje. O risco e o ícone continuam sendo o sinal; a cor não decide sozinha.

### 1.3 Quanto já foi

- Na linha do `h2` "Ingredientes", à direita, em `label` `--ink-muted` tabular: **"4 de 12 na
  tigela"**. Some com zero marcados. O preparo conta como uma linha.
- Na do "Como se faz": **"2 de 6 feitos"**, com a mesma regra.
- Tudo marcado: "Tudo na tigela" com `Check`. Nenhum confete, nenhuma animação (`DESIGN.md` §
  Ambiente: nunca perto de um número que ela está lendo).
- **"Começar de novo"** (`RotateCcw`), botão terciário logo abaixo da lista de ingredientes, só
  com alguma marca. Limpa ingredientes e passos e mantém as fornadas. Sem confirmação: perder
  marcas não é destrutivo, e um modal na bancada seria pior que remarcar.

### 1.4 O peso da massa

- Embaixo de "Rende 16 unidades", na mesma linha quando couber: **"massa de ≈ 1.831 g · ≈ 114 g
  cada antes do forno"**, já multiplicada pelas fornadas (a bolinha não muda; a massa muda).
- O que não tem peso conhecido (ml e un) é dito como no editor: "fora 2 ovos e 5 ml de essência".
  Nada de densidade ou peso de ovo inventado (`#d340`).
- Só com rendimento em `un` ou `porcao`, como no editor.
- **Uma frase só:** a montagem que hoje vive dentro de `FormularioFicha` (`fraseDaMassa`) vira
  função pura em `src/lib/domain/custoFicha.ts`, ao lado de `pesoDaMassa`, com teste. O editor e a
  bancada chamam a mesma. `listarNomes`, que é pura e mora em `FraseDaCapacidade.tsx`, desce para
  o domínio junto (o componente reexporta, para não mexer nos outros chamadores).

### 1.5 "2", e não "2 un"

`quantidadeNaBancada` devolve só o número para `un`: "2", "1 ½", "½". O nome da linha é a unidade.
g e ml continuam com a unidade. A folha da fornada e o editor não mudam.

### 1.6 Sem modo de preparo

- O link "Escreva no produto" vai para `/fichas/{id}#como-se-faz`. O bloco "Como se faz" do editor
  ganha `id="como-se-faz"`, e o editor, ao montar com esse hash, rola até o bloco e põe o foco no
  campo.
- No desktop, sem passos, a tela não abre a segunda coluna: a lista fica numa coluna só, na largura
  dela (`max-w-2xl`), e a frase vai embaixo da linha da embalagem.

---

## 2 · Escopo

- `ReceitaNaBancada.tsx`: 1.1 a 1.4, 1.6.
- `domain/preparo.ts`: `quantidadeNaBancada` (1.5) e o teste dela.
- `domain/custoFicha.ts`: `fraseDaMassa` e teste; `listarNomes` no domínio.
- `FormularioFicha.tsx`: usa `fraseDaMassa`; `id` e foco do "Como se faz".
- `DECISOES.md`: `#d347` (a letra própria da bancada e por quê; "Começar de novo" sem modal; "2" e
  não "2 un"; a frase da massa num lugar só).
- `novidades.ts`: "Na bancada, a letra ficou maior e a massa diz quanto pesa cada bolinha".

---

## 3 · Roteiro de navegador

360 px com o celular a meio metro, dois temas, e 1920 px:

1. Cookie Cacau com Nutella na bancada: os nomes e as quantidades se leem a meio metro; o círculo
   aparece nos dois temas.
2. "massa de ≈ 1.831 g · ≈ 114 g cada antes do forno · fora 2 ovos e 5 ml de essência"; 2 fornadas:
   "≈ 3.662 g", a bolinha igual.
3. Ovos mostram "2"; ½ fornada, "1".
4. Marcar 4: "4 de 12 na tigela"; "Começar de novo" limpa e mantém as fornadas.
5. Produto sem preparo: o link abre o editor no campo, com o foco nele. No desktop a lista fica
   numa coluna só.
6. Leitor de tela: "4 de 12 na tigela" lido com o título; a linha marcada continua `aria-pressed`.

---

## Critérios de aceite

- [x] Letra, linha e marcador da 1.1 e 1.2, nos dois temas.
- [x] Contagem, "Tudo na tigela" e "Começar de novo".
- [x] A frase da massa vem de uma função só, testada, e escala com as fornadas.
- [x] `un` sem a unidade; teste atualizado.
- [x] Estado vazio com o link no campo e a coluna única no desktop.
- [x] Portão de conclusão passa; `#d347`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **O que falta na despensa** (142), **o preparo aberto** (143), **o passo da vez** (144).
- **Escrever o preparo na própria bancada.** Ela é só leitura (`#d343`); o link resolve.
- **Corrigir nome de material** ("ESSENCIA de baunilha", "Bicarbonato de sodio"). A bancada mostra o
  cadastro como está; é coisa do material.
- **Agrupar ingredientes** ("Secos", "Úmidos"). Pede schema; esperar ela pedir.
