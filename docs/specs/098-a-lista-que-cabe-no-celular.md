# Spec 098 · A lista que cabe no celular

**Tipo:** a linha do carrinho para de vazar da tela, o pacote vira o dado forte da linha, o
marcado sai do caminho e "Não precisa comprar" vem fechado. **Nenhum campo, nenhuma regra,
nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/compras` sobre os prints de celular (393px) e desktop de 2026-10-08.
**Depende de:** nada. Vem antes de todas as outras da crítica (099 a 104).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d300`.

---

## Problema

1. **No celular o preço some.** No print de 393px, nenhuma linha de "Ingredientes" nem de
   "Embalagens" mostra o preço, e as frases de baixo cortam no meio da palavra, sem
   reticência ("…Cookie Red Velvet 12"). A coluna do preço está fora da tela. Causa: o botão
   da linha é `flex-1` sem `min-w-0` (`LinhaCompra.tsx:76`), e o `truncate` lá dentro faz a
   largura mínima do botão ser a da frase inteira. Em "Não precisa comprar" o mesmo, pelo
   `shrink-0` do número (`LinhaCompra.tsx:397`). Corrigir o preço na gôndola é o contexto 2
   do `PRODUCT.md`, e está quebrado no aparelho em que ele acontece.
2. **O que vai pro carrinho não é o que mais pesa.** "7 pacotes de 200 g" responde à pergunta
   da gôndola e está em rótulo cinza, com o mesmo peso de "1,388 kg em falta". Em todo app de
   lista que se paga (AnyList, Bring!, Listonic), a quantidade é o segundo dado da linha,
   logo depois do nome.
3. **Frase lida em `--ink-subtle`.** Contagem, forno e reserva são texto que ela lê, em
   `micro`, a 3,45:1. O `DESIGN.md` diz que `--ink-subtle` não é texto.
4. **Precisão de balança no mercado.** "10,59 ml em falta", "376,67 g", "1,696 kg". Ninguém
   compra 0,59 ml.
5. **"Não precisa comprar" é mais comprida que a lista.** 19 linhas de conferência embaixo
   de 8 de compra: no celular, três telas de rolagem até "Fechar esta lista".
6. **O marcado fica no meio.** Riscado e no lugar, ele obriga a reler cada corredor. Os apps
   de lista tiram o item marcado do caminho.
7. **O rodapé repete o número.** Antes de marcar, "Lista inteira R$ 372,11" e "Ainda falta
   R$ 372,11" lado a lado, mais a faixa de prosa: perto de 200px fixos numa tela de ~760.

---

## 1 · O que esta spec decide: `#d300`

### A linha do carrinho

- **Ordem:** nome (`body` 500) · **"7 pacotes"** em `body` 600 `--ink` seguido de "de 200 g"
  e "falta 1,4 kg" em `label` `--ink-muted` · preço à direita, sempre visível.
- `min-w-0` no botão da linha e no número de "Não precisa comprar". O nome trunca com
  reticência; as frases de baixo quebram em até duas linhas (`line-clamp-2`), não cortam.
- Frases de contagem, forno e reserva em `--ink-muted`. Ícone continua `--ink-subtle`.
- **O que falta, arredondado para cima** e só na tela de compras: abaixo de 100 g/ml,
  inteiro; de 100 a 999, a dezena; em kg/l, uma casa; `un`, inteiro. "1,388 kg" vira
  "1,4 kg"; "10,59 ml" vira "11 ml". Para cima, porque arredondar para baixo promete menos do
  que a receita pede. Função pura `quantidadeParaOMercado` em `domain/unidades.ts`, com teste.
  O número exato continua no porquê (spec 100).

### O marcado desce

- Marcado sai do corredor e vai para **"No carrinho"**, depois do último corredor: mesma
  linha, apagada, riscada, e tocar devolve ao corredor. O título leva a contagem
  ("No carrinho · 3"). Transição de opacidade, sem animar a posição (`DESIGN.md`, movimento
  de estado; nada de layout animado).

### "Não precisa comprar" fecha

- `<details>` nativo, fechado por padrão. O `<summary>` (alvo de 44px) diz
  "**19** você já tem em casa" e a frase "A contagem ou a fornada já cobre estes." Aberto,
  as linhas de hoje.

### O rodapé

- Nada marcado: um número só, "A lista dá **R$ 372,11**", e "0 de 8 no carrinho" ao lado.
- Algo marcado: "Ainda falta" grande e "de R$ 372,11" em `label`.
- Tudo marcado: o "Você gastou" de hoje.
- A faixa de prosa some: o que ela dizia cabe na linha da contagem.

---

## 2 · Antes de tocar em código

1. Medir no Chrome em 360 e 393px: `document.documentElement.scrollWidth` igual a
   `clientWidth` antes e depois. Confirmar que o vazamento é só o `min-w-0`.
2. Conferir `RodapeFixo` e o `pb-52` da lista: com o rodapé mais baixo, o respiro desce junto.

---

## 3 · Escopo

- `LinhaCompra.tsx`, `ListaDoMercado.tsx`, `RodapeCompras.tsx`.
- `domain/unidades.ts` (`quantidadeParaOMercado`) e o teste.

---

## 4 · Roteiro de navegador

1. 360px e 393px: preço visível em todas as linhas; sem rolagem lateral.
2. Marcar a manteiga: desce para "No carrinho · 1"; tocar de novo: volta para Ingredientes.
3. "Não precisa comprar" fechada; abrir e fechar com o polegar.
4. Rodapé antes de marcar: um número. Depois: "Ainda falta".
5. Tema escuro: frases legíveis.

---

## Critérios de aceite

- [x] Nenhuma rolagem lateral em 360px; preço visível em toda linha.
- [x] Pacote em 600 `--ink`; frases em `--ink-muted`; falta arredondada para cima, com teste.
- [x] Marcado em "No carrinho"; "Não precisa comprar" em `<details>` fechado.
- [x] Rodapé sem número repetido.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d300` escrito; `ESTADO.md` atualizado; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Tirar as frases de forno e reserva da linha.** É a 100.
- **As faixas de aviso do topo e o fechar.** É a 099.
