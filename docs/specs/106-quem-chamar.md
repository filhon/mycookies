# Spec 106 · Quem chamar

**Tipo:** a lista para de responder só "quem gastou mais" e passa a responder "com quem eu
falo hoje": cinco momentos da cliente, cada um com a contagem, e a mensagem de volta pronta no
WhatsApp. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/clientes` sobre os prints de celular e desktop de 2026-10-09.
**Depende de:** 105 (a ficha, onde a mensagem também mora).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d309`.

---

## Problema

1. **O ranking não diz o que fazer.** Janessa no topo com R$ 311,00 é um fato; não é uma
   tarefa. O que paga a assinatura de Square Marketing, Klaviyo e das ferramentas de
   fidelidade de iFood e Goomer é a lista curta de "quem parou de comprar", com o botão de
   chamar ao lado. Para quem vende doce pelo WhatsApp, recompra é a venda mais barata que
   existe.
2. **A maior parte da lista comprou uma vez.** No print, de 55 clientes, a partir da Keilyn
   quase todas têm "1 pedido pago". Essa é a pergunta do negócio ("por que não voltam?") e a
   tela a esconde no fundo de uma rolagem de 50 linhas, abaixo das que voltam.
3. **55 linhas iguais.** Sem grupo, sem filtro além do nome. No celular são onze telas de
   rolagem.

---

## 1 · O que esta spec decide: `#d309`

- **Cinco momentos, uma partição.** Toda cliente cai em exatamente um, só pelos agregados que
  o documento já tem (`totalPedidos`, `ultimoPedidoEm`), por `momentoDaCliente(cliente, hoje)`
  em `domain/clientes.ts`, com teste:

  | Momento         | Regra                                       | Rótulo da pílula |
  | --------------- | ------------------------------------------- | ---------------- |
  | Voltam sempre   | 2+ pedidos pagos, o último há menos de 30 d | "Voltam"         |
  | Novas           | 1 pedido pago, há menos de 30 d             | "Novas"          |
  | Sumiram         | 2+ pedidos pagos, o último há 30 d ou mais  | "Sumiram"        |
  | Uma vez só      | 1 pedido pago, há 30 d ou mais              | "Uma vez só"     |
  | Sem pedido pago | 0                                           | (só em "Todas")  |

  `DIAS_SEM_PEDIR = 30` é constante nomeada. Ritmo por cliente ("ela pede a cada 18 dias")
  pediria a data do primeiro pedido, que o documento não tem, e fica fora.

- **Pílulas de filtro** na faixa de ferramentas, abaixo da busca: Todas · Sumiram · Uma vez só
  · Novas · Voltam, nessa ordem (as que pedem ação primeiro). Contagem no rótulo e só acima de
  zero ("Sumiram 4"), como o `#d246`. Pílula sem ninguém continua tocável e o vazio explica. No
  celular a faixa rola na horizontal, como o `IndiceDaPagina`. A vista mora na URL
  (`?vista=sumiram`), como em `/pedidos`.
- **A busca vale dentro da vista.**
- **Em Sumiram e Uma vez só**, a ordem é "há mais tempo sem pedir" primeiro, e a linha mostra
  "há 34 dias" no lugar de "último em …". Nas outras, a ordem de hoje.
- **"Chamar" na linha**, só nessas duas vistas e só com telefone que disca: botão secundário
  de 44px com o ícone do WhatsApp (`message-circle`) e a palavra "Chamar", **ao lado** do
  botão da linha, nunca dentro dele. Abre `linkDoWhatsApp` com `mensagemDeVolta`.
- **`mensagemDeVolta({ primeiroNome, negocio, produto? })`** em `domain/whatsapp.ts`, com
  teste: "Oi, Keila! Aqui é da MyCookie's. Faz um tempinho que você não pede, e eu queria
  saber se ficou tudo certo com o último. Essa semana tem fornada, quer que eu separe um pra
  você?". Sem emoji, sem desconto (desconto é decisão dela, e ela escreve no WhatsApp antes
  de mandar; o texto **não é enviado** sozinho). Com `produto` (na ficha, que conhece os
  pedidos), "o último Cookie Red Velvet" no lugar de "o último".
- **Na ficha (105)**, quando o momento é Sumiram ou Uma vez só, "Chamar de volta" vira o
  primeiro botão de "Falar com ela", com o produto mais pedido na mensagem.
- **Uma frase no papel**, acima das pílulas, só em "Todas" e só com 10 clientes ou mais:
  "**38** de 55 compraram uma vez só. **4** que voltavam sumiram." Cada número em `body` 600;
  zero, a metade da frase sai. Nada de cartão de métrica.

---

## 2 · Antes de tocar em código

1. Conferir no código, e não na memória, como `ultimoPedidoEm` anda: ele é a data do
   **pagamento** (`aplicarPedidoNoCliente`) e não volta no desfazer (`#d37`). Os momentos
   herdam isso; anotar no `#d309`.
2. Conferir quantas clientes caem em cada momento com os dados de hoje (o print sugere
   Sumiram perto de zero, porque o histórico começa em setembro). Se Sumiram estiver vazia, o
   vazio dela diz por quê, e a spec segue.

---

## 3 · Escopo

- `domain/clientes.ts` (`momentoDaCliente`, `DIAS_SEM_PEDIR`, `diasSemPedir`),
  `domain/whatsapp.ts` (`mensagemDeVolta`), com teste.
- `ListaClientes.tsx` (pílulas, vista na URL, frase), `LinhaCliente.tsx` ("há N dias" e o
  "Chamar" irmão), `FichaDaCliente.tsx` ("Chamar de volta").
- A página continua em `(coluna)`.

---

## 4 · Roteiro de navegador

1. "Uma vez só": a lista começa por quem está há mais tempo sem pedir; cada linha diz "há N
   dias" e tem "Chamar".
2. "Chamar" na Keila: o WhatsApp abre com o número dela e a mensagem com o primeiro nome e o
   nome do negócio, sem enviar.
3. Cliente sem telefone em "Uma vez só": a linha não tem "Chamar".
4. Recarregar com `?vista=sumiram`: a pílula certa ativa.
5. Buscar "ana" dentro de "Novas": só as Anas novas.
6. 360px: a faixa de pílulas rola sem empurrar a página para o lado.

---

## Critérios de aceite

- [x] Toda cliente em exatamente um momento, com teste das fronteiras (29 e 30 dias, 1 e 2
      pedidos, 0 pedido).
- [x] Pílulas com contagem, vista na URL, busca dentro da vista.
- [x] "Chamar" fora do botão da linha, só com telefone, abrindo a mensagem pronta.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d309` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Saber se quem ela chamou voltou.** Pede campo; é a 109.
- **Mandar para várias de uma vez.** O `wa.me` abre uma conversa por vez; lista de
  transmissão e API do WhatsApp Business são outro produto.
- **Ritmo por cliente.** Pede a data do primeiro pedido.
- **Cupom ou desconto de volta.** Decisão de preço é dela, no texto que ela edita.
