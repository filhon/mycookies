# Spec 059 · A barra diz de quem é

**Tipo:** a barra lateral do desktop ganha o nome do negócio, os dois destinos que só tinham
atalho (Compras e Clientes), o prazo do teste no pé e o link de pular para o conteúdo. Um
componente morto sai. **Nenhum campo, nenhuma consulta, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica dos componentes de layout (2026-09-30).
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d236`.

---

## Problema

**O cromo não diz de quem é.** A barra mostra o logotipo do Rende e, no pé, o e-mail em 70% de
opacidade. O nome do negócio (`conta.nome`) não aparece em nenhum lugar do shell. Toda ferramenta
com conta de empresa (Slack, Notion, Shopify) põe o nome da conta no topo. Para a ajudante,
que entra na conta de outra pessoa, é a primeira coisa a confirmar.

**A barra copia um limite que não é dela.** "Cinco destinos" é o teto da navegação inferior
(`navegacao.ts`), onde cada alvo precisa de 56px de largura. A barra lateral tem 240px por toda a
altura da tela e usa o mesmo teto. `/compras` e `/clientes` só se alcançam no desktop por botões
de atalho no cabeçalho de outras telas (`AtalhoParaCompras`, `AtalhoParaClientes`) ou pelos
cartões da Hoje. Quem não lembra do atalho não acha a lista do mercado.

**O teste acaba sem aviso fora da Hoje.** O prazo do teste mora na `FaixaDoTeste`, que só a Hoje
desenha. No desktop, com `/fichas` aberta a noite inteira, o teste acaba e a próxima tela é
`/assinatura`. Linear, Vercel e Notion põem "faltam N dias" no pé da barra, com o botão de assinar.
É receita do Rende, e é honestidade com ela.

**O teclado passa por nove paradas antes do conteúdo.** O `PRODUCT.md` pede navegação completa por
teclado no desktop. Cada tela começa pelos cinco destinos, "Como funciona", "Configuração" e
"Sair". Não há link de pular.

**Dois restos.** `ModuloPendente` não é importado por nenhum arquivo. Os três links do pé repetem
a mesma lista de classes.

---

## 1 · O que esta spec decide

### O topo, o meio e o pé da barra: `#d236`

**Topo.** Abaixo do logotipo, o nome do negócio em `label` 600 `on-brand`, uma linha, truncado com
`title` com o nome inteiro. O logotipo continua sozinho na linha dele (o motivo do comentário
atual vale).

**Meio.** Dois grupos na mesma `<nav>`:

1. Os cinco destinos, como hoje.
2. Depois de 16px de respiro, sem título de grupo e sem filete: **Compras** (`ShoppingCart`) e
   **Clientes** (`Users`), os ícones que os atalhos já usam, no mesmo estilo de item. Filtrados
   por `rotaSoDaDona`, como os cinco.

`DESTINOS_DA_BARRA` mora em `navegacao.ts`, ao lado de `DESTINOS`. A navegação inferior não muda:
o teto dela é físico.

Os atalhos do cabeçalho continuam: são contextuais (de `/pedidos` para quem pediu), e não o único
caminho.

**Pé.** Só para a dona, só com `situacaoDaConta` em `teste`: uma linha acima de "Como funciona",
com `Hourglass`, `fraseDoTeste(dias)` em `label` `on-brand-muted` e "Assinar" como link em
`on-brand` 600 para `/assinatura`. Sem tom de atenção: a urgência dos três últimos dias já é da
Hoje (`#d219`), e a barra só informa. Livre, assinante e ajudante: nada.

**Pular para o conteúdo.** Primeiro elemento focável do `AppShell`: "Pular para o conteúdo",
`sr-only` até ganhar foco, então visível no canto com o anel de foco. Leva a `<main id="conteudo"
tabIndex={-1}>`.

**Limpeza.** `ModuloPendente.tsx` sai. Os três links do pé passam a sair de uma função local
`ItemDaBarra`, e os sete destinos também.

---

## 2 · Antes de tocar em código

- Conferir que `conta.nome` é o nome do negócio, e não o da dona (`conta.proprietaria` é o dela).
- Conferir em `ROTAS_SO_DA_DONA` se `/compras` e `/clientes` são da ajudante.
- Na altura de 768px (notebook pequeno com zoom), os sete destinos, o prazo e os três links do pé
  cabem sem rolar? Se não couberem, a `<nav>` rola, e não o pé.

---

## 3 · Escopo

- `src/components/layout/navegacao.ts`: `DESTINOS_DA_BARRA`.
- `src/components/layout/BarraLateral.tsx`: nome, segundo grupo, prazo, `ItemDaBarra`.
- `src/components/layout/AppShell.tsx`: o link de pular e o `id` do `main`.
- `src/components/layout/ModuloPendente.tsx`: sai.

---

## 4 · Roteiro de aparelho

1. Desktop, conta da Maynara: "MyCookie's" sob o logotipo.
2. Compras e Clientes na barra; clicar abre as duas; o item ativo acende.
3. Conta em teste: "Faltam N dias" e "Assinar" no pé; "Assinar" abre `/assinatura`.
4. Conta livre (a da Maynara) e login de ajudante: nenhuma linha de prazo.
5. Recarregar qualquer tela e apertar Tab: "Pular para o conteúdo" aparece; Enter leva o foco ao
   conteúdo, e o próximo Tab cai no primeiro controle da tela.
6. Janela de 1024×768: nada cortado.

---

## Critérios de aceite

- [ ] Nome do negócio no topo da barra.
- [ ] Compras e Clientes como destinos da barra, filtrados pelo papel.
- [ ] Prazo do teste no pé, só para a dona em teste.
- [ ] Link de pular, primeiro foco da página.
- [ ] `ModuloPendente` fora; nenhum link da barra com classes repetidas.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d236` escrito; `ESTADO.md` e a linha "Barra lateral" do `DESIGN.md` atualizados.

---

## 5 · Fora de escopo

- **Trocar de conta.** Uma usuária, uma conta (`#d01`). O nome no topo é o lugar onde o seletor
  entra no dia em que existir, e não antes.
- **Menu da usuária** (avatar, perfil, sair num menu). Sair continua um botão: um menu esconderia a
  única ação que ela usa ali.
- **Recolher a barra.** 240px em 1024px deixam 784px de conteúdo, e a tabela de `/fichas` já
  espera o `xl` para acoplar o detalhe.
- **Paleta de comandos (Ctrl+K).** Ver a resposta da crítica: os destinos visíveis e a busca de
  cada lista cobrem o que ela procura hoje.
