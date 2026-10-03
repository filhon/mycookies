# Spec 076 · O pedido que segue

**Tipo:** muda o que acontece depois de "Salvar" no pedido novo: em vez de cair na lista, ela fica
no pedido que acabou de anotar, com o próximo passo na mão. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.**
**Tamanho:** meia sessão.
**Origem:** crítica da tela de pedido sobre os prints de 2026-10-02.
**Depende de:** a 075 (a regra do âmbar: sem alteração por salvar, o âmbar vai para o próximo
passo).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d273`.

---

## Problema

Ela combina a encomenda no WhatsApp, abre o Rende, anota e toca "Salvar". O app a manda para
`/pedidos` (`FormularioPedido.salvar`, `guarda.navegar("/pedidos")`).

O próximo passo de quase todo pedido novo é mandar o resumo para a cliente conferir, e o
`BlocoWhatsApp` só existe no pedido gravado. Para chegar nele: achar o pedido na lista, abrir a
ficha ou o editor, rolar. Os serviços de encomenda que cobram assinatura (Bakesy, as faturas do
Square, o pedido em rascunho do Shopify) terminam a criação em "Enviar". O Rende termina na lista,
no ponto em que a tarefa acaba, que é o que ela lembra da tela.

---

## 1 · O que esta spec decide

### O pedido novo, salvo, vira o pedido aberto: `#d273`

- `criarPedido` já devolve o id. No pedido **novo**, `salvar` troca a ida para `/pedidos` por
  `/pedidos/{id}?anotado=1` com **`replace`**: o voltar do aparelho leva à lista, e não ao
  formulário vazio. Pelo caminho da guarda que já navega sem perguntar; se ela não tiver
  `replace`, ganha a opção.
- **Offline:** `criarPedido` grava no cache e o `useDocumento` do editor acha o documento ali. Sem
  rede o pedido abre do mesmo jeito (roteiro, passo 3).
- Com `anotado=1`, o editor mostra no topo, antes da trilha, uma faixa positiva (`Check` + frase,
  nunca só a cor):

  ```
  ✓ Pedido anotado. P-261002-B50 está na agenda de quinta, 2 de outubro.
  [ Mandar o resumo pra ela ]    Agora não
  ```

  - "Mandar o resumo pra ela" é o mesmo `<a>` do `BlocoWhatsApp` (`linkDoWhatsApp`,
    `mensagemDoPedido`) e é **o âmbar** enquanto a faixa existe: o "Salvar" está em "Salvo"
    (`#d271`), e o resumo vem antes do próximo passo da trilha.
  - Orçamento: "Orçamento anotado. Válido até …" quando houver validade; a ação é a mesma (a
    mensagem de hoje não muda nesta spec).
  - Sem telefone: a linha de baixo diz o que o `BlocoWhatsApp` diz ("O WhatsApp vai perguntar
    para quem mandar.").
  - "Agora não" (terciário) e qualquer alteração no formulário tiram a faixa e o parâmetro da URL
    (`replace`, sem histórico novo). Tocar em "Mandar" também tira, depois de abrir o link.

- **Edição:** nada muda. Salvar um pedido existente continua voltando para `/pedidos`.

---

## 2 · Antes de tocar em código

1. Ler `useGuardaDeSaida` (`navegar`) e conferir que remontar `EditorPedido` com o id novo carrega
   os valores do documento, e não os do formulário que acabou de salvar.
2. Ler `BlocoWhatsApp`: a faixa reusa as funções, não copia o texto.

---

## 3 · Escopo

- `FormularioPedido.tsx` (`salvar` no pedido novo), `useGuardaDeSaida` se precisar de `replace`.
- A faixa, em `components/pedidos/`.

---

## 4 · Roteiro de navegador

1. Pedido novo com telefone, Salvar: abre `/pedidos/{id}?anotado=1` com a faixa; "Mandar" abre o
   WhatsApp com o resumo e o código.
2. Voltar do aparelho: a lista, não o formulário vazio.
3. Sem rede: o pedido novo abre igual, com o selo "Salvo no aparelho".
4. Mudar a quantidade: a faixa some e o âmbar vai para "Salvar".
5. Pedido sem telefone: a faixa diz que o WhatsApp vai perguntar.
6. Editar um pedido existente e salvar: volta para `/pedidos`, como hoje.

---

## Critérios de aceite

- [x] Pedido novo salvo abre ele mesmo, com `replace`.
- [x] A faixa usa as funções do `BlocoWhatsApp`; um âmbar só.
- [x] Funciona sem rede.
- [x] Nenhum campo, regra, índice ou dependência.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d273` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **O pedido pelo "+" da barra** (grade da 061) já abre `/pedidos/novo`; nada muda nele além do
  que esta spec muda no salvar.
- **Mudar a mensagem do WhatsApp para orçamento.** Spec própria se ela pedir.
- **Mandar sozinho.** Nada sai do aparelho sem ela tocar (`#d77`).

---

## Decisões desta spec que são fáceis de rejeitar

- **Ficar no editor, e não abrir a ficha (063) na lista.** A ficha mora na lista e depende do
  pedido estar na página carregada; o editor lê pelo id e sempre acha.
- **Edição continua voltando para a lista.** Quem edita veio da lista ou da ficha, e o que
  segue é lá.

---

## Riscos

- **O voltar do aparelho no iPhone instalado.** Conferir que o `replace` não deixa o
  `/pedidos/novo` na pilha (roteiro, passo 2).

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
