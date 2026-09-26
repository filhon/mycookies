# Spec 051 · O que o preço novo faz

**Tipo:** enquanto ela digita o preço novo de um material, o formulário mostra o que ele faz com
a sobra de cada produto que o usa, **antes de salvar**. Uma função pura com teste, um bloco no
formulário. **Nenhum campo, nenhuma consulta nova** (as fichas vêm da 050), **nenhuma regra,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Materiais (2026-09-26).
**Depende de:** 050 (a página já assina fichas e calcula `custosDeHoje`). Se vier antes, sobe a
assinatura ela mesma, como a 050 descreve.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d224`.

---

## Problema

O contexto 2 do `PRODUCT.md`: no mercado, uma mão no carrinho, "corrige preços de material no
ato". O formulário de edição responde a esse momento com uma frase genérica no topo:

> Mudar o preço aqui marca todos os produtos que usam este material para recálculo.

Ela descobre o efeito **depois**, em Produtos, com o selo "custo desatualizado" em cada
ficha, uma de cada vez. O princípio 3 do produto é "todo número mostra a sua consequência", e o
número que ela está digitando é justamente o que muda a sobra de tudo. É a pergunta que ela faz
na gôndola: "se a manteiga foi para R$ 12,90, ainda compensa o cookie a R$ 8?".

O motor já responde. `custosDeHoje(fichas, materiais)` calcula a sobra de toda ficha com os
preços de hoje (`#d135`). Com o material do formulário trocado pelo digitado, a mesma função
dá a sobra de amanhã. A diferença entre as duas é a resposta.

---

## 1 · O que esta spec decide

### O formulário mostra a sobra de antes e a de depois: `#d224`

Em edição, quando preço, quantidade, unidade ou perda digitados diferem do gravado (a mesma
condição de `precoMudou`) e `podeCalcular`, um bloco logo abaixo do `ResumoCusto`:

```
Com esse preço                                          o quilo: R$ 9,99 → R$ 12,90  ↗ 29%

Cookie tradicional        sobra R$ 3,19 → R$ 2,87 por unidade        ↘ R$ 0,32
Cookie de Nutella         sobra R$ 2,40 → R$ 2,18 por unidade        ↘ R$ 0,22
Brownie                   sobra R$ 0,12 → R$ −0,05 ⚠ fica no vermelho
e mais 8 produtos

Ao salvar, eles ficam marcados para rever o preço em Produtos.
```

- Função pura nova em `src/lib/domain/custoFicha.ts`, com teste:
  `efeitoDoPrecoNovo(fichas, materiais, materialNovo): EfeitoNaFicha[]` =
  `custosDeHoje(fichas, materiais)` contra `custosDeHoje(fichas, materiais com o novo)`,
  **só as fichas cuja sobra mudou**, ordenadas pela maior queda (ou maior alta, se o preço
  caiu). Kits entram sozinhos, porque `custosDeHoje` já os recalcula pelas receitas.
- `materialNovo.custoUnidadeBaseCorrigido` sai de `calcularCustoInsumo`, que o formulário já
  chama (`custo`).
- **Três linhas**, e "e mais N produtos" sem link (o painel não é lugar de lista longa).
- Linha que **cruza o zero**: sinal, `negative`, `TriangleAlert` e "fica no vermelho";
  a palavra da casa, a do `CartaoNoVermelhoHoje` ("ficou no vermelho"). Linha que **para de cruzar**
  (preço caiu e o produto sai do vermelho): `positive`, `trending-up`, "sai do vermelho".
- As outras: a diferença com `trending-down` / `trending-up` e o valor, em `ink-muted`. Cor
  semântica só onde o zero é cruzado: é ali que a decisão muda.
- Nenhuma ficha usa o material: o bloco não aparece.
- A frase genérica da `descricao` do painel sai em edição: o bloco é a versão concreta dela.
  Em material novo a descrição fica como está.

Leitor de tela: o bloco é uma região com `aria-live="polite"` **só na linha do título** ("Com
esse preço, 11 produtos mudam; 1 fica no vermelho"), não nas linhas, para não ler a lista a
cada tecla.

---

## 2 · Antes de tocar em código

- Conferir que `custosDeHoje` é barato o bastante para rodar a cada tecla com a conta da
  Maynara (dezenas de fichas): `useMemo` com o custo digitado como dependência deve bastar; se
  não, adiar com `useDeferredValue`, não com `setTimeout`.
- O formulário recebe `fichas` e `materiais` por prop; ele não assina nada.
- A sobra comparada é a **de hoje**, não a gravada: se o creme de leite já tinha mudado e a
  ficha não foi salva, o antes já conta com isso. É a mesma sobra que `/fichas` mostra.

---

## 3 · Escopo

- `src/lib/domain/custoFicha.ts`: `efeitoDoPrecoNovo`, com teste (preço sobe, preço cai,
  cruza o zero nos dois sentidos, kit que usa a receita, material sem uso).
- `src/components/insumos/EfeitoDoPreco.tsx`, novo.
- `src/components/insumos/FormularioInsumo.tsx`: as props e o bloco.
- `src/app/(app)/(coluna)/insumos/page.tsx`: passa `fichas` e `dados`.

---

## 4 · Roteiro de aparelho

1. Abrir "Manteiga", editar, trocar R$ 9,99 por R$ 12,90: o bloco aparece sem salvar, com o
   quilo antes e depois.
2. Subir até um produto cruzar o zero: a linha com o triângulo e a palavra.
3. Voltar o preço ao gravado: o bloco some.
4. Salvar: `/fichas` mostra os mesmos produtos com "custo desatualizado", e a sobra da seta é a
   mesma que o bloco disse.
5. Celular a 360px com o teclado aberto: o bloco não empurra o botão Salvar para fora da folha
   (o rodapé é fixo do `Painel`).

---

## Critérios de aceite

- [ ] Bloco só em edição, só com preço diferente do gravado, só com produtos afetados.
- [ ] Sobra de antes e de depois por unidade, três linhas, "e mais N".
- [ ] Cruzar o zero com sinal, cor, ícone e palavra; o resto sem cor semântica.
- [ ] A mesma sobra de `/fichas` (mesma função).
- [ ] `efeitoDoPrecoNovo` pura e testada.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d224` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **O mesmo bloco na leitura da nota fiscal.** A nota muda vários preços de uma vez e seria o
  lugar mais forte para isso; o cálculo é o mesmo com vários materiais trocados. Spec própria,
  depois do roteiro desta.
- **Recalcular os produtos dali** ("atualizar o preço de venda dos três"). Quem decide o preço é
  ela, no editor de produto (`PRODUCT.md`, regra de ouro).
- **Aviso depois de salvar** com a lista completa. O selo de "custo desatualizado" em Produtos
  já é esse aviso.
