# Spec 061 · O "+" na mão

**Tipo:** no celular, a ação de criar sai do cabeçalho de cada lista e vira um "+" âmbar no
centro da navegação inferior, que abre uma grade com tudo o que se registra no app, por toque ou
por apertar, arrastar e soltar. A barra passa a Hoje · Pedidos · **+** · Produtos · ⋯. A ordem de
Materiais e Produtos troca o `select` nativo por um botão que abre a folha inferior.
**Nenhum campo, nenhuma consulta, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** pedido do Filipe (2026-09-30), brief de `/impeccable shape` confirmado no mesmo dia.
**Depende de:** 060 (o "+" do cabeçalho saía junto com a faixa de contexto; agora não há "+" no
cabeçalho do celular).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d240`, `#d241`, `#d242`.

---

## Problema

**O "+" está longe do polegar.** Desde o `#d151` a ação primária das listas no celular é o "+" no
canto superior direito do cabeçalho. Com o celular numa mão (mercado, entrega, feira), o canto de
cima é o ponto mais difícil de alcançar da tela; e desde a 060 ele ainda some ao descer a lista.
Além disso, cada tela só cria o que é dela: para lançar no caixa estando em Produtos, são dois
toques de navegação antes do "+".

**A ordem é um `select` solto.** Em Materiais e Produtos a ordem é um `Seletor` nativo na linha da
contagem: um rótulo "Ordem" e uma caixa que abre a roleta do sistema, sem dizer o que cada ordem
faz. O `DESIGN.md` já promete outra coisa ("Seletor: no celular abre folha inferior").

---

## 1 · O que esta spec decide

### A barra: três destinos, o "+" no centro e o ⋯: `#d240`

- Cinco espaços iguais: **Hoje · Pedidos · + · Produtos · ⋯**. O número de pedidos do cardápio
  esperando continua em Pedidos (`#d235`).
- O **⋯** (`Ellipsis`, 20px, menor que os 24px dos destinos) abre a folha inferior (`Painel`)
  "Mais" com as outras páginas, em linhas de 52px, ícone + nome: **Materiais, Caixa, Compras,
  Clientes**. A ajudante vê só Materiais e Compras (`#d157`). Quando o caminho é uma dessas
  páginas, o ⋯ leva a pílula de ativo e `aria-current`; a linha da página atual também.
- Tocar na aba ativa continua voltando ao topo (`#d237`) nos três destinos. O ⋯ sempre abre a folha.
- O "+" é um círculo cheio `accent-500` de 48px com o traço `on-accent`, **dentro** da barra, sem
  sobressair dela: não é a pílula flutuante que o `#d151` tirou. É o primário do celular em toda
  tela que tem a barra; os editores continuam sem barra (`#d152`).
- Revisa o `#d150` (cinco destinos só com ícone: agora três e o ⋯) e o `#d151` (o "+" do cabeçalho
  e a bandeja: o `BotaoMais` sai das quatro telas e é apagado). "O que comprar" e "Clientes", que
  moravam na bandeja de Pedidos, ficam no ⋯.
- Desktop: nada muda. A barra lateral e os botões do cabeçalho continuam.

### A grade e o gesto: `#d241`

**O que tem**, em ordem fixa (o gesto depende de memória muscular; a ordem não muda por tela):

| Ação                     | Linha                                   | Destino                         | Quem       |
| ------------------------ | --------------------------------------- | ------------------------------- | ---------- |
| Novo pedido              | Encomenda de uma cliente                | `/pedidos/novo`                 | todas      |
| Lançar no caixa          | Entrada ou saída de dinheiro            | `/financeiro`, painel de lançar | dona       |
| Novo produto             | Receita ou kit, com o preço             | `/fichas/novo`                  | todas      |
| Novo material            | Ingrediente, embalagem, etiqueta        | `/insumos`, formulário novo     | todas      |
| Ler uma nota             | A compra entra nos materiais e no caixa | `/insumos/nota`                 | dona, rede |
| Contar a despensa        | Quanto tem de cada material             | `/insumos/contagem`             | todas      |
| Contar o que está pronto | O que já saiu do forno                  | `/fichas/contagem`              | todas      |

- **Arranjo:** folha presa acima da barra, que continua à vista, com o "+" virando "×"; o resto da
  tela sob o véu do `Painel` (`brand-800/35`). Duas colunas, "Novo pedido" na largura inteira no
  topo. Cada item: ícone de 20px, nome em `body` 500, a linha em `label` `ink-muted`; alvo de 72px
  no mínimo. Divisórias de 1px (`gap-px` sobre `line`), **não** um cartão por item.
- **Sem rede**, "Ler uma nota" fica `aria-disabled` com `MENSAGEM_FALHA["sem-rede"]` no lugar da
  linha, como na bandeja de hoje.
- **Apertar** o "+" (`pointerdown`) abre na hora. **Arrastar** destaca o item sob o dedo
  (`brand-100`, ícone em `brand-ink`), achado por `elementFromPoint` com o ponteiro capturado.
  **Soltar sobre um item** depois de arrastar executa. **Soltar sem ter arrastado** (menos de
  10px) deixa a grade aberta para tocar. **Soltar no vazio** também deixa aberta, sem executar.
- Fecha com toque no "×", no véu, `Escape`, ou ao escolher.
- `touch-action: none` e `-webkit-touch-callout: none` no "+": sem rolagem, sem menu de toque longo
  cancelando o arraste. `navigator.vibrate?.(8)` quando o item sob o dedo muda (Android; o iOS
  não tem).
- **Acessibilidade:** padrão de revelação: `aria-expanded` e `aria-controls` no "+", `aria-label`
  "Adicionar" / "Fechar". Aberto por teclado ou leitor de tela (`click` com `detail === 0`), o
  foco vai ao primeiro item; `Escape` devolve ao "+".
- **Movimento:** a folha sobe em 220ms `ease-quart`; o "+" gira 45° para "×". Com
  `prefers-reduced-motion`, sem translação nem giro: só opacidade.
- **Novo material e Lançar no caixa** abrem painéis dentro da tela. A grade navega até a tela e
  deixa o pedido num repasse em memória (`src/lib/acaoPedida.ts`: `pedirAcao`, `useAcaoPedida`),
  que a tela consome ao montar ou, se ela já está aberta, na hora. Sem parâmetro na URL: o
  `useSearchParams` exigiria `Suspense` nas duas telas, e o repasse funciona sem rede.

### A ordem em folha: `#d242`

- Abaixo de `lg`, na linha da contagem, um botão terciário de 44px: `ArrowUpDown` + o nome da
  ordem atual ("Pelo nome"). Toca e abre o `Painel` "Ordenar materiais" / "Ordenar produtos".
- Uma linha de 52px por ordem, rádio nativo (`<input type="radio">` dentro do `<label>`): nome em
  `body`, o que ela faz em `label` `ink-muted`, `Check` em `brand-ink` na escolhida. Escolher
  fecha a folha. A ordem continua guardada no aparelho (`#d226`, `#d229`).
- Desktop: o `Seletor` fica como está.

| Materiais              | O que faz                                    |
| ---------------------- | -------------------------------------------- |
| Pelo nome              | De A a Z                                     |
| Preço mudou por último | O que você comprou por último vem primeiro   |
| Pesa mais nos produtos | O que mais pesa no custo dos produtos, antes |

| Produtos           | O que faz                                |
| ------------------ | ---------------------------------------- |
| Pelo nome          | De A a Z                                 |
| Deixou mais no mês | O que mais deixou de dinheiro neste mês  |
| Sobra por unidade  | O que sobra mais em cada unidade vendida |
| Margem             | A maior parte do preço que fica com você |

---

## 2 · Antes de tocar em código

- Conferir que `setPointerCapture` no "+" não impede o `elementFromPoint` de achar o item. (Não
  impede: `elementFromPoint` testa pela geometria, e a captura só muda a quem o evento vai.)
- Conferir que a barra com a grade aberta não é afetada pelo `inert` de outro `Painel` (a grade
  não é `Painel`: é da barra).
- `Painel` trava a rolagem do `body`; a grade também deve travar. (Trava.)

---

## 3 · Escopo

- `src/components/layout/NavegacaoInferior.tsx` e `navegacao.ts`: os três destinos, o ⋯ e a folha
  "Mais".
- `src/components/layout/GradeAdicionar.tsx` (novo): o "+", a grade e o gesto.
- `src/lib/acaoPedida.ts` (novo): o repasse.
- `src/app/(app)/insumos/page.tsx`, `src/components/fichas/ListaFichas.tsx`,
  `src/components/pedidos/ListaPedidos.tsx`, `src/components/financeiro/TelaFinanceiro.tsx`: o
  `BotaoMais` sai; insumos e caixa consomem o repasse.
- `src/components/ui/EscolhaDeOrdem.tsx` (novo): o botão e a folha da ordem, com o `Seletor` no
  desktop. Materiais e Produtos passam a usá-lo.
- `src/components/ui/BotaoMais.tsx`: apagado.
- `DESIGN.md`: "Botão mais e bandeja", "Navegação inferior", "Seletor", "Estrutura responsiva".

---

## 4 · Roteiro de aparelho

1. 360×640, Hoje: a barra tem Hoje · Pedidos · + · Produtos · ⋯; o "+" está no centro exato.
2. Tocar no "+": a grade abre acima da barra, o "+" vira "×". Tocar em "Novo material": abre
   `/insumos` com o formulário novo. Repetir já em `/insumos`: o formulário abre sem navegar.
3. Em Produtos, apertar o "+", arrastar até "Lançar no caixa" sem tirar o dedo, soltar: abre o
   Caixa com o painel de lançar.
4. Apertar, arrastar para o vazio, soltar: a grade fica aberta, nada acontece.
5. Modo avião: "Ler uma nota" desabilitada, com o motivo.
6. Ajudante: sem Caixa e sem nota na grade; o ⋯ só com Materiais e Compras.
7. Em `/compras`, o ⋯ tem a pílula de ativo; na folha, Compras marcada.
8. Materiais: tocar em "↕ Pelo nome", escolher "Pesa mais nos produtos": a folha fecha, a lista
   reordena, o botão diz o nome novo; recarregar mantém.
9. VoiceOver/TalkBack: o "+" anuncia "Adicionar, recolhido"; ativar leva o foco ao primeiro item.
10. Movimento reduzido: a grade aparece sem subir e o "+" troca sem girar.
11. Desktop: nada muda.

---

## Critérios de aceite

- [x] Barra com três destinos, o "+" no centro e o ⋯, só no celular.
- [~] A grade abre por toque e por apertar-arrastar-soltar, com as regras de soltar acima
  (codificado; o gesto no aparelho é o roteiro 3 e 4, por rodar).
- [x] Novo material e Lançar no caixa abrem o painel, vindo de outra tela ou da mesma.
- [x] `BotaoMais` apagado, sem "+" no cabeçalho do celular.
- [x] A ordem de Materiais e Produtos em folha no celular, `Seletor` no desktop.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d240` a `#d242` escritos; `ESTADO.md` e `DESIGN.md` atualizados.

---

## 5 · Fora de escopo

- **A grade no desktop.** A barra lateral e os botões do cabeçalho resolvem lá.
- **Ordem da grade por tela** (a ação da tela atual primeiro). Quebra a memória do gesto.
- **Arrastar no ⋯.** Uma lista curta de páginas, e navegar não precisa de pressa.
- **Juntar o `ordemGuardada` de Materiais e Produtos num hook.** Mesma forma, duas telas; fica
  para quando vier a terceira.
