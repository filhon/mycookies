# Spec 121 · O pedido sem aperto

**Tipo:** o formulário do pedido no cardápio público (a folha do celular e o pedido ao lado da
lista no desktop) ganha forma: acaba a rolagem lateral, os dias viram grade, os itens do combo
param de espremer o nome, as divisórias saem, os campos se agrupam e, no desktop, o total e o
"Enviar pedido" ficam sempre à vista. Nenhum schema, nenhuma regra, nenhum índice, nenhuma
dependência, nada no handler.
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10 (item 4 do pedido de quem
conduz o projeto).
**Depende de:** 031, 118, 120 (mesmo arquivo; a 120 entra antes).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d325`.

---

## Problema

Nos prints, o pedido parece um formulário de cadastro espremido numa coluna. Em ordem de
gravidade:

1. **A rolagem lateral esconde os campos.** É um bug, e tem uma causa só: o `<fieldset>` do
   navegador tem `min-inline-size: min-content`. A faixa de "Para quando?" tem 14 botões de
   64 px mais "Outro dia" (≈ 1.000 px); o `fieldset` dela cresce até essa largura, sai da coluna,
   e o contêiner que rola (o corpo do `Painel` e o `<aside>`, os dois `overflow-y-auto`, que
   viram `overflow-x: auto`) ganha barra horizontal. O formulário inteiro desliza de lado: no
   print do desktop o nome, o WhatsApp e o "Retiro" saem pela esquerda; no do celular, a folha
   abre já deslocada. O `overflow-x-auto` da faixa nunca chegou a agir.
2. **Os dias se escondem numa faixa que rola**, com a barra de rolagem cinza à mostra. A
   cliente vê quatro dias e meio e não sabe que há mais; no desktop, sem gesto de arrastar, ela
   precisa achar a barra.
3. **O combo espreme o nome.** "Combo 4 Cookies (1 Cookie Oreo 120g + 1 Cookie Pistache 120g +
   1 Cookie Red Velvet 120g + 1 Cookie Tradicional 120g)" em `body`, ao lado do passo: cinco
   linhas numa coluna de 180 px.
4. **Divisórias em excesso.** No desktop, três filetes em 200 px: o do cabeçalho do `<aside>` e
   os dois da lista de itens (`border-y`), com um item só entre eles.
5. **Nenhum agrupamento.** Seis controles em `space-y-6` uniforme: nome, WhatsApp, como recebe,
   dia, recado, todos com o mesmo peso. Nada diz "estes dois são você, estes três são a
   entrega".
6. **No desktop, o botão some.** O total e o "Enviar pedido" vivem no fim do `<aside>`, dentro
   da mesma rolagem do formulário: numa tela de 768 px eles ficam abaixo da dobra do próprio
   pedido, e a cliente rola uma coluna estreita para achar como mandar.
7. **O recado ocupa uma área de texto inteira** para algo que a maioria não escreve.

---

## 1 · O que esta spec decide: `#d325`

### A causa da rolagem lateral, na raiz

- Em `globals.css`, na camada `base`: `fieldset { min-inline-size: 0; }`. O preflight do
  Tailwind zera margem e enchimento do `fieldset`, mas não esse mínimo. Uma linha, para todo
  `fieldset` do app, e não um `min-w-0` em cada formulário que um dia tiver uma linha comprida.
- Nada de `overflow-x-hidden` no `Painel` ou no `<aside>`: esconderia o próximo transbordo e
  cortaria o anel de foco.

### Os dias em grade

- `DIAS_EM_BOTAO` passa de 14 a **7**, e a faixa vira **`grid grid-cols-4 gap-2`**: sete dias
  e "Outro dia" fecham duas linhas de quatro, sem rolagem nenhuma, no celular e no `<aside>`.
- A célula fica como é (64 px de altura, "amanhã"/"sex" em `micro` e "17/10" em `body` 600),
  agora com a largura da coluna (≈ 74 px a 360 px, ≈ 84 px no `<aside>`). "Outro dia" é a oitava célula, do mesmo
  tamanho, e continua abrindo o `type="date"` abaixo da grade.
- Com a agenda limitada (`ultimoDia`), a grade tem menos células; com menos de quatro, elas não
  esticam (`grid-cols-4` fixo).
- "A {quem} confirma se dá para esse dia." continua abaixo.

### O item do combo

- A linha do pedido vira nome + sabores + preço, com o passo no topo à direita
  (`items-start`):
  - **nome do produto** em `body` 500 ("Combo 4 Cookies");
  - **os sabores** em `label` `--ink-muted`, "1 Cookie Oreo 120g · 1 Cookie Pistache 120g · 1
    Cookie Red Velvet 120g · 1 Cookie Tradicional 120g", quebrando à vontade;
  - **o subtotal** em `Dinheiro` `sm`, abaixo.
- `nomeDa` e o `nomeComEscolhas` desta tela saem; a mensagem do WhatsApp e o pedido gravado não
  mudam (usam `mensagemDeAviso` e o handler).

### Menos linhas, mais grupo

- A lista de itens perde o `border-y`: `divide-y` só **entre** itens. Um item, nenhum filete.
- O cabeçalho do `<aside>` e o rodapé dele ganham as bordas do `Painel` e mais nenhuma: são as
  bordas da rolagem, e as mesmas do celular.
- O formulário vira **três grupos**, cada um com `h3` em `subheading` 600 `--ink`, **32 px entre
  grupos e 16 px dentro** (o ritmo do `DESIGN.md`), sem caixa e sem filete:
  1. os itens, sem título (o título do painel já é "Seu pedido");
  2. **"Seus dados"**: nome e WhatsApp;
  3. **"Como e quando"**: Retiro/Entrega, o endereço ou o CEP da 118, e "Para quando?".
- Os `legend` "Como você recebe?" e "Para quando?" continuam, em `label` 500: são o nome do
  controle, e o `h3` é o do grupo.

### O recado recolhido

- No lugar da área de texto, um botão terciário com `Plus`: **"Recado pra {quem}"** e, ao lado,
  "opcional" em `--ink-muted`. Tocar abre o `AreaTexto` de hoje (mesma dica, mesmo limite) e
  leva o foco para ele. Com recado já escrito (o `sessionStorage` do `mudou`), abre aberto.
- A linha "Seus dados vão só para {negócio}…" fica no fim, em `label` `--ink-muted`.

### O pedido ao lado, com o botão sempre à vista (desktop)

- O `<aside>` vira a mesma anatomia do `Painel`: `flex flex-col` com o teto de hoje
  (`max-h-[calc(100dvh-3rem)]`), **cabeçalho** fixo ("Seu pedido" e "1 item"), **corpo** que
  rola (`min-h-0 flex-1 overflow-y-auto`) e **rodapé** fixo com o total, o "Enviar pedido" e a
  linha do WhatsApp. O que rola é o formulário; o total e o botão nunca saem da vista.
- A coluna passa de 23,25 rem a **25 rem**: o corpo fica com ≈ 360 px úteis, a largura de um
  celular, que é para onde o formulário foi desenhado.
- O estado vazio ("Nada no pedido ainda") e o "Pedido enviado" ficam como são, dentro da nova
  anatomia.

### Uma folha, e não passos

- O celular continua com **uma folha só**, rolando, e não "sacola → dados → confirmar". Com a
  rolagem lateral corrigida, a faixa de dias virada grade e o recado recolhido, o formulário são
  quatro controles visíveis em três grupos; passos acrescentariam um "Continuar" e um "Voltar"
  dentro de uma folha que já tem o gesto de fechar, e a cliente deixaria de ver o item enquanto
  escolhe o dia.

---

## 2 · Antes de tocar em código

1. A 120 já entrou (a prop `pe` no mesmo `return`).
2. Ler, em `PedidoPeloCardapio.tsx`, o `corpo`, o `rodape` e o `<aside>`; em `Painel.tsx`, a
   anatomia que o `<aside>` vai copiar (sem virar `Painel`: no desktop o pedido não flutua,
   `#d166`).
3. Procurar os outros `<fieldset>` do app (`grep -rn "<fieldset" src`) para o roteiro do passo 7.

---

## 3 · Escopo

- `globals.css`: a linha do `fieldset`.
- `PedidoPeloCardapio.tsx`: `DIAS_EM_BOTAO`, a grade, a linha do item, os três grupos, o recado
  recolhido, o `<aside>` em três partes e a largura da coluna da grade da página.
- Nada em `domain/`, nenhum teste novo.
- Linha em `components/comecar/novidades.ts`: "O pedido pelo cardápio, mais fácil de
  preencher".

---

## 4 · Roteiro de navegador

Em 360, 390, 1024, 1280 e 1440 px, nos dois temas:

1. Com o pedido aberto, em nenhuma largura há barra de rolagem horizontal no corpo da folha ou
   do `<aside>`; arrastar para o lado não move nada.
2. A grade de dias: sete dias e "Outro dia" em duas linhas; "Outro dia" abre o calendário
   abaixo; o dia marcado tem a cor da loja e o rádio de verdade por baixo.
3. Combo de 4 sabores: nome numa linha, sabores abaixo em apagado, o passo no topo à direita,
   nada com mais de duas linhas a 360 px além dos sabores.
4. Um item só: nenhum filete na lista. Três itens: dois filetes, entre eles.
5. Desktop a 768 px de altura, com Entrega por CEP aberta: o formulário rola dentro do
   `<aside>`, e o total com o "Enviar pedido" ficam visíveis o tempo todo.
6. O recado: recolhido por padrão; tocar abre com o foco no campo; um `mudou` com recado
   escrito recarrega com ele aberto e preenchido.
7. Os outros formulários com `<fieldset>` (os achados no passo 3 da seção 2) continuam iguais.
8. Teclado: a ordem de foco é itens, nome, WhatsApp, Retiro/Entrega, dias, recado, Enviar.
   Leitor de tela anuncia os grupos pelos `h3`.

---

## Critérios de aceite

- [ ] Nenhuma rolagem lateral no pedido, pela linha do `fieldset`, e não por esconder o
      transbordo.
- [ ] Os dias em grade de quatro colunas, sete dias e "Outro dia".
- [ ] O combo com nome, sabores e preço em linhas próprias.
- [ ] Divisória só entre itens; três grupos com título; o recado recolhido.
- [ ] No desktop, o total e o "Enviar pedido" sempre à vista.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d325` escrito; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Sete dias, e não catorze.** A segunda semana inteira em botão era o que fazia a faixa rolar.
  Encomenda para daqui a dez dias é a exceção, e "Outro dia" está a um toque.
- **Uma folha, e não passos** (acima). Revisitar se o formulário crescer (pagamento escolhido
  na página, por exemplo) a ponto de não caber em duas rolagens do celular.
- **O recado recolhido.** Esconde de quem tem alergia o lugar de dizer. O botão diz "Recado pra
  Maynara" em `label` com ícone, na ordem do formulário, e não num menu: é achável sem ser um
  campo vazio grande.

---

## Fora de escopo

- **O `Painel`** (o primitivo): nenhuma mudança. O cabeçalho e o rodapé dele continuam com
  filete.
- **Escolher a forma de pagamento na página.** A faixa da 120 diz quais ela aceita; escolher é
  conversa no WhatsApp.
- **Salvar o nome e o WhatsApp entre visitas** (`localStorage`): o carrinho não usa de
  propósito (o celular emprestado), e os dados também não.
- **O selo de verificação**: recusado na 120 (`#d324`).
