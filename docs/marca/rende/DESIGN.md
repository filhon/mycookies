# Rende · DESIGN.md

Design system do Rende. Estrutura igual à do documento atual do produto, para o código
consumir sem tradução. Os valores vivem em `tokens.css`; aqui está a regra de uso.

---

## Visual Theme

### Tema

Território **Ponto**. Quase monocromático: tinta azul-preta (`--brand-700`, matiz OKLCH 272)
como cor de marca, um único âmbar quente (`--accent-500`, matiz 78) como acento, papel cru
como superfície. A cor não decora — marca o número que decide.

A primária está a 245° do vermelho de erro, o que resolve o problema herdado: positivo,
atenção e negativo são inequívocos ao lado dela. Mesmo assim, **cor nunca é o único portador de
significado**.

Tema claro por padrão (cozinha iluminada); escuro seguindo o sistema (planejamento noturno).
No escuro a marca inverte: a cor de estrutura vira fundo, a cor de superfície vira tinta.

Celular primeiro; desktop é a versão confortável do mesmo desenho. Offline é o estado normal.

### Color Strategy

**Contida no conteúdo, comprometida no cromo.** A tinta da marca aparece cheia e sólida no
cromo — barra lateral do desktop, cabeçalho de contexto, painel de preço, faixa de navegação.
As superfícies onde moram os números ficam em neutros quentes, para a densidade respirar.

Nenhum neutro é puro. No tema claro os neutros carregam a matiz 85 (o calor do papel, matiz do
acento) em croma 0.004–0.012; no escuro carregam a matiz 272 (a tinta da marca) em croma
0.022–0.028. **Assumido e declarado:** o brief pede neutro tingido com a matiz da marca; a
marca do Rende é um par tinta+âmbar, e o claro usa a matiz do âmbar para não virar cinza-azul
de dashboard.

Proporção: ~70% neutro · ~25% tinta · ~5% âmbar. O âmbar nunca preenche área grande.

---

## Color Palette

### Marca

| Token          | OKLCH          | hex     | uso                                    |
| -------------- | -------------- | ------- | -------------------------------------- |
| `--brand-900`  | 0.19 0.030 272 | #15171F | fundo do tema escuro                   |
| `--brand-800`  | 0.22 0.030 272 | #1C1E28 | barra lateral, tarja sobre foto        |
| `--brand-700`  | 0.26 0.035 272 | #2A2C3A | **primária**: cabeçalho, botão, painel |
| `--brand-600`  | 0.34 0.035 272 | #3C3E4D | hover de superfície de marca           |
| `--brand-500`  | 0.44 0.033 272 | #545768 | divisória sobre marca                  |
| `--brand-400`  | 0.56 0.028 272 | #6E7183 | segmento neutro da faixa               |
| `--brand-300`  | 0.70 0.022 272 | #9B9DAC | ícone desativado                       |
| `--brand-200`  | 0.85 0.015 272 | #CFD0D8 | borda em superfície de marca           |
| `--brand-100`  | 0.94 0.010 272 | #EBECF1 | realce frio discreto                   |
| `--accent-600` | 0.62 0.130 75  | #A9752A | hover do botão âmbar                   |
| `--accent-500` | 0.74 0.140 78  | #D89B3C | **o ponto**: ação primária, marcação   |
| `--accent-300` | 0.85 0.090 80  | #EFC384 | segmento "sua hora" no claro           |
| `--accent-100` | 0.93 0.050 82  | #F7E7C8 | fundo de atenção                       |
| `--accent-ink` | 0.45 0.100 70  | #6E4A12 | âmbar como texto (AA sobre canvas)     |

### Superfícies

| Token              | Claro                     | Escuro                    |
| ------------------ | ------------------------- | ------------------------- |
| `--canvas`         | 0.972 0.008 85 · #F7F4EE  | 0.190 0.025 272 · #15171F |
| `--surface`        | 0.995 0.004 85 · #FEFCF8  | 0.235 0.028 272 · #1E2029 |
| `--surface-sunken` | 0.945 0.010 85 · #EFEBE3  | 0.165 0.022 272 · #101219 |
| `--border`         | 0.885 0.010 85 · #E1DCD3  | 0.310 0.025 272 · #343641 |
| `--border-strong`  | 0.780 0.012 85 · #C3BDB2  | 0.420 0.028 272 · #4C4F5C |
| `--ink`            | 0.240 0.020 272 · #22242E | 0.955 0.006 85 · #F4F1EB  |
| `--ink-muted`      | 0.500 0.015 272 · #6A6C78 | 0.740 0.012 272 · #A8AAB5 |
| `--ink-subtle`     | 0.630 0.012 272 · #8E909B | 0.600 0.015 272 · #7F8290 |
| `--on-brand`       | #F6F3ED                   | #F6F3ED                   |
| `--brand-as-ink`   | #2A2C3A                   | #DADCE4                   |

### Semânticos

| Papel       | Claro (tinta / fundo) | Escuro (tinta / fundo) | Onde                                                  |
| ----------- | --------------------- | ---------------------- | ----------------------------------------------------- |
| positivo    | #17724A / #DDF0E4     | #5FD49A / #163021      | lucro, entrada de caixa, meta batida                  |
| atenção     | #7A5410 / #F7E7C8     | #E3B267 / #34280F      | despensa baixa, custo desatualizado, escrita pendente |
| negativo    | #B02A1C / #FADFDA     | #F08070 / #3A1A16      | prejuízo, saída, erro                                 |
| informativo | #2A5C9E / #DCE7F5     | #8FB6E8 / #14243A      | dica de cálculo                                       |

Cada semântico tem **ícone obrigatório** (Lucide: `trending-up`, `alert-triangle`,
`trending-down`, `info`) e palavra. Nenhum estado depende de cor.

### Contraste (AA como piso)

Medições aproximadas; recomputar no build a partir dos tokens.

| Par                                                     | Ratio                | Piso                              |
| ------------------------------------------------------- | -------------------- | --------------------------------- |
| `--ink` sobre `--canvas` (claro)                        | ~14.8:1              | 4.5 ✔                             |
| `--ink-muted` sobre `--canvas`                          | ~5.1:1               | 4.5 ✔                             |
| `--ink-subtle` sobre `--surface`                        | ~3.4:1               | só micro decorativo / borda ✔ 3:1 |
| `--on-brand` sobre `--brand-700`                        | ~12.9:1              | 4.5 ✔                             |
| `--accent-500` sobre `--brand-700`                      | ~5.6:1               | 4.5 ✔                             |
| `--accent-ink` sobre `--canvas`                         | ~6.4:1               | 4.5 ✔                             |
| tinta #231A08 sobre `--accent-500` (botão)              | ~9.1:1               | 4.5 ✔                             |
| positivo sobre `--canvas` / sobre `--positive-bg`       | ~5.6:1 / ~5.0:1      | 4.5 ✔                             |
| atenção sobre `--attention-bg`                          | ~5.2:1               | 4.5 ✔                             |
| negativo sobre `--canvas` / `--negative-bg`             | ~5.4:1 / ~4.9:1      | 4.5 ✔                             |
| informativo sobre `--info-bg`                           | ~5.1:1               | 4.5 ✔                             |
| escuro: `--ink` sobre `--canvas`                        | ~15.4:1              | 4.5 ✔                             |
| escuro: `--ink-muted` sobre `--surface`                 | ~6.6:1               | 4.5 ✔                             |
| escuro: positivo / atenção / negativo sobre `--surface` | ~8.4 / ~7.9 / ~6.5:1 | 4.5 ✔                             |
| escuro: `--accent-500` sobre `--surface`                | ~7.4:1               | 4.5 ✔                             |

---

## Typography

### Famílias

- **Archivo** (Google Fonts) — display. Pesos 600 e 700.
- **Figtree** (Google Fonts) — interface. Pesos 400, 500, 600, 700. Numerais tabulares
  (`font-variant-numeric: tabular-nums`). Fica porque já está no código.

Duas famílias, no máximo. Nenhuma serifa: a serifa quente era da MyCookie's.

### Escala

Fixa em rem, razão ~1.2. Nada de tipografia fluida.

| Papel      | Tamanho          | Linha | Peso | Família | Uso                                                         |
| ---------- | ---------------- | ----- | ---- | ------- | ----------------------------------------------------------- |
| display    | 1.875rem / 30px  | 1.15  | 700  | Archivo | título de página, valor em destaque, número de estado vazio |
| title      | 1.5rem / 24px    | 1.25  | 700  | Archivo | cabeçalho de contexto, manchete de cartão                   |
| heading    | 1.25rem / 20px   | 1.30  | 600  | Figtree | seção dentro da tela                                        |
| subheading | 1.0625rem / 17px | 1.40  | 600  | Figtree | nome de item em lista destacada                             |
| body       | 0.9375rem / 15px | 1.55  | 400  | Figtree | corpo, linha de lista                                       |
| label      | 0.8125rem / 13px | 1.35  | 500  | Figtree | rótulo de campo, rótulo de valor                            |
| micro      | 0.75rem / 12px   | 1.35  | 500  | Figtree | selo, nota de cálculo, unidade                              |

### Números

- Todo valor monetário: `tabular-nums`, peso 600.
- O "R$" um degrau menor que o número e em `--ink-subtle`; o número em `--ink`.
- Decimal com vírgula; milhar com ponto. Quantidade com unidade em micro ("640 g", "20 un").
- Valores que se comparam em coluna: alinhados à direita.
- Percentual sempre acompanhado do que ele significa em reais ("45% · R$ 8,50").
- Valor negativo: sinal, cor negativa **e** ícone `trending-down`.

---

## Layout & Spacing

### Estrutura responsiva

- **Celular (360–767):** cabeçalho de contexto no topo, conteúdo em lista, navegação inferior
  com cinco destinos (Hoje · Materiais · Produtos · Pedidos · Caixa), ação primária em pílula
  flutuante acima da navegação, painel de preço preso ao pé quando a tela tem preço.
- **Desktop (≥1024):** barra lateral de 240px em `--brand-800`, conteúdo em coluna única de
  até 760px para leitura densa, painel lateral de 420px para edição. A folha inferior do
  celular e o painel lateral do desktop são o mesmo componente.
- Ritmo: 4 · 8 · 12 · 16 · 24 · 32 · 48. Raio 10px em botão e campo, 12px em cartão.
- Sombras baixas ou nenhuma. Superfícies opacas: sem vidro, sem brilho, sem plástico.

### Toque

Alvo mínimo 44×44px, 8px entre alvos, ação primária no celular 52px, campo 48px. Linha de
lista tem alvo inteiro (toda a linha é clicável). Não é generosidade: é farinha no dedo.

### Cartões

Lista com divisórias é o padrão. Cartão só para unidade destacável e clicável (meta, compras,
resumo do mês). **Cartão dentro de cartão é erro.**

---

## Components

Todos os componentes existem em `default`, `hover`, `focus-visible`, `active`,
`disabled`, `loading` e `error`, nos dois temas. Foco visível sempre: anel de 2px em
`--accent-500` com 2px de deslocamento.

| Componente                          | Regra                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Botão primário**                  | âmbar (`--accent-500`) com tinta #231A08, 52px no celular. Um por tela.                                                                 |
| **Botão secundário**                | borda `--border-strong`, tinta `--ink`, fundo `--surface`.                                                                              |
| **Botão terciário**                 | só texto em `--brand-as-ink`, sublinhado no hover.                                                                                      |
| **Botão destrutivo**                | tinta `--negative` sobre `--negative-bg`, ícone `trash-2`.                                                                              |
| **Botão flutuante**                 | pílula com o nome da ação ("Novo pedido"). Nunca círculo com "+".                                                                       |
| **Campo de texto**                  | rótulo sempre acima, 48px, borda `--border-strong`, raio 10px. Placeholder nunca é rótulo.                                              |
| **Campo monetário**                 | prefixo fixo "R$" em `--ink-subtle`, teclado numérico, tabular.                                                                         |
| **Seletor**                         | mesma caixa do campo, ícone `chevron-down`; no celular abre folha inferior.                                                             |
| **Lista com divisórias**            | divisória `--border` a partir da esquerda do texto; sem grade.                                                                          |
| **Linha de lista**                  | alvo inteiro, 44px mínimo, nome + detalhe à esquerda, valor tabular à direita.                                                          |
| **Cartão**                          | `--surface`, borda `--border`, raio 12px, padding 16. Só onde cabe.                                                                     |
| **Painel lateral / folha inferior** | mesmo componente; 260ms; alça de 32px no celular.                                                                                       |
| **Modal**                           | só confirmação destrutiva. Título com a consequência, dois botões, sem "X".                                                             |
| **Selo de status do pedido**        | orçamento (neutro) · confirmado (informativo) · em produção (atenção) · entregue (marca) · pago (positivo). Sempre texto, nunca só cor. |
| **Selo de sincronização**           | "salvo no aparelho" em micro, ícone `hard-drive-download`, tinta `--attention` sobre `--attention-bg`. Nunca vermelho, nunca alerta.    |
| **Estado vazio**                    | display + uma linha que ensina a tela + ação. Nunca "nenhum registro encontrado".                                                       |
| **Esqueleto**                       | blocos com a forma do conteúdo, `--surface-sunken`, pulso de 1.2s. Sem spinner.                                                         |
| **Cabeçalho de página**             | `--brand-700` cheio, título em Archivo, metadados em micro, voltar à esquerda.                                                          |
| **Navegação inferior**              | cinco destinos, ícone 24px + micro, ativo em `--accent-500`.                                                                            |
| **Barra lateral**                   | 240px, `--brand-800`, item ativo com faixa âmbar de 3px à esquerda.                                                                     |
| **Pílula de filtro**                | altura 36px, ativa em `--brand-700` com `--on-brand`.                                                                                   |
| **Faixa de aviso**                  | atenção ou informativo, ícone + frase + ação em texto.                                                                                  |
| **Barra de progresso de meta**      | trilha `--surface-sunken`, preenchimento `--positive`, rótulo com a tradução em unidades.                                               |
| **Tabela densa**                    | numerais tabulares, cabeçalho em label, linhas de 44px, zebra não — divisória sim.                                                      |

### Padrões

- **Um botão primário por tela.** No celular ele é a pílula flutuante ou o botão do painel de
  pé; no desktop, o canto superior direito do cabeçalho.
- **Todo número mostra sua consequência.** O par obrigatório é "preço + sobra": nunca um preço
  sozinho. Formato: valor em display, consequência em micro logo abaixo ("sobram R$ 3,19 pra
  você, por unidade, depois da maquininha").
- **Erro sem depender de cor:** ícone + palavra + a saída ("O mínimo pra não perder é R$ 4,64").
- **Sem internet:** selo "salvo no aparelho" no cabeçalho e, quando a tela depende de dado
  remoto, faixa informativa. Nunca bloquear a tela.
- **O sistema faz a conta:** nunca pedir um número derivável de outro.

### Checklist de acessibilidade por componente

- Alvo ≥ 44×44px e 8px de separação. ✔ botão, linha de lista, pílula, navegação, selo clicável
- Foco visível com anel de 2px e deslocamento. ✔ todos os interativos
- Rótulo programático (`label for`, `aria-label`) e rótulo visível acima do campo. ✔ campos
- Contraste 4.5:1 em texto, 3:1 em borda e ícone de interface. ✔ tabela acima
- Estado não dependente de cor (ícone ou texto). ✔ selos, semânticos, validação
- Navegação por teclado completa e ordem lógica; folha e modal com foco preso e `Esc`. ✔
- `prefers-reduced-motion`: transições caem para 1ms; nenhum conteúdo depende de animação. ✔
- Zoom de texto até 200% sem perda de função (escala em rem). ✔
- Toque e leitor de tela: valor monetário lido como "quatro reais e quarenta e um centavos"
  (`aria-label` explícito, não o texto tabular). ✔

---

## Motion

- Transição de estado: 180ms (faixa 150–220ms).
- Painel lateral e folha inferior: 260ms.
- Curva única: `cubic-bezier(0.165, 0.84, 0.44, 1)` (ease-out-quart). Sem elástico.
- Movimento comunica estado; nada decorativo.
- **Abertura do app:** fundo `--brand-800`, o símbolo aparece com a régua creme já desenhada e
  o ponto âmbar entrando em 180ms com escala de 0.9 → 1. Sem rotação, sem quique.
- **Ícone de "salvo":** o selo aparece em 150ms, permanece enquanto houver escrita pendente, e
  sai em 150ms quando sincroniza. Nenhum pulso contínuo.
- `prefers-reduced-motion: reduce` → tudo em 1ms, o ponto aparece sem escala.

---

## Iconography

Lucide, traço 1.75px, 20px em linha e 24px em navegação. Sempre contorno; nunca misturar
preenchido. Ícone nunca substitui rótulo em navegação. Conjunto de uso frequente: `home`,
`package`, `cookie` **não** (nada de biscoito), `clipboard-list`, `shopping-cart`,
`wallet`, `scale`, `trending-up`, `trending-down`, `alert-triangle`, `info`,
`hard-drive-download`, `chevron-right`, `plus`.

---

## Signature

Dois elementos, e só dois — nunca como ícone de interface.

1. **O ponto âmbar.** Círculo cheio, único na peça, marcando o número que decide. Diâmetro
   entre 8 e 16px em tela; no logotipo, a altura da linha de base.
2. **A faixa de composição.** Barra horizontal segmentada na proporção real do custo do lote
   (materiais · embalagem · sua hora · gás e energia · fixos), altura 10px, raio 3px, segmento
   "sua hora" em âmbar. Sempre com dados verdadeiros.

Onde aparecem: estado vazio, tela de acesso, abertura, ícone, peças de divulgação e — como
dado — no editor de produto. Uma assinatura por peça.
