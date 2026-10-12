# Spec 133 · O pote no computador

**Tipo:** no desktop, a linha da contagem do pronto vira grade de colunas (produto, última
contagem, esperamos, hoje), como a despensa na 129. No celular nada muda. Nenhum schema, nenhuma
regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica sobre os prints da contagem do pronto de 2026-10-12, item 6.
**Depende de:** 130 (o esperado e suas parcelas). Entra por último.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d338`.

---

## Problema

No print a 1864 px, o nome está à esquerda, o campo na ponta direita da coluna de 1024 px, e
entre os dois há ≈ 640 px de papel vazio. O olho atravessa a tela dez vezes, e na volta erra a
linha. É o mesmo print que a 129 consertou na despensa (`#d334`), e o `DESIGN.md` já tem o padrão
("Tabela: só no desktop, para a lista cujos números se comparam").

---

## 1 · O que esta spec decide: `#d338`

- A mesma `<li>`, em `lg:grid lg:items-center lg:gap-x-6` com `COLUNAS_CONTAGEM` (importado de
  `LinhaContagem.tsx`; se o "Hoje" do pronto, sem "−"/"+" no desktop, couber em 9rem, a constante
  ganha uma irmã, e não um parâmetro):
  1. **Produto**: nome; embaixo, só o triângulo e a palavra da 130, quando há.
  2. **Última contagem**: "16 un" tabular à direita; "há 8 dias" em `label` `--ink-muted`.
  3. **Esperamos**: "9 un" tabular à direita; embaixo, as parcelas que não são zero, "+12 massa ·
     −19 pedidos". Vazia sem movimento.
  4. **Hoje**: o campo e o "Igual" (130) na mesma célula. Consequência, procedência e "não deu
     para ler" descem para baixo do campo.
- Cabeçalho de colunas uma vez, acima da lista: micro 600 caixa alta `--ink-muted`, `aria-hidden`;
  cada célula com o rótulo em `sr-only`; `aria-describedby` troca com `useDesktop`, como na 129.
- A frase de `referencia` não aparece no desktop.
- A coluna de leitura de 1024 px continua (`#d129`).

---

## 2 · Antes de tocar em código

1. Ler a grade de `LinhaContagem.tsx` (129) e o `ESTADO.md` dela: o invólucro do campo vira
   `lg:contents` para haver um campo só.
2. A 130 já entrou.

---

## 3 · Escopo

- `TelaContagemPronto.tsx` (`LinhaPronto`): a grade, as células, o `sr-only`, o cabeçalho.
- `DECISOES.md`: `#d338`; a linha "Tabela" do `DESIGN.md` passa a dizer "a Contagem e a do pronto".
- `novidades.ts`: "No computador, a contagem do pronto mostra a última contagem e o esperado lado a
  lado".

---

## 4 · Roteiro de navegador

Em 1024, 1280 e 1920 px, nos dois temas; e 360 px para conferir que nada mudou:

1. Colunas alinhadas; números tabulares à direita.
2. Tradicional: 16 un, há 8 dias · 9 un, +12 massa · −19 pedidos · campo.
3. Mini Oreo sem fornada: última e esperado vazios, sem triângulo.
4. Tab e Enter andam de campo em campo (131).
5. Leitor de tela: "Última contagem, 16 un, há 8 dias" por célula.

---

## Critérios de aceite

- [ ] Grade de quatro colunas a partir de `lg`, com cabeçalho.
- [ ] Campo ao lado dos números que ela compara.
- [ ] Celular inalterado.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d338` escrito; `DESIGN.md`, `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Fora de escopo

- **Coluna de valor em reais**: está no resumo (132), pelo mesmo motivo da 129.
- **Editar contagens de dias anteriores.**
