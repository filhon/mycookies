# Design

Sistema visual do MyCookie's, derivado da identidade de marca já existente (logotipo, embalagem, cartão fidelidade). A marca vem da confeitaria; este documento a traduz para uma ferramenta de trabalho.

## Visual Theme

**Papelaria de confeitaria fina virada ferramenta.**

A referência física é a caixa da MyCookie's: papel creme texturizado, faixa vinho profundo, detalhe dourado, tipografia serifada quente. O sistema reproduz essa materialidade em superfícies claras e opacas, sem brilho, sem vidro, sem sombra pesada. Nada aqui deve parecer plástico.

O vinho não é enfeite: ele é a estrutura. Aparece cheio e sólido no cromo do aplicativo (barra lateral no desktop, cabeçalhos de contexto), exatamente como aparece cheio e sólido no cartão fidelidade. O conteúdo, onde moram os números, fica em creme e branco quente para que a densidade de dados respire.

### Tema

**Claro por padrão.** A cena que decide isso: Maynara com o celular apoiado na bancada às duas da tarde, cozinha iluminada, farinha na mão. Um painel escuro nessa luz é ilegível, e seria também o segundo reflexo previsível de "app de gestão que não quer parecer planilha".

**Escuro suportado**, seguindo `prefers-color-scheme`, para o uso noturno de planejamento. No escuro a marca inverte como inverte na papelaria: o vinho vira o fundo quase preto ameixado e o creme vira a tinta.

### Color Strategy

**Restrained no conteúdo, Committed no cromo.**

Superfícies de dados usam neutros tingidos de creme com o vinho reservado a ação primária, seleção e estado. O cromo do aplicativo assume o vinho por inteiro. Essa divisão mantém a marca presente sem transformar tabela de custo em cartaz.

## Color Palette

Tudo em OKLCH. Nenhum neutro é puro: todos carregam a matiz quente da marca (croma 0.008–0.02).

### Marca

| Token        | OKLCH                  | Uso                                                                      |
| ------------ | ---------------------- | ------------------------------------------------------------------------ |
| `--wine-900` | `oklch(0.24 0.085 18)` | Fundo da barra lateral no desktop, cabeçalho de contexto                 |
| `--wine-800` | `oklch(0.30 0.105 18)` | Hover dentro de superfícies vinho                                        |
| `--wine-700` | `oklch(0.36 0.128 18)` | **Primária.** Botões, links, seleção. Equivale ao vinho do logotipo      |
| `--wine-600` | `oklch(0.43 0.140 20)` | Hover de primária                                                        |
| `--wine-300` | `oklch(0.72 0.090 20)` | Vinho sobre fundo escuro                                                 |
| `--wine-100` | `oklch(0.93 0.028 22)` | Fundo de estado selecionado, tag                                         |
| `--gold-600` | `oklch(0.58 0.090 72)` | Dourado legível como texto sobre creme                                   |
| `--gold-500` | `oklch(0.73 0.095 78)` | **Acento.** Filete, meta atingida, detalhe. Equivale ao dourado da marca |
| `--gold-100` | `oklch(0.94 0.035 82)` | Fundo de destaque discreto                                               |

O dourado nunca preenche áreas grandes nem vira fundo de botão: dourado chapado em tela lê como plástico dourado, e a marca usa dourado como tinta de detalhe. Ele é filete, ícone e marcador.

### Superfícies

| Token              | Claro                                  | Escuro                                    |
| ------------------ | -------------------------------------- | ----------------------------------------- |
| `--canvas`         | `oklch(0.955 0.014 88)` creme de papel | `oklch(0.19 0.014 20)` ameixa quase preto |
| `--surface`        | `oklch(0.985 0.008 88)` branco quente  | `oklch(0.235 0.016 20)`                   |
| `--surface-sunken` | `oklch(0.925 0.016 86)`                | `oklch(0.165 0.012 20)`                   |
| `--border`         | `oklch(0.88 0.016 80)`                 | `oklch(0.32 0.018 20)`                    |
| `--border-strong`  | `oklch(0.80 0.020 78)`                 | `oklch(0.42 0.020 20)`                    |
| `--ink`            | `oklch(0.26 0.022 40)`                 | `oklch(0.94 0.012 85)`                    |
| `--ink-muted`      | `oklch(0.52 0.020 50)`                 | `oklch(0.70 0.014 80)`                    |
| `--ink-subtle`     | `oklch(0.64 0.018 55)`                 | `oklch(0.56 0.014 75)`                    |

### Semânticos

| Token         | OKLCH                   | Uso                                                        |
| ------------- | ----------------------- | ---------------------------------------------------------- |
| `--positive`  | `oklch(0.52 0.115 152)` | Lucro, entrada de caixa, meta batida                       |
| `--attention` | `oklch(0.66 0.150 55)`  | Estoque baixo, custo desatualizado, sincronização pendente |
| `--negative`  | `oklch(0.55 0.200 27)`  | Prejuízo, saída de caixa, erro de validação                |
| `--info`      | `oklch(0.52 0.095 245)` | Neutro informativo, dica de cálculo                        |

**Restrição obrigatória:** `--negative` e `--wine-700` são vizinhos de matiz. O vermelho de erro é mais claro e muito mais saturado que o vinho da marca, mas a distinção não é confiável sozinha. Todo estado negativo carrega ícone ou texto. Vinho nunca é usado para comunicar erro, e vermelho nunca é usado para ação primária.

## Typography

Duas famílias. A serifa vem do logotipo e fica restrita ao que é editorial; a sans carrega toda a interface.

- **Display: Fraunces** (variável, `opsz` alto, `SOFT` moderado). Ecoa a serifa quente e de terminais arredondados do logotipo. Usada em título de página, valor financeiro de destaque no painel, e estados vazios. Nunca em rótulo, botão ou célula de tabela.
- **Interface: Figtree.** Humanista, quente, legível a meio metro, com numerais tabulares. Carrega rótulo, formulário, tabela, navegação e corpo de texto.

### Escala

Fixa em rem, razão ~1.2. Nada de tipografia fluida: a Maynara vê a mesma tela em DPI consistente e um título que encolhe dentro de um painel fica pior, não melhor.

| Papel        | Tamanho         | Família / peso                           |
| ------------ | --------------- | ---------------------------------------- |
| `display`    | 2rem / 1.15     | Fraunces 600                             |
| `title`      | 1.5rem / 1.2    | Fraunces 600                             |
| `heading`    | 1.25rem / 1.3   | Figtree 600                              |
| `subheading` | 1.0625rem / 1.4 | Figtree 600                              |
| `body`       | 1rem / 1.55     | Figtree 400                              |
| `label`      | 0.875rem / 1.4  | Figtree 500                              |
| `micro`      | 0.75rem / 1.35  | Figtree 500, apenas metadado não crítico |

Corpo de texto corrido limitado a 68ch. Tabelas e painéis densos podem passar disso.

### Números

Todo valor monetário e toda quantidade usam `font-variant-numeric: tabular-nums`, peso 600. Dinheiro nunca aparece em fonte de rótulo nem em `micro`: é o dado que a usuária veio buscar.

O símbolo `R$` é renderizado menor e em `--ink-muted`, com o valor em `--ink`. O que importa é a cifra, não a moeda.

## Layout & Spacing

Base de 4px. Ritmo `4 · 8 · 12 · 16 · 24 · 32 · 48`, com variação deliberada entre seções: densidade dentro de um grupo, respiro entre grupos.

### Estrutura responsiva

Uma estrutura só, dois arranjos. A quebra é estrutural, nunca tipográfica.

- **Mobile (< 768px):** conteúdo em coluna única, navegação inferior fixa com cinco destinos, ação primária como botão flutuante ou barra fixa acima da navegação. Detalhes e formulários abrem em _bottom sheet_ arrastável.
- **Desktop (≥ 1024px):** barra lateral vinho de largura fixa (240px), conteúdo em coluna com largura máxima, detalhes e formulários abrem em painel lateral direito. Nunca modal quando um painel resolve.

### Toque

44×44px é o mínimo absoluto, com 8px entre alvos vizinhos. Ações primárias no mobile têm 52px de altura. Campos de formulário têm 48px. Isso não é generosidade: é farinha no dedo.

### Cartões

Usados só quando o conteúdo é de fato uma unidade destacável e clicável, como um pedido na agenda. Listas de insumo e linhas de ficha técnica são **listas com divisórias**, não grades de cartões. Cartão dentro de cartão é sempre erro.

## Components

Todo componente interativo entrega: `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, `error`.

- **Botão.** Primário vinho sólido com texto creme; secundário com contorno e fundo transparente; terciário só texto. Raio 10px. Um botão primário por tela.
- **Campo.** Rótulo acima, sempre visível, nunca _placeholder_ como rótulo. Altura 48px, raio 10px, contorno `--border-strong`. Foco: anel de 2px em `--wine-700` com 2px de deslocamento.
- **Campo monetário.** Prefixo `R$` fixo, teclado numérico no mobile, formatação em centavos ao digitar, alinhamento à direita.
- **Lista.** Divisórias de 1px em `--border`, linha com 56px de altura mínima, área de toque cobrindo a linha inteira.
- **Superfície flutuante.** _Bottom sheet_ no mobile, painel lateral no desktop, mesmo componente e mesma API. Modal fica reservado a confirmação destrutiva.
- **Estado vazio.** Ensina a tela: uma frase do que aquilo faz, a ação para começar, e o motivo do cookie da marca em traço, discreto. Nunca "nenhum registro encontrado".
- **Estado de carregamento.** Esqueleto com a forma do conteúdo real. Nunca _spinner_ no meio da tela, porque com cache offline o conteúdo quase sempre chega em milissegundos.
- **Selo de sincronização.** Quando há escrita pendente, um selo discreto em `--attention` diz "salvo no aparelho". Nunca um alerta vermelho: offline é normal, não é falha.

## Motion

- Transições de estado entre 150ms e 220ms. Entrada de painel e _bottom sheet_ em 260ms.
- Curva única: `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart). Sem elástico, sem quique.
- Movimento comunica estado: abertura de painel, confirmação de salvamento, progresso de meta. Nada decorativo, nenhuma coreografia de carregamento de página.
- `prefers-reduced-motion: reduce` elimina translação e escala, preservando mudança de opacidade e de cor.

## Iconography

Lucide, traço de 1.75px, 20px em linha e 24px em navegação. Estilo de contorno consistente em toda a interface, sem ícones preenchidos misturados a contornados.

## Signature

Três elementos ligam o sistema à papelaria da marca, usados com parcimônia:

1. **Textura de papel.** Grão sutil (`feTurbulence` em SVG, opacidade ~3%) sobre `--canvas`. Dá a matéria do papel creme sem custo de imagem.
2. **Filete dourado.** Uma linha de 2px em `--gold-500` marca o topo de superfícies de destaque, ecoando a faixa dourada da embalagem. É o único uso de dourado em área.
3. **Motivo do cookie.** O contorno do biscoito da identidade, em traço, aparece em marca d'água nos estados vazios e na tela de acesso. Nunca como ícone de interface nem repetido em padrão dentro do aplicativo.
