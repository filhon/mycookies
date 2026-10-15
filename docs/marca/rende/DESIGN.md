# Rende · DESIGN.md

Design system do Rende. Estrutura igual à do documento atual do produto, para o código
consumir sem tradução. Os valores vivem em `tokens.css`; aqui está a regra de uso.

---

## Visual Theme

### Tema

Território **Porções**. Cobalto (`--brand-700` #1C3891, matiz 266) como cor de marca, um
rosa (`--accent-500` #F190A7, matiz 5) que marca só o que sobra pra confeiteira, papel
quente como superfície. A assinatura é o corte de 8°: a marca divide as coisas em porções.

Tema claro por padrão; escuro seguindo o sistema. No escuro o cobalto vira noite e o papel vira
tinta. Celular primeiro. Offline é o estado normal.

### Color Strategy

**Comprometida no cromo, contida no conteúdo.** Cobalto cheio no cromo (barra lateral,
cabeçalho, painel de preço, botão primário); neutros quentes onde moram os números. Neutros do
claro carregam matiz 85; do escuro, matiz 266. Proporção ~70% papel · ~25% cobalto · ~5% rosa.

---

## Color Palette

Valores OKLCH em `tokens.css`; hex abaixo.

### Marca

| Token          | hex     | uso                                                      |
| -------------- | ------- | -------------------------------------------------------- |
| `--brand-900`  | #071335 | fundo profundo, tarja sobre foto                         |
| `--brand-800`  | #0D1F5B | barra lateral                                            |
| `--brand-700`  | #1C3891 | **primária**: cabeçalho, botão primário, painel de preço |
| `--brand-600`  | #2D4FB0 | hover de superfície de marca                             |
| `--brand-500`  | #4D6FC6 | segmento da faixa, divisória sobre marca                 |
| `--brand-400`  | #7590D0 | segmento da faixa                                        |
| `--brand-300`  | #9CB1DF | ícone desativado, "R$" sobre cobalto                     |
| `--brand-200`  | #C8D4EF | borda sobre marca                                        |
| `--brand-100`  | #E9EFFB | realce frio discreto                                     |
| `--accent-600` | #D76A87 | rosa pressionado                                         |
| `--accent-500` | #F190A7 | **a porção**: o que sobra pra você                       |
| `--accent-300` | #FABECB | rosa claro                                               |
| `--accent-100` | #FEE3E8 | fundo do valor de sobra                                  |
| `--accent-ink` | #A53458 | rosa como texto, AA sobre canvas                         |

### Superfícies

| Token              | Claro   | Escuro  |
| ------------------ | ------- | ------- |
| `--canvas`         | #F8F5F0 | #081025 |
| `--surface`        | #FFFDFA | #111A33 |
| `--surface-sunken` | #F0ECE5 | #050B1D |
| `--border`         | #DCD9D2 | #263047 |
| `--border-strong`  | #BBB7AF | #414D66 |
| `--ink`            | #121A2D | #F2F0EC |
| `--ink-muted`      | #5B6375 | #AAB1C2 |
| `--ink-subtle`     | #838997 | #7E8699 |
| `--on-brand`       | #F6F3ED | #F6F3ED |
| `--on-accent`      | #071335 | #071335 |
| `--brand-as-ink`   | #1C3891 | #ACC4F9 |

### Semânticos

| Papel       | Claro (tinta / fundo) | Escuro (tinta / fundo) |
| ----------- | --------------------- | ---------------------- |
| positivo    | #1A763F / #D8F3DE     | #63CA84 / #112D1A      |
| atenção     | #865812 / #F9E5C3     | #E6B55D / #382503      |
| negativo    | #AF2D18 / #FFE2DB     | #F47D67 / #421C15      |
| informativo | #086A73 / #D2EEF1     | #76C7D0 / #012D31      |

Cada semântico tem ícone obrigatório (Lucide: `trending-up`, `alert-triangle`,
`trending-down`, `info`) e palavra.

### Contraste (calculado a partir dos hex)

| Par                             | Ratio                       |
| ------------------------------- | --------------------------- |
| ink / canvas                    | 15.9:1                      |
| ink-muted / canvas              | 5.5:1                       |
| ink-subtle / surface            | 3.5:1 (só micro decorativo) |
| on-brand / brand-700            | 9.4:1                       |
| on-accent / accent-500          | 8.1:1                       |
| accent-ink / canvas             | 6.0:1                       |
| accent-500 / brand-700          | 4.6:1                       |
| negativo / canvas               | 6.0:1                       |
| positivo / canvas               | 5.2:1                       |
| atenção / fundo de atenção      | 5.0:1                       |
| informativo / fundo informativo | 5.2:1                       |
| escuro: ink / canvas            | 16.6:1                      |
| escuro: ink-muted / surface     | 8.0:1                       |
| escuro: rosa / surface          | 8.8:1                       |

---

## Typography

### Famílias

- **Familjen Grotesk** (Google Fonts) — display e logotipo. Peso 700.
- **Figtree** (Google Fonts) — interface. 400–700, numerais tabulares.

### Escala

Fixa em rem, razão ~1.2. Nada de tipografia fluida.

| Papel      | Tamanho          | Linha | Peso | Família          | Uso                                                         |
| ---------- | ---------------- | ----- | ---- | ---------------- | ----------------------------------------------------------- |
| display    | 1.875rem / 30px  | 1.10  | 700  | Familjen Grotesk | título de página, valor em destaque, número de estado vazio |
| title      | 1.5rem / 24px    | 1.20  | 700  | Familjen Grotesk | cabeçalho de contexto, manchete de cartão                   |
| heading    | 1.25rem / 20px   | 1.30  | 600  | Figtree          | seção dentro da tela                                        |
| subheading | 1.0625rem / 17px | 1.40  | 600  | Figtree          | nome de item em lista destacada                             |
| body       | 0.9375rem / 15px | 1.55  | 400  | Figtree          | corpo, linha de lista                                       |
| label      | 0.8125rem / 13px | 1.35  | 500  | Figtree          | rótulo de campo, rótulo de valor                            |
| micro      | 0.75rem / 12px   | 1.35  | 500  | Figtree          | selo, nota de cálculo, unidade                              |

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
- Ritmo: 4 · 8 · 12 · 16 · 24 · 32 · 48. Raio 8px em botão e campo, 10px em cartão.
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
`--brand-500` com 2px de deslocamento.

| Componente                          | Regra                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Botão primário**                  | cobalto (`--brand-700`) com `--on-brand`, 52px no celular. Um por tela.                                                                 |
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
| **Cabeçalho de página**             | `--brand-700` cheio, título em Familjen Grotesk, metadados em micro, voltar à esquerda.                                                 |
| **Navegação inferior**              | cinco destinos, ícone 24px + micro, ativo em `--brand-700` com sublinhado cortado a 8°.                                                 |
| **Barra lateral**                   | 240px, `--brand-800`, item ativo com faixa `--on-brand` de 3px à esquerda.                                                              |
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
- **Abertura do app:** fundo `--brand-700`, a assadeira inteira em papel; os três cortes abrem
  da esquerda para a direita (60ms cada) e a última porção vira rosa. Sem rotação, sem quique.
- **Ícone de "salvo":** o selo aparece em 150ms, permanece enquanto houver escrita pendente, e
  sai em 150ms quando sincroniza. Nenhum pulso contínuo.
- `prefers-reduced-motion: reduce` → tudo em 1ms, o símbolo aparece já cortado.

---

## Iconography

Lucide, traço 1.75px, 20px em linha e 24px em navegação. Sempre contorno; nunca misturar
preenchido. Ícone nunca substitui rótulo em navegação. Conjunto de uso frequente: `home`,
`package`, `cookie` **não** (nada de biscoito), `clipboard-list`, `shopping-cart`,
`wallet`, `scale`, `trending-up`, `trending-down`, `alert-triangle`, `info`,
`hard-drive-download`, `chevron-right`, `plus`.

---

## Signature

1. **O corte.** Linha vazada, 8° para a direita (`--cut-angle`), espessura 11% da altura do que
   é cortado (`--cut-width`). Em CSS: segmentos com `gap` dentro de um contêiner com
   `transform: skewX(-8deg)` e `overflow: hidden` no pai.
2. **A porção rosa.** `--accent-500` com `--on-accent`, marcando só o que sobra pra
   confeiteira. Uma por tela.
3. **A faixa de composição.** O preço praticado em porções proporcionais (materiais ·
   embalagem · sua hora · gás e energia · fixos · maquininha · sobra), altura 10–14px, raio
   3px no contêiner, cortes de 3px, sobra em rosa. Sempre com dados verdadeiros.
