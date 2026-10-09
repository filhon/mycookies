# Spec 102 · Quanto da compra é dos pedidos

**Tipo:** o total da lista ganha a consequência: quanto é para os pedidos do período, quanto é
para manter a reserva, e quanto os pedidos trazem. **Nenhum campo, nenhuma regra, nenhum índice,
nenhuma dependência.**
**Tamanho:** meia sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** 101 (`soParaAReserva`).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d305`.

---

## Problema

"R$ 372,11" sozinho é o princípio 3 do `PRODUCT.md` quebrado: um número sem consequência. E a
consequência escondida neste print é grande. Pela linha de cada item, sete dos oito só estão na
lista por causa da reserva de fornadas: chocolate, cream cheese, pistache, essência, farinha,
gotas e manteiga. **R$ 312,12 da compra é para manter a reserva; R$ 59,99 é para os 4
pedidos** (e é a sacola que ela já tem). Ela configurou a reserva produto por produto, na
ficha, e nunca viu quanto ela custa por semana.

---

## 1 · O que esta spec decide: `#d305`

- **Um pacote vai inteiro para quem obrigou a comprá-lo.** Se `soParaAReserva` (101), é da
  reserva; senão, dos pedidos. Sem rateio proporcional: pacote não se divide, e a pergunta é
  "sem a reserva, eu compraria isto?".
- Função pura `custoPorOrigem(itens)` em `listaCompras.ts` → `{ pedidos, reserva }`, com
  teste. Pulado e já-tem fora.
- **Onde:** uma frase no papel, entre o período e o primeiro corredor, em `label`, com os
  valores em `Dinheiro`:
  "**R$ 59,99** é para os 4 pedidos, que somam **R$ 1.180,00**. **R$ 312,12** é para manter a
  reserva." O total dos pedidos é a soma de `total` dos pedidos do período.
- Sem reserva, a frase é só a primeira metade. Sem pedidos, só a segunda.
- "Reserva" leva para a explicação do piso (o link que a ficha já usa para "Fornadas de
  reserva").

---

## 2 · Antes de tocar em código

1. Conferir que `Pedido.total` é o que ela recebe (com sinal, sem taxa da maquininha) e usar o
   mesmo número que `/pedidos` mostra no dia.

---

## 3 · Escopo

- `listaCompras.ts` e teste, `ListaDoMercado.tsx`.

---

## 4 · Roteiro de navegador

1. A conta real: a soma das duas parcelas é o total do rodapé antes de marcar.
2. Zerar a reserva de um produto na ficha e refazer: a parcela da reserva desce.

---

## Critérios de aceite

- [x] `custoPorOrigem` com teste; as duas parcelas somam o total.
- [x] Frase com as três cifras, e as variantes sem reserva e sem pedido.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d305` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Comparar com o saldo do Caixa.** Pede ler os agregados nesta tela; vale outra spec se ela
  perguntar "dá pra comprar tudo hoje?".
- **Mostrar o custo semanal da reserva na ficha.** É a ficha, não a lista.
