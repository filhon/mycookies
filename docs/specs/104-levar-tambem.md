# Spec 104 · Levar também

**Tipo:** ela põe na lista um material que a conta não pediu, ou um pacote a mais de um que
pediu, e o refazer não apaga. **Um campo opcional novo em `ItemListaCompras`
(`pacotesExtras`). Nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** 100 (o porquê, onde mora o "levar mais um").
**Aprovações pedidas:** o campo `pacotesExtras?: number`. Aditivo e compatível, mas é schema.
**Decisões a registrar:** `#d307`.

---

## Problema

A lista é só derivada: pedido e reserva. Ela compra fora disso toda semana: material para
testar uma receita, manteiga na promoção, a embalagem da feira. Isso vai para outro papel, e a
lista do Rende deixa de ser **a** lista. Acrescentar item é o que todo app de lista faz
primeiro.

---

## 1 · O que esta spec decide: `#d307`

- **Uma linha por material, sempre.** As operações da lista casam por `insumoId`; duas linhas
  do mesmo material quebrariam o marcar. O que ela acrescenta vira `pacotesExtras` na linha do
  material, e `quantidadePacotes` e `custoEstimado` gravados já somam os extras (campo derivado
  é gravado).
- **Material fora da conta**: a linha nasce com `quantidadeNecessaria: 0` e os extras.
- **"Levar também"**, terciário, no fim dos corredores: `BuscaItem` sobre os materiais, e
  depois quantos pacotes (passo de 1, começa em 1). O material entra no corredor dele.
- **"Levar mais um"** no porquê (100), para material que a conta já pediu.
- Na linha, a frase "1 pacote que você acrescentou", e no porquê a conta separa o que é da
  conta e o que é dela.
- `regerarListaCompras` preserva os extras por `insumoId` e recria a linha de quem saiu da
  conta mas tem extra.
- Item fora do cadastro (detergente) **não**: cadastre como material em "Outros". Item sem
  `insumoId` mudaria a forma da lista inteira.

---

## 2 · Antes de tocar em código

1. Conferir como a 13C introduziu campo opcional em `ItemListaCompras` e fazer igual.
2. Conferir que a contagem semeada pela lista (`entradasDaLista`) já soma os pacotes com
   extras, porque lê `quantidadePacotes`.

---

## 3 · Escopo

- `types/vendas.ts`, `listaCompras.ts` e teste (preservar e recriar), `mutations/listasCompra.ts`
  (`levarTambem`), `ListaDoMercado.tsx`, `PorqueDoItem.tsx`, `LinhaCompra.tsx`.

---

## 4 · Roteiro de navegador

1. "Levar também" → cacau: entra em Ingredientes com 1 pacote.
2. Manteiga, "Levar mais um": 8 pacotes; o total sobe um pacote.
3. Refazer: os dois continuam.
4. Fechar e guardar na despensa: a contagem já soma os extras.

---

## Critérios de aceite

- [ ] Uma linha por material; extras gravados e somados.
- [ ] Extras sobrevivem ao refazer, com teste.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d307` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Item de texto livre.** Ver acima.
- **Tirar da conta um pacote** (levar menos). É o "Não levar desta vez" da 101, inteiro.
