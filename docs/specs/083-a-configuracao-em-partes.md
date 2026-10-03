# Spec 083 · A configuração em partes

**Tipo:** reorganizar a tela em três partes com nome (o seu preço, a sua marca, a sua conta),
na ordem em que uma coisa depende da outra, com um índice no topo; o que vale no toque sai do
formulário e vira linha; um âmbar só. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** a 082 (a prévia dela mora na coluna desta).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d283`, `#d284`.

---

## Problema

O print do celular tem 4.267 px de altura: onze telas de rolagem, dezesseis caixas iguais.

1. **A ordem não segue a conta.** Trabalho, energia e despesas fecham em "Cada hora de produção
   custa"; depois vêm Formas de pagamento, **Assinatura** e **a folha do orçamento**, e só então
   o **Preço padrão**, que é a continuação direta do custo por hora. A cobrança do Rende está no
   meio da matemática do preço dela.
2. **Tudo tem o mesmo peso.** Dez blocos com a mesma caixa, o mesmo ícone, o mesmo título e a
   mesma descrição; o tema (três pílulas) e os avisos (uma caixa de marcar) ocupam um cartão
   inteiro cada. É a grade de cartões idênticos que o `DESIGN.md` recusa.
3. **Dois jeitos de gravar misturados.** Oito blocos esperam o "Salvar"; "Avisos por e-mail" e
   "Tema" valem no toque e precisam de uma frase explicando isso ("Vale no toque, sem salvar").
   Quando a posição não diz, o texto tem de dizer.
4. **Dois âmbares.** No desktop, "Salvar" no cabeçalho e "Gerenciar assinatura" no bloco são os
   dois primários.
5. **O desktop usa metade da janela.** A coluna de 1024 px deixa 600 px vazios à direita num
   monitor de 1864, e o número que fecha a conta ("Cada hora custa R$ 27,50") rola para fora.
6. **A descrição do cabeçalho** fala só dos custos ("Os custos que não aparecem no produto…"),
   e a tela é muito mais que isso.

---

## 1 · O que esta spec decide

### Três partes, nesta ordem: `#d283`

Cada parte é **seção no papel** (`h2` em `heading` sobre o `--canvas`, sem caixa, 48 px antes),
e os blocos dentro dela continuam `BlocoConfiguracao`.

1. **O seu preço** (grava com "Salvar"): Seu trabalho · Energia e gás · Despesas fixas · Cada
   hora de produção custa · **Preço padrão** · Formas de pagamento.
2. **A sua marca** (grava com "Salvar"): Na folha do orçamento · a linha "Seu cardápio" (sai da
   prateleira e vem para cá: é vitrine, não conta).
3. **A sua conta** (vale no toque): lista com divisórias, uma linha por item, nenhum cartão:
   Assinatura (só a linha; o detalhe é da 084) · Quem te ajuda · Avisos por e-mail (a caixa de
   marcar vira a linha, com o rótulo de sempre) · Tema (a linha com as três pílulas à direita no
   desktop, embaixo no celular) · Como funciona · Baixar meus dados · Encerrar minha conta ·
   Sair. A ordem do fim é a de hoje (`MeusDados` antes de "Sair").

- **Índice no topo**, na faixa de ferramentas do cabeçalho: três pílulas "O seu preço · A sua
  marca · A sua conta", âncoras, com `aria-current` na parte visível (um
  `IntersectionObserver`, nada de biblioteca). 44 px, cabem em 360 px.
- **Descrição do cabeçalho**: uma linha que cubra a tela, por exemplo "De onde sai o preço de
  todo produto, e o que é da sua conta."
- A ajudante continua com a tela reduzida de hoje.

### O que vale no toque fica fora do formulário: `#d284`

- A barra de salvar e o "Você mudou coisas que ainda não foram salvas" só falam das duas
  primeiras partes. Na terceira, cada linha age na hora, como já age, e a frase "Vale no toque,
  sem salvar" sai: a posição diz.
- "Gerenciar assinatura" vira **secundário**. O âmbar da tela é o "Salvar".

### A coluna no desktop largo

- A partir de `2xl`, "Cada hora de produção custa" e a prévia da 082 saem do fluxo e viram a
  coluna de 320 px à direita, presa sob o cabeçalho, como o resumo do pedido (`#d274`). Abaixo
  de `2xl`, nada muda. A rota sai de `(coluna)` só se for preciso para isso; conferir como a 077
  fez.

---

## 2 · Antes de tocar em código

1. Ler como a 077 tirou `/pedidos/[id]` de `(coluna)` e montou a coluna presa.
2. Conferir que `SeuCardapio` não depende de estar na prateleira (âncora `ANCORA_DO_CONTATO`,
   link da Hoje para cá).
3. Conferir quem linka para `/configuracao#avisos` e manter a âncora.

---

## 3 · Escopo

- `TelaConfiguracao.tsx`: ordem, partes, índice, coluna `2xl`.
- `BlocoTema.tsx` e o bloco de avisos: de cartão para linha.
- Nenhum componente de `ui/` novo, a menos que o índice já exista em outra tela.

---

## 4 · Roteiro de navegador

1. Celular 360 px: as três pílulas numa linha; tocar em "A sua conta" desce até ela e a pílula
   fica ativa.
2. Mudar o tema e desmarcar os avisos: nenhuma barra de salvar aparece.
3. Mudar a hora: a barra aparece; "Gerenciar assinatura" continua secundário.
4. Desktop 1864 px: o custo por hora preso à direita enquanto se rola o preço padrão.
5. Ajudante: a tela reduzida de sempre.

---

## Critérios de aceite

- [ ] Três partes na ordem decidida; Preço padrão logo depois do custo por hora.
- [ ] A terceira parte é lista, sem cartão, e nada nela pede "Salvar".
- [ ] Um âmbar por tela.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d283` e `#d284` escritos; `DESIGN.md` com a seção da Configuração; `ESTADO.md`
      atualizado.

---

## 5 · Fora de escopo

- **Uma página por parte** (`/configuracao/preco` etc.). Com o índice, uma página basta; dividir
  em rotas quebra a barra de salvar única.
- **Busca na configuração.** Três partes não pedem busca.
- **Salvar no toque também o preço.** Mudar a hora refaz os produtos (082): é a decisão que
  merece o botão.
