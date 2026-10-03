# Spec 075 · Um âmbar por vez

**Tipo:** reorganiza o editor de pedido (`/pedidos/[id]`, novo e edição): um botão âmbar por vez,
a trilha do pedido no lugar de "Em que pé está", os blocos na ordem da encomenda e as descrições
cortadas ao que ensina. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela de pedido sobre os prints de celular e desktop de 2026-10-02.
**Depende de:** nada. **Vem antes de 076 a 081**: todas mexem nesta tela e partem desta ordem.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d271` e `#d272`.

---

## Problema

Os prints do pedido confirmado mostram, na mesma tela, **quatro botões âmbar**: "Salvar", "Abrir a
folha do orçamento", "Abrir o WhatsApp com o resumo" e "Marcar como pago". O `DESIGN.md` diz um
primário por tela, e o motivo aparece no print: com quatro, nenhum diz qual é o próximo passo.

O resto vem da mesma raiz, a tela cresceu um bloco por spec:

1. **Dez blocos, todos com a mesma forma**: cartão, ícone, título, parágrafo. O parágrafo ensina a
   mesma coisa a cada abertura ("O nome basta. A cliente que compra uma vez na feira não precisa
   virar cadastro."). No vigésimo pedido da semana ela lê dez parágrafos para achar um campo. No
   desktop o parágrafo quebra em ~48ch enquanto os campos ocupam a largura toda, e sobra "toque."
   sozinho na linha de "Como este pedido nasce".
2. **A ordem não é a da encomenda.** O pagamento está partido em dois ("Pagamento", com forma e
   desconto, e "Ela já pagou?" três blocos abaixo), com o orçamento e o WhatsApp no meio. As
   observações, que dizem como produzir e embalar o que foi pedido, ficam no pé, longe dos itens.
3. **"Em que pé está" não diz onde o pedido está no caminho.** Um selo pequeno e três botões
   iguais: "Começar a produzir" pesa o mesmo que "Voltar para orçamento" e fica encostado em
   "Cancelar pedido". O destrutivo mora ao lado do avanço.
4. **O pedido novo abre com uma decisão de status** (dois cartões grandes e um parágrafo) antes de
   ela ter digitado o nome da cliente.

---

## 1 · O que esta spec decide

### O âmbar vai para o que falta fazer: `#d271`

Nunca dois botões âmbar ao mesmo tempo no editor.

- **Pedido novo:** "Salvar" é o primário, sempre.
- **Pedido gravado, com alteração por salvar** (`sujo`): "Salvar" é o primário; tudo o mais é
  secundário. Salvar antes de andar.
- **Pedido gravado, sem alteração:** o botão do cabeçalho vira secundário desabilitado com `Check`
  e "Salvo" (mesma largura, para o cabeçalho não pular), e o âmbar vai para o **próximo passo** da
  trilha. O próximo passo é o mesmo da ficha do pedido (063, `FichaDoPedido`, linha 168): levar a
  conta para `domain/pedido.ts` como `proximoPasso(pedido)`, com teste, e a ficha passa a usá-la.
  Entregue e não pago, o próximo passo é "Marcar como pago" (o de `BlocoPagamento`, só para a
  dona; para a ajudante não há âmbar).
- "Abrir a folha do orçamento" e "Abrir o WhatsApp com o resumo" passam a secundários, sempre.

### A ordem da encomenda, com menos blocos: `#d272`

Pedido gravado, de cima para baixo:

| #   | Bloco                     | O que tem                                                                                                                                                                                 |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A trilha** (sem cartão) | ver abaixo                                                                                                                                                                                |
| 2   | Para quem é               | como hoje                                                                                                                                                                                 |
| 3   | O que ela pediu           | busca, itens e, logo abaixo da lista, o campo de observações ("Para lembrar na produção", o placeholder de hoje). O bloco "Observações" deixa de existir                                  |
| 4   | Quando e como             | como hoje                                                                                                                                                                                 |
| 5   | Pagamento                 | forma, desconto, a frase da maquininha e, no mesmo bloco, depois de um filete, o que hoje é `BlocoPagamento` ("Ela já pagou?" ou "Já foi pago"). `BlocoPagamento` perde o `Bloco` de fora |
| 6   | Mandar pra cliente        | o WhatsApp e, abaixo, a folha do orçamento com a validade. `BlocoWhatsApp` e `BlocoOrcamento` perdem o `Bloco` de fora e viram duas partes de um                                          |
| 7   | Pé                        | "Cancelar pedido" e "Arquivar pedido", lado a lado, depois do filete onde hoje está só o arquivar, com as confirmações de hoje                                                            |

Dez blocos viram seis. Pedido novo: a trilha dá lugar à escolha de nascimento (abaixo); os blocos
5 e 6 só com o que já existe hoje para o pedido novo (forma e desconto; nada de mandar).

**As descrições ficam só onde dizem uma consequência que a tela não mostra:**

| Bloco              | Descrição                                                                      |
| ------------------ | ------------------------------------------------------------------------------ |
| Para quem é        | sai                                                                            |
| O que ela pediu    | fica: "O preço entra congelado: mudar o produto depois não mexe neste pedido." |
| Quando e como      | encurta: "A data manda na agenda e na tela Hoje."                              |
| Pagamento          | fica (a maquininha sai do lucro)                                               |
| Mandar pra cliente | "Você confere e envia: nada sai daqui sozinho."                                |

As dicas de campo (`dica`) ficam todas: são a frase no lugar do número, que é o que o
`PRODUCT.md` pede.

### A trilha do pedido

No lugar de "Em que pé está", sem cartão, no topo:

- **Desktop (`lg`):** um `<ol>` com os cinco passos de `FLUXO_PEDIDO`, Orçamento · Confirmado ·
  Em produção · Pronto · Entregue. Feitos com `Check` em `--brand-as-ink`; o atual com o
  `SeloStatus` (cor **e** texto); os de depois em `--ink-subtle`. `aria-current="step"` no atual.
- **Celular:** a lista inteira não cabe em 360px. Uma linha: o `SeloStatus` e "passo 2 de 5", e
  embaixo cinco traços de 4px (feitos em `--brand-as-ink`, o resto em `--surface-sunken`),
  `aria-hidden` porque a linha de cima já disse.
- Abaixo, o **próximo passo** como botão (`lg` no celular, 52px), âmbar quando `#d271` deixa, e
  "Voltar para …" como terciário ao lado. "Cancelar pedido" desce para o pé.
- "Pelo cardápio" continua como selo ao lado do status. "Registrar fornada" e as fornadas do
  pedido continuam aqui, depois de um filete, como hoje.
- **Cancelado:** a trilha some e fica o selo "Cancelado" com "Reabrir como orçamento".

### O pedido novo nasce sem cerimônia

"Como este pedido nasce" vira uma escolha segmentada de duas opções (44px, `aria-pressed`, o
desenho da pílula de filtro), "Orçamento · Já está fechado", no topo e sem cartão, com uma linha
embaixo dizendo o que a escolhida significa (as `explicacao` de hoje). O foco inicial continua no
nome da cliente.

---

## 2 · Antes de tocar em código

1. `/impeccable` com registro **product**; ler `DESIGN.md` § Botão primário e § Padrões.
2. Ler `FichaDoPedido.tsx` (o `proximo` e o `cobrar`) e o `useGuardaDeSaida` (o `sujo`).
3. Conferir que o editor de produto (`/fichas/[id]`) não usa `BlocoPagamento`, `BlocoWhatsApp` ou
   `BlocoOrcamento`: tirar o `Bloco` de fora deles não pode mudar outra tela.

---

## 3 · Escopo

- `domain/pedido.ts`: `proximoPasso(pedido)`, com teste; `FichaDoPedido` passa a usar.
- `FormularioPedido.tsx`: a ordem, a trilha, a escolha de nascimento, o pé, a regra do âmbar.
- `BlocoPagamento.tsx`, `BlocoWhatsApp.tsx`, `BlocoOrcamento.tsx`: sem `Bloco` de fora; o
  WhatsApp e a folha em secundário.
- Um componente `TrilhaDoPedido` em `components/pedidos/`.

---

## 4 · Roteiro de navegador

1. Pedido confirmado, sem alteração: um âmbar só, "Começar a produzir". Mudar a quantidade: o
   âmbar passa para "Salvar" e "Começar a produzir" vira secundário. Salvar: volta.
2. Entregue e não pago, como dona: o âmbar é "Marcar como pago". Como ajudante: nenhum âmbar.
3. Celular 360px: a trilha em uma linha mais os traços; nenhum texto cortado.
4. "Cancelar pedido" está no pé, longe do avanço; a confirmação de hoje continua.
5. Pedido novo: a escolha segmentada no topo, o foco no nome.
6. Leitor de tela: a trilha lê "passo 2 de 5, Confirmado"; o `aria-current` está no atual.

---

## Critérios de aceite

- [x] Nunca dois âmbar na tela, nos três estados de `#d271`.
- [x] `proximoPasso` em `domain/pedido.ts` com teste, usado pela ficha e pelo editor.
- [x] Seis blocos no pedido gravado; observações sob os itens; pagamento num bloco só.
- [x] Cancelar no pé; nenhum destrutivo encostado no avanço.
- [x] Nenhum campo, regra, índice ou dependência.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d271` e `#d272` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **O resumo em coluna no desktop.** É a 077.
- **O que acontece depois de salvar o pedido novo.** É a 076.
- **Trocar os cartões por seções no papel**, como o Caixa (`#d267`). O editor de produto também é
  feito de `Bloco`; trocar um editor só seria dois vocabulários de formulário. Volta junto, para
  os dois, se o corte de seis blocos não bastar.
- **Histórico de status com data** ("confirmado em 28/09"). Pede campo novo.

---

## Decisões desta spec que são fáceis de rejeitar

- **O âmbar no próximo passo, e não no Salvar, quando não há o que salvar.** O `DESIGN.md` põe o
  primário no canto do cabeçalho. Aqui ele anda, e a regra "um por vez" fica; vale escrever isso
  no `DESIGN.md` § Padrões.
- **"Salvo" desabilitado no cabeçalho em vez de sumir.** Sumir faz o título pular de largura.
- **Observações sob os itens.** Quem anota "sem nozes" quer ver isso ao lado do que vai produzir.

---

## Riscos

- **Andar o status com alteração por salvar.** Hoje já é possível (`mover` não passa pelo
  `salvar`). Com o âmbar no "Salvar" quando `sujo`, o caminho certo fica óbvio; não bloquear.
- **A ajudante sem âmbar nenhum** no pedido entregue. É correto: ela não recebe.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
