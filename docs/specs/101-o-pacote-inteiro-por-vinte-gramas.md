# Spec 101 · O pacote inteiro por vinte gramas

**Tipo:** a lista diz quando o pacote é muito maior do que a falta e quando a falta é só da
reserva, e ela pode deixar o item para a próxima. **Um campo opcional novo em
`ItemListaCompras` (`pulado`). Nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** 100 (o porquê, onde mora o botão).
**Aprovações pedidas:** o campo `pulado?: boolean`. É aditivo e compatível (lista gravada
antes lê ausente como `false`), mas é schema.
**Decisões a registrar:** `#d304`.

---

## Problema

No print, a lista manda comprar:

- **Creme de pistache**: falta 20 g, o pacote é de 1 kg, R$ 109,50. E os pedidos estão
  cobertos: ela tem 360 g e os pedidos pedem 20 g. Os 20 g que faltam são da reserva.
- **Sacola Kraft**: falta 1 un, o pacote é de 100, R$ 59,99. E ela anotou 90 un, que a
  lista não descontou porque a contagem venceu.

Juntos: **R$ 169,49, 45% da lista de R$ 372,11, para cobrir 20 g e uma sacola.** A conta está
certa e a decisão está escondida. Nenhum app de lista faz isto, porque nenhum sabe a receita: é
a diferença que só o Rende pode ter.

---

## 1 · O que esta spec decide: `#d304`

### Duas frases na linha, informativas (ícone e palavra, nunca só cor)

- **Pacote pouco aproveitado**: um pacote só e a falta até 10% dele. "Faltam 20 g; o pacote
  tem 1 kg." 10% é constante nomeada em `listaCompras.ts`, com o comentário dizendo que é
  botão de ajuste e não verdade.
- **Só para a reserva**: `quantidadeComprar ≤ quantidadeDeReserva`, ou seja, sem a reserva
  ela não compraria. "Os pedidos estão cobertos: falta só para a reserva." Substitui a frase
  de reserva que a 100 tirou da linha, só quando ela é verdade.
- As duas são funções puras com teste (`poucoAproveitado`, `soParaAReserva`). Conferir no
  passo 2 se a perda percentual entra igual nos dois lados.

### Deixar para a próxima

- No porquê (100), **"Não levar desta vez"**, secundário. Grava `pulado: true`.
- Pulado sai do corredor e do "Ainda falta" e vai para **"Fica pra próxima"**, depois de
  "No carrinho", com "Levar" para desfazer.
- Item de pedido (não só reserva) pede uma linha a mais antes de pular: "Sem isto, o pedido da
  Ana de sex 10 fica sem 120 g." Não é modal: a frase aparece no painel e o botão continua lá.
- `preservarComprados` preserva `pulado` como preserva `comprado`; `resumoDaLista` e
  `statusDaLista` ignoram o pulado.

---

## 2 · Antes de tocar em código

1. Unidades: `quantidadeComprar` tem a perda dentro e `quantidadeDeReserva` não. Comparar na
   mesma base.
2. Conferir como a 13C introduziu `quantidadeDeReserva?` (versão do schema, conversor) e fazer
   igual.

---

## 3 · Escopo

- `types/vendas.ts` (`pulado?`), `listaCompras.ts` e teste, `mutations/listasCompra.ts`
  (`pularItem`), `LinhaCompra.tsx`, `PorqueDoItem.tsx`, `ListaDoMercado.tsx`, `RodapeCompras.tsx`.

---

## 4 · Roteiro de navegador

1. Pistache: as duas frases. Pular: some do corredor, o "Ainda falta" desce R$ 109,50.
2. "Levar": volta.
3. Pular, refazer: continua pulado.
4. Item de pedido: o painel nomeia a cliente antes de pular.

---

## Critérios de aceite

- [ ] As duas frases, com teste, só quando verdadeiras.
- [ ] Pular e desfazer; pulado sobrevive ao refazer; fora do total que falta.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d304` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Sugerir outro tamanho de pacote** (7 de 200 g contra 1 de 1,5 kg). A lista não conhece os
  tamanhos que o mercado vende.
- **Pular a reserva no produto.** Isso é o piso da ficha (`#d96`), e mora na ficha.
