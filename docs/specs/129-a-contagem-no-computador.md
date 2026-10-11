# Spec 129 · A contagem no computador

**Tipo:** no desktop, a linha da contagem vira grade de colunas (material, última contagem,
projetamos, hoje), com o campo perto dos números que ela compara. No celular nada muda. Nenhum
schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica sobre os prints da contagem de 2026-10-11, item 6.
**Depende de:** 125 (o campo novo) e 126 (a frase reordenada); entra por último.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d334`.

---

## Problema

No print a 1864 px, a coluna de leitura tem 1024 px: o nome à esquerda, o campo na ponta direita,
e ≈ 600 px de papel vazio entre os dois. O olho atravessa a tela 35 vezes, e na volta erra a linha.
Os três números que ela compara (o anotado, a projeção e o que digita) estão em lugares
diferentes: dois amassados numa frase cinza embaixo do nome, um na outra ponta.

O desktop é o uso da noite, sentada (`PRODUCT.md`, contexto 4): ela conta no celular, mas confere
e corrige no computador. É ali que a tabela faz sentido, e o `DESIGN.md` já tem o padrão: "Tabela:
só no desktop, para a lista cujos números se comparam".

---

## 1 · O que esta spec decide: `#d334`

### A linha vira grade a partir de `lg`

- A mesma `<li>` (o padrão de Produtos, `#d228`, e Materiais, `#d225`), em
  `lg:grid lg:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem] lg:items-center lg:gap-x-6`:
  1. **Material**: nome; embaixo, só o que não é número (o triângulo e a palavra da 126, "nunca
     contada").
  2. **Última contagem**: "540 g" tabular à direita, e "há 15 dias" em `label` `--ink-muted`.
  3. **Projetamos**: "510 g" tabular à direita, e "1 fornada" embaixo; vazia quando não houve
     fornada.
  4. **Hoje**: o campo da 125, `w-full`, e o "Igual" logo à esquerda dele na mesma célula, quando
     existe.
- Abaixo de cada número que ela digitou, a consequência continua, embaixo do campo, em `label`
  ("2,5 emb. = 987,5 g").
- Cabeçalho de colunas uma vez por corredor, sob o `h2`: micro 600 caixa alta `--ink-muted`,
  `aria-hidden`; cada célula leva o rótulo em `sr-only`.
- A frase da referência embaixo do nome (`referencia`) **não aparece** no desktop: as colunas a
  substituem. O leitor de tela continua com `aria-describedby` apontando para o texto das colunas.

### O que não muda

- A coluna de leitura de 1024 px (`(coluna)`, `#d129`): com quatro colunas ela fica cheia.
- O rodapé fixo, o recorte, o resumo da 128.
- O celular, inteiro.

---

## 2 · Antes de tocar em código

1. Ler a `<li>` de `LinhaInsumo` e de Produtos: a grade e o `sr-only` dos rótulos.
2. A 125 e a 126 já entraram.

---

## 3 · Escopo

- `LinhaContagem.tsx`: a grade em `lg`, as células, o `sr-only`.
- `TelaContagem.tsx`: o cabeçalho de colunas por corredor.
- `DECISOES.md`: `#d334`, e a lista de telas com tabela no `DESIGN.md` ganha a contagem.
- `novidades.ts`: "No computador, a contagem mostra a última contagem e a projeção lado a lado".

---

## 4 · Roteiro de navegador

Em 1024, 1280 e 1920 px, nos dois temas; e 360 px para conferir que nada mudou:

1. Colunas alinhadas em todos os corredores; números tabulares à direita.
2. Amido de milho: 540 g, há 15 dias · 510 g, 1 fornada · campo.
3. Chocolate pó: última e projeção vazias; "nunca contada" com o triângulo.
4. Tab e Enter andam do campo de uma linha para o da seguinte (127).
5. Leitor de tela: "Última contagem, 540 gramas, há 15 dias" por célula.
6. 360 px: idêntico a antes da spec.

---

## Critérios de aceite

- [ ] Grade de quatro colunas a partir de `lg`, com cabeçalho por corredor.
- [ ] Campo ao lado dos números que ela compara.
- [ ] Celular inalterado.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d334` escrito; `DESIGN.md`, `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Dentro da coluna de 1024 px, e não na largura toda.** Quatro colunas cabem; mais largura só
  afastaria o nome do campo de novo.
- **Sem coluna de valor em reais.** O valor está no resumo da 128; na grade seria um quinto número
  por linha para ela ignorar enquanto conta.

---

## Fora de escopo

- **Editar a contagem de dias anteriores** e o histórico por material.
- **Exportar a contagem** (planilha, PDF).
