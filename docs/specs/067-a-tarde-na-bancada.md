# Spec 067 · A tarde na bancada

**Tipo:** o topo de `/conheca` ganha dois movimentos de ambiente: a luz da janela sobre a
bancada, em laço lento, e o preço do chute riscado à mão no título. **Nenhum campo, nenhuma
consulta, nenhuma regra de negócio, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** conversa de 2026-10-01: a página é "bonita, mas lavada", e as páginas de venda de
referência (Stripe) têm sempre algo em movimento. A regra que proibia isso caiu em `#d254`.
**Depende de:** `#d254` (o § Motion do `DESIGN.md`, tipo "Ambiente").
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d255`.

---

## Problema

O topo de `/conheca` é papel cru, tinta e um cartão. A única coisa que se mexe é a faixa da conta
abrindo, uma vez, em menos de um segundo (spec 036). Depois disso a página fica parada e quase
monocromática. É bonita, mas não tem vida, e não lembra a cozinha de onde o produto saiu.

O `DESIGN.md` parte de uma cena: "a confeiteira com o celular apoiado na bancada às duas da tarde,
cozinha iluminada". A página nunca mostrou essa cena. O título diz o preço certo, mas não mostra o
que ele corrige.

---

## 1 · O que esta spec decide

### A luz da janela: `#d255`

- **O que é.** Uma mancha de sol morna, com a sombra em cruz de um caixilho de quatro vidros,
  caindo sobre o papel **atrás e em volta do cartão da conta**, como se o cartão estivesse na
  bancada embaixo da janela. No desktop, na coluna da direita; no celular, atrás do cartão,
  abaixo do botão. Nunca atrás do título nem do parágrafo: o contraste do texto não muda.
- **Como se mexe.** Entra com `opacity` de 0 a 1 em 1,2s, `ease-quart`, junto com a página. Depois,
  um laço de 30s ida e volta, na curva de seno do `DESIGN.md`: desliza uns 3% na horizontal e gira
  menos de 1°, como a tarde passando. Só `transform` e `opacity`.
- **De que é feita.** Um elemento decorativo (`aria-hidden`, `pointer-events: none`), com bordas
  suaves e a cruz do caixilho por gradiente e `mask`, sem imagem. A cor é um token novo,
  `--luz-da-janela`, do código e não do pacote, ao lado de `--on-accent`: no claro, um
  `color-mix` do `--accent-100` com o papel; **no escuro, transparente**. O tema escuro é o da
  noite, e de noite não entra sol pela janela. O token resolve os dois blocos escuros
  (`prefers-color-scheme` e `[data-theme]`) sem seletor novo.
- **Pausa.** Fora da tela, um `IntersectionObserver` põe `animation-play-state: paused`. Com a aba
  oculta, o navegador já para. O componente é `src/components/site/LuzDaJanela.tsx`, cliente, e só
  ele: a página continua sendo do servidor.
- **Movimento reduzido.** Sem entrada e sem laço: a luz já está lá, parada, no quadro do meio do
  laço.

### O chute riscado: `#d255`

- No título, entre "Você deveria cobrar" e o preço sugerido, entra o preço praticado do `EXEMPLO`
  (`precoPraticado`, hoje R$ 8,00) em `--ink-muted`, **riscado por um traço de caneta**: o preço
  que ela cobra hoje, corrigido.

  > Este cookie te custa R$ 4,41. Você deveria cobrar ~~R$ 8,00~~ R$ 8,50.

- O número sai do `EXEMPLO` e de `formatarMoeda`, como os outros dois (`#d173`). Se
  `precoPraticado` for igual ao preço arredondado, ou o sugerido não for `ok`, o riscado não
  aparece.
- **O traço.** Um SVG com um caminho fixo levemente ondulado, de ponta arredondada, em `--ink`, por
  cima do número, um pouco mais largo que ele (`preserveAspectRatio="none"`,
  `vector-effect: non-scaling-stroke`). É a caneta da confeiteira, e não o âmbar: o ponto é o
  único âmbar do topo, e um risco âmbar seria um segundo ponto.
- **Como se mexe.** O texto do título aparece pronto, inclusive o R$ 8,00 (a 036 proíbe o título
  em cascata, e `#d254` manteve isso). Só o traço se desenha, da esquerda para a direita, por
  `clip-path: inset(...)`, em 600ms `ease-quart`, 400ms depois da carga. Uma vez, sem laço.
  Com movimento reduzido, o traço já está desenhado.
- **Leitor de tela.** O riscado inteiro (número e traço) é `aria-hidden`: o título continua sendo
  lido "Você deveria cobrar R$ 8,50". O preço praticado já é dito no cartão ("No preço praticado
  de R$ 8,00 sobram…").
- O par "R$ 8,00 R$ 8,50" não quebra entre linhas (`whitespace-nowrap`).

---

## 2 · Antes de tocar em código

- Ler o topo de `src/app/conheca/page.tsx`, a `ContaAberta` e o bloco `.conta-que-abre` de
  `globals.css`. O comentário dele diz "É o único movimento da página": passa a dizer o que se
  move e onde está a regra.
- Conferir em 390px se o título com o riscado ainda cabe em quatro linhas e se a luz não cria
  rolagem horizontal (o contêiner do topo corta com `overflow-x: clip`).
- Não existe `IntersectionObserver` no projeto: escrever o de `LuzDaJanela` no próprio componente,
  sem hook genérico.

---

## 3 · Escopo

- `src/components/site/LuzDaJanela.tsx`: novo, cliente.
- `src/app/conheca/page.tsx`: o riscado no `h1` e a `LuzDaJanela` em volta da `ContaAberta`.
- `src/app/globals.css`: o token `--luz-da-janela` (claro e os dois escuros), as duas animações,
  o laço de seno e o bloco de movimento reduzido.
- `DESIGN.md`: o token novo na lista dos que são do código (§ Tokens no código).

---

## 4 · Roteiro de navegador

1. 1440px, tema claro: a luz entra com a página e desliza devagar atrás do cartão; o traço risca o
   R$ 8,00 logo depois; nada atrás do texto.
2. 390 × 844: o título cabe, o par de preços não quebra, não há rolagem horizontal; a luz fica
   atrás do cartão.
3. Rolar até o preço e voltar: o laço estava parado (DevTools › Animations) e retoma.
4. Tema escuro (do aparelho e pela Configuração): nenhuma luz.
5. Movimento reduzido: a luz parada e o traço já desenhado, nada some.
6. Leitor de tela: o título é lido sem o R$ 8,00.
7. Lighthouse no celular: o LCP não piora em relação a `main`.

---

## Critérios de aceite

- [ ] A luz da janela atrás do cartão, com entrada e laço, pausada fora da tela, ausente no escuro.
- [ ] O preço praticado riscado no título, traço em `--ink`, desenhado uma vez, fora da leitura.
- [ ] Movimento reduzido: tudo parado no quadro final.
- [ ] Nenhum valor de cor solto; nenhuma dependência.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d255` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **A luz pela hora do visitante** (de manhã de um lado, à tarde do outro). De noite não há sol, e
  é de noite que ela mais navega; volta se a luz fixa funcionar.
- **A foto da bancada no topo** e o cinemagraph. É a próxima alavanca se o topo continuar lavado,
  e mexe no LCP.
- **Movimento de ambiente no app** (estado vazio, meta batida). `#d254` permite, mas cada um é
  outra spec.
- **`/como-calcular-o-preco-do-cookie`.** A `ContaAberta` dela é `parada` (spec 037) e fica.
- **"A manteiga subiu" em laço no cartão.** Ideia da mesma conversa, com spec própria se vier.
