# Spec 033 · A marca Rende

**Tipo:** rebrand. O produto deixa de se chamar MyCookie's e passa a se chamar **Rende**, com a
identidade que está em `docs/marca/rende/` (território "Ponto": tinta azul-preta + âmbar,
Archivo + Figtree). Nenhum módulo de domínio muda de comportamento, nenhuma rota nasce,
nenhuma consulta, nenhum índice, nenhuma regra. O que muda é tudo o que a usuária vê e nada do
que ela grava — com uma exceção pequena, e pedida (aprovação abaixo).
**Tamanho:** três sessões. A **A** troca a tinta (tokens, fontes, o que era da MyCookie's e sai
do CSS); a **B** troca o nome e o símbolo (logotipo, ícones, manifesto, as telas de marca); a
**C** põe a assinatura nova onde ela mora (o ponto, a faixa), reescreve a cópia na voz da marca
e faz a passagem do `/impeccable`. **A e B saem juntas no mesmo deploy**: entre elas o app é
uma quimera (nome antigo em cor nova), e ninguém precisa ver isso. A C pode vir depois.
**Número:** 033, fora da ordem do `docs/saas/ROADMAP.md` de propósito. 023–032 estão
reservados lá e já são citados na 022, no `#d118` e no `#d119`; renumerar seria reescrever
história para ganhar uma sequência bonita.
**Origem:** decisão de quem conduz o projeto em 2026-09-18, registrada em
`docs/saas/BRIEF-MARCA.md` e respondida pelo pacote em `docs/marca/rende/`. Reverte o primeiro
item do `#d111` ("MyCookie's continua sendo a marca do produto").
**Depende de:** nada em código. Do lado de fora, `docs/marca/rende/LEIA-ME.md` diz o que ainda
não foi verificado — `rende.com.br`, `@rende.app`, INPI. **Nada nesta spec imprime nada**; o
que ela produz é tela, e tela se troca. A verificação é de quem conduz o projeto, antes de
qualquer adesivo ou lâmina.
**Aprovações pedidas:** **uma.** `ConfiguracaoGeral.frase?: string`, campo opcional e aditivo,
na sessão C — é para onde vai o "Feito com amor em cada mordida." que hoje é constante de
marca e aparece no rodapé do orçamento dela (seção 3.C.3). Nenhuma dependência: Archivo entra
por `next/font/google`, como a Fraunces entrou. **Duas coisas de aparelho, e não de código**,
para quem conduz o projeto: reinstalar o app no celular (o Android assa `theme_color` e
`background_color` no WebAPK, `#d76`) e a verificação de nome do LEIA-ME.
**Decisões a registrar:** `#d122` (a marca é própria; supera o `#d111`), `#d123` (os tokens e o
que da escala não muda), `#d124` (a barra do sistema muda de cor; reinstalar), `#d125` (o que
do pacote da marca **não** entra no código, e por quê), `#d126` (a faixa é dado, nunca enfeite),
`#d127` (a folha é dela; "feito com Rende" é uma linha fixa por enquanto).

---

## Problema

O sistema herdou por inteiro a identidade da confeitaria para a qual nasceu: vinho, creme de
papel texturizado, filete dourado, serifa quente, o contorno do biscoito em marca d'água, e o
nome. Está tudo certo para a MyCookie's e tudo errado para a segunda confeiteira, que faz bolo
e vai abrir o app sentindo que está na ferramenta interna de uma concorrente. O `#d111` decidiu
que isso não mudaria; a 022 tirou da frente só a cópia que presumia uma dona. Em 2026-09-18 a
decisão virou: **o produto ganha marca própria**, e a MyCookie's vira a primeira cliente e o
primeiro caso.

A marca já existe e está aprovada. O que falta é colocá-la no código sem quebrar o que o código
já acertou — e sem trazer junto o que o pacote da marca acertou menos.

**O que esta spec entrega:** o app inteiro na identidade Rende, nos dois temas, com o ícone
novo na tela de início, o nome novo na aba e no manifesto, o logotipo no acesso e na barra
lateral, o `DESIGN.md` e o `PRODUCT.md` da raiz reescritos (é o que o `/impeccable` lê), e as
duas assinaturas da marca onde o manual manda: o ponto no painel de preço e a faixa de
composição no editor de produto, com dado de verdade.

**O que esta spec não entrega:** página de venda, e-mail, Instagram, lâmina, adesivo — tudo o
que está em `Rende — Aplicações.dc.html` e não é tela do app (seção Fora de escopo). A
biblioteca de partida continua sendo de cookie; generalizar o produto para bolo e brigadeiro é
o que as entrevistas da fase 1 vão dizer, não a marca.

---

## 1 · O que esta spec decide

### O pacote da marca é a fonte; os `.dc.html` são derivação — `#d125`

`MARCA.md`, `DESIGN.md` e `tokens.css` do pacote mandam. As pranchas `.dc.html` são maquetes
geradas para provar os tokens, e em cinco pontos elas contradizem o próprio manual ou o que o
`/impeccable` proíbe. **Nenhum destes cinco entra no código:**

| O que a prancha ou o manual mostra                                                         | Por que não entra                                                                                                                                                    | O que entra no lugar                                                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Barra lateral: item ativo com **faixa âmbar de 3px à esquerda** (`DESIGN.md` § Components) | É o _side-stripe_ que o `/impeccable` lista como proibição absoluta, e é o primeiro reflexo de "dashboard gerado".                                                   | O que já existe: item ativo com fundo `brand-700` cheio e texto `on-brand` em peso 600.              |
| Listas com "**↗ sobram 3,19**" em verde em toda linha (`Telas`, telas 2 e 4)               | Seta Unicode fora do conjunto Lucide, e cor cheia em estado inativo (produto: "heavy color on inactive states"). Vira ruído quando toda linha carrega.               | A sobra como está hoje: tabular, em `ink`; negativa com sinal, cor `negative` **e** `trending-down`. |
| Estado vazio com **o ponto e a faixa, sem dado, a 40%** (`Telas`, tela 8)                  | O manual diz "uma assinatura por peça" e "a faixa nunca é decorativa com proporções inventadas" (`MARCA.md` § 2.4). A prancha quebra as duas regras de uma vez.      | Só o ponto (seção 3.C.2). Sem faixa onde não há custo.                                               |
| Navegação inferior **ativa em `--accent-500`** (`DESIGN.md` § Components)                  | `#D89B3C` sobre `#FEFCF8` dá ~2,3:1. Falha AA em texto (4,5) e em ícone (3). O próprio pacote tem o token certo para âmbar como texto: `--accent-ink`, 6,4:1.        | Ativo em `accent-ink` (ícone e rótulo), com o fundo `brand-100` que a pílula do ícone já tem.        |
| **Escala 15/13px** (body, label) e raio 12 no cartão (`DESIGN.md` § Typography)            | O brief listou a escala como estrutura do produto, não da marca. A de hoje (16/14) foi a que a usuária 0 usou na bancada, e 13px de rótulo a meio metro é regressão. | A escala e os raios do código ficam. O `DESIGN.md` da raiz é reescrito com os valores do código.     |

Mais dois que o pacote não desenhou e o código precisa: `--accent-500` sobre o tema escuro como
**fundo de hover terciário** (`brand-100` do pacote é constante e quase branca; no escuro vira um
flash) ganha valor escuro, como `wine-100` já tinha; e a **tela de abertura em `--brand-800`**
(`DESIGN.md` § Motion) fica de fora, porque o `background_color` do manifesto é a única tela de
abertura que um PWA tem, e um ícone `brand-700` sobre `brand-800` é um quadrado escuro sobre
fundo escuro — o creme do `canvas` continua sendo o fundo (seção 3.B.4).

### Os tokens do pacote entram com o nome deles; o Tailwind fica com nome de papel — `#d123`

`globals.css` deixa de ter o prefixo `--mc-` e passa a declarar exatamente os nomes de
`tokens.css` (`--brand-700`, `--canvas`, `--accent-ink`…), para que o arquivo do pacote e o do
código se comparem com `diff`. O `@theme inline` continua sendo a camada que dá nome de uso
ao Tailwind, e é onde o vinho e o dourado morrem:

| Antes (classe)                                | Depois (classe)      | Token                          |
| --------------------------------------------- | -------------------- | ------------------------------ |
| `wine-900`                                    | `brand-800`          | `--brand-800`                  |
| `wine-800`                                    | `brand-600`          | `--brand-600` (hover de marca) |
| `wine-700`                                    | `brand-700`          | `--brand-700`                  |
| `wine-600`                                    | `brand-600`          | `--brand-600`                  |
| `wine-300`                                    | `brand-ink`          | `--brand-as-ink`               |
| `wine-100`                                    | `brand-100`          | `--brand-100` (+ valor escuro) |
| `wine-ink`                                    | `brand-ink`          | `--brand-as-ink`               |
| `gold-600/500/100`                            | `accent-600/500/100` | `--accent-*`                   |
| `gold-ink`                                    | `accent-ink`         | `--accent-ink`                 |
| `on-wine`                                     | `on-brand`           | `--on-brand`                   |
| `on-wine-muted`                               | `on-brand-muted`     | `--on-brand-muted` (novo)      |
| `*-soft`                                      | `*-soft` (fica)      | `--*-bg` do pacote             |
| `line`, `sunken`, `ink*`, `canvas`, `surface` | ficam                | os do pacote                   |

Três tokens que o pacote não tem e o código precisa, declarados em `globals.css` e anotados no
`DESIGN.md` da raiz: `--on-accent: oklch(0.20 0.030 75)` (o `#231A08` que o pacote cita como
tinta do botão âmbar e nunca nomeia), `--on-brand-muted: var(--brand-200)` (texto apagado sobre
a barra lateral; `#CFD0D8` sobre `#1C1E28` ≈ 10:1), e o valor escuro de `--brand-100`
(`oklch(0.30 0.030 272)`). Os blocos `[data-theme]` do `tokens.css` não entram: o app não tem
alternador de tema e segue `prefers-color-scheme`, como sempre seguiu.

### A barra do sistema vira `brand-700`; o app precisa ser reinstalado — `#d124`

`theme_color` e `viewport.themeColor` passam de `#5e1725` para `#2A2C3A`, pelo mesmo raciocínio
do `#d76`: a barra é a moldura do ícone, e o ícone é `brand-700`. `background_color` vai de
`#f3eee3` para `#F7F4EE`, o `canvas` claro do pacote. Os dois são assados no WebAPK: **até
reinstalar, o celular da Maynara abre o app novo com a barra vinho.** É a mesma dívida que o
roteiro B da 009 já pedia, e desta vez ela é visível.

### A faixa é dado — `#d126`

A segunda assinatura da marca, a faixa de composição, só existe onde existe custo calculado: o
bloco "O custo do lote" do editor de produto. Ela é desenhada a partir de uma função pura,
`composicaoDoLote(custo)` em `domain/custoFicha.ts`, com as mesmas parcelas e na mesma ordem
das linhas que o bloco já mostra — as linhas **são** a legenda, e a faixa não precisa de outra.
Custo zero, faixa nenhuma. Nenhuma faixa em estado vazio, tela de acesso ou peça de divulgação
dentro do app.

### A folha é dela — `#d127`

O orçamento A4 (`FolhaOrcamento`) perde o logotipo da MyCookie's e **não ganha o do Rende**: o
cabeçalho vira o nome do negócio em display, o único bloco cheio (o total) vira `ink` e não
`brand-700`, e o Rende aparece como o manual manda — uma linha de 7,5pt no rodapé, `ink-subtle`,
"feito com Rende". O manual pede a linha desligável nas configurações; **isso fica para a 028**,
porque "tirar o feito com" é o que uma assinatura paga compra, e hoje não há cobrança. O slogan
dela sai da constante `SLOGAN` e vai para `ConfiguracaoGeral.frase`, que é o campo aprovado.

---

## 2 · Antes de tocar em código

Vale para as três sessões. A ordem importa: o `/impeccable` lê `PRODUCT.md` e `DESIGN.md` da
raiz, e enquanto eles disserem "vinho e Fraunces" ele vai defender o vinho e a Fraunces.

1. Ler `docs/marca/rende/MARCA.md` inteiro e `docs/marca/rende/DESIGN.md` inteiro. Abrir
   `Rende — Telas.dc.html` no navegador **ao lado** do app rodando, para comparar — sabendo que
   a seção 1 já disse o que da prancha não entra.
2. **Sessão A, primeiro ato:** reescrever `DESIGN.md` e `PRODUCT.md` da raiz (seção 3.A.5).
   Só depois `node <skills>/impeccable/scripts/load-context.mjs` e o resto.
3. Inventário, com o resultado colado no `ESTADO.md` ao fim:
   - `rg -n "wine-|gold-|on-wine" src/` — hoje 112 ocorrências em 38 arquivos.
   - `rg -n "filete-dourado|textura-papel|PadraoCookie|from \"@/components/marca/Marca\"" src/`
     — 8 filetes, 4 texturas, 1 padrão, 7 importadores de `Marca`.
   - `rg -n "Cookie" src/components --glob '!**/marca/**'` — separa o `Cookie` do Lucide (três
     usos, seção 3.B.7) do `Cookie` da marca.
   - `rg -n "MyCookie|Biscoitos artesanais|Feito com amor" src/ CLAUDE.md firestore.rules`.
   - `rg -n 'variante="primaria"' src/` — 26 em 22 arquivos; é a lista da regra "um botão
     primário por tela" na C.
4. `npx impeccable --json src/` **antes** de qualquer mudança, se rodar (precisa de rede na
   primeira vez). Guardar a contagem: a C compara.

---

## 3 · Escopo

### Sessão A · A tinta

**Nada do que ela vê muda de lugar.** Muda de cor, de fonte e perde três enfeites. Ao fim da A o
app ainda se chama MyCookie's e ainda tem o biscoito no logotipo — é por isso que A e B saem
juntas.

#### 3.A.1 `src/app/globals.css`

- O bloco `:root` e o `@media (prefers-color-scheme: dark)` são substituídos pelos de
  `docs/marca/rende/tokens.css`, **sem os blocos `[data-theme]`**, com os três tokens da `#d123`
  acrescentados e com `color-scheme: light dark` mantido. Os tokens de tipografia, espaçamento,
  raio, toque, motion e z-index do pacote **não entram como custom properties**: o Tailwind já
  tem `text-*`, `rounded-*`, `duration-*`, e duplicar seria dois donos para o mesmo valor.
- `--focus` → `var(--accent-500)`. É o anel do pacote. Sobre o botão primário âmbar o anel é da
  cor do fundo; o `outline-offset: 2px` deixa 2px de superfície entre os dois, e é o que o torna
  visível. A C confere no navegador.
- `::selection` → `--brand-700` / `--on-brand`. `accent-color` (controles nativos) →
  `--brand-as-ink`.
- Sombras: mesma estrutura, matiz 272 e o croma baixo do pacote (`--shadow-panel` e
  `--shadow-sheet` de `tokens.css` são referência; os nomes `raised`/`overlay` do código ficam).
- `@theme inline`: a tabela da `#d123`. `--font-display` passa a `var(--fonte-display),
system-ui, sans-serif` — a Georgia e a Times saem com a serifa. A escala de texto e os raios
  **não mudam** (seção 1).
- **Saem:** `@utility textura-papel` e as regras de `@media print` que a citam;
  `@utility filete-dourado`. O comentário "Grão do papel creme da embalagem" vai junto.
- `@utility folha`: redeclara os tokens de superfície e tinta com os valores **claros do
  pacote** (`--canvas`, `--surface`, `--ink`… e `--brand-as-ink`, `--accent-ink` no valor
  claro). É a única lista de valores repetida no arquivo, e já era (`#d106`, `#d120`).

#### 3.A.2 Fontes — `src/app/layout.tsx:2-16`

`Fraunces` → `Archivo`, `weight: ["600", "700"]`, mesma variável `--fonte-display` (nome
interno; renomear não compra nada). Figtree fica. Consequência a caçar: `font-display
font-normal` na tagline do login (`login/page.tsx:99`) vira `font-semibold` — Archivo 400 não é
carregada e não é da marca.

#### 3.A.3 A troca de classes — os 38 arquivos

Um `sed` com a tabela da `#d123`, e depois **cada arquivo aberto**, porque a troca não é 1:1
em quatro lugares onde o papel mudou, e não só a cor:

- **Botão primário** (`ui/estilosBotao.ts:7-8`): `bg-accent-500 text-on-accent
hover:bg-accent-600 active:bg-accent-600 disabled:bg-accent-500`. A **terciária** vira
  `text-brand-ink hover:bg-brand-100 active:bg-brand-100`. `perigo` não muda: o comentário "nunca
  vinho" vira "nunca a marca".
- **Botão flutuante** (`ui/BotaoFlutuante.tsx`): é a ação primária do celular, então é âmbar
  com `on-accent`, como o primário.
- **Navegação inferior** (`layout/NavegacaoInferior.tsx:32,38`): ativo em `text-accent-ink`,
  pílula do ícone em `bg-brand-100`. Não `accent-500` (seção 1).
- **Barra lateral** (`layout/BarraLateral.tsx`): `bg-brand-800 text-on-brand`; item ativo
  `bg-brand-700`; hover `bg-brand-600`. **O filete do cabeçalho sai** (o cabeçalho em si é da B).
- **Pílulas de filtro** (`ui/Pilulas.tsx`): ativa em `bg-brand-700 text-on-brand`.
- **Selo de status** (`ui/Selo.tsx`): "entregue" é o único que usa a marca; vira `brand-*`.
  Os outros quatro são semânticos e só mudam de valor.
- **Os 8 `filete-dourado`** — `login/page.tsx:95`, `BarraLateral.tsx:34`,
  `insumos/ResumoCusto.tsx:19`, `configuracao/CustoPorHora.tsx:38`,
  `metas/CartaoMetaHoje.tsx:121`, `metas/BlocoMeta.tsx:112`, `comecar/BlocoPasso.tsx:74`,
  `comecar/CartaoPrimeirosPassos.tsx:58`: a classe sai. Em três deles o filete **marcava
  estado** (`dourado &&`, `medida.batida &&`, `agora &&`): conferir que o estado continua dito
  por texto ou ícone no mesmo cartão (meta batida tem a frase; passo atual tem o rótulo). Se
  algum ficar mudo, `border-brand-ink` na borda inteira do cartão — nunca em um lado só.
- **Os 4 `textura-papel`** — `login/page.tsx:90`, `offline/page.tsx:7`, `layout/AppShell.tsx:7`,
  `(app)/layout.tsx:50,63`: a classe sai, `bg-canvas` fica.
- **`Marca.tsx:33`**: `fill="var(--mc-gold-500)"` → `var(--accent-500)`. Provisório: o
  arquivo inteiro é reescrito na B.
- `CLAUDE.md`, invariante "Cor nunca é o único portador": a justificativa muda. Não é mais o
  vinho vizinho do vermelho; é o âmbar que divide matiz com a atenção (`LEIA-ME.md`,
  "Ressalvas"). A regra fica igual.

#### 3.A.4 `src/app/layout.tsx:46` e `src/app/manifest.ts:15,22`

`themeColor` e `theme_color` → `"#2A2C3A"`; `background_color` → `"#F7F4EE"`. Os comentários
que falam de vinho e de ladrilho são reescritos apontando para `#d124`. O resto do manifesto
(nome, descrição, ícones) é da B.

#### 3.A.5 Documentação da A

- **`DESIGN.md` (raiz)** ← `docs/marca/rende/DESIGN.md`, com quatro correções: a escala e os
  raios são os do código; a linha "faixa âmbar de 3px" da barra lateral e "ativo em
  `--accent-500`" da navegação são substituídas pelo que a seção 1 decidiu; a tabela de
  superfícies ganha `--on-accent` e `--on-brand-muted`; e uma seção curta "Tokens no código"
  explica as duas camadas (`:root` com os nomes do pacote, `@theme inline` com os nomes de uso).
  O que hoje se chama "Signature" no arquivo da raiz descreve textura, filete e biscoito — sai
  inteiro, entra o do pacote.
- **`PRODUCT.md` (raiz)**: "Brand Personality" reescrita a partir de `MARCA.md` § 1.2 (o
  instrumento de precisão, a tabela é/não é, a regra de ouro). "Users": a Maynara continua sendo
  a persona, apresentada como a primeira usuária e o primeiro caso — e a frase "dona e única
  operadora da MyCookie's" vira "confeiteira artesanal que trabalha sozinha; a MyCookie's é a
  dela". "Anti-references" ganha a sexta: a própria MyCookie's. Acessibilidade: a frase do vinho
  vizinho do vermelho é trocada pela do âmbar e da atenção.
- **`CLAUDE.md`**: título e primeira linha ("# Rende · Sistema de precificação, produção e
  fluxo de caixa para confeiteiras artesanais. A MyCookie's é a primeira conta."). Comandos,
  invariantes e protocolo não mudam, salvo a justificativa da 3.A.3.
- `#d122` e `#d123` em `DECISOES.md`. `#d111` ganha "**superada no primeiro item** pela `#d122`"
  no status; `#d120` ganha a nota de que `wine-ink`/`gold-ink` viraram `brand-ink`/`accent-ink`.
- `docs/saas/ROADMAP.md:11`: a linha "MyCookie's continua sendo a marca do produto. Não há spec
  de rebrand." vira "~~…~~ Revertido em 2026-09-18: spec 033, `#d122`."
- `ESTADO.md`: seção da 033-A, linha 33 na tabela, e a nota em negrito "**A e B saem juntas.**"

### Sessão B · O nome e o símbolo

#### 3.B.1 `src/components/marca/Marca.tsx`, reescrito

Saem `Cookie`, `PadraoCookie`, `TRACADO_COOKIE`, `DESCRITOR`, `SLOGAN`. Entram:

- **`Simbolo({ className })`**: o SVG de `logo/rende-simbolo.svg` — quadrado `rx` 22%,
  `fill: var(--brand-700)`; régua `var(--on-brand)`; ponto `var(--accent-500)`. `aria-hidden`.
  Tamanho mínimo 48px (`MARCA.md` § 2.1); nenhum uso abaixo disso.
- **`Logotipo({ tamanho, tom, className })`**: a palavra "rende" em HTML — `font-display
font-bold lowercase tracking-[-0.03em]` — fechada pelo ponto. O ponto é um `<span
aria-hidden>` redondo de `0.29em`, `bg-accent-500`, encostado no "e" e com a base `0.04em`
  abaixo da linha de base: é a geometria de `rende-principal.svg` (círculo r 11 num corpo de
  76). Não é `<img>` nem `<text>` de SVG: a Archivo já está na página, e um `<span>` herda
  `currentColor` — `tom="negativa"` é só `text-on-brand`. `tamanho`: `md` (≈ `text-title`) e
  `lg` (≈ `2.5rem`); o mínimo do manual é 88px de largura, e `md` já passa disso.
  `aria-label="Rende"` no envelope.
- O comentário de cabeçalho diz a regra que importa a quem mexer aqui: o ponto é a assinatura, é
  único na tela, e **nunca vira ícone de interface**.

#### 3.B.2 Os sete importadores de `Marca`

- **`(auth)/login/page.tsx`**: o painel de marca (`:92`) vira `bg-brand-800`, sem `PadraoCookie`,
  sem filete; `Logotipo tamanho="lg" tom="negativa"` em cima, a tagline embaixo (fica: o pacote
  a manteve em `Telas` 9a). No celular (`:107`), `Logotipo tamanho="md"` em `text-brand-ink`.
  `<h1>` "Entrar no sistema" → "Entrar" — "sistema" é palavra de software (`MARCA.md` § 3.3).
- **`layout/BarraLateral.tsx:34-44`**: o cabeçalho vira `<Logotipo tamanho="md" tom="negativa">`
  sozinho, sem símbolo (32px é abaixo do mínimo do símbolo) e sem descritor. `px-5 pb-5 pt-6`
  ficam.
- **`(app)/layout.tsx:51`** (carregando) e **`notas/TelaNota.tsx:615`** (lendo): `<Simbolo
className="size-12 animate-pulse">`. É indicador de estado, não decoração; o pulso é o mesmo
  de hoje.
- **`(app)/layout.tsx:63-70`** (sem conta) e **`offline/page.tsx:8`**: `<Simbolo
className="size-16">`, estático.
- **`ui/EstadoVazio.tsx:27-30`**: a marca d'água **sai**, e nada entra no lugar nesta sessão. A
  C decide a assinatura do estado vazio (3.C.2).
- **`pedidos/FolhaOrcamento.tsx`**: `:33` a borda `border-gold-500` vira `border-line-strong`;
  `:34` o `<Logotipo>` vira `<p className="font-display text-[20pt] font-bold
leading-none">{negocio.nome}</p>`; `:162` o bloco do total vira `bg-ink text-surface` (é o
  mesmo tom que `brand-700`, e é dela e não nosso — `#d127`); `:227` o `{SLOGAN}` vira a
  constante local `FRASE_RODAPE = "Feito com amor em cada mordida."` com o comentário
  `// ponytail: constante até a C gravar ConfiguracaoGeral.frase (#d127)`. O documento dela não
  perde a frase dela entre a B e a C.

#### 3.B.3 Ícones

- `src/app/icon.svg` ← conteúdo de `logo/icone-app-512.svg` (favicon e origem dos PNGs).
- `public/icons/icone-maskable.svg` ← `logo/icone-app-maskable-512.svg`, com o comentário de
  zona segura reescrito.
- **Os PNGs do pacote não são copiados.** `icone-app-512.png` foi rasterizado do SVG **com** o
  `rx`, e é exatamente o canto arredondado dentro do canto arredondado do sistema que o `#d44`
  tirou. `scripts/gerar-icones.mjs` muda em duas linhas — a guarda `rx="22"` vira
  `rx="112.64"` e o `viewBox="0 0 100 100"` vira `0 0 512 512` — e roda: `apple-icon.png`
  (180), `icone-192.png`, `icone-512.png` nascem do SVG novo, quadrados. Colar a saída do
  script no `ESTADO.md`.

#### 3.B.4 `src/app/manifest.ts` e `src/app/layout.tsx:18-35`

- `name: "Rende"`, `short_name: "Rende"`, `description` = a descrição de loja de `MARCA.md`
  § 3.5 (139 caracteres). `categories` ficam. O comentário de `background_color` diz por que
  continua claro (seção 1, último parágrafo).
- `metadata`: `title.default` e `applicationName` "Rende", `template: "%s · Rende"`,
  `appleWebApp.title` "Rende", `description` a mesma. O comentário de `robots` ("sistema interno
  de uma pessoa só") vira "o app é área logada; a página de venda, quando existir, é outra rota
  e é indexável" — o valor não muda.

#### 3.B.5 O que ainda diz MyCookie's

- `firestore.rules:3`: o comentário.
- `configuracao/TelaConfiguracao.tsx:541`: `placeholder="MyCookiesArtesanais"` →
  `"suaconfeitaria"`. É exemplo, e presumia a dona.
- `scripts/conceder-acesso.mjs:5-6,40`: **ficam**. `mycookies` ali é id de conta, e é o id da
  conta real.
- `lib/types/conta.ts:18,40`: ficam. São exemplos de dado, e o dado é esse.
- `tests/domain/*`: ficam. "Cookie clássico" e "MyCookie's" são fixtures de negócio, não marca.

#### 3.B.6 `docs/marca/rende/LEIA-ME.md`

Ganha uma seção "Como está no código", de cinco linhas: os tokens em `globals.css` (nomes
iguais), o logotipo em `Marca.tsx` (HTML, não o SVG), os ícones em `icon.svg` e `public/icons`
(PNGs regenerados pelo script, sem `rx`), e o que a `#d125` recusou.

#### 3.B.7 O biscoito do Lucide

`producao/EntradaContagemPronto.tsx:2`, `producao/FraseDaCapacidade.tsx:6`,
`comecar/OQueMaisTem.tsx:9` importam `Cookie` de `lucide-react` como ícone de "o que está
pronto". Para quem faz bolo é o ícone errado, e o pacote pede "nada de biscoito"
(`DESIGN.md` § Iconography). Vira `PackageOpen` nos três — o pote aberto é o que está pronto
para sair. Se no navegador ele ler como "encomenda", `Archive`. Um ícone, três lugares, a
mesma escolha.

#### 3.B.8 Documentação da B

`#d124` e `#d125` em `DECISOES.md`. `ESTADO.md`: seção da 033-B, a saída de `gerar-icones.mjs`,
e o lembrete de aparelho: **reinstalar o app** (roteiro, passo 8).

### Sessão C · O ponto, a faixa e as palavras

#### 3.C.1 A faixa de composição — `#d126`

- **`domain/custoFicha.ts`**: `composicaoDoLote(custo: CustoFichaCalculado): Segmento[]`, com
  `Segmento = { rotulo: string; centavos: Centavos; fracao: number; destaque: boolean }`. As
  parcelas e a ordem são as das linhas de `FormularioFicha.tsx:1220-1245` — Materiais,
  Embalagem, (Componentes, Escolhas, quando existem), Sua hora, Gás e energia, Fixos rateados.
  `destaque: true` só em "Sua hora". Parcelas zeradas saem da lista; total zero devolve `[]`.
  `fracao` soma 1 dentro de arredondamento; sem mexer em centavo.
- **`tests/domain/custoFicha.test.ts`**: o caso de aceite da 2B número por número — 6240 · 900 ·
  1120 · 360 · 200 sobre 8820 (o cookie clássico de `MARCA.md` § 1.1 é o mesmo da spec 002),
  frações 0,7075 · 0,1020 · 0,1270 · 0,0408 · 0,0227 — mais custo zero e um kit com
  componentes.
- **`components/fichas/FaixaDeComposicao.tsx`**: `<div role="img" aria-label="Materiais 71%,
Embalagem 10%, …">` de 10px, `rounded-[3px] overflow-hidden`, um filho por segmento com
  `flex: fracao`. Cores em **opacidade de `ink`** — `bg-ink/90`, `/60`, `/40`, `/25`, na ordem
  — e `bg-accent-500` no destaque. Não os `brand-400/500` do pacote: `brand-700` sobre a
  superfície escura (`0.235`) some, e `ink` já inverte sozinho. Sem gap entre segmentos; a
  luminância separa. Fica **acima** das linhas de `Parcela`, dentro de "O custo do lote"
  (`FormularioFicha.tsx:1214`); as linhas são a legenda, e a de "Sua hora" ganha
  `text-accent-ink font-semibold` para casar com o segmento — é a única linha colorida.
- Onde mais o custo é aberto parcela por parcela e a faixa **não** entra: `insumos/ResumoCusto`
  (é um material, não um lote) e a folha do orçamento (é dela).

#### 3.C.2 O ponto

- **`fichas/PainelPreco.tsx:151-171`**: no caso positivo, o `CornerDownRight` de `ink-subtle`
  vira o ponto — `<span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full
bg-accent-500">`. É o número que decide ("Sobram R$ 3,19"), e é o único lugar do app em que o
  ponto marca dado. Nos casos de atenção o `TriangleAlert` fica: duas peças âmbar na mesma
  tela é erro (`MARCA.md` § 2.2), e o alerta é a que fala.
- **`ui/EstadoVazio.tsx`**: o título termina em ponto em todos os textos de `MARCA.md` § 3.4
  ("Sua despensa começa aqui."). O ponto final vira o ponto âmbar: `<span aria-hidden
className="ponto">` mais `<span className="sr-only">.</span>`. É a construção do logotipo
  aplicada a uma frase, um `<span>`, e cobre os cinco estados vazios de uma vez. **Fácil de
  rejeitar**: se no navegador ler como truque, o span sai e o estado vazio fica sem assinatura
  — o manual permite, a prancha é que não.
- Nenhum outro ponto. `rg -n "bg-accent-500" src/` ao fim deve devolver: botão primário,
  flutuante, `Logotipo`, `Simbolo`, `PainelPreco`, `EstadoVazio`, `FaixaDeComposicao`. Qualquer
  outra linha é uma segunda peça âmbar disputando.

#### 3.C.3 A frase dela — a aprovação

- `lib/types/configuracao.ts`: `ConfiguracaoGeral.frase?: string` — "Uma frase sua, para o
  rodapé do orçamento." Opcional, aditivo; `esquemaConfiguracao` em `schemas.ts` ganha
  `frase: z.string().max(80).optional()`.
- `/configuracao`, bloco de contato (o mesmo de telefone e Instagram, spec 017B), em "Mais
  detalhes": campo "Frase do orçamento", dica "Aparece embaixo da folha, ao lado do seu
  contato." `salvarConfiguracao` grava como grava os outros.
- `domain/orcamento.ts`: `Orcamento.negocio.frase?: string`, lida da configuração como
  `telefone` e `instagram` são lidos. Teste: com e sem.
- `FolhaOrcamento.tsx:217-228`: à esquerda, `nome · telefone · @instagram`; ao centro, a frase
  dela quando houver; à direita, `feito com Rende` em `text-ink-subtle`. A constante
  `FRASE_RODAPE` da B **sai**. **A conta real precisa preencher o campo uma vez** — vai para o
  `ESTADO.md` ao lado da nota do Pix (`#d98`).

#### 3.C.4 As palavras — `/impeccable clarify`

`MARCA.md` § 3.4 traz vinte microcopy. As que têm tela hoje entram; as que não têm, não:

| #     | Onde                                   | Entra?                                                                                                   |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1–2   | `(app)/insumos/page.tsx`, estado vazio | Sim. O botão da biblioteca já se chama assim.                                                            |
| 3–4   | `fichas/ListaFichas.tsx:189-190`       | Título e frase sim; a ação continua sendo a da biblioteca.                                               |
| 5–6   | `/pedidos`, estado vazio               | Sim.                                                                                                     |
| 7–8   | `/financeiro`, estado vazio            | Sim.                                                                                                     |
| 9–10  | `/compras`, estado vazio               | Sim.                                                                                                     |
| 11    | selo de escrita pendente               | Só se o selo puder contar pendências; senão fica "salvo no aparelho".                                    |
| 12    | `offline/page.tsx`                     | Sim, título e frase.                                                                                     |
| 13    | teste acabando                         | **Não** — é a 028.                                                                                       |
| 14    | selo "custo desatualizado"             | Conferir que é essa a palavra; se for, nada muda.                                                        |
| 15    | faixa de custo desatualizado           | **Não** — é a 024.                                                                                       |
| 16–19 | frases de capacidade, meta e prejuízo  | Já existem em `domain/`; comparar tom, não substituir. `#d117` manda: as palavras dela ganham do manual. |
| 20    | confirmação destrutiva de pedido       | Conferir o modal existente contra o modelo; ajustar só se disser menos.                                  |

Regras da passagem: o travessão sai da cópia de interface (o `/impeccable` o proíbe; vírgula,
dois-pontos ou ponto no lugar — "Cadastre o que você compra: farinha, saquinho, caixa. O custo
de cada doce sai sozinho."); nenhuma palavra da lista de proibidas de `MARCA.md` § 3.3 entra;
e o `<h1>` do login já foi na B. `rg -n "insumo|ficha técnica|dashboard|onboarding|sincroniza"
src/components src/app` ao fim: o que sobrar em texto de tela é da 021 ou desta, e a spec diz
qual.

#### 3.C.5 A passagem do `/impeccable`

É o que o pedido desta spec nomeou: os traços de interface gerada por IA. Uma parte já foi
tratada na seção 1 (o que do pacote não entrou). A outra parte só aparece com a marca aplicada,
e é esta:

1. **`/impeccable critique`** em cinco telas, nos dois temas, 360px e 1280px: `/login`, `/`
   (Hoje), `/fichas/[id]` (o painel de preço e a faixa), `/pedidos`, `/financeiro`. O comando
   exige duas avaliações isoladas (dois `Agent`) — é o protocolo do próprio comando, e é o
   único lugar desta spec em que sub-agentes entram. O relatório, com a tabela de heurísticas,
   vai para o `ESTADO.md` **antes** de qualquer conserto.
2. **Consertar o que a critique classificar P0 e P1**, e mais estas quatro verificações que a
   marca nova torna necessárias, critique ou não:
   - **Um botão primário por tela.** Percorrer as 26 ocorrências de `variante="primaria"`. Onde
     uma tela mostra dois âmbar ao mesmo tempo (botão flutuante mais botão de rodapé; painel
     aberto sobre tela com flutuante), o de menor consequência vira `secundaria`. Anotar cada
     troca.
   - **Anel de foco sobre o botão âmbar.** Tab até o primário em `/login` nos dois temas: o
     anel precisa ser distinguível do fundo. Se não for, `outline-color: var(--brand-700)` só
     no `:focus-visible` do primário, e a `#d123` ganha a nota.
   - **Contraste recomputado.** `LEIA-ME.md` avisa que as razões do pacote são aproximadas.
     Medir no DevTools os pares que a marca criou: `on-accent` sobre `accent-500` nos dois
     temas, `accent-ink` sobre `canvas` e sobre `surface` nos dois, `on-brand-muted` sobre
     `brand-800`, `attention` sobre `attention-soft` no escuro. Piso: 4,5 texto, 3 ícone.
     Reprovou, muda o token e a `#d123` registra o valor.
   - **O teste da desassociação, em tela.** Abrir `/fichas/[id]` no celular ao lado da caixa
     da MyCookie's. Se sobrar um traço que diga "mesma marca", é bug desta spec.
3. **`/impeccable audit`** nas mesmas cinco telas: a11y e responsivo. É onde o `role="img"` da
   faixa, o `sr-only` do ponto e os alvos de toque são conferidos por máquina.
4. **`/impeccable polish`** por último, com a barra de qualidade "flagship": é o produto que vai
   ser vendido. `npx impeccable --json src/` de novo; a contagem antes (seção 2) e depois vão
   para o `ESTADO.md`.

#### 3.C.6 Documentação da C

`#d126` e `#d127` em `DECISOES.md`. `ESTADO.md`: seção da 033-C, o relatório da critique
(antes e depois), as trocas de primário, a nota "a conta real precisa preencher a frase",
e a linha 33 da tabela como "pronto (A, B e C)". `docs/saas/ROADMAP.md`: a 028 ganha uma linha —
"desligar o 'feito com Rende' na folha é da assinatura (`#d127`)".

---

## Roteiro de navegador

Precisa da **conta real**, dos dois temas (DevTools → Rendering → `prefers-color-scheme`), de
360px e 1280px, e de um aparelho nos passos 8 e 12.

**Depois da A (A e B ainda não publicadas):**

1. `/` nos dois temas: nenhum vinho, nenhum dourado, nenhum grão de papel. Superfícies creme
   no claro, tinta azul-preta no escuro. `rg -n "wine|gold" src/` vazio.
2. `/fichas/[id]`: o botão do painel é âmbar com tinta escura; o "Usar" terciário é `brand-ink`;
   o foco por Tab é um anel âmbar visível em todos os controles.
3. Navegação inferior a 360px: destino ativo em ocre escuro (claro) e âmbar claro (escuro),
   pílula do ícone visível nos dois temas. Nenhum `#D89B3C` como texto.
4. Barra lateral a 1280px: fundo `brand-800`, ativo `brand-700` cheio, hover mais claro que o
   ativo, sem faixa lateral, sem filete.
5. `/financeiro` com meta batida e `/comecar` com passo atual: o estado continua dito sem o
   filete.

**Depois da B (publicar A+B juntas):**

6. `/login` a 1280px: painel `brand-800` com "rende" em creme e o ponto âmbar, tagline em
   Archivo 600; a 360px, "rende" em tinta acima de "Entrar". Nenhum biscoito em tela nenhuma:
   `rg -n "Cookie" src/components src/app --glob '!**/marca/**'` só devolve texto de produto.
7. Aba do navegador: favicon novo, título "Rende" e "Pedidos · Rende".
8. **Aparelho.** Desinstalar e reinstalar o app no Android e no iPhone: ícone novo na tela de
   início, quadrado sem canto dobrado dentro do canto do sistema; barra do sistema `#2A2C3A` no
   app instalado; tela de abertura creme com o ícone. É o passo que prova o `#d124` e a decisão
   de regenerar os PNGs.
9. `/pedidos/[id]/orcamento` → imprimir → PDF: cabeçalho com o nome do negócio, total em tinta,
   rodapé com "Feito com amor em cada mordida." ainda lá. Nenhum logotipo, nem o dela nem o
   nosso.
10. `/fichas/contagem` e o cartão "O que está pronto" em `/comecar`: o ícone é o pote aberto.

**Depois da C:**

11. `/fichas/[id]` com o cookie clássico: a faixa acima das cinco linhas, o segmento âmbar
    alinhado com a linha "Sua hora" em ocre; o `aria-label` lido pelo leitor de tela diz as
    cinco parcelas com percentual. Rendimento zero: faixa nenhuma, sem espaço vazio no lugar.
    No painel, "Sobram R$ 3,19" com o ponto à frente; preço abaixo do custo: o triângulo, e
    nenhum ponto.
12. **Aparelho, a meio metro, luz de cozinha:** os três números do painel e o "Sobram" são
    lidos antes de qualquer outra coisa. É o teste da bancada de `BRIEF-MARCA.md` § 11.
13. Os cinco estados vazios (conta de teste vazia): título com o ponto âmbar no lugar do ponto
    final, frase sem travessão, ação. Leitor de tela lê o ponto final.
14. `/configuracao` → "Mais detalhes" do contato → "Frase do orçamento": preencher, salvar,
    imprimir o orçamento: a frase no rodapé ao lado do contato, "feito com Rende" à direita em
    cinza. Sem frase: o rodapé fecha sem buraco.
15. A critique antes e depois: a nota total subiu ou a spec diz por que não.

---

## Critérios de aceite

**A**

- [x] `rg -n "wine|gold|--mc-|textura-papel|filete-dourado" src/` devolve **zero** linhas.
- [x] `globals.css` `:root` e `@media dark` batem com `docs/marca/rende/tokens.css` linha a
      linha, exceto: sem `[data-theme]`, mais `--on-accent`, `--on-brand-muted`, e o valor escuro
      de `--brand-100`.
- [x] A escala de texto e os raios do `@theme inline` são os de antes, byte a byte.
- [x] Botão primário e flutuante âmbar; terciário `brand-ink`; navegação inferior `accent-ink`;
      barra lateral sem faixa lateral.
- [x] `DESIGN.md`, `PRODUCT.md` e `CLAUDE.md` da raiz reescritos; `load-context.mjs` devolve os
      dois sem placeholder.
- [x] `#d122`, `#d123`; `#d111` e `#d120` anotados; `ROADMAP.md:11` riscada.

**B**

- [ ] `rg -n "MyCookie|Biscoitos artesanais|Cookie\b" src/ --glob '!**/lib/domain/**' --glob
  '!**/tests/**'` devolve só `types/conta.ts` (exemplos) e texto de produto (placeholders de
      ficha, biblioteca).
- [ ] `Marca.tsx` exporta `Simbolo` e `Logotipo`, e nada mais.
- [ ] Os três PNGs regenerados pelo script a partir do SVG novo, quadrados; a saída do script no
      `ESTADO.md`.
- [ ] Manifesto e metadata dizem "Rende"; `theme_color` `#2A2C3A`; `background_color` `#F7F4EE`.
- [ ] A folha do orçamento sem logotipo, com o nome dela em display, e a frase dela ainda no
      rodapé.
- [ ] `#d124`, `#d125`; `LEIA-ME.md` com "Como está no código".

**C**

- [ ] `composicaoDoLote` testada com o caso de aceite (frações acima), custo zero e kit;
      `npm test` com **os testes de antes mais estes** — nenhum teste existente muda.
- [ ] `rg -n "bg-accent-500" src/` devolve só os sete lugares da 3.C.2.
- [ ] `ConfiguracaoGeral.frase` gravada por `salvarConfiguracao`, lida por `orcamento.ts`,
      impressa na folha; `git diff src/lib/types/` mostra **só** esse campo.
- [ ] Estados vazios 1–10 e 12 com a cópia de `MARCA.md` § 3.4, sem travessão; nenhuma palavra
      da lista de proibidas em `src/components` e `src/app`.
- [ ] Relatório da critique antes e depois no `ESTADO.md`; P0 e P1 consertados ou recusados com
      motivo; contagem do `npx impeccable` antes e depois.
- [ ] Contraste medido dos seis pares da 3.C.5; qualquer token alterado registrado na `#d123`.
- [ ] `#d126`, `#d127`; `ROADMAP.md` 028 anotada.

**As três**

- [ ] `git diff src/lib/domain/ src/lib/firebase/ firestore.rules firestore.indexes.json` —
      na A e na B, vazio (a B toca um comentário em `firestore.rules`; a C toca
      `domain/custoFicha.ts`, `domain/orcamento.ts` e `schemas.ts`, e nada em `firebase/` além
      de `salvarConfiguracao` passar o campo). `package.json` sem linha nova.
- [ ] `lint`, `typecheck`, `test` e `build` passam, com o resultado real relatado.

---

## Fora de escopo

- **Tudo de `Rende — Aplicações.dc.html`**: página de venda, e-mail de boas-vindas e de teste
  acabando, Instagram, adesivo, lâmina. São da 027 e da 028, ou de canal, e não são tela do app.
- **Generalizar a biblioteca de partida e os exemplos de produto** ("Cookie clássico",
  `placeholder="Cookie de chocolate meio amargo"`, "Comece com um cookie que já tem preço"). É
  conteúdo do produto, e o que o generaliza são as entrevistas da fase 1, não a marca.
- **Alternador de tema** (`[data-theme]`). O app segue o sistema, e ninguém pediu.
- **Desligar o "feito com Rende"** na folha. É da 028 (`#d127`).
- **Renomear** `package.json`, a pasta do repositório, o projeto Firebase (`mycookies-mrc`), o
  projeto Vercel, a conta `contas/mycookies`. São identificadores de infraestrutura e de dado;
  nenhum aparece para a usuária. O que aparece — nome, ícone, cor, palavra — é o que esta spec
  troca.
- **Animação de abertura** (`DESIGN.md` § Motion): o PWA não tem tela de abertura própria; o que
  existe é o `background_color` e o ícone, e estão na B.
- **A escala tipográfica e os raios do pacote.** Recusados na seção 1; o `DESIGN.md` da raiz
  passa a ser a fonte, e o do pacote fica como veio.
- **Verificar `rende.com.br`, `@rende.app`, INPI.** É de quem conduz o projeto, e antes de
  imprimir qualquer coisa — não antes desta spec.
- **Faixa de composição fora do editor de produto** (lista de produtos, folha, tela Hoje).
  Uma assinatura por peça, e a do editor já é a faixa.

---

## Decisões desta spec que são fáceis de rejeitar

- **Três sessões, com A e B no mesmo deploy.** A alternativa é A+B numa sessão só: 38 arquivos
  de classe, `globals.css` inteiro, `Marca.tsx`, ícones, manifesto, login, barra, folha. Dá, e é
  o tipo de sessão em que a folha do orçamento sai com o total em vinho porque alguém esqueceu
  uma linha. Duas sessões com um diff conferível cada, e um deploy só.
- **O logotipo em HTML, e não o SVG do pacote.** O SVG usa `<text>` em Archivo — a fonte
  precisa estar carregada de qualquer jeito, e no HTML ela já está. `currentColor` dá a
  negativa de graça. O preço: se um dia o "rende" precisar sair do app (e-mail, PDF sem Archivo
  embutida), é o SVG em curvas que o `LEIA-ME.md` já pede.
- **Regenerar os PNGs em vez de copiar os do pacote.** O pacote os rasterizou com o canto
  arredondado; o `#d44` explica por que isso aparece como falha no aparelho. Duas linhas no
  script que já existe.
- **`ink` com opacidade nos segmentos da faixa, e não `brand-400/500`.** O pacote nomeou
  `brand-400` "segmento neutro da faixa" e não pensou no escuro, onde `brand-700` some sobre
  `surface`. `ink` inverte sozinho e dá quatro degraus de luminância sem token novo. Se o
  `/impeccable audit` reclamar de contraste entre segmentos adjacentes, um `gap-px` resolve.
- **O ponto como ponto final do título do estado vazio.** É a construção do logotipo aplicada a
  uma frase, e cobre cinco telas com um `<span>`. Pode ler como truque — está marcado assim na
  3.C.2, e sai sem deixar rastro.
- **Recusar a escala 15/13 do pacote.** O pacote é o design system da marca e diz 15/13; a
  usuária 0 usou 16/14 na bancada e foi o que passou no único teste que houve. Se a segunda
  confeiteira achar a tela grande, é uma linha no `@theme inline` e a `#d123` registra.
- **`background_color` claro, contra o "abertura em brand-800" do pacote.** Ícone escuro sobre
  fundo escuro é o argumento. Se no aparelho o creme parecer flash antes do tema escuro,
  `#1C1E28` é uma linha e uma reinstalação — e a `#d124` ganha a nota.
- **`frase` como campo, e não a constante morrendo.** Sem o campo, a Maynara perde uma frase
  que as clientes dela leem há meses, por causa de uma decisão nossa. Um campo opcional, um
  input em "Mais detalhes", uma linha na folha.
- **"feito com Rende" fixo, sem toggle.** O manual pede desligável. Hoje ninguém paga; quando
  pagar, desligar é o que a assinatura compra. A 028 recebe a linha.
- **`PackageOpen` para "o que está pronto".** Poderia ser `Archive`, `Boxes`, `Refrigerator`.
  O pote aberto é o mais próximo de "pronto para sair"; a B confere no navegador e troca se
  ler como encomenda.
- **`/impeccable critique` com dois sub-agentes.** É o protocolo do comando, e a única vez nesta
  spec em que sub-agentes entram. Se o ambiente não permitir, o comando prevê o caminho
  sequencial — a spec só pede que o relatório exista antes dos consertos.

---

## Riscos

- **A troca de classes por `sed` acerta o nome e erra o papel.** `wine-700` era cor de botão
  primário e de pílula ativa e de fundo de item ativo; `brand-700` é só os dois últimos. A 3.A.3
  lista os quatro lugares onde a troca é semântica; se houver um quinto, ele aparece como um
  botão azul-preto onde deveria ser âmbar, e o passo 2 do roteiro pega.
- **Âmbar e atenção no mesmo matiz.** É o risco declarado do território (`LEIA-ME.md`). O botão
  primário âmbar ao lado de uma faixa de atenção âmbar (`PainelPreco` com prejuízo) é a tela em
  que isso dói. A regra que salva é a de sempre — ícone e palavra na atenção — e a 3.C.2 tira o
  ponto quando o alerta está falando. Se ainda assim confundir, a atenção escurece
  (`--attention` já é ocre, não âmbar) e a `#d123` registra.
- **O anel de foco âmbar sobre o botão âmbar.** Tratado na 3.C.5; se o `outline-offset` não
  bastar, a saída está escrita.
- **`theme_color` assado no WebAPK.** Até reinstalar, barra vinho sobre app azul-preto no
  celular da Maynara. Não tem contorno; tem o passo 8.
- **Archivo não tem 400.** Qualquer `font-display font-normal` que sobreviver renderiza em 600
  (o mais próximo carregado) sem avisar. `rg -n "font-display" src/ | rg "font-normal"` na A.
- **A folha em `bg-ink`.** No `.folha` os tokens são fixos no claro, então `ink` é `#22242E` —
  praticamente o `brand-700`. Visualmente igual ao que a `#d127` quis evitar; semanticamente
  certo. Se um dia a confeiteira tiver cor própria (`#d117` para a marca dela), é este token que
  ela troca.
- **A critique reprova o que a marca acertou.** O `/impeccable` tem opinião sobre display fonts
  em valores financeiros ("display fonts in data") e o pacote põe Archivo no valor em destaque.
  O `DESIGN.md` da raiz é a autoridade; a critique é relatório, não veredito, e a spec pede
  conserto de P0 e P1 — o que for divergência de gosto se recusa por escrito no `ESTADO.md`.
- **`npx impeccable` não roda** (sem rede, pacote indisponível). O critério de aceite da
  contagem vira "não rodou, e por quê"; a critique dos sub-agentes não depende dele.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, em cada uma das
três sessões, com o resultado real relatado. Mais o roteiro da sessão, e o passo 8 no aparelho
antes de dar a B por fechada — é a única forma de ver o ícone e a barra que o `#d124` decidiu.
Com a C, o produto passa no teste da desassociação de `BRIEF-MARCA.md` § 11 pela primeira vez, e
o próximo passo volta a ser o que era antes desta spec: a fase 1 do roadmap, com a 023 e as
entrevistas antes dela.
