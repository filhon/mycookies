# Spec 035 · O celular por gesto

**Tipo:** cromo e arranjo, só no celular. O desktop não muda uma linha. A navegação inferior
fica só com os ícones; nas três listas a pílula flutuante sai e a ação primária vira um "+" no
cabeçalho que abre uma bandeja; nos dois editores a navegação some e o resumo de custo desce
até o pé da tela, porque o aparelho de hoje volta por gesto.
**Nenhum campo, nenhuma rota, nenhuma consulta, nenhuma regra, nenhuma dependência, nada em
`src/lib/domain/`.**
**Tamanho:** uma sessão.
**Origem:** uso real no aparelho da Maynara, 2026-09-21.
**Depende de:** a 034 entregue (está).
**Aprovações pedidas:** nenhuma. **Decisões a registrar:** `#d150` (a navegação inferior só
com ícones), `#d151` (o "+" no cabeçalho e a bandeja no lugar da pílula flutuante — reverte a
linha "nunca círculo com +" do `DESIGN.md`), `#d152` (editor sem navegação inferior: o gesto
do sistema é o voltar).

---

## Problema

1. **A navegação inferior gasta 20px de altura com cinco palavras que os ícones já dizem.**
   "Hoje", "Materiais", "Produtos", "Pedidos", "Caixa": depois da primeira semana ninguém lê.
   Em 360×640 são 20px de lista a menos em toda tela.
2. **A pílula flutuante cobre a última linha e disputa o polegar com a navegação.** Em
   `/insumos` ela ainda divide o cabeçalho com "Ler uma nota", que no celular espreme o título
   em 360px. Em `/pedidos` o cabeçalho tem três botões e o título.
3. **Os dois editores carregam três faixas fixas onde só uma trabalha.** Cabeçalho grudento,
   resumo de custo preso ao pé e, embaixo dele, a navegação inferior — que ninguém usa no meio
   de um formulário (o `#d74` já a esconde com o teclado aberto). O resumo fica a 72px do pé, e
   os 72px são vão. O aparelho de hoje volta por gesto de borda, e o cabeçalho já tem o voltar.

**O que esta spec entrega:** a navegação só com ícones; o "+" com bandeja em `/insumos`,
`/fichas` e `/pedidos`; `/fichas/[id]` e `/pedidos/[id]` sem navegação inferior, com o resumo
no pé.

**O que não entrega:** `/financeiro` (a pílula "Lançar" continua; é outra família de tela e
fica para quando esta for sentida); qualquer coisa no desktop; folha inferior para a contagem
ou para a nota.

---

## O desenho

### 1. A navegação inferior só com ícones (`#d150`)

`NavegacaoInferior` deixa de renderizar `destino.curto`. Cada `<Link>` ganha
`aria-label={destino.rotulo}` — o rótulo continua existindo para o leitor de tela e para o
`title` no hover; o que sai é o texto visível. A pílula `brand-100` atrás do ícone ativo é o
que diz "você está aqui" e cresce para `h-8 w-14`; o ícone vai a `size-6` (24px, como o
`DESIGN.md` já dizia). `min-h-14` fica: o alvo não encolhe.

`Destino.curto` sai de `navegacao.ts`: não sobra leitor.

### 2. O "+" e a bandeja (`#d151`)

Nasce `src/components/ui/BotaoMais.tsx`, **só no celular** (`lg:hidden`). É um botão redondo de
44px, âmbar com `on-accent` (é a ação primária da tela, e a única no cabeçalho), ícone `Plus`,
`aria-label` dado pela tela, `aria-haspopup="dialog"` e `aria-expanded`. Vai em `acao` do
`CabecalhoPagina`, à direita do título. Some com o estado vazio, como a pílula somia (um botão
primário por tela).

A bandeja é o `Painel` que já existe — no celular ele é a folha inferior, com foco preso,
`Escape`, `inert` e a barra de arrasto. `BotaoMais` recebe `opcoes` e monta dentro do `Painel`
uma lista com divisórias, uma linha por opção: ícone à esquerda, rótulo em `body` 500, linha
inteira como alvo (`toque`, 52px). Uma opção é `{ rotulo, icone, href }` ou
`{ rotulo, icone, onClick }`; pode trazer `desabilitada: true` com `dica` — a linha fica com
`aria-disabled`, opacidade 45%, e a dica embaixo do rótulo em `label` `ink-muted`. Escolher
uma opção fecha a bandeja; o `Link` navega, o `onClick` roda depois de fechar. O título da
bandeja é o mesmo `aria-label` do botão.

**Não** é o Popover API nem um `<details>`: a invariante é folha inferior no celular, e o
`Painel` já é ela. Nenhum componente novo de sobreposição.

As três telas:

| Tela       | `aria-label` | Opções, nesta ordem                                                        |
| ---------- | ------------ | -------------------------------------------------------------------------- |
| `/insumos` | "Adicionar"  | Novo material (`Plus`) · Ler uma nota (`ScanLine`, desabilitada sem rede)  |
| `/fichas`  | "Adicionar"  | Novo produto (`Plus`) · Contar o que está pronto (`PackageOpen`)           |
| `/pedidos` | "Mais ações" | Novo pedido (`Plus`) · O que comprar (`ShoppingCart`) · Clientes (`Users`) |

O que sai do celular: a `BotaoFlutuante` das três telas; `EntradaLeitura`,
`EntradaContagemPronto`, `AtalhoParaCompras` e `AtalhoParaClientes` ficam `hidden lg:inline-flex`
no cabeçalho — no desktop nada muda, e os botões "Novo …" do desktop já eram `hidden
lg:inline-flex`. A bandeja é o único lugar dessas ações no celular; o `Plus` na primeira
linha diz que ela é a de criar.

"Ler uma nota" sem rede: a opção nasce desabilitada com `MENSAGEM_FALHA["sem-rede"]` como
dica (a tela lê `useConexao()`, o mesmo sinal de `EntradaLeitura`). `AvisoLeituraSemRede` na
faixa de ferramentas de `/insumos` passa a ser `hidden lg:flex`: no celular a frase mora ao lado
da opção que ela explica, e não numa faixa sem botão. O estado vazio de `/insumos` não muda
(ele tem os botões próprios).

`BotaoFlutuante` **fica**: `/financeiro` ainda o usa. A linha do `DESIGN.md` ("nunca círculo
com +") vira: "no celular a ação primária da lista é o `+` redondo no cabeçalho, que abre a
bandeja com o nome de cada ação; a pílula com nome fica só onde a tela tem uma ação e nenhuma
bandeja". O que a regra antiga protegia — "um + sozinho obriga a adivinhar o que nasce dele" —
a bandeja responde: o nome aparece um toque depois, antes de qualquer coisa acontecer.

### 3. O editor sem navegação inferior, o resumo no pé (`#d152`)

Em `/fichas/[id]` e `/pedidos/[id]` (novo **e** edição: é a mesma tela), no celular:

- `NavegacaoInferior` não renderiza. `navegacao.ts` ganha `semNavegacaoInferior(caminho)`:
  `/^\/fichas\/(?!contagem$)[^/]+$/` ou `/^\/pedidos\/[^/]+$/`. `/fichas/contagem` e
  `/pedidos/[id]/orcamento` ficam de fora (a contagem tem a navegação; a folha do orçamento
  é impressão). O `<nav>` já lê `usePathname`; é um `if` antes do `return`.
- `RodapeFixo` ganha `noPe?: boolean`. Com ele, no celular: `bottom-0` (e não
  `4.5rem + safe-area`), e o cartão perde o raio e a borda de baixo, ganhando
  `area-segura-inferior` por dentro — a superfície continua até embaixo do indicador do
  iPhone, em vez de o cartão flutuar sobre uma tira de canvas. `lg:` não muda.
  `PainelPreco` e `PainelPedido` passam `noPe`.
- O respiro de baixo dos dois formulários encolhe 72px junto: `pb-44` → `pb-32` na ficha,
  `pb-48` → `pb-36` no pedido (os valores de `apertado:` já eram estes; `lg:` fica).
- Saída: o `LinkVoltar` do cabeçalho (já existe) e o gesto de borda do sistema. Os dois passam
  pela guarda de "sair sem salvar" (`useGuardaDeSaida`, `#d132`) — o gesto é `popstate`, que a
  sentinela já intercepta. Nada a fazer aqui além de conferir no roteiro.

`AppShell` não muda: `pb-24` do `main` continua reservando o rodapé, que agora ocupa a faixa
que era da navegação.

---

## Arquivos

- `src/components/layout/navegacao.ts`: sai `curto`; entra `semNavegacaoInferior`.
- `src/components/layout/NavegacaoInferior.tsx`: `aria-label`, sem texto, o `if` da rota.
- `src/components/ui/BotaoMais.tsx` (novo): o botão e a bandeja sobre `Painel`.
- `src/components/ui/RodapeFixo.tsx`: `noPe`.
- `src/app/(app)/(coluna)/insumos/page.tsx`, `src/components/fichas/ListaFichas.tsx`,
  `src/components/pedidos/ListaPedidos.tsx`: `BotaoMais` em `acao`; a `BotaoFlutuante` sai; os
  atalhos ficam `hidden lg:inline-flex`.
- `src/components/notas/EntradaLeitura.tsx`: `AvisoLeituraSemRede` aceita `className`
  (para o `hidden lg:flex`).
- `src/components/fichas/PainelPreco.tsx`, `src/components/pedidos/PainelPedido.tsx`: `noPe`.
- `src/components/fichas/FormularioFicha.tsx`, `src/components/pedidos/FormularioPedido.tsx`:
  o `pb-`.
- `DESIGN.md`: Components → "Botão flutuante" (a regra nova), "Navegação inferior" (só ícone),
  linha nova "Botão mais e bandeja"; Estrutura responsiva → o editor sem navegação.
- `docs/ESTADO.md`, `docs/DECISOES.md#d150–d152`.

## Fora de escopo

- `/financeiro`: a pílula "Lançar" fica, e a linha do desktop também.
- Qualquer mudança no desktop, inclusive na barra lateral.
- Folha inferior na contagem (`/insumos/contagem`, `/fichas/contagem`) ou na nota: a navegação
  continua lá.
- Arrastar a bandeja para fechar: o `Painel` não tem, e não nasce aqui.
- Esconder a navegação em outras telas de formulário (`/configuracao` tem barra própria e é
  destino do menu Hoje; fica).
- Trocar o `Painel` por Popover API.

## Roteiro de aceite (celular, 360×640 e um iPhone com indicador)

1. Navegação inferior: cinco ícones sem texto, o ativo com a pílula `brand-100`; VoiceOver ou
   TalkBack lê "Materiais", "Produtos"… ao tocar cada um.
2. `/insumos` com materiais: nenhuma pílula flutuante; o "+" âmbar à direita do título; a
   última linha da lista aparece inteira. Toque no "+": a folha sobe com "Novo material" e
   "Ler uma nota". "Novo material" abre o painel de cadastro; "Ler uma nota" leva à nota.
3. `/insumos` em modo avião: "Ler uma nota" na bandeja está desabilitada e diz por quê; a faixa
   de ferramentas não mostra a frase.
4. `/insumos` sem material nenhum: sem "+"; o estado vazio tem os botões dele, como antes.
5. `/fichas` e `/pedidos`: o mesmo, com as opções da tabela. Em `/pedidos` o cabeçalho tem só o
   título e o "+".
6. `/fichas/nova`: sem navegação inferior; o resumo de preço encostado no pé, sem tira de canvas
   embaixo (no iPhone, a superfície continua por baixo do indicador); "Voltar" no cabeçalho
   leva a `/fichas`. Com o teclado aberto, o mesmo que hoje (`apertado:`).
7. `/pedidos/novo`: idem, com o resumo do pedido.
8. Editor sujo, gesto de voltar do sistema: o diálogo "sair sem salvar" aparece; "Continuar
   aqui" mantém a tela sem navegação inferior.
9. `/fichas/contagem`, `/insumos/contagem`, `/insumos/nota`, `/pedidos/[id]/orcamento`:
   inalterados.
10. Desktop 1280: nada mudou em nenhuma das cinco telas.
11. Portão: `lint`, `typecheck`, `test`, `build` — as mesmas rotas de antes.
