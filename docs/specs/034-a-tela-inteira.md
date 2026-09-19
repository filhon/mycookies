# Spec 034 · A tela inteira

**Tipo:** cromo e arranjo, fora da ordem do roadmap como a 033. O desktop passa a ocupar a tela
que tem: o cabeçalho de contexto vira a faixa em tinta da prancha, o conteúdo deixa de parar em
1024px onde é tabela, e `/fichas` ganha a tabela densa e o painel de produto ao lado da lista.
**Nenhum campo, nenhuma rota nova, nenhuma consulta, nenhuma regra, nenhuma dependência.** Um
mapeador puro em `domain/custoFicha.ts`, com teste.
**Tamanho:** uma sessão.
**Origem:** `docs/marca/rende/Rende - Telas.dc.html`, prancha "Desktop 1280 · barra lateral de
240px", e a nota dela: "o desktop é a versão confortável do mesmo desenho, não outro produto".
O `DESIGN.md` já chama o cabeçalho de contexto de cromo em tinta (`brand-700`); o código ainda o
tem em `canvas`. A 033 trouxe a tinta, e não o arranjo.
**Depende de:** a 033 entregue (está).
**Aprovações pedidas:** nenhuma. **Decisões a registrar:** `#d128` (o cabeçalho em tinta e o
escopo `sobre-marca`), `#d129` (a coluna de leitura por grupo de rota, e a tabela que sai dela),
`#d130` (o painel de produto é coluna acoplada, e não o `Painel`; não leva o ponto).

---

## Problema

1. **O cabeçalho é a única peça de cromo que ficou clara.** Barra lateral, pílula ativa e item
   ativo estão em tinta; `CabecalhoPagina` e os cinco cabeçalhos próprios (editor de produto, de
   pedido, as duas contagens e a nota) continuam `bg-canvas` com filete. A prancha põe a faixa
   em `brand-700` em toda tela, nos dois tamanhos, e é o que separa "tela do Rende" de "página
   com uma barra ao lado".
2. **`/fichas` no desktop é a linha do celular esticada.** Nome à esquerda, preço a 900px de
   distância, três andares de texto com ar entre eles. Os seis números que respondem "qual
   produto rende mais?" (rende, custo, sugerido, praticado, sobra) estão gravados na ficha e
   não aparecem lado a lado em lugar nenhum.
3. **Abrir um produto é sair da lista.** No desktop há espaço para ver o custo do lote de um
   produto sem perder os outros de vista; hoje é ida e volta pelo editor.
4. **`AppShell` trava tudo em `max-w-5xl`.** Certo para formulário e prosa, errado para a
   tabela com o painel ao lado: em 1024px sobram 580px para seis colunas.

**O que esta spec entrega:** a faixa em tinta em todo cabeçalho; a coluna de leitura como
escolha por tela, e não do shell; `/fichas` em tabela no desktop com o painel do produto
selecionado acoplado à direita; a linha do celular exatamente como está.

**O que não entrega:** tabela em `/insumos` e `/pedidos` (mesmo padrão, outra sessão); painel
no celular (a linha continua indo ao editor); editor em duas colunas; qualquer mudança de
domínio além do mapeador.

---

## O desenho

### 1. O cabeçalho em tinta (`#d128`)

`CabecalhoPagina` vira duas faixas dentro do mesmo `<header>` grudento:

- **A faixa de contexto**, `bg-brand-700`, sangrando até as bordas da área de conteúdo (até a
  barra lateral no desktop, até a borda da tela no celular). Dentro: `voltar` (novo, opcional:
  o `LinkVoltar` dos cinco cabeçalhos próprios), título em `on-brand`, descrição em
  `on-brand-muted`, e as ações à direita. **Sem filete** embaixo: a tinta é a borda.
- **A faixa de ferramentas**, `bg-canvas` com filete `line`, só quando há `children` (busca,
  pílulas, aviso). Fica fora da tinta, como na prancha: campo e pílula continuam no papel.

Como o conteúdo das ações vem de fora (`EntradaContagemPronto`, `AtalhoParaCompras`,
`EntradaLeitura`, o `Settings` da tela Hoje, o Salvar dos editores, `LinkVoltar`), a faixa não
restila cada um: ela é um **escopo de tokens**, `@utility sobre-marca`, irmão do `folha` que já
existe. Dentro dele `--ink` vale `--on-brand`, `--ink-muted` vale `--on-brand-muted`,
`--border-strong` e `--border` valem `--brand-500`, `--surface-sunken` e `--brand-100` valem
`--brand-600`, `--brand-as-ink` vale `--on-brand`, `--focus` vale `--accent-500` (o `accent-600`
sobre `brand-700` mede ~2,6:1 e reprova o anel). Botão secundário, terciário, link de voltar e
ícone ganham a inversão de graça; o primário âmbar e o selo de sincronização (ocre sobre
`attention-bg`, contraste próprio) não mudam. Nenhum componente de ação aprende que está sobre
a tinta.

A sangria é a dupla `margin-inline: -100vw; padding-inline: 100vw` (`@utility sangria`) com
`overflow-x: clip` no invólucro de `AppShell`. `clip` não cria contêiner de rolagem, e o
`sticky` continua preso ao viewport. Sem pseudo-elemento, sem `z-index` negativo.

**Os cinco cabeçalhos próprios passam a usar `CabecalhoPagina`** com `voltar`. É o que faz a
faixa valer em toda tela de uma vez, e apaga cinco cópias do mesmo `<header>`. As regras
`apertado:` do editor (o voltar some e o respiro encolhe com o teclado aberto) vão junto para o
componente: em tela de lista, com a busca focada, encolher é ganho.

`descricao` aceita `ReactNode` (o código do pedido, em `num`). O `Salvar` e o selo continuam
sendo a `acao`. A escala tipográfica não muda (`#d123`): `text-title lg:text-display`, Archivo
600, e não os 26px/700 da prancha.

### 2. A coluna de leitura é da tela, não do shell (`#d129`)

`AppShell` deixa de limitar `main`. A largura de leitura vira um grupo de rota:
`src/app/(app)/(coluna)/layout.tsx` é um `<div className="mx-auto w-full max-w-5xl">`, e
**toda página entra nele, menos `fichas/page.tsx`**. Mover arquivo é a única mudança nas
páginas; nenhum import muda. Quando `/insumos` e `/pedidos` virarem tabela, saem do grupo.

`RodapeFixo` já mede `max-w-5xl` por dentro: os editores continuam alinhados com ele. A faixa
do cabeçalho sangra a partir da coluna nos dois casos, e o título alinha com a coluna da tela
(no `/fichas`, com a tabela; nas outras, com o formulário).

### 3. A tabela de `/fichas`

No `lg:` a linha vira grade de seis colunas, na proporção da prancha
(`2.4fr · 1fr · 1.2fr · 1.2fr · 1.2fr · 1.4fr`): **Produto · Rende · Custo/un · Sugerido ·
Praticado · Sobra.** Cabeçalho de colunas em `micro` 600 caixa alta `ink-muted`, `aria-hidden`
(as células carregam o rótulo em `sr-only`: "custa", "rende", "sugerido", "praticado",
"sobram", as mesmas palavras do celular). Números `num` à direita; praticado em 600; sobra em
`ink` 600, e no prejuízo sinal, `negative` e o mesmo ícone da linha do celular. Sem seta verde
(`#d125`).

Na coluna Produto: nome em 600; ao lado, os selos "Kit" e "Custo desatualizado"; embaixo, em
`label` `ink-muted`, o que está pronto e quantas fornadas dá (as mesmas frases). A linha inteira
continua sendo o link (`toque`, 44px).

**Dois arranjos no mesmo `<li>`** (`lg:hidden` e `hidden lg:grid`), com as partes que podem
divergir (sobra, selos, frases de produção) em uma função só. `display: none` tira o arranjo
oculto da árvore de acessibilidade: o leitor de tela ouve um só.

Linha selecionada: `bg-sunken` e `aria-current="true"`.

### 4. O painel do produto (`#d130`)

`PainelProduto`, em `src/components/fichas/`, **só no desktop** (`hidden lg:flex`), coluna
acoplada de 26rem à direita da tabela, e **não o `Painel`**: o `Painel` é sobreposição com
fundo escurecido e foco preso, e aqui a lista precisa continuar clicável para trocar de produto
sem fechar nada. Sem `position: sticky`: o cabeçalho grudento já ocupa a altura que ocupa, e a
lista de produtos tem dezenas de linhas, não centenas.

Só leitura, a partir do que a ficha já tem gravado:

- Nome em `title` Archivo; embaixo, "rende 20 un · 45 min · receita" (`ROTULO_TIPO_FICHA`).
- "O custo do lote": `FaixaDeComposicao` e as parcelas, com `Parcela` saindo de
  `FormularioFicha` para `FaixaDeComposicao.tsx` (as linhas são a legenda, `#d126`; é onde a
  legenda mora). Os dados vêm de `custoGravado(ficha): CustoFichaCalculado`, o mapeador puro
  novo (`custoEscolhas ?? 0`, `invisiveis.*`), com teste.
- Custo/un · Sugerido · Praticado, três `Dinheiro` com rótulo `micro`, como no `PainelPreco`.
- A frase da sobra, em `display`: "Sobram R$ 3,19" com "por unidade, depois da maquininha
  (4,99%)"; no prejuízo, "Perde R$ 0,38" com `trending-down` e `negative`. **Sem o ponto âmbar**:
  ele marca dado num lugar só, o painel de preço do editor (`PainelPreco`), e a faixa já é a
  assinatura desta peça. Sem a faixa lateral âmbar da prancha (proibida pelo `/impeccable` e
  pelo `#d125`).
- `custoDesatualizado`: o selo de atenção e "Abra o produto e salve para recalcular com os
  preços de hoje".
- Rodapé: "Abrir produto" (secundário, largura total, leva a `/fichas/{id}`). O primário da
  tela continua sendo "Novo produto", no cabeçalho.

Interação: no `lg:`, o clique na linha abre o painel em vez de navegar (`matchMedia`
`(min-width: 64rem)` no `onClick` do `Link`, com `preventDefault`; botão do meio, Ctrl+clique e
menu de contexto continuam abrindo o editor). Clicar outra linha troca. `Escape` e o "×"
fecham, devolvendo o foco à linha que estava selecionada. Ao abrir, o foco vai para o painel
(`tabIndex={-1}`, `aria-label` com o nome). Se a ficha sair de `dados` (arquivada em outra
aba), o painel fecha. No celular, nada disso existe: a linha vai ao editor.

Estados: sem seleção, o painel não é renderizado (a tabela ocupa a largura toda); carregando,
esqueleto na tabela como hoje; vazio e erro, como hoje, sem painel.

---

## Arquivos

- `src/app/globals.css`: `@utility sangria`, `@utility sobre-marca`.
- `src/components/layout/AppShell.tsx`: sem `max-w-5xl`; `overflow-x-clip` no invólucro.
- `src/app/(app)/(coluna)/layout.tsx` (novo) e os `page.tsx` movidos para dentro: Hoje,
  `comecar`, `compras`, `configuracao`, `financeiro`, `insumos/*`, `pedidos/*`, `fichas/[id]`,
  `fichas/contagem`. `fichas/page.tsx` fica fora.
- `src/components/layout/CabecalhoPagina.tsx`: as duas faixas, `voltar`, `apertado:`.
- `FormularioFicha`, `FormularioPedido`, `TelaContagem`, `TelaContagemPronto`, `TelaNota`:
  o `<header>` próprio vira `CabecalhoPagina`.
- `src/components/fichas/LinhaFicha.tsx`: o arranjo `lg:`; `selecionada`, `aoSelecionar`.
- `src/components/fichas/ListaFichas.tsx`: cabeçalho de colunas, seleção, o painel ao lado.
- `src/components/fichas/PainelProduto.tsx` (novo).
- `src/components/fichas/FaixaDeComposicao.tsx`: recebe `Parcela`.
- `src/lib/domain/custoFicha.ts`: `custoGravado`; `tests/domain/custoFicha.test.ts`: um caso.
- `DESIGN.md`: Components → "Cabeçalho de contexto" e "Tabela"; Layout → a coluna por tela.
- `docs/ESTADO.md`, `docs/DECISOES.md#d128–d130`.

## Fora de escopo

- Tabela em `/insumos` e `/pedidos`, e as duas telas saírem do `(coluna)`.
- O painel no celular (folha inferior). A linha vai ao editor, como sempre foi.
- Editor de produto em duas colunas (formulário à esquerda, preço à direita).
- Ordenar pela coluna. Busca e pílulas já recortam; dezenas de produtos não pedem ordenação.
- A faixa de informação da prancha ("dá pra fazer 60 clássicos"): a frase já está na linha.
- Qualquer mudança em `src/lib/domain/` além de `custoGravado`.

## Roteiro de aceite

1. Desktop 1280 e 1920, tema claro: `/fichas` tem a faixa em tinta, a tabela ocupa a largura,
   as seis colunas alinham à direita, e a sobra negativa traz sinal, cor e ícone.
2. Clique numa linha: painel à direita com faixa, parcelas, três preços e a sobra; a linha fica
   `sunken`. Clique em outra: troca. `Escape`: fecha e o foco volta à linha. Ctrl+clique: abre
   o editor em outra aba.
3. `/fichas/[id]`, `/pedidos/[id]`, `/insumos/contagem`, `/fichas/contagem`, `/insumos/nota`:
   faixa em tinta com o voltar legível, Salvar âmbar, selo de sincronização ocre, e o corpo
   ainda em coluna de 1024px alinhada com o rodapé de preço.
4. Tela Hoje no celular (360px): faixa em tinta com a engrenagem visível; `/insumos` com a busca
   e o aviso sem rede na faixa clara abaixo; nada rola na horizontal.
5. Tema escuro: a faixa continua `brand-700` sobre o canvas escuro; anel de foco visível nos
   botões da faixa (Tab pelo cabeçalho).
6. Celular, `/fichas`: a linha é a de antes, toque vai ao editor, sem painel.
7. Leitor de tela (VoiceOver ou NVDA) numa linha da tabela: ouve nome, "rende", "custa",
   "sugerido", "praticado", "sobram" com os valores, uma vez só.
8. Portão: `lint`, `typecheck`, `test`, `build` — o build com as mesmas rotas de antes.
