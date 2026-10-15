# Design

Sistema visual do Rende. A regra de uso mora aqui; os valores vivem em `src/app/globals.css`,
com os mesmos nomes de `docs/marca/rende/tokens.css`. Onde este arquivo e o pacote da marca
divergem (escala, um raio, a navegação, a faixa, movimento), **este é o que vale**: o motivo
está em `DECISOES.md#d381` (território Porções), `#d125` e `#d254`.

## Visual Theme

**Um instrumento de precisão em mãos experientes.**

Território "Porções". Cobalto (`--brand-700`, matiz OKLCH 266) como cor de marca, um rosa
(`--accent-500`, matiz 5) que marca **só o que sobra pra ela**, papel quente como superfície. A
assinatura é o corte de 8°: a marca divide as coisas em porções. A cor não decora: o cobalto é
cromo, o rosa é a sobra.

O rosa e o vermelho de erro (matiz 32) são vizinhos. Separam-se por luminosidade (rosa claro,
vermelho escuro) e por regra: **cor nunca é o único portador de significado**, e todo negativo
leva `trending-down` e palavra. O informativo é petróleo (matiz 205), longe do cobalto.

### Tema

**Claro por padrão.** A cena que decide isso: a confeiteira com o celular apoiado na bancada às
duas da tarde, cozinha iluminada, farinha na mão. Um painel escuro nessa luz é ilegível.

**Escuro suportado**, seguindo `prefers-color-scheme`, para o uso noturno de planejamento. Não é um "modo
escuro" colado; é a mesma marca com os papéis trocados. No escuro o cobalto vira noite e o papel vira tinta. Na Configuração, "Tema" (Do aparelho ·
Claro · Escuro) passa por cima do sistema, neste aparelho (`#d244`).

Celular primeiro; o desktop é a versão confortável do mesmo desenho. Offline é o estado normal.

### Color Strategy

**Contida no conteúdo, comprometida no cromo.**

O cobalto aparece cheio e sólido no cromo: barra lateral do desktop, botão primário, pílula
ativa e, no app instalado, a tira sob a barra de status. O cabeçalho de contexto fica no papel
(`#d243`). As superfícies onde moram os números ficam em neutros quentes, para a densidade
respirar. O rosa é a porção: o valor "sobram R$ X pra você", uma por tela. Nunca botão, nunca
prejuízo, nunca área grande.

Nenhum neutro é puro. No tema claro os neutros carregam a matiz 85 (o calor do papel) em croma
0.004–0.012 e as tintas a matiz 266; no escuro tudo carrega a matiz 266 (a noite do cobalto).

Proporção: ~70% papel · ~25% cobalto · ~5% rosa.

## Color Palette

Tudo em OKLCH; o hex ao lado é leitura, não produção.

### Marca

| Token          | OKLCH                   | hex       | Uso                                                       |
| -------------- | ----------------------- | --------- | --------------------------------------------------------- |
| `--brand-900`  | `oklch(0.20 0.070 266)` | `#071335` | reservado (tarja sobre foto)                              |
| `--brand-800`  | `oklch(0.27 0.110 266)` | `#0D1F5B` | barra lateral, painel de marca do acesso                  |
| `--brand-700`  | `oklch(0.38 0.150 266)` | `#1C3891` | **primária**: botão primário, pílula ativa, seleção       |
| `--brand-600`  | `oklch(0.46 0.160 266)` | `#2D4FB0` | hover do botão e de superfície de marca                   |
| `--brand-500`  | `oklch(0.56 0.140 266)` | `#4D6FC6` | anel de foco, divisória sobre marca                       |
| `--brand-400`  | `oklch(0.66 0.100 266)` | `#7590D0` | o trabalho dela na faixa do custo da `/conheca` (`#d382`) |
| `--brand-300`  | `oklch(0.76 0.070 266)` | `#9CB1DF` | ícone desativado                                          |
| `--brand-200`  | `oklch(0.87 0.040 266)` | `#C8D4EF` | borda sobre marca; é o `--on-brand-muted`                 |
| `--brand-100`  | `oklch(0.95 0.018 266)` | `#E9EFFB` | realce frio: opção escolhida, hover terciário, pílula nav |
| `--accent-600` | `oklch(0.66 0.140 5)`   | `#D76A87` | rosa pressionado (reservado)                              |
| `--accent-500` | `oklch(0.76 0.120 5)`   | `#F190A7` | **a porção**: o que sobra pra você, e só                  |
| `--accent-300` | `oklch(0.86 0.070 5)`   | `#FABECB` | reservado                                                 |
| `--accent-100` | `oklch(0.94 0.030 5)`   | `#FEE3E8` | reservado                                                 |
| `--accent-ink` | `oklch(0.50 0.150 5)`   | `#A53458` | rosa como texto (reservado; hoje nenhum uso)              |
| `--on-accent`  | `oklch(0.20 0.070 266)` | `#071335` | tinta dentro da porção                                    |

O rosa sobe no escuro (`--accent-500` → `oklch(0.80 0.11 5)`, `#FA9FB4`). `--brand-100` ganha
valor escuro (`oklch(0.30 0.060 266)`) porque é fundo de hover e de opção escolhida, e o claro
do pacote seria um flash sobre o tema escuro.

### Superfícies

| Token              | Claro                               | Escuro                               |
| ------------------ | ----------------------------------- | ------------------------------------ |
| `--canvas`         | `oklch(0.972 0.008 85)` · `#F8F5F0` | `oklch(0.18 0.045 266)` · `#081025`  |
| `--surface`        | `oklch(0.995 0.004 85)` · `#FFFDFA` | `oklch(0.225 0.050 266)` · `#111A33` |
| `--surface-sunken` | `oklch(0.945 0.010 85)` · `#F0ECE5` | `oklch(0.155 0.040 266)` · `#050B1D` |
| `--border`         | `oklch(0.885 0.010 85)` · `#DCD9D2` | `oklch(0.31 0.045 266)` · `#263047`  |
| `--border-strong`  | `oklch(0.78 0.012 85)` · `#BBB7AF`  | `oklch(0.42 0.045 266)` · `#414D66`  |
| `--ink`            | `oklch(0.22 0.040 266)` · `#121A2D` | `oklch(0.955 0.006 85)` · `#F2F0EC`  |
| `--ink-muted`      | `oklch(0.50 0.030 266)` · `#5B6375` | `oklch(0.76 0.025 266)` · `#AAB1C2`  |
| `--ink-subtle`     | `oklch(0.63 0.022 266)` · `#838997` | `oklch(0.62 0.030 266)` · `#7E8699`  |
| `--on-brand`       | `oklch(0.965 0.008 85)` · `#F6F3ED` | igual                                |
| `--on-brand-muted` | `var(--brand-200)` · `#C8D4EF`      | igual                                |
| `--brand-as-ink`   | `var(--brand-700)` · `#1C3891`      | `oklch(0.82 0.080 266)` · `#ACC4F9`  |

`--brand-as-ink` é a marca **como tinta** sobre a superfície: link, ícone de seleção, destino
ativo da navegação inferior, barra de progresso, borda da opção escolhida, botão terciário, o
segmento "Seu trabalho" da faixa, o logotipo e o símbolo. Inverte no escuro: o `brand-700`
sobre a noite mede ~1,6:1. A marca como **fundo** (barra lateral, botão primário, pílula ativa)
continua `--brand-800` e `--brand-700` nos dois temas: é o cromo que fica constante e a tinta
que inverte. `--focus` é `--brand-500`; sobre o cobalto (`sobre-marca`, barra lateral) vira
`--on-brand`.

### Semânticos

| Papel       | Claro (tinta / fundo) | Escuro (tinta / fundo) | Onde                                                  |
| ----------- | --------------------- | ---------------------- | ----------------------------------------------------- |
| positivo    | `#1A763F` / `#D8F3DE` | `#63CA84` / `#112D1A`  | lucro, entrada de caixa, meta batida                  |
| atenção     | `#865812` / `#F9E5C3` | `#E6B55D` / `#382503`  | despensa baixa, custo desatualizado, escrita pendente |
| negativo    | `#AF2D18` / `#FFE2DB` | `#F47D67` / `#421C15`  | prejuízo, saída, erro                                 |
| informativo | `#086A73` / `#D2EEF1` | `#76C7D0` / `#012D31`  | dica de cálculo (petróleo)                            |

No Tailwind o fundo semântico chama-se `*-soft` (`bg-positive-soft`); no `:root` ele é o
`--*-bg` do pacote.

Cada semântico tem **ícone obrigatório** (Lucide: `trending-up`, `triangle-alert`,
`trending-down`, `info`) e palavra. Nenhum estado depende de cor. **Rosa e negativo são
vizinhos de matiz**: o rosa nunca vai em texto de prejuízo, e o negativo sempre leva
`trending-down`.

### Contraste (AA como piso)

Recomputados de `globals.css` (OKLCH → sRGB → luminância) na troca para o território Porções
(`#d381`). `--ink-subtle` **não é cor de texto**: é ícone e metadado não crítico (3:1). Rótulo
de navegação e o nome de um número são `--ink-muted`.

| Par                                                   | Claro      | Escuro    | Piso                               |
| ----------------------------------------------------- | ---------- | --------- | ---------------------------------- |
| `--ink` sobre `--canvas`                              | 16.0:1     | 16.5:1    | 4.5 ✔                              |
| `--ink-muted` sobre `--canvas` / `--surface`          | 5.5 / 5.9  | 8.8 / 8.0 | 4.5 ✔                              |
| `--ink-subtle` sobre `--surface`                      | 3.45:1     | 4.7:1     | **só ícone e metadado**            |
| `--brand-as-ink` sobre `--surface`                    | 10.2:1     | 9.8:1     | 4.5 ✔                              |
| `--brand-as-ink` sobre `--brand-100` (pílula ativa)   | 9.0:1      | 7.8:1     | 4.5 ✔                              |
| `--on-brand` sobre `--brand-700` (botão)              | 9.4:1      | igual     | 4.5 ✔                              |
| `--on-brand-muted` sobre `--brand-800`                | 10.4:1     | igual     | 4.5 ✔                              |
| `--on-accent` sobre `--accent-500` (porção)           | 8.0:1      | 9.3:1     | 4.5 ✔                              |
| `--accent-500` sobre `--brand-700` (porção no painel) | 4.6:1      | 5.3:1     | 3 ✔                                |
| foco `--brand-500` sobre `--canvas` / `--surface`     | 4.4 / 4.7  | 4.0 / 3.6 | 3 ✔                                |
| foco `--on-brand` sobre `--brand-700` / `--brand-800` | 9.4 / 13.9 | igual     | 3 ✔                                |
| positivo sobre `--canvas` / `--positive-bg`           | 5.2 / 4.8  | 9.3 / 7.3 | 4.5 ✔                              |
| atenção sobre `--attention-bg`                        | 5.0:1      | 7.8:1     | 4.5 ✔                              |
| negativo sobre `--canvas` / `--negative-bg`           | 6.0 / 5.3  | 7.2 / 5.7 | 4.5 ✔                              |
| informativo sobre `--canvas` / `--info-bg`            | 5.8 / 5.2  | 9.7 / 7.6 | 4.5 ✔                              |
| `--border-strong` sobre `--surface` (contorno)        | 1.97:1     | 2.0:1     | **reprova 3:1**; aceito, `#d123`   |
| `--brand-700` sobre `--canvas` (forma do botão)       | 9.6:1      | 1.8:1     | **reprova 3:1 no escuro**; `#d381` |

As duas exceções aceitas têm o mesmo motivo: o contorno e a forma não são o único sinal. O
campo tem rótulo e 48px; o botão primário tem o rótulo em `--on-brand` a 9.4:1.

## Typography

Duas famílias, nenhuma serifa.

- **Display: Familjen Grotesk**, peso 700, a mesma do logotipo. Título de página, valor
  financeiro em destaque, número de estado vazio. Nunca em rótulo, botão, tabela, navegação,
  corpo ou microcopy. Só o 700 é carregado: `font-display` em qualquer peso cai nele.
- **Interface: Figtree**, pesos 400 a 700. Humanista, legível a meio metro, com numerais
  tabulares. Carrega rótulo, formulário, tabela, navegação e corpo de texto.

### Escala

Fixa em rem, razão ~1.2. Nada de tipografia fluida: a mesma tela em DPI consistente, e um
título que encolhe dentro de um painel fica pior, não melhor. **É a escala do código, não a
do pacote** (`#d123`): 16px de corpo e 14px de rótulo foram o que a usuária 0 usou na bancada.

| Papel        | Tamanho         | Família / peso                           |
| ------------ | --------------- | ---------------------------------------- |
| `display`    | 2rem / 1.15     | Familjen Grotesk 700                     |
| `title`      | 1.5rem / 1.2    | Familjen Grotesk 700                     |
| `heading`    | 1.25rem / 1.3   | Figtree 600                              |
| `subheading` | 1.0625rem / 1.4 | Figtree 600                              |
| `body`       | 1rem / 1.55     | Figtree 400                              |
| `label`      | 0.875rem / 1.4  | Figtree 500                              |
| `micro`      | 0.75rem / 1.35  | Figtree 500, apenas metadado não crítico |

Corpo de texto corrido limitado a 68ch. Tabelas e painéis densos podem passar disso.

### Números

Todo valor monetário e toda quantidade usam `font-variant-numeric: tabular-nums`, peso 600.
Dinheiro nunca aparece em fonte de rótulo nem em `micro`: é o dado que a usuária veio buscar.

O símbolo `R$` é renderizado menor e em `--ink-muted`, com o valor em `--ink`. Decimal com
vírgula, milhar com ponto. Valores que se comparam em coluna ficam alinhados à direita.
Percentual sempre acompanhado do que ele significa em reais ("45% · R$ 8,50"). Valor negativo:
sinal, cor negativa **e** `trending-down`.

## Layout & Spacing

Base de 4px. Ritmo `4 · 8 · 12 · 16 · 24 · 32 · 48`, com variação deliberada entre seções:
densidade dentro de um grupo, respiro entre grupos.

### Estrutura responsiva

Uma estrutura só, dois arranjos. A quebra é estrutural, nunca tipográfica.

- **Celular (< 768px):** conteúdo em coluna única, navegação inferior fixa com Hoje · Pedidos ·
  "+" · Produtos · ⋯ (só ícones); o "+" abre a grade de tudo o que se registra, e o ⋯ a folha com
  as outras páginas (`#d240`, `#d241`). Detalhes e formulários abrem em folha inferior arrastável. Os
  dois editores (`/fichas/[id]`, `/pedidos/[id]`) não têm navegação inferior: o cabeçalho tem
  o voltar, o aparelho volta por gesto, e o resumo de custo desce até o pé (`#d152`).
- **Desktop (≥ 1024px):** barra lateral `--brand-800` de 240px; detalhes e formulários abrem
  em painel lateral direito. Nunca modal quando um painel resolve.

A **coluna de leitura** (1024px, centrada) é escolha da tela, e não do shell (`#d129`):
formulário, prosa e lista de linhas entram nela (o grupo de rota `(coluna)`); a tela cuja
lista virou tabela fica fora e ocupa a largura que tem, com o detalhe do item selecionado em
coluna acoplada à direita. O editor de pedido em `2xl` também sai: o formulário à esquerda e o
resumo (itens, total, sobra) numa coluna de 320px à direita, presa sob o cabeçalho, no lugar
do rodapé fixo, e sem botões (`#d274`). O editor de produto faz o mesmo em `2xl`: o preço
(custo, sugerido, o campo e a sobra) e o custo do lote com a faixa de composição na coluna, e o
bloco do custo some da esquerda (`#d339`). O relatório do MEI também sai: em `2xl` a folha a
100% à esquerda e, na coluna de 320px, o número do mês, as escolhas, o "Imprimir", as notas e o
limite; abaixo de `2xl` a mesma ordem, com a folha logo depois do botão; no celular, as linhas
com valor no lugar da folha (`#d363`). O cabeçalho de contexto sangra até a borda da área de
conteúdo nos três casos, e o título alinha com a coluna da tela.

### Raios

`sm` 8px (selo, esqueleto), `md` 8px (botão, campo, pílula de navegação), `lg` 10px (cartão,
bloco), `xl` 20px (reservado), `full` (pílula de filtro, distintivo). Os 8 e 10 são do
território Porções (`#d381`). Superfícies opacas: sem vidro, sem brilho, sem plástico. Sombras
baixas ou nenhuma, na matiz 266.

### Toque

44×44px é o mínimo absoluto, com 8px entre alvos vizinhos. Ações primárias no celular têm 52px
de altura. Campos têm 48px. Linha de lista tem alvo inteiro. Isso não é generosidade: é farinha
no dedo.

### Cartões

Usados só quando o conteúdo é de fato uma unidade destacável e clicável (meta, compras, resumo
do mês). Listas de material e linhas de produto são **listas com divisórias**, não grades de
cartões. Cartão dentro de cartão é sempre erro.

## Components

Todo componente interativo entrega: `default`, `hover`, `focus-visible`, `active`, `disabled`,
`loading`, `error`, nos dois temas. Foco visível sempre: anel de 2px em `--focus` (`--brand-500`; `--on-brand` sobre o cobalto) com
2px de deslocamento.

| Componente                          | Regra                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Botão primário**                  | `--brand-700` com tinta `--on-brand`; hover `--brand-600`, pressionado `--brand-800`. 52px no celular. **Um por tela.** Nunca rosa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Botão secundário**                | borda `--border-strong`, tinta `--ink`, fundo transparente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Botão terciário**                 | só texto em `--brand-as-ink`, hover `--brand-100`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Botão destrutivo**                | tinta `--negative` sobre `--negative-bg`. Nunca a marca: ela não pode significar destruição.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Botão mais e grade**              | só no celular, no centro da navegação inferior: círculo cheio `--brand-700` de 48px com o traço `--on-brand`, dentro da barra, sem sobressair dela. Abre a grade acima da barra, sob o véu que não a cobre: sete ações em ordem fixa, duas colunas, ícone + nome + uma linha, divisórias de 1px, "Novo pedido" na largura inteira. Apertar abre; arrastar pinta de `--brand-100` o item sob o dedo; soltar nele executa; soltar sem arrastar ou no vazio deixa aberta. O "+" gira para "×". Opção sem rede `aria-disabled` com a razão no lugar da linha (`#d241`). Não existe mais "+" no cabeçalho nem pílula flutuante.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Campo**                           | rótulo acima, sempre visível; 48px, raio 8px, contorno `--border-strong`. Placeholder nunca é rótulo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Campo monetário**                 | prefixo fixo "R$" em `--ink-subtle`, teclado numérico, tabular, alinhado à direita.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Seletor**                         | mesma caixa do campo, ícone `chevron-down`; no celular abre folha inferior. A ordem de lista é `EscolhaDeOrdem`: no celular, botão terciário com `arrow-up-down` e o nome da ordem, e a folha com uma linha por ordem e o que ela faz (`#d242`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Cabeçalho de contexto**           | no papel (`--canvas`), grudento, sangrando até a borda da área de conteúdo, com filete `--border` embaixo da última faixa: título `--ink`, descrição `--ink-muted`, voltar e ações à direita com os tokens de sempre (`#d243`). O selo de sincronização mora na linha da descrição (`#d234`). Busca, pílulas e aviso ficam na faixa de ferramentas, logo abaixo (`#d128`). Nas seis listas, no celular, a faixa de contexto sai ao descer e volta ao subir; a de ferramentas fica (`#d237`). No app instalado, uma tira `--brand-700` da altura da área segura fica fixa sob a barra de status, cujo relógio é branco.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Lista com divisórias**            | divisória 1px `--border`; linha com 44px mínimo, alvo inteiro, nome + detalhe à esquerda, valor tabular à direita.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Tabela**                          | só no desktop, para a lista cujos números se comparam: a mesma `<li>` da linha do celular vira grade de colunas. Cabeçalho de colunas em micro 600 caixa alta `--ink-muted`, `aria-hidden`; cada célula leva o rótulo em `sr-only`. Números tabulares à direita; negativo com sinal, cor e ícone. Linha selecionada em `--surface-sunken`, e o detalhe em coluna acoplada à direita, nunca em sobreposição (`#d130`). Hoje: Produtos (`#d228`), Materiais (`#d225`), Pedidos (`#d253`) a Contagem e a do pronto (`#d334`, `#d338`, com o campo na última coluna) e o que vai dentro do produto (`#d339`, Material · Quantidade · Custo, já em `lg`, dentro da coluna); com o detalhe aberto, Produtos e Materiais esperam o `xl` e Pedidos, com sete colunas, o `2xl`; antes disso a linha volta à do celular. Em Pedidos o dia é a linha de grupo, com total e sobra nas colunas deles, e não há ordem a escolher. A ordem é `EscolhaDeOrdem` na linha da contagem, guardada no aparelho, nunca clique no cabeçalho (`#d226`, `#d229`, `#d242`). |
| **Cartão**                          | `--surface`, borda `--border`, raio 10px, padding 16–20. Só onde cabe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Seção no papel**                  | `h2` em `subheading` sobre o `--canvas`, sem caixa; a lista vai em `--surface` com divisórias, filete `--border` e raio 10px, e o que não é linha (gráfico, busca, pílulas, nota) fica no papel. 32px entre grupos, 16px dentro. No Caixa só o mês e a meta são cartão (`#d267`). Medida de linha é traço de 4px sob o nome, nunca fundo da linha inteira.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Configuração**                    | três partes na ordem da conta, cada uma seção no papel com `h2` em `heading` e 48px antes: O seu preço (os blocos que fecham no custo por hora, e o preço padrão logo depois), A sua marca (a folha e "Seu cardápio") e A sua conta (lista com divisórias, nada que peça "Salvar"). Índice de três âncoras na faixa de ferramentas, `aria-current` na parte em leitura. A partir de `2xl`, o custo por hora e a prévia presos na coluna de 320px à direita. O primário é só o "Salvar" (`#d283`, `#d284`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Painel lateral / folha inferior** | mesmo componente e mesma API; 260ms. Modal só para confirmação destrutiva: título com a consequência, dois botões, sem "X" — `Confirmacao`, o `<dialog>` nativo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Selo de status do pedido**        | orçamento (neutro) · confirmado (marca: `--brand-100` / `--brand-as-ink`) · em produção (informativo) · pronto (positivo) · entregue (neutro) · cancelado (negativo). Nunca atenção: produzir não é aviso.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Selo de sincronização**           | do cabeçalho, não da tela: toda tela com `CabecalhoPagina` o mostra na linha da descrição, depois dela, dentro de um `role="status"` (`#d234`). "Salvo no aparelho" em micro, tinta `--attention` sobre `--attention-bg`; com sinal e fila, "Enviando" em informativo; quando a rede volta e todas as escritas do aparelho sobem, "Tudo enviado" em positivo com `Check` por 4 segundos. Nunca vermelho, nunca alerta: offline é normal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Estado vazio**                    | display + uma linha que ensina a tela + ação. Nunca "nenhum registro".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Esqueleto**                       | blocos com a forma do conteúdo, `--surface-sunken`, pulso. Nunca spinner: com cache offline o conteúdo quase sempre chega em milissegundos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Navegação inferior**              | cinco espaços iguais: Hoje · Pedidos · "+" · Produtos · ⋯ (`#d240`). Só o ícone de 24px (o ⋯ com 20px), alvo de 56px; o rótulo vai em `aria-label` e `title` (`#d150`). Ativo em `--brand-as-ink` com pílula `--brand-100` de 32×56 atrás do ícone: é ela que diz "você está aqui"; o ⋯ a leva quando ela está numa página da folha dele (Materiais, Caixa, Compras, Clientes). **Não** `--brand-700` puro: no escuro ele some na superfície (`#d381`). Pedido do cardápio esperando: número `micro` 600 `tabular-nums` em `--brand-700` com `--on-brand`, 18px, raio cheio, no canto superior direito da pílula sem cobrir o ícone; "9+" acima de 9; a contagem entra no `aria-label` (`#d235`).                                                                                                                                                                                                                                                                                                                                                 |
| **Barra lateral**                   | 240px, `--brand-800`, texto `--on-brand-muted`; item ativo com fundo `--brand-700` cheio, `--on-brand` em 600 e a faixa `--on-brand` de 3px à esquerda (`#d381`); hover `--brand-600`; foco em `--on-brand`. Pedido do cardápio esperando: o número na ponta direita do item, fundo `--on-brand` e tinta `--brand-800`, legível no ativo e no inativo (`#d235`). Topo: logotipo na linha dele e, embaixo, o nome do negócio em `label` 600 `--on-brand`, truncado. Meio: os cinco destinos e, depois de 16px sem título nem filete, Compras e Clientes; o teto de cinco é só da navegação inferior. Pé: para a dona em teste, `Hourglass`, o prazo em `--on-brand-muted` e "Assinar" em `--on-brand` 600, sem tom de atenção (`#d236`).                                                                                                                                                                                                                                                                                                           |
| **Pílula de filtro**                | 44px, ativa em `--brand-700` com `--on-brand`; inativa com borda `--border-strong`. Contagem, quando há, vai no rótulo e só acima de zero ("Me devem 3", `#d246`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Faixa de aviso**                  | atenção ou informativo, ícone + frase + ação em texto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Barra de progresso de meta**      | trilha `--surface-sunken`, preenchimento `--brand-as-ink`; batida, `--positive` (é semântico, não marca). Rótulo com a tradução em unidades.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Padrões

- **Um botão primário por tela.** No celular ele é o "+" da barra ou o botão do painel de pé;
  no desktop, o canto superior direito do cabeçalho. Enquanto o estado vazio ensina a tela, a
  ação primária é dele: o botão do cabeçalho sai; o "+" da barra fica, porque é cromo. A tela Hoje é de leitura; a
  ação da agenda vazia é secundária. **Nos editores o primário anda, e continua um só**
  (`#d271`): enquanto há o que salvar, é o "Salvar"; no pedido gravado e sem alteração, o botão
  do cabeçalho vira "Salvo" secundário e desabilitado, e o primário vai para o próximo passo do
  pedido ("Começar a produzir", ou "Marcar como pago" no entregue não pago, só para a dona).
- **Todo número mostra sua consequência.** O par obrigatório é "preço + sobra": nunca um preço
  sozinho. Valor em display, consequência em rótulo logo abaixo ("sobram R$ 3,19 pra você, por
  unidade, depois da maquininha"). O valor da sobra vai na porção rosa (`Porcao`).
- **Erro sem depender de cor:** ícone + palavra + a saída ("O mínimo pra não perder é R$ 4,64").
- **Sem internet:** selo "salvo no aparelho"; quando a tela depende de dado remoto, faixa
  informativa. Nunca bloquear a tela.
- **O sistema faz a conta:** nunca pedir um número derivável de outro.

## Motion

Dois tipos de movimento, com regras diferentes. O de estado diz o que mudou; o de ambiente dá
vida à página que a cor contida deixa quieta (`#d254`).

### Estado

- Transições de estado entre 150ms e 220ms. Entrada de painel e folha inferior em 260ms.
- Curva `cubic-bezier(0.25, 1, 0.5, 1)` (`ease-quart`). Sem elástico, sem quique.
- Comunica estado: abertura de painel, confirmação de salvamento, progresso de meta. O app não
  tem coreografia de carregamento de tela: ela está no meio de uma tarefa. A exceção é a
  **abertura** (o carregamento da sessão): cobalto cheio, a assadeira em papel, os três cortes
  abrindo da esquerda (60ms cada) e a última porção virando rosa (`Simbolo abrindo`). Com
  movimento reduzido, o símbolo já chega cortado.
- `prefers-reduced-motion: reduce` elimina translação e escala, preservando mudança de
  opacidade e de cor.

### Ambiente

Decorativo é permitido, com estas regras:

- **Onde.** Livre nas páginas do site (`/conheca`, `/como-calcular-o-preco-do-cookie`) e nas telas
  de acesso, incluindo uma entrada orquestrada no carregamento. No app, só em momento de pausa:
  estado vazio, meta batida, primeira abertura. Nunca em lista, formulário, editor ou perto de
  um número que ela está lendo: na bancada, o movimento disputa a atenção com o dado.
- **Ritmo.** Lento e contínuo, nunca nervoso: ciclos de 4s a 30s, nada pisca, nada chama. Laço
  em `cubic-bezier(0.37, 0, 0.63, 1)` (seno, ida e volta); entrada em `ease-quart`, a sequência
  inteira em até 1,2s. Sem elástico, sem quique.
- **Material.** O da cozinha e do papel: a luz da janela, a fotografia, o traço, a textura do
  papel cru. A porção rosa e a faixa de composição continuam sendo dado e nunca enfeite
  (`#d126`). Nada de confete, partícula, gradiente de SaaS ou do "fofo" que o `PRODUCT.md`
  recusa (cupcake, emoji). O rosa da marca é a sobra, não decoração.
- **Custo.** `transform` e `opacity`; `filter`, `mask` e `clip-path` só em área pequena. Pausa
  fora da tela e com a aba oculta. O texto do topo chega pronto: nada atrasa o LCP. Biblioteca
  de animação é dependência de produção e pede aprovação.
- **Movimento reduzido.** O ambiente sai inteiro e fica o quadro final, parado. Nada fica
  escondido esperando uma animação.

## Iconography

Lucide, traço de 1.75px, 20px em linha e 24px em navegação. Sempre contorno; nunca misturar
preenchido. Ícone nunca substitui rótulo em navegação. **Nada de biscoito**: o produto é de
precificação, e a segunda confeiteira faz bolo.

## Signature

Três elementos. Nenhum vira ícone de interface.

1. **O corte.** Vão de 8° para a direita (`--cut-angle`), sempre a mesma inclinação. Divide o
   que é dividido: o logotipo em cinco porções, o símbolo em quatro, a faixa de composição.
   Nunca decorativo em série solta.
2. **A porção rosa.** `--accent-500` com `--on-accent`, a caixa inclinada a 8° e o texto reto
   (`Porcao` em `Marca.tsx`). Marca **só** o valor "sobram R$ X pra você": painel de preço,
   "Quanto cobrar", a cadeia do dinheiro, o que o mês rendeu. Uma por tela. Nunca em botão,
   nunca em prejuízo, nunca em rótulo.
3. **A faixa de composição.** Barra horizontal na proporção **real** do custo do lote
   (materiais · embalagem · sua hora · gás e energia · fixos), altura 10px, raio 3px, porções
   em degraus de `--ink` separadas por cortes de 3px a 8°, o segmento "Seu trabalho" em
   `--brand-as-ink`. Só existe onde existe custo calculado. Nunca decorativa, nunca com
   proporções inventadas (`#d126`). A versão sobre o preço praticado, com maquininha e a sobra
   em rosa, é spec própria (`#d381`). A exceção é a faixa larga da `/conheca`
   (`FaixaDoCusto`, `#d382`): o cookie do `EXEMPLO` sobre o `--brand-800`, montando-se até o
   preço sugerido, com o trabalho em `--brand-400` e a sobra em rosa.

A folha do orçamento é da confeiteira, não nossa: o Rende aparece nela como uma linha de
rodapé (`#d127`).

## Tokens no código

Duas camadas em `src/app/globals.css`:

1. **`:root`, `@media (prefers-color-scheme: dark)` e `[data-theme]`** declaram os tokens com os **nomes do
   pacote** (`--brand-700`, `--canvas`, `--accent-ink`, `--positive-bg`…), para que
   `docs/marca/rende/tokens.css` e o código se comparem com `diff`. Tokens do código e não do
   pacote: `--on-brand-muted`, o valor escuro de `--brand-100`, `--focus`, `--loja` e
   `--luz-da-janela` (a luz do topo de `/conheca`, em `--brand-100`, transparente no escuro,
   `#d255`). O
   escuro segue o padrão do pacote: o sistema decide, e `data-theme` no `<html>` passa por cima
   (`#d244`); os dois blocos escuros repetem os valores.
2. **`@theme inline`** dá o **nome de uso** ao Tailwind: `brand-700`, `brand-ink`
   (`--brand-as-ink`), `accent-500`, `on-brand`, `on-accent`, `canvas`, `surface`, `sunken`,
   `line`, `line-strong`, `ink*`, `positive` / `positive-soft` e irmãos. É também onde moram a
   escala de texto, os raios, as sombras e a curva, que são do código.

Os escopos `sobre-marca` (tinta sobre o cobalto) e `sobre-rosa` (tinta dentro da porção)
redeclaram os tokens para o que cai dentro deles. Tipografia, espaçamento, raio, toque, motion e
z-index do pacote **não** entram como custom properties: o Tailwind já tem `text-*`, `rounded-*`, `duration-*`, e duplicar seria dois donos
para o mesmo valor.
