# Spec 099 · A lista que se refaz sozinha

**Tipo:** a lista se refaz sozinha enquanto nada foi marcado; com algo marcado, um aviso só, com
o botão dentro. O fechar ganha um caminho recomendado em vez de quatro botões, e a tela fica
acesa no mercado. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** 098 (o rodapé novo e "No carrinho").
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d301`, `#d302`.

---

## Problema

1. **A tela contradiz a pílula.** Com "7 dias" escolhido e a lista montada para 11 de out., o
   topo mostra uma faixa cinza pedindo "toque em Refazer". Pode vir uma segunda ("A conta
   mudou…"), e o terceiro bloco cinza, o da contagem, vem logo abaixo. Três caixas
   parecidas antes do primeiro item: ela aprende a pular as três.
2. **O botão que a faixa manda tocar não se destaca.** "Refazer" é secundário, no topo,
   ao lado de "Contar".
3. **"Contar" duas vezes em 300px**: no cabeçalho e no cartão "Parte da lista está sendo
   comprada inteira".
4. **O fechar tem quatro saídas.** "Continuar comprando", "Fechar a lista", "Fechar e ler a
   nota", "Fechar e guardar na despensa", três parágrafos de explicação e um primário que
   muda de botão conforme o estado. É o fim da experiência (pico e fim) e é o momento mais
   confuso da tela.
5. **A tela apaga no mercado.** Entre um corredor e outro o celular dorme, e ela desbloqueia
   com a mão que segura a cesta. App de receita e de lista que se paga (Paprika, AnyList)
   mantém a tela acesa.

---

## 1 · `#d301`: refazer sem pedir

- **Nada marcado** e (período escolhido diferente do gravado **ou** `desatualizada`): a tela
  chama `regerarListaCompras` sozinha. Sem marcado não há carrinho a perder, e o que ela vê
  passa a ser sempre a lista do período escolhido.
- **Algo marcado**: uma faixa só, informativa, que junta os dois motivos de hoje numa frase
  ("Esta lista é de até 11 de out. e a conta mudou depois dela.") com **"Refazer"** dentro,
  primário: é a ação da tela enquanto a faixa existe. "O que você já marcou continua marcado."
- O "Refazer" do cabeçalho sai. "Montar a lista" da primeira vez continua manual: é o
  momento em que ela decide comprar.
- Sem laço: um `useRef` guarda a assinatura (período + quantidades) já despachada, e a mesma
  assinatura não se escreve duas vezes. Offline, a escrita vai ao cache e a tela reflete, como
  em todo `despachar`.
- "Contar" do cabeçalho some enquanto o cartão da contagem está na tela; o do cartão fica,
  porque mora ao lado do motivo.

### O fechar

- Um primário, escolhido pelo contexto, e o resto como terciário embaixo de "Ou":
  - dona e com rede: **"Ler a nota e fechar"** (corrige preço, lança no caixa, propõe a
    contagem);
  - senão, com algo marcado: **"Guardar na despensa e fechar"**;
  - senão: **"Fechar a lista"**.
- Uma frase por opção, no lugar dos três parágrafos. "Continuar comprando" vira "Voltar",
  terciário.
- Tudo marcado: o rodapé ganha "Fechar a lista", que abre o mesmo bloco.

## 2 · `#d302`: a tela acesa

- `useTelaAcesa(ativo)` em `lib/hooks/`: `navigator.wakeLock.request("screen")` enquanto há
  item por comprar e a aba está visível; pede de novo no `visibilitychange`; solta ao sair.
  Sem suporte, não faz nada e não diz nada.

---

## 3 · Antes de tocar em código

1. Conferir que `regerarListaCompras` com a mesma entrada é idempotente (duas abas abertas).
2. Conferir o `#d75`: o rodapé com o botão continua sumindo com o teclado.

---

## 4 · Escopo

- `ListaDoMercado.tsx`, `RodapeCompras.tsx`, `lib/hooks/useTelaAcesa.ts`.

---

## 5 · Roteiro de navegador

1. Lista sem marcado, trocar 7 → 15 dias: a lista muda sozinha, sem faixa.
2. Marcar um item, trocar para 30: uma faixa, "Refazer" âmbar dentro; tocar: o item continua
   marcado.
3. Contar a despensa e voltar com nada marcado: a lista já descontou.
4. Fechar como dona com rede, como dona sem rede e como ajudante: um primário em cada.
5. Android: a tela não apaga com a lista aberta; marca tudo e ela volta a apagar.

---

## Critérios de aceite

- [ ] Refaz sozinha sem marcado; uma faixa com o botão com marcado; sem laço de escrita.
- [ ] Um "Contar" por vez; "Refazer" fora do cabeçalho.
- [ ] Fechar com um primário por contexto.
- [ ] Tela acesa com item por comprar.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d301` e `#d302` escritos; `ESTADO.md`; linha em `novidades.ts`.

---

## 6 · Fora de escopo

- **Montar a primeira lista sozinha.** Montar é decidir comprar.
- **Tela acesa na fornada e na receita.** Outra spec, se a 099 provar o valor.
