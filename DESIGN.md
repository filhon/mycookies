# Design

Sistema visual do Rende. A regra de uso mora aqui; os valores vivem em `src/app/globals.css`,
com os mesmos nomes de `docs/marca/rende/tokens.css`. Onde este arquivo e o pacote da marca
divergem (escala, raio, dois componentes), **este é o que vale**: o motivo está na spec 033 e
em `DECISOES.md#d125`.

## Visual Theme

**Um instrumento de precisão em mãos experientes.**

Território "Ponto". Quase monocromático: tinta azul-preta (`--brand-700`, matiz OKLCH 272)
como cor de marca, um único âmbar quente (`--accent-500`, matiz 78) como acento, papel cru como
superfície. A cor não decora: marca o número que decide.

A primária está a 245° do vermelho de erro, então positivo, atenção e negativo são
inequívocos ao lado dela. O que sobra de risco é o âmbar dividindo matiz com a atenção; a
resposta é a mesma de sempre: **cor nunca é o único portador de significado**.

### Tema

**Claro por padrão.** A cena que decide isso: a confeiteira com o celular apoiado na bancada às
duas da tarde, cozinha iluminada, farinha na mão. Um painel escuro nessa luz é ilegível.

**Escuro suportado**, seguindo `prefers-color-scheme`, para o uso noturno de planejamento. No
escuro a marca inverte: a cor de estrutura vira fundo e a superfície vira tinta. Não é um "modo
escuro" colado; é a mesma marca com os papéis trocados. Não há alternador de tema.

Celular primeiro; o desktop é a versão confortável do mesmo desenho. Offline é o estado normal.

### Color Strategy

**Contida no conteúdo, comprometida no cromo.**

A tinta da marca aparece cheia e sólida no cromo: barra lateral do desktop, cabeçalho de
contexto, pílula ativa. As superfícies onde moram os números ficam em neutros quentes, para a
densidade respirar. O âmbar é o ponto: botão primário, o valor que decide, o segmento "sua
hora" da faixa. Nunca preenche área grande.

Nenhum neutro é puro. No tema claro os neutros carregam a matiz 85 (o calor do papel, matiz do
acento) em croma 0.004–0.012; no escuro carregam a matiz 272 (a tinta da marca) em croma
0.022–0.028.

Proporção: ~70% neutro · ~25% tinta · ~5% âmbar.

## Color Palette

Tudo em OKLCH; o hex ao lado é leitura, não produção.

### Marca

| Token          | OKLCH                   | hex       | Uso                                                       |
| -------------- | ----------------------- | --------- | --------------------------------------------------------- |
| `--brand-900`  | `oklch(0.19 0.030 272)` | `#15171F` | reservado (é o `--canvas` escuro)                         |
| `--brand-800`  | `oklch(0.22 0.030 272)` | `#1C1E28` | barra lateral, painel de marca do acesso                  |
| `--brand-700`  | `oklch(0.26 0.035 272)` | `#2A2C3A` | **primária**: item ativo, pílula ativa, seleção, ícone    |
| `--brand-600`  | `oklch(0.34 0.035 272)` | `#3C3E4D` | hover sobre superfície de marca                           |
| `--brand-500`  | `oklch(0.44 0.033 272)` | `#545768` | divisória sobre marca                                     |
| `--brand-400`  | `oklch(0.56 0.028 272)` | `#6E7183` | reservado                                                 |
| `--brand-300`  | `oklch(0.70 0.022 272)` | `#9B9DAC` | ícone desativado                                          |
| `--brand-200`  | `oklch(0.85 0.015 272)` | `#CFD0D8` | borda em superfície de marca; é o `--on-brand-muted`      |
| `--brand-100`  | `oklch(0.94 0.010 272)` | `#EBECF1` | realce frio: opção escolhida, hover terciário, selo marca |
| `--accent-600` | `oklch(0.62 0.130 75)`  | `#A9752A` | hover e pressionado do botão âmbar                        |
| `--accent-500` | `oklch(0.74 0.140 78)`  | `#D89B3C` | **o ponto**: botão primário, flutuante, marcação          |
| `--accent-300` | `oklch(0.85 0.090 80)`  | `#EFC384` | reservado                                                 |
| `--accent-100` | `oklch(0.93 0.050 82)`  | `#F7E7C8` | fundo de destaque discreto                                |
| `--accent-ink` | `oklch(0.45 0.100 70)`  | `#6E4A12` | âmbar como texto: destino ativo, a linha "Seu trabalho"   |
| `--on-accent`  | `oklch(0.20 0.030 75)`  | `#231A08` | tinta sobre o botão âmbar                                 |

O âmbar sobe de luminosidade no escuro (`--accent-500` → `oklch(0.78 0.13 78)`,
`--accent-ink` → `oklch(0.82 0.12 80)`) para manter 4.5:1 sobre `--surface`. `--brand-100`
ganha valor escuro (`oklch(0.30 0.030 272)`) porque é fundo de hover e de opção escolhida, e o
claro do pacote seria um flash sobre o tema escuro.

### Superfícies

| Token              | Claro                               | Escuro                               |
| ------------------ | ----------------------------------- | ------------------------------------ |
| `--canvas`         | `oklch(0.972 0.008 85)` · `#F7F4EE` | `oklch(0.19 0.025 272)` · `#15171F`  |
| `--surface`        | `oklch(0.995 0.004 85)` · `#FEFCF8` | `oklch(0.235 0.028 272)` · `#1E2029` |
| `--surface-sunken` | `oklch(0.945 0.010 85)` · `#EFEBE3` | `oklch(0.165 0.022 272)` · `#101219` |
| `--border`         | `oklch(0.885 0.010 85)` · `#E1DCD3` | `oklch(0.31 0.025 272)` · `#343641`  |
| `--border-strong`  | `oklch(0.78 0.012 85)` · `#C3BDB2`  | `oklch(0.42 0.028 272)` · `#4C4F5C`  |
| `--ink`            | `oklch(0.24 0.020 272)` · `#22242E` | `oklch(0.955 0.006 85)` · `#F4F1EB`  |
| `--ink-muted`      | `oklch(0.50 0.015 272)` · `#6A6C78` | `oklch(0.74 0.012 272)` · `#A8AAB5`  |
| `--ink-subtle`     | `oklch(0.63 0.012 272)` · `#8E909B` | `oklch(0.60 0.015 272)` · `#7F8290`  |
| `--on-brand`       | `oklch(0.965 0.006 85)` · `#F6F3ED` | igual                                |
| `--on-brand-muted` | `var(--brand-200)` · `#CFD0D8`      | igual                                |
| `--brand-as-ink`   | `var(--brand-700)` · `#2A2C3A`      | `oklch(0.88 0.012 272)` · `#DADCE4`  |

`--brand-as-ink` é a marca **como tinta** sobre a superfície: link, ícone de seleção, barra de
progresso, borda da opção escolhida, botão terciário. Inverte no escuro. A marca como **fundo**
(barra lateral, item ativo, pílula ativa) continua `--brand-800` e `--brand-700` nos dois
temas: é o cromo que fica constante e a tinta que inverte. `--on-brand-muted` é o texto apagado
sobre a barra lateral (`#CFD0D8` sobre `#1C1E28` ≈ 10:1).

### Semânticos

| Papel       | Claro (tinta / fundo) | Escuro (tinta / fundo) | Onde                                                  |
| ----------- | --------------------- | ---------------------- | ----------------------------------------------------- |
| positivo    | `#17724A` / `#DDF0E4` | `#5FD49A` / `#163021`  | lucro, entrada de caixa, meta batida                  |
| atenção     | `#7A5410` / `#F7E7C8` | `#E3B267` / `#34280F`  | despensa baixa, custo desatualizado, escrita pendente |
| negativo    | `#B02A1C` / `#FADFDA` | `#F08070` / `#3A1A16`  | prejuízo, saída, erro                                 |
| informativo | `#2A5C9E` / `#DCE7F5` | `#8FB6E8` / `#14243A`  | dica de cálculo                                       |

No Tailwind o fundo semântico chama-se `*-soft` (`bg-positive-soft`); no `:root` ele é o
`--*-bg` do pacote.

Cada semântico tem **ícone obrigatório** (Lucide: `trending-up`, `triangle-alert`,
`trending-down`, `info`) e palavra. Nenhum estado depende de cor. **Atenção e âmbar dividem
matiz**: a atenção é o ocre `--attention`, nunca o `--accent-500`, e sempre leva o triângulo.

### Contraste (AA como piso)

Os pares que a marca criou foram recomputados na sessão C da spec 033 (OKLCH → sRGB →
luminância, `ESTADO.md`); os demais continuam aproximados a partir dos hex. `--ink-subtle`
**não é cor de texto**: é ícone e metadado não crítico (3:1). Rótulo de navegação e o nome
de um número são `--ink-muted`.

| Par                                                     | Ratio                | Piso                                   |
| ------------------------------------------------------- | -------------------- | -------------------------------------- |
| `--ink` sobre `--canvas` (claro)                        | ~14.8:1              | 4.5 ✔                                  |
| `--ink-muted` sobre `--canvas`                          | ~5.1:1               | 4.5 ✔                                  |
| `--ink-subtle` sobre `--surface`                        | 3.45:1 (3.23 canvas) | **reprova texto**; só ícone e metadado |
| `--on-brand` sobre `--brand-700`                        | ~12.9:1              | 4.5 ✔                                  |
| `--on-brand-muted` sobre `--brand-800`                  | 11.0:1               | 4.5 ✔                                  |
| `--on-accent` sobre `--accent-500` (botão)              | 7.7:1 (8.9 escuro)   | 4.5 ✔                                  |
| `--accent-ink` sobre `--canvas` / `--surface`           | 7.0 / 7.5:1          | 4.5 ✔                                  |
| `--border-strong` sobre `--surface` (contorno)          | 1.97:1               | **reprova 3:1**; aceito, ver `#d123`   |
| `--accent-500` sobre `--canvas` como texto              | ~2.3:1               | **reprova**                            |
| positivo sobre `--canvas` / `--positive-bg`             | ~5.6:1 / ~5.0:1      | 4.5 ✔                                  |
| atenção sobre `--attention-bg`                          | ~5.2:1               | 4.5 ✔                                  |
| negativo sobre `--canvas` / `--negative-bg`             | ~5.4:1 / ~4.9:1      | 4.5 ✔                                  |
| informativo sobre `--info-bg`                           | ~5.1:1               | 4.5 ✔                                  |
| escuro: `--ink` sobre `--canvas`                        | ~15.4:1              | 4.5 ✔                                  |
| escuro: `--ink-muted` sobre `--surface`                 | ~6.6:1               | 4.5 ✔                                  |
| escuro: positivo / atenção / negativo sobre `--surface` | ~8.4 / ~7.9 / ~6.5:1 | 4.5 ✔                                  |
| escuro: `--accent-ink` sobre `--canvas` / `--surface`   | 10.5 / 9.5:1         | 4.5 ✔                                  |
| escuro: `--attention` sobre `--attention-bg`            | 7.8:1                | 4.5 ✔                                  |

A linha do âmbar que reprova é a razão de ele nunca ser texto: como texto ele é
`--accent-ink`. A do contorno é uma exceção aceita (`#d123`): o campo tem rótulo e 48px, e o
contorno não é o único sinal.

## Typography

Duas famílias, nenhuma serifa.

- **Display: Archivo**, pesos 600 e 700. Título de página, valor financeiro em destaque,
  número de estado vazio, o logotipo. Nunca em rótulo, botão, tabela, navegação, corpo ou
  microcopy. Não existe Archivo 400 carregada: `font-display` sem `font-semibold` ou
  `font-bold` é erro.
- **Interface: Figtree**, pesos 400 a 700. Humanista, legível a meio metro, com numerais
  tabulares. Carrega rótulo, formulário, tabela, navegação e corpo de texto.

### Escala

Fixa em rem, razão ~1.2. Nada de tipografia fluida: a mesma tela em DPI consistente, e um
título que encolhe dentro de um painel fica pior, não melhor. **É a escala do código, não a
do pacote** (`#d123`): 16px de corpo e 14px de rótulo foram o que a usuária 0 usou na bancada.

| Papel        | Tamanho         | Família / peso                           |
| ------------ | --------------- | ---------------------------------------- |
| `display`    | 2rem / 1.15     | Archivo 600                              |
| `title`      | 1.5rem / 1.2    | Archivo 600                              |
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

- **Celular (< 768px):** conteúdo em coluna única, navegação inferior fixa com cinco destinos,
  ação primária como pílula flutuante ou barra fixa acima da navegação. Detalhes e formulários
  abrem em folha inferior arrastável.
- **Desktop (≥ 1024px):** barra lateral `--brand-800` de 240px; detalhes e formulários abrem
  em painel lateral direito. Nunca modal quando um painel resolve.

A **coluna de leitura** (1024px, centrada) é escolha da tela, e não do shell (`#d129`):
formulário, prosa e lista de linhas entram nela (o grupo de rota `(coluna)`); a tela cuja
lista virou tabela fica fora e ocupa a largura que tem, com o detalhe do item selecionado em
coluna acoplada à direita. O cabeçalho de contexto sangra até a borda da área de conteúdo nos
dois casos, e o título alinha com a coluna da tela.

### Raios

Os do código (`#d123`): `sm` 8px (selo, esqueleto), `md` 10px (botão, campo, pílula de
navegação), `lg` 14px (cartão, bloco), `xl` 20px (reservado), `full` (pílula de filtro,
flutuante, distintivo). Superfícies opacas: sem vidro, sem brilho, sem plástico. Sombras baixas
ou nenhuma, na matiz 272.

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
`loading`, `error`, nos dois temas. Foco visível sempre: anel de 2px em `--focus` (`--accent-600` no claro, porque o `accent-500` sobre o papel cru mede 2,2:1; `--accent-500` no escuro) com 2px
de deslocamento.

| Componente                          | Regra                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Botão primário**                  | `--accent-500` com tinta `--on-accent`; hover e pressionado `--accent-600`. 52px no celular. **Um por tela.**                                                                                                                                                                                                                                                                                                         |
| **Botão secundário**                | borda `--border-strong`, tinta `--ink`, fundo transparente.                                                                                                                                                                                                                                                                                                                                                           |
| **Botão terciário**                 | só texto em `--brand-as-ink`, hover `--brand-100`.                                                                                                                                                                                                                                                                                                                                                                    |
| **Botão destrutivo**                | tinta `--negative` sobre `--negative-bg`. Nunca a marca: ela não pode significar destruição.                                                                                                                                                                                                                                                                                                                          |
| **Botão flutuante**                 | só no celular; pílula de 52px com o nome da ação ("Novo pedido"), âmbar com `--on-accent`, sombra baixa, centrada acima da navegação. Nunca círculo com "+".                                                                                                                                                                                                                                                          |
| **Campo**                           | rótulo acima, sempre visível; 48px, raio 10px, contorno `--border-strong`. Placeholder nunca é rótulo.                                                                                                                                                                                                                                                                                                                |
| **Campo monetário**                 | prefixo fixo "R$" em `--ink-subtle`, teclado numérico, tabular, alinhado à direita.                                                                                                                                                                                                                                                                                                                                   |
| **Seletor**                         | mesma caixa do campo, ícone `chevron-down`; no celular abre folha inferior.                                                                                                                                                                                                                                                                                                                                           |
| **Cabeçalho de contexto**           | faixa `--brand-700` sangrando até a borda da área de conteúdo, grudenta, sem filete: título `--on-brand`, descrição `--on-brand-muted`, voltar e ações à direita com os tokens invertidos pelo escopo `sobre-marca` (o primário âmbar e o selo de sincronização não mudam). Busca, pílulas e aviso ficam na faixa de ferramentas, no papel, logo abaixo (`#d128`).                                                    |
| **Lista com divisórias**            | divisória 1px `--border`; linha com 44px mínimo, alvo inteiro, nome + detalhe à esquerda, valor tabular à direita.                                                                                                                                                                                                                                                                                                    |
| **Tabela**                          | só no desktop, para a lista cujos números se comparam: a mesma `<li>` da linha do celular vira grade de colunas. Cabeçalho de colunas em micro 600 caixa alta `--ink-muted`, `aria-hidden`; cada célula leva o rótulo em `sr-only`. Números tabulares à direita; negativo com sinal, cor e ícone. Linha selecionada em `--surface-sunken`, e o detalhe em coluna acoplada à direita, nunca em sobreposição (`#d130`). |
| **Cartão**                          | `--surface`, borda `--border`, raio 14px, padding 16–20. Só onde cabe.                                                                                                                                                                                                                                                                                                                                                |
| **Painel lateral / folha inferior** | mesmo componente e mesma API; 260ms. Modal só para confirmação destrutiva: título com a consequência, dois botões, sem "X".                                                                                                                                                                                                                                                                                           |
| **Selo de status do pedido**        | orçamento (neutro) · confirmado (marca: `--brand-100` / `--brand-as-ink`) · em produção (informativo) · pronto (positivo) · entregue (neutro) · cancelado (negativo). Nunca atenção: produzir não é aviso.                                                                                                                                                                                                            |
| **Selo de sincronização**           | "Salvo no aparelho" em micro, tinta `--attention` sobre `--attention-bg`; com sinal e fila, "Enviando" em informativo. Nunca vermelho, nunca alerta: offline é normal.                                                                                                                                                                                                                                                |
| **Estado vazio**                    | display + uma linha que ensina a tela + ação. Título que termina em ponto ganha o ponto âmbar no lugar do ponto final (o leitor de tela lê o ponto). Nunca "nenhum registro".                                                                                                                                                                                                                                         |
| **Esqueleto**                       | blocos com a forma do conteúdo, `--surface-sunken`, pulso. Nunca spinner: com cache offline o conteúdo quase sempre chega em milissegundos.                                                                                                                                                                                                                                                                           |
| **Navegação inferior**              | cinco destinos, ícone 24px + micro. Ativo em `--accent-ink` (ícone e rótulo) com pílula `--brand-100` atrás do ícone. **Não** `--accent-500`: como texto ele reprova AA.                                                                                                                                                                                                                                              |
| **Barra lateral**                   | 240px, `--brand-800`, texto `--on-brand-muted`; item ativo com fundo `--brand-700` cheio e `--on-brand` em 600; hover `--brand-600`. **Sem faixa lateral** de nenhuma largura.                                                                                                                                                                                                                                        |
| **Pílula de filtro**                | 44px, ativa em `--brand-700` com `--on-brand`; inativa com borda `--border-strong`.                                                                                                                                                                                                                                                                                                                                   |
| **Faixa de aviso**                  | atenção ou informativo, ícone + frase + ação em texto.                                                                                                                                                                                                                                                                                                                                                                |
| **Barra de progresso de meta**      | trilha `--surface-sunken`, preenchimento `--brand-as-ink`; batida, `--positive` (é semântico, não marca). Rótulo com a tradução em unidades.                                                                                                                                                                                                                                                                          |

### Padrões

- **Um botão primário por tela.** No celular ele é a pílula flutuante ou o botão do painel de
  pé; no desktop, o canto superior direito do cabeçalho. Enquanto o estado vazio ensina a tela,
  a ação primária é dele: o botão do cabeçalho e a pílula saem. A tela Hoje é de leitura; a
  ação da agenda vazia é secundária.
- **Todo número mostra sua consequência.** O par obrigatório é "preço + sobra": nunca um preço
  sozinho. Valor em display, consequência em rótulo logo abaixo ("sobram R$ 3,19 pra você, por
  unidade, depois da maquininha").
- **Erro sem depender de cor:** ícone + palavra + a saída ("O mínimo pra não perder é R$ 4,64").
- **Sem internet:** selo "salvo no aparelho"; quando a tela depende de dado remoto, faixa
  informativa. Nunca bloquear a tela.
- **O sistema faz a conta:** nunca pedir um número derivável de outro.

## Motion

- Transições de estado entre 150ms e 220ms. Entrada de painel e folha inferior em 260ms.
- Curva única: `cubic-bezier(0.25, 1, 0.5, 1)` (`ease-quart`). Sem elástico, sem quique.
- Movimento comunica estado: abertura de painel, confirmação de salvamento, progresso de meta.
  Nada decorativo, nenhuma coreografia de carregamento de página. O PWA não tem tela de
  abertura própria; o que existe é o `background_color` creme e o ícone.
- `prefers-reduced-motion: reduce` elimina translação e escala, preservando mudança de
  opacidade e de cor.

## Iconography

Lucide, traço de 1.75px, 20px em linha e 24px em navegação. Sempre contorno; nunca misturar
preenchido. Ícone nunca substitui rótulo em navegação. **Nada de biscoito**: o produto é de
precificação, e a segunda confeiteira faz bolo.

## Signature

Dois elementos, e só dois. Nunca como ícone de interface.

1. **O ponto âmbar.** Círculo cheio em `--accent-500`, único na peça, marcando o número que
   decide. Diâmetro entre 8 e 16px em tela; no logotipo, a altura da linha de base. Nunca em
   série (três pontos é decoração).
2. **A faixa de composição.** Barra horizontal segmentada na proporção **real** do custo do
   lote (materiais · embalagem · sua hora · gás e energia · fixos), altura 10px, raio 3px,
   segmento "sua hora" em âmbar. Só existe onde existe custo calculado: o editor de produto.
   Nunca decorativa, nunca com proporções inventadas (`#d126`).

Uma assinatura por peça. As duas só convivem no editor de produto, onde a faixa é dado e o
ponto é o painel de preço. A folha do orçamento é da confeiteira, não nossa: o Rende aparece
nela como uma linha de rodapé (`#d127`).

## Tokens no código

Duas camadas em `src/app/globals.css`:

1. **`:root` e `@media (prefers-color-scheme: dark)`** declaram os tokens com os **nomes do
   pacote** (`--brand-700`, `--canvas`, `--accent-ink`, `--positive-bg`…), para que
   `docs/marca/rende/tokens.css` e o código se comparem com `diff`. Três tokens são do código e
   não do pacote: `--on-accent`, `--on-brand-muted` e o valor escuro de `--brand-100`. Os
   blocos `[data-theme]` do pacote não entram: o app segue o sistema.
2. **`@theme inline`** dá o **nome de uso** ao Tailwind: `brand-700`, `brand-ink`
   (`--brand-as-ink`), `accent-ink`, `on-brand`, `on-accent`, `canvas`, `surface`, `sunken`,
   `line`, `line-strong`, `ink*`, `positive` / `positive-soft` e irmãos. É também onde moram a
   escala de texto, os raios, as sombras e a curva, que são do código.

Tipografia, espaçamento, raio, toque, motion e z-index do pacote **não** entram como custom
properties: o Tailwind já tem `text-*`, `rounded-*`, `duration-*`, e duplicar seria dois donos
para o mesmo valor.
